/**
 * Digital logic: Boolean expression parser, evaluator and truth-table generator.
 * Accepts AND (· * & AND, or juxtaposition like AB), OR (+ | OR), NOT (' ¬ ~ ! NOT),
 * XOR (⊕ ^ XOR), and NAND, NOR, XNOR as infix keywords.
 * Precedence: NOT > AND/NAND > XOR/XNOR > OR/NOR.
 */
import { emptySolution, Solution } from '../solution';

export type LNode =
  | { t: 'var'; name: string }
  | { t: 'const'; v: 0 | 1 }
  | { t: 'not'; a: LNode }
  | { t: 'bin'; op: 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR'; a: LNode; b: LNode };

export class LogicParseError extends Error {}

type Tok = { k: 'var'; v: string } | { k: 'op'; v: string } | { k: 'lp' } | { k: 'rp' } | { k: 'not' } | { k: 'post' } | { k: 'const'; v: 0 | 1 };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  const s = src.replace(/[·•∙⋅]/g, '.').trim();
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
    if (word) {
      const w = word[0].toUpperCase();
      if (['AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR'].includes(w)) toks.push({ k: 'op', v: w });
      else if (w === 'NOT') toks.push({ k: 'not' });
      else {
        // multi-letter uppercase run like "AB" means A AND B (single-letter variables)
        const raw = word[0];
        if (/^[A-Z]+$/.test(raw) && raw.length > 1) raw.split('').forEach((ch) => toks.push({ k: 'var', v: ch }));
        else toks.push({ k: 'var', v: raw });
      }
      i += word[0].length;
      continue;
    }
    if (c === '0' || c === '1') toks.push({ k: 'const', v: c === '1' ? 1 : 0 });
    else if (c === '(') toks.push({ k: 'lp' });
    else if (c === ')') toks.push({ k: 'rp' });
    else if (c === "'" || c === '’') toks.push({ k: 'post' });
    else if (c === '¬' || c === '~' || c === '!') toks.push({ k: 'not' });
    else if (c === '.' || c === '*' || c === '&' || c === '∧') toks.push({ k: 'op', v: 'AND' });
    else if (c === '+' || c === '|' || c === '∨') toks.push({ k: 'op', v: 'OR' });
    else if (c === '⊕' || c === '^') toks.push({ k: 'op', v: 'XOR' });
    else throw new LogicParseError(`Unexpected character "${c}"`);
    i++;
  }
  return toks;
}

export function parseLogic(src: string): LNode {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const orExpr = (): LNode => {
    let a = xorExpr();
    while (peek()?.k === 'op' && ['OR', 'NOR'].includes((peek() as { v: string }).v)) {
      const op = (toks[p++] as { v: string }).v as 'OR' | 'NOR';
      a = { t: 'bin', op, a, b: xorExpr() };
    }
    return a;
  };
  const xorExpr = (): LNode => {
    let a = andExpr();
    while (peek()?.k === 'op' && ['XOR', 'XNOR'].includes((peek() as { v: string }).v)) {
      const op = (toks[p++] as { v: string }).v as 'XOR' | 'XNOR';
      a = { t: 'bin', op, a, b: andExpr() };
    }
    return a;
  };
  const startsFactor = (t: Tok | undefined) => !!t && (t.k === 'var' || t.k === 'lp' || t.k === 'not' || t.k === 'const');
  const andExpr = (): LNode => {
    let a = unary();
    for (;;) {
      const t = peek();
      if (t?.k === 'op' && (t.v === 'AND' || t.v === 'NAND')) {
        p++;
        a = { t: 'bin', op: t.v as 'AND' | 'NAND', a, b: unary() };
      } else if (startsFactor(t)) {
        a = { t: 'bin', op: 'AND', a, b: unary() }; // implicit AND (juxtaposition)
      } else break;
    }
    return a;
  };
  const unary = (): LNode => {
    if (peek()?.k === 'not') {
      p++;
      return postfix({ t: 'not', a: unary() });
    }
    return postfix(primary());
  };
  const postfix = (n: LNode): LNode => {
    while (peek()?.k === 'post') {
      p++;
      n = { t: 'not', a: n };
    }
    return n;
  };
  const primary = (): LNode => {
    const t = toks[p++];
    if (!t) throw new LogicParseError('Unexpected end of expression');
    if (t.k === 'var') return { t: 'var', name: t.v };
    if (t.k === 'const') return { t: 'const', v: t.v };
    if (t.k === 'lp') {
      const e = orExpr();
      if (toks[p++]?.k !== 'rp') throw new LogicParseError('Missing ")"');
      return e;
    }
    throw new LogicParseError('Expected a variable or "("');
  };
  const e = orExpr();
  if (p !== toks.length) throw new LogicParseError('Unexpected symbols at end of expression');
  return e;
}

export function evalLogic(n: LNode, env: Record<string, number>): 0 | 1 {
  switch (n.t) {
    case 'var':
      return env[n.name] ? 1 : 0;
    case 'const':
      return n.v;
    case 'not':
      return evalLogic(n.a, env) ? 0 : 1;
    case 'bin': {
      const a = evalLogic(n.a, env);
      const b = evalLogic(n.b, env);
      const r = { AND: a & b, OR: a | b, XOR: a ^ b, NAND: 1 - (a & b), NOR: 1 - (a | b), XNOR: 1 - (a ^ b) }[n.op];
      return r as 0 | 1;
    }
  }
}

export function variables(n: LNode, acc = new Set<string>()): string[] {
  if (n.t === 'var') acc.add(n.name);
  else if (n.t === 'not') variables(n.a, acc);
  else if (n.t === 'bin') {
    variables(n.a, acc);
    variables(n.b, acc);
  }
  return [...acc].sort();
}

export function toText(n: LNode, top = true): string {
  switch (n.t) {
    case 'var':
      return n.name;
    case 'const':
      return String(n.v);
    case 'not':
      return n.a.t === 'var' ? `${n.a.name}'` : `(${toText(n.a, true)})'`;
    case 'bin': {
      const sym = { AND: '·', OR: ' + ', XOR: ' ⊕ ', NAND: ' NAND ', NOR: ' NOR ', XNOR: ' XNOR ' }[n.op];
      const s = `${toText(n.a, false)}${sym}${toText(n.b, false)}`;
      return top ? s : `(${s})`;
    }
  }
}

function subExpressions(n: LNode, acc: LNode[] = []): LNode[] {
  if (n.t === 'not' || n.t === 'bin') {
    if (n.t === 'not') subExpressions(n.a, acc);
    else {
      subExpressions(n.a, acc);
      subExpressions(n.b, acc);
    }
    acc.push(n);
  }
  return acc;
}

export interface TruthTable {
  vars: string[];
  columns: string[];
  rows: number[][];
  output: number[];
  minterms: number[];
  sop: string;
  pos: string;
}

export function truthTable(src: string): TruthTable {
  const ast = parseLogic(src);
  const vars = variables(ast);
  if (vars.length > 8) throw new LogicParseError('Too many variables (max 8).');
  const subs = subExpressions(ast);
  const uniqueSubs: LNode[] = [];
  const seen = new Set<string>();
  for (const s of subs) {
    const k = toText(s);
    if (!seen.has(k)) {
      seen.add(k);
      uniqueSubs.push(s);
    }
  }
  const rows: number[][] = [];
  const output: number[] = [];
  const minterms: number[] = [];
  for (let i = 0; i < 1 << vars.length; i++) {
    const env: Record<string, number> = {};
    vars.forEach((v, j) => (env[v] = (i >> (vars.length - 1 - j)) & 1));
    const row = [...vars.map((v) => env[v]), ...uniqueSubs.map((s) => evalLogic(s, env))];
    rows.push(row);
    const out = evalLogic(ast, env);
    output.push(out);
    if (out) minterms.push(i);
  }
  const term = (i: number, forSop: boolean) =>
    vars
      .map((v, j) => {
        const bit = (i >> (vars.length - 1 - j)) & 1;
        return forSop ? (bit ? v : `${v}'`) : bit ? `${v}'` : v;
      })
      .join(forSop ? '·' : ' + ');
  const sop = minterms.length ? minterms.map((m) => term(m, true)).join(' + ') : '0';
  const maxterms = output.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
  const pos = maxterms.length ? maxterms.map((m) => `(${term(m, false)})`).join('') : '1';
  return { vars, columns: [...vars, ...uniqueSubs.map((s) => toText(s))], rows, output, minterms, sop, pos };
}

export function logicSolution(src: string): Solution {
  const sol = emptySolution('Logic truth table');
  sol.module = 'telecom';
  sol.topic = 'Digital logic';
  let tt: TruthTable;
  try {
    tt = truthTable(src);
  } catch (e) {
    sol.issues.push({ level: 'error', message: (e as Error).message });
    return sol;
  }
  sol.given.push({ symbolLatex: 'X', name: 'Boolean expression', raw: src, valueSI: 0, quantity: 'count', unit: '' });
  sol.find.push({ symbolLatex: 'X', name: 'Truth table' });
  sol.tables = [{ title: `Truth table for X = ${toText(parseLogic(src))}`, headers: tt.columns.map((c, i) => (i === tt.columns.length - 1 ? `X = ${c}` : c)), rows: tt.rows.map((r) => r.map(String)) }];
  sol.steps.push({
    title: `Step 1 — List all 2^${tt.vars.length} = ${1 << tt.vars.length} input combinations`,
    formulaLatex: `\\text{Rows} = 2^n = 2^{${tt.vars.length}} = ${1 << tt.vars.length}`,
    resultLatex: '',
    explanation: 'Count in binary from 000… to 111… for the inputs, then evaluate each sub-expression column by column (NOT first, then AND, then OR).',
  });
  sol.steps.push({
    title: 'Step 2 — Canonical forms read from the table',
    formulaLatex: '\\text{SOP: OR together the rows where } X = 1',
    workingLatex: [`\\text{SOP: } X = ${tt.sop.replace(/'/g, "'").replace(/·/g, '\\cdot ')}`, `\\text{POS: } X = ${tt.pos}`, `\\text{Minterms: } \\Sigma m(${tt.minterms.join(', ')})`],
    resultLatex: '',
  });
  sol.explanation.push('Gate symbols: AND (·), OR (+), NOT (′), NAND = NOT(AND), NOR = NOT(OR), XOR (⊕) is 1 when inputs differ.');
  sol.ok = true;
  return sol;
}
