/**
 * Beam analyser: simply supported beams (with optional overhangs) and cantilevers under
 * point loads, UDLs and applied couples. Computes support reactions (ΣM = 0, ΣFy = 0),
 * shear force and bending moment diagrams, maximum bending moment and, optionally,
 * bending stress σ = My/I.
 *
 * Sign conventions: downward loads positive; applied couples clockwise positive;
 * shear force positive when the left part tends to move up; sagging BM positive.
 */
import { fmtLatex } from '../format';
import { emptySolution, Solution, Step } from '../solution';

export type BeamType = 'simply' | 'cantilever-left' | 'cantilever-right';

export interface PointLoad {
  x: number; // m
  P: number; // N, downward positive
  label?: string;
}
export interface UDL {
  x1: number;
  x2: number;
  w: number; // N/m downward
}
export interface Couple {
  x: number;
  M: number; // N·m clockwise positive
}

export interface BeamInput {
  type: BeamType;
  length: number;
  /** support positions for simply supported beams */
  a?: number;
  b?: number;
  points: PointLoad[];
  udls: UDL[];
  couples: Couple[];
  I?: number; // m⁴
  y?: number; // m
}

export interface BeamPoint {
  x: number;
  V: number;
  M: number;
}

export interface BeamResult {
  reactions: { label: string; x: number; value: number }[];
  fixingMoment?: number; // cantilever wall moment (N·m, clockwise positive acting on beam)
  diagram: BeamPoint[];
  keyPoints: BeamPoint[];
  maxM: BeamPoint; // max |M|
  maxSag: BeamPoint;
  maxHog: BeamPoint;
  maxV: number;
}

const EPS = 1e-9;

interface Forces {
  ups: { x: number; F: number }[]; // upward reactions
  couplesCW: { x: number; M: number }[]; // includes reaction couple
}

function shearAt(inp: BeamInput, f: Forces, x: number, side: 'left' | 'right'): number {
  // sum of forces on the segment to the left of x (x- or x+)
  const incl = (p: number) => (side === 'right' ? p <= x + EPS : p < x - EPS);
  let V = 0;
  for (const r of f.ups) if (incl(r.x)) V += r.F;
  for (const p of inp.points) if (incl(p.x)) V -= p.P;
  for (const u of inp.udls) {
    const end = Math.min(u.x2, x);
    if (end > u.x1) V -= u.w * (end - u.x1);
  }
  return V;
}

function momentAt(inp: BeamInput, f: Forces, x: number, side: 'left' | 'right' = 'right'): number {
  const incl = (p: number) => (side === 'right' ? p <= x + EPS : p < x - EPS);
  let M = 0;
  for (const r of f.ups) if (incl(r.x)) M += r.F * (x - r.x);
  for (const p of inp.points) if (incl(p.x)) M -= p.P * (x - p.x);
  for (const u of inp.udls) {
    const end = Math.min(u.x2, x);
    if (end > u.x1) {
      const len = end - u.x1;
      M -= u.w * len * (x - (u.x1 + len / 2));
    }
  }
  for (const c of f.couplesCW) if (incl(c.x)) M += c.M;
  return M;
}

export function analyseBeam(inp: BeamInput): BeamResult {
  const L = inp.length;
  const totalP = inp.points.reduce((s, p) => s + p.P, 0);
  const totalW = inp.udls.reduce((s, u) => s + u.w * (u.x2 - u.x1), 0);
  const momentAbout = (xa: number) =>
    inp.points.reduce((s, p) => s + p.P * (p.x - xa), 0) + inp.udls.reduce((s, u) => s + u.w * (u.x2 - u.x1) * ((u.x1 + u.x2) / 2 - xa), 0) + inp.couples.reduce((s, c) => s + c.M, 0);

  const forces: Forces = { ups: [], couplesCW: [...inp.couples] };
  const reactions: BeamResult['reactions'] = [];
  let fixingMoment: number | undefined;
  if (inp.type === 'simply') {
    const a = inp.a ?? 0;
    const b = inp.b ?? L;
    const RB = momentAbout(a) / (b - a);
    const RA = totalP + totalW - RB;
    forces.ups.push({ x: a, F: RA }, { x: b, F: RB });
    reactions.push({ label: 'R_A', x: a, value: RA }, { label: 'R_B', x: b, value: RB });
  } else {
    const xf = inp.type === 'cantilever-left' ? 0 : L;
    const R = totalP + totalW;
    // clockwise moment of loads about the wall; the wall couple balances it
    const Mw = -momentAbout(xf);
    forces.ups.push({ x: xf, F: R });
    forces.couplesCW.push({ x: xf, M: Mw });
    reactions.push({ label: 'R', x: xf, value: R });
    fixingMoment = Mw;
  }

  // critical x positions
  const xs = new Set<number>([0, L]);
  forces.ups.forEach((r) => xs.add(r.x));
  inp.points.forEach((p) => xs.add(p.x));
  inp.udls.forEach((u) => {
    xs.add(u.x1);
    xs.add(u.x2);
  });
  inp.couples.forEach((c) => xs.add(c.x));
  const crit = [...xs].filter((x) => x >= -EPS && x <= L + EPS).sort((p, q) => p - q);

  // zero-shear points inside segments (where V changes sign continuously under a UDL)
  const extra: number[] = [];
  for (let i = 0; i < crit.length - 1; i++) {
    const x0 = crit[i];
    const x1 = crit[i + 1];
    const V0 = shearAt(inp, forces, x0, 'right');
    const V1 = shearAt(inp, forces, x1, 'left');
    if (V0 * V1 < 0) extra.push(x0 + (V0 / (V0 - V1)) * (x1 - x0));
  }

  const diagram: BeamPoint[] = [];
  const N = 400;
  const all = [...new Set([...crit, ...extra, ...Array.from({ length: N + 1 }, (_, i) => (i * L) / N)])].sort((p, q) => p - q);
  for (const x of all) {
    const Vl = shearAt(inp, forces, x, 'left');
    const Vr = shearAt(inp, forces, x, 'right');
    const Ml = momentAt(inp, forces, x, 'left');
    const Mr = momentAt(inp, forces, x, 'right');
    if (x > EPS) diagram.push({ x, V: Vl, M: Ml });
    if (Math.abs(Vl - Vr) > 1e-9 || Math.abs(Ml - Mr) > 1e-9 || x <= EPS) diagram.push({ x, V: x >= L - EPS ? Vl : Vr, M: x >= L - EPS ? Ml : Mr });
  }
  // end values: close diagram to zero at free ends for plotting
  const keyPoints = [...crit, ...extra].sort((p, q) => p - q).map((x) => ({ x, V: shearAt(inp, forces, x, 'right'), M: momentAt(inp, forces, x, 'right') }));
  // include left-side moments for couples
  const Ms = diagram;
  let maxM = Ms[0];
  let maxSag = Ms[0];
  let maxHog = Ms[0];
  let maxV = 0;
  for (const p of Ms) {
    if (Math.abs(p.M) > Math.abs(maxM.M) + 1e-9) maxM = p;
    if (p.M > maxSag.M) maxSag = p;
    if (p.M < maxHog.M) maxHog = p;
    maxV = Math.max(maxV, Math.abs(p.V));
  }
  return { reactions, fixingMoment, diagram, keyPoints, maxM, maxSag, maxHog, maxV };
}

/** Formatting helper: use kN and m when loads are ≥ 1 kN. */
function scaler(inp: BeamInput) {
  const maxLoad = Math.max(0, ...inp.points.map((p) => Math.abs(p.P)), ...inp.udls.map((u) => Math.abs(u.w)));
  const kN = maxLoad >= 1000;
  return {
    kN,
    F: (x: number) => `${fmtLatex(kN ? x / 1000 : x, 4)}`,
    Fu: kN ? '\\text{kN}' : '\\text{N}',
    Mu: kN ? '\\text{kN·m}' : '\\text{N·m}',
    wu: kN ? '\\text{kN/m}' : '\\text{N/m}',
  };
}
const n = (x: number) => fmtLatex(x, 4);

/** Build full HSC-style working for a beam. */
export function beamSolution(inp: BeamInput): Solution {
  const sol = emptySolution(inp.type === 'simply' ? 'Simply supported beam' : 'Cantilever beam');
  sol.module = 'civil';
  sol.topic = 'Beams — reactions, SF and BM';
  const L = inp.length;
  if (!(L > 0)) {
    sol.issues.push({ level: 'error', message: 'Beam length must be positive.' });
    return sol;
  }
  for (const p of inp.points) if (p.x < -EPS || p.x > L + EPS) sol.issues.push({ level: 'error', message: `Point load at x = ${p.x} m lies outside the beam (0 – ${L} m).` });
  for (const u of inp.udls) {
    if (u.x1 < -EPS || u.x2 > L + EPS || u.x2 <= u.x1) sol.issues.push({ level: 'error', message: `UDL from ${u.x1} m to ${u.x2} m is not within the beam or has zero length.` });
  }
  if (inp.type === 'simply') {
    const a = inp.a ?? 0;
    const b = inp.b ?? L;
    if (!(b > a) || a < -EPS || b > L + EPS) sol.issues.push({ level: 'error', message: 'Supports must be at distinct positions within the beam (A left of B).' });
  }
  if (!inp.points.length && !inp.udls.length && !inp.couples.length) sol.issues.push({ level: 'error', message: 'Add at least one load.' });
  if (sol.issues.some((i) => i.level === 'error')) return sol;

  const s = scaler(inp);
  const r = analyseBeam(inp);
  sol.diagram = { kind: 'beam', input: inp, result: r };

  sol.given.push({ symbolLatex: 'L', name: 'Beam length', raw: `${L} m`, valueSI: L, quantity: 'length', unit: 'm' });
  inp.points.forEach((p, i) => sol.given.push({ symbolLatex: `P_{${i + 1}}`, name: `Point load ${i + 1} at x = ${p.x} m`, raw: `${s.F(p.P)} ${s.kN ? 'kN' : 'N'}`, valueSI: p.P, quantity: 'force', unit: 'N' }));
  inp.udls.forEach((u, i) => sol.given.push({ symbolLatex: `w_{${i + 1}}`, name: `UDL ${i + 1} from ${u.x1} m to ${u.x2} m`, raw: `${s.F(u.w)} ${s.kN ? 'kN/m' : 'N/m'}`, valueSI: u.w, quantity: 'udl', unit: 'N/m' }));
  inp.couples.forEach((c, i) => sol.given.push({ symbolLatex: `C_{${i + 1}}`, name: `Applied couple at x = ${c.x} m (clockwise +)`, raw: `${s.F(c.M)} ${s.kN ? 'kN·m' : 'N·m'}`, valueSI: c.M, quantity: 'moment', unit: 'N·m' }));
  sol.find.push({ symbolLatex: 'R', name: 'Support reactions' }, { symbolLatex: 'M_{max}', name: 'Maximum bending moment' });
  if (s.kN) sol.conversions.push('\\text{Working in kN and m (so moments are in kN·m); all internal arithmetic is in N and m.}');

  // UDL equivalents
  const udlLines = inp.udls.map((u, i) => {
    const W = u.w * (u.x2 - u.x1);
    return `W_{${i + 1}} = w_{${i + 1}} \\times \\ell = ${s.F(u.w)} \\times ${n(u.x2 - u.x1)} = ${s.F(W)}\\ ${s.Fu}\\ \\text{acting at } x = ${n((u.x1 + u.x2) / 2)}\\ \\text{m}`;
  });
  if (udlLines.length) {
    sol.steps.push({ title: 'Replace each UDL by its resultant (for reactions only)', formulaLatex: 'W = w\\ell \\text{ acting at the centre of the UDL}', resultLatex: '', workingLatex: udlLines });
  }

  if (inp.type === 'simply') {
    const a = inp.a ?? 0;
    const b = inp.b ?? L;
    const terms: string[] = [];
    inp.points.forEach((p) => terms.push(`${s.F(p.P)} \\times ${n(p.x - a)}`));
    inp.udls.forEach((u) => terms.push(`${s.F(u.w * (u.x2 - u.x1))} \\times ${n((u.x1 + u.x2) / 2 - a)}`));
    inp.couples.forEach((c) => terms.push(`${c.M >= 0 ? '' : '-'}${s.F(Math.abs(c.M))}`));
    const RB = r.reactions[1].value;
    const RA = r.reactions[0].value;
    sol.steps.push({
      title: 'Step 1 — Take moments about support A (ΣM_A = 0, clockwise positive)',
      formulaLatex: '\\Sigma M_A = 0',
      workingLatex: [
        `R_B \\times ${n(b - a)} = ${terms.join(' + ').replace(/\+ -/g, '- ')}`,
        `R_B = \\frac{${fmtLatex((s.kN ? 1e-3 : 1) * RB * (b - a), 5)}}{${n(b - a)}}`,
      ],
      resultLatex: `R_B = ${s.F(RB)}\\ ${s.Fu}\\ ${RB >= 0 ? '(\\uparrow)' : '(\\downarrow)'}`,
      explanation: 'For equilibrium the sum of moments about any point is zero. Taking moments about A eliminates R_A.',
    });
    const loadsList = [...inp.points.map((p) => s.F(p.P)), ...inp.udls.map((u) => s.F(u.w * (u.x2 - u.x1)))];
    sol.steps.push({
      title: 'Step 2 — Resolve vertically (ΣFy = 0)',
      formulaLatex: '\\Sigma F_y = 0 \\Rightarrow R_A + R_B = \\Sigma(\\text{loads})',
      workingLatex: [`R_A = ${loadsList.join(' + ')} - ${s.F(RB)}`],
      resultLatex: `R_A = ${s.F(RA)}\\ ${s.Fu}\\ ${RA >= 0 ? '(\\uparrow)' : '(\\downarrow)'}`,
      explanation: 'Upward reactions balance the total downward load.',
    });
    if (RA < 0 || RB < 0) sol.issues.push({ level: 'warning', message: 'A reaction is negative — that support must hold the beam down (e.g. an overhang loaded heavily).' });
  } else {
    const xf = inp.type === 'cantilever-left' ? 0 : L;
    const R = r.reactions[0].value;
    sol.steps.push({
      title: 'Step 1 — Vertical reaction at the fixed support (ΣFy = 0)',
      formulaLatex: 'R = \\Sigma(\\text{loads})',
      workingLatex: [`R = ${[...inp.points.map((p) => s.F(p.P)), ...inp.udls.map((u) => s.F(u.w * (u.x2 - u.x1)))].join(' + ')}`],
      resultLatex: `R = ${s.F(R)}\\ ${s.Fu}\\ (\\uparrow)`,
    });
    const terms = [...inp.points.map((p) => `${s.F(p.P)} \\times ${n(Math.abs(p.x - xf))}`), ...inp.udls.map((u) => `${s.F(u.w * (u.x2 - u.x1))} \\times ${n(Math.abs((u.x1 + u.x2) / 2 - xf))}`)];
    sol.steps.push({
      title: 'Step 2 — Fixing moment at the wall (ΣM = 0 about the fixed end)',
      formulaLatex: 'M_{wall} = \\Sigma(F \\times d)',
      workingLatex: [`M_{wall} = ${terms.join(' + ') || '0'}`],
      resultLatex: `|M_{wall}| = ${s.F(Math.abs(r.fixingMoment ?? 0))}\\ ${s.Mu}\\ \\text{(hogging)}`,
      explanation: 'The wall must supply a moment equal and opposite to the moment of the loads about it. For a cantilever the maximum bending moment occurs at the fixed end.',
    });
  }

  // SF & BM at key points
  const tableRows: string[][] = [];
  const bmLines: string[] = [];
  const scaleF = s.kN ? 1e-3 : 1;
  for (const kp of r.keyPoints) {
    const Vl = r.diagram.filter((d) => Math.abs(d.x - kp.x) < 1e-9)[0]?.V ?? kp.V;
    tableRows.push([n(kp.x), fmtLatex(Vl * scaleF, 4), fmtLatex(kp.V * scaleF, 4), fmtLatex(kp.M * scaleF, 4)]);
  }
  // BM working lines for the key points (moments of forces to the left)
  for (const kp of r.keyPoints) {
    if (kp.x <= EPS) continue;
    const parts: string[] = [];
    r.reactions.forEach((re) => {
      if (re.x < kp.x - EPS) parts.push(`${re.label} \\times ${n(kp.x - re.x)}`);
    });
    inp.points.forEach((p, i) => {
      if (p.x < kp.x - EPS) parts.push(`- P_{${i + 1}} \\times ${n(kp.x - p.x)}`);
    });
    inp.udls.forEach((u, i) => {
      const end = Math.min(u.x2, kp.x);
      if (end > u.x1 + EPS) parts.push(`- w_{${i + 1}} \\times ${n(end - u.x1)} \\times ${n(kp.x - (u.x1 + end) / 2)}`);
    });
    if (r.fixingMoment !== undefined && inp.type === 'cantilever-left' && kp.x > EPS) parts.push(`- M_{wall}`);
    if (!parts.length) continue;
    bmLines.push(`M_{x=${n(kp.x)}} = ${parts.join(' ').replace(/^- /, '-').replace(/ - /g, ' - ')} = ${fmtLatex(kp.M * scaleF, 4)}\\ ${s.Mu}`);
  }
  sol.tables = [{ title: `Shear force and bending moment at key points (${s.kN ? 'kN, kN·m' : 'N, N·m'})`, headers: ['x (m)', 'V just left', 'V just right', 'M'], rows: tableRows }];
  sol.steps.push({
    title: 'Step 3 — Shear force and bending moment at key points',
    formulaLatex: 'M_x = \\Sigma(\\text{moments of forces to the left of } x) \\quad (\\text{sagging } +)',
    workingLatex: bmLines,
    resultLatex: '',
    explanation: 'SF at a section = sum of vertical forces to the left. BM at a section = sum of moments of forces to the left about the section. Maximum BM occurs where the SF changes sign (passes through zero).',
  });

  const maxStep: Step = {
    title: 'Step 4 — Maximum bending moment',
    formulaLatex: 'M_{max} \\text{ occurs where } V = 0 \\text{ (or at the fixed end of a cantilever)}',
    resultLatex: `M_{max} = ${fmtLatex(r.maxM.M * scaleF, 4)}\\ ${s.Mu} \\text{ at } x = ${n(r.maxM.x)}\\ \\text{m}\\ (${r.maxM.M >= 0 ? '\\text{sagging}' : '\\text{hogging}'})`,
    resultSI: r.maxM.M,
    quantity: 'moment',
    symbolLatex: 'M_{max}',
    name: 'Maximum bending moment',
  };
  sol.steps.push(maxStep);

  r.reactions.forEach((re) => sol.finals.push({ symbolLatex: re.label, name: `Reaction at x = ${n(re.x)} m`, valueSI: re.value, quantity: 'force', suffix: re.value >= 0 ? '↑' : '↓' }));
  if (r.fixingMoment !== undefined) sol.finals.push({ symbolLatex: 'M_{wall}', name: 'Fixing moment at wall', valueSI: Math.abs(r.fixingMoment), quantity: 'moment' });
  sol.finals.push({ symbolLatex: 'M_{max}', name: `Maximum bending moment (at x = ${n(r.maxM.x)} m)`, valueSI: Math.abs(r.maxM.M), quantity: 'moment', suffix: r.maxM.M >= 0 ? 'sagging' : 'hogging' });
  sol.finals.push({ symbolLatex: 'V_{max}', name: 'Maximum shear force', valueSI: r.maxV, quantity: 'force' });

  if (inp.I && inp.y) {
    const sigma = (Math.abs(r.maxM.M) * inp.y) / inp.I;
    sol.steps.push({
      title: 'Step 5 — Maximum bending stress',
      formulaId: 'bending',
      formulaLatex: '\\sigma = \\frac{My}{I}',
      substitutionLatex: `\\sigma = \\frac{${fmtLatex(Math.abs(r.maxM.M), 4)}\\ \\text{N·m} \\times ${fmtLatex(inp.y, 4)}\\ \\text{m}}{${fmtLatex(inp.I, 4)}\\ \\text{m}^4}`,
      resultLatex: `\\sigma = ${fmtLatex(sigma, 4)}\\ \\text{Pa}`,
      unitCheckLatex: '\\frac{\\text{N·m} \\times \\text{m}}{\\text{m}^4} = \\frac{\\text{N}}{\\text{m}^2} = \\text{Pa}\\ \\checkmark',
      unitCheckOk: true,
      resultSI: sigma,
      quantity: 'stress',
      symbolLatex: '\\sigma_{max}',
      explanation: 'Bending stress is greatest at the extreme fibres (furthest from the neutral axis). For sagging, the top is in compression and the bottom in tension.',
    });
    sol.finals.push({ symbolLatex: '\\sigma_{max}', name: 'Maximum bending stress', valueSI: sigma, quantity: 'stress' });
  }
  sol.explanation.push('Reactions from ΣM = 0 and ΣFy = 0; SF/BM diagrams drawn from the left; the maximum bending moment is at the point of zero shear.');
  sol.ok = true;
  return sol;
}
