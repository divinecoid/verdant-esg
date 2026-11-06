import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { canAccess, useAuth } from '../auth/AuthContext';
import { navItems } from '../nav';

const ROLE_LABEL = { ADMIN: 'Admin', ESG_TEAM: 'ESG Team', INVESTEE: 'Investee', VIEWER: 'Viewer' } as const;

export default function Layout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className={`${collapsed ? 'w-16' : 'w-60'} shrink-0 bg-brand-500 text-white transition-all`}>
        <div className="flex h-14 items-center px-4 font-semibold">{collapsed ? 'E' : 'ESG Monitoring'}</div>
        <nav className="space-y-1 px-2">
          {navItems
            .filter((item) => canAccess(user, item.roles))
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                title={item.label}
                className={({ isActive }) =>
                  `block truncate rounded-md px-3 py-2 text-sm ${isActive ? 'bg-white text-brand-700' : 'hover:bg-brand-600'}`
                }
              >
                {collapsed ? item.label[0] : item.label}
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            className="rounded p-2 text-neutral-600 hover:bg-neutral-100"
          >
            ☰
          </button>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{user?.name}</span>
            {user && <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">{ROLE_LABEL[user.role]}</span>}
            <button onClick={logout} className="text-neutral-500 hover:text-neutral-900">
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
