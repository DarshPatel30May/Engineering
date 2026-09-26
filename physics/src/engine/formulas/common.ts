/** Shared constant-variable factories (NESA data-sheet values). */
import { DERIVED, NESA } from '../constants';
import { v, VarDef } from './types';

export const DEG = Math.PI / 180;
const DS = 'NESA data sheet';

export const gVar = (): VarDef => v('g', 'g', 'Gravitational acceleration / field strength', 'gfield', { constant: NESA.g.value, constantSource: DS, positive: true, constantUnless: ['M', 'Rp'] });
export const GVar = (): VarDef => v('G', 'G', 'Universal gravitational constant', 'gravConst', { constant: NESA.G.value, constantSource: DS, positive: true });
export const cVar = (): VarDef => v('c', 'c', 'Speed of light', 'velocity', { constant: NESA.c.value, constantSource: DS, positive: true });
export const hVar = (): VarDef => v('h', 'h', 'Planck constant', 'planck', { constant: NESA.h.value, constantSource: DS, positive: true });
export const eVar = (): VarDef => v('e', 'e', 'Elementary charge (magnitude)', 'charge', { constant: NESA.e.value, constantSource: DS, positive: true, concept: 'eCharge' });
export const mu0Var = (): VarDef => v('mu0', '\\mu_0', 'Magnetic permeability constant', 'permeability', { constant: NESA.mu0.value, constantSource: DS, positive: true });
export const eps0Var = (): VarDef => v('eps0', '\\varepsilon_0', 'Electric permittivity constant', 'permittivity', { constant: NESA.eps0.value, constantSource: DS, positive: true });
export const kVar = (): VarDef => v('k', 'k', 'Coulomb constant 1/(4πε₀)', 'coulombK', { constant: DERIVED.kC.value, constantSource: 'k = 1/(4πε₀), ε₀ from data sheet', positive: true });
export const bVar = (): VarDef => v('b', 'b', "Wien's displacement constant", 'wien', { constant: NESA.b.value, constantSource: DS, positive: true });
export const RVar = (): VarDef => v('Ry', 'R', 'Rydberg constant', 'waveNumber', { constant: NESA.R.value, constantSource: DS, positive: true });

/** strict speed limit for massive objects */
export const belowC = { below: NESA.c.value, belowText: 'A massive object cannot travel at or above the speed of light (v < c).' };

export const sq = (x: number) => x * x;
export const clampAngleIssue = (x: number) => (Math.abs(x) > 1 + 1e-12 ? NaN : Math.max(-1, Math.min(1, x)));
export const asin = (x: number) => Math.asin(clampAngleIssue(x));
export const acos = (x: number) => Math.acos(clampAngleIssue(x));
