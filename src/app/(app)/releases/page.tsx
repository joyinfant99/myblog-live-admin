'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Music, Plus, Trash2 } from 'lucide-react';
import { api, errorMessage, fmtDate } from '@/lib/api';
import { ConfirmDialog, EmptyState, Notice, PageHeader, Skeleton } from '@/components/ui';

export default function ReleasesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [del, setDel] = useState<any>(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/releases', { params: { limit: 0, sortOrder: 'desc' } }); setItems(data.releases || []); }
    catch (e) { setError(errorMessage(e, 'Failed to load releases.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    try { await api.delete(`/releases/${del.id}`); setItems((r) => r.filter((x) => x.id !== del.id)); }
    catch (e) { setError(errorMessage(e, 'Failed to delete release.')); }
    setDel(null);
  };

  return (
    <>
      <PageHeader icon={Music} title="Releases" description="Singles and albums shown on the music site.">
        <Link href="/releases/new" className="btn-primary"><Plus size={15} /> New release</Link>
      </PageHeader>
      {error && <Notice>{error}</Notice>}
      {loading ? <Skeleton rows={4} /> : items.length === 0 ? <EmptyState icon={Music} title="No releases yet">Create your first one.</EmptyState> : (
        <div className="grid animate-rise grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 xl:grid-cols-4">
          {items.map((r) => (
            <article key={r.id} className="group relative">
              <Link href={`/releases/${r.id}`} className="block">
                <div className="aspect-square overflow-hidden rounded-md border border-line bg-surface2">
                  {r.coverImage && <img src={r.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-700 [transition-timing-function:var(--ease)] group-hover:scale-[1.03]" />}
                </div>
                <h3 className="mt-2.5 truncate text-[14.5px] font-semibold text-fg">{r.title}</h3>
                <p className="text-[13px] capitalize text-muted">{r.type} · {fmtDate(r.releaseDate)}</p>
              </Link>
              <button onClick={() => setDel(r)} aria-label={`Delete ${r.title}`} className="btn-ghost btn-icon absolute right-2 top-2 !bg-bg/90 opacity-0 backdrop-blur transition-opacity hover:!text-danger group-hover:opacity-100 [@media(hover:none)]:opacity-100 focus:opacity-100"><Trash2 size={14} /></button>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title={`Delete “${del?.title}”?`} body="This release will be removed from the music site. This can’t be undone." />
    </>
  );
}
