/**
 * Pin-jointed plane truss solver (method of joints). Assembles ΣFx = 0 and ΣFy = 0 at
 * every joint and solves the linear system exactly, then presents HSC-style working:
 * reactions from whole-truss equilibrium, followed by joint-by-joint equilibrium in an
 * order where each joint has at most two unknown members.
 * Tension positive, compression negative.
 */
import { fmtLatex } from '../format';
import { emptySolution, Solution } from '../solution';

export interface TrussNode {
  id: string;
  x: number;
  y: number;
}
export interface TrussMember {
  id: string;
  a: string;
  b: string;
  area?: number; // m² (optional → stress)
}
export type SupportType = 'pin' | 'roller-y' | 'roller-x';
export interface TrussSupport {
  node: string;
  type: SupportType; // roller-y: vertical reaction only (roller on horizontal surface)
}
export interface TrussLoad {
  node: string;
  Fx: number; // N (+ right)
  Fy: number; // N (+ up) — gravity loads are negative
}
export interface TrussInput {
  nodes: TrussNode[];
  members: TrussMember[];
  supports: TrussSupport[];
  loads: TrussLoad[];
}

export interface TrussResult {
  forces: Record<string, number>;
  reactions: { node: string; dir: 'x' | 'y'; value: number }[];
}

export class TrussError extends Error {}

/** Gaussian elimination with partial pivoting. Returns null when singular. */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-10) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f === 0) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export function analyseTruss(inp: TrussInput): TrussResult {
  const idx = new Map(inp.nodes.map((nd, i) => [nd.id, i]));
  for (const m of inp.members) {
    if (!idx.has(m.a) || !idx.has(m.b)) throw new TrussError(`Member ${m.id} refers to an unknown joint.`);
    if (m.a === m.b) throw new TrussError(`Member ${m.id} connects a joint to itself.`);
  }
  const unknowns: { kind: 'member' | 'reaction'; id: string; node?: string; dir?: 'x' | 'y' }[] = [];
  inp.members.forEach((m) => unknowns.push({ kind: 'member', id: m.id }));
  for (const s of inp.supports) {
    if (!idx.has(s.node)) throw new TrussError(`Support at unknown joint ${s.node}.`);
    if (s.type === 'pin' || s.type === 'roller-x') unknowns.push({ kind: 'reaction', id: `${s.node}x`, node: s.node, dir: 'x' });
    if (s.type === 'pin' || s.type === 'roller-y') unknowns.push({ kind: 'reaction', id: `${s.node}y`, node: s.node, dir: 'y' });
  }
  const nEq = 2 * inp.nodes.length;
  if (unknowns.length !== nEq) {
    throw new TrussError(
      unknowns.length < nEq
        ? `Unstable truss: ${inp.members.length} members + ${unknowns.length - inp.members.length} reactions = ${unknowns.length} < 2 × ${inp.nodes.length} joints = ${nEq}. Add members or supports.`
        : `Statically indeterminate: ${unknowns.length} unknowns > ${nEq} equations (m + r > 2j). Method of joints alone cannot solve it.`,
    );
  }
  const A = Array.from({ length: nEq }, () => new Array(unknowns.length).fill(0));
  const b = new Array(nEq).fill(0);
  unknowns.forEach((u, j) => {
    if (u.kind === 'member') {
      const m = inp.members.find((mm) => mm.id === u.id)!;
      const na = inp.nodes[idx.get(m.a)!];
      const nb = inp.nodes[idx.get(m.b)!];
      const L = Math.hypot(nb.x - na.x, nb.y - na.y);
      if (L < 1e-12) throw new TrussError(`Member ${m.id} has zero length.`);
      const cx = (nb.x - na.x) / L;
      const cy = (nb.y - na.y) / L;
      // tension pulls joint a towards b
      A[2 * idx.get(m.a)!][j] += cx;
      A[2 * idx.get(m.a)! + 1][j] += cy;
      A[2 * idx.get(m.b)!][j] -= cx;
      A[2 * idx.get(m.b)! + 1][j] -= cy;
    } else {
      const i = idx.get(u.node!)!;
      A[2 * i + (u.dir === 'x' ? 0 : 1)][j] += 1;
    }
  });
  for (const l of inp.loads) {
    const i = idx.get(l.node);
    if (i === undefined) throw new TrussError(`Load at unknown joint ${l.node}.`);
    b[2 * i] -= l.Fx;
    b[2 * i + 1] -= l.Fy;
  }
  const x = solveLinear(A, b);
  if (!x) throw new TrussError('The truss is a mechanism (geometrically unstable) — the equilibrium equations are singular. Check joint positions, members and supports.');
  const forces: Record<string, number> = {};
  const reactions: TrussResult['reactions'] = [];
  unknowns.forEach((u, j) => {
    const val = Math.abs(x[j]) < 1e-9 ? 0 : x[j];
    if (u.kind === 'member') forces[u.id] = val;
    else reactions.push({ node: u.node!, dir: u.dir!, value: val });
  });
  return { forces, reactions };
}

const n = (x: number) => fmtLatex(x, 4);

export function trussSolution(inp: TrussInput): Solution {
  const sol = emptySolution('Pin-jointed truss — method of joints');
  sol.module = 'civil';
  sol.topic = 'Truss analysis';
  let res: TrussResult;
  try {
    res = analyseTruss(inp);
  } catch (e) {
    sol.issues.push({ level: 'error', message: (e as Error).message });
    return sol;
  }
  const kN = inp.loads.some((l) => Math.abs(l.Fx) >= 1000 || Math.abs(l.Fy) >= 1000);
  const sc = kN ? 1e-3 : 1;
  const FU = kN ? '\\text{kN}' : '\\text{N}';
  const f = (v: number) => n(v * sc);
  const node = (id: string) => inp.nodes.find((nd) => nd.id === id)!;
  sol.diagram = { kind: 'truss', input: inp, result: res };
  sol.given.push({ symbolLatex: 'j, m, r', name: 'Joints, members, reactions', raw: `${inp.nodes.length}, ${inp.members.length}, ${res.reactions.length}`, valueSI: 0, quantity: 'count', unit: '' });
  inp.loads.forEach((l) => sol.given.push({ symbolLatex: `F_{${l.node}}`, name: `Load at joint ${l.node}`, raw: `(${f(l.Fx)}, ${f(l.Fy)}) ${kN ? 'kN' : 'N'}`, valueSI: Math.hypot(l.Fx, l.Fy), quantity: 'force', unit: 'N' }));
  sol.find.push({ symbolLatex: 'R', name: 'Support reactions' }, { symbolLatex: 'F_{member}', name: 'Member forces (tension/compression)' });
  sol.steps.push({
    title: 'Step 1 — Check the truss is statically determinate',
    formulaLatex: 'm + r = 2j',
    resultLatex: `${inp.members.length} + ${res.reactions.length} = 2 \\times ${inp.nodes.length} = ${2 * inp.nodes.length}\\ \\checkmark`,
    explanation: 'A pin-jointed truss can be solved by the method of joints when members + reactions = 2 × joints.',
  });

  // Reactions from global equilibrium (moments about a pinned support)
  const pin = inp.supports.find((s) => s.type === 'pin');
  const lines: string[] = [];
  if (pin) {
    const p = node(pin.node);
    const others = res.reactions.filter((r) => r.node !== pin.node);
    const loadTerms = inp.loads
      .map((l) => {
        const nd = node(l.node);
        const parts: string[] = [];
        if (l.Fy) parts.push(`(${f(l.Fy)}) \\times ${n(nd.x - p.x)}`);
        if (l.Fx) parts.push(`-(${f(l.Fx)}) \\times ${n(nd.y - p.y)}`);
        return parts.join(' ');
      })
      .filter(Boolean);
    const rTerms = others.map((r) => {
      const nd = node(r.node);
      return r.dir === 'y' ? `R_{${r.node}y} \\times ${n(nd.x - p.x)}` : `-R_{${r.node}x} \\times ${n(nd.y - p.y)}`;
    });
    lines.push(`\\Sigma M_{${pin.node}} = 0 \\;(\\circlearrowleft +):\\quad ${[...rTerms, ...loadTerms].join(' + ').replace(/\+ -/g, '- ')} = 0`);
    others.forEach((r) => lines.push(`R_{${r.node}${r.dir}} = ${f(r.value)}\\ ${FU}`));
    const sumFx = inp.loads.reduce((s, l) => s + l.Fx, 0);
    const sumFy = inp.loads.reduce((s, l) => s + l.Fy, 0);
    lines.push(`\\Sigma F_x = 0:\\quad R_{${pin.node}x} = ${f(-sumFx - others.filter((r) => r.dir === 'x').reduce((s, r) => s + r.value, 0))}\\ ${FU}`);
    lines.push(`\\Sigma F_y = 0:\\quad R_{${pin.node}y} = ${f(-sumFy - others.filter((r) => r.dir === 'y').reduce((s, r) => s + r.value, 0))}\\ ${FU}`);
  }
  sol.steps.push({
    title: 'Step 2 — Support reactions (whole truss in equilibrium)',
    formulaLatex: '\\Sigma M = 0,\\quad \\Sigma F_x = 0,\\quad \\Sigma F_y = 0',
    workingLatex: lines.length ? lines : res.reactions.map((r) => `R_{${r.node}${r.dir}} = ${f(r.value)}\\ ${FU}`),
    resultLatex: res.reactions.map((r) => `R_{${r.node}${r.dir}} = ${f(r.value)}\\ ${FU}`).join(',\\quad '),
    explanation: 'Treat the whole truss as a rigid body. Taking moments about the pinned support eliminates its two reaction components.',
  });

  // Joint-by-joint working in a solvable order
  const solved = new Set<string>();
  const order: string[] = [];
  const membersAt = (id: string) => inp.members.filter((m) => m.a === id || m.b === id);
  let guard = 0;
  while (order.length < inp.nodes.length && guard++ < 200) {
    const next = inp.nodes.find((nd) => !order.includes(nd.id) && membersAt(nd.id).filter((m) => !solved.has(m.id)).length <= 2 && membersAt(nd.id).some((m) => !solved.has(m.id)));
    if (!next) break;
    order.push(next.id);
    membersAt(next.id).forEach((m) => solved.add(m.id));
  }
  const jointLines: string[] = [];
  const known = new Set<string>();
  for (const id of order) {
    const nd = node(id);
    const ms = membersAt(id);
    const xs: string[] = [];
    const ys: string[] = [];
    for (const m of ms) {
      const other = node(m.a === id ? m.b : m.a);
      const L = Math.hypot(other.x - nd.x, other.y - nd.y);
      const cx = (other.x - nd.x) / L;
      const cy = (other.y - nd.y) / L;
      const sym = known.has(m.id) ? `(${f(res.forces[m.id])})` : `F_{${m.id}}`;
      if (Math.abs(cx) > 1e-9) xs.push(`${sym}(${n(cx)})`);
      if (Math.abs(cy) > 1e-9) ys.push(`${sym}(${n(cy)})`);
    }
    res.reactions.filter((r) => r.node === id).forEach((r) => (r.dir === 'x' ? xs : ys).push(`${f(r.value)}`));
    inp.loads.filter((l) => l.node === id).forEach((l) => {
      if (l.Fx) xs.push(`(${f(l.Fx)})`);
      if (l.Fy) ys.push(`(${f(l.Fy)})`);
    });
    const newly = ms.filter((m) => !known.has(m.id));
    jointLines.push(`\\textbf{Joint ${id}:}`);
    if (xs.length) jointLines.push(`\\Sigma F_x = 0:\\ ${xs.join(' + ')} = 0`);
    if (ys.length) jointLines.push(`\\Sigma F_y = 0:\\ ${ys.join(' + ')} = 0`);
    if (newly.length) jointLines.push(newly.map((m) => `F_{${m.id}} = ${f(res.forces[m.id])}\\ ${FU}`).join(',\\quad '));
    newly.forEach((m) => known.add(m.id));
  }
  sol.steps.push({
    title: 'Step 3 — Method of joints (tension assumed positive, pulling away from each joint)',
    formulaLatex: '\\text{At each joint: } \\Sigma F_x = 0,\\ \\Sigma F_y = 0 \\quad (\\text{direction cosines } \\tfrac{\\Delta x}{L}, \\tfrac{\\Delta y}{L})',
    workingLatex: jointLines,
    resultLatex: '',
    explanation: 'Start at a joint with no more than two unknown members. Assume every member is in tension; a negative answer means compression.',
  });

  const rows: string[][] = [];
  for (const m of inp.members) {
    const F = res.forces[m.id];
    const state = Math.abs(F) < 1e-9 ? 'Zero-force member' : F > 0 ? 'Tension (tie)' : 'Compression (strut)';
    const row = [m.id, `${m.a}–${m.b}`, `${n(Math.abs(F) * sc)}`, state];
    if (m.area) row.push(`${n(Math.abs(F) / m.area / 1e6)}`);
    rows.push(row);
    sol.finals.push({ symbolLatex: `F_{${m.id}}`, name: `Member ${m.id} (${m.a}–${m.b})`, valueSI: Math.abs(F), quantity: 'force', suffix: state });
  }
  const hasArea = inp.members.some((m) => m.area);
  sol.tables = [{ title: `Member forces (${kN ? 'kN' : 'N'})`, headers: ['Member', 'Joints', `|F| (${kN ? 'kN' : 'N'})`, 'Nature', ...(hasArea ? ['σ (MPa)'] : [])], rows }];
  res.reactions.forEach((r) => sol.finals.push({ symbolLatex: `R_{${r.node}${r.dir}}`, name: `Reaction at ${r.node} (${r.dir === 'x' ? 'horizontal' : 'vertical'})`, valueSI: r.value, quantity: 'force' }));
  if (hasArea) {
    const stressLines = inp.members
      .filter((m) => m.area)
      .map((m) => `\\sigma_{${m.id}} = \\frac{F}{A} = \\frac{${fmtLatex(Math.abs(res.forces[m.id]), 4)}\\ \\text{N}}{${fmtLatex(m.area!, 4)}\\ \\text{m}^2} = ${fmtLatex(Math.abs(res.forces[m.id]) / m.area! / 1e6, 4)}\\ \\text{MPa}`);
    sol.steps.push({ title: 'Step 4 — Member stresses', formulaLatex: '\\sigma = \\frac{F}{A}', workingLatex: stressLines, resultLatex: '' });
  }
  sol.explanation.push('Positive member force = tension (member pulls on joints); negative = compression (member pushes on joints).');
  sol.ok = true;
  return sol;
}
