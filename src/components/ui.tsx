'use client';

import { AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Notion-style page title: an icon, a big plain title, one line of description, actions on the right. */
export function PageHeader({ icon: Icon, title, description, children }: { icon?: ComponentType<any>; title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 animate-rise">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {Icon && <span className="mb-4 grid h-12 w-12 place-items-center rounded-md bg-surface2 text-fg"><Icon size={24} strokeWidth={1.5} /></span>}
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-fg sm:text-[38px]">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-[14.5px] text-muted">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2 pt-1">{children}</div>}
      </div>
    </header>
  );
}

export function Notice({ kind = 'error', children }: { kind?: 'error' | 'success'; children: ReactNode }) {
  const err = kind === 'error';
  return (
    <div role={err ? 'alert' : 'status'} className={`mb-6 flex animate-rise items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-[13.5px] ${err ? 'border-danger/25 bg-danger/10 text-danger' : 'border-success/25 bg-success/10 text-success'}`}>
      {err ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <Check size={16} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

export function Skeleton({ rows = 6, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-10 animate-shimmer rounded bg-surface2" style={{ animationDelay: `${i * 80}ms`, opacity: 1 - i * 0.08 }} />)}
    </div>
  );
}
export const Spinner = ({ label: _l }: { label?: string }) => <Skeleton />;

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="animate-rise border-t border-line pt-6">
      <h2 className="text-[17px] font-semibold text-fg">{title}</h2>
      {description && <p className="mt-1 text-[13.5px] text-muted">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon?: ComponentType<any>; title?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-line px-6 py-16 text-center">
      {Icon && <Icon size={26} strokeWidth={1.4} className="mb-3 text-muted" />}
      {title && <p className="text-[15px] font-medium text-fg">{title}</p>}
      {children && <div className="mt-1 text-[13.5px] text-muted">{children}</div>}
    </div>
  );
}

export function Tag({ name, bg, fg }: { name: string; bg?: string; fg?: string }) {
  return <span className="inline-flex max-w-full items-center truncate rounded px-1.5 py-px text-[12.5px] leading-5" style={{ background: bg || 'rgb(var(--surface-2-rgb))', color: fg || 'var(--fg)' }}>{name}</span>;
}

export function Modal({ open, onClose, children, width = 'max-w-sm' }: { open: boolean; onClose: () => void; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-start justify-items-center bg-black/40 p-4 pt-[14vh]" onMouseDown={onClose}>
      <div role="dialog" aria-modal className={`w-full ${width} animate-pop rounded-lg bg-surface shadow-pop`} onMouseDown={(e) => e.stopPropagation()}>{children}</div>
    </div>, document.body);
}

export function ConfirmDialog({ open, title, body, confirm = 'Delete', onConfirm, onClose }: { open: boolean; title: string; body?: string; confirm?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5">
        <h3 className="text-[16px] font-semibold text-fg">{title}</h3>
        {body && <p className="mt-1.5 text-[13.5px] text-muted">{body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-danger-solid" onClick={onConfirm}>{confirm}</button>
        </div>
      </div>
    </Modal>
  );
}

/** Footer pager: "1–9 of 24" plus numbered pages with ellipses. Shared by every list so they all behave alike. */
export function Pagination({ page, perPage, total, onPage, noun = 'items' }: { page: number; perPage: number; total: number; onPage: (p: number) => void; noun?: string }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (total === 0) return null;
  const from = (page - 1) * perPage + 1, to = Math.min(total, page * perPage);
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return (
    <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
      <span>{from}–{to} of {total} {noun}</span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button className="btn-quiet btn-icon" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
          {nums.map((n, i) => n === '…'
            ? <span key={`e${i}`} className="w-6 text-center text-muted/60">…</span>
            : <button key={n} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined} className={`h-8 min-w-8 rounded px-2 text-[13px] transition-colors ${n === page ? 'bg-surface2 font-medium text-fg' : 'text-muted hover:bg-surface2/70 hover:text-fg'}`}>{n}</button>)}
          <button className="btn-quiet btn-icon" disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
        </div>
      )}
    </nav>
  );
}
