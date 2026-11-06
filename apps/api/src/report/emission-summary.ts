export type Scope = 'Scope 1' | 'Scope 2' | 'Scope 3';

export interface ResultLine {
  metricName: string;
  scope: string | null;
  unit: string | null;
  result: number | null;
  /** Optional label for where the line came from (used by consolidated reports). */
  company?: string;
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
const pct = (part: number, total: number) => (total === 0 ? 0 : round((part / total) * 100));

const SCOPES: Scope[] = ['Scope 1', 'Scope 2', 'Scope 3'];

const normaliseUnit = (u: string | null) => (u ?? '').toLowerCase().replace(/[\s_]/g, '');
const isCo2e = (u: string | null) => ['tco2-e', 'tco2e', 'tco2eq'].includes(normaliseUnit(u));

/** "Scope 2", "scope2", "SCOPE 2 " → "Scope 2"; anything else → null. */
export function parseScope(raw: string | null): Scope | null {
  const m = /^\s*scope\s*([123])\s*$/i.exec(raw ?? '');
  return m ? (`Scope ${m[1]}` as Scope) : null;
}

/** A line counts toward greenhouse-gas totals only if it has a numeric result, a scope 1–3 and a tCO2-e unit. */
export const isGhgLine = (l: ResultLine) => l.result !== null && parseScope(l.scope) !== null && isCo2e(l.unit);

export interface EmissionSummary {
  unit: 'tCO2-e';
  byScope: { scope: Scope | 'Total'; value: number; percentage: number }[];
  total: number;
  bySource: { source: string; scope: Scope; company?: string; value: number; percentage: number }[];
  /** Results that are not greenhouse-gas lines (e.g. other pollutants) keep their own unit. */
  other: { metricName: string; unit: string | null; result: number }[];
}

export function summariseEmissions(lines: ResultLine[]): EmissionSummary {
  const ghg = lines.filter(isGhgLine);
  const totals = new Map<Scope, number>(SCOPES.map((s) => [s, 0]));
  for (const l of ghg) totals.set(parseScope(l.scope)!, totals.get(parseScope(l.scope)!)! + (l.result as number));
  const total = [...totals.values()].reduce((a, b) => a + b, 0);

  return {
    unit: 'tCO2-e',
    byScope: [
      ...SCOPES.map((scope) => ({ scope, value: round(totals.get(scope)!, 6), percentage: pct(totals.get(scope)!, total) })),
      { scope: 'Total' as const, value: round(total, 6), percentage: total === 0 ? 0 : 100 },
    ],
    total: round(total, 6),
    bySource: ghg.map((l) => ({
      source: l.metricName,
      scope: parseScope(l.scope)!,
      company: l.company,
      value: round(l.result as number, 6),
      percentage: pct(l.result as number, total),
    })),
    other: lines
      .filter((l) => !isGhgLine(l) && l.result !== null)
      .map((l) => ({ metricName: l.metricName, unit: l.unit, result: l.result as number })),
  };
}
