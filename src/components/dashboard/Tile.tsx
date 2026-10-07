'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

/** Respect the OS "reduce motion" setting for count-ups and the like. */
export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { setR(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  return r;
}

/** Counts up to `target` when it first appears or changes. */
export function useCountUp(target: number | null | undefined, ms = 800) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target == null) return;
    if (reduce) { setV(target); return; }
    let raf = 0; const from = 0, start = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - start) / ms); setV(from + (target - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return target == null ? null : v;
}

type Glow = 'success' | 'danger' | 'accent' | 'muted';
const GLOW: Record<Glow, string> = { success: 'var(--success)', danger: 'var(--danger)', accent: 'var(--accent)', muted: 'var(--muted)' };

/** One bento box. Pass `href` to make the whole tile a link, `onClick` to make it a button, `aura` for a coloured wash. */
export default function Tile({ className = '', glow = 'accent', aura = false, href, onClick, delay = 0, children, label }: {
  className?: string; glow?: Glow; aura?: boolean; href?: string; onClick?: () => void; delay?: number; children: ReactNode; label?: string;
}) {
  const move = useCallback((e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, []);
  const style = { '--glow': GLOW[glow], animationDelay: `${delay}ms` } as CSSProperties;
  const cls = `bento group animate-rise ${aura ? 'bento-aura' : ''} ${href || onClick ? 'bento-lift cursor-pointer' : ''} ${className}`;
  if (href) return <Link href={href} onMouseMove={move} style={style} aria-label={label} className={`${cls} block`}>{children}</Link>;
  if (onClick) return <div role="button" tabIndex={0} aria-label={label} onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())} onMouseMove={move} style={style} className={cls}>{children}</div>;
  return <section onMouseMove={move} style={style} aria-label={label} className={cls}>{children}</section>;
}

export const Eyebrow = ({ icon: Icon, children, className = '' }: { icon?: any; children: ReactNode; className?: string }) => (
  <p className={`flex items-center gap-1.5 text-[12.5px] font-medium text-muted ${className}`}>{Icon && <Icon size={13} strokeWidth={1.8} />}{children}</p>
);
