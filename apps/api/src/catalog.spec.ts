import { attributes, emissionFactors, formulas, metrics, themes } from '../prisma/catalog';
import { parseFormula, variablesOf } from './formula/formula-engine';

describe('starter catalog', () => {
  const themeCodes = new Set(themes.map((t) => t.code));
  const metricCodes = metrics.map((m) => m.code);

  it('has unique codes and every metric points at a real theme', () => {
    expect(new Set(metricCodes).size).toBe(metricCodes.length);
    expect(new Set(themes.map((t) => t.code)).size).toBe(themes.length);
    expect(metrics.filter((m) => !themeCodes.has(m.theme))).toEqual([]);
  });

  it('covers all three pillars with several metrics each', () => {
    const groupOf = new Map(themes.map((t) => [t.code, t.group]));
    for (const g of ['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE']) {
      expect(metrics.filter((m) => groupOf.get(m.theme) === g).length).toBeGreaterThanOrEqual(10);
    }
  });

  it('every formula parses and only uses declared attributes and emission factors', () => {
    const known = new Set([...attributes.map((a) => a.code), ...emissionFactors.map((e) => e.code)]);
    for (const f of formulas) {
      const vars = variablesOf(parseFormula(f.expression));
      expect(vars.filter((v) => !known.has(v))).toEqual([]);
      // one data input per formula, because a request holds one value per metric
      expect(vars.filter((v) => attributes.some((a) => a.code === v))).toHaveLength(1);
      expect(metricCodes).toContain(f.metric);
    }
  });

  it('calculated metrics convert into tCO2-e with a scope, and nothing else does', () => {
    const withFormula = new Set(formulas.map((f) => f.metric));
    for (const m of metrics) {
      if (withFormula.has(m.code)) {
        expect(m.resultUnit).toBe('tCO2-e');
        expect(m.scope).toMatch(/^Scope [123]$/);
      } else {
        expect(m.resultUnit).toBeUndefined();
      }
    }
  });
});
