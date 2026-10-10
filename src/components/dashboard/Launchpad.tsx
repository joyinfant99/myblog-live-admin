'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { SITE_URL, api } from '@/lib/api';
import type { Svc } from './types';
import { BlogIcon, EchoIcon, MusicIcon } from './AppGlyphs';

type App = { key: string; name: string; origin: string; status: Svc['status'] | null };

/**
 * Apps with their own icon file in public/apps/<slug>.png (blog, music, echo, deutsch, bandos). If a file is missing, the drawn icon
 * (or a lettered tile) shows instead. Other apps use the logo their site declares.
 */
const Letter = (name: string) => function LetterTile() {
  return <span className="grid h-12 w-12 place-items-center rounded-xl text-[19px] font-semibold" style={{ background: `hsl(${hue(name)} 45% 88%)`, color: `hsl(${hue(name)} 40% 28%)` }}>{name.charAt(0).toUpperCase()}</span>;
};
const GLYPH: Record<string, { slug: string; Fallback: () => JSX.Element; round?: boolean }> = {
  [new URL(SITE_URL).origin]: { slug: 'blog', Fallback: BlogIcon, round: true },
  'https://music.joyinfant.com': { slug: 'music', Fallback: MusicIcon, round: true },
  'https://echo.presalesbench.com': { slug: 'echo', Fallback: EchoIcon },
  'https://deutsch.joyinfant.com': { slug: 'deutsch', Fallback: Letter('Deutsch') },
  'https://bandosapp.com': { slug: 'bandos', Fallback: Letter('BandOS') },
  'https://app.bandosapp.com': { slug: 'bandos', Fallback: Letter('BandOS') },
};
/** Names for the two BandOS addresses (marketing site and the app itself). */
const LABELS: Record<string, string> = { 'https://bandosapp.com': 'BandOS', 'https://app.bandosapp.com': 'BandOS Launch' };

function CustomIcon({ slug, Fallback, round }: { slug: string; Fallback: () => JSX.Element; round?: boolean }) {
  const [missing, setMissing] = useState(false);
  if (missing) return <Fallback />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/apps/${slug}.png`} alt="" className={`h-12 w-12 object-cover ring-1 ring-black/10 ${round ? 'rounded-full' : 'rounded-xl'}`} onError={() => setMissing(true)} />;
}

const LOGO_KEY = 'admin.launchpad.logos';
const originOf = (u: string) => { try { return new URL(u).origin; } catch { return ''; } };
const hostOf = (o: string) => o.replace(/^https?:\/\//, '');
const DOT: Record<Svc['status'], string> = { up: 'bg-success', down: 'bg-danger', unknown: 'bg-muted/50', paused: 'bg-muted/30' };

/** Only things you'd open as a visitor: skip APIs, backends, health checks and admin panels. */
const userFacing = (s: Svc) => {
  try {
    const u = new URL(s.url);
    if (/\b(api|admin|backend)\b/i.test(s.name)) return false;
    if (/^(admin|api)\./i.test(u.host) || /(backend|-api)\b/i.test(u.host) || /health|status/i.test(u.pathname)) return false;
    return true;
  } catch { return false; }
};

/** Stable pastel per name so each fallback tile keeps its own colour. */
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

/** The logo the site declares for itself, then /favicon.ico, then a lettered tile. Moves on only after a real error or a long silence. */
function AppIcon({ name, origin, logo, pending }: { name: string; origin: string; logo?: string | null; pending?: boolean }) {
  const sources = [logo, `${origin}/favicon.ico`].filter(Boolean) as string[];
  const [i, setI] = useState(0);
  const loaded = useRef(false);
  useEffect(() => { setI(0); }, [logo]);
  useEffect(() => {
    loaded.current = false;
    if (pending || i >= sources.length) return;
    // Private addresses (home lab) never answer from here, so give up eventually instead of leaving an empty box.
    const t = setTimeout(() => { if (!loaded.current) setI((n) => n + 1); }, sources[i] === logo ? 20000 : 8000);
    return () => clearTimeout(t);
  }, [i, logo, pending, sources.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  const custom = GLYPH[origin];
  if (custom) return <CustomIcon {...custom} />;
  if (pending) return <span className="block h-12 w-12 animate-shimmer rounded-xl bg-surface2" />;
  if (i >= sources.length) {
    return <span className="grid h-12 w-12 place-items-center rounded-xl text-[19px] font-semibold" style={{ background: `hsl(${hue(name)} 45% 88%)`, color: `hsl(${hue(name)} 40% 28%)` }}>{name.trim().charAt(0).toUpperCase() || '?'}</span>;
  }
  return (
    <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-line bg-white p-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={sources[i]} src={sources[i]} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer"
        onLoad={() => { loaded.current = true; }} onError={() => setI((n) => n + 1)} />
    </span>
  );
}

/** A front page of your user-facing apps: one tile per app with its logo and a live status dot, opening in a new tab. */
export default function Launchpad({ monitors }: { monitors: Svc[] }) {
  const [logos, setLogos] = useState<Record<string, string | null> | null>(null);   // null = nothing yet (first ever visit)
  useEffect(() => { try { const c = localStorage.getItem(LOGO_KEY); if (c) setLogos(JSON.parse(c)); } catch {} }, []);      // last known logos, instantly
  useEffect(() => {
    api.get('/monitors/icons')
      .then((r) => { const d = r.data || {}; setLogos(d); try { localStorage.setItem(LOGO_KEY, JSON.stringify(d)); } catch {} })
      .catch(() => setLogos((cur) => cur ?? {}));
  }, [monitors.length]);

  const apps = new Map<string, App>();
  const add = (a: App) => { if (a.origin && !apps.has(a.origin)) apps.set(a.origin, a); };
  add({ key: 'site', name: 'Blog', origin: originOf(SITE_URL), status: null });
  add({ key: 'music', name: 'Music', origin: 'https://music.joyinfant.com', status: null });

  const pool = new Map<string, Svc[]>();
  monitors.filter(userFacing).forEach((s) => { const o = originOf(s.url); if (o) pool.set(o, [...(pool.get(o) || []), s]); });
  const perApp = new Map<string, number>();
  pool.forEach((list) => perApp.set(list[0].app, (perApp.get(list[0].app) || 0) + 1));
  pool.forEach((list, origin) => {
    const live = list.filter((s) => s.status !== 'paused');
    const status: Svc['status'] = live.some((s) => s.status === 'down') ? 'down' : live.length && live.every((s) => s.status === 'up') ? 'up' : live.length ? 'unknown' : 'paused';
    const existing = apps.get(origin);
    if (existing) { existing.status = status; return; }          // Blog / Music: just add their live status
    const { app: group, name } = list[0];
    // A lone or generic one ('App', 'Dashboard') takes the app's name; others become e.g. "BandOS Marketing site".
    const generic = /^(app|website|site|dashboard|web)$/i.test(name);
    const label = !group || group === 'Other' || group === name ? name : (perApp.get(group) || 0) > 1 && !generic ? (name.toLowerCase().includes(group.toLowerCase()) ? name : `${group} ${name.replace(/\s+(web)?site$/i, '')}`) : group;
    add({ key: origin, name: LABELS[origin] || label, origin, status });
  });

  const list = [...apps.values()];
  if (!list.length) return null;

  return (
    <section aria-label="Your apps" className="mb-3 animate-rise rounded-[18px] border border-line bg-surface p-3 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-medium text-muted">Your apps</h2>
        <span className="text-[12px] text-muted/70">{list.length} {list.length === 1 ? 'app' : 'apps'}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-1">
        {list.map((a) => (
          <a key={a.key} href={a.origin} target="_blank" rel="noopener noreferrer" title={hostOf(a.origin)}
            className="group relative flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center transition-colors hover:bg-surface2/70 focus-visible:bg-surface2 focus-visible:outline-none">
            <span className="relative">
              <AppIcon name={a.name} origin={a.origin} logo={logos?.[a.origin]} pending={logos === null} />
              {a.status && <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface ${DOT[a.status]}`} aria-label={a.status} />}
            </span>
            <span className="line-clamp-2 w-full break-words text-[12.5px] font-medium leading-tight text-fg">{a.name}</span>
            <ExternalLink size={11} className="absolute right-2 top-2 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        ))}
      </div>
    </section>
  );
}
