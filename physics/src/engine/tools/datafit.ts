/**
 * Graph / data analysis (all modules). HSC questions often give a table of measurements and
 * ask for a gradient or intercept. This fits a least-squares line to (x, y) data and
 * interprets the gradient for the chosen relationship:
 *  - photoelectric:   Kmax (or qVs) vs f → gradient h, x-intercept f₀, y-intercept −φ
 *  - stopping voltage: Vs vs f → gradient h/e
 *  - hubble:          v vs D → gradient H₀, age ≈ 1/H₀
 *  - kepler:          r³ vs T² → gradient GM/4π² → M
 *  - wien:            λmax vs 1/T → gradient b
 *  - generic:         gradient and intercept only
 */
import { NESA } from '../constants';
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { final, mkStep, newSolution } from './common';

export type FitKind = 'generic' | 'photoelectric' | 'stopping' | 'hubble' | 'kepler' | 'wien';

export interface FitInput {
  kind: FitKind;
  /** points already converted to SI (see UI) */
  points: [number, number][];
  xLabel?: string;
  yLabel?: string;
}

export function linearFit(pts: [number, number][]): { m: number; c: number; r2: number } {
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const c = (sy - m * sx) / n;
  const my = sy / n;
  const ssTot = pts.reduce((s, p) => s + (p[1] - my) ** 2, 0);
  const ssRes = pts.reduce((s, p) => s + (p[1] - (m * p[0] + c)) ** 2, 0);
  return { m, c, r2: ssTot === 0 ? 1 : 1 - ssRes / ssTot };
}

export function solveFit(inp: FitInput, sf = 3): Solution {
  const sol = newSolution('Line of best fit', inp.kind === 'hubble' ? 'm8' : inp.kind === 'kepler' ? 'm5' : 'm7', inp.kind === 'hubble' ? 'stars' : inp.kind === 'kepler' ? 'orbital' : inp.kind === 'wien' ? 'quantumLight' : 'photoelectric');
  const pts = inp.points.filter((p) => isFinite(p[0]) && isFinite(p[1]));
  if (pts.length < 2) {
    sol.issues.push({ level: 'error', message: 'Enter at least two data points.' });
    return sol;
  }
  const { m, c, r2 } = linearFit(pts);
  sol.steps.push(mkStep('Least-squares line of best fit', 'y = mx + c', { lines: [`m = ${fmtLatex(m, 4)}`, `c = ${fmtLatex(c, 4)}`, `R^2 = ${fmtLatex(r2, 4)}`], resultLatex: `y = ${fmtLatex(m, 4)}x ${c < 0 ? '-' : '+'} ${fmtLatex(Math.abs(c), 4)}`, explanation: 'In an exam draw the line of best fit by eye and take the gradient from two points far apart ON THE LINE (not data points).' }));
  const e = NESA.e.value;
  switch (inp.kind) {
    case 'photoelectric': {
      const phi = -c;
      const f0 = -c / m;
      sol.steps.push(mkStep('Interpretation: K_max = hf − φ', 'K_{max} = hf - \\phi', { lines: [`\\text{gradient} = h = ${fmtLatex(m, sf)}\\ \\text{J s}`, `\\text{y-intercept} = -\\phi \\Rightarrow \\phi = ${fmtLatex(phi, sf)}\\ \\text{J} = ${fmtLatex(phi / e, sf)}\\ \\text{eV}`, `\\text{x-intercept} = f_0 = ${fmtLatex(f0, sf)}\\ \\text{Hz}`], resultLatex: `h = ${fmtLatex(m, sf)}\\ \\text{J s}` }));
      final(sol, { symbolLatex: 'h', name: 'Planck constant (gradient)', valueSI: m, quantity: 'planck' });
      final(sol, { symbolLatex: '\\phi', name: 'Work function (−y-intercept)', valueSI: phi, quantity: 'energyAtomic' });
      final(sol, { symbolLatex: 'f_0', name: 'Threshold frequency (x-intercept)', valueSI: f0, quantity: 'frequency' });
      break;
    }
    case 'stopping': {
      const h = m * e;
      const phi = -c * e;
      sol.steps.push(mkStep('Interpretation: qV_s = hf − φ ⇒ V_s = (h/e)f − φ/e', 'V_s = \\frac{h}{e}f - \\frac{\\phi}{e}', { lines: [`h = e \\times \\text{gradient} = ${fmtLatex(e, 4)} \\times ${fmtLatex(m, 4)} = ${fmtLatex(h, sf)}\\ \\text{J s}`, `\\phi = -e \\times \\text{intercept} = ${fmtLatex(phi, sf)}\\ \\text{J} = ${fmtLatex(phi / e, sf)}\\ \\text{eV}`, `f_0 = ${fmtLatex(-c / m, sf)}\\ \\text{Hz}`], resultLatex: `h = ${fmtLatex(h, sf)}\\ \\text{J s}` }));
      final(sol, { symbolLatex: 'h', name: 'Planck constant', valueSI: h, quantity: 'planck' });
      final(sol, { symbolLatex: '\\phi', name: 'Work function', valueSI: phi, quantity: 'energyAtomic' });
      final(sol, { symbolLatex: 'f_0', name: 'Threshold frequency', valueSI: -c / m, quantity: 'frequency' });
      break;
    }
    case 'hubble': {
      const age = 1 / m;
      sol.steps.push(mkStep('Interpretation: v = H₀D', 'v = H_0D,\\quad t \\approx \\frac{1}{H_0}', { lines: [`H_0 = \\text{gradient} = ${fmtLatex(m, sf)}\\ \\text{s}^{-1} = ${fmtLatex(m * 3.086e19, sf)}\\ \\text{km s}^{-1}\\text{ Mpc}^{-1}`, `t = \\frac{1}{H_0} = ${fmtLatex(age, sf)}\\ \\text{s} = ${fmtLatex(age / (365.25 * 86400 * 1e9), sf)} \\times 10^{9}\\ \\text{years}`], resultLatex: `H_0 = ${fmtLatex(m, sf)}\\ \\text{s}^{-1}` }));
      final(sol, { symbolLatex: 'H_0', name: 'Hubble constant (gradient)', valueSI: m, quantity: 'hubble' });
      final(sol, { symbolLatex: 't', name: 'Approximate age of the Universe', valueSI: age, quantity: 'longTime', unit: 'years' });
      break;
    }
    case 'kepler': {
      const M = (4 * Math.PI * Math.PI * m) / NESA.G.value;
      sol.steps.push(mkStep('Interpretation: r³ = (GM/4π²)T²', '\\text{gradient} = \\frac{GM}{4\\pi^2}', { rearrangedLatex: 'M = \\frac{4\\pi^2 \\times \\text{gradient}}{G}', substitutionLatex: `M = \\frac{4\\pi^2 \\times ${fmtLatex(m, 4)}}{${fmtLatex(NESA.G.value, 3)}}`, resultLatex: `M = ${fmtLatex(M, sf)}\\ \\text{kg}` }));
      final(sol, { symbolLatex: 'M', name: 'Mass of the central body', valueSI: M, quantity: 'mass' });
      break;
    }
    case 'wien':
      sol.steps.push(mkStep('Interpretation: λmax = b × (1/T)', '\\lambda_{max} = \\frac{b}{T}', { lines: [`b = \\text{gradient} = ${fmtLatex(m, sf)}\\ \\text{m K}`], resultLatex: `b = ${fmtLatex(m, sf)}\\ \\text{m K}` }));
      final(sol, { symbolLatex: 'b', name: "Wien's constant (gradient)", valueSI: m, quantity: 'wien' });
      break;
    default:
      final(sol, { symbolLatex: 'm', name: 'Gradient', valueSI: m, quantity: 'dimensionless' });
      final(sol, { symbolLatex: 'c', name: 'y-intercept', valueSI: c, quantity: 'dimensionless' });
  }
  const xs = pts.map((p) => p[0]);
  const x0 = Math.min(0, ...xs);
  const x1 = Math.max(...xs) * 1.05;
  sol.graph = { title: 'Data and line of best fit', xLabel: inp.xLabel ?? 'x', yLabel: inp.yLabel ?? 'y', series: [{ label: 'best fit', points: [[x0, m * x0 + c], [x1, m * x1 + c]] }], markers: pts.map((p) => ({ x: p[0], y: p[1], label: '' })), yZero: true };
  sol.ok = true;
  return sol;
}
