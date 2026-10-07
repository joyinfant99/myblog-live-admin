import type { Check } from './charts';

export type Status = 'up' | 'down' | 'unknown' | 'paused';
export type Svc = {
  id: number; app: string; name: string; url: string; expect: string; enabled: boolean;
  status: Status; statusCode: number | null; responseMs: number | null; error: string | null;
  lastCheckedAt: string | null; lastChangedAt: string | null; uptime: { h24: number | null; d7: number | null; d30: number | null };
  avgMs24: number | null; recent: Check[];
};
export type Payload = { now: string; intervalMin: number; alerts: boolean; monitors: Svc[] };

export const host = (u: string) => { try { const x = new URL(u); return x.host + (x.pathname === '/' ? '' : x.pathname); } catch { return u; } };
export const pct = (n: number | null) => (n == null ? '–' : `${n % 1 === 0 ? n : n.toFixed(1)}%`);
export const ms = (n: number | null) => (n == null ? '–' : n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`);
