'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, Music, Plus, Save, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { scrollMainTop } from '@/lib/scroll';
import { blockEnterSubmit, slugFinal, slugProblem, slugTyping, todayLocal } from '@/lib/forms';
import EditorBar from './EditorBar';
import Select from './Select';
import { Field, Notice, Section, Skeleton } from './ui';

// Same keys as the public frontend's platform map (frontend/src/lib/platforms.tsx).
const PLATFORMS = [
  { value: 'youtube', label: 'YouTube Video' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'itunes', label: 'iTunes' },
  { value: 'youtubeMusic', label: 'YouTube Music' },
];
const emptyTrack = (n: number) => ({ title: '', trackNumber: n, durationSeconds: '', videoUrl: '' });

export default function ReleaseForm({ id }: { id?: string }) {
  const edit = !!id;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(edit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState('single');
  const [customUrl, setCustomUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState(edit ? '' : todayLocal());
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [links, setLinks] = useState<any[]>([{ platform: 'spotify', url: '' }]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPrev, setCoverPrev] = useState('');

  useEffect(() => {
    if (!edit) return;
    api.get(`/releases/${id}`).then(({ data: r }) => {
      setTitle(r.title || ''); setType(r.type || 'single'); setCustomUrl(r.customUrl || '');
      setReleaseDate(r.releaseDate ? r.releaseDate.slice(0, 10) : ''); setDescription(r.description || ''); setVideoUrl(r.videoUrl || '');
      setLinks(r.links?.length ? r.links : [{ platform: 'spotify', url: '' }]); setTracks(r.tracks || []); setCoverPrev(r.coverImage || '');
    }).catch((e) => setError(errorMessage(e, 'Failed to load release.'))).finally(() => setLoading(false));
  }, [edit, id]);

  const pickCover = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) return setError('Only JPEG or PNG images.');
    setCover(file);
    const r = new FileReader(); r.onloadend = () => setCoverPrev(String(r.result)); r.readAsDataURL(file);
  };
  const upd = (set: any) => (i: number, k: string, v: string) => set((p: any[]) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const updLink = upd(setLinks), updTrack = upd(setTracks);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    const slug = slugFinal(customUrl);
    if (slugProblem(slug)) { setError(slugProblem(slug)); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title); fd.append('type', type);
      if (slug) fd.append('customUrl', slug);
      fd.append('releaseDate', releaseDate); fd.append('description', description); fd.append('videoUrl', videoUrl);
      fd.append('links', JSON.stringify(links.filter((l) => l.url.trim())));
      fd.append('tracks', JSON.stringify(type === 'album'
        ? tracks.filter((t) => t.title.trim()).map((t, i) => ({ title: t.title, trackNumber: Number(t.trackNumber) || i + 1, durationSeconds: t.durationSeconds ? Number(t.durationSeconds) : undefined, videoUrl: t.videoUrl || undefined }))
        : []));
      if (cover) fd.append('coverImage', cover);
      if (edit) await api.put(`/releases/${id}`, fd); else await api.post('/releases', fd);
      router.push('/releases');
    } catch (err) { setError(errorMessage(err, 'Failed to save release.')); scrollMainTop(); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="mx-auto max-w-[900px] pt-10"><Skeleton rows={6} /></div>;

  return (
    <form onSubmit={submit} onKeyDown={blockEnterSubmit}>
      <EditorBar backHref="/releases" backLabel="Releases" icon={Music} crumb={title} state={saving ? 'saving' : 'idle'}>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{edit ? 'Save' : 'Create'}</button>
      </EditorBar>

      <div className="mx-auto w-full max-w-[900px] animate-rise pt-10 lg:pt-16">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-md bg-surface2"><Music size={24} strokeWidth={1.5} /></span>
      <h1 className="mb-8 text-[32px] font-bold tracking-[-0.02em] text-fg sm:text-[38px]">{edit ? 'Edit release' : 'New release'}</h1>
      {error && <Notice>{error}</Notice>}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-8">
          <Section title="Details">
            <Field label="Title"><input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Type"><Select value={type} onChange={setType} options={[{ value: 'single', label: 'Single' }, { value: 'album', label: 'Album' }]} /></Field>
              <Field label="Release date"><input type="date" className="input" required value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} /></Field>
            </div>
            <Field label="Custom URL" hint="Optional — generated from the title if blank."><input className="input font-mono !text-[13px]" value={customUrl} maxLength={100} onChange={(e) => setCustomUrl(slugTyping(e.target.value))} onBlur={() => setCustomUrl(slugFinal(customUrl))} placeholder="my-new-song" /></Field>
            <Field label="Description"><textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="YouTube video URL" hint="Optional."><input type="url" className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" /></Field>
          </Section>

          <Section title="Platform links">
            {links.map((l, i) => (
              <div key={i} className="flex flex-wrap gap-2.5 sm:flex-nowrap">
                <Select className="sm:!w-44" value={l.platform} onChange={(v) => updLink(i, 'platform', v)} options={PLATFORMS} />
                <input type="url" className="input min-w-0 flex-1" placeholder="https://…" value={l.url} onChange={(e) => updLink(i, 'url', e.target.value)} />
                <button type="button" className="btn-quiet btn-icon" onClick={() => setLinks((p) => p.filter((_, j) => j !== i))} aria-label="Remove link"><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" className="btn-quiet" onClick={() => setLinks((p) => [...p, { platform: 'spotify', url: '' }])}><Plus size={15} /> Add link</button>
          </Section>

          {type === 'album' && (
            <Section title="Tracklist">
              {tracks.map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
                  <span className="w-6 shrink-0 text-center font-mono text-xs text-muted">{i + 1}</span>
                  <input className="input min-w-0 flex-1" placeholder="Track title" value={t.title} onChange={(e) => updTrack(i, 'title', e.target.value)} />
                  <input type="url" className="input min-w-0 flex-1" placeholder="Video URL (optional)" value={t.videoUrl || ''} onChange={(e) => updTrack(i, 'videoUrl', e.target.value)} />
                  <button type="button" className="btn-quiet btn-icon" onClick={() => setTracks((p) => p.filter((_, j) => j !== i))} aria-label="Remove track"><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="btn-quiet" onClick={() => setTracks((p) => [...p, emptyTrack(p.length + 1)])}><Plus size={15} /> Add track</button>
            </Section>
          )}
        </div>

        <div>
          <Section title="Cover art">
            <button type="button" onClick={() => fileRef.current?.click()} className="group relative grid aspect-square w-full place-items-center overflow-hidden rounded border border-dashed border-line bg-surface2/40 text-muted transition-colors hover:border-accent">
              {coverPrev ? <img src={coverPrev} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-[13px]"><ImagePlus size={20} strokeWidth={1.5} />Choose cover</span>}
              {coverPrev && <span className="absolute inset-0 grid place-items-center bg-black/45 text-[13px] text-white opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">Replace</span>}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => pickCover(e.target.files?.[0])} />
          </Section>
        </div>
      </div>
      </div>
    </form>
  );
}
