/** Mark: three concentric growth rings with a leaf-shaped cut, drawn so it works at 20px and at 200px. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.25" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="16" cy="16" r="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.65" />
      <path d="M16 6.5c5.4 1.2 8.3 5.6 7.1 11.3-.4 1.9-1.6 3.5-3.4 4.4-5.6-.9-8.9-5.2-7.9-10.8.3-1.9 1.2-3.7 4.2-4.9Z" fill="var(--color-lime)" />
      <path d="M16 24c.4-4.6 1.6-8 4.6-11.4" stroke="var(--color-forest-950)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-white">
      <LogoMark />
      {!collapsed && (
        <span className="display text-[22px] leading-none tracking-tight">
          Verdant<span className="text-lime">.</span>
        </span>
      )}
    </div>
  );
}
