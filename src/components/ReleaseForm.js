import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Save, Loader, AlertCircle } from 'lucide-react';
import './ReleaseForm.css';

// Same string keys as the frontend's PLATFORM_META map
// (frontend/src/lib/platforms.tsx) — kept in sync by convention, this is a
// separate package with no shared module. Just the four services the artist
// wants on a release page, in the order they should appear.
const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube Video' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'itunes', label: 'iTunes' },
  { value: 'youtubeMusic', label: 'YouTube Music' },
];

const emptyTrack = (n) => ({ title: '', trackNumber: n, durationSeconds: '', videoUrl: '' });

function ReleaseForm({ mode }) {
  const isEdit = mode === 'edit';
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getIdToken } = useAuth();

  const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://blog-api.joyinfant.com';

  const [title, setTitle] = useState('');
  const [type, setType] = useState('single');
  const [customUrl, setCustomUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [links, setLinks] = useState([{ platform: 'spotify', url: '' }]);
  const [tracks, setTracks] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    axios
      .get(`${REACT_APP_API_URL}/releases/${id}`, { withCredentials: true })
      .then((response) => {
        const r = response.data;
        setTitle(r.title || '');
        setType(r.type || 'single');
        setCustomUrl(r.customUrl || '');
        setReleaseDate(r.releaseDate ? r.releaseDate.slice(0, 10) : '');
        setDescription(r.description || '');
        setVideoUrl(r.videoUrl || '');
        setLinks(r.links && r.links.length ? r.links : [{ platform: 'spotify', url: '' }]);
        setTracks(r.tracks || []);
        setCoverPreview(r.coverImage || '');
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error loading release:', err);
        setError('Failed to load release.');
        setIsLoading(false);
      });
  }, [isEdit, id, REACT_APP_API_URL]);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setError('Please upload only JPEG or PNG images.');
      return;
    }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const updateLink = (index, field, value) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };
  const addLink = () => setLinks((prev) => [...prev, { platform: 'spotify', url: '' }]);
  const removeLink = (index) => setLinks((prev) => prev.filter((_, i) => i !== index));

  const updateTrack = (index, field, value) => {
    setTracks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };
  const addTrack = () => setTracks((prev) => [...prev, emptyTrack(prev.length + 1)]);
  const removeTrack = (index) => setTracks((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const token = await getIdToken();
      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', type);
      if (customUrl.trim()) formData.append('customUrl', customUrl.trim());
      formData.append('releaseDate', releaseDate);
      formData.append('description', description);
      formData.append('videoUrl', videoUrl);
      formData.append('links', JSON.stringify(links.filter((l) => l.url.trim())));
      formData.append(
        'tracks',
        type === 'album'
          ? JSON.stringify(
              tracks
                .filter((t) => t.title.trim())
                .map((t, i) => ({
                  title: t.title,
                  trackNumber: Number(t.trackNumber) || i + 1,
                  durationSeconds: t.durationSeconds ? Number(t.durationSeconds) : undefined,
                  videoUrl: t.videoUrl || undefined,
                }))
            )
          : JSON.stringify([])
      );
      if (coverFile) formData.append('coverImage', coverFile);

      const config = {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        withCredentials: true,
      };

      if (isEdit) {
        await axios.put(`${REACT_APP_API_URL}/releases/${id}`, formData, config);
      } else {
        await axios.post(`${REACT_APP_API_URL}/releases`, formData, config);
      }
      navigate('/releases');
    } catch (err) {
      console.error('Error saving release:', err);
      // Backend sends a generic `error` plus a more specific `details` (e.g.
      // "Invalid YouTube URL format") when NODE_ENV=development — surface
      // `details` when present so validation failures are diagnosable from
      // the form itself instead of only in the server log.
      setError(err.response?.data?.details || err.response?.data?.error || 'Failed to save release.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <p>Please log in to manage releases.</p>;
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="release-form-page">
      <h1 className="release-form-title">{isEdit ? 'Edit Release' : 'New Release'}</h1>
      {error && (
        <div className="error-message">
          <AlertCircle size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="release-form" encType="multipart/form-data">
        <div className="form-section">
          <h2 className="section-title">Details</h2>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="type">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="single">Single</option>
              <option value="album">Album</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="releaseDate">Release date</label>
            <input
              id="releaseDate"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="customUrl">Custom URL (optional — auto-generated from title if blank)</label>
            <input
              id="customUrl"
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="e.g. my-new-song"
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="videoUrl">YouTube video URL (optional)</label>
            <input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="coverImage">Cover art</label>
            <input id="coverImage" type="file" name="coverImage" accept="image/png,image/jpeg" onChange={handleCoverChange} />
            {coverPreview && (
              <div className="cover-preview">
                <img src={coverPreview} alt="Cover preview" />
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2 className="section-title">Platform links</h2>
          {links.map((link, index) => (
            <div className="link-row" key={index}>
              <select value={link.platform} onChange={(e) => updateLink(index, 'platform', e.target.value)}>
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateLink(index, 'url', e.target.value)}
              />
              <button type="button" className="icon-button" onClick={() => removeLink(index)} aria-label="Remove link">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="add-row-button" onClick={addLink}>
            <Plus size={16} /> Add link
          </button>
        </div>

        {type === 'album' && (
          <div className="form-section">
            <h2 className="section-title">Tracklist</h2>
            {tracks.map((track, index) => (
              <div className="track-row" key={index}>
                <input
                  type="text"
                  placeholder={`Track ${index + 1} title`}
                  value={track.title}
                  onChange={(e) => updateTrack(index, 'title', e.target.value)}
                />
                <input
                  type="url"
                  placeholder="Video URL (optional)"
                  value={track.videoUrl}
                  onChange={(e) => updateTrack(index, 'videoUrl', e.target.value)}
                />
                <button type="button" className="icon-button" onClick={() => removeTrack(index)} aria-label="Remove track">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="add-row-button" onClick={addTrack}>
              <Plus size={16} /> Add track
            </button>
          </div>
        )}

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? <Loader size={16} className="spin" /> : <Save size={16} />}
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Release'}
        </button>
      </form>
    </div>
  );
}

export default ReleaseForm;
