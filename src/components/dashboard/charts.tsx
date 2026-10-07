'use client';

import { useEffect, useId, useState } from 'react';
import { ago } from '@/lib/api';

export type Check = { ok: boolean; ms: number | null; code: number | null; error: string | null; at: string };
const TONE = { success: 'var(--success)', danger: 'var(--danger)', accent: 'var(--accent)', muted: 'var(--muted)' };

/** Progress ring that sweeps in on mount. `value` is 0-100. */
export function Ring({ value, size = 132, stroke = 11, tone = 'success', children }: { value: number | null; size?: number; stroke?: number; tone?: keyof typeof TONE; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShown(value ?? 0), 80); return () => clearTimeout(t); }, [value]);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE[tone]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, shown)) / 100)} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Smooth area sparkline. Nulls are skipped. */
export function Spark({ values, height = 64, tone = 'accent' }: { values: (number | null)[]; height?: number; tone?: keyof typeof TONE }) {
  const id = useId().replace(/:/g, '');
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return <div className="grid place-items-center text-[12px] text-muted/70" style={{ height }}>Not enough data yet</div>;
  const W = 300, H = 100, max = Math.max(...pts.map((p) => p.v)), min = Math.min(...pts.map((p) => p.v)), span = Math.max(1, max - min);
  const x = (k: number) => (k / Math.max(1, pts.length - 1)) * W;   // spread the points we have across the whole width
  const y = (v: number) => H - 10 - ((v - min) / span) * (H - 24);
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={TONE[tone]} stopOpacity=".35" /><stop offset="1" stopColor={TONE[tone]} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={TONE[tone]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export type Slot = { up: number; total: number };
/** Fleet heartbeat: one bar per check round (oldest left). Green = all up, amber = some down, red = all down. */
export function Timeline({ slots, height = 44 }: { slots: Slot[]; height?: number }) {
  return (
    <div className="flex w-full items-end gap-[3px]" style={{ height }} role="img" aria-label="Fleet status over the last few hours">
      {slots.map((s, i) => {
        const r = s.total ? s.up / s.total : 0;
        const cls = !s.total ? 'bg-surface2' : r === 1 ? 'bg-success/75 hover:bg-success' : r === 0 ? 'bg-danger hover:bg-danger' : 'bg-accent hover:bg-accent';
        return <span key={i} title={s.total ? `${s.up} of ${s.total} up` : 'No data'} style={{ height: !s.total ? '35%' : `${40 + r * 60}%`, animationDelay: `${i * 12}ms` }} className={`min-w-0 flex-1 origin-bottom animate-rise rounded-[3px] transition-colors ${cls}`} />;
      })}
    </div>
  );
}

/** A single service's recent checks, oldest left, with a tooltip per bar. */
export function Bars({ checks, count = 48, height = 20 }: { checks: Check[]; count?: number; height?: number }) {
  const pad = Math.max(0, count - checks.length);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }} role="img" aria-label={`Last ${checks.length} checks`}>
      {Array.from({ length: pad }).map((_, i) => <span key={`p${i}`} className="h-full w-[3px] rounded-sm bg-surface2" />)}
      {checks.map((c, i) => <span key={i} title={`${c.ok ? 'Up' : 'Down'} · ${c.ms ?? '–'} ms${c.error ? ` · ${c.error}` : ''} · ${ago(c.at)}`} className={`h-full w-[3px] rounded-sm ${c.ok ? 'bg-success/70' : 'bg-danger'}`} />)}
    </div>
  );
}
