'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { Field, Modal, Notice } from '@/components/ui';
import type { Svc } from './types';

/** Add or edit one monitored service. */
export default function ServiceDialog({ state, apps, onClose, onSaved }: { state: null | { svc?: Svc }; apps: string[]; onClose: () => void; onSaved: () => void }) {
  const svc = state?.svc;
  const [f, setF] = useState({ app: '', name: '', url: '', expect: '200-399', enabled: true });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state) return;
    setErr(''); setBusy(false);
    setF(svc ? { app: svc.app, name: svc.name, url: svc.url, expect: svc.expect, enabled: svc.enabled } : { app: '', name: '', url: 'https://', expect: '200-399', enabled: true });
  }, [state, svc]);

  const save = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setErr('');
    try { if (svc) await api.put(`/monitors/${svc.id}`, f); else await api.post('/monitors', f); onSaved(); }
    catch (x) { setErr(errorMessage(x, 'Failed to save.')); setBusy(false); }
  };

  return (
    <Modal open={!!state} onClose={onClose} width="max-w-md">
      <form onSubmit={save} className="p-5">
        <h3 className="text-[16px] font-semibold text-fg">{svc ? 'Edit service' : 'Add a service'}</h3>
        <p className="mt-1 text-[13px] text-muted">Any web address works: a website, or an API’s health endpoint.</p>
        {err && <div className="mt-4"><Notice>{err}</Notice></div>}
        <div className="mt-4 space-y-4">
          <Field label="App" hint="Services with the same app name are grouped together.">
            <input className="input" list="monitor-apps" value={f.app} onChange={(e) => setF({ ...f, app: e.target.value })} placeholder="Echo" required />
            <datalist id="monitor-apps">{apps.map((a) => <option key={a} value={a} />)}</datalist>
          </Field>
          <Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="API" required /></Field>
          <Field label="Address"><input className="input font-mono !text-[13px]" type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://example.com/health" required /></Field>
          <Field label="Counts as up when the status is" hint="Redirects are followed. Use 200,401 if a protected endpoint should count as up.">
            <input className="input font-mono !text-[13px]" value={f.expect} onChange={(e) => setF({ ...f, expect: e.target.value })} />
          </Field>
          {svc && <label className="flex items-center gap-2 text-[13.5px] text-fg"><input type="checkbox" checked={!f.enabled} onChange={(e) => setF({ ...f, enabled: !e.target.checked })} /> Pause checks for this service</label>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Loader2 size={14} className="animate-spin" />}{svc ? 'Save' : 'Add service'}</button>
        </div>
      </form>
    </Modal>
  );
}
