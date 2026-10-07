'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, FilePlus2, Globe, Hash, Layers, Lightbulb, Lock, NotebookPen, Pin, Trash2, X } from 'lucide-react';
import { api, domainOf, errorMessage } from '@/lib/api';
import { useSetNavHint } from '@/lib/nav-hint';
import Editor from './Editor';
import EditorBar from './EditorBar';
import Select from './Select';
import { ConfirmDialog, Notice, Skeleton } from './ui';

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const KINDS = [{ value: 'note', label: 'Note' }, { value: 'inspiration', label: 'Inspiration' }];

function Prop({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2 py-px">
      <span className="flex items-center gap-2 text-[13px] text-muted"><Icon size={14} strokeWidth={1.6} />{label}</span>
      <div>{children}</div>
    </div>
  );
}

/** Private note / inspiration editor. Autosaves ~0.8s after you stop typing; the note is created on first content. */
export default function NoteEditor({ id }: { id?: string }) {
  const router = useRouter();
  const startKind = useSearchParams().get('kind') === 'inspiration' ? 'inspiration' : 'note';

  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [noteId, setNoteId] = useState<string | null>(id || null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [kind, setKind] = useState(startKind);
  const [sourceUrl, setSourceUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [pinned, setPinned] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useSetNavHint(kind === 'inspiration' ? '/inspiration' : '/notes');

  const idRef = useRef<string | null>(id || null);
  const creating = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef({ title, content, kind, sourceUrl, tags, pinned });
  latest.current = { title, content, kind, sourceUrl, tags, pinned };
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/notes/${id}`).then(({ data: n }) => {
      setTitle(n.title || ''); setContent(n.content || ''); setKind(n.kind || 'note'); setSourceUrl(n.sourceUrl || '');
      setTags(n.tags || []); setPinned(!!n.pinned); setStatus('saved');
    }).catch((e) => setError(errorMessage(e, 'Failed to load the note.'))).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { const el = titleRef.current; if (el) { el.style.height = '0px'; el.style.height = `${el.scrollHeight}px`; } }, [title, loading]);

  const save = useCallback(async () => {
    const d = latest.current;
    const empty = !d.title.trim() && !plain(d.content) && !d.sourceUrl.trim() && d.tags.length === 0;
    if (empty && !idRef.current) { setStatus('idle'); return; }
    if (creating.current) { schedule(); return; }           // first save still in flight: try again after it lands
    setStatus('saving'); setError('');
    try {
      if (idRef.current) await api.put(`/notes/${idRef.current}`, d);
      else {
        creating.current = true;
        const { data } = await api.post('/notes', d);
        idRef.current = String(data.id); setNoteId(String(data.id));
        // Swap /notes/new for the real URL without remounting the editor (keeps focus and caret).
        window.history.replaceState(null, '', `/notes/${data.id}`);
      }
      setStatus('saved');
    } catch (e) { setStatus('error'); setError(errorMessage(e, 'Could not save. Your text is still here.')); }
    finally { creating.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schedule = useCallback(() => {
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = undefined; save(); }, 800);
  }, [save]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Leaving mid-debounce would lose the last keystrokes: flush before the tab hides or the page unloads.
  useEffect(() => {
    const flush = () => { if (timer.current) { clearTimeout(timer.current); timer.current = undefined; save(); } };
    const vis = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); flush(); };
  }, [save]);

  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); schedule(); };
  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) edit(setTags)([...tags, t]);
    setTagDraft('');
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagDraft); }
    else if (e.key === 'Backspace' && !tagDraft && tags.length) edit(setTags)(tags.slice(0, -1));
  };

  // The post form reads the note from the server, so make sure the last keystrokes have been saved first.
  const toPost = async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = undefined; await save(); }
    if (idRef.current) router.push(`/posts/new?fromNote=${idRef.current}`);
  };

  const words = useMemo(() => { const t = plain(content); return t ? t.split(' ').length : 0; }, [content]);
  const togglePin = () => { edit(setPinned)(!pinned); };
  const del = async () => {
    clearTimeout(timer.current); timer.current = undefined;
    try { if (idRef.current) await api.delete(`/notes/${idRef.current}`); router.replace(kind === 'inspiration' ? '/inspiration' : '/notes'); }
    catch (e) { setError(errorMessage(e, 'Failed to delete.')); setConfirmDel(false); }
  };

  const back = kind === 'inspiration' ? { href: '/inspiration', label: 'Inspiration' } : { href: '/notes', label: 'Notes' };
  if (loading) return <div className="mx-auto max-w-[800px] pt-10"><Skeleton rows={6} /></div>;

  return (
    <div className="page-editor">
      <EditorBar backHref={back.href} backLabel={back.label} icon={kind === 'inspiration' ? Lightbulb : NotebookPen} crumb={title}
        state={status === 'saving' ? 'saving' : status === 'saved' ? 'saved' : status === 'error' ? 'error' : 'idle'}
        meta={words > 0 ? `${words.toLocaleString()} words` : undefined}
        badge={<span className="ml-1 hidden items-center gap-1 rounded bg-surface2 px-1.5 py-0.5 text-[12px] text-muted sm:inline-flex"><Lock size={10} strokeWidth={2} /> Private</span>}>
        <button type="button" className={`btn-quiet btn-icon ${pinned ? '!text-accent' : ''}`} onClick={togglePin} aria-label={pinned ? 'Unpin' : 'Pin'} title={pinned ? 'Unpin' : 'Pin to top'}><Pin size={15} fill={pinned ? 'currentColor' : 'none'} /></button>
        <button type="button" className="btn-ghost" disabled={!noteId} onClick={toPost} title="Start a post from this note. The note stays private."><FilePlus2 size={14} /> <span className="hidden sm:inline">Turn into post</span><span className="sm:hidden">Post</span></button>
        {noteId && <button type="button" className="btn-danger btn-icon" onClick={() => setConfirmDel(true)} aria-label="Delete"><Trash2 size={14} /></button>}
      </EditorBar>

      <div className="mx-auto w-full max-w-[800px] animate-rise pt-10 lg:pt-16">
        {error && <Notice>{error}</Notice>}

        <textarea ref={titleRef} rows={1} autoFocus={!id} value={title} onChange={(e) => edit(setTitle)(e.target.value.replace(/\n/g, ' '))} placeholder="Untitled"
          className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-fg outline-none placeholder:text-muted/40 sm:text-[44px]" />

        <div className="mb-8 mt-5 space-y-px border-b border-line pb-5">
          <Prop icon={Layers} label="Type"><Select variant="inline" ariaLabel="Type" value={kind} onChange={edit(setKind)} options={KINDS} /></Prop>
          <Prop icon={Globe} label="Source">
            <div className="flex items-center gap-1">
              <input className="prop-input" value={sourceUrl} onChange={(e) => edit(setSourceUrl)(e.target.value)} placeholder={kind === 'inspiration' ? 'Paste a link' : 'Optional link'} />
              {domainOf(sourceUrl) && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-quiet shrink-0" title="Open link"><ExternalLink size={13} />{domainOf(sourceUrl)}</a>}
            </div>
          </Prop>
          <Prop icon={Hash} label="Tags">
            <div className="flex min-h-8 flex-wrap items-center gap-1.5 rounded px-2 py-1 transition-colors focus-within:bg-surface hover:bg-surface2">
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded bg-surface2 px-1.5 text-[12.5px] leading-5 text-fg">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => edit(setTags)(tags.filter((x) => x !== t))} className="-my-2 -mr-2 grid h-8 w-8 place-items-center text-muted hover:text-fg"><X size={12} /></button></span>
              ))}
              <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={onTagKey} onBlur={() => addTag(tagDraft)} placeholder={tags.length ? '' : 'Add tags'} className="min-w-[80px] flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-muted/60" />
            </div>
          </Prop>
        </div>

        <Editor images={false} placeholder={kind === 'inspiration' ? 'Why does this matter? What did it make you think of?' : 'Write anything…'} value={content} onChange={(v, source) => { setContent(v); latest.current.content = v; if (source === 'user') schedule(); }} />
      </div>

      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={del} title="Delete this note?" body="It’s removed permanently. This can’t be undone." />
    </div>
  );
}
