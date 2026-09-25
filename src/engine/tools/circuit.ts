/**
 * Resistor network analyser. Networks are written as expressions:
 *   R1 + R2            series
 *   R1 || R2  (or //)  parallel (binds tighter than +)
 *   R1 + (R2 || R3)    combined
 * Values can be written inline with units ("10 + 4.7k || 2.2kΩ") or as named resistors.
 * Computes total resistance, supply current, total power and the V, I, P of every resistor.
 */
import { fmtLatex } from '../format';
import { emptySolution, Solution } from '../solution';
import { parseUnit } from '../units';

export type Net =
  | { kind: 'R'; name: string; value: number }
  | { kind: 'series'; items: Net[] }
  | { kind: 'parallel'; items: Net[] };

export class CircuitParseError extends Error {}

export function parseNetwork(src: string, named: Record<string, number> = {}): Net {
  const s = src.replace(/Ω|ohms?/gi, '').replace(/∥|\/\//g, '||');
  let pos = 0;
  let autoIdx = 0;
  const ws = () => {
    while (pos < s.length && /\s/.test(s[pos])) pos++;
  };
  const series = (): Net => {
    const items = [parallel()];
    ws();
    while (s[pos] === '+') {
      pos++;
      items.push(parallel());
      ws();
    }
    return items.length === 1 ? items[0] : { kind: 'series', items };
  };
  const parallel = (): Net => {
    const items = [atom()];
    ws();
    while (s.startsWith('||', pos)) {
      pos += 2;
      items.push(atom());
      ws();
    }
    return items.length === 1 ? items[0] : { kind: 'parallel', items };
  };
  const atom = (): Net => {
    ws();
    if (s[pos] === '(') {
      pos++;
      const e = series();
      ws();
      if (s[pos] !== ')') throw new CircuitParseError('Missing ")"');
      pos++;
      return e;
    }
    const m = /^([0-9]*\.?[0-9]+(?:[eE][-+]?\d+)?)\s*([kKMm]?)/.exec(s.slice(pos));
    if (m && m[0].trim()) {
      pos += m[0].length;
      const mult = m[2] === 'k' || m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : m[2] === 'm' ? 1e-3 : 1;
      autoIdx++;
      return { kind: 'R', name: `R_{${autoIdx}}`, value: parseFloat(m[1]) * mult };
    }
    const nm = /^[A-Za-z][A-Za-z0-9_]*/.exec(s.slice(pos));
    if (nm) {
      pos += nm[0].length;
      const val = named[nm[0]];
      if (val === undefined) throw new CircuitParseError(`No value given for ${nm[0]}`);
      autoIdx++;
      const label = nm[0].replace(/^([A-Za-z]+)(\d+)$/, '$1_{$2}');
      return { kind: 'R', name: label, value: val };
    }
    throw new CircuitParseError(`Unexpected "${s.slice(pos, pos + 5)}" in network`);
  };
  const net = series();
  ws();
  if (pos !== s.length) throw new CircuitParseError(`Unexpected "${s.slice(pos)}"`);
  return net;
}

export function totalR(n: Net): number {
  if (n.kind === 'R') return n.value;
  if (n.kind === 'series') return n.items.reduce((a, x) => a + totalR(x), 0);
  return 1 / n.items.reduce((a, x) => a + 1 / totalR(x), 0);
}

function label(n: Net): string {
  if (n.kind === 'R') return n.name;
  if (n.kind === 'series') return n.items.map(label).join(' + ');
  return '(' + n.items.map(label).join(' \\parallel ') + ')';
}

export interface ResistorResult {
  name: string;
  R: number;
  V: number;
  I: number;
  P: number;
}

function distribute(n: Net, I: number, out: ResistorResult[]) {
  const R = totalR(n);
  const V = I * R;
  if (n.kind === 'R') {
    out.push({ name: n.name, R, V, I, P: V * I });
    return;
  }
  if (n.kind === 'series') n.items.forEach((x) => distribute(x, I, out));
  else n.items.forEach((x) => distribute(x, V / totalR(x), out));
}

const f = (x: number) => fmtLatex(x, 4);

export interface CircuitInput {
  network: string;
  named?: Record<string, number>;
  V?: number;
  I?: number;
}

export function circuitSolution(inp: CircuitInput): Solution {
  const sol = emptySolution('Resistor network');
  sol.module = 'telecom';
  sol.topic = 'Series & parallel circuits';
  let net: Net;
  try {
    net = parseNetwork(inp.network, inp.named);
  } catch (e) {
    sol.issues.push({ level: 'error', message: (e as Error).message });
    return sol;
  }
  const collect = (n: Net, acc: Net[] = []): Net[] => {
    if (n.kind === 'R') acc.push(n);
    else n.items.forEach((x) => collect(x, acc));
    return acc;
  };
  for (const r of collect(net)) {
    if (!(r.kind === 'R' && r.value > 0)) sol.issues.push({ level: 'error', message: 'Every resistance must be positive.' });
    if (r.kind === 'R') sol.given.push({ symbolLatex: r.name, name: 'Resistor', raw: `${r.value} Ω`, valueSI: r.value, quantity: 'resistance', unit: 'Ω' });
  }
  if (sol.issues.length) return sol;
  if (inp.V !== undefined) sol.given.push({ symbolLatex: 'V', name: 'Supply voltage', raw: `${inp.V} V`, valueSI: inp.V, quantity: 'voltage', unit: 'V' });
  if (inp.I !== undefined) sol.given.push({ symbolLatex: 'I', name: 'Supply current', raw: `${inp.I} A`, valueSI: inp.I, quantity: 'current', unit: 'A' });
  sol.find.push({ symbolLatex: 'R_T', name: 'Total resistance' });

  // reduction steps: innermost groups first
  let k = 0;
  const reduce = (n: Net): number => {
    if (n.kind === 'R') return n.value;
    const vals = n.items.map(reduce);
    const R = totalR(n);
    k++;
    if (n.kind === 'series') {
      sol.steps.push({
        title: `Step ${k} — Series combination`,
        formulaLatex: 'R_T = R_1 + R_2 + \\cdots',
        substitutionLatex: `R = ${vals.map((v) => `${f(v)}\\ \\Omega`).join(' + ')}`,
        resultLatex: `R_{${label(n)}} = ${f(R)}\\ \\Omega`,
        unitCheckLatex: '\\Omega + \\Omega = \\Omega\\ \\checkmark',
        unitCheckOk: true,
        explanation: 'Series resistors carry the same current; resistances add.',
      });
    } else {
      sol.steps.push({
        title: `Step ${k} — Parallel combination`,
        formulaLatex: '\\frac{1}{R_T} = \\frac{1}{R_1} + \\frac{1}{R_2} + \\cdots',
        substitutionLatex: `\\frac{1}{R} = ${vals.map((v) => `\\frac{1}{${f(v)}}`).join(' + ')} = ${f(vals.reduce((a, v) => a + 1 / v, 0))}\\ \\Omega^{-1}`,
        resultLatex: `R_{${label(n)}} = ${f(R)}\\ \\Omega`,
        unitCheckLatex: '(\\Omega^{-1})^{-1} = \\Omega\\ \\checkmark',
        unitCheckOk: true,
        explanation: 'Parallel resistors share the same voltage; the total is always less than the smallest branch.',
      });
    }
    return R;
  };
  const RT = reduce(net);
  sol.finals.push({ symbolLatex: 'R_T', name: 'Total resistance', valueSI: RT, quantity: 'resistance' });

  let I: number | undefined;
  let V: number | undefined;
  if (inp.V !== undefined) {
    V = inp.V;
    I = V / RT;
    k++;
    sol.steps.push({ title: `Step ${k} — Supply current (Ohm's law)`, formulaId: 'ohm', formulaLatex: 'V = IR', rearrangedLatex: 'I = \\frac{V}{R_T}', substitutionLatex: `I = \\frac{${f(V)}\\ \\text{V}}{${f(RT)}\\ \\Omega}`, resultLatex: `I = ${f(I)}\\ \\text{A}`, unitCheckLatex: '\\frac{\\text{V}}{\\Omega} = \\text{A}\\ \\checkmark', unitCheckOk: true });
    sol.find.push({ symbolLatex: 'I', name: 'Supply current' });
  } else if (inp.I !== undefined) {
    I = inp.I;
    V = I * RT;
    k++;
    sol.steps.push({ title: `Step ${k} — Supply voltage (Ohm's law)`, formulaId: 'ohm', formulaLatex: 'V = IR', substitutionLatex: `V = ${f(I)}\\ \\text{A} \\times ${f(RT)}\\ \\Omega`, resultLatex: `V = ${f(V)}\\ \\text{V}`, unitCheckLatex: '\\text{A} \\times \\Omega = \\text{V}\\ \\checkmark', unitCheckOk: true });
  }
  if (I !== undefined && V !== undefined) {
    const P = V * I;
    k++;
    sol.steps.push({ title: `Step ${k} — Total power`, formulaId: 'powerVI', formulaLatex: 'P = VI', substitutionLatex: `P = ${f(V)}\\ \\text{V} \\times ${f(I)}\\ \\text{A}`, resultLatex: `P = ${f(P)}\\ \\text{W}`, unitCheckLatex: '\\text{V} \\times \\text{A} = \\text{W}\\ \\checkmark', unitCheckOk: true });
    const each: ResistorResult[] = [];
    distribute(net, I, each);
    k++;
    sol.steps.push({
      title: `Step ${k} — Voltage, current and power for each resistor`,
      formulaLatex: 'V = IR,\\quad P = I^2R',
      workingLatex: each.map((r) => `${r.name}:\\ I = ${f(r.I)}\\ \\text{A},\\ V = ${f(r.I)} \\times ${f(r.R)} = ${f(r.V)}\\ \\text{V},\\ P = ${f(r.I)}^2 \\times ${f(r.R)} = ${f(r.P)}\\ \\text{W}`),
      resultLatex: `\\Sigma P = ${f(each.reduce((a, r) => a + r.P, 0))}\\ \\text{W} = P_{total}\\ \\checkmark`,
      explanation: 'In series the current is common and voltages divide in proportion to resistance; in parallel the voltage is common and currents divide inversely with resistance.',
    });
    sol.tables = [{ title: 'Individual resistors', headers: ['Resistor', 'R (Ω)', 'I (A)', 'V (V)', 'P (W)'], rows: each.map((r) => [r.name, f(r.R), f(r.I), f(r.V), f(r.P)]) }];
    sol.finals.push({ symbolLatex: 'I', name: 'Supply current', valueSI: I, quantity: 'current' });
    if (inp.I !== undefined) sol.finals.push({ symbolLatex: 'V', name: 'Supply voltage', valueSI: V, quantity: 'voltage' });
    sol.finals.push({ symbolLatex: 'P', name: 'Total power', valueSI: P, quantity: 'power' });
  }
  sol.explanation.push('Reduce the network step by step (innermost groups first), then use Ohm’s law and P = VI.');
  sol.ok = true;
  return sol;
}

/** Parse a resistance with unit, e.g. "4.7 kΩ" → 4700. */
export function parseResistance(txt: string): number {
  const m = /^\s*([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?\d+)?)\s*(.*)$/.exec(txt);
  if (!m) return NaN;
  const u = m[2].trim() || 'Ω';
  return parseFloat(m[1]) * parseUnit(u).factor;
}
