'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Bell, BellOff, CheckCheck, FileText, Gauge, Loader2, Lock, Music, NotebookPen, Plus, RefreshCw, Timer } from 'lucide-react';
import { ago, api, errorMessage, fmtDate, imageUrl } from '@/lib/api';
import { ConfirmDialog, Notice } from '@/components/ui';
import Tile, { Eyebrow, useCountUp } from '@/components/dashboard/Tile';
import { Ring, Spark, Timeline, type Slot } from '@/components/dashboard/charts';
import ServiceDialog from '@/components/dashboard/ServiceDialog';
import ServiceDetail from '@/components/dashboard/ServiceDetail';
import { host, ms, pct, type Payload, type Svc } from '@/components/dashboard/types';

const SLOTS = 48;
const TONES = {
  success: { text: 'text-success', soft: 'bg-success/15', ping: 'bg-success/30' },
  danger: { text: 'text-danger', soft: 'bg-danger/15', ping: 'bg-danger/30' },
  muted: { text: 'text-muted', soft: 'bg-surface2', ping: 'bg-muted/20' },
} as const;
const DOT: Record<Svc['status'], string> = { up: 'bg-success', down: 'bg-danger', unknown: 'bg-muted/50', paused: 'bg-transparent ring-1 ring-muted/60' };

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function appPill(list: Svc[]) {
  const live = list.filter((s) => s.status !== 'paused'), down = live.filter((s) => s.status === 'down').length;
  if (!live.length) return { label: 'Paused', cls: 'bg-surface2 text-muted' };
  if (down === live.length) return { label: 'Down', cls: 'bg-danger/10 text-danger' };
  if (down) return { label: `${down} down`, cls: 'bg-danger/10 text-danger' };
  if (live.every((s) => s.status === 'unknown')) return { label: 'Checking', cls: 'bg-surface2 text-muted' };
  return { label: 'All up', cls: 'bg-success/10 text-success' };
}

/** Bigger apps get bigger boxes; with dense packing, 4 + 3 + 2 services fill a 12-column row exactly. */
const spanFor = (n: number) => (n >= 4 ? 'sm:col-span-6 lg:col-span-5' : n === 3 ? 'sm:col-span-3 lg:col-span-4' : 'sm:col-span-3 lg:col-span-3');

export default function DashboardPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<null | { svc?: Svc }>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [del, setDel] = useState<Svc | null>(null);
  const [posts, setPosts] = useState<{ total?: number; items: any[] }>({ items: [] });
  const [notes, setNotes] = useState<{ total?: number; items: any[] }>({ items: [] });
  const [release, setRelease] = useState<{ total?: number; latest?: any }>({});
  const [, setTick] = useState(0);

  const load = useCallback(async (quiet = false) => {
    try { setData((await api.get('/monitors')).data); setError(''); }
    catch (e) { if (!quiet) setError(errorMessage(e, 'Failed to load your services.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const refresh = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 60000);
    const clock = setInterval(() => setTick((n) => n + 1), 30000);   // keeps "checked 2 min ago" honest
    return () => { clearInterval(refresh); clearInterval(clock); };
  }, [load]);

  useEffect(() => {
    Promise.allSettled([api.get('/posts?limit=3'), api.get('/notes'), api.get('/releases', { params: { limit: 1, sortOrder: 'desc' } })]).then(([p, n, r]) => {
      if (p.status === 'fulfilled') setPosts({ total: Number(p.value.data.totalItems ?? p.value.data.posts?.length), items: p.value.data.posts || [] });
      if (n.status === 'fulfilled') setNotes({ total: n.value.data.length, items: n.value.data.slice(0, 3) });
      if (r.status === 'fulfilled') setRelease({ total: Number(r.value.data.totalItems ?? r.value.data.releases?.length), latest: r.value.data.releases?.[0] });
    });
  }, []);

  const checkNow = async () => {
    setChecking(true); setError('');
    try { setData((await api.post('/monitors/check')).data); }
    catch (e) { setError(errorMessage(e, 'Failed to run the checks.')); }
    finally { setChecking(false); }
  };
  const remove = async () => {
    if (!del) return;
    try { await api.delete(`/monitors/${del.id}`); setDel(null); load(true); } catch (e) { setError(errorMessage(e, 'Failed to delete.')); setDel(null); }
  };

  /* ---- everything derived from the monitor data ---- */
  const monitors = data?.monitors || [];
  const live = monitors.filter((s) => s.status !== 'paused');
  const known = live.filter((s) => s.status !== 'unknown');
  const upList = live.filter((s) => s.status === 'up'), downList = live.filter((s) => s.status === 'down');
  const allUp = known.length > 0 && downList.length === 0;
  const tone = !known.length ? 'muted' : downList.length ? 'danger' : 'success';
  const avgMs = avg(upList.map((s) => s.responseMs).filter((n): n is number => n != null));
  const uptime30 = avg(live.map((s) => s.uptime.d30).filter((n): n is number => n != null));
  const lastChecked = monitors.map((s) => s.lastCheckedAt).filter(Boolean).sort().pop();
  const ranked = [...live].filter((s) => s.uptime.d30 != null).sort((a, b) => (b.uptime.d30 as number) - (a.uptime.d30 as number));
  const slowest = [...upList].sort((a, b) => (b.responseMs || 0) - (a.responseMs || 0))[0];

  const { slots, msSeries } = useMemo(() => {
    const slots: Slot[] = [], msSeries: (number | null)[] = [];
    for (let k = 0; k < SLOTS; k++) {
      const off = SLOTS - 1 - k;                      // 0 = newest check round
      let up = 0, total = 0; const times: number[] = [];
      live.forEach((s) => { const c = s.recent[s.recent.length - 1 - off]; if (c) { total++; if (c.ok) { up++; if (c.ms != null) times.push(c.ms); } } });
      slots.push({ up, total }); msSeries.push(avg(times));
    }
    return { slots, msSeries };
  }, [live]);

  const apps = useMemo(() => {
    const m = new Map<string, Svc[]>();
    monitors.forEach((s) => m.set(s.app, [...(m.get(s.app) || []), s]));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [monitors]);

  const detail = monitors.find((s) => s.id === detailId) || null;
  const upPct = useCountUp(uptime30 != null ? uptime30 : null);
  const postN = useCountUp(posts.total), noteN = useCountUp(notes.total);
  const T = TONES[tone];
  const headline = loading ? 'Loading…' : !monitors.length ? 'Add your first service' : !known.length ? 'Checking your services…'
    : allUp ? 'Everything is up' : downList.length === live.length ? 'Everything is down' : `${downList.length} service${downList.length > 1 ? 's' : ''} down`;

  return (
    <>
      {error && <Notice>{error}</Notice>}

      <div className="grid grid-flow-dense auto-rows-[minmax(150px,auto)] gap-3 sm:grid-cols-6 lg:grid-cols-12">
        {/* ---------- hero ---------- */}
        <Tile className="flex flex-col p-6 sm:col-span-6 sm:p-7 lg:col-span-8 lg:row-span-2" glow={tone === 'muted' ? 'accent' : tone} aura label="Overall status">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Eyebrow>{greeting()}, Joy</Eyebrow>
            <div className="flex items-center gap-2">
              <button className="btn-ghost" onClick={checkNow} disabled={checking || !monitors.length}>{checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check now</button>
              <button className="btn-primary" onClick={() => setDialog({})}><Plus size={15} /> Add service</button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <span className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-full ${T.soft} ${T.text}`}>
              {tone !== 'muted' && <span className={`ringpulse absolute inset-0 rounded-full ${T.ping}`} />}
              {tone === 'danger' ? <AlertTriangle size={26} strokeWidth={1.8} /> : tone === 'success' ? <CheckCheck size={28} strokeWidth={1.8} /> : <Gauge size={26} strokeWidth={1.6} />}
            </span>
            <div className="min-w-0">
              <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-fg sm:text-[46px]">{headline}</h1>
              <p className="mt-2 text-[14px] text-muted">
                {monitors.length ? <>{upList.length} of {live.length} services responding{lastChecked ? <> · checked {ago(lastChecked)}</> : null}{data ? <> · every {data.intervalMin} min</> : null}</> : 'Watch a web address and see at a glance whether it’s up.'}
              </p>
            </div>
          </div>

          {downList.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {downList.map((s) => <button key={s.id} onClick={() => setDetailId(s.id)} className="inline-flex items-center gap-1.5 rounded-md bg-danger/10 px-2.5 py-1 text-[12.5px] text-danger transition-colors hover:bg-danger/15"><span className="h-1.5 w-1.5 rounded-full bg-danger" />{s.app} / {s.name}{s.error ? ` · ${s.error}` : ''}</button>)}
            </div>
          )}

          <div className="mt-auto pt-8">
            <Timeline slots={slots} />
            <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted/80"><span>≈ {Math.round(((data?.intervalMin || 5) * SLOTS) / 60)} hours ago</span><span>now</span></div>
          </div>
        </Tile>

        {/* ---------- uptime ring ---------- */}
        <Tile className="flex items-center gap-5 p-5 sm:col-span-3 lg:col-span-4" glow={uptime30 != null && uptime30 < 99 ? 'danger' : 'success'} delay={70} label="30 day uptime">
          <Ring value={uptime30} tone={uptime30 == null ? 'muted' : uptime30 >= 99.5 ? 'success' : uptime30 >= 97 ? 'accent' : 'danger'} size={116} stroke={10}>
            <div><p className="text-[24px] font-bold leading-none tracking-tight text-fg">{upPct == null ? '–' : `${upPct.toFixed(upPct >= 99.95 || upPct === 0 ? 0 : 1)}%`}</p><p className="mt-1 text-[11px] text-muted">30 days</p></div>
          </Ring>
          <div className="min-w-0 space-y-2.5">
            <Eyebrow icon={Timer}>Uptime</Eyebrow>
            {ranked.length ? <>
              <div><p className="text-[11.5px] text-muted/80">Best · {pct(ranked[0].uptime.d30)}</p><p className="truncate text-[13.5px] text-fg">{ranked[0].app} / {ranked[0].name}</p></div>
              <div><p className="text-[11.5px] text-muted/80">Lowest · {pct(ranked[ranked.length - 1].uptime.d30)}</p><p className="truncate text-[13.5px] text-fg">{ranked[ranked.length - 1].app} / {ranked[ranked.length - 1].name}</p></div>
            </> : <p className="text-[13px] text-muted">Builds up as checks come in.</p>}
          </div>
        </Tile>

        {/* ---------- response time ---------- */}
        <Tile className="flex flex-col p-5 sm:col-span-3 lg:col-span-4" glow="accent" delay={140} label="Response time">
          <Eyebrow icon={Gauge}>Average response</Eyebrow>
          <p className="mt-2 text-[30px] font-bold leading-none tracking-tight text-fg">{ms(avgMs == null ? null : Math.round(avgMs))}</p>
          <div className="mt-auto pt-3"><Spark values={msSeries} height={58} /></div>
          {slowest && <p className="mt-2 truncate text-[12px] text-muted">Slowest now: {slowest.app} / {slowest.name} · {ms(slowest.responseMs)}</p>}
        </Tile>

        {/* ---------- one box per app ---------- */}
        {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className={`animate-shimmer rounded-[18px] bg-surface2 sm:col-span-3 lg:col-span-4`} style={{ minHeight: 190 }} />)}
        {apps.map(([name, list], i) => {
          const pill = appPill(list), d30 = avg(list.map((s) => s.uptime.d30).filter((n): n is number => n != null));
          return (
            <Tile key={name} className={`flex flex-col p-5 ${spanFor(list.length)}`} glow={pill.label.includes('down') || pill.label === 'Down' ? 'danger' : 'success'} delay={200 + i * 60} label={name}>
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold tracking-tight text-fg">{name}</h2>
                <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${pill.cls}`}>{pill.label}</span>
              </div>
              <ul className="-mx-2 mt-3 flex-1 space-y-0.5">
                {list.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => setDetailId(s.id)} className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface2/70">
                      <span className="relative flex h-2 w-2 shrink-0">{s.status === 'down' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/60" />}<span className={`relative inline-flex h-2 w-2 rounded-full ${DOT[s.status]}`} /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium text-fg">{s.name}</span><span className="block truncate font-mono text-[11.5px] text-muted">{host(s.url)}</span></span>
                      <span className={`shrink-0 text-[12px] ${s.status === 'down' ? 'text-danger' : 'text-muted'}`}>{s.status === 'down' ? 'Down' : s.status === 'paused' ? 'Paused' : s.status === 'unknown' ? '…' : ms(s.responseMs)}</span>
                      <ArrowUpRight size={13} className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-muted">{list.length} service{list.length > 1 ? 's' : ''}{d30 != null ? <> · {pct(Math.round(d30 * 10) / 10)} uptime</> : null}</p>
            </Tile>
          );
        })}

        {/* ---------- writing ---------- */}
        <Tile className="flex flex-col p-5 sm:col-span-3 lg:col-span-3" glow="accent" delay={420} label="Posts">
          <div className="flex items-center justify-between"><Eyebrow icon={FileText}>Posts</Eyebrow><Link href="/posts" aria-label="All posts" className="-m-2.5 p-2.5 text-muted hover:text-fg"><ArrowUpRight size={15} /></Link></div>
          <p className="mt-2 text-[34px] font-bold leading-none tracking-tight text-fg">{postN == null ? '–' : Math.round(postN)}</p>
          <ul className="mt-3 flex-1 space-y-1.5">
            {posts.items.map((p) => <li key={p.id}><Link href={`/posts/${p.id}`} className="block truncate text-[13px] text-body transition-colors hover:text-accent">{p.title}</Link></li>)}
            {!posts.items.length && <li className="text-[13px] text-muted">Nothing published yet.</li>}
          </ul>
          <Link href="/posts/new" className="btn-ghost mt-3 w-full"><Plus size={14} /> New post</Link>
        </Tile>

        {/* ---------- private notes ---------- */}
        <Tile className="flex flex-col border-accent/25 p-5 sm:col-span-3 lg:col-span-3" glow="accent" delay={480} label="Private notes">
          <div className="flex items-center justify-between"><Eyebrow icon={Lock} className="!text-accent">Private notes</Eyebrow><Link href="/notes" aria-label="All notes" className="-m-2.5 p-2.5 text-muted hover:text-fg"><ArrowUpRight size={15} /></Link></div>
          <p className="mt-2 text-[34px] font-bold leading-none tracking-tight text-fg">{noteN == null ? '–' : Math.round(noteN)}</p>
          <ul className="mt-3 flex-1 space-y-1.5">
            {notes.items.map((n) => <li key={n.id}><Link href={`/notes/${n.id}`} className="block truncate text-[13px] text-body transition-colors hover:text-accent">{n.title || 'Untitled'}</Link></li>)}
            {!notes.items.length && <li className="text-[13px] text-muted">Only you can see these.</li>}
          </ul>
          <Link href="/notes/new" className="btn-ghost mt-3 w-full"><NotebookPen size={14} /> New note</Link>
        </Tile>

        {/* ---------- latest release ---------- */}
        {release.latest?.coverImage ? (
          <Tile href={`/releases/${release.latest.id}`} className="min-h-[240px] text-white sm:col-span-6 lg:col-span-3" glow="accent" delay={540} label="Latest release">
            <img src={imageUrl(release.latest.coverImage)} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 [transition-timing-function:var(--ease)] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
            <div className="relative flex h-full min-h-[240px] flex-col justify-between p-5">
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/80"><Music size={13} /> Latest release</p>
              <div><p className="text-[22px] font-bold leading-tight tracking-tight">{release.latest.title}</p><p className="mt-0.5 text-[13px] capitalize text-white/75">{release.latest.type} · {fmtDate(release.latest.releaseDate)}</p></div>
            </div>
          </Tile>
        ) : (
          <Tile href="/releases" className="flex flex-col justify-between p-5 sm:col-span-6 lg:col-span-3" glow="accent" delay={540} label="Releases">
            <Eyebrow icon={Music}>Releases</Eyebrow>
            <div><p className="text-[22px] font-bold tracking-tight text-fg">{release.latest ? release.latest.title : 'No releases yet'}</p><p className="mt-1 text-[13px] text-muted">{release.latest ? `${release.latest.type} · ${fmtDate(release.latest.releaseDate)}` : 'Add a single or an album and it appears on the music site.'}</p></div>
          </Tile>
        )}
      </div>

      {data && (
        <p className="mt-5 flex items-center gap-1.5 text-[12.5px] text-muted">
          {data.alerts ? <><Bell size={12} /> Phone alerts are on: you’ll be notified when a service goes down or recovers.</>
            : <><BellOff size={12} /> Alerts are off. Set <code className="rounded bg-surface2 px-1 font-mono text-[11.5px]">ALERT_WEBHOOK_URL</code> on the server to get a notification when something goes down.</>}
        </p>
      )}

      <ServiceDetail svc={detail} onClose={() => setDetailId(null)} onEdit={(s) => setDialog({ svc: s })} onDelete={setDel} onChanged={() => load(true)} />
      <ServiceDialog state={dialog} apps={apps.map(([n]) => n)} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load(true); }} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title={`Stop watching “${del?.name}”?`} body="Its history is deleted too." confirm="Remove" />
    </>
  );
}
