'use client';

import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { Modal } from './ui';

/**
 * "Install app" for the sidebar. Android/desktop Chrome offer a real install prompt; iPhones have none, so there it
 * opens a short how-to for Share > Add to Home Screen. Hidden once the app is already running installed.
 */
export default function InstallButton({ className, labelClass, rail }: { className: string; labelClass: string; rail?: boolean }) {
  const [evt, setEvt] = useState<any>(null);
  const [standalone, setStandalone] = useState(true);   // assume installed until we know, so it never flashes
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => { setEvt(null); setStandalone(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (standalone || (!evt && !ios)) return null;

  const go = async () => {
    if (evt) { evt.prompt(); await evt.userChoice.catch(() => null); setEvt(null); }
    else setHelp(true);
  };

  return (
    <>
      <button onClick={go} title={rail ? 'Install app' : undefined} aria-label="Install app" className={`${className} w-full`}>
        <Download size={17} strokeWidth={1.6} className="shrink-0" /><span className={labelClass}>Install app</span>
      </button>
      <Modal open={help} onClose={() => setHelp(false)}>
        <div className="p-5">
          <h3 className="text-[16px] font-semibold text-fg">Add the admin to your Home Screen</h3>
          <ol className="mt-3 space-y-2.5 text-[14px] text-body">
            <li className="flex gap-2.5"><span className="mt-0.5 text-muted">1.</span><span>Open this page in <strong className="font-medium text-fg">Safari</strong> and tap the <Share size={14} className="mx-0.5 inline -translate-y-px" /> Share button.</span></li>
            <li className="flex gap-2.5"><span className="mt-0.5 text-muted">2.</span><span>Choose <strong className="font-medium text-fg">Add to Home Screen</strong> <SquarePlus size={14} className="mx-0.5 inline -translate-y-px" />.</span></li>
            <li className="flex gap-2.5"><span className="mt-0.5 text-muted">3.</span><span>Tap <strong className="font-medium text-fg">Add</strong>. It opens full screen, like an app.</span></li>
          </ol>
          <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={() => setHelp(false)}>Got it</button></div>
        </div>
      </Modal>
    </>
  );
}
