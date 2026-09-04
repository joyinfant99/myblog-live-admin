import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2 } from 'lucide-react';
import './Releases.css';

function Releases() {
  const { user, getIdToken } = useAuth();
  const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'https://blog-api.joyinfant.com';

  const [releases, setReleases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReleases = useCallback(() => {
    setIsLoading(true);
    axios
      .get(`${REACT_APP_API_URL}/releases`, { params: { limit: 0, sortOrder: 'desc' }, withCredentials: true })
      .then((response) => {
        setReleases(response.data.releases);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching releases:', err);
        setError('Failed to fetch releases.');
        setIsLoading(false);
      });
  }, [REACT_APP_API_URL]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this release? This cannot be undone.')) return;
    try {
      const token = await getIdToken();
      await axios.delete(`${REACT_APP_API_URL}/releases/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setReleases((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Error deleting release:', err);
      setError('Failed to delete release.');
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
    <div className="releases-page">
      <div className="releases-header">
        <h1>Releases</h1>
        <Link to="/create-release" className="new-release-button">
          <Plus size={18} /> New Release
        </Link>
      </div>
      {error && <p className="error-message">{error}</p>}
      {releases.length === 0 ? (
        <p className="no-releases">No releases yet — create your first one.</p>
      ) : (
        <div className="releases-grid">
          {releases.map((release) => (
            <div key={release.id} className="release-card">
              {release.coverImage && (
                <img src={release.coverImage} alt={release.title} className="release-card-cover" />
              )}
              <div className="release-card-info">
                <h3>{release.title}</h3>
                <span className="release-card-type">{release.type}</span>
                <p className="release-card-date">{new Date(release.releaseDate).toLocaleDateString()}</p>
                <p className="release-card-links">{release.links.length} link(s)</p>
              </div>
              <div className="release-card-actions">
                <Link to={`/edit-release/${release.id}`} className="edit-link">
                  <Edit size={14} /> Edit
                </Link>
                <button onClick={() => handleDelete(release.id)} className="delete-link">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Releases;
