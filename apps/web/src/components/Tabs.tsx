import { useState, type ReactNode } from 'react';

export default function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1 border-b border-neutral-300">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === current.id}
            onClick={() => setActive(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              t.id === current.id
                ? 'border-brand-500 font-medium text-brand-700'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={current.id}>
        {current.content}
      </div>
    </div>
  );
}
