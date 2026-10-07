'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type Option = { value: string; label: string; bg?: string; fg?: string };

/**
 * Replacement for the browser's <select>: same value/onChange contract, a custom popover,
 * keyboard support (↑ ↓ Enter Esc), and options can carry a colour chip like a Notion select.
 * The popover is portalled and fixed-positioned so cards with overflow-hidden never clip it.
 */
export default function Select({ value, onChange, options, placeholder = 'Select…', variant = 'field', className = '', ariaLabel }: {
  value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string; variant?: 'field' | 'inline'; className?: string; ariaLabel?: string;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, up: false });
  const [hi, setHi] = useState(0);
  const sel = options.find((o) => o.value === value);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect(); if (!r) return;
    const room = window.innerHeight - r.bottom, need = Math.min(options.length * 34 + 12, 288);
    setPos({ left: r.left, top: room < need && r.top > room ? r.top - 6 : r.bottom + 6, width: Math.max(r.width, 180), up: room < need && r.top > room });
  }, [options.length]);

  useLayoutEffect(() => { if (open) { place(); setHi(Math.max(0, options.findIndex((o) => o.value === value))); } }, [open, place, options, value]);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('resize', close); window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [open]);

  const pick = (v: string) => { onChange(v); setOpen(false); btn.current?.focus(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); } return; }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (options[hi]) pick(options[hi].value); }
  };

  const base = variant === 'inline'
    ? 'prop-input flex items-center gap-2 text-left'
    : 'input flex items-center justify-between gap-2 text-left';

  return (
    <>
      <button ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen((o) => !o)} onKeyDown={onKey} className={`${base} ${className}`}>
        <span className="min-w-0 flex-1 truncate">
          {sel ? (sel.bg ? <span className="rounded px-1.5 py-px text-[12.5px]" style={{ background: sel.bg, color: sel.fg }}>{sel.label}</span> : sel.label) : <span className="text-muted/70">{variant === 'inline' ? 'Empty' : placeholder}</span>}
        </span>
        {variant === 'field' && <ChevronDown size={15} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[80]" onMouseDown={() => setOpen(false)}>
          <ul role="listbox" onMouseDown={(e) => e.stopPropagation()} className="absolute max-h-72 animate-pop overflow-y-auto rounded-lg bg-surface p-1.5 shadow-pop"
            style={{ left: pos.left, width: pos.width, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}>
            {options.length === 0 && <li className="px-2.5 py-2 text-[13px] text-muted">No options</li>}
            {options.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value} onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded px-2.5 py-1.5 text-[14px] text-fg ${i === hi ? 'bg-surface2' : ''}`}>
                {o.bg ? <span className="rounded px-1.5 py-px text-[12.5px]" style={{ background: o.bg, color: o.fg }}>{o.label}</span> : <span className="truncate">{o.label}</span>}
                {o.value === value && <Check size={14} className="shrink-0 text-accent" />}
              </li>
            ))}
          </ul>
        </div>, document.body)}
    </>
  );
}
