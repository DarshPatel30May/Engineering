/**
 * Satellite / orbit analyser (Module 5). From the central body and ONE orbit specification
 * (altitude, radius, period or speed) it derives every orbital quantity with working:
 * r, h, v, T, a_c (= g at r), and — if the satellite mass is known — F, K, U, E, and the
 * energy needed to reach the orbit from the surface.
 */
import { NESA } from '../constants';
import { fmtLatex } from '../format';
import type { Solution } from '../solution';
import { B, err, final, given, L, mkStep, newSolution, Qty, rawOf, si, trackSF } from './common';

export interface OrbitInput {
  body: 'earth' | 'custom';
  M?: Qty;
  R?: Qty;
  altitude?: Qty;
  radius?: Qty;
  period?: Qty;
  speed?: Qty;
  m?: Qty;
  geostationary?: boolean;
}

const G = NESA.G.value;
const PI = Math.PI;

export function solveOrbit(inp: OrbitInput, sf = 4): Solution {
  const sol = newSolution('Satellite in circular orbit', 'm5', 'orbital');
  const issues = sol.issues;
  let M: number | undefined;
  let R: number | undefined;
  if (inp.body === 'earth') {
    M = NESA.ME.value;
    R = NESA.rE.value;
    given(sol, 'M_E', 'Mass of Earth', '6.0 × 10²⁴ kg', M, 'mass', 'kg', true, 'NESA data sheet');
    given(sol, 'r_E', 'Radius of Earth', '6.371 × 10⁶ m', R, 'length', 'm', true, 'NESA data sheet');
  } else {
    M = si(inp.M, 'mass', 'Mass of central body', issues);
    R = si(inp.R, 'length', 'Radius of central body', issues);
    if (M !== undefined) given(sol, 'M', 'Mass of central body', rawOf(inp.M!), M, 'mass', inp.M!.unit);
    if (R !== undefined) given(sol, 'R', 'Radius of central body', rawOf(inp.R!), R, 'length', inp.R!.unit);
  }
  given(sol, 'G', 'Gravitational constant', '6.67 × 10⁻¹¹ N m² kg⁻²', G, 'gravConst', '', true, 'NESA data sheet');
  if (M === undefined) return err(sol, 'The mass of the central body is required (Earth values come from the data sheet; other planets must be given in the question).');

  const h = si(inp.altitude, 'length', 'Altitude', issues);
  const r0 = si(inp.radius, 'length', 'Orbital radius', issues);
  let T = si(inp.period, 'time', 'Period', issues);
  const v0 = si(inp.speed, 'velocity', 'Orbital speed', issues);
  const m = si(inp.m, 'mass', 'Satellite mass', issues);
  if (inp.geostationary && T === undefined) {
    T = 24 * 3600;
    given(sol, 'T', 'Period (geostationary: one day)', '24 h', T, 'time', 'h');
    sol.assumptions.push('Geostationary orbit: period = 24 h = 86 400 s (Earth’s rotation period).');
  }
  if (issues.some((i) => i.level === 'error')) return sol;
  trackSF(sol, inp.altitude, inp.radius, inp.period, inp.speed, inp.m);
  if (h !== undefined) given(sol, 'h', 'Altitude', rawOf(inp.altitude!), h, 'length', inp.altitude!.unit);
  if (r0 !== undefined) given(sol, 'r', 'Orbital radius', rawOf(inp.radius!), r0, 'length', inp.radius!.unit);
  if (T !== undefined && !inp.geostationary) given(sol, 'T', 'Period', rawOf(inp.period!), T, 'time', inp.period!.unit);
  if (v0 !== undefined) given(sol, 'v', 'Orbital speed', rawOf(inp.speed!), v0, 'velocity', inp.speed!.unit);
  if (m !== undefined) given(sol, 'm', 'Mass of satellite', rawOf(inp.m!), m, 'mass', inp.m!.unit);

  let r: number;
  let step = 1;
  const S = () => `Step ${step++}`;
  if (r0 !== undefined) r = r0;
  else if (h !== undefined) {
    if (R === undefined) return err(sol, 'An altitude was given, so the radius of the central body is needed to find r = R + h.');
    r = R + h;
    sol.steps.push(mkStep(`${S()} — Orbital radius (measured from the centre)`, 'r = R + h', {
      substitutionLatex: `r = ${fmtLatex(R, 4)} + ${fmtLatex(h, 4)}`,
      resultLatex: `r = ${L(r, 'length', sf)}`,
      explanation: 'Gravitation formulas use the distance from the CENTRE of the planet, not the altitude.',
    }));
  } else if (T !== undefined) {
    r = Math.cbrt((G * M * T * T) / (4 * PI * PI));
    sol.steps.push(mkStep(`${S()} — Orbital radius from Kepler’s third law`, '\\frac{r^3}{T^2} = \\frac{GM}{4\\pi^2}', {
      rearrangedLatex: 'r = \\sqrt[3]{\\frac{GMT^2}{4\\pi^2}}',
      substitutionLatex: `r = \\sqrt[3]{\\frac{${fmtLatex(G, 4)} \\times ${fmtLatex(M, 4)} \\times ${B(fmtLatex(T, 4))}^2}{4\\pi^2}}`,
      resultLatex: `r = ${L(r, 'length', sf)}`,
    }));
  } else if (v0 !== undefined) {
    r = (G * M) / (v0 * v0);
    sol.steps.push(mkStep(`${S()} — Orbital radius from the orbital speed`, 'v = \\sqrt{\\frac{GM}{r}}', {
      derivationLatex: ['\\frac{GMm}{r^2} = \\frac{mv^2}{r}'],
      rearrangedLatex: 'r = \\frac{GM}{v^2}',
      substitutionLatex: `r = \\frac{${fmtLatex(G, 4)} \\times ${fmtLatex(M, 4)}}{${B(fmtLatex(v0, 4))}^2}`,
      resultLatex: `r = ${L(r, 'length', sf)}`,
    }));
  } else return err(sol, 'Give one orbit specification: altitude, orbital radius, period or orbital speed.');

  if (R !== undefined && r < R) return err(sol, `Orbital radius ${fmtLatex(r, 3)} m is less than the radius of the central body — impossible orbit.`);
  const alt = R !== undefined ? r - R : undefined;
  if (alt !== undefined && h === undefined) {
    sol.steps.push(mkStep(`${S()} — Altitude above the surface`, 'h = r - R', { substitutionLatex: `h = ${fmtLatex(r, 4)} - ${fmtLatex(R!, 4)}`, resultLatex: `h = ${L(alt, 'length', sf)}` }));
  }
  const v = Math.sqrt((G * M) / r);
  if (v0 === undefined) {
    sol.steps.push(mkStep(`${S()} — Orbital speed (gravity provides the centripetal force)`, 'v = \\sqrt{\\frac{GM}{r}}', {
      derivationLatex: ['\\frac{GMm}{r^2} = \\frac{mv^2}{r} \\Rightarrow v^2 = \\frac{GM}{r}'],
      substitutionLatex: `v = \\sqrt{\\frac{${fmtLatex(G, 4)} \\times ${fmtLatex(M, 4)}}{${fmtLatex(r, 4)}}}`,
      resultLatex: `v = ${L(v, 'velocity', sf)}`,
    }));
  }
  const Tc = (2 * PI * r) / v;
  if (T === undefined) {
    sol.steps.push(mkStep(`${S()} — Period`, 'v = \\frac{2\\pi r}{T}', {
      rearrangedLatex: 'T = \\frac{2\\pi r}{v}',
      substitutionLatex: `T = \\frac{2\\pi \\times ${fmtLatex(r, 4)}}{${fmtLatex(v, 4)}}`,
      resultLatex: `T = ${L(Tc, 'time', sf)} = ${fmtLatex(Tc / 3600, sf)}\\ \\text{h}`,
    }));
  }
  const a = (G * M) / (r * r);
  sol.steps.push(mkStep(`${S()} — Centripetal acceleration = gravitational field strength at r`, 'a_c = g = \\frac{GM}{r^2}', {
    substitutionLatex: `g = \\frac{${fmtLatex(G, 4)} \\times ${fmtLatex(M, 4)}}{${B(fmtLatex(r, 4))}^2}`,
    resultLatex: `g = ${L(a, 'gfield', sf)}`,
  }));
  const vesc = Math.sqrt((2 * G * M) / r);
  final(sol, { symbolLatex: 'r', name: 'Orbital radius', valueSI: r, quantity: 'length' });
  if (alt !== undefined) final(sol, { symbolLatex: 'h', name: 'Altitude', valueSI: alt, quantity: 'length' });
  final(sol, { symbolLatex: 'v', name: 'Orbital speed', valueSI: v, quantity: 'velocity' });
  final(sol, { symbolLatex: 'T', name: 'Orbital period', valueSI: T ?? Tc, quantity: 'time' });
  final(sol, { symbolLatex: 'a_c', name: 'Centripetal acceleration (= g at this radius)', valueSI: a, quantity: 'acceleration' });
  final(sol, { symbolLatex: 'v_{esc}', name: 'Escape velocity from this radius', valueSI: vesc, quantity: 'velocity' });

  if (m !== undefined) {
    const F = (G * M * m) / (r * r);
    const K = (G * M * m) / (2 * r);
    const U = -(G * M * m) / r;
    const E = U + K;
    sol.steps.push(mkStep(`${S()} — Gravitational (centripetal) force`, 'F = \\frac{GMm}{r^2}', {
      substitutionLatex: `F = \\frac{${fmtLatex(G, 4)} \\times ${fmtLatex(M, 4)} \\times ${fmtLatex(m, 4)}}{${B(fmtLatex(r, 4))}^2}`,
      resultLatex: `F = ${L(F, 'force', sf)}`,
    }));
    sol.steps.push(mkStep(`${S()} — Energies in orbit`, 'K = \\tfrac{1}{2}mv^2 = \\frac{GMm}{2r},\\quad U = -\\frac{GMm}{r},\\quad E = K + U = -\\frac{GMm}{2r}', {
      lines: [`K = ${L(K, 'energy', sf)}`, `U = ${L(U, 'energy', sf)}`, `E = ${L(E, 'energy', sf)}`],
      resultLatex: `E_{total} = ${L(E, 'energy', sf)}`,
      explanation: 'The total energy is negative: the satellite is bound to the planet.',
    }));
    final(sol, { symbolLatex: 'F', name: 'Gravitational force on satellite', valueSI: F, quantity: 'force' });
    final(sol, { symbolLatex: 'K', name: 'Kinetic energy', valueSI: K, quantity: 'energy' });
    final(sol, { symbolLatex: 'U', name: 'Gravitational potential energy', valueSI: U, quantity: 'energy' });
    final(sol, { symbolLatex: 'E', name: 'Total orbital energy', valueSI: E, quantity: 'energy' });
    if (R !== undefined) {
      const Us = -(G * M * m) / R;
      const dE = E - Us;
      sol.steps.push(mkStep(`${S()} — Energy to place the satellite in orbit from the surface`, '\\Delta E = E_{orbit} - U_{surface} = -\\frac{GMm}{2r} + \\frac{GMm}{R}', {
        substitutionLatex: `\\Delta E = ${fmtLatex(E, 4)} - ${B(fmtLatex(Us, 4))}`,
        resultLatex: `\\Delta E = ${L(dE, 'energy', sf)}`,
        note: 'ignores the kinetic energy the satellite already has from Earth’s rotation, and air resistance',
      }));
      final(sol, { symbolLatex: '\\Delta E', name: 'Minimum energy to reach this orbit from the surface', valueSI: dE, quantity: 'energy' });
    }
  } else sol.explanation.push('Orbital speed and period do not depend on the satellite’s mass. Give the mass to get forces and energies.');

  // g vs r graph
  const pts: [number, number][] = [];
  const rMin = R ?? r / 4;
  const rMax = Math.max(r * 1.6, rMin * 4);
  for (let i = 0; i <= 80; i++) {
    const x = rMin + ((rMax - rMin) * i) / 80;
    pts.push([x, (G * M) / (x * x)]);
  }
  sol.graph = { title: 'Gravitational field strength vs distance from the centre', xLabel: 'r (m)', yLabel: 'g (N kg⁻¹)', series: [{ label: 'g = GM/r²', points: pts }], markers: [{ x: r, y: a, label: 'Orbit' }], yZero: true };
  sol.directions.push({ title: 'Direction', lines: ['The gravitational (centripetal) force and acceleration point towards the centre of the planet.', 'The velocity is tangential — perpendicular to the radius — so gravity does no work in a circular orbit and the speed is constant.'] });
  sol.ok = true;
  return sol;
}
