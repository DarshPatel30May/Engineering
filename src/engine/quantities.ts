/**
 * Quantity kinds: what a variable physically represents. Each kind has one coherent SI
 * unit (used for all internal arithmetic), a list of common HSC display units, and the
 * unit normally expected in an HSC response.
 *
 * Several kinds share a dimension (e.g. stress and Young's modulus are both Pa;
 * moment and energy are both N·m = J). Keeping them separate lets the app pick the
 * right display unit — GPa for modulus, MPa for stress, kN·m for bending moment.
 */
import { Dim, DIMLESS, parseUnit } from './units';

export interface QuantityKind {
  id: string;
  name: string;
  dim: Dim;
  /** coherent SI unit symbol */
  si: string;
  /** LaTeX of SI unit */
  siLatex: string;
  /** display/equivalent units (in order of size) */
  units: string[];
  /** unit normally expected in an HSC answer */
  hsc: string;
  /** units accepted as input (defaults to `units`) */
  inputUnits?: string[];
  /** if true the value is displayed in degrees etc. */
  angle?: boolean;
  percent?: boolean;
}

const q = (k: QuantityKind) => k;

export const QUANTITIES = {
  dimensionless: q({ id: 'dimensionless', name: 'Dimensionless', dim: DIMLESS, si: '', siLatex: '', units: [''], hsc: '' }),
  ratio: q({ id: 'ratio', name: 'Ratio', dim: DIMLESS, si: '', siLatex: '', units: [''], hsc: '' }),
  percent: q({ id: 'percent', name: 'Fraction / percentage', dim: DIMLESS, si: '', siLatex: '', units: ['%', ''], hsc: '%', percent: true }),
  count: q({ id: 'count', name: 'Count', dim: DIMLESS, si: '', siLatex: '', units: [''], hsc: '' }),
  angle: q({ id: 'angle', name: 'Angle', dim: DIMLESS, si: 'rad', siLatex: '\\text{rad}', units: ['°', 'rad'], hsc: '°', angle: true }),
  length: q({ id: 'length', name: 'Length', dim: [1, 0, 0, 0], si: 'm', siLatex: '\\text{m}', units: ['mm', 'cm', 'm', 'km'], hsc: 'm', inputUnits: ['μm', 'mm', 'cm', 'm', 'km'] }),
  area: q({ id: 'area', name: 'Area', dim: [2, 0, 0, 0], si: 'm²', siLatex: '\\text{m}^2', units: ['mm²', 'cm²', 'm²'], hsc: 'mm²' }),
  volume: q({ id: 'volume', name: 'Volume', dim: [3, 0, 0, 0], si: 'm³', siLatex: '\\text{m}^3', units: ['mm³', 'cm³', 'L', 'm³'], hsc: 'm³' }),
  sectionModulus: q({ id: 'sectionModulus', name: 'Section modulus', dim: [3, 0, 0, 0], si: 'm³', siLatex: '\\text{m}^3', units: ['mm³', 'cm³', 'm³'], hsc: 'mm³' }),
  secondMoment: q({ id: 'secondMoment', name: 'Second moment of area', dim: [4, 0, 0, 0], si: 'm⁴', siLatex: '\\text{m}^4', units: ['mm⁴', 'cm⁴', 'm⁴'], hsc: 'mm⁴' }),
  mass: q({ id: 'mass', name: 'Mass', dim: [0, 1, 0, 0], si: 'kg', siLatex: '\\text{kg}', units: ['g', 'kg', 't'], hsc: 'kg' }),
  time: q({ id: 'time', name: 'Time', dim: [0, 0, 1, 0], si: 's', siLatex: '\\text{s}', units: ['μs', 'ms', 's', 'min', 'h'], hsc: 's' }),
  velocity: q({ id: 'velocity', name: 'Velocity', dim: [1, 0, -1, 0], si: 'm/s', siLatex: '\\text{m/s}', units: ['m/s', 'km/h'], hsc: 'm/s' }),
  acceleration: q({ id: 'acceleration', name: 'Acceleration', dim: [1, 0, -2, 0], si: 'm/s²', siLatex: '\\text{m/s}^2', units: ['m/s²'], hsc: 'm/s²' }),
  angularVelocity: q({ id: 'angularVelocity', name: 'Angular / rotational speed', dim: [0, 0, -1, 0], si: 'rad/s', siLatex: '\\text{rad/s}', units: ['rad/s', 'rpm'], hsc: 'rpm' }),
  force: q({ id: 'force', name: 'Force', dim: [1, 1, -2, 0], si: 'N', siLatex: '\\text{N}', units: ['N', 'kN', 'MN'], hsc: 'kN' }),
  udl: q({ id: 'udl', name: 'Distributed load (force per length)', dim: [0, 1, -2, 0], si: 'N/m', siLatex: '\\text{N/m}', units: ['N/m', 'kN/m'], hsc: 'kN/m' }),
  stiffness: q({ id: 'stiffness', name: 'Stiffness (spring constant)', dim: [0, 1, -2, 0], si: 'N/m', siLatex: '\\text{N/m}', units: ['N/m', 'N/mm', 'kN/m'], hsc: 'N/m' }),
  stress: q({ id: 'stress', name: 'Stress', dim: [-1, 1, -2, 0], si: 'Pa', siLatex: '\\text{Pa}', units: ['Pa', 'kPa', 'MPa', 'GPa', 'N/mm²'], hsc: 'MPa' }),
  modulus: q({ id: 'modulus', name: "Young's modulus", dim: [-1, 1, -2, 0], si: 'Pa', siLatex: '\\text{Pa}', units: ['Pa', 'kPa', 'MPa', 'GPa', 'N/mm²'], hsc: 'GPa' }),
  pressure: q({ id: 'pressure', name: 'Pressure', dim: [-1, 1, -2, 0], si: 'Pa', siLatex: '\\text{Pa}', units: ['Pa', 'kPa', 'MPa', 'GPa', 'N/mm²'], hsc: 'kPa', inputUnits: ['Pa', 'kPa', 'MPa', 'GPa', 'N/mm²', 'N/m²', 'bar', 'atm'] }),
  energyDensity: q({ id: 'energyDensity', name: 'Energy per unit volume', dim: [-1, 1, -2, 0], si: 'J/m³', siLatex: '\\text{J/m}^3', units: ['J/m³', 'kJ/m³', 'MJ/m³'], hsc: 'MJ/m³' }),
  moment: q({ id: 'moment', name: 'Moment / torque', dim: [2, 1, -2, 0], si: 'N·m', siLatex: '\\text{N·m}', units: ['N·mm', 'N·m', 'kN·m'], hsc: 'kN·m' }),
  torque: q({ id: 'torque', name: 'Torque', dim: [2, 1, -2, 0], si: 'N·m', siLatex: '\\text{N·m}', units: ['N·mm', 'N·m', 'kN·m'], hsc: 'N·m' }),
  energy: q({ id: 'energy', name: 'Energy / work', dim: [2, 1, -2, 0], si: 'J', siLatex: '\\text{J}', units: ['J', 'kJ', 'MJ', 'kWh'], hsc: 'kJ' }),
  power: q({ id: 'power', name: 'Power', dim: [2, 1, -3, 0], si: 'W', siLatex: '\\text{W}', units: ['mW', 'W', 'kW', 'MW'], hsc: 'kW' }),
  massFlow: q({ id: 'massFlow', name: 'Mass flow rate', dim: [0, 1, -1, 0], si: 'kg/s', siLatex: '\\text{kg/s}', units: ['kg/s', 'kg/min'], hsc: 'kg/s' }),
  hardnessB: q({ id: 'hardnessB', name: 'Brinell hardness', dim: [-1, 1, -2, 0], si: 'Pa', siLatex: '\\text{Pa}', units: ['HB', 'MPa'], hsc: 'HB' }),
  hardnessV: q({ id: 'hardnessV', name: 'Vickers hardness', dim: [-1, 1, -2, 0], si: 'Pa', siLatex: '\\text{Pa}', units: ['HV', 'MPa'], hsc: 'HV' }),
  money: q({ id: 'money', name: 'Cost', dim: [0, 0, 0, 0], si: '$', siLatex: '\\$', units: ['$', 'c'], hsc: '$' }),
  tariff: q({ id: 'tariff', name: 'Energy tariff', dim: [-2, -1, 2, 0], si: '$/J', siLatex: '\\$/\\text{J}', units: ['$/kWh', 'c/kWh'], hsc: '$/kWh' }),
  momentum: q({ id: 'momentum', name: 'Momentum / impulse', dim: [1, 1, -1, 0], si: 'kg·m/s', siLatex: '\\text{kg·m/s}', units: ['kg·m/s', 'N·s'], hsc: 'kg·m/s' }),
  density: q({ id: 'density', name: 'Density', dim: [-3, 1, 0, 0], si: 'kg/m³', siLatex: '\\text{kg/m}^3', units: ['kg/m³', 'g/cm³'], hsc: 'kg/m³' }),
  voltage: q({ id: 'voltage', name: 'Voltage', dim: [2, 1, -3, -1], si: 'V', siLatex: '\\text{V}', units: ['μV', 'mV', 'V', 'kV'], hsc: 'V' }),
  current: q({ id: 'current', name: 'Current', dim: [0, 0, 0, 1], si: 'A', siLatex: '\\text{A}', units: ['μA', 'mA', 'A'], hsc: 'A' }),
  resistance: q({ id: 'resistance', name: 'Resistance', dim: [2, 1, -3, -2], si: 'Ω', siLatex: '\\Omega', units: ['Ω', 'kΩ', 'MΩ'], hsc: 'Ω' }),
  charge: q({ id: 'charge', name: 'Charge / battery capacity', dim: [0, 0, 1, 1], si: 'C', siLatex: '\\text{C}', units: ['C', 'mAh', 'Ah'], hsc: 'Ah' }),
  frequency: q({ id: 'frequency', name: 'Frequency', dim: [0, 0, -1, 0], si: 'Hz', siLatex: '\\text{Hz}', units: ['Hz', 'kHz', 'MHz', 'GHz'], hsc: 'Hz' }),
  dataRate: q({ id: 'dataRate', name: 'Data rate', dim: [0, 0, -1, 0], si: 'bit/s', siLatex: '\\text{bit/s}', units: ['bit/s', 'kbit/s', 'Mbit/s', 'Gbit/s'], hsc: 'Mbit/s', inputUnits: ['bit/s', 'kbit/s', 'Mbit/s', 'Gbit/s', 'B/s', 'kB/s', 'MB/s'] }),
  data: q({ id: 'data', name: 'Data size', dim: DIMLESS, si: 'bit', siLatex: '\\text{bit}', units: ['bit', 'kbit', 'Mbit', 'B', 'kB', 'MB', 'GB'], hsc: 'MB' }),
  decibel: q({ id: 'decibel', name: 'Gain / loss (decibels)', dim: DIMLESS, si: 'dB', siLatex: '\\text{dB}', units: ['dB'], hsc: 'dB' }),
  attenuation: q({ id: 'attenuation', name: 'Attenuation per length', dim: [-1, 0, 0, 0], si: 'dB/m', siLatex: '\\text{dB/m}', units: ['dB/m', 'dB/km'], hsc: 'dB/km' }),
} satisfies Record<string, QuantityKind>;

export type QuantityId = keyof typeof QUANTITIES;

export function getQuantity(id: string): QuantityKind {
  const k = (QUANTITIES as Record<string, QuantityKind>)[id];
  if (!k) throw new Error(`Unknown quantity kind ${id}`);
  return k;
}

/** Units the user may pick when entering a value of this kind. */
export function inputUnitsFor(id: string): string[] {
  const k = getQuantity(id);
  return k.inputUnits ?? k.units;
}

/** Unit factor lookup that tolerates the dB/decibel pseudo units. */
export function unitFactor(unit: string): number {
  if (unit === 'dB' || unit === 'dB/m') return 1;
  if (unit === 'dB/km') return 1e-3;
  return parseUnit(unit).factor;
}
