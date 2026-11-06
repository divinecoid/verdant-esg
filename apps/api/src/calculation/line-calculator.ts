import { evaluateFormula, FormulaError, parseFormula, variablesOf } from '../formula/formula-engine';
import type { ResolvedVariable } from '../formula/formula.service';

export interface LineInput {
  /** The value the company submitted for the metric. */
  value: string | null;
  /** Active formulas for the metric; exactly one is expected when the metric is calculated. */
  formulas: { code: string; expression: string }[];
  /** Looks up emission factors / base years for the variable names (and says which are data inputs). */
  resolve: (names: string[]) => Promise<ResolvedVariable[]>;
}

export interface LineOutput {
  result: number | null;
  emissionFactor: number | null;
  formulaCode: string | null;
  formulaExpression: string | null;
  variables: ResolvedVariable[];
  error: string | null;
}

const toNumber = (v: string | null) => {
  if (v === null || v.trim() === '') return null;
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const fail = (error: string, base: Partial<LineOutput> = {}): LineOutput => ({
  result: null,
  emissionFactor: null,
  formulaCode: null,
  formulaExpression: null,
  variables: [],
  ...base,
  error,
});

/**
 * Works out one metric's result. A request stores a single value per metric, so that value feeds the formula's
 * one data-input variable; the other variables must be emission factors or base-year values. Metrics without a
 * formula pass their numeric value straight through (text answers simply have no numeric result).
 */
export async function calculateLine({ value, formulas, resolve }: LineInput): Promise<LineOutput> {
  const number = toNumber(value);

  if (formulas.length === 0) {
    return { result: number, emissionFactor: null, formulaCode: null, formulaExpression: null, variables: [], error: null };
  }
  if (formulas.length > 1) {
    return fail(`More than one active formula for this metric (${formulas.map((f) => f.code).join(', ')})`);
  }

  const [formula] = formulas;
  const base = { formulaCode: formula.code, formulaExpression: formula.expression };

  let ast;
  try {
    ast = parseFormula(formula.expression);
  } catch (e) {
    if (e instanceof FormulaError) return fail(`Invalid formula: ${e.message}`, base);
    throw e;
  }

  const variables = await resolve(variablesOf(ast));
  const unknown = variables.filter((v) => v.source === 'unknown').map((v) => v.name);
  if (unknown.length) return fail(`Unknown variable(s): ${unknown.join(', ')}`, { ...base, variables });

  const inputs = variables.filter((v) => v.source === 'input');
  if (inputs.length > 1) {
    return fail(`The formula needs ${inputs.length} data inputs (${inputs.map((i) => i.name).join(', ')}), but a request holds one value per metric`, { ...base, variables });
  }
  if (inputs.length === 1) {
    if (number === null) return fail(value?.trim() ? `"${value}" is not a number` : 'No value was submitted', { ...base, variables });
    inputs[0].value = number;
  }

  const missing = variables.filter((v) => v.value === null).map((v) => v.name);
  if (missing.length) return fail(`No value available for ${missing.join(', ')} in the reporting year`, { ...base, variables });

  const values: Record<string, number> = Object.create(null);
  for (const v of variables) values[v.name] = v.value as number;

  try {
    const result = evaluateFormula(ast, values);
    const ef = variables.find((v) => v.source === 'emission-factor');
    return { ...base, result, emissionFactor: ef ? (ef.value as number) : null, variables, error: null };
  } catch (e) {
    if (e instanceof FormulaError) return fail(e.message, { ...base, variables });
    throw e;
  }
}
