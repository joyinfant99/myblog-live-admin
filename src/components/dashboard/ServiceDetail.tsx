'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { ago, api, errorMessage } from '@/lib/api';
import { Modal, Notice } from '@/components/ui';
import { Bars, Spark } from './charts';
import { host, ms, pct, type Svc } from './types';

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-surface2/60 px-3 py-2.5"><p className="text-[12px] text-muted">{label}</p><p className="mt-0.5 text-[17px] font-semibold text-fg">{value}</p></div>
);

/** Everything about one service: status, uptime windows, a bigger history and response-time chart, plus its own actions. */
export default function ServiceDetail({ svc, onClose, onEdit, onDelete, onChanged }: { svc: Svc | null; onClose: () => void; onEdit: (s: Svc) => void; onDelete: (s: Svc) => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const check = async () => {
    if (!svc) return;
    setBusy(true); setErr('');
    try { await api.post(`/monitors/${svc.id}/check`); onChanged(); } catch (e) { setErr(errorMessage(e, 'Check failed.')); } finally { setBusy(false); }
  };
  const tone = svc?.status === 'down' ? 'text-danger bg-danger/10' : svc?.status === 'up' ? 'text-success bg-success/10' : 'text-muted bg-surface2';

  return (
    <Modal open={!!svc} onClose={onClose} width="max-w-xl">
      {svc && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12.5px] text-muted">{svc.app}</p>
              <h3 className="truncate text-[20px] font-bold tracking-tight text-fg">{svc.name}</h3>
              <a href={svc.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-[12.5px] text-muted hover:text-fg">{host(svc.url)} <ExternalLink size={11} /></a>
            </div>
            <span className={`shrink-0 rounded-md px-2.5 py-1 text-[12.5px] font-medium capitalize ${tone}`}>{svc.status}</span>
          </div>

          {err && <div className="mt-4"><Notice>{err}</Notice></div>}
          {svc.status === 'down' && svc.error && <div className="mt-4"><Notice>{svc.error}{svc.lastChangedAt ? ` · down since ${ago(svc.lastChangedAt)}` : ''}</Notice></div>}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Last 24 h" value={pct(svc.uptime.h24)} />
            <Stat label="Last 7 days" value={pct(svc.uptime.d7)} />
            <Stat label="Last 30 days" value={pct(svc.uptime.d30)} />
            <Stat label="Avg response" value={ms(svc.avgMs24)} />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between"><p className="text-[12.5px] font-medium text-muted">Response time</p><p className="text-[12px] text-muted/70">last {svc.recent.length} checks</p></div>
            <div className="rounded-lg border border-line bg-surface p-3"><Spark values={svc.recent.map((c) => (c.ok ? c.ms : null))} height={84} tone={svc.status === 'down' ? 'danger' : 'accent'} /></div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[12.5px] font-medium text-muted">History <span className="font-normal text-muted/70">· hover a bar for details</span></p>
            <div className="overflow-x-auto rounded-lg border border-line bg-surface p-3"><Bars checks={svc.recent} height={34} /></div>
          </div>

          <p className="mt-4 text-[12.5px] text-muted">
            {svc.lastCheckedAt ? `Checked ${ago(svc.lastCheckedAt)}` : 'Not checked yet'} · counts as up on HTTP <span className="font-mono">{svc.expect}</span>
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => { onClose(); onEdit(svc); }}><Pencil size={13} /> Edit</button>
              <button className="btn-danger" onClick={() => { onClose(); onDelete(svc); }}><Trash2 size={13} /> Remove</button>
            </div>
            <button className="btn-primary" onClick={check} disabled={busy || svc.status === 'paused'}>{busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check now</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
