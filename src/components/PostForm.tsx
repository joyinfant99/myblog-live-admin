'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, FileText, Globe, ImagePlus, Link2, Loader2, Save, SlidersHorizontal, Tag, Trash2, X } from 'lucide-react';
import { api, errorMessage, imageUrl } from '@/lib/api';
import { appendKeywords, autoSlug, blockEnterSubmit, slugFinal, slugProblem, slugTyping, todayLocal as today } from '@/lib/forms';
import { useAuth } from '@/lib/auth-context';
import Editor from './Editor';
import EditorBar from './EditorBar';
import Select from './Select';
import { ConfirmDialog, Field, Notice, Skeleton } from './ui';

const ytId = (url: string) => { const m = url?.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/); return m && m[2].length === 11 ? m[2] : null; };
const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Reads and validates an image, handing back the file plus a data-URL preview. */
function readImage(file: File | undefined, onOk: (f: File, url: string) => void, onErr: (m: string) => void) {
  if (!file) return;
  if (!['image/jpeg', 'image/png'].includes(file.type)) return onErr('Only JPEG or PNG images.');
  if (file.size > 5 * 1024 * 1024) return onErr('Image must be under 5MB.');
  const r = new FileReader(); r.onloadend = () => onOk(file, String(r.result)); r.readAsDataURL(file);
}

function Prop({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2 py-px">
      <span className="flex items-center gap-2 text-[13px] text-muted"><Icon size={14} strokeWidth={1.6} />{label}</span>
      <div>{children}</div>
    </div>
  );
}

export default function PostForm({ id }: { id?: string }) {
  const edit = !!id;
  const router = useRouter();
  const { user } = useAuth();
  const fromNote = useSearchParams().get('fromNote');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const [f, setF] = useState({ title: '', content: '', CategoryId: '', customUrl: '', publishDate: today(), youtubeUrl: '', metaDescription: '', socialTitle: '', socialDescription: '', seoKeywords: '' });
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerPrev, setBannerPrev] = useState('');
  const [social, setSocial] = useState<File | null>(null);
  const [socialPrev, setSocialPrev] = useState('');
  const [urlTouched, setUrlTouched] = useState(edit);
  const [panel, setPanel] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const ready = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const socialInput = useRef<HTMLInputElement>(null);

  const touch = () => { if (ready.current) { setDirty(true); setSaved(false); } };
  const set = (k: keyof typeof f, v: string) => { setF((p) => ({ ...p, [k]: v })); touch(); };

  useEffect(() => {
    (async () => {
      try {
        const { data: cats } = await api.get('/categories'); setCategories(cats);
        if (!edit && fromNote) {
          // Starting a post from a private note: copy its text over; the note itself stays private and untouched.
          try {
            const { data: n } = await api.get(`/notes/${fromNote}`);
            setF((p) => ({ ...p, title: n.title || '', content: n.content || '', customUrl: autoSlug(n.title || ''), seoKeywords: (n.tags || []).join(', ') }));
            setUrlTouched(false);
            setDirty(true);
          } catch { setError('Couldn’t load that note.'); }
        }
        if (edit) {
          const { data: p } = await api.get(`/posts/${id}`);
          setF({
            title: p.title || '', content: p.content || '', CategoryId: String(p.CategoryId || ''), customUrl: p.customUrl || '',
            publishDate: p.publishDate ? new Date(p.publishDate).toISOString().split('T')[0] : today(),
            youtubeUrl: p.youtubeUrl || '', metaDescription: p.metaDescription || '', socialTitle: p.socialTitle || '',
            socialDescription: p.socialDescription || '', seoKeywords: Array.isArray(p.seoKeywords) ? p.seoKeywords.join(', ') : p.seoKeywords || '',
          });
          setBannerPrev(imageUrl(p.bannerImage)); setSocialPrev(imageUrl(p.socialImage));
        }
      } catch (e) { setError(errorMessage(e, 'Failed to load.')); }
      finally { setLoading(false); setTimeout(() => { ready.current = true; }, 600); }
    })();
  }, [edit, id, fromNote]);

  // Title grows with its content, like a Notion page title.
  useEffect(() => { const el = titleRef.current; if (el) { el.style.height = '0px'; el.style.height = `${el.scrollHeight}px`; } }, [f.title, loading]);

  // Warn before leaving with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const words = useMemo(() => { const t = plain(f.content); return t ? t.split(' ').length : 0; }, [f.content]);
  const embed = ytId(f.youtubeUrl) ? `https://www.youtube.com/embed/${ytId(f.youtubeUrl)}` : '';

  const onTitle = (v: string) => { setF((p) => ({ ...p, title: v.replace(/\n/g, ' '), customUrl: urlTouched ? p.customUrl : autoSlug(v) })); touch(); };
  const pickBanner = (e: ChangeEvent<HTMLInputElement>) => readImage(e.target.files?.[0], (file, url) => { setBanner(file); setBannerPrev(url); if (!social && !socialPrev) { setSocial(file); setSocialPrev(url); } touch(); }, setError);
  const pickSocial = (e: ChangeEvent<HTMLInputElement>) => readImage(e.target.files?.[0], (file, url) => { setSocial(file); setSocialPrev(url); touch(); }, setError);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (saving) return; // a double click must not publish twice
    setError('');
    const meta = f.metaDescription.trim() || plain(f.content).slice(0, 160);
    if (!f.title.trim()) return setError('Give the post a title.');
    if (!plain(f.content) && !/<img/.test(f.content)) return setError('The post is empty.');
    if (!f.CategoryId) return setError('Pick a category.');
    const slug = slugFinal(f.customUrl);
    if (slugProblem(slug)) return setError(slugProblem(slug));
    if (f.title.trim().length > 255) return setError('The title is too long (255 characters at most).');
    if (f.youtubeUrl && !embed) { setPanel(true); return setError('That YouTube URL isn’t valid.'); }
    if (!edit && !user?.email) return setError('Please sign in again.');

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', f.title.trim()); fd.append('content', f.content.trim()); fd.append('CategoryId', f.CategoryId);
      fd.append('customUrl', slug); fd.append('publishDate', f.publishDate || today()); fd.append('youtubeUrl', embed);
      fd.append('metaDescription', meta);
      fd.append('socialTitle', (f.socialTitle.trim() || f.title.trim()).slice(0, 170));
      fd.append('socialDescription', (f.socialDescription.trim() || meta).slice(0, 240));
      appendKeywords(fd, f.seoKeywords, edit);
      if (!edit) fd.append('authorEmail', user!.email!);
      if (banner) fd.append('bannerImage', banner);
      if (social) fd.append('socialImage', social);

      if (edit) { await api.put(`/posts/${id}`, fd); setDirty(false); setSaved(true); setBanner(null); setSocial(null); }
      else { setDirty(false); await api.post('/posts', fd); router.replace('/posts'); }
    } catch (err) { setDirty(true); setError(errorMessage(err, 'Failed to save.')); }
    finally { setSaving(false); }
  };

  const del = async () => {
    try { setDirty(false); await api.delete(`/posts/${id}`); router.replace('/posts'); }
    catch (e) { setError(errorMessage(e, 'Failed to delete.')); setConfirmDel(false); }
  };

  if (loading) return <div className="mx-auto max-w-[780px] pt-10"><Skeleton rows={6} /></div>;

  return (
    <form onSubmit={submit} onKeyDown={blockEnterSubmit} className="page-editor">
      <EditorBar backHref="/posts" backLabel="Posts" icon={FileText} crumb={f.title}
        state={saving ? 'saving' : dirty ? 'dirty' : saved ? 'saved' : 'idle'}
        meta={words > 0 ? `${words.toLocaleString()} words` : undefined}
        badge={!edit ? <span className="ml-1 hidden rounded bg-accent/10 px-1.5 py-0.5 text-[12px] text-accent sm:inline">Draft</span> : undefined}>
        <button type="button" className="btn-ghost max-sm:btn-icon" aria-label="Settings" onClick={() => setPanel(true)}><SlidersHorizontal size={14} /> <span className="hidden sm:inline">Settings</span></button>
        {edit && <button type="button" className="btn-danger max-sm:btn-icon" aria-label="Delete" onClick={() => setConfirmDel(true)}><Trash2 size={14} /> <span className="hidden sm:inline">Delete</span></button>}
        <button type="submit" disabled={saving} className="btn-primary">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{edit ? 'Save' : 'Publish'}</button>
      </EditorBar>

      {/* The page */}
      <div className="mx-auto w-full max-w-[800px] animate-rise pt-10 lg:pt-16">
        {error && <Notice>{error}</Notice>}

        {bannerPrev ? (
          <div className="group relative mb-8 aspect-[21/9] w-full overflow-hidden rounded bg-surface2">
            <img src={bannerPrev} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => bannerInput.current?.click()} className="btn-ghost absolute bottom-3 right-3 !border-transparent !bg-bg/90 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100"><ImagePlus size={14} /> Change cover</button>
          </div>
        ) : (
          <button type="button" onClick={() => bannerInput.current?.click()} className="btn-quiet mb-3 -ml-2"><ImagePlus size={14} /> Add cover</button>
        )}
        <input ref={bannerInput} type="file" accept="image/jpeg,image/png" hidden onChange={pickBanner} />

        <textarea ref={titleRef} rows={1} maxLength={255} value={f.title} onChange={(e) => onTitle(e.target.value)} placeholder="Untitled"
          className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-read text-[30px] font-[700] leading-[1.15] tracking-[-0.02em] text-fg outline-none placeholder:text-muted/40 sm:text-[46px]" />

        <div className="mb-8 mt-5 space-y-px border-b border-line pb-5">
          <Prop icon={Tag} label="Category">
            <Select variant="inline" ariaLabel="Category" value={f.CategoryId} onChange={(v) => set('CategoryId', v)}
              options={categories.map((c) => ({ value: String(c.id), label: c.name, bg: c.backgroundColor, fg: c.fontColor }))} />
          </Prop>
          <Prop icon={CalendarDays} label="Publish date"><input type="date" className="prop-input !w-auto" value={f.publishDate} onChange={(e) => set('publishDate', e.target.value)} /></Prop>
          <Prop icon={Link2} label="URL slug"><input className="prop-input font-mono !text-[13px]" value={f.customUrl} maxLength={100} placeholder="auto-generated from the title" onChange={(e) => { setUrlTouched(true); set('customUrl', slugTyping(e.target.value)); }} onBlur={() => set('customUrl', slugFinal(f.customUrl))} /></Prop>
        </div>

        <Editor value={f.content} onChange={(v, source) => { setF((p) => ({ ...p, content: v })); if (source === 'user') touch(); }} />
      </div>

      {/* Settings drawer: SEO, social and media live here, out of the writing space */}
      {panel && <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setPanel(false)} />}
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-surface shadow-pop transition-transform duration-500 [transition-timing-function:var(--ease)] ${panel ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!panel}>
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 className="text-[15px] font-semibold text-fg">Post settings</h2>
          <button type="button" className="btn-quiet btn-icon" onClick={() => setPanel(false)} aria-label="Close"><X size={15} /></button>
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6">
          <div>
            <p className="mb-3 text-[12px] font-medium text-muted">Search</p>
            <div className="space-y-5">
              <Field label={`Meta description (${f.metaDescription.length}/160)`} hint="Left blank, the first 160 characters of the post are used.">
                <textarea className="input" rows={3} maxLength={160} value={f.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} /></Field>
              <Field label="Keywords"><input className="input" value={f.seoKeywords} onChange={(e) => set('seoKeywords', e.target.value)} placeholder="comma, separated" /></Field>
            </div>
          </div>

          <div className="border-t border-line pt-7">
            <p className="mb-3 text-[12px] font-medium text-muted">Sharing</p>
            <div className="space-y-5">
              <Field label="Social title"><input maxLength={170} className="input" value={f.socialTitle} onChange={(e) => set('socialTitle', e.target.value)} placeholder="Defaults to the title" /></Field>
              <Field label="Social description"><textarea maxLength={240} className="input" rows={2} value={f.socialDescription} onChange={(e) => set('socialDescription', e.target.value)} /></Field>
              <Field label="Social image" hint="1200×630 works best.">
                <button type="button" onClick={() => socialInput.current?.click()} className="group relative grid aspect-[1200/630] w-full place-items-center overflow-hidden rounded border border-dashed border-line bg-surface2/40 text-muted transition-colors hover:border-accent">
                  {socialPrev ? <img src={socialPrev} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-[13px]"><ImagePlus size={18} strokeWidth={1.5} />Choose image</span>}
                  {socialPrev && <span className="absolute inset-0 grid place-items-center bg-black/45 text-[13px] text-white opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">Replace</span>}
                </button>
                <input ref={socialInput} type="file" accept="image/jpeg,image/png" hidden onChange={pickSocial} />
              </Field>
            </div>
          </div>

          <div className="border-t border-line pt-7">
            <p className="mb-3 text-[12px] font-medium text-muted">Media</p>
            <Field label="YouTube video" hint={f.youtubeUrl && !embed ? 'Not a valid YouTube link.' : undefined}>
              <div className="relative"><Globe size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input !pl-9" value={f.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} placeholder="https://youtube.com/watch?v=…" /></div>
              {embed && <iframe src={embed} title="Preview" className="mt-3 aspect-video w-full rounded border-0" allowFullScreen />}
            </Field>
          </div>
        </div>
      </aside>

      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={del} title="Delete this post?" body="It will be removed from the journal permanently." />
    </form>
  );
}
