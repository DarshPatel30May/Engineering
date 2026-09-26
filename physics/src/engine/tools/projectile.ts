/**
 * General projectile solver (Module 5). Up is positive, a_x = 0, a_y = −g, air resistance
 * ignored. Handles launches from a height (or onto a higher/lower level), horizontal launches,
 * angled launches, and inverse problems (launch speed or angle for a given range).
 */
import { NESA } from '../constants';
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { B, DEG, err, final, given, L, mkStep, newSolution, Qty, rawOf, si, trackSF } from './common';

export type ProjectileMode = 'forward' | 'speedFromRange' | 'angleFromRange' | 'speedFromHeight';

export interface ProjectileInput {
  mode: ProjectileMode;
  u?: Qty;
  angle?: Qty;
  /** launch height ABOVE the landing level (negative if landing is higher) */
  h0?: Qty;
  range?: Qty;
  hmax?: Qty;
  g?: Qty;
  /** optional: evaluate position & velocity at this time */
  tAt?: Qty;
  /** optional: evaluate the height at this horizontal distance */
  xAt?: Qty;
}

export interface ProjectileResult {
  ux: number;
  uy: number;
  tFlight: number;
  range: number;
  hMaxAboveLaunch: number;
  tPeak: number;
  vxF: number;
  vyF: number;
  vF: number;
  angleF: number;
}

export function projectileCore(u: number, th: number, h0: number, g: number): ProjectileResult | null {
  const ux = u * Math.cos(th);
  const uy = u * Math.sin(th);
  const disc = uy * uy + 2 * g * h0;
  if (disc < 0) return null;
  const tFlight = (uy + Math.sqrt(disc)) / g;
  if (!(tFlight > 0)) return null;
  const range = ux * tFlight;
  const tPeak = Math.max(0, uy / g);
  const hMaxAboveLaunch = uy > 0 ? (uy * uy) / (2 * g) : 0;
  const vyF = uy - g * tFlight;
  const vF = Math.hypot(ux, vyF);
  const angleF = Math.atan2(vyF, ux);
  return { ux, uy, tFlight, range, hMaxAboveLaunch, tPeak, vxF: ux, vyF, vF, angleF };
}

export function solveProjectile(inp: ProjectileInput, sf = 4): Solution {
  const sol = newSolution('Projectile motion', 'm5', 'projectile');
  const issues = sol.issues;
  const g = si(inp.g, 'acceleration', 'g', issues) ?? NESA.g.value;
  const gFromSheet = !inp.g || !isFinite(inp.g.value);
  const h0 = si(inp.h0, 'length', 'Launch height', issues) ?? 0;
  let u = si(inp.u, 'velocity', 'Launch speed', issues);
  let th = si(inp.angle, 'angle', 'Launch angle', issues);
  const R = si(inp.range, 'length', 'Range', issues);
  const H = si(inp.hmax, 'length', 'Maximum height', issues);
  if (issues.some((i) => i.level === 'error')) return sol;

  if (inp.u && u !== undefined) given(sol, 'u', 'Launch speed', rawOf(inp.u), u, 'velocity', inp.u.unit);
  if (inp.angle && th !== undefined) given(sol, '\\theta', 'Launch angle (above horizontal)', rawOf(inp.angle), th, 'angle', '°');
  if (inp.h0 && h0 !== 0) given(sol, 'h', 'Launch height above landing point', rawOf(inp.h0), h0, 'length', inp.h0.unit);
  if (inp.range && R !== undefined) given(sol, 'R', 'Horizontal range', rawOf(inp.range), R, 'length', inp.range.unit);
  if (inp.hmax && H !== undefined) given(sol, 'H', 'Maximum height', rawOf(inp.hmax), H, 'length', inp.hmax.unit);
  given(sol, 'g', 'Gravitational acceleration', gFromSheet ? '9.8 m s⁻²' : rawOf(inp.g!), g, 'acceleration', 'm/s²', gFromSheet, gFromSheet ? 'NESA data sheet' : undefined);
  trackSF(sol, inp.u, inp.angle, inp.h0, inp.range, inp.hmax);
  sol.assumptions.push('Up is positive: a_y = −g, a_x = 0.', 'Air resistance is negligible.', 'The launch point is the origin; landing is h below the launch point (s_y = −h).');
  if (g <= 0) return err(sol, 'g must be positive.');

  // ---------- inverse problems ----------
  if (inp.mode === 'speedFromRange') {
    if (R === undefined || th === undefined) return err(sol, 'Launch speed from range needs the range and the launch angle (and the launch height if not level ground).');
    sol.find.push({ symbolLatex: 'u', name: 'Launch speed' });
    const denom = 2 * Math.cos(th) ** 2 * (R * Math.tan(th) + h0);
    if (!(denom > 0)) return err(sol, 'No launch speed can give this range at this angle (the trajectory would have to rise above the landing point with no height available).');
    u = Math.sqrt((g * R * R) / denom);
    sol.steps.push(mkStep('Step 1 — Trajectory equation', 'y = x\\tan\\theta - \\frac{gx^2}{2u^2\\cos^2\\theta}', {
      derivationLatex: ['x = u\\cos\\theta\\, t \\Rightarrow t = \\frac{x}{u\\cos\\theta}', 'y = u\\sin\\theta\\, t - \\tfrac{1}{2}gt^2 = x\\tan\\theta - \\frac{gx^2}{2u^2\\cos^2\\theta}'],
      rearrangedLatex: `u = \\sqrt{\\frac{gR^2}{2\\cos^2\\theta\\,(R\\tan\\theta + h)}} \\quad (y = -h \\text{ at } x = R)`,
      substitutionLatex: `u = \\sqrt{\\frac{${fmtLatex(g, 4)} \\times ${B(fmtLatex(R, 4))}^2}{2\\cos^2(${fmtLatex(th / DEG, 4)}^{\\circ})\\,(${fmtLatex(R, 4)}\\tan ${fmtLatex(th / DEG, 4)}^{\\circ} + ${fmtLatex(h0, 4)})}}`,
      resultLatex: `u = ${L(u, 'velocity', sf)}`,
      explanation: 'Eliminate t between the horizontal and vertical equations, then set the landing point.',
    }));
    final(sol, { symbolLatex: 'u', name: 'Launch speed', valueSI: u, quantity: 'velocity' });
  } else if (inp.mode === 'angleFromRange') {
    if (R === undefined || u === undefined) return err(sol, 'Launch angle from range needs the launch speed and the range.');
    sol.find.push({ symbolLatex: '\\theta', name: 'Launch angle' });
    const k = (g * R * R) / (2 * u * u);
    const disc = R * R - 4 * k * (k - h0);
    if (disc < 0) return err(sol, `The range ${fmtLatex(R, 3)} m cannot be reached at ${fmtLatex(u, 3)} m/s — the maximum range is exceeded.`);
    const T1 = (R - Math.sqrt(disc)) / (2 * k);
    const T2 = (R + Math.sqrt(disc)) / (2 * k);
    const a1 = Math.atan(T1);
    const a2 = Math.atan(T2);
    sol.steps.push(mkStep('Step 1 — Trajectory equation as a quadratic in tan θ', 'y = x\\tan\\theta - \\frac{gx^2}{2u^2}(1 + \\tan^2\\theta)', {
      lines: [
        `\\text{At } x = R,\\ y = -h:\\quad k\\tan^2\\theta - R\\tan\\theta + (k - h) = 0,\\quad k = \\frac{gR^2}{2u^2} = ${fmtLatex(k, 4)}\\ \\text{m}`,
        `\\tan\\theta = \\frac{R \\pm \\sqrt{R^2 - 4k(k - h)}}{2k} = ${fmtLatex(T1, 4)} \\text{ or } ${fmtLatex(T2, 4)}`,
      ],
      resultLatex: `\\theta = ${fmtLatex(a1 / DEG, sf)}^{\\circ} \\text{ or } ${fmtLatex(a2 / DEG, sf)}^{\\circ}`,
      explanation: h0 === 0 ? 'On level ground the two angles are complementary (they add to 90°).' : 'Two launch angles reach the same landing point: a low, fast trajectory and a high, slow one.',
    }));
    final(sol, { symbolLatex: '\\theta_1', name: 'Launch angle (low trajectory)', valueSI: a1, quantity: 'angle' });
    if (Math.abs(a2 - a1) > 1e-9) final(sol, { symbolLatex: '\\theta_2', name: 'Launch angle (high trajectory)', valueSI: a2, quantity: 'angle' });
    th = a1;
  } else if (inp.mode === 'speedFromHeight') {
    if (H === undefined || th === undefined) return err(sol, 'Launch speed from maximum height needs the maximum height (above launch) and the launch angle.');
    if (!(th > 0)) return err(sol, 'The launch angle must be above the horizontal to rise to a maximum height.');
    sol.find.push({ symbolLatex: 'u', name: 'Launch speed' });
    const uy = Math.sqrt(2 * g * H);
    u = uy / Math.sin(th);
    sol.steps.push(mkStep('Step 1 — Vertical velocity at the top is zero', 'v_y^2 = u_y^2 + 2a_y s_y', {
      rearrangedLatex: 'u_y = \\sqrt{2gH}',
      substitutionLatex: `u_y = \\sqrt{2 \\times ${fmtLatex(g, 4)} \\times ${fmtLatex(H, 4)}}`,
      resultLatex: `u_y = ${L(uy, 'velocity', sf)}`,
    }));
    sol.steps.push(mkStep('Step 2 — Launch speed from the vertical component', 'u_y = u\\sin\\theta', {
      rearrangedLatex: 'u = \\frac{u_y}{\\sin\\theta}',
      substitutionLatex: `u = \\frac{${fmtLatex(uy, 4)}}{\\sin ${fmtLatex(th / DEG, 4)}^{\\circ}}`,
      resultLatex: `u = ${L(u, 'velocity', sf)}`,
    }));
    final(sol, { symbolLatex: 'u', name: 'Launch speed', valueSI: u, quantity: 'velocity' });
  }

  if (u === undefined || th === undefined) return err(sol, 'The launch speed and launch angle are both needed (a horizontal launch has θ = 0°).');
  if (u <= 0) return err(sol, 'Launch speed must be positive.');
  if (Math.abs(th) > Math.PI / 2 + 1e-9) return err(sol, 'The launch angle must be between −90° and 90° from the horizontal.');
  const r = projectileCore(u, th, h0, g);
  if (!r) return err(sol, 'The projectile never reaches the landing level (it is below the maximum height reachable). Check the heights.');

  const forward = inp.mode === 'forward';
  const n0 = sol.steps.length;
  const S = (i: number) => `Step ${n0 + i}`;
  if (forward) sol.find.push({ symbolLatex: 't, R, H, v', name: 'Time of flight, range, maximum height, impact velocity' });

  sol.steps.push(mkStep(`${S(1)} — Resolve the launch velocity into components`, 'u_x = u\\cos\\theta,\\quad u_y = u\\sin\\theta', {
    lines: [
      `u_x = ${fmtLatex(u, 4)}\\cos ${fmtLatex(th / DEG, 4)}^{\\circ} = ${L(r.ux, 'velocity', sf)}`,
      `u_y = ${fmtLatex(u, 4)}\\sin ${fmtLatex(th / DEG, 4)}^{\\circ} = ${L(r.uy, 'velocity', sf)}`,
    ],
    resultLatex: `u_x = ${L(r.ux, 'velocity', sf)},\\ u_y = ${L(r.uy, 'velocity', sf)}`,
    explanation: 'Horizontal and vertical motions are independent. Horizontal velocity stays constant (aₓ = 0); vertical velocity changes at −g.',
  }));
  if (r.uy > 0) {
    sol.steps.push(mkStep(`${S(2)} — Maximum height (v_y = 0 at the top)`, 'v_y^2 = u_y^2 + 2a_ys_y', {
      rearrangedLatex: 'H = \\frac{u_y^2}{2g},\\qquad t_{peak} = \\frac{u_y}{g}',
      substitutionLatex: `H = \\frac{${B(fmtLatex(r.uy, 4))}^2}{2 \\times ${fmtLatex(g, 4)}}`,
      resultLatex: `H = ${L(r.hMaxAboveLaunch, 'length', sf)} \\text{ above launch}${h0 ? `\\ (${L(r.hMaxAboveLaunch + h0, 'length', sf)} \\text{ above landing level})` : ''},\\quad t_{peak} = ${L(r.tPeak, 'time', sf)}`,
    }));
  }
  const flightLatex = h0 === 0
    ? { rearr: 't = \\frac{2u_y}{g}', sub: `t = \\frac{2 \\times ${fmtLatex(r.uy, 4)}}{${fmtLatex(g, 4)}}` }
    : { rearr: `\\tfrac{1}{2}gt^2 - u_yt - h = 0 \\;\\Rightarrow\\; t = \\frac{u_y + \\sqrt{u_y^2 + 2gh}}{g}`, sub: `t = \\frac{${fmtLatex(r.uy, 4)} + \\sqrt{${B(fmtLatex(r.uy, 4))}^2 + 2 \\times ${fmtLatex(g, 4)} \\times ${B(fmtLatex(h0, 4))}}}{${fmtLatex(g, 4)}}` };
  sol.steps.push(mkStep(`${S(r.uy > 0 ? 3 : 2)} — Time of flight (vertical motion, s_y = ${h0 === 0 ? '0' : '-h'})`, 's_y = u_yt + \\tfrac{1}{2}a_yt^2', {
    rearrangedLatex: flightLatex.rearr,
    substitutionLatex: flightLatex.sub,
    resultLatex: `t = ${L(r.tFlight, 'time', sf)}`,
    note: h0 !== 0 ? 'quadratic in t — the positive root is taken' : undefined,
  }));
  const k0 = r.uy > 0 ? 4 : 3;
  sol.steps.push(mkStep(`${S(k0)} — Range (horizontal motion, constant u_x)`, 's_x = u_xt', {
    substitutionLatex: `s_x = ${fmtLatex(r.ux, 4)} \\times ${fmtLatex(r.tFlight, 4)}`,
    resultLatex: `s_x = ${L(r.range, 'length', sf)}`,
  }));
  sol.steps.push(mkStep(`${S(k0 + 1)} — Velocity at landing`, 'v_x = u_x,\\quad v_y = u_y - gt,\\quad v = \\sqrt{v_x^2 + v_y^2}', {
    lines: [
      `v_y = ${fmtLatex(r.uy, 4)} - ${fmtLatex(g, 4)} \\times ${fmtLatex(r.tFlight, 4)} = ${L(r.vyF, 'velocity', sf)}`,
      `v = \\sqrt{${B(fmtLatex(r.ux, 4))}^2 + ${B(fmtLatex(r.vyF, 4))}^2} = ${L(r.vF, 'velocity', sf)}`,
      `\\theta = \\tan^{-1}\\left(\\frac{${fmtLatex(Math.abs(r.vyF), 4)}}{${fmtLatex(r.ux, 4)}}\\right) = ${fmtLatex(Math.abs(r.angleF) / DEG, sf)}^{\\circ} \\text{ ${r.vyF < 0 ? 'below' : 'above'} the horizontal}`,
    ],
    resultLatex: `v = ${L(r.vF, 'velocity', sf)} \\text{ at } ${fmtLatex(Math.abs(r.angleF) / DEG, sf)}^{\\circ} \\text{ ${r.vyF < 0 ? 'below' : 'above'} horizontal}`,
  }));

  // optional evaluation at time t / distance x
  const tAt = si(inp.tAt, 'time', 'Time', issues);
  if (tAt !== undefined) {
    const x = r.ux * tAt;
    const y = r.uy * tAt - 0.5 * g * tAt * tAt;
    const vy = r.uy - g * tAt;
    sol.steps.push(mkStep(`At t = ${fmtLatex(tAt, 4)} s`, 's_x = u_xt,\\quad s_y = u_yt - \\tfrac{1}{2}gt^2,\\quad v_y = u_y - gt', {
      lines: [`s_x = ${L(x, 'length', sf)}`, `s_y = ${L(y, 'length', sf)}\\ (${y >= 0 ? 'above' : 'below'} launch)`, `v_y = ${L(vy, 'velocity', sf)},\\quad v = ${L(Math.hypot(r.ux, vy), 'velocity', sf)}`],
      resultLatex: `(x, y) = (${fmtLatex(x, sf)}, ${fmtLatex(y, sf)})\\ \\text{m}`,
    }));
    if (tAt > r.tFlight + 1e-9) issues.push({ level: 'warning', message: 'That time is after the projectile has landed — the position is where it would be if it kept falling.' });
    final(sol, { symbolLatex: 's_y(t)', name: `Height above launch at t = ${inp.tAt!.value} s`, valueSI: y, quantity: 'length' });
  }
  const xAt = si(inp.xAt, 'length', 'Horizontal distance', issues);
  if (xAt !== undefined) {
    const t = xAt / r.ux;
    const y = r.uy * t - 0.5 * g * t * t;
    sol.steps.push(mkStep(`At horizontal distance x = ${fmtLatex(xAt, 4)} m`, 't = \\frac{x}{u_x},\\quad s_y = u_yt - \\tfrac{1}{2}gt^2', {
      lines: [`t = \\frac{${fmtLatex(xAt, 4)}}{${fmtLatex(r.ux, 4)}} = ${L(t, 'time', sf)}`, `s_y = ${L(y, 'length', sf)}`],
      resultLatex: `s_y = ${L(y, 'length', sf)}\\ (${y >= 0 ? 'above' : 'below'} the launch point)`,
    }));
    final(sol, { symbolLatex: 's_y(x)', name: `Height relative to launch at x = ${inp.xAt!.value} ${inp.xAt!.unit}`, valueSI: y, quantity: 'length' });
  }

  if (forward || sol.finals.length === 0) {
    final(sol, { symbolLatex: 't', name: 'Time of flight', valueSI: r.tFlight, quantity: 'time' });
    final(sol, { symbolLatex: 's_x', name: 'Range (horizontal displacement)', valueSI: r.range, quantity: 'length' });
    if (r.uy > 0) final(sol, { symbolLatex: 'H', name: h0 ? 'Maximum height above the launch point' : 'Maximum height', valueSI: r.hMaxAboveLaunch, quantity: 'length' });
    final(sol, { symbolLatex: 'v', name: 'Speed at landing', valueSI: r.vF, quantity: 'velocity', direction: `${fmtLatex(Math.abs(r.angleF) / DEG, 3)}° ${r.vyF < 0 ? 'below' : 'above'} the horizontal` });
  }

  sol.directions.push({ title: 'Direction and sign convention', lines: ['Up is taken as positive, so a_y = −g and the landing point below launch has s_y = −h.', `Velocity at landing points ${fmtLatex(Math.abs(r.angleF) / DEG, 3)}° ${r.vyF < 0 ? 'below' : 'above'} the horizontal, in the direction of travel.`] });
  // trajectory graph
  const pts: [number, number][] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const t = (r.tFlight * i) / N;
    pts.push([r.ux * t, h0 + r.uy * t - 0.5 * g * t * t]);
  }
  sol.graph = {
    title: 'Trajectory',
    xLabel: 'Horizontal distance (m)',
    yLabel: 'Height above landing level (m)',
    series: [{ label: 'Path', points: pts }],
    markers: [
      { x: 0, y: h0, label: 'Launch' },
      { x: r.range, y: 0, label: `Lands ${fmtLatex(r.range, 3)} m` },
      ...(r.uy > 0 ? [{ x: r.ux * r.tPeak, y: h0 + r.hMaxAboveLaunch, label: 'Max height' }] : []),
    ],
    yZero: true,
  };
  sol.explanation.push('Treat the horizontal and vertical motion separately: they share only the time t.');
  sol.ok = !issues.some((i) => i.level === 'error');
  return sol;
}
