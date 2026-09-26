/**
 * Hydrogen spectrum / Bohr model tool (Module 8): transition between two levels → photon
 * energy, frequency and wavelength by BOTH the energy-level method (E = −13.6/n² eV, ΔE = hf)
 * and the Rydberg equation, series name and spectral region.
 */
import { NESA } from '../constants';
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { err, final, L, LU, mkStep, newSolution } from './common';

const h = NESA.h.value;
const c = NESA.c.value;
const R = NESA.R.value;
const EV = NESA.eV.value;

export const SERIES: Record<number, string> = { 1: 'Lyman', 2: 'Balmer', 3: 'Paschen', 4: 'Brackett', 5: 'Pfund' };

export function region(lam: number): string {
  if (lam < 1e-11) return 'gamma rays';
  if (lam < 1e-8) return 'X-rays';
  if (lam < 3.8e-7) return 'ultraviolet';
  if (lam <= 7.5e-7) return `visible (${visibleColour(lam)})`;
  if (lam < 1e-3) return 'infrared';
  if (lam < 1) return 'microwave';
  return 'radio';
}

export function visibleColour(lam: number): string {
  const nm = lam * 1e9;
  if (nm < 450) return 'violet';
  if (nm < 495) return 'blue';
  if (nm < 570) return 'green';
  if (nm < 590) return 'yellow';
  if (nm < 620) return 'orange';
  return 'red';
}

export function levelEnergy(n: number): number {
  return (-13.6 * EV) / (n * n);
}

export interface TransitionInput {
  ni: number;
  nf: number;
  /** 'emission' (ni > nf) or 'absorption' (ni < nf) */
}

export function solveTransition(inp: TransitionInput, sf = 4): Solution {
  const sol = newSolution('Hydrogen transition (Bohr model)', 'm8', 'atomic');
  const { ni, nf } = inp;
  if (!Number.isInteger(ni) || !Number.isInteger(nf) || ni < 1 || nf < 1) return err(sol, 'Principal quantum numbers must be whole numbers ≥ 1 (n = 1, 2, 3 …).');
  if (ni === nf) return err(sol, 'The initial and final levels are the same — no transition.');
  const emission = ni > nf;
  const upper = Math.max(ni, nf);
  const lower = Math.min(ni, nf);
  sol.given.push({ symbolLatex: 'n_i', name: 'Initial level', raw: String(ni), valueSI: ni, quantity: 'count', unit: '' }, { symbolLatex: 'n_f', name: 'Final level', raw: String(nf), valueSI: nf, quantity: 'count', unit: '' });
  sol.find.push({ symbolLatex: '\\Delta E,\\ f,\\ \\lambda', name: 'Photon energy, frequency and wavelength' });
  const Ei = levelEnergy(ni);
  const Ef = levelEnergy(nf);
  const dE = Math.abs(Ei - Ef);
  sol.steps.push(mkStep('Step 1 — Energy levels (Bohr model)', 'E_n = -\\frac{13.6\\ \\text{eV}}{n^2}', {
    lines: [`E_{${ni}} = -\\frac{13.6}{${ni}^2} = ${fmtLatex(Ei / EV, 4)}\\ \\text{eV}`, `E_{${nf}} = -\\frac{13.6}{${nf}^2} = ${fmtLatex(Ef / EV, 4)}\\ \\text{eV}`],
    resultLatex: `E_{${ni}} = ${fmtLatex(Ei / EV, 4)}\\ \\text{eV},\\ E_{${nf}} = ${fmtLatex(Ef / EV, 4)}\\ \\text{eV}`,
  }));
  sol.steps.push(mkStep(`Step 2 — Photon energy (${emission ? 'emitted' : 'absorbed'})`, '\\Delta E = |E_i - E_f|', {
    substitutionLatex: `\\Delta E = |${fmtLatex(Ei / EV, 4)} - (${fmtLatex(Ef / EV, 4)})|`,
    resultLatex: `\\Delta E = ${fmtLatex(dE / EV, sf)}\\ \\text{eV} = ${L(dE, 'energy', sf)}`,
    note: '1 eV = 1.602 × 10⁻¹⁹ J',
  }));
  const f = dE / h;
  sol.steps.push(mkStep('Step 3 — Frequency', 'E = hf', { rearrangedLatex: 'f = \\frac{E}{h}', substitutionLatex: `f = \\frac{${fmtLatex(dE, 4)}}{${fmtLatex(h, 4)}}`, resultLatex: `f = ${L(f, 'frequency', sf)}` }));
  const lamE = c / f;
  sol.steps.push(mkStep('Step 4 — Wavelength', 'c = f\\lambda', { rearrangedLatex: '\\lambda = \\frac{c}{f}', substitutionLatex: `\\lambda = \\frac{${fmtLatex(c, 3)}}{${fmtLatex(f, 4)}}`, resultLatex: `\\lambda = ${L(lamE, 'wavelength', sf)} = ${LU(lamE, 'nm', sf)}` }));
  const inv = R * (1 / (lower * lower) - 1 / (upper * upper));
  const lamR = 1 / inv;
  sol.steps.push(mkStep('Check — Rydberg equation (formulae sheet)', '\\frac{1}{\\lambda} = R\\left(\\frac{1}{n_f^2} - \\frac{1}{n_i^2}\\right)', {
    substitutionLatex: `\\frac{1}{\\lambda} = ${fmtLatex(R, 4)}\\left(\\frac{1}{${lower}^2} - \\frac{1}{${upper}^2}\\right) = ${fmtLatex(inv, 4)}\\ \\text{m}^{-1}`,
    resultLatex: `\\lambda = ${L(lamR, 'wavelength', sf)} = ${LU(lamR, 'nm', sf)}`,
    note: 'the two methods agree to within rounding of the data-sheet constants',
    explanation: 'For absorption use the same equation with n_f the lower level.',
  }));
  const series = SERIES[lower];
  final(sol, { symbolLatex: '\\Delta E', name: `Photon energy (${emission ? 'emitted' : 'absorbed'})`, valueSI: dE, quantity: 'energyAtomic' });
  final(sol, { symbolLatex: 'f', name: 'Frequency', valueSI: f, quantity: 'frequency' });
  final(sol, { symbolLatex: '\\lambda', name: 'Wavelength (Rydberg)', valueSI: lamR, quantity: 'wavelength', direction: `${series ? `${series} series; ` : ''}${region(lamR)}` });
  sol.explanation.push(emission ? `An electron falling from n = ${ni} to n = ${nf} emits one photon carrying the energy difference.` : `An electron can only absorb a photon with exactly the energy difference to jump from n = ${ni} to n = ${nf}.`);
  // energy-level diagram as a graph (levels vs n)
  const pts: [number, number][] = [];
  for (let n = 1; n <= Math.max(6, upper); n++) pts.push([n, levelEnergy(n) / EV]);
  sol.graph = { title: 'Hydrogen energy levels', xLabel: 'n', yLabel: 'Eₙ (eV)', series: [{ label: 'Eₙ = −13.6/n² eV', points: pts }], markers: [{ x: ni, y: Ei / EV, label: `n = ${ni}` }, { x: nf, y: Ef / EV, label: `n = ${nf}` }] };
  sol.ok = true;
  return sol;
}

/** All lines of a series up to n_max (useful table). */
export function seriesTable(nf: number, nMax = 7): { ni: number; lambda: number; region: string }[] {
  const out: { ni: number; lambda: number; region: string }[] = [];
  for (let ni = nf + 1; ni <= nMax; ni++) {
    const lam = 1 / (R * (1 / (nf * nf) - 1 / (ni * ni)));
    out.push({ ni, lambda: lam, region: region(lam) });
  }
  return out;
}
