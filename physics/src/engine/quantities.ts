/**
 * Quantity kinds: what a variable physically represents. Each kind has one coherent SI
 * unit (used for all internal arithmetic), a list of common display units, and the unit
 * normally used for an HSC answer.
 *
 * Several kinds share a dimension (energy / torque; acceleration / gravitational field
 * strength; frequency / decay constant / activity). Keeping them separate lets the app
 * pick the right display unit — eV for a photon, MeV for a binding energy, N m for a
 * torque, Bq for an activity.
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
  /** display/equivalent units */
  units: string[];
  /** unit normally expected in an HSC answer */
  hsc: string;
  /** units accepted as input (defaults to `units`) */
  inputUnits?: string[];
  angle?: boolean;
  percent?: boolean;
  /** accepts any unit (e.g. an amount of radioactive material in g, nuclei, Bq or %); related values must share a unit */
  anyUnit?: boolean;
  /** prefer scientific notation in the HSC unit rather than switching prefixes */
  sci?: boolean;
}

const q = (k: QuantityKind) => k;
const D = (l: number, m: number, t: number, i: number, th = 0): Dim => [l, m, t, i, th];

export const QUANTITIES = {
  dimensionless: q({ id: 'dimensionless', name: 'Dimensionless number', dim: DIMLESS, si: '', siLatex: '', units: [''], hsc: '' }),
  ratio: q({ id: 'ratio', name: 'Ratio', dim: DIMLESS, si: '', siLatex: '', units: [''], hsc: '' }),
  amount: q({ id: 'amount', name: 'Amount (any consistent unit)', dim: DIMLESS, si: '', siLatex: '', units: [''], hsc: '', anyUnit: true, inputUnits: ['', 'g', 'kg', 'mg', 'μg', '%', 'Bq', 'kBq', 'MBq', 'atoms', 'nuclei'] }),
  count: q({ id: 'count', name: 'Number', dim: DIMLESS, si: '', siLatex: '', units: [''], hsc: '' }),
  percent: q({ id: 'percent', name: 'Fraction / percentage', dim: DIMLESS, si: '', siLatex: '', units: ['%', ''], hsc: '%', percent: true }),
  angle: q({ id: 'angle', name: 'Angle', dim: DIMLESS, si: 'rad', siLatex: '\\text{rad}', units: ['°', 'rad'], hsc: '°', angle: true }),
  length: q({ id: 'length', name: 'Length / distance', dim: D(1, 0, 0, 0), si: 'm', siLatex: '\\text{m}', units: ['nm', 'μm', 'mm', 'cm', 'm', 'km'], hsc: 'm', inputUnits: ['pm', 'nm', 'μm', 'mm', 'cm', 'm', 'km', 'AU', 'ly', 'pc', 'Mpc'] }),
  wavelength: q({ id: 'wavelength', name: 'Wavelength', dim: D(1, 0, 0, 0), si: 'm', siLatex: '\\text{m}', units: ['m', 'pm', 'nm', 'μm', 'mm', 'cm'], hsc: 'm', sci: true, inputUnits: ['pm', 'nm', 'μm', 'mm', 'cm', 'm', 'Å'] }),
  astroDistance: q({ id: 'astroDistance', name: 'Astronomical distance', dim: D(1, 0, 0, 0), si: 'm', siLatex: '\\text{m}', units: ['m', 'km', 'AU', 'ly', 'pc', 'Mpc'], hsc: 'm', sci: true }),
  area: q({ id: 'area', name: 'Area', dim: D(2, 0, 0, 0), si: 'm²', siLatex: '\\text{m}^2', units: ['mm²', 'cm²', 'm²'], hsc: 'm²' }),
  volume: q({ id: 'volume', name: 'Volume', dim: D(3, 0, 0, 0), si: 'm³', siLatex: '\\text{m}^3', units: ['cm³', 'L', 'm³'], hsc: 'm³' }),
  mass: q({ id: 'mass', name: 'Mass', dim: D(0, 1, 0, 0), si: 'kg', siLatex: '\\text{kg}', units: ['kg', 'g', 't', 'u'], hsc: 'kg', sci: true, inputUnits: ['kg', 'g', 'mg', 't', 'u', 'MeV/c²'] }),
  atomicMass: q({ id: 'atomicMass', name: 'Mass (atomic scale)', dim: D(0, 1, 0, 0), si: 'kg', siLatex: '\\text{kg}', units: ['kg', 'u', 'MeV/c²'], hsc: 'kg', sci: true, inputUnits: ['u', 'kg', 'MeV/c²', 'g'] }),
  time: q({ id: 'time', name: 'Time', dim: D(0, 0, 1, 0), si: 's', siLatex: '\\text{s}', units: ['s', 'ns', 'μs', 'ms', 'min', 'h', 'days', 'years'], hsc: 's', inputUnits: ['ns', 'μs', 'ms', 's', 'min', 'h', 'days', 'years'] }),
  longTime: q({ id: 'longTime', name: 'Time (long)', dim: D(0, 0, 1, 0), si: 's', siLatex: '\\text{s}', units: ['s', 'min', 'h', 'days', 'years'], hsc: 's', inputUnits: ['s', 'min', 'h', 'days', 'years', 'Myr', 'Gyr'] }),
  velocity: q({ id: 'velocity', name: 'Velocity / speed', dim: D(1, 0, -1, 0), si: 'm/s', siLatex: '\\text{m s}^{-1}', units: ['m/s', 'km/s', 'km/h', 'c'], hsc: 'm/s', inputUnits: ['m/s', 'km/s', 'km/h', 'c'] }),
  acceleration: q({ id: 'acceleration', name: 'Acceleration', dim: D(1, 0, -2, 0), si: 'm/s²', siLatex: '\\text{m s}^{-2}', units: ['m/s²'], hsc: 'm/s²' }),
  gfield: q({ id: 'gfield', name: 'Gravitational field strength', dim: D(1, 0, -2, 0), si: 'N/kg', siLatex: '\\text{N kg}^{-1}', units: ['N/kg', 'm/s²'], hsc: 'N/kg' }),
  force: q({ id: 'force', name: 'Force', dim: D(1, 1, -2, 0), si: 'N', siLatex: '\\text{N}', units: ['N', 'μN', 'mN', 'kN', 'MN'], hsc: 'N', inputUnits: ['N', 'mN', 'μN', 'kN', 'MN'] }),
  forcePerLength: q({ id: 'forcePerLength', name: 'Force per unit length', dim: D(0, 1, -2, 0), si: 'N/m', siLatex: '\\text{N m}^{-1}', units: ['N/m', 'mN/m', 'μN/m'], hsc: 'N/m' }),
  energy: q({ id: 'energy', name: 'Energy / work', dim: D(2, 1, -2, 0), si: 'J', siLatex: '\\text{J}', units: ['J', 'kJ', 'MJ', 'GJ', 'eV'], hsc: 'J', inputUnits: ['J', 'kJ', 'MJ', 'GJ', 'eV', 'keV', 'MeV', 'GeV'] }),
  energyAtomic: q({ id: 'energyAtomic', name: 'Energy (atomic scale)', dim: D(2, 1, -2, 0), si: 'J', siLatex: '\\text{J}', units: ['J', 'eV', 'keV', 'MeV', 'GeV'], hsc: 'J', sci: true, inputUnits: ['J', 'eV', 'keV', 'MeV', 'GeV'] }),
  energyNuclear: q({ id: 'energyNuclear', name: 'Energy (nuclear scale)', dim: D(2, 1, -2, 0), si: 'J', siLatex: '\\text{J}', units: ['MeV', 'J', 'keV', 'GeV', 'eV'], hsc: 'MeV', inputUnits: ['MeV', 'J', 'keV', 'GeV', 'eV'] }),
  power: q({ id: 'power', name: 'Power', dim: D(2, 1, -3, 0), si: 'W', siLatex: '\\text{W}', units: ['W', 'mW', 'kW', 'MW', 'GW'], hsc: 'W', inputUnits: ['mW', 'W', 'kW', 'MW', 'GW', 'TW'] }),
  momentum: q({ id: 'momentum', name: 'Momentum', dim: D(1, 1, -1, 0), si: 'kg m/s', siLatex: '\\text{kg m s}^{-1}', units: ['kg m/s'], hsc: 'kg m/s', sci: true }),
  angularMomentum: q({ id: 'angularMomentum', name: 'Angular momentum', dim: D(2, 1, -1, 0), si: 'J s', siLatex: '\\text{J s}', units: ['J s'], hsc: 'J s', sci: true }),
  torque: q({ id: 'torque', name: 'Torque', dim: D(2, 1, -2, 0), si: 'N m', siLatex: '\\text{N m}', units: ['N m', 'mN m', 'kN m'], hsc: 'N m', inputUnits: ['N m', 'mN m', 'kN m'] }),
  frequency: q({ id: 'frequency', name: 'Frequency', dim: D(0, 0, -1, 0), si: 'Hz', siLatex: '\\text{Hz}', units: ['Hz', 'kHz', 'MHz', 'GHz', 'THz'], hsc: 'Hz', sci: true, inputUnits: ['Hz', 'kHz', 'MHz', 'GHz', 'THz', 'PHz', 'rpm'] }),
  angularVelocity: q({ id: 'angularVelocity', name: 'Angular velocity', dim: D(0, 0, -1, 0), si: 'rad/s', siLatex: '\\text{rad s}^{-1}', units: ['rad/s', 'rpm'], hsc: 'rad/s', inputUnits: ['rad/s', 'rpm', 'rev/s', '°/s'] }),
  rate: q({ id: 'rate', name: 'Rate (per second)', dim: D(0, 0, -1, 0), si: 's⁻¹', siLatex: '\\text{s}^{-1}', units: ['s⁻¹'], hsc: 's⁻¹', sci: true }),
  decayConst: q({ id: 'decayConst', name: 'Decay constant', dim: D(0, 0, -1, 0), si: 's⁻¹', siLatex: '\\text{s}^{-1}', units: ['s⁻¹', 'min⁻¹', 'h⁻¹', 'days⁻¹', 'years⁻¹'], hsc: 's⁻¹', sci: true }),
  activity: q({ id: 'activity', name: 'Activity', dim: D(0, 0, -1, 0), si: 'Bq', siLatex: '\\text{Bq}', units: ['Bq', 'kBq', 'MBq', 'GBq'], hsc: 'Bq' }),
  hubble: q({ id: 'hubble', name: 'Hubble constant', dim: D(0, 0, -1, 0), si: 's⁻¹', siLatex: '\\text{s}^{-1}', units: ['km/s/Mpc', 's⁻¹'], hsc: 'km/s/Mpc', inputUnits: ['km/s/Mpc', 's⁻¹'] }),
  charge: q({ id: 'charge', name: 'Electric charge', dim: D(0, 0, 1, 1), si: 'C', siLatex: '\\text{C}', units: ['C', 'mC', 'μC', 'nC', 'pC'], hsc: 'C', sci: true }),
  current: q({ id: 'current', name: 'Current', dim: D(0, 0, 0, 1), si: 'A', siLatex: '\\text{A}', units: ['A', 'mA', 'μA', 'kA'], hsc: 'A' }),
  voltage: q({ id: 'voltage', name: 'Potential difference / emf', dim: D(2, 1, -3, -1), si: 'V', siLatex: '\\text{V}', units: ['V', 'mV', 'kV', 'MV'], hsc: 'V' }),
  efield: q({ id: 'efield', name: 'Electric field strength', dim: D(1, 1, -3, -1), si: 'V/m', siLatex: '\\text{V m}^{-1}', units: ['V/m', 'N/C', 'kV/m', 'MV/m'], hsc: 'V/m', inputUnits: ['V/m', 'N/C', 'kV/m', 'V/mm', 'V/cm', 'MV/m'] }),
  bfield: q({ id: 'bfield', name: 'Magnetic field strength', dim: D(0, 1, -2, -1), si: 'T', siLatex: '\\text{T}', units: ['T', 'mT', 'μT', 'nT'], hsc: 'T' }),
  flux: q({ id: 'flux', name: 'Magnetic flux', dim: D(2, 1, -2, -1), si: 'Wb', siLatex: '\\text{Wb}', units: ['Wb', 'mWb', 'μWb'], hsc: 'Wb' }),
  resistance: q({ id: 'resistance', name: 'Resistance', dim: D(2, 1, -3, -2), si: 'Ω', siLatex: '\\Omega', units: ['Ω', 'mΩ', 'kΩ', 'MΩ'], hsc: 'Ω' }),
  temperature: q({ id: 'temperature', name: 'Absolute temperature', dim: D(0, 0, 0, 0, 1), si: 'K', siLatex: '\\text{K}', units: ['K', '°C'], hsc: 'K', inputUnits: ['K', '°C'] }),
  intensity: q({ id: 'intensity', name: 'Intensity', dim: D(0, 1, -3, 0), si: 'W/m²', siLatex: '\\text{W m}^{-2}', units: ['W/m²', 'mW/m²', 'kW/m²'], hsc: 'W/m²' }),
  lineDensity: q({ id: 'lineDensity', name: 'Lines per unit length', dim: D(-1, 0, 0, 0), si: 'lines/m', siLatex: '\\text{lines m}^{-1}', units: ['lines/m', 'lines/mm', 'lines/cm'], hsc: 'lines/m' }),
  waveNumber: q({ id: 'waveNumber', name: 'Reciprocal length', dim: D(-1, 0, 0, 0), si: 'm⁻¹', siLatex: '\\text{m}^{-1}', units: ['m⁻¹'], hsc: 'm⁻¹', sci: true }),
  density: q({ id: 'density', name: 'Density', dim: D(-3, 1, 0, 0), si: 'kg/m³', siLatex: '\\text{kg m}^{-3}', units: ['kg/m³', 'g/cm³'], hsc: 'kg/m³' }),
  chargeToMass: q({ id: 'chargeToMass', name: 'Charge-to-mass ratio', dim: D(0, -1, 1, 1), si: 'C/kg', siLatex: '\\text{C kg}^{-1}', units: ['C/kg'], hsc: 'C/kg', sci: true }),
  pressure: q({ id: 'pressure', name: 'Pressure', dim: D(-1, 1, -2, 0), si: 'Pa', siLatex: '\\text{Pa}', units: ['Pa', 'kPa', 'MPa', 'atm'], hsc: 'Pa' }),
  // constants
  gravConst: q({ id: 'gravConst', name: 'Gravitational constant', dim: D(3, -1, -2, 0), si: 'N m² kg⁻²', siLatex: '\\text{N m}^2\\text{ kg}^{-2}', units: ['N m² kg⁻²'], hsc: 'N m² kg⁻²', sci: true }),
  planck: q({ id: 'planck', name: 'Planck constant', dim: D(2, 1, -1, 0), si: 'J s', siLatex: '\\text{J s}', units: ['J s', 'eV s'], hsc: 'J s', sci: true }),
  wien: q({ id: 'wien', name: "Wien's constant", dim: D(1, 0, 0, 0, 1), si: 'm K', siLatex: '\\text{m K}', units: ['m K'], hsc: 'm K', sci: true }),
  coulombK: q({ id: 'coulombK', name: 'Coulomb constant', dim: D(3, 1, -4, -2), si: 'N m² C⁻²', siLatex: '\\text{N m}^2\\text{ C}^{-2}', units: ['N m² C⁻²'], hsc: 'N m² C⁻²', sci: true }),
  permittivity: q({ id: 'permittivity', name: 'Permittivity', dim: D(-3, -1, 4, 2), si: 'A² s⁴ kg⁻¹ m⁻³', siLatex: '\\text{A}^2\\text{ s}^4\\text{ kg}^{-1}\\text{ m}^{-3}', units: ['A² s⁴ kg⁻¹ m⁻³'], hsc: 'A² s⁴ kg⁻¹ m⁻³', sci: true }),
  permeability: q({ id: 'permeability', name: 'Permeability', dim: D(1, 1, -2, -2), si: 'N A⁻²', siLatex: '\\text{N A}^{-2}', units: ['N A⁻²'], hsc: 'N A⁻²', sci: true }),
  stefan: q({ id: 'stefan', name: 'Stefan–Boltzmann constant', dim: D(0, 1, -3, 0, -4), si: 'W m⁻² K⁻⁴', siLatex: '\\text{W m}^{-2}\\text{ K}^{-4}', units: ['W m⁻² K⁻⁴'], hsc: 'W m⁻² K⁻⁴', sci: true }),
  energyPerMass: q({ id: 'energyPerMass', name: 'Energy per unit mass', dim: D(2, 0, -2, 0), si: 'J/kg', siLatex: '\\text{J kg}^{-1}', units: ['J/kg', 'MJ/kg'], hsc: 'J/kg', sci: true }),
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

export function unitFactor(unit: string): number {
  return parseUnit(unit).factor;
}
