export type Group = 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE';

/** One fixed identity per pillar, reused by rings, charts, badges and tables. */
export const PILLARS: Record<Group, { label: string; short: string; color: string; tint: string }> = {
  ENVIRONMENTAL: { label: 'Environmental', short: 'E', color: 'var(--color-env)', tint: 'rgb(47 143 101 / 0.12)' },
  SOCIAL: { label: 'Social', short: 'S', color: 'var(--color-soc)', tint: 'rgb(212 105 58 / 0.12)' },
  GOVERNANCE: { label: 'Governance', short: 'G', color: 'var(--color-gov)', tint: 'rgb(77 98 179 / 0.12)' },
};

export const GROUPS: Group[] = ['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE'];

export const fmtNum = (n: number | null | undefined, maxDigits = 2) =>
  n === null || n === undefined ? '–' : n.toLocaleString('en-US', { maximumFractionDigits: maxDigits });
