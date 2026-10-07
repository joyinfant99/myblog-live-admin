'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, ExternalLink, FileText, LayoutDashboard, Lightbulb, Lock, LogOut, Menu, Music, NotebookPen, Plus, Search, Tags, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SITE_URL } from '@/lib/api';
import { useNavHint } from '@/lib/nav-hint';
import InstallButton from './InstallButton';

type Item = { href: string; label: string; icon: LucideIcon };
const WORKSPACE: Item[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/posts', label: 'Posts', icon: FileText },
  { href: '/categories', label: 'Categories', icon: Tags },
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

          {/* workspace, then a tinted private section */}
          <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className={section}>
              <p className={`px-2 pb-1 pt-1 text-[12px] font-medium text-muted/80 ${rail ? 'lg:hidden' : ''}`}>Workspace</p>
              <div className="space-y-px">{WORKSPACE.map((i) => <NavLink key={i.href} {...i} />)}</div>
            </div>
            <div className={`${section} bg-accent/[0.06]`}>
              <p className={`flex items-center gap-1.5 px-2 pb-1 pt-1 text-[12px] font-medium text-accent ${rail ? 'lg:justify-center lg:px-0 lg:pb-1.5' : ''}`}>
                <Lock size={11} strokeWidth={2} /><span className={rail ? 'lg:hidden' : ''}>Private</span>
              </p>
              <div className="space-y-px">{PRIVATE.map((i) => <NavLink key={i.href} {...i} />)}</div>
            </div>
          </nav>

          {/* footer */}
          <div className="shrink-0 space-y-px border-t border-line p-1.5">
            <InstallButton className={row(false)} labelClass={text} rail={rail} />
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" title={rail ? 'View site' : undefined} aria-label="View site" className={row(false)}>
              <ExternalLink size={17} strokeWidth={1.6} className="shrink-0" /><span className={text}>View site</span>
            </a>
            <button onClick={async () => { await logout(); router.replace('/login'); }} title={rail ? 'Sign out' : undefined} aria-label="Sign out" className={`${row(false)} w-full hover:!text-danger`}>
              <LogOut size={17} strokeWidth={1.6} className="shrink-0" /><span className={text}>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
