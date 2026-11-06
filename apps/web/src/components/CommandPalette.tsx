import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, LogOut, Search } from 'lucide-react';
import { canAccess, useAuth } from '../auth/AuthContext';
import { navItems } from '../nav';

interface Command {
  id: string;
  label: string;
  hint: string;
  haystack: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  run: () => void;
}

/** ⌘K / Ctrl+K: jump to any page you can open, or sign out, from the keyboard. */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      ...navItems
        .filter((i) => canAccess(user, i.roles))
        .map((i) => ({
          id: i.path,
          label: i.label,
          hint: i.group,
          haystack: `${i.label} ${i.group} ${i.keywords ?? ''}`.toLowerCase(),
          icon: i.icon,
          run: () => navigate(i.path),
        })),
      { id: 'signout', label: 'Sign out', hint: 'Account', haystack: 'sign out logout log out', icon: LogOut, run: logout },
    ],
    [user, navigate, logout],
  );

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter((c) => words.every((w) => c.haystack.includes(w)));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const choose = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-forest-950/50 p-4 pt-[14vh] backdrop-blur-[3px]" style={{ animation: 'fade .15s both' }} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-card"
        style={{ boxShadow: 'var(--shadow-pop)', animation: 'pop .18s cubic-bezier(.2,.7,.2,1) both' }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') choose(results[active]);
        }}
      >
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4">
          <Search size={16} className="text-neutral-500" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a page…"
            aria-label="Search pages"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-500">esc</kbd>
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-neutral-500">Nothing matches “{query}”</li>}
          {results.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${i === active ? 'bg-forest-50 text-forest-800' : 'text-neutral-700'}`}
              >
                <c.icon size={16} className={i === active ? 'text-forest-600' : 'text-neutral-400'} />
                <span className="flex-1">{c.label}</span>
                <span className="text-xs text-neutral-400">{c.hint}</span>
                {i === active && <CornerDownLeft size={13} className="text-forest-500" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
