'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Projector, RefreshCw, Speaker, Tv } from 'lucide-react';
import { API_URL, api, errorMessage } from '@/lib/api';
import { Notice, PageHeader } from '@/components/ui';

type Dev = { state: 'on' | 'standby' | 'off'; volume?: number; input?: string };
type Devices = { receiver?: Dev; projector?: Dev };
const LABEL = { on: 'Switched on', standby: 'Standby', off: 'Off or unreachable' } as const;
const DOT = { on: 'bg-success', standby: 'bg-muted', off: 'bg-danger' } as const;

function Device({ icon: Icon, name, dev, checking }: { icon: any; name: string; dev?: Dev; checking: boolean }) {
  const st = dev?.state;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line p-4">
      <Icon size={20} strokeWidth={1.5} className="text-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{name}</p>
        <p className="flex items-center gap-2 text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${st ? DOT[st] : 'animate-pulse bg-line'}`} />
          {st ? LABEL[st] : checking ? 'Checking…' : 'Unknown'}
          {st === 'on' && dev?.input ? ` · ${dev.input}` : ''}
        </p>
      </div>
    </div>
  );
}

// The Home Cinema app runs on the homelab and the blog API serves it under /cinema/ for signed-in admins only.
// Nothing opens by itself: this page shows whether the receiver and projector are on, and you choose to open the app.
export default function MediaPage() {
  const [dev, setDev] = useState<Devices>({});
  const [checking, setChecking] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  const check = useCallback(async () => {
    setChecking(true);
    try { setDev((await api.get('/admin/cinema/status')).data); } catch { /* keep the last known state */ }
    setChecking(false);
  }, []);
  useEffect(() => { check(); const t = setInterval(check, 10000); return () => clearInterval(t); }, [check]);

  const open = async () => {
    setError(''); setOpening(true);
    const started = Date.now();
    try {
      await api.post('/admin/cinema/session');
      setTimeout(() => window.location.assign(`${API_URL}/cinema/`), Math.max(0, 1200 - (Date.now() - started)));
    } catch (e) { setError(errorMessage(e, 'Could not open the Media Centre.')); setOpening(false); }
  };

  const known = !!dev.receiver && !!dev.projector;
  const anyOn = dev.receiver?.state === 'on' || dev.projector?.state === 'on';
  const bothOff = known && !anyOn;

  if (opening) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
          <span className="absolute inset-2 animate-spin rounded-full border-2 border-line border-t-accent" />
          <Tv size={26} strokeWidth={1.5} className="relative text-fg" />
        </div>
        <p className="text-[17px] font-semibold text-fg">Opening Media Centre…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Tv} title="Media Centre" description="Receiver, speakers and projector, all in one place.">
        <button className="btn-ghost btn-icon" onClick={check} aria-label="Check again"><RefreshCw size={15} className={checking ? 'animate-spin' : ''} /></button>
      </PageHeader>
      {error && <Notice>{error}</Notice>}
      <section className="card mx-auto max-w-xl space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Device icon={Speaker} name="Yamaha receiver" dev={dev.receiver} checking={checking} />
          <Device icon={Projector} name="Xiaomi projector" dev={dev.projector} checking={checking} />
        </div>
        {bothOff && <p className="text-sm text-muted">Both are switched off, so there is not much to control right now. You can still open the Media Centre, for example to check saved scenes or settings.</p>}
        {known && anyOn && <p className="text-sm text-muted">Ready when you are.</p>}
        <button className={bothOff ? 'btn-ghost' : 'btn-primary'} onClick={open} disabled={!known && checking}>
          {bothOff ? 'Open anyway' : 'Open Media Centre'} <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}
