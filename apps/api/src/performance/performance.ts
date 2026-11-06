export type Group = 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE';
export type Aggregation = 'SUM' | 'AVERAGE' | 'LATEST';
export type Direction = 'AT_MOST' | 'AT_LEAST';
export type TargetStatus = 'met' | 'at_risk' | 'off_track';

export interface Observation {
  periodEnd: Date;
  value: number;
}

export interface MetricPerformanceInput {
  metricId: string;
  code: string;
  name: string;
  group: Group;
  unit: string | null;
  aggregation: Aggregation;
  observations: Observation[];
  target: { value: number; direction: Direction };
}

export interface MetricPerformance {
  metricId: string;
  code: string;
  name: string;
  group: Group;
  unit: string | null;
  direction: Direction;
  target: number;
  actual: number | null;
  /** 0–100; null when there is no data yet. */
  attainment: number | null;
  status: TargetStatus | null;
  series: { periodEnd: string; value: number }[];
}

export interface Performance {
  /** Mean attainment of every target that has data, per pillar (null when the pillar has none). */
  pillars: { group: Group; index: number | null; targets: number; measured: number; met: number }[];
  /** Mean of the pillar indices that exist. This is a target-attainment index, not an external rating. */
  overall: number | null;
  metrics: MetricPerformance[];
}

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Combines one metric's per-period values into the annual figure. */
export function annualise(observations: Observation[], aggregation: Aggregation): number | null {
  if (!observations.length) return null;
  const sorted = [...observations].sort((a, b) => a.periodEnd.getTime() - b.periodEnd.getTime());
  if (aggregation === 'LATEST') return sorted[sorted.length - 1].value;
  const total = sorted.reduce((sum, o) => sum + o.value, 0);
  return aggregation === 'SUM' ? total : total / sorted.length;
}

/** How much of the target is achieved, capped at 100: hitting or beating it counts as full attainment. */
export function attainment(actual: number, target: number, direction: Direction): number {
  if (direction === 'AT_MOST') {
    if (actual <= target) return 100;
    return target <= 0 ? 0 : round((target / actual) * 100);
  }
  if (actual >= target) return 100;
  return target <= 0 ? 100 : round((actual / target) * 100);
}

export const statusOf = (pct: number): TargetStatus => (pct >= 100 ? 'met' : pct >= 80 ? 'at_risk' : 'off_track');

const GROUPS: Group[] = ['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE'];
const mean = (xs: number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function buildPerformance(inputs: MetricPerformanceInput[]): Performance {
  const metrics: MetricPerformance[] = inputs.map((m) => {
    const actual = annualise(m.observations, m.aggregation);
    const att = actual === null ? null : attainment(actual, m.target.value, m.target.direction);
    return {
      metricId: m.metricId,
      code: m.code,
      name: m.name,
      group: m.group,
      unit: m.unit,
      direction: m.target.direction,
      target: m.target.value,
      actual: actual === null ? null : round(actual, 4),
      attainment: att,
      status: att === null ? null : statusOf(att),
      series: [...m.observations]
        .sort((a, b) => a.periodEnd.getTime() - b.periodEnd.getTime())
        .map((o) => ({ periodEnd: o.periodEnd.toISOString().slice(0, 10), value: round(o.value, 4) })),
    };
  });

  const pillars = GROUPS.map((group) => {
    const inGroup = metrics.filter((m) => m.group === group);
    const measured = inGroup.filter((m) => m.attainment !== null);
    return {
      group,
      index: mean(measured.map((m) => m.attainment as number)),
      targets: inGroup.length,
      measured: measured.length,
      met: measured.filter((m) => m.status === 'met').length,
    };
  });

  return { pillars, overall: mean(pillars.filter((p) => p.index !== null).map((p) => p.index as number)), metrics };
}

// ---- risk indicators -------------------------------------------------------

/** 5×5 grid of open-risk counts, `cells[likelihood-1][impact-1]`. */
export function riskMatrix(risks: { likelihood: number; impact: number }[]): number[][] {
  const cells = Array.from({ length: 5 }, () => Array<number>(5).fill(0));
  for (const r of risks) {
    if (r.likelihood >= 1 && r.likelihood <= 5 && r.impact >= 1 && r.impact <= 5) cells[r.likelihood - 1][r.impact - 1]++;
  }
  return cells;
}

/** Risk score = likelihood × impact; 15 and above is "high". */
export const HIGH_RISK_SCORE = 15;
export const riskScore = (r: { likelihood: number; impact: number }) => r.likelihood * r.impact;

export const isOverdue = (dueDate: Date | null, closed: boolean, today: Date) =>
  !closed && dueDate !== null && dueDate.getTime() < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
