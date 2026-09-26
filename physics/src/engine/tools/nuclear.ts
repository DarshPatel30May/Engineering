/**
 * Nuclear tools (Module 8): mass defect & binding energy, reaction energy (Q value) from
 * reactant and product masses, and balancing nuclear equations (conservation of mass number
 * and charge/atomic number).
 *
 * Masses may be given in u or kg. With u, E = Δm × 931.5 MeV (data sheet); with kg,
 * E = Δmc² (c = 3.00 × 10⁸ m s⁻¹). Both routes are shown so students can match the question.
 */
import { NESA } from '../constants';
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { B, err, final, given, L, LU, mkStep, newSolution, Qty, rawOf, si, trackSF } from './common';

export const ELEMENTS = [
  'n', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th', 'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og',
];
/** index = atomic number (0 used for the neutron) */
export function symbolFor(Z: number): string {
  return Z >= 0 && Z < ELEMENTS.length ? ELEMENTS[Z] : '?';
}
export function zFor(sym: string): number | undefined {
  const i = ELEMENTS.indexOf(sym);
  return i >= 1 ? i : undefined;
}

const MEV = 1e6 * NESA.eV.value;
const U = NESA.u.value;
const C = NESA.c.value;

// ───────────────────────── mass defect / binding energy ─────────────────────────

export interface BindingInput {
  Z: number;
  A: number;
  /** mass of the nucleus (or atom if `atomic`) */
  mass: Qty;
  atomic?: boolean;
  /** masses of proton/neutron/electron — default data sheet values */
  mp?: Qty;
  mn?: Qty;
}

export function solveBinding(inp: BindingInput, sf = 4): Solution {
  const sol = newSolution('Mass defect and binding energy', 'm8', 'nuclear');
  const { Z, A } = inp;
  if (!(Number.isInteger(Z) && Number.isInteger(A)) || Z < 1 || A < Z) return err(sol, 'Z and A must be whole numbers with A ≥ Z ≥ 1.');
  const N = A - Z;
  const inU = inp.mass.unit === 'u';
  const m = si(inp.mass, 'mass', 'Mass of the nucleus', sol.issues);
  if (m === undefined) return sol;
  const mp = si(inp.mp, 'mass', 'Proton mass', sol.issues) ?? NESA.mp.value;
  const mn = si(inp.mn, 'mass', 'Neutron mass', sol.issues) ?? NESA.mn.value;
  const me = NESA.me.value;
  const sym = symbolFor(Z);
  trackSF(sol, inp.mass);
  given(sol, `m_{${sym}}`, inp.atomic ? `Atomic mass of ${A}${sym}` : `Mass of the ${A}${sym} nucleus`, rawOf(inp.mass), m, 'atomicMass', inp.mass.unit);
  given(sol, 'm_p', 'Proton mass', inp.mp ? rawOf(inp.mp) : '1.673 × 10⁻²⁷ kg', mp, 'mass', 'kg', !inp.mp, inp.mp ? undefined : 'NESA data sheet');
  given(sol, 'm_n', 'Neutron mass', inp.mn ? rawOf(inp.mn) : '1.675 × 10⁻²⁷ kg', mn, 'mass', 'kg', !inp.mn, inp.mn ? undefined : 'NESA data sheet');
  sol.find.push({ symbolLatex: '\\Delta m,\\ E_B,\\ E_B/A', name: 'Mass defect, binding energy, binding energy per nucleon' });
  sol.steps.push(mkStep('Step 1 — Count the nucleons', 'N = A - Z', { lines: [`Z = ${Z}\\ \\text{protons},\\quad N = ${A} - ${Z} = ${N}\\ \\text{neutrons}`], resultLatex: `Z = ${Z},\\ N = ${N}` }));
  const nucMass = inp.atomic ? m - Z * me : m;
  if (inp.atomic) {
    sol.steps.push(mkStep('Step 2 — Remove the electrons from the atomic mass', 'm_{nucleus} = m_{atom} - Zm_e', { substitutionLatex: `m_{nucleus} = ${fmtLatex(m, 6)} - ${Z} \\times ${fmtLatex(me, 4)}`, resultLatex: `m_{nucleus} = ${L(nucMass, 'mass', 6)}` }));
  }
  const sumParts = Z * mp + N * mn;
  const dm = sumParts - nucMass;
  const n = inp.atomic ? 3 : 2;
  sol.steps.push(mkStep(`Step ${n} — Mass defect`, '\\Delta m = Zm_p + Nm_n - m_{nucleus}', {
    substitutionLatex: `\\Delta m = ${Z} \\times ${fmtLatex(mp, 4)} + ${N} \\times ${fmtLatex(mn, 4)} - ${fmtLatex(nucMass, 6)}`,
    resultLatex: `\\Delta m = ${L(dm, 'mass', sf)} = ${fmtLatex(dm / U, sf)}\\ \\text{u}`,
    explanation: 'The nucleus has less mass than its separate nucleons: the missing mass is the binding energy (E = mc²).',
  }));
  if (dm <= 0) return err(sol, 'The mass defect is not positive — the nucleus would be unbound. Check that the nuclear (not atomic) mass was entered, or tick "atomic mass".');
  const E = dm * C * C;
  sol.steps.push(mkStep(`Step ${n + 1} — Binding energy`, 'E_B = \\Delta mc^2', {
    substitutionLatex: `E_B = ${fmtLatex(dm, 4)} \\times ${B(fmtLatex(C, 3))}^2`,
    resultLatex: `E_B = ${L(E, 'energy', sf)} = ${LU(E, 'MeV', sf)}`,
    note: inU ? `alternatively Δm (u) × 931.5 MeV = ${fmtLatex((dm / U) * 931.5, sf)} MeV (small differences come from rounded data-sheet constants)` : 'J → MeV: divide by 1.602 × 10⁻¹³ J/MeV',
  }));
  sol.steps.push(mkStep(`Step ${n + 2} — Binding energy per nucleon`, '\\frac{E_B}{A}', { substitutionLatex: `\\frac{E_B}{A} = \\frac{${fmtLatex(E / MEV, 4)}\\ \\text{MeV}}{${A}}`, resultLatex: `\\frac{E_B}{A} = ${fmtLatex(E / MEV / A, sf)}\\ \\text{MeV per nucleon}` }));
  final(sol, { symbolLatex: '\\Delta m', name: 'Mass defect', valueSI: dm, quantity: 'atomicMass', unit: inU ? 'u' : 'kg' });
  final(sol, { symbolLatex: 'E_B', name: 'Binding energy', valueSI: inU ? (dm / U) * 931.5 * MEV : E, quantity: 'energyNuclear' });
  final(sol, { symbolLatex: 'E_B/A', name: 'Binding energy per nucleon', valueSI: (inU ? (dm / U) * 931.5 * MEV : E) / A, quantity: 'energyNuclear' });
  sol.ok = true;
  return sol;
}

// ───────────────────────── reaction energy ─────────────────────────

export interface Species {
  label: string;
  mass: Qty;
  count?: number;
}

export interface ReactionInput {
  reactants: Species[];
  products: Species[];
}

export function solveReaction(inp: ReactionInput, sf = 4): Solution {
  const sol = newSolution('Energy released in a nuclear reaction', 'm8', 'nuclear');
  if (!inp.reactants.length || !inp.products.length) return err(sol, 'Enter at least one reactant and one product with their masses.');
  const all = [...inp.reactants, ...inp.products];
  const inU = all.every((s) => s.mass.unit === 'u');
  const sum = (list: Species[]) => {
    let t = 0;
    for (const s of list) {
      const m = si(s.mass, 'mass', s.label, sol.issues);
      if (m === undefined) return NaN;
      t += m * (s.count ?? 1);
      given(sol, `m_{\\text{${s.label}}}`, `Mass of ${s.label}${(s.count ?? 1) > 1 ? ` (×${s.count})` : ''}`, rawOf(s.mass), m, 'atomicMass', s.mass.unit);
    }
    return t;
  };
  const mR = sum(inp.reactants);
  const mP = sum(inp.products);
  trackSF(sol, ...all.map((s) => s.mass));
  if (!isFinite(mR) || !isFinite(mP)) return sol;
  sol.find.push({ symbolLatex: 'E', name: 'Energy released' });
  const term = (list: Species[]) => list.map((s) => `${(s.count ?? 1) > 1 ? `${s.count} \\times ` : ''}${inU ? fmtLatex(s.mass.value, 7) : fmtLatex(s.mass.value, 5)}`).join(' + ');
  const unitTxt = inU ? '\\ \\text{u}' : '\\ \\text{kg}';
  const conv = (x: number) => (inU ? x / U : x);
  sol.steps.push(mkStep('Step 1 — Total mass before and after', '\\Sigma m_{reactants},\\quad \\Sigma m_{products}', {
    lines: [`\\Sigma m_{reactants} = ${term(inp.reactants)} = ${fmtLatex(conv(mR), 7)}${unitTxt}`, `\\Sigma m_{products} = ${term(inp.products)} = ${fmtLatex(conv(mP), 7)}${unitTxt}`],
    resultLatex: `\\Sigma m_{reactants} = ${fmtLatex(conv(mR), 7)}${unitTxt}`,
  }));
  const dm = mR - mP;
  sol.steps.push(mkStep('Step 2 — Mass defect (mass converted to energy)', '\\Delta m = \\Sigma m_{reactants} - \\Sigma m_{products}', {
    substitutionLatex: `\\Delta m = ${fmtLatex(conv(mR), 7)} - ${fmtLatex(conv(mP), 7)}`,
    resultLatex: `\\Delta m = ${fmtLatex(conv(dm), sf)}${unitTxt}${inU ? ` = ${fmtLatex(dm, sf)}\\ \\text{kg}` : ''}`,
  }));
  const E = inU ? (dm / U) * 931.5 * MEV : dm * C * C;
  sol.steps.push(mkStep('Step 3 — Energy released', inU ? 'E = \\Delta m \\times 931.5\\ \\text{MeV/u}' : 'E = \\Delta mc^2', {
    substitutionLatex: inU ? `E = ${fmtLatex(dm / U, sf)} \\times 931.5` : `E = ${fmtLatex(dm, 4)} \\times ${B(fmtLatex(C, 3))}^2`,
    resultLatex: `E = ${LU(E, 'MeV', sf)} = ${L(E, 'energy', sf)}`,
    note: inU ? `using E = Δmc² with Δm = ${fmtLatex(dm, 4)} kg gives ${fmtLatex((dm * C * C) / MEV, sf)} MeV` : undefined,
  }));
  if (dm < 0) sol.issues.push({ level: 'warning', message: 'The products have MORE mass than the reactants: this reaction absorbs energy (it is endothermic) and does not happen spontaneously.' });
  final(sol, { symbolLatex: 'E', name: dm >= 0 ? 'Energy released' : 'Energy absorbed', valueSI: Math.abs(E), quantity: 'energyNuclear' });
  final(sol, { symbolLatex: '\\Delta m', name: 'Mass defect', valueSI: dm, quantity: 'atomicMass', unit: inU ? 'u' : 'kg' });
  sol.explanation.push('The mass lost appears as kinetic energy of the products (and gamma radiation).');
  sol.ok = true;
  return sol;
}

// ───────────────────────── nuclear equations ─────────────────────────

export interface Nuclide {
  A: number;
  Z: number;
  label: string;
}

const PARTICLE_NUCLIDES: Record<string, Nuclide> = {
  n: { A: 1, Z: 0, label: 'n' },
  neutron: { A: 1, Z: 0, label: 'n' },
  p: { A: 1, Z: 1, label: 'p' },
  proton: { A: 1, Z: 1, label: 'p' },
  alpha: { A: 4, Z: 2, label: 'α' },
  α: { A: 4, Z: 2, label: 'α' },
  'e-': { A: 0, Z: -1, label: 'e⁻' },
  beta: { A: 0, Z: -1, label: 'β⁻' },
  'β-': { A: 0, Z: -1, label: 'β⁻' },
  'β⁻': { A: 0, Z: -1, label: 'β⁻' },
  'e+': { A: 0, Z: 1, label: 'e⁺' },
  'β+': { A: 0, Z: 1, label: 'β⁺' },
  'β⁺': { A: 0, Z: 1, label: 'β⁺' },
  positron: { A: 0, Z: 1, label: 'e⁺' },
  gamma: { A: 0, Z: 0, label: 'γ' },
  γ: { A: 0, Z: 0, label: 'γ' },
  neutrino: { A: 0, Z: 0, label: 'ν' },
  ν: { A: 0, Z: 0, label: 'ν' },
  antineutrino: { A: 0, Z: 0, label: 'ν̄' },
  d: { A: 2, Z: 1, label: 'd' },
};

/** Parse "U-235", "235U", "235 92 U", "He-4", "alpha", "n", "2n", "3 n", "Ba-141". Returns count & nuclide. */
export function parseNuclide(tok: string): { count: number; nuc: Nuclide } | null {
  let t = tok.trim();
  let count = 1;
  const cm = /^(\d+)\s*(?:×|x|\*)?\s*(n|neutrons?|p|protons?|alpha|α|e-|e\+|β-|β\+|β⁻|β⁺|γ|gamma|neutrino|ν|antineutrino|positron|beta)$/i.exec(t);
  if (cm) {
    count = parseInt(cm[1], 10);
    t = cm[2];
  }
  const key = t.toLowerCase().replace(/s$/, '');
  if (PARTICLE_NUCLIDES[t] || PARTICLE_NUCLIDES[key]) return { count, nuc: PARTICLE_NUCLIDES[t] ?? PARTICLE_NUCLIDES[key] };
  let m = /^([A-Z][a-z]?)[-\s]?(\d+)$/.exec(t);
  if (m && zFor(m[1]) !== undefined) return { count, nuc: { A: parseInt(m[2], 10), Z: zFor(m[1])!, label: `${m[1]}-${m[2]}` } };
  m = /^(\d+)\s*(\d+)?\s*([A-Z][a-z]?)$/.exec(t);
  if (m && zFor(m[3]) !== undefined) {
    const A = parseInt(m[1], 10);
    const Z = m[2] ? parseInt(m[2], 10) : zFor(m[3])!;
    return { count, nuc: { A, Z, label: `${m[3]}-${A}` } };
  }
  return null;
}

export interface EquationResult {
  ok: boolean;
  unknownA?: number;
  unknownZ?: number;
  identity?: string;
  lines: string[];
  error?: string;
}

/**
 * Balance "U-235 + n -> Ba-141 + Kr-92 + ?" (one unknown "?" or "X"). Conservation of
 * nucleon number (A) and charge (Z).
 */
export function balanceEquation(eq: string): EquationResult {
  const norm = eq
    .replace(/(?<![A-Za-z])(e|β|beta)\s*\+/g, 'positron')
    .replace(/(?<![A-Za-z])(e|β)\s*[-−⁻](?!\d)/g, 'beta')
    .replace(/β⁺/g, 'positron')
    .replace(/β⁻/g, 'beta');
  const parts = norm.split(/->|→|=>|⟶/);
  if (parts.length !== 2) return { ok: false, lines: [], error: 'Write the equation with an arrow, e.g. "U-235 + n -> Ba-141 + Kr-92 + ?"' };
  const side = (s: string) => s.split(/\s*\+\s*/).map((x) => x.trim()).filter(Boolean);
  const L = side(parts[0]);
  const R = side(parts[1]);
  let unknownSide: 'L' | 'R' | null = null;
  let unknownCount = 1;
  const tally = (list: string[], which: 'L' | 'R') => {
    let A = 0;
    let Z = 0;
    for (const tok of list) {
      const um = /^(\d+)?\s*(\?|X)$/.exec(tok);
      if (um) {
        if (unknownSide) throw new Error('Only one unknown can be found at a time.');
        unknownSide = which;
        unknownCount = um[1] ? parseInt(um[1], 10) : 1;
        continue;
      }
      const p = parseNuclide(tok);
      if (!p) throw new Error(`Cannot read "${tok}". Use forms like U-235, 235U, He-4, alpha, n, 3n, beta, positron, gamma.`);
      A += p.count * p.nuc.A;
      Z += p.count * p.nuc.Z;
    }
    return { A, Z };
  };
  try {
    const l = tally(L, 'L');
    const r = tally(R, 'R');
    const lines = [`\\text{Left: } \\Sigma A = ${l.A},\\ \\Sigma Z = ${l.Z}`, `\\text{Right: } \\Sigma A = ${r.A},\\ \\Sigma Z = ${r.Z}`];
    if (!unknownSide) {
      const bal = l.A === r.A && l.Z === r.Z;
      lines.push(bal ? '\\text{Balanced: nucleon number and charge are conserved } \\checkmark' : '\\text{NOT balanced}');
      return { ok: bal, lines, error: bal ? undefined : 'The equation does not conserve nucleon number and/or charge.' };
    }
    const dA = unknownSide === 'R' ? l.A - r.A : r.A - l.A;
    const dZ = unknownSide === 'R' ? l.Z - r.Z : r.Z - l.Z;
    if (dA % unknownCount !== 0 || dZ % unknownCount !== 0) return { ok: false, lines, error: 'No whole-number nuclide balances this equation.' };
    const A = dA / unknownCount;
    const Z = dZ / unknownCount;
    lines.push(`\\text{Unknown: } A = ${A},\\ Z = ${Z}`);
    let identity = '';
    for (const [, nuc] of Object.entries(PARTICLE_NUCLIDES)) if (nuc.A === A && nuc.Z === Z && A <= 4) identity = nuc.label;
    if (A === 0 && Z === 0) identity = 'γ (gamma ray) or neutrino — no change in A or Z';
    else if (!identity && Z >= 1) identity = `${symbolFor(Z)}-${A}`;
    else if (A === 1 && Z === 0) identity = 'neutron';
    if (A < 0 || (A === 0 && Math.abs(Z) > 1)) return { ok: false, lines, error: 'The result is not a physical particle — check the equation.' };
    return { ok: true, unknownA: A, unknownZ: Z, identity, lines };
  } catch (e) {
    return { ok: false, lines: [], error: (e as Error).message };
  }
}

export function solveEquation(eq: string): Solution {
  const sol = newSolution('Nuclear equation', 'm8', 'nuclear');
  const r = balanceEquation(eq);
  if (r.error) sol.issues.push({ level: r.ok ? 'warning' : 'error', message: r.error });
  sol.steps.push(mkStep('Conservation of nucleon number (A) and charge (Z)', '\\Sigma A_{before} = \\Sigma A_{after},\\quad \\Sigma Z_{before} = \\Sigma Z_{after}', { lines: r.lines, resultLatex: r.unknownA !== undefined ? `{}^{${r.unknownA}}_{${r.unknownZ}}\\text{X}` : '' }));
  if (r.unknownA !== undefined) sol.finals.push({ symbolLatex: 'X', name: 'Missing particle', valueSI: NaN, quantity: 'dimensionless', direction: `A = ${r.unknownA}, Z = ${r.unknownZ} → ${r.identity}` });
  sol.ok = r.ok;
  return sol;
}
