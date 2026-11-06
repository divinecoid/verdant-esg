import { useState, type ReactNode } from 'react';

export default function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="space-y-6">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((t) => {
          const selected = t.id === current.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.id)}
              className={`relative -mb-px whitespace-nowrap px-4 py-2.5 text-[13.5px] transition-colors ${
                selected ? 'font-semibold text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {t.label}
              {selected && <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-forest-600" />}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" key={current.id} className="rise">
        {current.content}
      </div>
    </div>
  );
}
