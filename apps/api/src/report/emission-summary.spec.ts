import { parseScope, summariseEmissions } from './emission-summary';

const line = (metricName: string, scope: string | null, result: number | null, unit: string | null = 'tCO2-e') => ({
  metricName,
  scope,
  unit,
  result,
});

describe('parseScope', () => {
  it('accepts common spellings and rejects the rest', () => {
    expect(parseScope('Scope 1')).toBe('Scope 1');
    expect(parseScope(' scope2 ')).toBe('Scope 2');
    expect(parseScope('SCOPE 3')).toBe('Scope 3');
    expect(parseScope('Scope 4')).toBeNull();
    expect(parseScope('')).toBeNull();
    expect(parseScope(null)).toBeNull();
  });
});

describe('summariseEmissions', () => {
  const lines = [
    line('Purchased electricity', 'Scope 2', 15),
    line('Transport - Cars', 'Scope 1', 1.16),
    line('Back-up generation', 'scope 1', 0),
    line('Business travel', 'Scope 3', 5),
  ];

  it('totals per scope with percentages of the grand total', () => {
    const s = summariseEmissions(lines);
    expect(s.total).toBeCloseTo(21.16);
    expect(s.byScope.map((r) => [r.scope, r.value])).toEqual([
      ['Scope 1', 1.16],
      ['Scope 2', 15],
      ['Scope 3', 5],
      ['Total', 21.16],
    ]);
    expect(s.byScope.find((r) => r.scope === 'Scope 2')!.percentage).toBe(70.89);
    expect(s.byScope.find((r) => r.scope === 'Total')!.percentage).toBe(100);
  });

  it('lists each source with its share', () => {
    const s = summariseEmissions(lines);
    expect(s.bySource).toHaveLength(4);
    expect(s.bySource[0]).toMatchObject({ source: 'Purchased electricity', scope: 'Scope 2', percentage: 70.89 });
  });

  it('leaves out lines that are not greenhouse-gas results instead of mixing units', () => {
    const s = summariseEmissions([
      ...lines,
      line('Sulphur oxide emissions (SOx)', null, 38.87, 'tCO2-e'),
      line('Water use', 'Scope 2', 100, 'm3'),
      line('Not calculated', 'Scope 1', null),
    ]);
    expect(s.total).toBeCloseTo(21.16);
    expect(s.other.map((o) => o.metricName)).toEqual(['Sulphur oxide emissions (SOx)', 'Water use']);
  });

  it('accepts tCO2e spelling variants', () => {
    const s = summariseEmissions([line('A', 'Scope 1', 2, 'tCO2e'), line('B', 'Scope 1', 3, 'tco2_e')]);
    expect(s.total).toBe(5);
  });

  it('handles an empty report without dividing by zero', () => {
    const s = summariseEmissions([]);
    expect(s.total).toBe(0);
    expect(s.byScope.every((r) => r.percentage === 0)).toBe(true);
  });
});
