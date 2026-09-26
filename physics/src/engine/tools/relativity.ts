/**
 * Special relativity tool (Module 7). From the speed (e.g. 0.80c) — or from a pair such as
 * proper/dilated time or proper/contracted length — it computes γ, time dilation, length
 * contraction, relativistic momentum and rest energy, and handles the muon problem
 * (distance travelled and whether the particle reaches the ground) in both frames.
 */
import { NESA } from '../constants';
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { B, err, final, given, L, LU, mkStep, newSolution, Qty, rawOf, si, trackSF } from './common';

const C = NESA.c.value;

export interface RelativityInput {
  v?: Qty;
  gamma?: number;
  t0?: Qty;
  t?: Qty;
  L0?: Qty;
  L?: Qty;
  m0?: Qty;
  particleName?: string;
}

export const gammaOf = (v: number) => 1 / Math.sqrt(1 - (v * v) / (C * C));

export function solveRelativity(inp: RelativityInput, sf = 4): Solution {
  const sol = newSolution('Special relativity', 'm7', 'relativity');
  const issues = sol.issues;
  let v = si(inp.v, 'velocity', 'Speed', issues);
  const t0 = si(inp.t0, 'time', 'Proper time', issues);
  const t = si(inp.t, 'time', 'Dilated time', issues);
  const L0 = si(inp.L0, 'length', 'Proper length', issues);
  const Lc = si(inp.L, 'length', 'Contracted length', issues);
  const m0 = si(inp.m0, 'mass', 'Rest mass', issues);
  if (issues.some((i) => i.level === 'error')) return sol;
  trackSF(sol, inp.v, inp.t0, inp.t, inp.L0, inp.L, inp.m0);
  given(sol, 'c', 'Speed of light', '3.00 × 10⁸ m s⁻¹', C, 'velocity', 'm/s', true, 'NESA data sheet');
  if (v !== undefined) given(sol, 'v', 'Speed', rawOf(inp.v!), v, 'velocity', inp.v!.unit);
  if (t0 !== undefined) given(sol, 't_0', 'Proper time (clock at rest relative to the event)', rawOf(inp.t0!), t0, 'time', inp.t0!.unit);
  if (t !== undefined) given(sol, 't', 'Dilated time (observer who sees the clock moving)', rawOf(inp.t!), t, 'time', inp.t!.unit);
  if (L0 !== undefined) given(sol, 'l_0', 'Proper length (at rest relative to the observer measuring it)', rawOf(inp.L0!), L0, 'length', inp.L0!.unit);
  if (Lc !== undefined) given(sol, 'l', 'Contracted length', rawOf(inp.L!), Lc, 'length', inp.L!.unit);
  if (m0 !== undefined) given(sol, 'm_0', `Rest mass${inp.particleName ? ` (${inp.particleName})` : ''}`, rawOf(inp.m0!), m0, 'mass', inp.m0!.unit);

  let step = 1;
  const S = () => `Step ${step++}`;
  let gam: number | undefined;
  if (v === undefined) {
    if (inp.gamma !== undefined && inp.gamma >= 1) gam = inp.gamma;
    else if (t0 !== undefined && t !== undefined) {
      if (t < t0) return err(sol, 'The dilated time t must be at least the proper time t₀ — check which time is proper.');
      gam = t / t0;
      sol.steps.push(mkStep(`${S()} — Lorentz factor from the two times`, 't = \\gamma t_0', { rearrangedLatex: '\\gamma = \\frac{t}{t_0}', substitutionLatex: `\\gamma = \\frac{${fmtLatex(t, 4)}}{${fmtLatex(t0, 4)}}`, resultLatex: `\\gamma = ${fmtLatex(gam, sf)}` }));
    } else if (L0 !== undefined && Lc !== undefined) {
      if (Lc > L0) return err(sol, 'The contracted length l must be less than the proper length l₀.');
      gam = L0 / Lc;
      sol.steps.push(mkStep(`${S()} — Lorentz factor from the two lengths`, 'l = \\frac{l_0}{\\gamma}', { rearrangedLatex: '\\gamma = \\frac{l_0}{l}', substitutionLatex: `\\gamma = \\frac{${fmtLatex(L0, 4)}}{${fmtLatex(Lc, 4)}}`, resultLatex: `\\gamma = ${fmtLatex(gam, sf)}` }));
    } else return err(sol, 'Give the speed v (e.g. 0.80c), or both the proper and dilated times, or both the proper and contracted lengths.');
    v = C * Math.sqrt(1 - 1 / (gam * gam));
    sol.steps.push(mkStep(`${S()} — Speed`, '\\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}}', { rearrangedLatex: 'v = c\\sqrt{1 - \\frac{1}{\\gamma^2}}', substitutionLatex: `v = c\\sqrt{1 - \\frac{1}{${B(fmtLatex(gam, 4))}^2}}`, resultLatex: `v = ${fmtLatex(v / C, sf)}c = ${L(v, 'velocity', sf)}` }));
    final(sol, { symbolLatex: 'v', name: 'Speed', valueSI: v, quantity: 'velocity', direction: `${fmtLatex(v / C, sf)}c` });
  } else {
    if (v >= C) return err(sol, 'v ≥ c is impossible for a massive object — nothing with mass can reach the speed of light.');
    if (v <= 0) return err(sol, 'Speed must be positive.');
    gam = gammaOf(v);
    sol.steps.push(mkStep(`${S()} — Lorentz factor`, '\\gamma = \\frac{1}{\\sqrt{1 - \\dfrac{v^2}{c^2}}}', {
      substitutionLatex: `\\gamma = \\frac{1}{\\sqrt{1 - \\left(\\frac{${fmtLatex(v / C, 6)}c}{c}\\right)^2}} = \\frac{1}{\\sqrt{1 - ${fmtLatex((v / C) ** 2, 6)}}}`,
      resultLatex: `\\gamma = ${fmtLatex(gam, sf)}`,
      explanation: 'Writing v as a fraction of c makes the c’s cancel: v²/c² = (v/c)².',
    }));
  }
  final(sol, { symbolLatex: '\\gamma', name: 'Lorentz factor', valueSI: gam, quantity: 'ratio' });

  if (t0 !== undefined && t === undefined) {
    const td = gam * t0;
    sol.steps.push(mkStep(`${S()} — Time dilation`, 't = \\frac{t_0}{\\sqrt{1 - v^2/c^2}} = \\gamma t_0', { substitutionLatex: `t = ${fmtLatex(gam, 4)} \\times ${fmtLatex(t0, 4)}`, resultLatex: `t = ${L(td, 'time', sf)}`, explanation: 't₀ is the proper time (measured in the moving object’s own frame); the observer who sees it moving measures the longer time t.' }));
    final(sol, { symbolLatex: 't', name: 'Dilated time (observer’s frame)', valueSI: td, quantity: 'time' });
    const dObs = v * td;
    const dOwn = v * t0;
    sol.steps.push(mkStep(`${S()} — Distance travelled during that time`, 's = vt', {
      lines: [`\\text{Observer’s frame: } s = v t = ${fmtLatex(v, 4)} \\times ${fmtLatex(td, 4)} = ${L(dObs, 'length', sf)}`, `\\text{(Classically, without dilation: } s = v t_0 = ${L(dOwn, 'length', sf)}\\text{)}`],
      resultLatex: `s = ${L(dObs, 'length', sf)}`,
    }));
    final(sol, { symbolLatex: 's', name: 'Distance travelled in the observer’s frame', valueSI: dObs, quantity: 'length' });
    if (L0 !== undefined) {
      const reaches = dObs >= L0;
      sol.steps.push(mkStep(`${S()} — Does it cover the distance l₀?`, 's \\text{ vs } l_0', { lines: [`s = ${L(dObs, 'length', sf)}\\ ${reaches ? '\\ge' : '<'}\\ l_0 = ${L(L0, 'length', sf)}`], resultLatex: reaches ? '\\text{Yes — it reaches the end (e.g. the ground)}' : '\\text{No — it decays first (on average)}' }));
    }
  } else if (t !== undefined && t0 === undefined) {
    const tp = t / gam;
    sol.steps.push(mkStep(`${S()} — Proper time`, 't_0 = t\\sqrt{1 - v^2/c^2} = \\frac{t}{\\gamma}', { substitutionLatex: `t_0 = \\frac{${fmtLatex(t, 4)}}{${fmtLatex(gam, 4)}}`, resultLatex: `t_0 = ${L(tp, 'time', sf)}` }));
    final(sol, { symbolLatex: 't_0', name: 'Proper time (moving frame)', valueSI: tp, quantity: 'time' });
  }
  if (L0 !== undefined && Lc === undefined) {
    const lc = L0 / gam;
    sol.steps.push(mkStep(`${S()} — Length contraction`, 'l = l_0\\sqrt{1 - v^2/c^2} = \\frac{l_0}{\\gamma}', { substitutionLatex: `l = \\frac{${fmtLatex(L0, 4)}}{${fmtLatex(gam, 4)}}`, resultLatex: `l = ${L(lc, 'length', sf)}`, explanation: 'The observer moving relative to the object (e.g. the muon relative to the atmosphere) measures the contracted length along the direction of motion.' }));
    final(sol, { symbolLatex: 'l', name: 'Contracted length', valueSI: lc, quantity: 'length' });
    if (t0 !== undefined) {
      const tNeed = lc / v;
      sol.steps.push(mkStep(`${S()} — In the moving object’s frame`, 't = \\frac{l}{v}', { substitutionLatex: `t = \\frac{${fmtLatex(lc, 4)}}{${fmtLatex(v, 4)}}`, resultLatex: `t = ${L(tNeed, 'time', sf)}\\ ${tNeed <= t0 ? '\\le' : '>'}\\ t_0 = ${L(t0, 'time', sf)}`, explanation: tNeed <= t0 ? 'Both frames agree: it arrives before decaying (time dilation in one frame, length contraction in the other).' : 'Both frames agree: it decays before arriving.' }));
    }
  } else if (Lc !== undefined && L0 === undefined) {
    const lp = Lc * gam;
    sol.steps.push(mkStep(`${S()} — Proper length`, 'l_0 = \\gamma l', { substitutionLatex: `l_0 = ${fmtLatex(gam, 4)} \\times ${fmtLatex(Lc, 4)}`, resultLatex: `l_0 = ${L(lp, 'length', sf)}` }));
    final(sol, { symbolLatex: 'l_0', name: 'Proper length', valueSI: lp, quantity: 'length' });
  }
  if (m0 !== undefined) {
    const p = gam * m0 * v;
    const pc = m0 * v;
    const E0 = m0 * C * C;
    sol.steps.push(mkStep(`${S()} — Relativistic momentum`, 'p_v = \\frac{m_0v}{\\sqrt{1 - v^2/c^2}}', { substitutionLatex: `p_v = ${fmtLatex(gam, 4)} \\times ${fmtLatex(m0, 4)} \\times ${fmtLatex(v, 4)}`, resultLatex: `p_v = ${L(p, 'momentum', sf)}`, note: `classical p = m₀v = ${fmtLatex(pc, 3)} kg m/s (γ = ${fmtLatex(gam, 3)} times smaller)` }));
    sol.steps.push(mkStep(`${S()} — Rest energy`, 'E = mc^2', { substitutionLatex: `E = ${fmtLatex(m0, 4)} \\times ${B(fmtLatex(C, 3))}^2`, resultLatex: `E = ${L(E0, 'energy', sf)} = ${LU(E0, 'MeV', sf)}` }));
    final(sol, { symbolLatex: 'p_v', name: 'Relativistic momentum', valueSI: p, quantity: 'momentum' });
    final(sol, { symbolLatex: 'E_0', name: 'Rest energy (E = mc²)', valueSI: E0, quantity: 'energyAtomic' });
  }
  // γ vs v/c graph
  const pts: [number, number][] = [];
  for (let i = 0; i <= 99; i++) {
    const b = i / 100;
    pts.push([b, 1 / Math.sqrt(1 - b * b)]);
  }
  sol.graph = { title: 'Lorentz factor γ vs v/c', xLabel: 'v/c', yLabel: 'γ', series: [{ label: 'γ = 1/√(1 − v²/c²)', points: pts }], markers: [{ x: v / C, y: gam, label: `γ = ${fmtLatex(gam, 3)}` }] };
  sol.explanation.push('Proper time/length is measured by the observer at rest relative to the clock/object. γ ≥ 1, so moving clocks run slow and moving lengths contract.');
  sol.ok = true;
  return sol;
}
