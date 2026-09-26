/**
 * Module 5 tools: resultant of several forces in 2D (component method, equilibrant) and
 * torque about a pivot for several forces (net torque, equilibrium, unknown force or distance).
 */
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { DEG, err, final, L, mkStep, newSolution, Qty, si, trackSF } from './common';

export interface Force2D {
  label: string;
  F: Qty;
  /** direction measured anticlockwise from the +x axis (east / right) */
  angle: Qty;
}

export function solveForces2D(forces: Force2D[], sf = 4): Solution {
  const sol = newSolution('Resultant of forces in two dimensions', 'm5', 'forces');
  if (!forces.length) return err(sol, 'Add at least one force.');
  let Sx = 0;
  let Sy = 0;
  const lines: string[] = [];
  const rows: string[][] = [];
  for (const f of forces) {
    const F = si(f.F, 'force', f.label, sol.issues);
    const th = si(f.angle, 'angle', `${f.label} angle`, sol.issues);
    if (F === undefined || th === undefined) continue;
    const fx = F * Math.cos(th);
    const fy = F * Math.sin(th);
    Sx += fx;
    Sy += fy;
    sol.given.push({ symbolLatex: `F_{${f.label}}`, name: `${f.label}`, raw: `${f.F.value} ${f.F.unit} at ${f.angle.value}°`, valueSI: F, quantity: 'force', unit: f.F.unit });
    lines.push(`F_{${f.label}}:\\ F_x = ${fmtLatex(F, 4)}\\cos ${fmtLatex(th / DEG, 4)}^{\\circ} = ${fmtLatex(fx, 4)},\\quad F_y = ${fmtLatex(F, 4)}\\sin ${fmtLatex(th / DEG, 4)}^{\\circ} = ${fmtLatex(fy, 4)}`);
    rows.push([f.label, fmtLatex(F, sf), `${fmtLatex(th / DEG, sf)}°`, fmtLatex(fx, sf), fmtLatex(fy, sf)]);
    trackSF(sol, f.F);
  }
  if (sol.issues.some((i) => i.level === 'error')) return sol;
  sol.find.push({ symbolLatex: 'F_R', name: 'Resultant force (magnitude and direction)' });
  sol.steps.push(mkStep('Step 1 — Resolve each force into components', 'F_x = F\\cos\\theta,\\quad F_y = F\\sin\\theta', { lines, resultLatex: '', explanation: 'Angles are measured anticlockwise from the positive x-axis (right / east).' }));
  sol.steps.push(mkStep('Step 2 — Add the components', '\\Sigma F_x,\\quad \\Sigma F_y', { lines: [`\\Sigma F_x = ${fmtLatex(Sx, 4)}\\ \\text{N}`, `\\Sigma F_y = ${fmtLatex(Sy, 4)}\\ \\text{N}`], resultLatex: `\\Sigma F_x = ${L(Sx, 'force', sf)},\\ \\Sigma F_y = ${L(Sy, 'force', sf)}` }));
  const R = Math.hypot(Sx, Sy);
  const ang = Math.atan2(Sy, Sx);
  sol.steps.push(mkStep('Step 3 — Magnitude and direction of the resultant', 'F_R = \\sqrt{(\\Sigma F_x)^2 + (\\Sigma F_y)^2},\\quad \\theta = \\tan^{-1}\\frac{\\Sigma F_y}{\\Sigma F_x}', {
    lines: [`F_R = \\sqrt{(${fmtLatex(Sx, 4)})^2 + (${fmtLatex(Sy, 4)})^2} = ${L(R, 'force', sf)}`, `\\theta = ${fmtLatex(ang / DEG, sf)}^{\\circ}\\ \\text{(from +x, quadrant from the signs)}`],
    resultLatex: `F_R = ${L(R, 'force', sf)} \\text{ at } ${fmtLatex(ang / DEG, sf)}^{\\circ}`,
  }));
  final(sol, { symbolLatex: 'F_R', name: 'Resultant force', valueSI: R, quantity: 'force', direction: `${fmtLatex(ang / DEG, 3)}° anticlockwise from +x` });
  const eq = ang + Math.PI;
  final(sol, { symbolLatex: 'F_E', name: 'Equilibrant (balancing force)', valueSI: R, quantity: 'force', direction: `${fmtLatex((((eq / DEG) % 360) + 360) % 360, 3)}° anticlockwise from +x (opposite to the resultant)` });
  if (R < 1e-9 * Math.max(1, ...forces.map((f) => Math.abs(f.F.value)))) sol.explanation.push('The resultant is zero — the forces are in equilibrium.');
  sol.tables = [{ title: 'Components', headers: ['Force', 'F (N)', 'θ', 'Fx (N)', 'Fy (N)'], rows }];
  sol.ok = true;
  return sol;
}

export interface TorqueForce {
  label: string;
  F?: Qty;
  /** distance from the pivot along the lever */
  r?: Qty;
  /** angle between the lever and the force (90° = perpendicular) */
  angle?: Qty;
  sense: 'cw' | 'acw';
  unknown?: 'F' | 'r';
}

export function solveTorques(forces: TorqueForce[], sf = 4): Solution {
  const sol = newSolution('Torque and rotational equilibrium', 'm5', 'torque');
  if (!forces.length) return err(sol, 'Add at least one force.');
  const unknowns = forces.filter((f) => f.unknown);
  if (unknowns.length > 1) return err(sol, 'Only one unknown (force or distance) can be found from Στ = 0.');
  let cw = 0;
  let acw = 0;
  const lines: string[] = [];
  for (const f of forces) {
    if (f.unknown) continue;
    const F = si(f.F, 'force', `${f.label} force`, sol.issues);
    const r = si(f.r, 'length', `${f.label} distance`, sol.issues);
    const th = si(f.angle, 'angle', `${f.label} angle`, sol.issues) ?? Math.PI / 2;
    if (F === undefined || r === undefined) {
      sol.issues.push({ level: 'error', message: `${f.label}: force and distance are required.` });
      continue;
    }
    const tau = r * F * Math.sin(th);
    if (f.sense === 'cw') cw += tau;
    else acw += tau;
    sol.given.push({ symbolLatex: `F_{${f.label}}`, name: `${f.label} (${f.sense === 'cw' ? 'clockwise' : 'anticlockwise'})`, raw: `${f.F!.value} ${f.F!.unit} at ${f.r!.value} ${f.r!.unit}${f.angle ? `, ${f.angle.value}°` : ''}`, valueSI: F, quantity: 'force', unit: f.F!.unit });
    lines.push(`\\tau_{${f.label}} = rF\\sin\\theta = ${fmtLatex(r, 4)} \\times ${fmtLatex(F, 4)} \\times \\sin ${fmtLatex(th / DEG, 4)}^{\\circ} = ${fmtLatex(tau, 4)}\\ \\text{N m (${f.sense === 'cw' ? 'clockwise' : 'anticlockwise'})}`);
    trackSF(sol, f.F, f.r);
  }
  if (sol.issues.some((i) => i.level === 'error')) return sol;
  sol.steps.push(mkStep('Step 1 — Torque of each force about the pivot', '\\tau = rF\\sin\\theta', { lines, resultLatex: `\\Sigma\\tau_{cw} = ${fmtLatex(cw, 4)}\\ \\text{N m},\\quad \\Sigma\\tau_{acw} = ${fmtLatex(acw, 4)}\\ \\text{N m}` }));
  if (!unknowns.length) {
    const net = acw - cw;
    sol.steps.push(mkStep('Step 2 — Net torque', '\\tau_{net} = \\Sigma\\tau_{acw} - \\Sigma\\tau_{cw}', { substitutionLatex: `\\tau_{net} = ${fmtLatex(acw, 4)} - ${fmtLatex(cw, 4)}`, resultLatex: `\\tau_{net} = ${L(Math.abs(net), 'torque', sf)}\\ ${Math.abs(net) < 1e-12 ? '' : net > 0 ? '\\text{(anticlockwise)}' : '\\text{(clockwise)}'}` }));
    final(sol, { symbolLatex: '\\tau_{net}', name: 'Net torque', valueSI: Math.abs(net), quantity: 'torque', direction: Math.abs(net) < 1e-12 ? 'in rotational equilibrium' : net > 0 ? 'anticlockwise' : 'clockwise' });
  } else {
    const u = unknowns[0];
    const th = si(u.angle, 'angle', `${u.label} angle`, sol.issues) ?? Math.PI / 2;
    const needed = u.sense === 'cw' ? acw - cw : cw - acw;
    if (needed <= 0) return err(sol, `The other torques already ${needed === 0 ? 'balance' : 'exceed'} in the ${u.sense === 'cw' ? 'clockwise' : 'anticlockwise'} direction — ${u.label} would have to act the other way.`);
    if (u.unknown === 'F') {
      const r = si(u.r, 'length', `${u.label} distance`, sol.issues);
      if (r === undefined) return err(sol, `${u.label}: distance from the pivot is needed to find the force.`);
      const F = needed / (r * Math.sin(th));
      sol.steps.push(mkStep('Step 2 — Rotational equilibrium: Στ = 0', '\\Sigma\\tau_{cw} = \\Sigma\\tau_{acw}', { rearrangedLatex: `F_{${u.label}} = \\frac{\\tau_{needed}}{r\\sin\\theta}`, substitutionLatex: `F_{${u.label}} = \\frac{${fmtLatex(needed, 4)}}{${fmtLatex(r, 4)} \\times \\sin ${fmtLatex(th / DEG, 4)}^{\\circ}}`, resultLatex: `F_{${u.label}} = ${L(F, 'force', sf)}` }));
      final(sol, { symbolLatex: `F_{${u.label}}`, name: `Force ${u.label} for equilibrium`, valueSI: F, quantity: 'force' });
    } else {
      const F = si(u.F, 'force', `${u.label} force`, sol.issues);
      if (F === undefined) return err(sol, `${u.label}: the force is needed to find its distance.`);
      const r = needed / (F * Math.sin(th));
      sol.steps.push(mkStep('Step 2 — Rotational equilibrium: Στ = 0', '\\Sigma\\tau_{cw} = \\Sigma\\tau_{acw}', { rearrangedLatex: `r_{${u.label}} = \\frac{\\tau_{needed}}{F\\sin\\theta}`, substitutionLatex: `r_{${u.label}} = \\frac{${fmtLatex(needed, 4)}}{${fmtLatex(F, 4)} \\times \\sin ${fmtLatex(th / DEG, 4)}^{\\circ}}`, resultLatex: `r_{${u.label}} = ${L(r, 'length', sf)}` }));
      final(sol, { symbolLatex: `r_{${u.label}}`, name: `Distance of ${u.label} from the pivot`, valueSI: r, quantity: 'length' });
    }
  }
  sol.explanation.push('For rotational equilibrium the sum of clockwise torques equals the sum of anticlockwise torques about ANY point. θ is the angle between the lever arm and the force.');
  sol.ok = true;
  return sol;
}
