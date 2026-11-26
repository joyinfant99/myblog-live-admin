'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Tv } from 'lucide-react';
import { API_URL, api, errorMessage } from '@/lib/api';
import { Notice, PageHeader, Skeleton } from '@/components/ui';

// The Home Cinema app (Yamaha receiver + Xiaomi projector) runs on the homelab. The blog API serves it under /cinema/ for signed-in admins only.
type Dev = { state: 'on' | 'standby' | 'off'; volume?: number; input?: string };
const LABEL = { on: 'On', standby: 'Standby', off: 'Off / unreachable' } as const;
const DOT = { on: 'bg-success', standby: 'bg-muted', off: 'bg-danger' } as const;

function Status({ name, dev }: { name: string; dev?: Dev }) {
  const st = dev?.state;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-fg">
      <span className={`h-2 w-2 rounded-full ${st ? DOT[st] : 'bg-line'}`} />
      {name}: <span className="text-muted">{st ? LABEL[st] : 'checking…'}</span>
    </span>
  );
}

export default function MediaPage() {
  const [dev, setDev] = useState<{ receiver?: Dev; projector?: Dev }>({});
  const check = useCallback(() => {
    api.get('/admin/cinema/status').then((r) => setDev(r.data)).catch(() => {});
  }, []);
  useEffect(() => { check(); const t = setInterval(check, 10000); return () => clearInterval(t); }, [check]);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const appUrl = `${API_URL}/cinema/`;

  // An iframe cannot send the sign-in token, so the API gives this browser a short-lived cookie first (admins only).
  const openSession = useCallback(async () => {
    try { await api.post('/admin/cinema/session'); setReady(true); setError(''); }
    catch (e) { setError(errorMessage(e, 'Could not open the Media Centre.')); }
  }, []);
  useEffect(() => { openSession(); const t = setInterval(openSession, 6 * 3600 * 1000); return () => clearInterval(t); }, [openSession]);

  return (
    <div className="space-y-4">
      <PageHeader icon={Tv} title="Media Centre" description="Receiver, speakers and projector, all in one place.">
        {ready && <a href={appUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost"><ExternalLink size={15} /> Full screen</a>}
      </PageHeader>
      <div className="flex flex-wrap gap-2"><Status name="Receiver" dev={dev.receiver} /><Status name="Projector" dev={dev.projector} /></div>
      {error && <Notice>{error}</Notice>}
      {!ready && !error && <Skeleton rows={3} />}
      {ready && (
        <iframe title="Home Cinema" src={appUrl} className="w-full rounded-xl border border-line bg-black" style={{ height: 'calc(100vh - 230px)', minHeight: 620 }} allow="fullscreen" />
      )}
    </div>
  );
}
