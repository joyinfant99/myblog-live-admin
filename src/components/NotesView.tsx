'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Filter, LayoutGrid, Lightbulb, List, Lock, NotebookPen, Pin, PinOff, Plus, Search, Type, X, Hash, Link2, Clock } from 'lucide-react';
import { ago, api, domainOf, errorMessage } from '@/lib/api';
import { EmptyState, Notice, PageHeader, Pagination, Skeleton } from './ui';
import Select from './Select';

const COPY = {
  note: { title: 'Notes', icon: NotebookPen, blurb: 'Drafts, thoughts and half-ideas. Nothing here is ever published.', empty: 'Capture your first note.' },
  inspiration: { title: 'Inspiration', icon: Lightbulb, blurb: 'Links, quotes and references worth keeping. Just for you.', empty: 'Save your first inspiration.' },
} as const;

export function PrivateBadge() {
  return <span className="inline-flex items-center gap-1.5 rounded bg-surface2 px-2 py-1 text-[12px] text-muted"><Lock size={11} strokeWidth={2} /> Only you</span>;
}

/* ---------- filter conditions (Notion-style: property · operator · value, all ANDed) ---------- */
type Cond = { id: number; field: 'tag' | 'link' | 'pinned' | 'updated'; op: string; value: string };
const FIELDS = [{ value: 'tag', label: 'Tag' }, { value: 'link', label: 'Link' }, { value: 'pinned', label: 'Pinned' }, { value: 'updated', label: 'Updated' }];
const OPS: Record<Cond['field'], { value: string; label: string }[]> = {
  tag: [{ value: 'is', label: 'is' }, { value: 'isnot', label: 'is not' }],
  link: [{ value: 'set', label: 'is set' }, { value: 'empty', label: 'is empty' }],
  pinned: [{ value: 'yes', label: 'is pinned' }, { value: 'no', label: 'is not pinned' }],
  updated: [{ value: 'within', label: 'is within' }, { value: 'older', label: 'is older than' }],
};
const DAYS = [{ value: '1', label: '24 hours' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }];
const needsValue = (f: Cond['field']) => f === 'tag' || f === 'updated';

const matches = (n: any, c: Cond) => {
  switch (c.field) {
    case 'tag': { const has = (n.tags || []).includes(c.value); return c.op === 'is' ? has : !has; }
    case 'link': return c.op === 'set' ? !!n.sourceUrl : !n.sourceUrl;
    case 'pinned': return c.op === 'yes' ? !!n.pinned : !n.pinned;
    case 'updated': { const age = (Date.now() - +new Date(n.updatedAt)) / 864e5; return c.op === 'within' ? age <= +c.value : age > +c.value; }
  }
};
const describe = (c: Cond) => {
  const f = FIELDS.find((x) => x.value === c.field)!.label, op = OPS[c.field].find((o) => o.value === c.op)!.label;
  const v = c.field === 'updated' ? DAYS.find((d) => d.value === c.value)?.label : c.field === 'tag' ? c.value : '';
  return c.field === 'pinned' ? op.replace(/^is/, 'Is').replace('Is pinned', 'Pinned').replace('Is not pinned', 'Not pinned') : `${f} ${op}${v ? ` ${v}` : ''}`;
};

const SORTS = [
  { value: 'pinned', label: 'Pinned, then recent' },
  { value: 'recent', label: 'Recently updated' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
];
const VIEW_KEY = 'admin.notes.view';
const PER_PAGE = { cards: 9, list: 15 } as const;

export default function NotesView({ kind }: { kind: 'note' | 'inspiration' }) {
  const c = COPY[kind];
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [sort, setSort] = useState('pinned');
  const [conds, setConds] = useState<Cond[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { try { if (localStorage.getItem(VIEW_KEY) === 'list') setView('list'); } catch {} }, []);
  const chooseView = (v: 'cards' | 'list') => { setView(v); setPage(1); try { localStorage.setItem(VIEW_KEY, v); } catch {} };

  const load = useCallback(async () => {
    try { setItems((await api.get('/notes', { params: { kind } })).data); setError(''); }
    catch (e) { setError(errorMessage(e, 'Failed to load.')); }
    finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { setLoading(true); setConds([]); setQ(''); setPage(1); load(); }, [load]);

  // A tag condition with no tag picked yet is still being built, so it doesn't filter anything.
  const active = useMemo(() => conds.filter((cd) => cd.field !== 'tag' || cd.value), [conds]);
  const allTags = useMemo(() => [...new Set(items.flatMap((n) => n.tags || []))].sort() as string[], [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = items.filter((n) => (!s || `${n.title} ${n.preview} ${(n.tags || []).join(' ')} ${n.sourceUrl || ''}`.toLowerCase().includes(s)) && active.every((cd) => matches(n, cd)));
    const t = (n: any) => +new Date(n.updatedAt);
    return out.sort((a, b) => sort === 'title' ? (a.title || '').localeCompare(b.title || '') : sort === 'oldest' ? t(a) - t(b) : sort === 'recent' ? t(b) - t(a) : (+b.pinned - +a.pinned) || (t(b) - t(a)));
  }, [items, q, active, sort]);

  const perPage = PER_PAGE[view];
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const rows = filtered.slice((page - 1) * perPage, page * perPage);

  const addCond = () => setConds((l) => [...l, { id: Date.now(), field: 'tag', op: 'is', value: '' }]);
  const patch = (id: number, p: Partial<Cond>) => { setConds((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x))); setPage(1); };
  const setField = (id: number, field: Cond['field']) => patch(id, { field, op: OPS[field][0].value, value: field === 'updated' ? '7' : '' });

  const togglePin = async (e: React.MouseEvent, n: any) => {
    e.preventDefault(); e.stopPropagation();
    setItems((l) => l.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x)));
    try { await api.put(`/notes/${n.id}`, { pinned: !n.pinned }); } catch (err) { setError(errorMessage(err, 'Failed to pin.')); load(); }
  };

  const PinBtn = ({ n, className = '' }: { n: any; className?: string }) => (
    <button onClick={(e) => togglePin(e, n)} aria-label={n.pinned ? 'Unpin' : 'Pin'} className={`grid h-9 w-9 place-items-center rounded text-muted transition-opacity hover:bg-surface2 hover:text-fg ${n.pinned ? '!text-accent' : 'opacity-0 focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100'} ${className}`}>
      {n.pinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
    </button>
  );

  const Card = ({ n }: { n: any }) => (
    <Link href={`/notes/${n.id}`} className="group relative flex min-h-[148px] min-w-0 flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:bg-surface2/60">
      <h3 className="truncate pr-6 text-[15px] font-semibold text-fg">{n.title || 'Untitled'}</h3>
      {n.preview ? <p className="mt-1.5 line-clamp-4 text-[13.5px] leading-relaxed text-muted">{n.preview}</p> : <p className="mt-1.5 text-[13.5px] italic text-muted/60">Empty</p>}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        {n.sourceUrl && <span className="inline-flex items-center gap-1 rounded bg-surface2 px-1.5 py-px text-[12px] text-muted"><ExternalLink size={10} />{domainOf(n.sourceUrl)}</span>}
        {(n.tags || []).slice(0, 3).map((t: string) => <span key={t} className="rounded bg-surface2 px-1.5 py-px text-[12px] text-muted">{t}</span>)}
        <span className="ml-auto text-[12px] text-muted/70">{ago(n.updatedAt)}</span>
      </div>
      <PinBtn n={n} className="absolute right-1 top-1" />
    </Link>
  );

  return (
    <>
      <PageHeader icon={c.icon} title={c.title} description={<span className="flex flex-wrap items-center gap-2.5">{c.blurb}<PrivateBadge /></span>}>
        <Link href={`/notes/new?kind=${kind}`} className="btn-primary"><Plus size={15} /> New</Link>
      </PageHeader>
      {error && <Notice>{error}</Notice>}

      {/* toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-8" placeholder={`Search ${c.title.toLowerCase()}`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>

        <div className="relative">
          <button className={`btn-ghost ${active.length ? '!border-accent/50 !text-accent' : ''}`} onClick={() => { if (!conds.length) addCond(); setFilterOpen((o) => !o); }} aria-expanded={filterOpen}>
            <Filter size={14} /> Filter{active.length > 0 && <span className="rounded bg-accent/15 px-1.5 text-[12px]">{active.length}</span>}
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-40" onMouseDown={() => setFilterOpen(false)} />
              <div className="absolute left-0 top-10 z-50 w-[min(560px,calc(100vw-2.5rem))] animate-pop rounded-lg bg-surface p-3 shadow-pop">
                <p className="mb-2 px-1 text-[12.5px] text-muted">Show items that match <strong className="font-medium text-fg">all</strong> of these:</p>
                <div className="space-y-2">
                  {conds.map((cd) => (
                    <div key={cd.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                      <Select className="sm:!w-28" ariaLabel="Property" value={cd.field} onChange={(v) => setField(cd.id, v as Cond['field'])} options={FIELDS} />
                      <Select className="sm:!w-36" ariaLabel="Condition" value={cd.op} onChange={(v) => patch(cd.id, { op: v })} options={OPS[cd.field]} />
                      {cd.field === 'tag' && <Select className="sm:!w-36" ariaLabel="Tag" value={cd.value} onChange={(v) => patch(cd.id, { value: v })} options={allTags.map((t) => ({ value: t, label: t }))} placeholder={allTags.length ? 'Pick a tag' : 'No tags yet'} />}
                      {cd.field === 'updated' && <Select className="sm:!w-36" ariaLabel="Period" value={cd.value} onChange={(v) => patch(cd.id, { value: v })} options={DAYS} />}
                      <button className="btn-quiet btn-icon ml-auto shrink-0" aria-label="Remove condition" onClick={() => { setConds((l) => l.filter((x) => x.id !== cd.id)); setPage(1); }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <button className="btn-quiet" onClick={addCond}><Plus size={14} /> Add condition</button>
                  {conds.length > 0 && <button className="btn-quiet hover:!text-danger" onClick={() => { setConds([]); setFilterOpen(false); setPage(1); }}>Clear all</button>}
                </div>
              </div>
            </>
          )}
        </div>

        <Select ariaLabel="Sort" className="!w-48" value={sort} onChange={(v) => { setSort(v); setPage(1); }} options={SORTS} />

        <div className="ml-auto inline-flex rounded border border-line p-0.5" role="group" aria-label="View">
          {([['cards', LayoutGrid, 'Cards'], ['list', List, 'List']] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => chooseView(v)} aria-pressed={view === v} title={label} className={`inline-flex h-9 items-center gap-1.5 rounded px-3 text-[13px] lg:h-7 lg:px-2.5 transition-colors ${view === v ? 'bg-surface2 font-medium text-fg' : 'text-muted hover:text-fg'}`}>
              <Icon size={14} /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {active.length > 0 && !filterOpen && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {active.map((cd) => (
            <span key={cd.id} className="inline-flex items-center gap-1 rounded bg-accent/10 py-0.5 pl-2 pr-1 text-[12.5px] text-accent">
              {describe(cd)}<button aria-label="Remove filter" onClick={() => { setConds((l) => l.filter((x) => x.id !== cd.id)); setPage(1); }} className="rounded p-0.5 hover:bg-accent/15"><X size={11} /></button>
            </span>
          ))}
          <button className="btn-quiet !h-6 !px-1.5 text-[12.5px]" onClick={() => { setConds([]); setPage(1); }}>Clear</button>
        </div>
      )}

      {loading ? <Skeleton rows={5} /> : filtered.length === 0 ? (
        <EmptyState icon={c.icon} title={items.length ? 'Nothing matches' : `No ${c.title.toLowerCase()} yet`}>{items.length ? 'Try removing a filter or changing the search.' : c.empty}</EmptyState>
      ) : view === 'cards' ? (
        <div className="grid animate-rise grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((n) => <Card key={n.id} n={n} />)}</div>
      ) : (
        <div className="animate-rise overflow-x-auto">
          <table className="w-full min-w-[560px] text-[14px]">
            <thead>
              <tr className="border-b border-line">
                <th className="th"><span className="inline-flex items-center gap-1.5"><Type size={13} /> Title</span></th>
                <th className="th hidden w-48 md:table-cell"><span className="inline-flex items-center gap-1.5"><Hash size={13} /> Tags</span></th>
                <th className="th hidden w-40 lg:table-cell"><span className="inline-flex items-center gap-1.5"><Link2 size={13} /> Link</span></th>
                <th className="th w-28"><span className="inline-flex items-center gap-1.5"><Clock size={13} /> Updated</span></th>
                <th className="th w-9" />
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className="group border-b border-line transition-colors hover:bg-surface2/60">
                  <td className="td max-w-0">
                    <Link href={`/notes/${n.id}`} className="flex items-baseline gap-2.5">
                      <c.icon size={15} strokeWidth={1.5} className="shrink-0 translate-y-[3px] text-muted" />
                      <span className="shrink-0 font-medium text-fg">{n.title || 'Untitled'}</span>
                      {n.preview && <span className="hidden truncate text-[13px] text-muted/80 sm:block">{n.preview}</span>}
                    </Link>
                  </td>
                  <td className="td hidden md:table-cell"><div className="flex flex-wrap gap-1">{(n.tags || []).slice(0, 3).map((t: string) => <span key={t} className="rounded bg-surface2 px-1.5 py-px text-[12px] text-muted">{t}</span>)}</div></td>
                  <td className="td hidden truncate text-[13px] text-muted lg:table-cell">{domainOf(n.sourceUrl)}</td>
                  <td className="td whitespace-nowrap text-[13px] text-muted">{ago(n.updatedAt)}</td>
                  <td className="td"><PinBtn n={n} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && <Pagination page={page} perPage={perPage} total={filtered.length} onPage={setPage} noun={c.title.toLowerCase()} />}
    </>
  );
}
