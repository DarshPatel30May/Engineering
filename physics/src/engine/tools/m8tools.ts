/**
 * Module 8 tools: radioactive decay analyser (any three of N₀, N, t, t½/λ) with a decay
 * graph, and Standard Model tools (quark charge / baryon number of hadrons and conservation
 * checks for particle reactions).
 */
import { fmtLatex, fmt } from '../format';
import type { Solution } from '../solution';
import { convert, parseUnit } from '../units';
import { err, final, given, mkStep, newSolution, Qty, rawOf, si, trackSF } from './common';

// ───────────────────────── radioactive decay ─────────────────────────

export interface DecayInput {
  N0?: Qty;
  N?: Qty;
  t?: Qty;
  tHalf?: Qty;
  lambda?: Qty;
  /** give N as a fraction/percentage of N0 */
  fraction?: number;
}

export function solveDecay(inp: DecayInput, sf = 4): Solution {
  const sol = newSolution('Radioactive decay', 'm8', 'radioactivity');
  const iss = sol.issues;
  // amounts: keep the unit of N0 (or N)
  const ref = inp.N0?.unit ?? inp.N?.unit ?? '';
  const amt = (x: Qty | undefined, name: string): number | undefined => {
    if (!x || !isFinite(x.value)) return undefined;
    try {
      if (x.unit === ref) return x.value;
      return convert(x.value, x.unit, ref);
    } catch {
      iss.push({ level: 'error', message: `${name} is in "${x.unit}" but the other amount is in "${ref}" — they must be the same kind of quantity.` });
      return undefined;
    }
  };
  let N0 = amt(inp.N0, 'Initial amount');
  let N = amt(inp.N, 'Remaining amount');
  if (inp.fraction !== undefined && N0 === undefined && N === undefined) {
    N0 = 1;
    N = inp.fraction;
  } else if (inp.fraction !== undefined && N0 !== undefined && N === undefined) N = N0 * inp.fraction;
  // times: work in the unit of the half-life if given, else seconds
  const tUnit = inp.tHalf?.unit || inp.t?.unit || 's';
  const tIn = (x: Qty | undefined, name: string) => {
    if (!x || !isFinite(x.value)) return undefined;
    try {
      return convert(x.value, x.unit || tUnit, tUnit);
    } catch {
      iss.push({ level: 'error', message: `${name}: "${x.unit}" is not a time unit.` });
      return undefined;
    }
  };
  let t = tIn(inp.t, 'Time');
  let th = tIn(inp.tHalf, 'Half-life');
  let lam: number | undefined;
  if (inp.lambda && isFinite(inp.lambda.value)) {
    const lSI = si(inp.lambda, 'decayConst', 'Decay constant', iss);
    if (lSI !== undefined) lam = lSI * parseUnit(tUnit).factor;
  }
  if (iss.some((i) => i.level === 'error')) return sol;
  trackSF(sol, inp.N0, inp.N, inp.t, inp.tHalf, inp.lambda);
  const U = ref ? `\\ \\text{${ref.replace('%', '\\%')}}` : '';
  const TU = `\\ \\text{${tUnit}}`;
  if (N0 !== undefined && inp.N0) given(sol, 'N_0', 'Initial amount', rawOf(inp.N0), N0, 'amount', ref);
  if (N !== undefined && inp.N) given(sol, 'N', 'Amount remaining', rawOf(inp.N), N, 'amount', ref);
  if (inp.fraction !== undefined) given(sol, 'N/N_0', 'Fraction remaining', `${fmt(inp.fraction * 100, 4)} %`, inp.fraction, 'percent');
  if (t !== undefined) given(sol, 't', 'Time elapsed', rawOf(inp.t!), t, 'longTime', tUnit);
  if (th !== undefined) given(sol, 't_{1/2}', 'Half-life', rawOf(inp.tHalf!), th, 'longTime', tUnit);
  if (lam !== undefined) given(sol, '\\lambda', 'Decay constant', rawOf(inp.lambda!), lam, 'decayConst', `${tUnit}⁻¹`);
  if (inp.t && inp.t.unit !== tUnit && t !== undefined) sol.conversions.push(`t = ${fmtLatex(inp.t.value, 6)}\\ \\text{${inp.t.unit}} = ${fmtLatex(t, 6)}${TU}`);
  sol.assumptions.push(`Times are worked in ${tUnit} (the unit of the half-life) — the unit cancels in λt, so no conversion to seconds is needed.`);
  let step = 1;
  const S = () => `Step ${step++}`;
  if (lam === undefined && th !== undefined) {
    lam = Math.LN2 / th;
    sol.steps.push(mkStep(`${S()} — Decay constant`, '\\lambda = \\frac{\\ln 2}{t_{1/2}}', { substitutionLatex: `\\lambda = \\frac{0.6931}{${fmtLatex(th, 4)}}`, resultLatex: `\\lambda = ${fmtLatex(lam, sf)}\\ \\text{${tUnit}}^{-1}` }));
  }
  const nKnown = [N0, N, t, lam].filter((x) => x !== undefined).length;
  if (nKnown < 3) return err(sol, 'Give any three of: initial amount, remaining amount (or fraction), time, half-life (or decay constant).');
  if (N0 !== undefined && N !== undefined && N > N0) return err(sol, 'The remaining amount cannot exceed the initial amount.');
  if (N === undefined) {
    N = N0! * Math.exp(-lam! * t!);
    const nh = th !== undefined ? t! / th : undefined;
    if (nh !== undefined) {
      sol.steps.push(mkStep(`${S()} — Number of half-lives elapsed`, 'n = \\frac{t}{t_{1/2}}', { substitutionLatex: `n = \\frac{${fmtLatex(t!, 4)}}{${fmtLatex(th!, 4)}}`, resultLatex: `n = ${fmtLatex(nh, sf)}` }));
      if (Math.abs(nh - Math.round(nh)) < 1e-9) {
        sol.steps.push(mkStep(`${S()} — Halve ${Math.round(nh)} times`, 'N = N_0\\left(\\tfrac{1}{2}\\right)^n', { substitutionLatex: `N = ${fmtLatex(N0!, 4)} \\times \\left(\\tfrac{1}{2}\\right)^{${Math.round(nh)}}`, resultLatex: `N = ${fmtLatex(N, sf)}${U}` }));
      }
    }
    sol.steps.push(mkStep(`${S()} — Amount remaining (decay law)`, 'N_t = N_0e^{-\\lambda t}', { substitutionLatex: `N_t = ${fmtLatex(N0!, 4)} \\times e^{-${fmtLatex(lam!, 4)} \\times ${fmtLatex(t!, 4)}}`, resultLatex: `N_t = ${fmtLatex(N, sf)}${U}` }));
    final(sol, { symbolLatex: 'N_t', name: 'Amount remaining', valueSI: N, quantity: 'amount', unit: ref });
    if (nh !== undefined) final(sol, { symbolLatex: 'n', name: 'Number of half-lives', valueSI: nh, quantity: 'ratio' });
    final(sol, { symbolLatex: 'N_0 - N_t', name: 'Amount decayed', valueSI: N0! - N, quantity: 'amount', unit: ref });
  } else if (N0 === undefined) {
    N0 = N * Math.exp(lam! * t!);
    sol.steps.push(mkStep(`${S()} — Initial amount`, 'N_t = N_0e^{-\\lambda t}', { rearrangedLatex: 'N_0 = N_te^{\\lambda t}', substitutionLatex: `N_0 = ${fmtLatex(N, 4)} \\times e^{${fmtLatex(lam!, 4)} \\times ${fmtLatex(t!, 4)}}`, resultLatex: `N_0 = ${fmtLatex(N0, sf)}${U}` }));
    final(sol, { symbolLatex: 'N_0', name: 'Initial amount', valueSI: N0, quantity: 'amount', unit: ref });
  } else if (t === undefined) {
    if (N <= 0) return err(sol, 'The remaining amount must be greater than zero (exponential decay never reaches exactly zero).');
    t = Math.log(N0 / N) / lam!;
    sol.steps.push(mkStep(`${S()} — Time elapsed`, 'N_t = N_0e^{-\\lambda t}', { rearrangedLatex: 't = \\frac{\\ln(N_0/N_t)}{\\lambda}', substitutionLatex: `t = \\frac{\\ln(${fmtLatex(N0, 4)} / ${fmtLatex(N, 4)})}{${fmtLatex(lam!, 4)}}`, resultLatex: `t = ${fmtLatex(t, sf)}${TU}` }));
    final(sol, { symbolLatex: 't', name: 'Time elapsed', valueSI: t, quantity: 'amount', unit: tUnit });
  } else {
    if (N <= 0 || N >= N0) return err(sol, 'To find the half-life the remaining amount must be between 0 and the initial amount.');
    lam = Math.log(N0 / N) / t;
    th = Math.LN2 / lam;
    sol.steps.push(mkStep(`${S()} — Decay constant`, 'N_t = N_0e^{-\\lambda t}', { rearrangedLatex: '\\lambda = \\frac{\\ln(N_0/N_t)}{t}', substitutionLatex: `\\lambda = \\frac{\\ln(${fmtLatex(N0, 4)} / ${fmtLatex(N, 4)})}{${fmtLatex(t, 4)}}`, resultLatex: `\\lambda = ${fmtLatex(lam, sf)}\\ \\text{${tUnit}}^{-1}` }));
    sol.steps.push(mkStep(`${S()} — Half-life`, 't_{1/2} = \\frac{\\ln 2}{\\lambda}', { substitutionLatex: `t_{1/2} = \\frac{0.6931}{${fmtLatex(lam, 4)}}`, resultLatex: `t_{1/2} = ${fmtLatex(th, sf)}${TU}` }));
    final(sol, { symbolLatex: 't_{1/2}', name: 'Half-life', valueSI: th, quantity: 'amount', unit: tUnit });
    final(sol, { symbolLatex: '\\lambda', name: 'Decay constant', valueSI: lam, quantity: 'amount', unit: `${tUnit}⁻¹` });
  }
  if (lam !== undefined && th === undefined) th = Math.LN2 / lam;
  // decay curve
  const tEnd = Math.max(t ?? 0, 5 * th!);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 80; i++) {
    const x = (tEnd * i) / 80;
    pts.push([x, N0! * Math.exp(-lam! * x)]);
  }
  const markers = [];
  for (let k = 1; k <= 4; k++) markers.push({ x: k * th!, y: N0! / 2 ** k, label: `${k} t½` });
  if (t !== undefined) markers.push({ x: t, y: N0! * Math.exp(-lam! * t), label: 'now' });
  sol.graph = { title: 'Decay curve N = N₀e^(−λt)', xLabel: `t (${tUnit})`, yLabel: `N (${ref || 'amount'})`, series: [{ label: 'N(t)', points: pts }], markers, yZero: true };
  sol.explanation.push('The same law applies to the number of undecayed nuclei, the mass of the isotope and the activity — they all fall by half every half-life.');
  sol.ok = true;
  return sol;
}

// ───────────────────────── Standard Model ─────────────────────────

export interface QuarkInfo {
  name: string;
  charge: number; // in units of e
  baryon: number;
}

export const QUARKS: Record<string, QuarkInfo> = {
  u: { name: 'up', charge: 2 / 3, baryon: 1 / 3 },
  d: { name: 'down', charge: -1 / 3, baryon: 1 / 3 },
  s: { name: 'strange', charge: -1 / 3, baryon: 1 / 3 },
  c: { name: 'charm', charge: 2 / 3, baryon: 1 / 3 },
  b: { name: 'bottom', charge: -1 / 3, baryon: 1 / 3 },
  t: { name: 'top', charge: 2 / 3, baryon: 1 / 3 },
};

/** Parse "uud", "u d̄", "u anti-d", "ubar d" → list of {flavour, anti}. */
export function parseQuarks(s: string): { q: string; anti: boolean }[] | null {
  const t = s.replace(/anti-?([udscbt])/gi, '$1~').replace(/([udscbt])\s*(?:bar|̄|\u0304)/gi, '$1~').replace(/[\s,+]/g, '');
  const out: { q: string; anti: boolean }[] = [];
  for (let i = 0; i < t.length; i++) {
    const ch = t[i].toLowerCase();
    if (!QUARKS[ch]) return null;
    const anti = t[i + 1] === '~';
    if (anti) i++;
    out.push({ q: ch, anti });
  }
  return out.length ? out : null;
}

const frac = (x: number) => {
  const n = Math.round(x * 3);
  if (n % 3 === 0) return String(n / 3);
  return `${n < 0 ? '-' : ''}\\tfrac{${Math.abs(n)}}{3}`;
};

export function solveQuarks(s: string): Solution {
  const sol = newSolution('Quark composition', 'm8', 'standardModel');
  const qs = parseQuarks(s);
  if (!qs) return err(sol, 'Enter quarks as letters u, d, s, c, b, t; mark antiquarks with "bar" or "anti-" (e.g. "u dbar" for π⁺).');
  let Q = 0;
  let Bn = 0;
  const terms: string[] = [];
  for (const { q, anti } of qs) {
    const info = QUARKS[q];
    const c = anti ? -info.charge : info.charge;
    const b = anti ? -info.baryon : info.baryon;
    Q += c;
    Bn += b;
    terms.push(`${anti ? `\\bar{${q}}` : q}: ${frac(c)}e`);
  }
  const type = qs.length === 3 && Math.abs(Math.abs(Bn) - 1) < 1e-9 ? (Bn > 0 ? 'baryon' : 'antibaryon') : qs.length === 2 && Math.abs(Bn) < 1e-9 ? 'meson' : 'not a standard hadron (baryons have 3 quarks, mesons a quark–antiquark pair)';
  sol.steps.push(mkStep('Add the quark charges', 'Q = \\Sigma q_{quark}', { lines: terms, resultLatex: `Q = ${frac(Q)}e,\\quad B = ${frac(Bn)}` }));
  const known: Record<string, string> = { uud: 'proton', udd: 'neutron', 'u d~': 'π⁺', 'd u~': 'π⁻', uds: 'Λ⁰ / Σ⁰', uus: 'Σ⁺', dds: 'Σ⁻' };
  const key = qs.map((x) => x.q + (x.anti ? '~' : '')).join(qs.length === 2 ? ' ' : '');
  const sorted = qs.length === 3 ? [...key].sort().join('') : key;
  const sortedKnown = Object.fromEntries(Object.entries(known).map(([k, v]) => [k.length === 3 ? [...k].sort().join('') : k, v]));
  const name = sortedKnown[sorted];
  sol.finals.push({ symbolLatex: 'Q', name: 'Total charge', valueSI: Q, quantity: 'dimensionless', direction: `${frac(Q).replace(/\\tfrac\{(\d)\}\{3\}/, '$1/3')} e (${fmt(Q * 1.602e-19, 4)} C)` });
  sol.finals.push({ symbolLatex: 'B', name: 'Baryon number', valueSI: Bn, quantity: 'dimensionless', direction: `${type}${name ? ` — ${name}` : ''}` });
  sol.ok = true;
  return sol;
}

export interface ParticleNumbers {
  Q: number;
  B: number;
  Le: number;
  Lmu: number;
}

export const PARTICLE_TABLE: Record<string, ParticleNumbers & { label: string }> = {
  p: { label: 'p', Q: 1, B: 1, Le: 0, Lmu: 0 },
  'p~': { label: 'p̄', Q: -1, B: -1, Le: 0, Lmu: 0 },
  n: { label: 'n', Q: 0, B: 1, Le: 0, Lmu: 0 },
  'n~': { label: 'n̄', Q: 0, B: -1, Le: 0, Lmu: 0 },
  'e-': { label: 'e⁻', Q: -1, B: 0, Le: 1, Lmu: 0 },
  'e+': { label: 'e⁺', Q: 1, B: 0, Le: -1, Lmu: 0 },
  ve: { label: 'νₑ', Q: 0, B: 0, Le: 1, Lmu: 0 },
  've~': { label: 'ν̄ₑ', Q: 0, B: 0, Le: -1, Lmu: 0 },
  'mu-': { label: 'μ⁻', Q: -1, B: 0, Le: 0, Lmu: 1 },
  'mu+': { label: 'μ⁺', Q: 1, B: 0, Le: 0, Lmu: -1 },
  vmu: { label: 'ν_μ', Q: 0, B: 0, Le: 0, Lmu: 1 },
  'vmu~': { label: 'ν̄_μ', Q: 0, B: 0, Le: 0, Lmu: -1 },
  'pi+': { label: 'π⁺', Q: 1, B: 0, Le: 0, Lmu: 0 },
  'pi-': { label: 'π⁻', Q: -1, B: 0, Le: 0, Lmu: 0 },
  pi0: { label: 'π⁰', Q: 0, B: 0, Le: 0, Lmu: 0 },
  gamma: { label: 'γ', Q: 0, B: 0, Le: 0, Lmu: 0 },
  'W+': { label: 'W⁺', Q: 1, B: 0, Le: 0, Lmu: 0 },
  'W-': { label: 'W⁻', Q: -1, B: 0, Le: 0, Lmu: 0 },
  Z: { label: 'Z⁰', Q: 0, B: 0, Le: 0, Lmu: 0 },
};

const ALIASES: Record<string, string> = {
  proton: 'p', neutron: 'n', antiproton: 'p~', 'p-bar': 'p~', pbar: 'p~', electron: 'e-', 'e−': 'e-', 'β-': 'e-', 'β⁻': 'e-', 'e⁻': 'e-', positron: 'e+', 'β+': 'e+', 'β⁺': 'e+', 'e⁺': 'e+',
  neutrino: 've', 'νe': 've', ν: 've', antineutrino: 've~', 'νe~': 've~', 'ν~': 've~', 'v~': 've~', 'vebar': 've~', 'anti-neutrino': 've~',
  muon: 'mu-', 'μ-': 'mu-', 'μ⁻': 'mu-', 'μ+': 'mu+', 'μ⁺': 'mu+', antimuon: 'mu+', 'νμ': 'vmu', 'νμ~': 'vmu~', 'vmubar': 'vmu~',
  'π+': 'pi+', 'π⁺': 'pi+', 'π-': 'pi-', 'π⁻': 'pi-', 'π0': 'pi0', 'π⁰': 'pi0', γ: 'gamma', photon: 'gamma', 'W⁺': 'W+', 'W⁻': 'W-', 'Z0': 'Z', 'Z⁰': 'Z',
};

export function particleOf(tok: string): (ParticleNumbers & { label: string }) | undefined {
  const t = tok.trim();
  return PARTICLE_TABLE[t] ?? PARTICLE_TABLE[ALIASES[t] ?? ALIASES[t.toLowerCase()] ?? ''];
}

export function solveConservation(reaction: string): Solution {
  const sol = newSolution('Conservation laws for a particle reaction', 'm8', 'standardModel');
  const parts = reaction.split(/->|→|=>/);
  if (parts.length !== 2) return err(sol, 'Write the reaction with an arrow, e.g. "n -> p + e- + ve~".');
  const side = (s: string) => s.split(/\s\+\s|\s+/).map((x) => x.trim()).filter((x) => x && x !== '+');
  const sum = (list: string[]) => {
    const tot: ParticleNumbers = { Q: 0, B: 0, Le: 0, Lmu: 0 };
    for (const tok of list) {
      const p = particleOf(tok);
      if (!p) throw new Error(`Unknown particle "${tok}". Use p, n, e-, e+, ve, ve~, mu-, mu+, vmu, vmu~, pi+, pi-, pi0, gamma (append ~ for antiparticles).`);
      tot.Q += p.Q;
      tot.B += p.B;
      tot.Le += p.Le;
      tot.Lmu += p.Lmu;
    }
    return tot;
  };
  try {
    const L = sum(side(parts[0]));
    const R = sum(side(parts[1]));
    const rows: string[][] = [];
    let allOk = true;
    for (const [k, name] of [['Q', 'Charge'], ['B', 'Baryon number'], ['Le', 'Electron lepton number'], ['Lmu', 'Muon lepton number']] as const) {
      const ok = L[k] === R[k];
      allOk = allOk && ok;
      rows.push([name, String(L[k]), String(R[k]), ok ? 'conserved ✓' : 'VIOLATED ✗']);
    }
    sol.tables = [{ title: 'Conservation check', headers: ['Quantity', 'Before', 'After', 'Result'], rows }];
    sol.steps.push(mkStep('Compare totals before and after', '\\Sigma_{before} = \\Sigma_{after}', { lines: rows.map((r) => `\\text{${r[0]}: } ${r[1]} \\rightarrow ${r[2]}\\ \\text{(${r[3].replace(/[✓✗]/g, '').trim()})}`), resultLatex: allOk ? '\\text{All conserved — the reaction is allowed by these laws}' : '\\text{Not allowed}' }));
    sol.finals.push({ symbolLatex: '', name: 'Verdict', valueSI: NaN, quantity: 'dimensionless', direction: allOk ? 'Allowed (charge, baryon number and lepton numbers conserved)' : 'Forbidden (a conservation law is violated)' });
    sol.ok = true;
  } catch (e) {
    return err(sol, (e as Error).message);
  }
  return sol;
}
