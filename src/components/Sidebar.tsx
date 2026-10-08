'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, ChevronUp, ExternalLink, FileText, LayoutDashboard, Lightbulb, LogOut, Menu, MoreHorizontal, Music, NotebookPen, Plus, Search, Settings, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SITE_URL } from '@/lib/api';
import { useNavHint } from '@/lib/nav-hint';
import InstallButton from './InstallButton';
import SettingsModal from './SettingsModal';

type Item = { href: string; label: string; icon: LucideIcon };
const WORKSPACE: Item[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/posts', label: 'Posts', icon: FileText },
  { href: '/releases', label: 'Releases', icon: Music },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];
const PRIVATE: Item[] = [
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  { href: '/inspiration', label: 'Inspiration', icon: Lightbulb },
];

/**
 * Bento sidebar: ONE rounded box sitting directly on the page background (no panel or divider between sidebar and page). Brand, actions, workspace, private and
 * footer are sections inside it, divided by hairlines. Only the sidebar is bento; the page stays a plain canvas.
 * Collapsed, the same box becomes a narrow icon column.
 */
export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile, onSearch }: {
  collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onCloseMobile: () => void; onSearch: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const hint = useNavHint();
  const [settings, setSettings] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => { try { setMore(localStorage.getItem('admin.sidebar.more') === '1'); } catch {} }, []);
  const toggleMore = () => setMore((o) => { try { localStorage.setItem('admin.sidebar.more', o ? '0' : '1'); } catch {} return !o; });
  const rail = collapsed; // phones always get the full drawer; "collapsed" only applies from lg up

  // /posts/new belongs to the "New post" action, so it shouldn't also light up "Posts".
  const on = (href: string) => {
    if (hint && pathname.startsWith('/notes/')) return href === hint;
    return (pathname === href || pathname.startsWith(href + '/')) && !(href === '/posts' && pathname === '/posts/new');
  };
  const row = (active: boolean) =>
    `group relative flex h-11 items-center gap-2.5 rounded-lg px-2 lg:h-8 text-[14px] transition-colors ${rail ? 'lg:justify-center lg:px-0' : ''} ${active ? 'bg-surface2 font-medium text-fg' : 'text-muted hover:bg-surface2/70 hover:text-fg'}`;
  const text = `truncate ${rail ? 'lg:hidden' : ''}`;
  const section = 'shrink-0 border-b border-line p-1.5';

  const NavLink = ({ href, label, icon: Icon }: Item) => (
    <Link href={href} onClick={onCloseMobile} title={rail ? label : undefined} aria-label={label} className={row(on(href))}>
      <Icon size={17} strokeWidth={1.6} className="shrink-0" /><span className={text}>{label}</span>
    </Link>
  );

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col rounded-r-2xl bg-bg p-2 shadow-pop transition-[transform,width] duration-300 [transition-timing-function:var(--ease)] lg:rounded-none lg:bg-transparent lg:shadow-none ${rail ? 'lg:w-[68px]' : 'lg:w-[264px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">

          {/* burger + workspace */}
          <div className={`flex h-12 shrink-0 items-center gap-1 border-b border-line px-1.5 ${rail ? 'lg:justify-center' : ''}`}>
            <button onClick={onToggle} className="btn-quiet btn-icon hidden lg:inline-flex" aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'} title={rail ? 'Expand sidebar' : 'Collapse sidebar'}><Menu size={17} /></button>
            <button onClick={onCloseMobile} className="btn-quiet btn-icon lg:hidden" aria-label="Close menu"><X size={17} /></button>
            <Link href="/dashboard" onClick={onCloseMobile} className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface2/70 ${rail ? 'lg:hidden' : ''}`}>
              <img src="/joyprofile.jpeg" alt="" className="h-5 w-5 rounded-md object-cover" />
              <span className="truncate text-[14px] font-semibold text-fg">Joy Infant</span>
            </Link>
          </div>

          {/* quick actions */}
          <div className={`${section} space-y-px`}>
            <button onClick={onSearch} title={rail ? 'Search' : undefined} aria-label="Search" className={`${row(false)} w-full`}>
              <Search size={17} strokeWidth={1.6} className="shrink-0" />
              <span className={`${text} flex-1 text-left`}>Search</span>
              <kbd className={`font-mono text-[11px] text-muted/70 ${rail ? 'lg:hidden' : ''}`}>⌘K</kbd>
            </button>
            <Link href="/posts/new" onClick={onCloseMobile} title={rail ? 'New post' : undefined} aria-label="New post" className={row(pathname === '/posts/new')}>
              <Plus size={17} strokeWidth={1.8} className="shrink-0" /><span className={text}>New post</span>
            </Link>
          </div>

          {/* workspace, then private, Notion-style: plain muted headings, no dividers or tint */}
          <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-1.5">
            <div>
              <p className={`px-2 pb-1 pt-1 text-[12px] font-medium text-muted/70 ${rail ? 'lg:hidden' : ''}`}>Workspace</p>
              <div className="space-y-px">{WORKSPACE.map((i) => <NavLink key={i.href} {...i} />)}</div>
            </div>
            <div>
              <p className={`px-2 pb-1 pt-1 text-[12px] font-medium text-muted/70 ${rail ? 'lg:hidden' : ''}`}>Private</p>
              <div className="space-y-px">{PRIVATE.map((i) => <NavLink key={i.href} {...i} />)}</div>
            </div>
          </nav>

          {/* footer: one expandable pack (opens upward from its toggle, remembers its state) */}
          <div className="shrink-0 border-t border-line p-1.5">
            <div id="sidebar-more" className={`grid transition-[grid-template-rows,opacity] duration-300 [transition-timing-function:var(--ease)] ${more ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`} aria-hidden={!more}>
              <div className="min-h-0 overflow-hidden">
                <div className="mb-1 space-y-px border-b border-line pb-1" inert={!more as any}>
                  <button onClick={() => { setSettings(true); onCloseMobile(); }} title={rail ? 'Settings' : undefined} aria-label="Settings" className={`${row(false)} w-full`}>
                    <Settings size={17} strokeWidth={1.6} className="shrink-0" /><span className={text}>Settings</span>
                  </button>
                  <InstallButton className={row(false)} labelClass={text} rail={rail} />
                  <a href={SITE_URL} target="_blank" rel="noopener noreferrer" title={rail ? 'View site' : undefined} aria-label="View site" className={row(false)}>
                    <ExternalLink size={17} strokeWidth={1.6} className="shrink-0" /><span className={text}>View site</span>
                  </a>
                  <button onClick={async () => { await logout(); router.replace('/login'); }} title={rail ? 'Sign out' : undefined} aria-label="Sign out" className={`${row(false)} w-full hover:!text-danger`}>
                    <LogOut size={17} strokeWidth={1.6} className="shrink-0" /><span className={text}>Sign out</span>
                  </button>
                </div>
              </div>
            </div>
            <button onClick={toggleMore} aria-expanded={more} aria-controls="sidebar-more" title={rail ? 'More' : undefined} aria-label="More" className={`${row(false)} w-full`}>
              <MoreHorizontal size={17} strokeWidth={1.6} className="shrink-0" /><span className={`${text} flex-1 text-left`}>More</span>
              <ChevronUp size={14} className={`shrink-0 text-muted/70 transition-transform duration-300 ${more ? 'rotate-180' : ''} ${rail ? 'lg:hidden' : ''}`} />
            </button>
          </div>
        </div>
      </aside>
      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </>
  );
}
