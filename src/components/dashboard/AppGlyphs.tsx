import type { ReactElement } from 'react';

/**
 * Hand-drawn app icons for the apps that have no good logo of their own (or only a profile photo).
 * Style: vibrant gradient squircle, one bold white glyph, soft gloss on top, like the big-tech app icons.
 */
const Squircle = ({ id, from, to, children }: { id: string; from: string; to: string; children: React.ReactNode }) => (
  <svg viewBox="0 0 64 64" className="h-12 w-12 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" aria-hidden>
    <defs>
      <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient>
      <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".42" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.3" floodColor="#000" floodOpacity=".3" /></filter>
    </defs>
    <rect width="64" height="64" rx="15" fill={`url(#${id}-bg)`} />
    <path d="M0 15C0 6.7 6.7 0 15 0h34c8.3 0 15 6.7 15 15v14C48 36 16 36 0 29z" fill={`url(#${id}-gloss)`} />
    <g filter={`url(#${id}-sh)`}>{children}</g>
    <rect x=".5" y=".5" width="63" height="63" rx="14.5" fill="none" stroke="#000" strokeOpacity=".12" />
  </svg>
);

/** Five-point star with lit and shaded facets. */
function starFacets() {
  const C = [32, 33.5], R = 22, r = 9.4;
  const pt = (a: number, rad: number) => [C[0] + rad * Math.cos(a), C[1] + rad * Math.sin(a)];
  const tips: number[][] = [], vals: number[][] = [];
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; tips.push(pt(a, R)); vals.push(pt(a + Math.PI / 5, r)); }
  const f = (p: number[]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const shade = (a: number[], b: number[]) => {
    const mx = (a[0] + b[0]) / 2 - C[0], my = (a[1] + b[1]) / 2 - C[1], d = (mx * -0.55 + my * -0.83) / Math.hypot(mx, my);
    const t = Math.max(0, Math.min(1, 0.5 + d * 0.55)), lo = [196, 205, 255], hi = [255, 255, 255];
    return `rgb(${lo.map((v, i) => Math.round(v + (hi[i] - v) * t)).join(',')})`;
  };
  const out: ReactElement[] = [];
  for (let i = 0; i < 5; i++) {
    const t = tips[i], prev = vals[(i + 4) % 5], next = vals[i];
    out.push(<polygon key={`a${i}`} points={`${f(C)} ${f(prev)} ${f(t)}`} fill={shade(prev, t)} />, <polygon key={`b${i}`} points={`${f(C)} ${f(t)} ${f(next)}`} fill={shade(t, next)} />);
  }
  return out;
}

export const BlogIcon = () => (
  <Squircle id="blog" from="#5b8cff" to="#7c3aed">
    <g strokeLinejoin="round">{starFacets()}</g>
  </Squircle>
);

export const MusicIcon = () => (
  <Squircle id="music" from="#ff6a88" to="#ff2d55">
    <path fill="#fff" d="M41 14.5v24.2a8.6 8.6 0 1 1-4.2-7.4V22.4l-12 2.6v17.1a8.6 8.6 0 1 1-4.2-7.4V20.8c0-1.4 1-2.7 2.4-3l14.2-3.1c1.8-.4 3.8 1 3.8 2.8z" transform="translate(1.5 2) scale(.92)" />
  </Squircle>
);

export const EchoIcon = () => (
  <Squircle id="echo" from="#2dd4bf" to="#0369a1">
    <g fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="4.2">
      <path d="M22.5 22.5a13.5 13.5 0 0 0 0 19" opacity=".95" /><path d="M41.5 22.5a13.5 13.5 0 0 1 0 19" opacity=".95" />
      <path d="M14.5 15.5a24.5 24.5 0 0 0 0 33" opacity=".55" /><path d="M49.5 15.5a24.5 24.5 0 0 1 0 33" opacity=".55" />
    </g>
    <circle cx="32" cy="32" r="5.6" fill="#fff" />
  </Squircle>
);
