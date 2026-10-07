'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, FileText, Plus, Search, Tag, Trash2, Type } from 'lucide-react';
import { api, errorMessage, fmtDate } from '@/lib/api';
import { ConfirmDialog, EmptyState, Notice, PageHeader, Pagination, Skeleton, Tag as Chip } from '@/components/ui';
import Select from '@/components/Select';

const PER_PAGE = 12;
const SORTS = [{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'title', label: 'Title A–Z' }];

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/posts?limit=0');
      if (!Array.isArray(data?.posts)) throw new Error('Invalid response from server');
      setPosts(data.posts);
    } catch (e) { setError(errorMessage(e, 'Failed to load posts')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cats = useMemo(() => {
    const m = new Map<string, any>();
    posts.forEach((p) => p.Category && !m.has(p.Category.name) && m.set(p.Category.name, p.Category));
    return [...m.values()];
  }, [posts]);

  const summary = useMemo(() => {
    const now = new Date();
    const month = posts.filter((p) => { const d = new Date(p.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
    let rhythm = '';
    if (posts.length > 1) {
      const t = posts.map((p) => +new Date(p.createdAt));
      const perDay = posts.length / (((Math.max(...t) - Math.min(...t)) / 864e5) || 1);
      rhythm = perDay >= 1 ? `about ${Math.round(perDay)} a day` : perDay * 7 >= 1 ? `about ${Math.round(perDay * 7)} a week` : `about ${Math.round(perDay * 30)} a month`;
    }
    return [`${posts.length} post${posts.length === 1 ? '' : 's'}`, `${month} this month`, rhythm].filter(Boolean).join(' · ');
  }, [posts]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = posts.filter((p) => (!category || p.Category?.name === category) && (!s || p.title.toLowerCase().includes(s) || (p.Category?.name || '').toLowerCase().includes(s)));
    return out.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'oldest' ? +new Date(a.createdAt) - +new Date(b.createdAt) : +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [posts, q, category, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  useEffect(() => { if (page > pages) setPage(1); }, [page, pages]);
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const remove = async () => {
    try { await Promise.all(selected.map((id) => api.delete(`/posts/${id}`))); setSelected([]); setConfirming(false); await load(); }
    catch (e) { setError(errorMessage(e, 'Failed to delete posts')); setConfirming(false); }
  };

  return (
    <>
      <PageHeader icon={FileText} title="Posts" description={loading && !posts.length ? 'Loading…' : summary}>
        <Link href="/posts/new" className="btn-primary"><Plus size={15} /> New post</Link>
      </PageHeader>

      {error && <Notice>{error}</Notice>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-8" placeholder="Search posts" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select ariaLabel="Category" className="!w-44" value={category} onChange={(v) => { setCategory(v); setPage(1); }}
          options={[{ value: '', label: 'All categories' }, ...cats.map((c) => ({ value: c.name, label: c.name, bg: c.backgroundColor, fg: c.fontColor }))]} />
        <Select ariaLabel="Sort" className="!w-40" value={sort} onChange={setSort} options={SORTS} />
        {selected.length > 0 && <button className="btn-danger ml-auto" onClick={() => setConfirming(true)}><Trash2 size={14} /> Delete {selected.length}</button>}
      </div>

      {loading && posts.length === 0 ? <Skeleton rows={8} /> : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={posts.length ? 'Nothing matches' : 'No posts yet'}>{posts.length ? 'Try a different search or category.' : 'Write your first post to see it here.'}</EmptyState>
      ) : (
        <div className="animate-rise">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-line">
                <th className="th w-10"><input type="checkbox" aria-label="Select all" checked={allOnPage} onChange={() => setSelected((s) => (allOnPage ? s.filter((id) => !rows.some((r) => r.id === id)) : [...new Set([...s, ...rows.map((r) => r.id)])]))} /></th>
                <th className="th"><span className="inline-flex items-center gap-1.5"><Type size={13} /> Title</span></th>
                <th className="th hidden w-44 md:table-cell"><span className="inline-flex items-center gap-1.5"><Tag size={13} /> Category</span></th>
                <th className="th hidden w-36 sm:table-cell"><span className="inline-flex items-center gap-1.5"><Calendar size={13} /> Created</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="group border-b border-line transition-colors hover:bg-surface2/60">
                  <td className="td"><input type="checkbox" aria-label={`Select ${p.title}`} className={selected.length ? '' : 'opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100 focus:opacity-100'} checked={selected.includes(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td className="td max-w-0 overflow-hidden">
                    <Link href={`/posts/${p.id}`} className="flex min-w-0 items-center gap-2.5 font-medium text-fg">
                      <FileText size={15} strokeWidth={1.5} className="shrink-0 text-muted" />
                      <span className="truncate underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-line">{p.title}</span>
                    </Link>
                    <span className="mt-0.5 block truncate pl-[25px] text-[12px] text-muted sm:hidden">{p.Category?.name ? `${p.Category.name} · ` : ''}{fmtDate(p.createdAt)}</span>
                  </td>
                  <td className="td hidden md:table-cell">{p.Category && <Chip name={p.Category.name} bg={p.Category.backgroundColor} fg={p.Category.fontColor} />}</td>
                  <td className="td hidden whitespace-nowrap text-muted sm:table-cell">{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
              <tr><td colSpan={4} className="p-0"><Link href="/posts/new" className="flex items-center gap-2 px-3 py-2.5 text-[13.5px] text-muted transition-colors hover:bg-surface2/60 hover:text-fg"><Plus size={14} /> New post</Link></td></tr>
            </tbody>
          </table>
          <Pagination page={page} perPage={PER_PAGE} total={filtered.length} onPage={setPage} noun="posts" />
        </div>
      )}

      <ConfirmDialog open={confirming} onClose={() => setConfirming(false)} onConfirm={remove}
        title={`Delete ${selected.length} post${selected.length > 1 ? 's' : ''}?`} body="This permanently removes them from the journal and can’t be undone." />
    </>
  );
}
