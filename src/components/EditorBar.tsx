'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
const STATE: Record<Exclude<SaveState, 'idle'>, { label: string; dot: string }> = {
  dirty: { label: 'Unsaved', dot: 'bg-accent' },
  saving: { label: 'Saving', dot: 'bg-accent animate-pulse' },
  saved: { label: 'Saved', dot: 'bg-success' },
  error: { label: 'Not saved', dot: 'bg-danger' },
};

/**
 * Top bar shared by every editor. Left: a back chip and "Section / Title" breadcrumb. Right: save state and actions.
 * It is an ordinary row at the top of the page and scrolls away with it (nothing is pinned).
 */
export default function EditorBar({ backHref, backLabel, icon: Icon, crumb, badge, state = 'idle', meta, children }: {
  backHref: string; backLabel: string; icon?: ComponentType<any>; crumb: string; badge?: ReactNode; state?: SaveState; meta?: ReactNode; children: ReactNode;
}) {
  const s = state === 'idle' ? null : STATE[state];

  return (
    <div className="flex h-12 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1 text-[13.5px]">
        <Link href={backHref} className="inline-flex h-8 items-center gap-1 rounded-lg pl-1.5 pr-2.5 text-muted transition-colors hover:bg-surface2 hover:text-fg" aria-label={`Back to ${backLabel}`}>
          <ChevronLeft size={16} />{Icon && <Icon size={14} strokeWidth={1.6} className="hidden sm:block" />}<span className="hidden sm:inline">{backLabel}</span>
        </Link>
        <span className="hidden text-muted/40 sm:inline">/</span>
        <span className="max-w-[min(320px,40vw)] truncate px-1.5 font-medium text-fg">{crumb || 'Untitled'}</span>
        {badge}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {meta && <span className="mr-1 hidden text-[12px] text-muted lg:block">{meta}</span>}
        {s && (
          <span className="mr-0.5 hidden items-center gap-1.5 rounded-full bg-surface2 px-2.5 py-1 text-[12px] text-muted sm:inline-flex" role="status">
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
