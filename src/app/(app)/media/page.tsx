'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Projector, Speaker, Tv } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { Notice, PageHeader, Skeleton } from '@/components/ui';

// The Home Cinema app (Yamaha receiver + Formovie projector) runs on the homelab, on the home network only.
// Its address carries a private key, so it comes from the API (admin sign-in required), not from this page's code.
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

  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/cinema')
      .then((r) => setUrl(r.data?.url || ''))
      .catch((e) => { setError(errorMessage(e, 'Could not load the Media Centre link.')); setUrl(''); });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader icon={Tv} title="Media Centre" description="Receiver, speakers and projector, all in one place." />
      <div className="flex flex-wrap gap-2"><Status name="Receiver" dev={dev.receiver} /><Status name="Projector" dev={dev.projector} /></div>
      {error && <Notice>{error}</Notice>}
      {url === null ? <Skeleton rows={3} /> : (
        <section className="card p-6">
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3"><Speaker size={18} strokeWidth={1.6} className="mt-0.5 text-muted" /><div><p className="text-sm font-medium text-fg">Yamaha RX-V485</p><p className="text-xs text-muted">Volume, input, sound programs, scenes</p></div></div>
            <div className="flex items-start gap-3"><Projector size={18} strokeWidth={1.6} className="mt-0.5 text-muted" /><div><p className="text-sm font-medium text-fg">Formovie L1 Pro</p><p className="text-xs text-muted">Remote, now playing, 94 picture settings</p></div></div>
            <div className="flex items-start gap-3"><Tv size={18} strokeWidth={1.6} className="mt-0.5 text-muted" /><div><p className="text-sm font-medium text-fg">Google TV</p><p className="text-xs text-muted">Apps, keys, picture profile</p></div></div>
          </div>
          {url
            ? (<>
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex"><ExternalLink size={15} /> Open Media Centre</a>
              <p className="mt-3 text-xs text-muted">Opens in a new tab. It works on your home Wi-Fi, where the receiver and projector are.</p>
            </>)
            : !error && <Notice>The Media Centre link is not set up yet. Add CINEMA_URL to the blog API settings on the homelab.</Notice>}
        </section>
      )}
    </div>
  );
}
