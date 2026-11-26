'use client';

import { useCallback, useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import { API_URL, api, errorMessage } from '@/lib/api';
import { Notice } from '@/components/ui';

type Dev = { state: 'on' | 'standby' | 'off' };
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

// The Home Cinema app runs on the homelab and the blog API serves it under /cinema/ for signed-in admins only.
// This page shows a short loading animation, gets the browser its sign-in cookie, then opens the app as a full page.
export default function MediaPage() {
  const [dev, setDev] = useState<{ receiver?: Dev; projector?: Dev }>({});
  const [error, setError] = useState('');

  const open = useCallback(async () => {
    setError('');
    const started = Date.now();
    api.get('/admin/cinema/status').then((r) => setDev(r.data)).catch(() => {});
    try {
      await api.post('/admin/cinema/session');
      const wait = Math.max(0, 1400 - (Date.now() - started)); // let the animation be seen
      setTimeout(() => window.location.replace(`${API_URL}/cinema/`), wait);
    } catch (e) { setError(errorMessage(e, 'Could not open the Media Centre.')); }
  }, []);
  useEffect(() => { open(); }, [open]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <span className="absolute inset-2 animate-spin rounded-full border-2 border-line border-t-accent" />
        <Tv size={26} strokeWidth={1.5} className="relative text-fg" />
      </div>
      <div>
        <p className="text-[17px] font-semibold text-fg">Opening Media Centre…</p>
        <p className="mt-1 text-sm text-muted">Receiver, speakers and projector</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2"><Status name="Receiver" dev={dev.receiver} /><Status name="Projector" dev={dev.projector} /></div>
      {error && (<div className="space-y-3"><Notice>{error}</Notice><button className="btn-primary" onClick={open}>Try again</button></div>)}
    </div>
  );
}
