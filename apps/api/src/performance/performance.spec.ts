import { annualise, attainment, buildPerformance, isOverdue, riskMatrix, riskScore, statusOf, type MetricPerformanceInput } from './performance';

const obs = (...pairs: [string, number][]) => pairs.map(([d, value]) => ({ periodEnd: new Date(`${d}T00:00:00Z`), value }));

describe('annualise', () => {
  const o = obs(['2024-03-31', 10], ['2024-01-31', 4], ['2024-02-29', 6]);
  it('sums, averages, or takes the latest period regardless of input order', () => {
    expect(annualise(o, 'SUM')).toBe(20);
    expect(annualise(o, 'AVERAGE')).toBeCloseTo(6.6667);
    expect(annualise(o, 'LATEST')).toBe(10);
  });
  it('is null with no data', () => {
    expect(annualise([], 'SUM')).toBeNull();
  });
});

describe('attainment', () => {
  it('at-most targets (emissions, accidents): staying under is full marks, overshoot scales down', () => {
    expect(attainment(80, 100, 'AT_MOST')).toBe(100);
    expect(attainment(100, 100, 'AT_MOST')).toBe(100);
    expect(attainment(125, 100, 'AT_MOST')).toBe(80);
    expect(attainment(0, 0, 'AT_MOST')).toBe(100); // zero-incident target met with zero incidents
    expect(attainment(2, 0, 'AT_MOST')).toBe(0);
  });
  it('at-least targets (renewables, training): reaching it is full marks, shortfall scales down', () => {
    expect(attainment(30, 25, 'AT_LEAST')).toBe(100);
    expect(attainment(20, 25, 'AT_LEAST')).toBe(80);
    expect(attainment(5, 0, 'AT_LEAST')).toBe(100);
  });
  it('maps attainment to a status band', () => {
    expect([100, 99.9, 80, 79.9, 0].map(statusOf)).toEqual(['met', 'at_risk', 'at_risk', 'off_track', 'off_track']);
  });
});

const metric = (over: Partial<MetricPerformanceInput>): MetricPerformanceInput => ({
  metricId: 'm',
  code: 'M',
  name: 'Metric',
  group: 'ENVIRONMENTAL',
  unit: null,
  aggregation: 'SUM',
  observations: [],
  target: { value: 100, direction: 'AT_MOST' },
  ...over,
});

describe('buildPerformance', () => {
  const result = buildPerformance([
    metric({ metricId: 'e1', observations: obs(['2024-01-31', 60], ['2024-02-29', 40]) }), // 100 vs ≤100 → 100
    metric({ metricId: 'e2', observations: obs(['2024-01-31', 125]) }), // 80
    metric({ metricId: 'e3', observations: [] }), // no data yet
    metric({ metricId: 's1', group: 'SOCIAL', aggregation: 'LATEST', observations: obs(['2024-06-30', 20]), target: { value: 40, direction: 'AT_LEAST' } }), // 50
  ]);

  it('averages attainment per pillar over targets that have data', () => {
    const e = result.pillars.find((p) => p.group === 'ENVIRONMENTAL')!;
    expect(e).toMatchObject({ index: 90, targets: 3, measured: 2, met: 1 });
    expect(result.pillars.find((p) => p.group === 'SOCIAL')!.index).toBe(50);
  });

  it('leaves a pillar without data empty and out of the overall index', () => {
    expect(result.pillars.find((p) => p.group === 'GOVERNANCE')).toMatchObject({ index: null, targets: 0 });
    expect(result.overall).toBe(70); // (90 + 50) / 2
  });

  it('keeps the per-period series in date order for trend charts', () => {
    const e1 = result.metrics.find((m) => m.metricId === 'e1')!;
    expect(e1.series.map((s) => s.periodEnd)).toEqual(['2024-01-31', '2024-02-29']);
    expect(e1.actual).toBe(100);
    expect(result.metrics.find((m) => m.metricId === 'e3')).toMatchObject({ actual: null, attainment: null, status: null });
  });

  it('has no overall index when nothing was measured', () => {
    expect(buildPerformance([]).overall).toBeNull();
  });
});

describe('risk helpers', () => {
  it('counts risks into a 5×5 likelihood × impact grid and ignores out-of-range values', () => {
    const grid = riskMatrix([{ likelihood: 5, impact: 5 }, { likelihood: 5, impact: 5 }, { likelihood: 1, impact: 2 }, { likelihood: 9, impact: 1 }]);
    expect(grid[4][4]).toBe(2);
    expect(grid[0][1]).toBe(1);
    expect(grid.flat().reduce((a, b) => a + b, 0)).toBe(3);
    expect(riskScore({ likelihood: 4, impact: 4 })).toBe(16);
  });

  it('flags overdue only when open, dated, and in the past (today is not overdue)', () => {
    const today = new Date('2024-05-10T15:00:00Z');
    expect(isOverdue(new Date('2024-05-09T00:00:00Z'), false, today)).toBe(true);
    expect(isOverdue(new Date('2024-05-10T00:00:00Z'), false, today)).toBe(false);
    expect(isOverdue(new Date('2024-05-09T00:00:00Z'), true, today)).toBe(false);
    expect(isOverdue(null, false, today)).toBe(false);
  });
});
