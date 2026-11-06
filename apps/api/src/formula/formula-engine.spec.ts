import { evaluateFormula, FormulaError, parseFormula, variablesOf } from './formula-engine';

const run = (src: string, vars: Record<string, number> = {}) => evaluateFormula(parseFormula(src), vars);

describe('formula engine', () => {
  it('respects operator precedence and parentheses', () => {
    expect(run('2 + 3 * 4')).toBe(14);
    expect(run('(2 + 3) * 4')).toBe(20);
    expect(run('10 - 4 - 3')).toBe(3);
    expect(run('100 / 5 / 2')).toBe(10);
  });

  it('handles unary minus and right-associative power', () => {
    expect(run('-2 + 5')).toBe(3);
    expect(run('2 ^ 3 ^ 2')).toBe(512);
    expect(run('-2 ^ 2')).toBe(-4);
  });

  it('substitutes plain and braced variables', () => {
    const vars = { EF_ELEC: 0.778, data_input_kwh: 5000 };
    expect(run('EF_ELEC * {data_input_kwh} / 1000', vars)).toBeCloseTo(3.89);
  });

  it('lists distinct variables in order', () => {
    expect(variablesOf(parseFormula('A * {B} + A - 1'))).toEqual(['A', 'B']);
  });

  it('reports syntax errors', () => {
    expect(() => parseFormula('')).toThrow(FormulaError);
    expect(() => parseFormula('1 +')).toThrow(FormulaError);
    expect(() => parseFormula('(1 + 2')).toThrow('Missing closing parenthesis');
    expect(() => parseFormula('1 2')).toThrow(FormulaError);
    expect(() => parseFormula('1 $ 2')).toThrow('Unexpected character');
    expect(() => parseFormula('{bad name}')).toThrow(FormulaError);
  });

  it('rejects code-like input instead of executing it', () => {
    expect(() => parseFormula('process.exit(1)')).toThrow(FormulaError);
    expect(() => parseFormula('constructor')).not.toThrow(); // just a variable name…
    expect(() => run('constructor', {})).toThrow('No value'); // …that has no value
  });

  it('fails on division by zero and missing values', () => {
    expect(() => run('1 / 0')).toThrow('Division by zero');
    expect(() => run('A + 1')).toThrow('No value for "A"');
  });
});
