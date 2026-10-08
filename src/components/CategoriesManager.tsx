'use client';

import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { PALETTE, readableOn } from '@/lib/palette';
import { ConfirmDialog, EmptyState, Notice, PageHeader, Skeleton, Tag } from '@/components/ui';

const Palette = ({ bg, onPick }: { bg: string; onPick: (p: { bg: string; fg: string }) => void }) => (
  <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Colour">
    {PALETTE.map((p) => (
      <button key={p.name} type="button" role="radio" aria-checked={bg.toLowerCase() === p.bg} title={p.name} aria-label={p.name} onClick={() => onPick(p)}
        className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold transition-transform hover:scale-110 ${bg.toLowerCase() === p.bg ? 'border-fg ring-1 ring-fg' : 'border-line'}`} style={{ background: p.bg, color: p.fg }}>A</button>
    ))}
    <label className="relative grid h-6 w-6 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-muted text-[13px] text-muted" title="Custom colour">
      +<input type="color" value={bg} onChange={(e) => onPick({ bg: e.target.value, fg: readableOn(e.target.value) })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Custom colour" />
    </label>
  </div>
);

export default function CategoriesManager({ embedded = false }: { embedded?: boolean }) {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: '', backgroundColor: '#e0e0e0', fontColor: '#000000' });
  const [del, setDel] = useState<any>(null);

  const flash = (m: string) => { setOk(m); setTimeout(() => setOk(''), 2500); };
  const wrap = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(errorMessage(e, fallback)); } finally { setBusy(false); }
  };

  useEffect(() => { api.get('/categories').then((r) => setCats(r.data)).catch((e) => setError(errorMessage(e, 'Failed to load categories.'))).finally(() => setLoading(false)); }, []);

  const add = () => wrap(async () => {
    const { data } = await api.post('/categories', { name: name.trim(), backgroundColor: PALETTE[cats.length % PALETTE.length].bg, fontColor: PALETTE[cats.length % PALETTE.length].fg });
    setCats((c) => [...c, data]); setName(''); flash('Category added.');
  }, 'Failed to create category.');

  const save = () => wrap(async () => {
    const { data } = await api.put(`/categories/${editId}`, { name: draft.name.trim(), backgroundColor: draft.backgroundColor, fontColor: draft.fontColor });
    setCats((c) => c.map((x) => (x.id === editId ? data : x))); setEditId(null); flash('Category updated.');
  }, 'Failed to update category.');

  const remove = () => wrap(async () => {
    await api.delete(`/categories/${del.id}`); setCats((c) => c.filter((x) => x.id !== del.id)); setDel(null); flash('Category deleted.');
  }, 'Failed to delete category.');

  return (
    <>
      {embedded
        ? <div className="mb-3 flex items-center gap-2"><Tags size={16} className="text-muted" /><h2 className="text-[17px] font-semibold text-fg">Categories</h2><span className="text-[13px] text-muted">Colour-coded labels for your posts</span></div>
        : <PageHeader icon={Tags} title="Categories" description="Colour-coded labels for your posts." />}
      {error && <Notice>{error}</Notice>}
      {ok && <Notice kind="success">{ok}</Notice>}

      {loading ? <Skeleton rows={5} /> : cats.length === 0 ? <EmptyState icon={Tags} title="No categories yet">Add one below.</EmptyState> : (
        <ul className="animate-rise border-t border-line">
          {cats.map((c) => (
            <li key={c.id} className="group flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5 transition-colors hover:bg-surface2/60">
              {editId === c.id ? (
                <div className="flex flex-1 flex-wrap items-center gap-4">
                  <input autoFocus className="input !w-56" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && draft.name.trim()) save(); if (e.key === 'Escape') setEditId(null); }} />
                  <Palette bg={draft.backgroundColor} onPick={(p) => setDraft({ ...draft, backgroundColor: p.bg, fontColor: p.fg })} />
                  <Tag name={draft.name || 'Preview'} bg={draft.backgroundColor} fg={draft.fontColor} />
                  <div className="ml-auto flex gap-1.5">
                    <button className="btn-primary btn-icon" onClick={save} disabled={busy || !draft.name.trim()} aria-label="Save"><Check size={15} /></button>
                    <button className="btn-ghost btn-icon" onClick={() => setEditId(null)} aria-label="Cancel"><X size={15} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <Tag name={c.name} bg={c.backgroundColor} fg={c.fontColor} />
                  <div className="flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    <button className="btn-quiet btn-icon" aria-label={`Edit ${c.name}`} onClick={() => { setEditId(c.id); setDraft({ name: c.name, backgroundColor: c.backgroundColor || '#e0e0e0', fontColor: c.fontColor || '#000000' }); }}><Pencil size={14} /></button>
                    <button className="btn-quiet btn-icon hover:!text-danger" aria-label={`Delete ${c.name}`} onClick={() => setDel(c)}><Trash2 size={14} /></button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="mt-1 flex items-center gap-2 px-3 py-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) add(); }}>
        <Plus size={15} className="text-muted" />
        <input className="h-8 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-muted/70" placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} />
        {name.trim() && <button className="btn-primary" disabled={busy}>Add</button>}
      </form>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title={`Delete “${del?.name}”?`} body="Posts in this category will lose their label." />
    </>
  );
}
