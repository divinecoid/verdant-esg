import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LogOut, Menu, Search, X } from 'lucide-react';
import { canAccess, useAuth } from '../auth/AuthContext';
import { GROUP_ORDER, navItems } from '../nav';
import CommandPalette from './CommandPalette';
import { Wordmark } from './Logo';

const ROLE_LABEL = { ADMIN: 'Administrator', ESG_TEAM: 'ESG Team', INVESTEE: 'Portfolio company', VIEWER: 'Viewer' } as const;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visible = navItems.filter((i) => canAccess(user, i.roles));
  const current = visible.find((i) => (i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path)));

  const sidebar = (
    <div className="flex h-full flex-col text-white" style={{ background: 'radial-gradient(120% 60% at 0% 0%, #17392d 0%, var(--color-forest-950) 55%)' }}>
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'justify-between px-5'}`}>
        <Wordmark collapsed={collapsed} />
        <button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-md p-1.5 text-white/60 hover:bg-white/10 lg:hidden">
          <X size={18} />
        </button>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-2">
        {GROUP_ORDER.map((group) => {
          const items = visible.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              {!collapsed && <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{group}</div>}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      title={item.label}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-lg py-2 text-[13.5px] transition-colors ${collapsed ? 'justify-center px-2' : 'px-3'} ${
                          isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-lime" />}
                          <item.icon size={17} strokeWidth={1.75} className={isActive ? 'text-lime' : 'text-white/55 group-hover:text-white/80'} />
                          {!collapsed && <span>{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center gap-3 rounded-lg ${collapsed ? 'justify-center' : 'px-2 py-1.5'}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime text-[11px] font-semibold text-forest-950" aria-hidden="true">
            {user ? initials(user.name) : ''}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] font-medium">{user?.name}</div>
                <div className="truncate text-[11px] text-white/45">{user && ROLE_LABEL[user.role]}</div>
              </div>
              <button onClick={logout} aria-label="Sign out" title="Sign out" className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="mt-2 hidden w-full items-center justify-center rounded-md py-1.5 text-white/35 hover:bg-white/5 hover:text-white/70 lg:flex"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className={`sticky top-0 hidden h-screen shrink-0 transition-[width] duration-200 lg:block ${collapsed ? 'w-[72px]' : 'w-[264px]'}`}>{sidebar}</aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" onMouseDown={() => setDrawer(false)} style={{ animation: 'fade .15s both' }}>
          <div className="absolute inset-0 bg-forest-950/55" />
          <aside className="absolute inset-y-0 left-0 w-[280px]" onMouseDown={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-neutral-200/80 bg-paper/80 px-4 backdrop-blur-md sm:px-8">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-200/60 lg:hidden">
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1 truncate text-[13px] text-neutral-500">
            <span className="text-neutral-400">{current?.group ?? 'Verdant'}</span>
            {current && <span className="mx-2 text-neutral-300">/</span>}
            <span className="font-medium text-neutral-800">{current?.label}</span>
          </div>
          <button
            onClick={() => setPalette(true)}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-card px-3 py-1.5 text-[13px] text-neutral-500 shadow-sm hover:border-neutral-300"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Jump to…</span>
            <kbd className="hidden rounded border border-neutral-200 px-1 text-[10px] sm:inline">⌘K</kbd>
          </button>
        </header>

        <main key={location.pathname} className="rise mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
