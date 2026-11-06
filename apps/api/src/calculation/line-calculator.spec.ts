import type { ResolvedVariable } from '../formula/formula.service';
import { calculateLine } from './line-calculator';

const resolver = (table: Record<string, Partial<ResolvedVariable> & Pick<ResolvedVariable, 'source'>>) => async (names: string[]) =>
  names.map((name) => ({ name, value: null, ...(table[name] ?? { source: 'unknown' as const }) }) as ResolvedVariable);

const elec = { code: 'C_01', expression: 'EF_ELEC * {kwh} / 1000' };

describe('calculateLine', () => {
  const resolve = resolver({ EF_ELEC: { source: 'emission-factor', value: 0.778 }, kwh: { source: 'input' } });

  it('feeds the submitted value into the formula and reports the emission factor used', async () => {
    const out = await calculateLine({ value: '5000', formulas: [elec], resolve });
    expect(out.error).toBeNull();
    expect(out.result).toBeCloseTo(3.89);
    expect(out.emissionFactor).toBe(0.778);
    expect(out.formulaCode).toBe('C_01');
    expect(out.variables.find((v) => v.name === 'kwh')?.value).toBe(5000);
  });

  it('passes numeric values through when there is no formula, and leaves text without a result', async () => {
    expect((await calculateLine({ value: '12.5', formulas: [], resolve })).result).toBe(12.5);
    const text = await calculateLine({ value: 'Policy in place', formulas: [], resolve });
    expect(text.result).toBeNull();
    expect(text.error).toBeNull();
  });

  it('reports a bad input instead of throwing', async () => {
    expect((await calculateLine({ value: 'abc', formulas: [elec], resolve })).error).toContain('is not a number');
    expect((await calculateLine({ value: null, formulas: [elec], resolve })).error).toBe('No value was submitted');
  });

  it('refuses ambiguous or unsupported formulas', async () => {
    const two = await calculateLine({ value: '1', formulas: [elec, { code: 'C_02', expression: '1' }], resolve });
    expect(two.error).toContain('More than one active formula');

    const multi = resolver({ a: { source: 'input' }, b: { source: 'input' } });
    const out = await calculateLine({ value: '1', formulas: [{ code: 'X', expression: 'a + b' }], resolve: multi });
    expect(out.error).toContain('needs 2 data inputs');
  });

  it('flags unknown variables and missing emission-factor years', async () => {
    const unknown = await calculateLine({ value: '1', formulas: [{ code: 'X', expression: 'NOPE * 2' }], resolve });
    expect(unknown.error).toContain('Unknown variable(s): NOPE');

    const noYear = resolver({ EF_ELEC: { source: 'emission-factor', value: null }, kwh: { source: 'input' } });
    const out = await calculateLine({ value: '5', formulas: [elec], resolve: noYear });
    expect(out.error).toContain('No value available for EF_ELEC');
  });

  it('turns engine errors such as division by zero into line errors', async () => {
    const out = await calculateLine({ value: '0', formulas: [{ code: 'D', expression: '1 / {kwh}' }], resolve });
    expect(out.error).toBe('Division by zero');
  });

  it('supports formulas with base-year values and no data input', async () => {
    const r = resolver({ BY2024: { source: 'base-year', value: 50 } });
    const out = await calculateLine({ value: null, formulas: [{ code: 'B', expression: 'BY2024 * 2' }], resolve: r });
    expect(out.result).toBe(100);
    expect(out.emissionFactor).toBeNull();
  });
});
