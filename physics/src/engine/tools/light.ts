/**
 * Module 7 tools: photoelectric analyser, interference / diffraction-grating analyser and
 * black-body (Wien) analyser — each gives full multi-step working and a graph of the real
 * relationship.
 */
import { NESA } from '../constants';
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { region } from './atomic';
import { B, DEG, err, final, given, L, LU, mkStep, newSolution, Qty, rawOf, si, trackSF } from './common';

const h = NESA.h.value;
const c = NESA.c.value;
const e = NESA.e.value;
const me = NESA.me.value;
const b = NESA.b.value;

// ───────────────────────── photoelectric ─────────────────────────

export interface PhotoInput {
  phi?: Qty;
  f0?: Qty;
  lambda0?: Qty;
  f?: Qty;
  lambda?: Qty;
  /** measured stopping voltage (to find φ) */
  Vs?: Qty;
}

export function solvePhotoelectric(inp: PhotoInput, sf = 4): Solution {
  const sol = newSolution('Photoelectric effect', 'm7', 'photoelectric');
  const iss = sol.issues;
  let phi = si(inp.phi, 'energyAtomic', 'Work function', iss);
  let f = si(inp.f, 'frequency', 'Frequency', iss);
  const lam = si(inp.lambda, 'wavelength', 'Wavelength', iss);
  const f0in = si(inp.f0, 'frequency', 'Threshold frequency', iss);
  const l0in = si(inp.lambda0, 'wavelength', 'Threshold wavelength', iss);
  const Vs = si(inp.Vs, 'voltage', 'Stopping voltage', iss);
  if (iss.some((i) => i.level === 'error')) return sol;
  trackSF(sol, inp.phi, inp.f, inp.lambda, inp.f0, inp.lambda0, inp.Vs);
  given(sol, 'h', 'Planck constant', '6.626 × 10⁻³⁴ J s', h, 'planck', '', true, 'NESA data sheet');
  if (phi !== undefined) given(sol, '\\phi', 'Work function', rawOf(inp.phi!), phi, 'energyAtomic', inp.phi!.unit);
  if (f !== undefined) given(sol, 'f', 'Frequency of light', rawOf(inp.f!), f, 'frequency', inp.f!.unit);
  if (lam !== undefined) given(sol, '\\lambda', 'Wavelength of light', rawOf(inp.lambda!), lam, 'wavelength', inp.lambda!.unit);
  if (f0in !== undefined) given(sol, 'f_0', 'Threshold frequency', rawOf(inp.f0!), f0in, 'frequency', inp.f0!.unit);
  if (l0in !== undefined) given(sol, '\\lambda_0', 'Threshold wavelength', rawOf(inp.lambda0!), l0in, 'wavelength', inp.lambda0!.unit);
  if (Vs !== undefined) given(sol, 'V_s', 'Stopping voltage', rawOf(inp.Vs!), Vs, 'voltage', inp.Vs!.unit);
  let step = 1;
  const S = () => `Step ${step++}`;
  if (f === undefined && lam !== undefined) {
    f = c / lam;
    sol.steps.push(mkStep(`${S()} — Frequency of the light`, 'c = f\\lambda', { rearrangedLatex: 'f = \\frac{c}{\\lambda}', substitutionLatex: `f = \\frac{${fmtLatex(c, 3)}}{${fmtLatex(lam, 4)}}`, resultLatex: `f = ${L(f, 'frequency', sf)}` }));
  }
  let Ep: number | undefined;
  if (f !== undefined) {
    Ep = h * f;
    sol.steps.push(mkStep(`${S()} — Photon energy`, 'E = hf', { substitutionLatex: `E = ${fmtLatex(h, 4)} \\times ${fmtLatex(f, 4)}`, resultLatex: `E = ${L(Ep, 'energyAtomic', sf)} = ${LU(Ep, 'eV', sf)}` }));
    final(sol, { symbolLatex: 'E', name: 'Photon energy', valueSI: Ep, quantity: 'energyAtomic' });
  }
  if (phi === undefined && f0in !== undefined) {
    phi = h * f0in;
    sol.steps.push(mkStep(`${S()} — Work function from the threshold frequency`, '\\phi = hf_0', { substitutionLatex: `\\phi = ${fmtLatex(h, 4)} \\times ${fmtLatex(f0in, 4)}`, resultLatex: `\\phi = ${L(phi, 'energyAtomic', sf)} = ${LU(phi, 'eV', sf)}` }));
  } else if (phi === undefined && l0in !== undefined) {
    phi = (h * c) / l0in;
    sol.steps.push(mkStep(`${S()} — Work function from the threshold wavelength`, '\\phi = \\frac{hc}{\\lambda_0}', { substitutionLatex: `\\phi = \\frac{${fmtLatex(h, 4)} \\times ${fmtLatex(c, 3)}}{${fmtLatex(l0in, 4)}}`, resultLatex: `\\phi = ${L(phi, 'energyAtomic', sf)} = ${LU(phi, 'eV', sf)}` }));
  } else if (phi === undefined && Vs !== undefined && Ep !== undefined) {
    const K = e * Vs;
    phi = Ep - K;
    sol.steps.push(mkStep(`${S()} — Kmax from the stopping voltage`, 'K_{max} = qV_s', { substitutionLatex: `K_{max} = ${fmtLatex(e, 4)} \\times ${fmtLatex(Vs, 4)}`, resultLatex: `K_{max} = ${L(K, 'energyAtomic', sf)}` }));
    sol.steps.push(mkStep(`${S()} — Work function`, 'K_{max} = hf - \\phi', { rearrangedLatex: '\\phi = hf - K_{max}', substitutionLatex: `\\phi = ${fmtLatex(Ep, 4)} - ${fmtLatex(K, 4)}`, resultLatex: `\\phi = ${L(phi, 'energyAtomic', sf)} = ${LU(phi, 'eV', sf)}` }));
    final(sol, { symbolLatex: '\\phi', name: 'Work function', valueSI: phi, quantity: 'energyAtomic' });
  }
  if (phi === undefined) {
    if (Ep === undefined) return err(sol, 'Give the frequency or wavelength of the light and the work function (or threshold frequency/wavelength) of the metal.');
    sol.issues.push({ level: 'warning', message: 'No work function given — only the photon energy can be found.' });
    sol.ok = true;
    return sol;
  }
  const f0 = phi / h;
  const l0 = c / f0;
  if (f0in === undefined) sol.steps.push(mkStep(`${S()} — Threshold frequency and wavelength`, 'f_0 = \\frac{\\phi}{h},\\quad \\lambda_0 = \\frac{c}{f_0}', { lines: [`f_0 = \\frac{${fmtLatex(phi, 4)}}{${fmtLatex(h, 4)}} = ${L(f0, 'frequency', sf)}`, `\\lambda_0 = \\frac{${fmtLatex(c, 3)}}{${fmtLatex(f0, 4)}} = ${L(l0, 'wavelength', sf)} = ${LU(l0, 'nm', sf)}`], resultLatex: `f_0 = ${L(f0, 'frequency', sf)}` }));
  final(sol, { symbolLatex: 'f_0', name: 'Threshold frequency', valueSI: f0, quantity: 'frequency' });
  final(sol, { symbolLatex: '\\lambda_0', name: 'Threshold (maximum) wavelength', valueSI: l0, quantity: 'wavelength', direction: region(l0) });
  if (Ep !== undefined && Vs === undefined) {
    const K = Ep - phi;
    if (K < 0) {
      sol.steps.push(mkStep(`${S()} — Compare photon energy with the work function`, 'hf \\text{ vs } \\phi', { lines: [`hf = ${LU(Ep, 'eV', sf)} < \\phi = ${LU(phi, 'eV', sf)}`], resultLatex: '\\text{No photoelectrons are emitted}' }));
      sol.issues.push({ level: 'warning', message: `The photon energy (${fmtLatex(Ep / e, 3)} eV) is less than the work function (${fmtLatex(phi / e, 3)} eV): NO electrons are emitted, however intense the light. f < f₀.` });
    } else {
      sol.steps.push(mkStep(`${S()} — Maximum kinetic energy`, 'K_{max} = hf - \\phi', { substitutionLatex: `K_{max} = ${fmtLatex(Ep, 4)} - ${fmtLatex(phi, 4)}`, resultLatex: `K_{max} = ${L(K, 'energyAtomic', sf)} = ${LU(K, 'eV', sf)}` }));
      const V = K / e;
      sol.steps.push(mkStep(`${S()} — Stopping voltage`, 'K_{max} = qV_s', { rearrangedLatex: 'V_s = \\frac{K_{max}}{q}', substitutionLatex: `V_s = \\frac{${fmtLatex(K, 4)}}{${fmtLatex(e, 4)}}`, resultLatex: `V_s = ${L(V, 'voltage', sf)}` }));
      const vmax = Math.sqrt((2 * K) / me);
      sol.steps.push(mkStep(`${S()} — Maximum speed of the photoelectrons`, 'K_{max} = \\tfrac{1}{2}m_ev^2', { rearrangedLatex: 'v = \\sqrt{\\frac{2K_{max}}{m_e}}', substitutionLatex: `v = \\sqrt{\\frac{2 \\times ${fmtLatex(K, 4)}}{${fmtLatex(me, 4)}}}`, resultLatex: `v = ${L(vmax, 'velocity', sf)}` }));
      final(sol, { symbolLatex: 'K_{max}', name: 'Maximum kinetic energy', valueSI: K, quantity: 'energyAtomic' });
      final(sol, { symbolLatex: 'V_s', name: 'Stopping voltage', valueSI: V, quantity: 'voltage' });
      final(sol, { symbolLatex: 'v_{max}', name: 'Maximum speed of photoelectrons', valueSI: vmax, quantity: 'velocity' });
    }
  }
  const fMax = Math.max(f ?? 0, f0) * 1.8;
  sol.graph = {
    title: 'Kmax vs frequency (gradient = h, x-intercept = f₀, y-intercept = −φ)',
    xLabel: 'f (Hz)',
    yLabel: 'Kmax (eV)',
    series: [{ label: 'Kmax = hf − φ', points: [[f0, 0], [fMax, (h * fMax - phi) / e]] }, { label: 'extrapolation', points: [[0, -phi / e], [f0, 0]], dashed: true }],
    markers: [{ x: f0, y: 0, label: 'f₀' }, ...(f !== undefined && Ep! > phi ? [{ x: f, y: (Ep! - phi) / e, label: 'this light' }] : [])],
    yZero: true,
  };
  sol.explanation.push('One photon ejects at most one electron. Increasing intensity increases the number of photoelectrons, not Kmax. Kmax depends only on frequency.');
  sol.ok = true;
  return sol;
}

// ───────────────────────── interference / grating ─────────────────────────

export interface InterferenceInput {
  kind: 'double' | 'grating';
  lambda?: Qty;
  d?: Qty;
  linesPer?: Qty;
  L?: Qty;
  /** measured: angle or position of a given order (to find λ) */
  order?: number;
  angle?: Qty;
  y?: Qty;
  fringeSpacing?: Qty;
}

export function solveInterference(inp: InterferenceInput, sf = 4): Solution {
  const sol = newSolution(inp.kind === 'grating' ? 'Diffraction grating' : 'Young’s double slit', 'm7', 'interference');
  const iss = sol.issues;
  let lam = si(inp.lambda, 'wavelength', 'Wavelength', iss);
  let d = si(inp.d, 'length', 'Slit separation', iss);
  const N = si(inp.linesPer, 'lineDensity', 'Lines per unit length', iss);
  const Ls = si(inp.L, 'length', 'Screen distance', iss);
  const th = si(inp.angle, 'angle', 'Angle', iss);
  const y = si(inp.y, 'length', 'Fringe position', iss);
  const dy = si(inp.fringeSpacing, 'length', 'Fringe spacing', iss);
  if (iss.some((i) => i.level === 'error')) return sol;
  trackSF(sol, inp.lambda, inp.d, inp.linesPer, inp.L, inp.angle, inp.y, inp.fringeSpacing);
  if (lam !== undefined) given(sol, '\\lambda', 'Wavelength', rawOf(inp.lambda!), lam, 'wavelength', inp.lambda!.unit);
  if (d !== undefined) given(sol, 'd', 'Slit separation', rawOf(inp.d!), d, 'length', inp.d!.unit);
  if (N !== undefined) given(sol, 'N', 'Grating lines per unit length', rawOf(inp.linesPer!), N, 'lineDensity', inp.linesPer!.unit);
  if (Ls !== undefined) given(sol, 'L', 'Distance to screen', rawOf(inp.L!), Ls, 'length', inp.L!.unit);
  if (th !== undefined) given(sol, '\\theta', `Angle of order m = ${inp.order ?? 1}`, rawOf(inp.angle!), th, 'angle', '°');
  if (y !== undefined) given(sol, 'y', `Position of order m = ${inp.order ?? 1} on the screen`, rawOf(inp.y!), y, 'length', inp.y!.unit);
  if (dy !== undefined) given(sol, '\\Delta y', 'Fringe spacing', rawOf(inp.fringeSpacing!), dy, 'length', inp.fringeSpacing!.unit);
  let step = 1;
  const S = () => `Step ${step++}`;
  if (d === undefined && N !== undefined) {
    d = 1 / N;
    sol.steps.push(mkStep(`${S()} — Grating spacing`, 'd = \\frac{1}{N}', { substitutionLatex: `d = \\frac{1}{${fmtLatex(N, 4)}\\ \\text{lines m}^{-1}}`, resultLatex: `d = ${L(d, 'length', sf)}`, explanation: 'Convert lines per mm (or cm) to lines per metre first: 600 lines/mm = 6.00 × 10⁵ lines/m.' }));
  }
  if (d === undefined) return err(sol, 'The slit separation d (or the grating’s lines per mm) is required.');
  const m = inp.order ?? 1;
  if (lam === undefined) {
    let sinT: number | undefined;
    if (th !== undefined) sinT = Math.sin(th);
    else if (y !== undefined && Ls !== undefined) {
      const t = Math.atan(y / Ls);
      sinT = Math.sin(t);
      sol.steps.push(mkStep(`${S()} — Angle from the screen geometry`, '\\tan\\theta = \\frac{y}{L}', { substitutionLatex: `\\theta = \\tan^{-1}\\left(\\frac{${fmtLatex(y, 4)}}{${fmtLatex(Ls, 4)}}\\right)`, resultLatex: `\\theta = ${fmtLatex(t / DEG, sf)}^{\\circ}` }));
    } else if (dy !== undefined && Ls !== undefined) {
      lam = (dy * d) / Ls;
      sol.steps.push(mkStep(`${S()} — Wavelength from the fringe spacing (small angle)`, '\\Delta y = \\frac{\\lambda L}{d}', { rearrangedLatex: '\\lambda = \\frac{\\Delta y\\, d}{L}', substitutionLatex: `\\lambda = \\frac{${fmtLatex(dy, 4)} \\times ${fmtLatex(d, 4)}}{${fmtLatex(Ls, 4)}}`, resultLatex: `\\lambda = ${L(lam, 'wavelength', sf)} = ${LU(lam, 'nm', sf)}` }));
      if (dy / Ls > Math.tan(10 * DEG)) iss.push({ level: 'warning', message: 'The fringes are widely spaced relative to L — the small-angle approximation is not accurate here.' });
    }
    if (lam === undefined) {
      if (sinT === undefined) return err(sol, 'Give the wavelength, or a measured angle / fringe position / fringe spacing to find it.');
      lam = (d * sinT) / m;
      sol.steps.push(mkStep(`${S()} — Wavelength`, 'd\\sin\\theta = m\\lambda', { rearrangedLatex: '\\lambda = \\frac{d\\sin\\theta}{m}', substitutionLatex: `\\lambda = \\frac{${fmtLatex(d, 4)} \\times ${fmtLatex(sinT, 4)}}{${m}}`, resultLatex: `\\lambda = ${L(lam, 'wavelength', sf)} = ${LU(lam, 'nm', sf)}` }));
    }
    final(sol, { symbolLatex: '\\lambda', name: 'Wavelength', valueSI: lam, quantity: 'wavelength', direction: region(lam) });
  }
  const mMax = Math.floor(d / lam + 1e-9);
  const rows: string[][] = [];
  const angles: number[] = [];
  for (let k = 1; k <= Math.min(mMax, 6); k++) {
    const t = Math.asin((k * lam) / d);
    angles.push(t);
    const pos = Ls !== undefined ? Ls * Math.tan(t) : NaN;
    const approx = Ls !== undefined ? (k * lam * Ls) / d : NaN;
    rows.push([String(k), `${fmtLatex(t / DEG, sf)}°`, Ls !== undefined ? `${fmtLatex(pos, sf)} m` : '—', Ls !== undefined ? `${fmtLatex(approx, sf)} m` : '—']);
  }
  if (mMax < 1) return err(sol, `d = ${fmtLatex(d, 3)} m is smaller than λ, so no first-order maximum exists (sin θ would exceed 1).`);
  const t1 = angles[0];
  const mm = Math.min(m, mMax);
  const tm = angles[mm - 1] ?? Math.asin((mm * lam) / d);
  sol.steps.push(mkStep(`${S()} — Angle of the order-${mm} maximum`, 'd\\sin\\theta = m\\lambda', { rearrangedLatex: '\\theta = \\sin^{-1}\\left(\\frac{m\\lambda}{d}\\right)', substitutionLatex: `\\theta = \\sin^{-1}\\left(\\frac{${mm} \\times ${fmtLatex(lam, 4)}}{${fmtLatex(d, 4)}}\\right)`, resultLatex: `\\theta_{${mm}} = ${fmtLatex(tm / DEG, sf)}^{\\circ}` }));
  final(sol, { symbolLatex: `\\theta_${mm}`, name: `Angle of order ${mm} maximum`, valueSI: tm, quantity: 'angle' });
  if (Ls !== undefined) {
    const pos = Ls * Math.tan(tm);
    const small = tm < 10 * DEG;
    sol.steps.push(mkStep(`${S()} — Position on the screen`, small ? 'y = L\\tan\\theta \\approx \\frac{m\\lambda L}{d}' : 'y = L\\tan\\theta', { substitutionLatex: `y = ${fmtLatex(Ls, 4)} \\tan ${fmtLatex(tm / DEG, 4)}^{\\circ}`, resultLatex: `y = ${L(pos, 'length', sf)}`, note: small ? 'small angle: sin θ ≈ tan θ, so the fringes are (almost) evenly spaced' : 'large angle: the small-angle formula y = mλL/d would be inaccurate here' }));
    final(sol, { symbolLatex: `y_${mm}`, name: `Distance of order ${mm} from the central maximum`, valueSI: pos, quantity: 'length' });
    if (inp.kind === 'double' && t1 < 10 * DEG) {
      const spacing = (lam * Ls) / d;
      sol.steps.push(mkStep(`${S()} — Fringe spacing`, '\\Delta y = \\frac{\\lambda L}{d}', { substitutionLatex: `\\Delta y = \\frac{${fmtLatex(lam, 4)} \\times ${fmtLatex(Ls, 4)}}{${fmtLatex(d, 4)}}`, resultLatex: `\\Delta y = ${L(spacing, 'length', sf)}` }));
      final(sol, { symbolLatex: '\\Delta y', name: 'Fringe spacing', valueSI: spacing, quantity: 'length' });
    }
  }
  sol.steps.push(mkStep(`${S()} — Highest order visible`, 'm_{max} \\le \\frac{d}{\\lambda}', { substitutionLatex: `\\frac{d}{\\lambda} = \\frac{${fmtLatex(d, 4)}}{${fmtLatex(lam, 4)}} = ${fmtLatex(d / lam, 4)}`, resultLatex: `m_{max} = ${mMax}\\ \\Rightarrow\\ ${2 * mMax + 1}\\ \\text{bright maxima in total}` }));
  final(sol, { symbolLatex: 'm_{max}', name: 'Highest order visible', valueSI: mMax, quantity: 'count' });
  sol.tables = [{ title: 'All orders', headers: ['m', 'θ', 'y = L tan θ', 'y ≈ mλL/d'], rows }];
  // intensity pattern positions graph: sin θ vs m
  sol.graph = { title: 'Angle of each bright maximum', xLabel: 'order m', yLabel: 'θ (°)', series: [{ label: 'θ = sin⁻¹(mλ/d)', points: angles.map((a, i) => [i + 1, a / DEG] as [number, number]) }] };
  sol.explanation.push('Bright fringes: path difference d sinθ = mλ (constructive interference). The pattern is evidence for the wave model of light.');
  sol.ok = true;
  return sol;
}

// ───────────────────────── black body ─────────────────────────

export function planck(lam: number, T: number): number {
  const kB = 1.380649e-23;
  return (2 * h * c * c) / lam ** 5 / (Math.exp((h * c) / (lam * kB * T)) - 1);
}

export function blackBodyGraph(temps: number[]): Solution['graph'] {
  const series = temps.map((T) => {
    const pts: [number, number][] = [];
    for (let i = 1; i <= 120; i++) {
      const lam = (i / 120) * 3e-6;
      pts.push([lam * 1e9, planck(lam, T)]);
    }
    const peak = Math.max(...pts.map((p) => p[1]));
    return { label: `${T} K`, points: pts.map(([x, yv]) => [x, yv / peak] as [number, number]) };
  });
  return { title: 'Black-body spectra (each curve scaled to its own peak) — λmax = b/T', xLabel: 'Wavelength (nm)', yLabel: 'Relative intensity', series, markers: temps.map((T) => ({ x: (b / T) * 1e9, y: 1, label: `λmax ${Math.round((b / T) * 1e9)} nm` })) };
}

export function solveWien(inp: { T?: Qty; lambdaMax?: Qty }, sf = 4): Solution {
  const sol = newSolution("Wien's law (black-body radiation)", 'm7', 'quantumLight');
  const T = si(inp.T, 'temperature', 'Temperature', sol.issues);
  const lm = si(inp.lambdaMax, 'wavelength', 'Peak wavelength', sol.issues);
  if (sol.issues.some((i) => i.level === 'error')) return sol;
  given(sol, 'b', "Wien's constant", '2.898 × 10⁻³ m K', b, 'wien', '', true, 'NESA data sheet');
  trackSF(sol, inp.T, inp.lambdaMax);
  let Tk = T;
  if (T !== undefined) {
    given(sol, 'T', 'Temperature', rawOf(inp.T!), T, 'temperature', inp.T!.unit);
    if (inp.T!.unit.includes('C')) sol.conversions.push(`T = ${fmtLatex(inp.T!.value, 6)}\\ ^{\\circ}\\text{C} + 273.15 = ${fmtLatex(T, 6)}\\ \\text{K}`);
    if (T <= 0) return err(sol, 'Absolute temperature must be above 0 K.');
    const l = b / T;
    sol.steps.push(mkStep('Wien’s displacement law', '\\lambda_{max} = \\frac{b}{T}', { substitutionLatex: `\\lambda_{max} = \\frac{${fmtLatex(b, 4)}}{${fmtLatex(T, 4)}}`, resultLatex: `\\lambda_{max} = ${L(l, 'wavelength', sf)} = ${LU(l, 'nm', sf)}` }));
    final(sol, { symbolLatex: '\\lambda_{max}', name: 'Peak wavelength', valueSI: l, quantity: 'wavelength', direction: region(l) });
  } else if (lm !== undefined) {
    given(sol, '\\lambda_{max}', 'Peak wavelength', rawOf(inp.lambdaMax!), lm, 'wavelength', inp.lambdaMax!.unit);
    Tk = b / lm;
    sol.steps.push(mkStep('Wien’s displacement law', '\\lambda_{max} = \\frac{b}{T}', { rearrangedLatex: 'T = \\frac{b}{\\lambda_{max}}', substitutionLatex: `T = \\frac{${fmtLatex(b, 4)}}{${fmtLatex(lm, 4)}}`, resultLatex: `T = ${L(Tk, 'temperature', sf)}` }));
    final(sol, { symbolLatex: 'T', name: 'Surface temperature', valueSI: Tk, quantity: 'temperature' });
  } else return err(sol, 'Give the temperature or the peak wavelength.');
  sol.graph = blackBodyGraph([Math.round(Tk!)]);
  sol.explanation.push('Hotter bodies peak at shorter wavelengths: blue stars are hotter than red stars. Classical physics predicted the “ultraviolet catastrophe”; Planck’s quantised energy (E = hf) explained the curve.');
  sol.ok = true;
  return sol;
}

export { B };
