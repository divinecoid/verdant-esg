/**
 * Small arithmetic expression engine for emission formulas, e.g.
 *   EF_PURCHASED_ELEC * {data_input_purchased_elec} / 1000
 * Supports numbers, identifiers (optionally wrapped in braces), + - * / ^, unary +/-, and parentheses.
 * Deliberately not `eval`/`Function`: only the grammar below can run.
 */

export class FormulaError extends Error {}

export type Ast =
  | { type: 'num'; value: number }
  | { type: 'var'; name: string }
  | { type: 'neg'; arg: Ast }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Ast; right: Ast };

type Token = { kind: 'num' | 'id' | 'op' | 'lp' | 'rp'; text: string; pos: number };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new FormulaError(`Invalid number at position ${i + 1}`);
      tokens.push({ kind: 'num', text: m[0], pos: i });
      i += m[0].length;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      tokens.push({ kind: 'id', text: m[0], pos: i });
      i += m[0].length;
    } else if (c === '{') {
      const m = /^\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}/.exec(src.slice(i));
      if (!m) throw new FormulaError(`Invalid {variable} at position ${i + 1}`);
      tokens.push({ kind: 'id', text: m[1], pos: i });
      i += m[0].length;
    } else if ('+-*/^'.includes(c)) {
      tokens.push({ kind: 'op', text: c, pos: i });
      i++;
    } else if (c === '(') {
      tokens.push({ kind: 'lp', text: c, pos: i++ });
    } else if (c === ')') {
      tokens.push({ kind: 'rp', text: c, pos: i++ });
    } else {
      throw new FormulaError(`Unexpected character "${c}" at position ${i + 1}`);
    }
  }
  return tokens;
}

export function parseFormula(src: string): Ast {
  const tokens = tokenize(src);
  if (!tokens.length) throw new FormulaError('Formula is empty');
  let p = 0;

  const peek = () => tokens[p];
  const isOp = (t: Token | undefined, ...ops: string[]) => t?.kind === 'op' && ops.includes(t.text);

  function expr(): Ast {
    let left = term();
    while (isOp(peek(), '+', '-')) {
      const op = tokens[p++].text as '+' | '-';
      left = { type: 'bin', op, left, right: term() };
    }
    return left;
  }

  function term(): Ast {
    let left = power();
    while (isOp(peek(), '*', '/')) {
      const op = tokens[p++].text as '*' | '/';
      left = { type: 'bin', op, left, right: power() };
    }
    return left;
  }

  // Unary minus binds looser than ^ (so -2 ^ 2 = -4) but the exponent itself may be negative (2 ^ -1).
  function power(): Ast {
    return unary();
  }

  function unary(): Ast {
    if (isOp(peek(), '-')) {
      p++;
      return { type: 'neg', arg: unary() };
    }
    if (isOp(peek(), '+')) {
      p++;
      return unary();
    }
    const base = primary();
    if (isOp(peek(), '^')) {
      p++;
      return { type: 'bin', op: '^', left: base, right: unary() };
    }
    return base;
  }

  function primary(): Ast {
    const t = tokens[p];
    if (!t) throw new FormulaError('Formula ends unexpectedly');
    p++;
    if (t.kind === 'num') return { type: 'num', value: Number(t.text) };
    if (t.kind === 'id') return { type: 'var', name: t.text };
    if (t.kind === 'lp') {
      const inner = expr();
      if (tokens[p]?.kind !== 'rp') throw new FormulaError('Missing closing parenthesis');
      p++;
      return inner;
    }
    throw new FormulaError(`Unexpected "${t.text}" at position ${t.pos + 1}`);
  }

  const ast = expr();
  if (p < tokens.length) throw new FormulaError(`Unexpected "${tokens[p].text}" at position ${tokens[p].pos + 1}`);
  return ast;
}

/** Distinct variable names in order of first appearance. */
export function variablesOf(ast: Ast, found = new Set<string>()): string[] {
  if (ast.type === 'var') found.add(ast.name);
  else if (ast.type === 'neg') variablesOf(ast.arg, found);
  else if (ast.type === 'bin') {
    variablesOf(ast.left, found);
    variablesOf(ast.right, found);
  }
  return [...found];
}

export function evaluateFormula(ast: Ast, values: Record<string, number>): number {
  const walk = (n: Ast): number => {
    switch (n.type) {
      case 'num':
        return n.value;
      case 'var': {
        // Own properties only, so names like "constructor" don't resolve through the prototype chain.
        const v = Object.hasOwn(values, n.name) ? values[n.name] : undefined;
        if (v === undefined) throw new FormulaError(`No value for "${n.name}"`);
        return v;
      }
      case 'neg':
        return -walk(n.arg);
      case 'bin': {
        const a = walk(n.left);
        const b = walk(n.right);
        if (n.op === '/' && b === 0) throw new FormulaError('Division by zero');
        return n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : n.op === '/' ? a / b : a ** b;
      }
    }
  };
  const result = walk(ast);
  if (!Number.isFinite(result)) throw new FormulaError('Result is not a finite number');
  return result;
}
