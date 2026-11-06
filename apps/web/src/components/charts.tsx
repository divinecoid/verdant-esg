import { useEffect, useState } from 'react';

/** Tiny trend line with a soft area and an end dot. Drawn by hand so it stays crisp and weighs nothing. */
export function Sparkline({ values, color = 'var(--color-forest-600)', width = 96, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="var(--color-neutral-300)" strokeDasharray="2 3" />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)] as const);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} role="img" aria-label={`Trend over ${values.length} periods`}>
      <polygon points={`${pad},${height} ${line} ${width - pad},${height}`} fill={color} opacity="0.1" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.4" fill={color} />
    </svg>
  );
}

export interface Ring {
  label: string;
  /** 0–100, or null when nothing has been measured yet. */
  value: number | null;
  color: string;
}

/**
 * Three concentric progress rings (one per ESG pillar) around a centre label. The arcs draw in on mount; a ring
 * with no data shows only its faint track instead of a misleading zero.
 */
export function PillarRings({ rings, size = 260, children }: { rings: Ring[]; size?: number; children?: React.ReactNode }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const stroke = 13;
  const gap = 7;
  const c = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={rings.map((r) => `${r.label} ${r.value ?? 'no data'}`).join(', ')}>
        {rings.map((ring, i) => {
          const r = c - stroke / 2 - 2 - i * (stroke + gap);
          const len = 2 * Math.PI * r;
          const pct = ring.value === null ? 0 : Math.max(0, Math.min(100, ring.value));
          return (
            <g key={ring.label} transform={`rotate(-90 ${c} ${c})`}>
              <circle cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeOpacity="0.14" strokeWidth={stroke} />
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={drawn ? len * (1 - pct / 100) : len}
                style={{ transition: `stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1) ${i * 0.12}s` }}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Horizontal bar showing attainment against a target, with the 100% mark kept in view. */
export function AttainmentBar({ value, color }: { value: number | null; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/80" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${value ?? 0}%`, background: color }} />
    </div>
  );
}
