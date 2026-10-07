'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, FileText, LayoutDashboard, Lightbulb, Music, NotebookPen, Search, Tags, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { Modal } from './ui';

type Hit = { key: string; label: string; hint: string; href: string; icon: LucideIcon };
const PAGES: Hit[] = [
  { key: 'p-dash', label: 'Dashboard', hint: 'Page', href: '/dashboard', icon: LayoutDashboard },
  { key: 'p-posts', label: 'Posts', hint: 'Page', href: '/posts', icon: FileText },
  { key: 'p-new', label: 'New post', hint: 'Action', href: '/posts/new', icon: FileText },
  { key: 'p-cat', label: 'Categories', hint: 'Page', href: '/categories', icon: Tags },
  { key: 'p-rel', label: 'Releases', hint: 'Page', href: '/releases', icon: Music },
  { key: 'p-ana', label: 'Analytics', hint: 'Page', href: '/analytics', icon: BarChart3 },
  { key: 'p-notes', label: 'Notes', hint: 'Private', href: '/notes', icon: NotebookPen },
  { key: 'p-insp', label: 'Inspiration', hint: 'Private', href: '/inspiration', icon: Lightbulb },
];

export default function QuickFind({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [data, setData] = useState<Hit[]>([]);
  const input = useRef<HTMLInputElement>(null);

  // Content is fetched when the palette opens; each source fails quietly on its own.
  useEffect(() => {
    if (!open) return;
    setQ(''); setHi(0); setTimeout(() => input.current?.focus(), 30);
    let live = true;
    Promise.allSettled([api.get('/posts?limit=0'), api.get('/releases', { params: { limit: 0 } }), api.get('/notes')]).then(([p, r, n]) => {
      if (!live) return;
      const hits: Hit[] = [];
      if (p.status === 'fulfilled') (p.value.data.posts || []).forEach((x: any) => hits.push({ key: `post-${x.id}`, label: x.title, hint: 'Post', href: `/posts/${x.id}`, icon: FileText }));
      if (r.status === 'fulfilled') (r.value.data.releases || []).forEach((x: any) => hits.push({ key: `rel-${x.id}`, label: x.title, hint: 'Release', href: `/releases/${x.id}`, icon: Music }));
      if (n.status === 'fulfilled') n.value.data.forEach((x: any) => hits.push({ key: `note-${x.id}`, label: x.title || 'Untitled', hint: x.kind === 'inspiration' ? 'Inspiration' : 'Note', href: `/notes/${x.id}`, icon: x.kind === 'inspiration' ? Lightbulb : NotebookPen }));
      setData(hits);
    });
    return () => { live = false; };
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = [...PAGES, ...data];
    return (s ? all.filter((h) => h.label.toLowerCase().includes(s)) : all.slice(0, 9)).slice(0, 12);
  }, [q, data]);
  useEffect(() => setHi(0), [q]);

  const go = (h?: Hit) => { if (!h) return; onClose(); router.push(h.href); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[hi]); }
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-xl">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search size={16} className="text-muted" />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Search posts, releases, notes…" className="h-12 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted/70" />
        <kbd className="font-mono text-[11px] text-muted">esc</kbd>
      </div>
      <ul className="max-h-[50vh] overflow-y-auto p-1.5">
        {results.length === 0 && <li className="px-3 py-6 text-center text-[13.5px] text-muted">No results</li>}
        {results.map((h, i) => (
          <li key={h.key} onMouseEnter={() => setHi(i)} onClick={() => go(h)} className={`flex cursor-pointer items-center gap-3 rounded px-2.5 py-2 ${i === hi ? 'bg-surface2' : ''}`}>
            <h.icon size={16} strokeWidth={1.6} className="shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-[14px] text-fg">{h.label}</span>
            <span className="text-[12px] text-muted">{h.hint}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
