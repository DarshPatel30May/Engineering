/**
 * Module 6 tools: charged particle between parallel plates (deflection, like a projectile),
 * charged particle in a magnetic field (circle, period, direction), Faraday's-law analyser
 * (initial and final flux states + Lenz direction), and power transmission with transformers.
 */
import { NESA } from '../constants';
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { B, DEG, err, final, given, L, LU, mkStep, newSolution, Qty, rawOf, si, trackSF } from './common';
import { ChargeSign, Frame, magneticForceDirection, parseDirection } from './directions';

// ───────────────────────── charged particle between plates ─────────────────────────

export interface PlatesInput {
  q: Qty;
  m: Qty;
  particleName?: string;
  sign: ChargeSign;
  V?: Qty;
  d?: Qty;
  E?: Qty;
  /** speed entering the plates, perpendicular to the field (0 = starts at rest) */
  u?: Qty;
  /** length of the plates (for deflection) */
  plateLength?: Qty;
}

export function solvePlates(inp: PlatesInput, sf = 4): Solution {
  const sol = newSolution('Charged particle in a uniform electric field', 'm6', 'particles');
  const iss = sol.issues;
  const q = Math.abs(si(inp.q, 'charge', 'Charge', iss) ?? NaN);
  const m = si(inp.m, 'mass', 'Mass', iss);
  const V = si(inp.V, 'voltage', 'Voltage', iss);
  const d = si(inp.d, 'length', 'Plate separation', iss);
  let E = si(inp.E, 'efield', 'Electric field', iss);
  const u = si(inp.u, 'velocity', 'Entry speed', iss) ?? 0;
  const Lp = si(inp.plateLength, 'length', 'Plate length', iss);
  if (iss.some((i) => i.level === 'error')) return sol;
  if (!isFinite(q) || m === undefined) return err(sol, 'The charge and mass of the particle are required.');
  trackSF(sol, inp.V, inp.d, inp.E, inp.u, inp.plateLength);
  given(sol, 'q', `Charge (magnitude)${inp.particleName ? ` — ${inp.particleName}` : ''}`, rawOf(inp.q), q, 'charge', inp.q.unit, !!inp.particleName, inp.particleName ? 'NESA data sheet' : undefined);
  given(sol, 'm', `Mass${inp.particleName ? ` — ${inp.particleName}` : ''}`, rawOf(inp.m), m, 'mass', inp.m.unit, !!inp.particleName, inp.particleName ? 'NESA data sheet' : undefined);
  if (V !== undefined) given(sol, 'V', 'Potential difference', rawOf(inp.V!), V, 'voltage', inp.V!.unit);
  if (d !== undefined) given(sol, 'd', 'Plate separation', rawOf(inp.d!), d, 'length', inp.d!.unit);
  if (E !== undefined) given(sol, 'E', 'Electric field strength', rawOf(inp.E!), E, 'efield', inp.E!.unit);
  if (inp.u) given(sol, 'u', 'Speed entering the field (perpendicular to E)', rawOf(inp.u), u, 'velocity', inp.u.unit);
  if (Lp !== undefined) given(sol, 'l', 'Length of the plates', rawOf(inp.plateLength!), Lp, 'length', inp.plateLength!.unit);
  let step = 1;
  const S = () => `Step ${step++}`;
  if (E === undefined) {
    if (V === undefined || d === undefined) return err(sol, 'Give E, or both the voltage V and plate separation d.');
    E = V / d;
    sol.steps.push(mkStep(`${S()} — Electric field between the plates`, 'E = \\frac{V}{d}', { substitutionLatex: `E = \\frac{${fmtLatex(V, 4)}}{${fmtLatex(d, 4)}}`, resultLatex: `E = ${L(E, 'efield', sf)}` }));
  }
  const F = q * E;
  sol.steps.push(mkStep(`${S()} — Electric force`, 'F = qE', { substitutionLatex: `F = ${fmtLatex(q, 4)} \\times ${fmtLatex(E, 4)}`, resultLatex: `F = ${L(F, 'force', sf)}` }));
  const a = F / m;
  sol.steps.push(mkStep(`${S()} — Acceleration`, 'F = ma \\Rightarrow a = \\frac{qE}{m}', { substitutionLatex: `a = \\frac{${fmtLatex(F, 4)}}{${fmtLatex(m, 4)}}`, resultLatex: `a = ${L(a, 'acceleration', sf)}`, explanation: 'Gravity (mg) is negligible compared with qE for subatomic particles.' }));
  final(sol, { symbolLatex: 'E', name: 'Electric field strength', valueSI: E, quantity: 'efield' });
  final(sol, { symbolLatex: 'F', name: 'Electric force', valueSI: F, quantity: 'force', direction: inp.sign === 'positive' ? 'along the field (towards the negative plate)' : 'opposite to the field (towards the positive plate)' });
  final(sol, { symbolLatex: 'a', name: 'Acceleration', valueSI: a, quantity: 'acceleration' });
  const g = NESA.g.value;
  if (m * g > 0.01 * F) iss.push({ level: 'warning', message: `The weight mg = ${fmtLatex(m * g, 3)} N is not negligible compared with qE — include gravity.` });
  if (Lp !== undefined && u > 0) {
    const t = Lp / u;
    const y = 0.5 * a * t * t;
    const vy = a * t;
    const vexit = Math.hypot(u, vy);
    const ang = Math.atan2(vy, u);
    sol.steps.push(mkStep(`${S()} — Time between the plates (constant horizontal speed)`, 't = \\frac{l}{u}', { substitutionLatex: `t = \\frac{${fmtLatex(Lp, 4)}}{${fmtLatex(u, 4)}}`, resultLatex: `t = ${L(t, 'time', sf)}` }));
    sol.steps.push(mkStep(`${S()} — Deflection (like a horizontally launched projectile)`, 's_y = \\tfrac{1}{2}at^2', { substitutionLatex: `s_y = \\tfrac{1}{2} \\times ${fmtLatex(a, 4)} \\times ${B(fmtLatex(t, 4))}^2`, resultLatex: `s_y = ${L(y, 'length', sf)}` }));
    sol.steps.push(mkStep(`${S()} — Velocity leaving the plates`, 'v_y = at,\\quad v = \\sqrt{u^2 + v_y^2}', { lines: [`v_y = ${fmtLatex(a, 4)} \\times ${fmtLatex(t, 4)} = ${L(vy, 'velocity', sf)}`, `v = ${L(vexit, 'velocity', sf)} \\text{ at } ${fmtLatex(ang / DEG, sf)}^{\\circ} \\text{ to the original direction}`], resultLatex: `v = ${L(vexit, 'velocity', sf)}` }));
    if (d !== undefined && y > d / 2) iss.push({ level: 'warning', message: `The deflection (${fmtLatex(y, 3)} m) exceeds half the plate separation — if it entered midway it hits a plate before leaving.` });
    final(sol, { symbolLatex: 's_y', name: 'Deflection while between the plates', valueSI: y, quantity: 'length' });
    final(sol, { symbolLatex: 'v', name: 'Exit speed', valueSI: vexit, quantity: 'velocity', direction: `${fmtLatex(ang / DEG, 3)}° from the original direction` });
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const tt = (t * i) / 40;
      pts.push([u * tt, 0.5 * a * tt * tt]);
    }
    sol.graph = { title: 'Path between the plates (parabolic)', xLabel: 'x (m)', yLabel: 'deflection (m)', series: [{ label: 'path', points: pts }] };
  } else if (V !== undefined && u === 0 && d !== undefined) {
    const W = q * V;
    const v = Math.sqrt((2 * W) / m);
    sol.steps.push(mkStep(`${S()} — Work done by the field (from rest, plate to plate)`, 'W = qV = \\Delta K', { substitutionLatex: `W = ${fmtLatex(q, 4)} \\times ${fmtLatex(V, 4)}`, resultLatex: `K = ${L(W, 'energyAtomic', sf)} = ${LU(W, 'eV', sf)}` }));
    sol.steps.push(mkStep(`${S()} — Speed on reaching the other plate`, 'K = \\tfrac{1}{2}mv^2', { rearrangedLatex: 'v = \\sqrt{\\frac{2qV}{m}}', substitutionLatex: `v = \\sqrt{\\frac{2 \\times ${fmtLatex(W, 4)}}{${fmtLatex(m, 4)}}}`, resultLatex: `v = ${L(v, 'velocity', sf)}` }));
    final(sol, { symbolLatex: 'K', name: 'Kinetic energy gained', valueSI: W, quantity: 'energyAtomic' });
    final(sol, { symbolLatex: 'v', name: 'Final speed', valueSI: v, quantity: 'velocity' });
    if (v > 0.1 * NESA.c.value) iss.push({ level: 'warning', message: 'v > 0.1c — relativistic effects are significant; the classical answer is approximate.' });
  }
  sol.directions.push({ title: 'Direction', lines: [inp.sign === 'positive' ? 'Positive charge: force along E, towards the NEGATIVE plate.' : 'Negative charge (electron): force opposite to E, towards the POSITIVE plate.', 'The field between plates points from the + plate to the − plate and is uniform, so the force and acceleration are constant (the path is a parabola).'] });
  sol.ok = true;
  return sol;
}

// ───────────────────────── charged particle in a magnetic field ─────────────────────────

export interface MagCircleInput {
  q: Qty;
  m: Qty;
  particleName?: string;
  sign: ChargeSign;
  v: Qty;
  B: Qty;
  angle?: Qty;
  frame?: Frame;
  vDir?: string;
  BDir?: string;
}

export function solveMagCircle(inp: MagCircleInput, sf = 4): Solution {
  const sol = newSolution('Charged particle in a magnetic field', 'm6', 'particles');
  const iss = sol.issues;
  const q = Math.abs(si(inp.q, 'charge', 'Charge', iss) ?? NaN);
  const m = si(inp.m, 'mass', 'Mass', iss);
  const v = si(inp.v, 'velocity', 'Speed', iss);
  const Bf = si(inp.B, 'bfield', 'Magnetic field', iss);
  const th = si(inp.angle, 'angle', 'Angle', iss) ?? Math.PI / 2;
  if (iss.some((i) => i.level === 'error')) return sol;
  if (!isFinite(q) || m === undefined || v === undefined || Bf === undefined) return err(sol, 'Charge, mass, speed and magnetic field are all required.');
  trackSF(sol, inp.v, inp.B, inp.angle);
  given(sol, 'q', `Charge (magnitude)${inp.particleName ? ` — ${inp.particleName}` : ''}`, rawOf(inp.q), q, 'charge', inp.q.unit, !!inp.particleName, inp.particleName ? 'NESA data sheet' : undefined);
  given(sol, 'm', `Mass${inp.particleName ? ` — ${inp.particleName}` : ''}`, rawOf(inp.m), m, 'mass', inp.m.unit, !!inp.particleName, inp.particleName ? 'NESA data sheet' : undefined);
  given(sol, 'v', 'Speed', rawOf(inp.v), v, 'velocity', inp.v.unit);
  given(sol, 'B', 'Magnetic field strength', rawOf(inp.B), Bf, 'bfield', inp.B.unit);
  given(sol, '\\theta', 'Angle between v and B', inp.angle ? rawOf(inp.angle) : '90° (perpendicular)', th, 'angle', '°', !inp.angle);
  if (!inp.angle) sol.assumptions.push('v is perpendicular to B (θ = 90°).');
  const F = q * v * Bf * Math.sin(th);
  sol.steps.push(mkStep('Step 1 — Magnetic force', 'F = qvB\\sin\\theta', { substitutionLatex: `F = ${fmtLatex(q, 4)} \\times ${fmtLatex(v, 4)} \\times ${fmtLatex(Bf, 4)} \\times \\sin ${fmtLatex(th / DEG, 4)}^{\\circ}`, resultLatex: `F = ${L(F, 'force', sf)}` }));
  const a = F / m;
  sol.steps.push(mkStep('Step 2 — Acceleration (centripetal)', 'F = ma \\Rightarrow a = \\frac{qvB\\sin\\theta}{m}', { substitutionLatex: `a = \\frac{${fmtLatex(F, 4)}}{${fmtLatex(m, 4)}}`, resultLatex: `a = ${L(a, 'acceleration', sf)}` }));
  final(sol, { symbolLatex: 'F', name: 'Magnetic force', valueSI: F, quantity: 'force' });
  final(sol, { symbolLatex: 'a', name: 'Acceleration', valueSI: a, quantity: 'acceleration' });
  if (Math.abs(th - Math.PI / 2) < 1e-9) {
    const r = (m * v) / (q * Bf);
    const T = (2 * Math.PI * m) / (q * Bf);
    sol.steps.push(mkStep('Step 3 — Radius of the circular path', 'qvB = \\frac{mv^2}{r} \\Rightarrow r = \\frac{mv}{qB}', { substitutionLatex: `r = \\frac{${fmtLatex(m, 4)} \\times ${fmtLatex(v, 4)}}{${fmtLatex(q, 4)} \\times ${fmtLatex(Bf, 4)}}`, resultLatex: `r = ${L(r, 'length', sf)}`, explanation: 'The magnetic force is always perpendicular to v, so it provides the centripetal force. Charge magnitude is used.' }));
    sol.steps.push(mkStep('Step 4 — Period of the circular motion', 'T = \\frac{2\\pi r}{v} = \\frac{2\\pi m}{qB}', { substitutionLatex: `T = \\frac{2\\pi \\times ${fmtLatex(r, 4)}}{${fmtLatex(v, 4)}}`, resultLatex: `T = ${L(T, 'time', sf)}` }));
    final(sol, { symbolLatex: 'r', name: 'Radius of path', valueSI: r, quantity: 'length' });
    final(sol, { symbolLatex: 'T', name: 'Period', valueSI: T, quantity: 'time' });
  } else if (th > 1e-9 && th < Math.PI - 1e-9) sol.explanation.push('When v is not perpendicular to B, the component along B is unchanged and the path is a helix; only v sinθ contributes to the circular part (r = mv sinθ / qB).');
  const frame = inp.frame ?? 'page';
  const vd = inp.vDir ? parseDirection(inp.vDir, frame) : null;
  const bd = inp.BDir ? parseDirection(inp.BDir, frame) : null;
  if (vd && bd) {
    const r = magneticForceDirection(vd, bd, inp.sign, frame);
    sol.directions.push(r.note);
    sol.finals[0].direction = r.text;
  } else sol.directions.push({ title: 'Direction', lines: ['Directions of v and B were not given, so the force direction cannot be stated. Use the right-hand palm rule (fingers B, thumb v, palm = force on a POSITIVE charge) and reverse it for a negative charge.'] });
  if (v > 0.1 * NESA.c.value) iss.push({ level: 'warning', message: 'v > 0.1c: relativistic momentum should be used for the radius (r = p/qB).' });
  sol.ok = true;
  return sol;
}

// ───────────────────────── Faraday's law analyser ─────────────────────────

export interface FaradayInput {
  N: number;
  B1: Qty;
  B2?: Qty;
  A1: Qty;
  A2?: Qty;
  /** angle between B and the normal (or the plane, see angleRef) before and after */
  th1?: Qty;
  th2?: Qty;
  angleRef: 'normal' | 'plane';
  dt: Qty;
  R?: Qty;
}

export function solveFaraday(inp: FaradayInput, sf = 4): Solution {
  const sol = newSolution("Faraday's law of induction", 'm6', 'induction');
  const iss = sol.issues;
  const B1 = si(inp.B1, 'bfield', 'Initial field', iss);
  const B2 = si(inp.B2 ?? inp.B1, 'bfield', 'Final field', iss);
  const A1 = si(inp.A1, 'area', 'Initial area', iss);
  const A2 = si(inp.A2 ?? inp.A1, 'area', 'Final area', iss);
  let t1 = si(inp.th1, 'angle', 'Initial angle', iss) ?? 0;
  let t2 = si(inp.th2 ?? inp.th1, 'angle', 'Final angle', iss) ?? t1;
  const dt = si(inp.dt, 'time', 'Time interval', iss);
  const R = si(inp.R, 'resistance', 'Resistance', iss);
  if (iss.some((i) => i.level === 'error')) return sol;
  if (B1 === undefined || A1 === undefined || dt === undefined || B2 === undefined || A2 === undefined) return err(sol, 'Give B, A, the number of turns and the time interval.');
  if (!(inp.N >= 1)) return err(sol, 'The number of turns must be at least 1.');
  trackSF(sol, inp.B1, inp.B2, inp.A1, inp.A2, inp.dt, inp.R);
  given(sol, 'N', 'Number of turns', String(inp.N), inp.N, 'count');
  given(sol, 'B_i', 'Initial magnetic field', rawOf(inp.B1), B1, 'bfield', inp.B1.unit);
  if (inp.B2) given(sol, 'B_f', 'Final magnetic field', rawOf(inp.B2), B2, 'bfield', inp.B2.unit);
  given(sol, 'A', 'Area of coil', rawOf(inp.A1), A1, 'area', inp.A1.unit);
  if (inp.A2) given(sol, 'A_f', 'Final area', rawOf(inp.A2), A2, 'area', inp.A2.unit);
  given(sol, '\\Delta t', 'Time interval', rawOf(inp.dt), dt, 'time', inp.dt.unit);
  if (R !== undefined) given(sol, 'R', 'Resistance', rawOf(inp.R!), R, 'resistance', inp.R!.unit);
  let step = 1;
  const S = () => `Step ${step++}`;
  if (inp.angleRef === 'plane') {
    const n1 = 90 * DEG - t1;
    const n2 = 90 * DEG - t2;
    sol.steps.push(mkStep(`${S()} — Convert angles to the angle with the NORMAL`, '\\theta_{normal} = 90^{\\circ} - \\theta_{plane}', { lines: [`\\theta_i = 90^{\\circ} - ${fmtLatex(t1 / DEG, 4)}^{\\circ} = ${fmtLatex(n1 / DEG, 4)}^{\\circ}`, `\\theta_f = 90^{\\circ} - ${fmtLatex(t2 / DEG, 4)}^{\\circ} = ${fmtLatex(n2 / DEG, 4)}^{\\circ}`], resultLatex: `\\theta_i = ${fmtLatex(n1 / DEG, 4)}^{\\circ},\\ \\theta_f = ${fmtLatex(n2 / DEG, 4)}^{\\circ}`, explanation: 'Φ = BA cos θ uses the angle between B and the NORMAL (area vector). The question gave angles to the plane of the coil.' }));
    t1 = n1;
    t2 = n2;
  }
  const P1 = B1 * A1 * Math.cos(t1);
  const P2 = B2 * A2 * Math.cos(t2);
  sol.steps.push(mkStep(`${S()} — Initial and final flux`, '\\Phi = BA\\cos\\theta', {
    lines: [`\\Phi_i = ${fmtLatex(B1, 4)} \\times ${fmtLatex(A1, 4)} \\times \\cos ${fmtLatex(t1 / DEG, 4)}^{\\circ} = ${L(P1, 'flux', sf)}`, `\\Phi_f = ${fmtLatex(B2, 4)} \\times ${fmtLatex(A2, 4)} \\times \\cos ${fmtLatex(t2 / DEG, 4)}^{\\circ} = ${L(P2, 'flux', sf)}`],
    resultLatex: `\\Phi_i = ${L(P1, 'flux', sf)},\\ \\Phi_f = ${L(P2, 'flux', sf)}`,
  }));
  const dP = P2 - P1;
  sol.steps.push(mkStep(`${S()} — Change in flux`, '\\Delta\\Phi = \\Phi_f - \\Phi_i', { substitutionLatex: `\\Delta\\Phi = ${fmtLatex(P2, 4)} - ${B(fmtLatex(P1, 4))}`, resultLatex: `\\Delta\\Phi = ${L(dP, 'flux', sf)}` }));
  const emf = (-inp.N * dP) / dt;
  sol.steps.push(mkStep(`${S()} — Average induced emf`, '\\varepsilon = -N\\frac{\\Delta\\Phi}{\\Delta t}', { substitutionLatex: `\\varepsilon = -${inp.N} \\times \\frac{${fmtLatex(dP, 4)}}{${fmtLatex(dt, 4)}}`, resultLatex: `|\\varepsilon| = ${L(Math.abs(emf), 'voltage', sf)}`, explanation: 'The minus sign is Lenz’s law — the induced emf drives a current whose field opposes the change in flux. Quote the magnitude and state the direction separately.' }));
  final(sol, { symbolLatex: '\\Delta\\Phi', name: 'Change in flux', valueSI: dP, quantity: 'flux' });
  final(sol, { symbolLatex: '\\varepsilon', name: 'Average induced emf (magnitude)', valueSI: Math.abs(emf), quantity: 'voltage' });
  if (R !== undefined) {
    const I = Math.abs(emf) / R;
    sol.steps.push(mkStep(`${S()} — Induced current`, 'I = \\frac{\\varepsilon}{R}', { substitutionLatex: `I = \\frac{${fmtLatex(Math.abs(emf), 4)}}{${fmtLatex(R, 4)}}`, resultLatex: `I = ${L(I, 'current', sf)}` }));
    final(sol, { symbolLatex: 'I', name: 'Induced current', valueSI: I, quantity: 'current' });
  }
  sol.directions.push({ title: "Lenz's law (direction)", lines: [dP === 0 ? 'No change in flux → no induced emf.' : `The flux ${Math.abs(P2) > Math.abs(P1) ? 'increases' : 'decreases'} in magnitude, so the induced current sets up a field that ${Math.abs(P2) > Math.abs(P1) ? 'opposes the external field (inside the coil)' : 'is in the same direction as the external field, to maintain the flux'}.`, 'To state clockwise/anticlockwise, the direction of B relative to the viewer is needed — use the Lenz direction tool.'] });
  sol.ok = true;
  return sol;
}

// ───────────────────────── power transmission ─────────────────────────

export interface TransmissionInput {
  P: Qty;
  Vgen?: Qty;
  Vline: Qty;
  Rline: Qty;
  /** transformer turns (optional): step-up Np:Ns */
  Np?: number;
  Ns?: number;
}

export function solveTransmission(inp: TransmissionInput, sf = 4): Solution {
  const sol = newSolution('Power transmission', 'm6', 'transformers');
  const iss = sol.issues;
  const P = si(inp.P, 'power', 'Power transmitted', iss);
  let Vl = si(inp.Vline, 'voltage', 'Transmission voltage', iss);
  const Vg = si(inp.Vgen, 'voltage', 'Generator voltage', iss);
  const R = si(inp.Rline, 'resistance', 'Line resistance', iss);
  if (iss.some((i) => i.level === 'error')) return sol;
  trackSF(sol, inp.P, inp.Vline, inp.Vgen, inp.Rline);
  if (P === undefined || R === undefined) return err(sol, 'Give the power transmitted and the resistance of the lines.');
  given(sol, 'P', 'Power transmitted', rawOf(inp.P), P, 'power', inp.P.unit);
  if (Vg !== undefined) given(sol, 'V_p', 'Generator (primary) voltage', rawOf(inp.Vgen!), Vg, 'voltage', inp.Vgen!.unit);
  given(sol, 'R', 'Resistance of transmission lines', rawOf(inp.Rline), R, 'resistance', inp.Rline.unit);
  let step = 1;
  const S = () => `Step ${step++}`;
  if (Vg !== undefined && inp.Np && inp.Ns) {
    Vl = (Vg * inp.Ns) / inp.Np;
    sol.steps.push(mkStep(`${S()} — Transmission voltage from the step-up transformer`, '\\frac{V_p}{V_s} = \\frac{N_p}{N_s}', { rearrangedLatex: 'V_s = V_p\\frac{N_s}{N_p}', substitutionLatex: `V_s = ${fmtLatex(Vg, 4)} \\times \\frac{${inp.Ns}}{${inp.Np}}`, resultLatex: `V_s = ${L(Vl, 'voltage', sf)}` }));
  } else if (Vl !== undefined) given(sol, 'V', 'Transmission voltage', rawOf(inp.Vline), Vl, 'voltage', inp.Vline.unit);
  if (Vl === undefined) return err(sol, 'Give the transmission voltage (or generator voltage and turns ratio).');
  const I = P / Vl;
  sol.steps.push(mkStep(`${S()} — Current in the lines`, 'P = VI', { rearrangedLatex: 'I = \\frac{P}{V}', substitutionLatex: `I = \\frac{${fmtLatex(P, 4)}}{${fmtLatex(Vl, 4)}}`, resultLatex: `I = ${L(I, 'current', sf)}` }));
  const Pl = I * I * R;
  sol.steps.push(mkStep(`${S()} — Power lost as heat in the lines`, 'P_{loss} = I^2R', { substitutionLatex: `P_{loss} = ${B(fmtLatex(I, 4))}^2 \\times ${fmtLatex(R, 4)}`, resultLatex: `P_{loss} = ${L(Pl, 'power', sf)} = ${LU(Pl, 'kW', sf)}` }));
  const Vd = I * R;
  sol.steps.push(mkStep(`${S()} — Voltage drop along the lines`, 'V = IR', { substitutionLatex: `V = ${fmtLatex(I, 4)} \\times ${fmtLatex(R, 4)}`, resultLatex: `V_{drop} = ${L(Vd, 'voltage', sf)}` }));
  const pct = (Pl / P) * 100;
  sol.steps.push(mkStep(`${S()} — Percentage of the power lost`, '\\%\\ \\text{lost} = \\frac{P_{loss}}{P} \\times 100', { substitutionLatex: `\\frac{${fmtLatex(Pl, 4)}}{${fmtLatex(P, 4)}} \\times 100`, resultLatex: `${fmtLatex(pct, sf)}\\ \\%` }));
  if (Pl > P) iss.push({ level: 'error', message: 'The calculated loss exceeds the power sent — the voltage is far too low for these lines (impossible in practice).' });
  final(sol, { symbolLatex: 'I', name: 'Current in the lines', valueSI: I, quantity: 'current' });
  final(sol, { symbolLatex: 'P_{loss}', name: 'Power lost', valueSI: Pl, quantity: 'power' });
  final(sol, { symbolLatex: 'V_{drop}', name: 'Voltage drop', valueSI: Vd, quantity: 'voltage' });
  final(sol, { symbolLatex: '\\%', name: 'Percentage lost', valueSI: pct / 100, quantity: 'percent' });
  final(sol, { symbolLatex: 'P_{delivered}', name: 'Power delivered', valueSI: P - Pl, quantity: 'power' });
  // loss vs transmission voltage graph
  const pts: [number, number][] = [];
  for (let i = 1; i <= 60; i++) {
    const V = (Vl * 3 * i) / 60;
    pts.push([V / 1000, (((P / V) ** 2 * R) / P) * 100]);
  }
  sol.graph = { title: 'Percentage power loss vs transmission voltage (P_loss = (P/V)²R)', xLabel: 'V (kV)', yLabel: '% lost', series: [{ label: 'loss', points: pts }], markers: [{ x: Vl / 1000, y: pct, label: 'this line' }], yZero: true };
  sol.explanation.push('Stepping up the voltage reduces the current (I = P/V), and the loss falls with I², so power is transmitted at high voltage.');
  sol.ok = !iss.some((i) => i.level === 'error');
  return sol;
}
