/**
 * Materials tools: iron–carbon lever rule and tensile-test data analysis.
 */
import { fmtLatex } from '../format';
import { emptySolution, Solution } from '../solution';

const f = (x: number) => fmtLatex(x, 4);

export interface LeverRuleInput {
  C0: number; // wt % carbon of the steel
  eutectoid?: number; // default 0.8 (HSC texts use 0.8 %; some use 0.77 %)
  ferriteMax?: number; // default 0.025 %
  cementite?: number; // default 6.67 %
}

/** Phase proportions of a slowly cooled plain carbon steel just below the eutectoid temperature (727 °C). */
export function leverRuleSolution(inp: LeverRuleInput): Solution {
  const sol = emptySolution('Iron–carbon lever rule');
  sol.module = 'transport';
  sol.topic = 'Heat treatment of ferrous metals';
  const E = inp.eutectoid ?? 0.8;
  const a = inp.ferriteMax ?? 0.025;
  const cm = inp.cementite ?? 6.67;
  const C = inp.C0;
  if (!(C >= 0) || C > 2.0) {
    sol.issues.push({ level: 'error', message: 'Steel has between 0 and ~2.0 % carbon (above that it is cast iron).' });
    return sol;
  }
  sol.given.push({ symbolLatex: 'C_0', name: 'Carbon content of the steel', raw: `${C} % C`, valueSI: C, quantity: 'dimensionless', unit: '' });
  sol.conversions.push(`\\text{Eutectoid} = ${E}\\%\\text{C},\\ \\text{max C in ferrite} = ${a}\\%,\\ \\text{cementite (Fe}_3\\text{C)} = ${cm}\\%\\text{C}`);
  const rows: string[][] = [];
  if (C <= a) {
    sol.steps.push({ title: 'Structure', formulaLatex: `C_0 \\le ${a}\\%`, resultLatex: '100\\%\\ \\text{ferrite}' });
    sol.finals.push({ symbolLatex: '\\alpha', name: 'Ferrite', valueSI: 1, quantity: 'percent' });
    sol.ok = true;
    return sol;
  }
  if (C < E) {
    const pearlite = (C - a) / (E - a);
    sol.steps.push({
      title: 'Step 1 — Hypoeutectoid steel: pro-eutectoid ferrite + pearlite (lever rule)',
      formulaLatex: '\\%\\text{Pearlite} = \\frac{C_0 - C_\\alpha}{C_{eut} - C_\\alpha} \\times 100\\%',
      substitutionLatex: `\\%\\text{Pearlite} = \\frac{${f(C)} - ${f(a)}}{${f(E)} - ${f(a)}} \\times 100\\%`,
      resultLatex: `\\%\\text{Pearlite} = ${f(pearlite * 100)}\\%,\\quad \\%\\text{Ferrite (pro-eutectoid)} = ${f((1 - pearlite) * 100)}\\%`,
      explanation: 'The lever rule: the fraction of a phase equals the length of the opposite lever arm divided by the total tie-line length.',
    });
    sol.finals.push({ symbolLatex: '\\text{Pearlite}', name: 'Pearlite', valueSI: pearlite, quantity: 'percent' }, { symbolLatex: '\\alpha_{pro}', name: 'Pro-eutectoid ferrite', valueSI: 1 - pearlite, quantity: 'percent' });
    rows.push(['Pearlite', f(pearlite * 100)], ['Pro-eutectoid ferrite', f((1 - pearlite) * 100)]);
  } else if (Math.abs(C - E) < 1e-9) {
    sol.steps.push({ title: 'Eutectoid steel', formulaLatex: `C_0 = ${E}\\%`, resultLatex: '100\\%\\ \\text{pearlite}' });
    sol.finals.push({ symbolLatex: '\\text{Pearlite}', name: 'Pearlite', valueSI: 1, quantity: 'percent' });
    rows.push(['Pearlite', '100']);
  } else {
    const pearlite = (cm - C) / (cm - E);
    sol.steps.push({
      title: 'Step 1 — Hypereutectoid steel: pro-eutectoid cementite + pearlite (lever rule)',
      formulaLatex: '\\%\\text{Pearlite} = \\frac{C_{Fe_3C} - C_0}{C_{Fe_3C} - C_{eut}} \\times 100\\%',
      substitutionLatex: `\\%\\text{Pearlite} = \\frac{${f(cm)} - ${f(C)}}{${f(cm)} - ${f(E)}} \\times 100\\%`,
      resultLatex: `\\%\\text{Pearlite} = ${f(pearlite * 100)}\\%,\\quad \\%\\text{Cementite (pro-eutectoid)} = ${f((1 - pearlite) * 100)}\\%`,
    });
    sol.finals.push({ symbolLatex: '\\text{Pearlite}', name: 'Pearlite', valueSI: pearlite, quantity: 'percent' }, { symbolLatex: 'Fe_3C_{pro}', name: 'Pro-eutectoid cementite', valueSI: 1 - pearlite, quantity: 'percent' });
    rows.push(['Pearlite', f(pearlite * 100)], ['Pro-eutectoid cementite', f((1 - pearlite) * 100)]);
  }
  const alphaTotal = (cm - C) / (cm - a);
  sol.steps.push({
    title: 'Step 2 — Total phases (ferrite and cementite)',
    formulaLatex: '\\%\\alpha_{total} = \\frac{C_{Fe_3C} - C_0}{C_{Fe_3C} - C_\\alpha} \\times 100\\%',
    substitutionLatex: `\\%\\alpha = \\frac{${f(cm)} - ${f(C)}}{${f(cm)} - ${f(a)}} \\times 100\\%`,
    resultLatex: `\\%\\alpha = ${f(alphaTotal * 100)}\\%,\\quad \\%Fe_3C = ${f((1 - alphaTotal) * 100)}\\%`,
  });
  sol.finals.push({ symbolLatex: '\\alpha_{total}', name: 'Total ferrite', valueSI: alphaTotal, quantity: 'percent' }, { symbolLatex: 'Fe_3C_{total}', name: 'Total cementite', valueSI: 1 - alphaTotal, quantity: 'percent' });
  rows.push(['Total ferrite (α)', f(alphaTotal * 100)], ['Total cementite (Fe₃C)', f((1 - alphaTotal) * 100)]);
  sol.tables = [{ title: 'Microstructure just below 727 °C (slow cooling)', headers: ['Constituent', '%'], rows }];
  sol.ok = true;
  return sol;
}

export interface TensileInput {
  L0: number; // m gauge length
  A0: number; // m²
  data: { F: number; dL: number }[]; // N, m
  linearPoints?: number; // number of initial points used for E
  Lf?: number; // final gauge length
  Af?: number; // final area
  yieldLoad?: number; // N
  fos?: number;
}

export function tensileSolution(inp: TensileInput): Solution {
  const sol = emptySolution('Tensile test analysis');
  sol.module = 'civil';
  sol.topic = 'Material testing';
  if (!(inp.L0 > 0) || !(inp.A0 > 0)) sol.issues.push({ level: 'error', message: 'Gauge length and area must be positive.' });
  if (inp.data.length < 2) sol.issues.push({ level: 'error', message: 'Enter at least two load–extension points.' });
  if (sol.issues.length) return sol;
  const pts = inp.data.map((d) => ({ ...d, s: d.F / inp.A0, e: d.dL / inp.L0 }));
  sol.diagram = { kind: 'stressStrain', points: pts };
  sol.given.push({ symbolLatex: 'L_0', name: 'Gauge length', raw: `${f(inp.L0 * 1000)} mm`, valueSI: inp.L0, quantity: 'length', unit: 'mm' }, { symbolLatex: 'A_0', name: 'Original area', raw: `${f(inp.A0 * 1e6)} mm²`, valueSI: inp.A0, quantity: 'area', unit: 'mm²' });
  sol.tables = [{ title: 'Stress–strain data', headers: ['F (kN)', 'ΔL (mm)', 'σ = F/A₀ (MPa)', 'ε = ΔL/L₀'], rows: pts.map((p) => [f(p.F / 1000), f(p.dL * 1000), f(p.s / 1e6), f(p.e)]) }];
  const n = Math.min(Math.max(2, inp.linearPoints ?? Math.min(3, pts.length)), pts.length);
  const lin = pts.slice(0, n);
  // least squares through origin: E = Σσε / Σε²
  const E = lin.reduce((s, p) => s + p.s * p.e, 0) / lin.reduce((s, p) => s + p.e * p.e, 0);
  sol.steps.push({
    title: `Step 1 — Young's modulus from the linear (elastic) region (first ${n} points)`,
    formulaLatex: 'E = \\frac{\\sigma}{\\varepsilon} = \\text{gradient of the elastic region}',
    workingLatex: lin.map((p) => `\\frac{${f(p.s / 1e6)}\\ \\text{MPa}}{${f(p.e)}} = ${f(p.s / p.e / 1e9)}\\ \\text{GPa}`),
    resultLatex: `E = ${f(E / 1e9)}\\ \\text{GPa} \\text{ (best-fit gradient through the origin)}`,
  });
  sol.finals.push({ symbolLatex: 'E', name: "Young's modulus", valueSI: E, quantity: 'modulus' });
  const maxP = pts.reduce((m, p) => (p.F > m.F ? p : m), pts[0]);
  const uts = maxP.F / inp.A0;
  sol.steps.push({ title: 'Step 2 — Ultimate tensile strength', formulaLatex: '\\sigma_{UTS} = \\frac{F_{max}}{A_0}', substitutionLatex: `\\sigma_{UTS} = \\frac{${f(maxP.F)}\\ \\text{N}}{${f(inp.A0)}\\ \\text{m}^2}`, resultLatex: `\\sigma_{UTS} = ${f(uts / 1e6)}\\ \\text{MPa}` });
  sol.finals.push({ symbolLatex: '\\sigma_{UTS}', name: 'Ultimate tensile strength', valueSI: uts, quantity: 'stress' });
  if (inp.yieldLoad) {
    const sy = inp.yieldLoad / inp.A0;
    sol.steps.push({ title: 'Step 3 — Yield stress', formulaLatex: '\\sigma_y = \\frac{F_y}{A_0}', substitutionLatex: `\\sigma_y = \\frac{${f(inp.yieldLoad)}}{${f(inp.A0)}}`, resultLatex: `\\sigma_y = ${f(sy / 1e6)}\\ \\text{MPa}` });
    sol.finals.push({ symbolLatex: '\\sigma_y', name: 'Yield stress', valueSI: sy, quantity: 'stress' });
  }
  if (inp.Lf) {
    const el = (inp.Lf - inp.L0) / inp.L0;
    sol.steps.push({ title: 'Percentage elongation', formulaId: 'pctElong', formulaLatex: '\\%El = \\frac{L_f - L_0}{L_0} \\times 100', substitutionLatex: `\\%El = \\frac{${f(inp.Lf * 1000)} - ${f(inp.L0 * 1000)}}{${f(inp.L0 * 1000)}} \\times 100`, resultLatex: `\\%El = ${f(el * 100)}\\%` });
    sol.finals.push({ symbolLatex: '\\%El', name: 'Percentage elongation', valueSI: el, quantity: 'percent' });
  }
  if (inp.Af) {
    const ra = (inp.A0 - inp.Af) / inp.A0;
    sol.steps.push({ title: 'Percentage reduction in area', formulaId: 'pctRA', formulaLatex: '\\%RA = \\frac{A_0 - A_f}{A_0} \\times 100', substitutionLatex: `\\%RA = \\frac{${f(inp.A0 * 1e6)} - ${f(inp.Af * 1e6)}}{${f(inp.A0 * 1e6)}} \\times 100`, resultLatex: `\\%RA = ${f(ra * 100)}\\%` });
    sol.finals.push({ symbolLatex: '\\%RA', name: 'Reduction in area', valueSI: ra, quantity: 'percent' });
  }
  if (inp.fos && inp.fos > 0) {
    const sw = uts / inp.fos;
    sol.steps.push({ title: 'Allowable working stress', formulaId: 'fosUts', formulaLatex: '\\sigma_w = \\frac{\\sigma_{UTS}}{FoS}', substitutionLatex: `\\sigma_w = \\frac{${f(uts / 1e6)}\\ \\text{MPa}}{${f(inp.fos)}}`, resultLatex: `\\sigma_w = ${f(sw / 1e6)}\\ \\text{MPa}` });
    sol.finals.push({ symbolLatex: '\\sigma_w', name: 'Allowable working stress', valueSI: sw, quantity: 'stress' });
  }
  sol.ok = true;
  return sol;
}
