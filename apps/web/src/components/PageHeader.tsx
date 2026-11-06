import type { ReactNode } from 'react';

/** Every page opens with the same rhythm: small eyebrow, a serif title, a one-line description, actions on the right. */
export default function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="display text-[40px] text-neutral-900">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
