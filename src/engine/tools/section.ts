/**
 * Section properties of composite shapes built from rectangles (solid or subtracted),
 * using the parallel axis theorem: I = Σ(bh³/12 + A d²). Also centroid/CG of any set of
 * weighted parts (composite areas, aircraft weight & balance).
 */
import { fmtLatex } from '../format';
import { emptySolution, Solution } from '../solution';

export interface Rect {
  name: string;
  b: number; // m
  h: number; // m
  yb: number; // m, bottom edge above datum
  subtract?: boolean;
}

export interface SectionResult {
  A: number;
  ybar: number;
  I: number;
  yTop: number;
  yBottom: number;
  ymax: number;
  Ztop: number;
  Zbottom: number;
}

export function sectionProps(rects: Rect[]): SectionResult {
  let A = 0;
  let Ay = 0;
  for (const r of rects) {
    const s = r.subtract ? -1 : 1;
    const a = r.b * r.h;
    A += s * a;
    Ay += s * a * (r.yb + r.h / 2);
  }
  const ybar = Ay / A;
  let I = 0;
  for (const r of rects) {
    const s = r.subtract ? -1 : 1;
    const a = r.b * r.h;
    const d = r.yb + r.h / 2 - ybar;
    I += s * ((r.b * r.h ** 3) / 12 + a * d * d);
  }
  const top = Math.max(...rects.filter((r) => !r.subtract).map((r) => r.yb + r.h));
  const bottom = Math.min(...rects.filter((r) => !r.subtract).map((r) => r.yb));
  const yTop = top - ybar;
  const yBottom = ybar - bottom;
  return { A, ybar, I, yTop, yBottom, ymax: Math.max(yTop, yBottom), Ztop: I / yTop, Zbottom: I / yBottom };
}

/** Preset shapes (dimensions in metres). */
export const SECTION_PRESETS = {
  rectangle: (b: number, h: number): Rect[] => [{ name: 'Rectangle', b, h, yb: 0 }],
  hollowRect: (B: number, H: number, t: number): Rect[] => [
    { name: 'Outer', b: B, h: H, yb: 0 },
    { name: 'Inner (void)', b: B - 2 * t, h: H - 2 * t, yb: t, subtract: true },
  ],
  iBeam: (bf: number, tf: number, hw: number, tw: number): Rect[] => [
    { name: 'Bottom flange', b: bf, h: tf, yb: 0 },
    { name: 'Web', b: tw, h: hw, yb: tf },
    { name: 'Top flange', b: bf, h: tf, yb: tf + hw },
  ],
  tBeam: (bf: number, tf: number, hw: number, tw: number): Rect[] => [
    { name: 'Web', b: tw, h: hw, yb: 0 },
    { name: 'Flange', b: bf, h: tf, yb: hw },
  ],
  channel: (b: number, h: number, tf: number, tw: number): Rect[] => [
    // channel with web vertical: bending about horizontal axis
    { name: 'Bottom flange', b, h: tf, yb: 0 },
    { name: 'Web', b: tw, h: h - 2 * tf, yb: tf },
    { name: 'Top flange', b, h: tf, yb: h - tf },
  ],
};

const mm = (x: number, sf = 4) => fmtLatex(x * 1e3, sf);
const mm2 = (x: number) => fmtLatex(x * 1e6, 4);
const mm3 = (x: number) => fmtLatex(x * 1e9, 4);
const mm4 = (x: number) => fmtLatex(x * 1e12, 4);

export function sectionSolution(rects: Rect[]): Solution {
  const sol = emptySolution('Section properties (composite)');
  sol.module = 'civil';
  sol.topic = 'Section properties';
  if (!rects.length) {
    sol.issues.push({ level: 'error', message: 'Add at least one rectangle.' });
    return sol;
  }
  for (const r of rects) if (!(r.b > 0 && r.h > 0)) sol.issues.push({ level: 'error', message: `${r.name}: breadth and height must be positive.` });
  if (sol.issues.length) return sol;
  const res = sectionProps(rects);
  if (!(res.A > 0)) {
    sol.issues.push({ level: 'error', message: 'Net area is not positive — subtracted parts are larger than the solid parts (impossible area).' });
    return sol;
  }
  sol.diagram = { kind: 'section', rects, result: res };
  rects.forEach((r) => sol.given.push({ symbolLatex: r.name, name: `${r.subtract ? 'void ' : ''}b × h at y = ${fmtLatex(r.yb * 1e3, 4)} mm`, raw: `${fmtLatex(r.b * 1e3, 4)} × ${fmtLatex(r.h * 1e3, 4)} mm`, valueSI: r.b * r.h, quantity: 'area', unit: 'mm²' }));
  sol.find.push({ symbolLatex: '\\bar{y}', name: 'Neutral axis position' }, { symbolLatex: 'I', name: 'Second moment of area' });
  sol.conversions.push('\\text{Working in mm (1 mm}^4 = 10^{-12}\\ \\text{m}^4\\text{)}');
  const rows = rects.map((r) => {
    const s = r.subtract ? -1 : 1;
    const a = s * r.b * r.h;
    const y = r.yb + r.h / 2;
    const d = y - res.ybar;
    return [r.name + (r.subtract ? ' (−)' : ''), mm2(a), mm(y), mm3(a * y), mm4((s * r.b * r.h ** 3) / 12), mm(d), mm4(a * d * d)];
  });
  sol.tables = [{ title: 'Composite section table (mm units)', headers: ['Part', 'A (mm²)', 'y (mm)', 'A·y (mm³)', 'I_own = bh³/12 (mm⁴)', 'd = y − ȳ (mm)', 'A·d² (mm⁴)'], rows }];
  sol.steps.push({
    title: 'Step 1 — Locate the neutral axis (centroid)',
    formulaLatex: '\\bar{y} = \\frac{\\Sigma A y}{\\Sigma A}',
    substitutionLatex: `\\bar{y} = \\frac{${rects.map((r) => `${r.subtract ? '-' : ''}${mm2(r.b * r.h)} \\times ${mm(r.yb + r.h / 2)}`).join(' + ').replace(/\+ -/g, '- ')}}{${mm2(res.A)}}`,
    resultLatex: `\\bar{y} = ${mm(res.ybar)}\\ \\text{mm (from the base)}`,
    resultSI: res.ybar,
    quantity: 'length',
    explanation: 'The neutral axis passes through the centroid of the cross-section.',
  });
  sol.steps.push({
    title: 'Step 2 — Second moment of area (parallel axis theorem)',
    formulaLatex: 'I = \\Sigma\\left(\\frac{bh^3}{12} + A d^2\\right)',
    substitutionLatex: `I = ${rects.map((r) => { const d = r.yb + r.h / 2 - res.ybar; return `${r.subtract ? '-' : ''}\\left(\\frac{${mm(r.b)} \\times ${mm(r.h)}^3}{12} + ${mm2(r.b * r.h)} \\times ${mm(d)}^2\\right)`; }).join(' + ').replace(/\+ -/g, '- ')}`,
    resultLatex: `I = ${mm4(res.I)}\\ \\text{mm}^4 = ${fmtLatex(res.I, 4)}\\ \\text{m}^4`,
    resultSI: res.I,
    quantity: 'secondMoment',
  });
  sol.steps.push({
    title: 'Step 3 — Extreme fibre distance and section modulus',
    formulaLatex: 'y_{max} = \\max(y_{top}, y_{bottom}), \\quad Z = \\frac{I}{y_{max}}',
    workingLatex: [`y_{top} = ${mm(res.yTop)}\\ \\text{mm},\\quad y_{bottom} = ${mm(res.yBottom)}\\ \\text{mm}`, `Z_{min} = \\frac{${mm4(res.I)}}{${mm(res.ymax)}} = ${mm3(res.I / res.ymax)}\\ \\text{mm}^3`],
    resultLatex: `y_{max} = ${mm(res.ymax)}\\ \\text{mm}`,
  });
  sol.finals.push(
    { symbolLatex: 'A', name: 'Area', valueSI: res.A, quantity: 'area' },
    { symbolLatex: '\\bar{y}', name: 'Neutral axis above base', valueSI: res.ybar, quantity: 'length' },
    { symbolLatex: 'I', name: 'Second moment of area', valueSI: res.I, quantity: 'secondMoment' },
    { symbolLatex: 'y_{max}', name: 'Extreme fibre distance', valueSI: res.ymax, quantity: 'length' },
    { symbolLatex: 'Z', name: 'Section modulus (min)', valueSI: res.I / res.ymax, quantity: 'sectionModulus' },
  );
  sol.ok = true;
  return sol;
}

export interface WeightedPart {
  name: string;
  w: number; // weight, mass or area
  x: number;
  y?: number;
}

export function centroidSolution(parts: WeightedPart[], labels = { w: 'W', unitW: 'N', x: 'x', title: 'Centroid / centre of gravity' }): Solution {
  const sol = emptySolution(labels.title);
  sol.module = 'civil';
  sol.topic = 'Centroids & centre of gravity';
  if (!parts.length) {
    sol.issues.push({ level: 'error', message: 'Add at least one item.' });
    return sol;
  }
  const W = parts.reduce((s, p) => s + p.w, 0);
  if (Math.abs(W) < 1e-15) {
    sol.issues.push({ level: 'error', message: 'Total is zero — cannot divide by zero.' });
    return sol;
  }
  const Mx = parts.reduce((s, p) => s + p.w * p.x, 0);
  const xbar = Mx / W;
  const hasY = parts.some((p) => p.y !== undefined);
  const f = (x: number) => fmtLatex(x, 4);
  parts.forEach((p) => sol.given.push({ symbolLatex: p.name, name: `at x = ${p.x}${hasY ? `, y = ${p.y ?? 0}` : ''}`, raw: `${p.w} ${labels.unitW}`, valueSI: p.w, quantity: 'count', unit: '' }));
  sol.steps.push({
    title: 'Step 1 — Sum of moments about the datum',
    formulaLatex: `\\Sigma ${labels.w}x`,
    substitutionLatex: `\\Sigma ${labels.w}x = ${parts.map((p) => `${f(p.w)} \\times ${f(p.x)}`).join(' + ')} = ${f(Mx)}`,
    resultLatex: `\\Sigma ${labels.w} = ${f(W)}`,
  });
  sol.steps.push({
    title: 'Step 2 — Position of the centroid / CG',
    formulaLatex: `\\bar{x} = \\frac{\\Sigma ${labels.w}x}{\\Sigma ${labels.w}}`,
    substitutionLatex: `\\bar{x} = \\frac{${f(Mx)}}{${f(W)}}`,
    resultLatex: `\\bar{x} = ${f(xbar)}`,
    explanation: 'The resultant acts at the point where its moment equals the sum of the moments of the parts (principle of moments).',
  });
  sol.finals.push({ symbolLatex: '\\bar{x}', name: 'Centroid / CG position from datum (same units as x)', valueSI: xbar, quantity: 'dimensionless' });
  if (hasY) {
    const My = parts.reduce((s, p) => s + p.w * (p.y ?? 0), 0);
    const ybar = My / W;
    sol.steps.push({ title: 'Step 3 — Vertical position', formulaLatex: `\\bar{y} = \\frac{\\Sigma ${labels.w}y}{\\Sigma ${labels.w}}`, substitutionLatex: `\\bar{y} = \\frac{${f(My)}}{${f(W)}}`, resultLatex: `\\bar{y} = ${f(ybar)}` });
    sol.finals.push({ symbolLatex: '\\bar{y}', name: 'Vertical centroid position', valueSI: ybar, quantity: 'dimensionless' });
  }
  sol.finals.push({ symbolLatex: `\\Sigma ${labels.w}`, name: 'Total', valueSI: W, quantity: 'dimensionless' });
  sol.ok = true;
  return sol;
}
