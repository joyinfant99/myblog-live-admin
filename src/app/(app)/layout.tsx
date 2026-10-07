'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import QuickFind from '@/components/QuickFind';
import { Skeleton } from '@/components/ui';
import { NavHintProvider } from '@/lib/nav-hint';

const STORE = 'admin.sidebar.collapsed';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [find, setFind] = useState(false);
  // Being signed in is not enough: the server must also say this account is allowed (ADMIN_EMAILS / admin claim).
  const [access, setAccess] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [denial, setDenial] = useState('');


  useEffect(() => { try { setCollapsed(localStorage.getItem(STORE) === '1'); } catch {} }, []);
  const toggle = useCallback(() => setCollapsed((c) => { try { localStorage.setItem(STORE, c ? '0' : '1'); } catch {} return !c; }), []);

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    let live = true;
    setAccess('checking');
    api.get('/admin/me').then(() => live && setAccess('ok')).catch((e) => {
      if (!live) return;
      const status = e?.response?.status;
      if (status === 401 || status === 403) { setDenial(e.response?.data?.error || ''); setAccess('denied'); }
      else setAccess('ok');   // server unreachable: let the pages show their own "can't reach the API" errors
    });
    return () => { live = false; };
  }, [user]);

  useEffect(() => { setMobile(false); }, [pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setFind((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [toggle]);

  if (loading || !user || access === 'checking') return <div className="mx-auto max-w-3xl px-6 pt-24"><Skeleton rows={5} /></div>;

  if (access === 'denied') {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md bg-surface2 text-fg"><Lock size={22} strokeWidth={1.5} /></span>
          <h1 className="text-[22px] font-bold tracking-tight text-fg">This account can’t use the admin</h1>
          <p className="mt-2 text-[14px] text-muted">{denial || 'The server did not accept this sign-in.'}</p>
          <button className="btn-primary btn-lg mt-6" onClick={async () => { await logout(); router.replace('/login'); }}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <NavHintProvider>
      <div className="min-h-screen bg-bg">
        <Sidebar collapsed={collapsed} onToggle={toggle} mobileOpen={mobile} onCloseMobile={() => setMobile(false)} onSearch={() => { setMobile(false); setFind(true); }} />
        <div className={`transition-[padding] duration-300 [transition-timing-function:var(--ease)] ${collapsed ? 'lg:pl-[68px]' : 'lg:pl-[264px]'}`}>
          <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-bg/90 px-3 backdrop-blur lg:hidden">
            <button onClick={() => setMobile(true)} className="btn-quiet btn-icon" aria-label="Open menu"><Menu size={18} /></button>
            <span className="text-[14px] font-semibold text-fg">Joy Infant</span>
          </div>
          <main className="w-full px-5 pb-28 pt-8 sm:px-8 lg:px-14 lg:pt-10">
            {/* No key={pathname} here: a new note rewrites its URL after the first autosave, and a key would remount (and blank) the editor. */}
            <div className={`mx-auto ${pathname === '/dashboard' ? 'max-w-[1240px]' : 'max-w-[1000px]'}`}>{children}</div>
          </main>
        </div>
        <QuickFind open={find} onClose={() => setFind(false)} />
      </div>
    </NavHintProvider>
  );
}
