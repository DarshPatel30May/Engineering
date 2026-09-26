/**
 * Physical constants.
 *
 * `NESA` holds the values printed on the NESA Physics Stage 6 HSC data sheet (used for every
 * HSC exam since 2019). These values always take priority over "textbook" values in this app,
 * and a value supplied in the question always takes priority over the data sheet.
 *
 * `DERIVED` values are calculated from data-sheet values (e.g. k = 1/4πε₀).
 * `SUPPLEMENTARY` values are NOT on the data sheet. They are never substituted automatically:
 * the Smart Solver only mentions them when a question needs one and does not supply it.
 */

export type ConstantSource = 'NESA data sheet' | 'Derived from data sheet' | 'Not on data sheet';

export interface PhysConst {
  id: string;
  name: string;
  symbol: string;
  /** LaTeX symbol */
  latex: string;
  value: number;
  /** SI unit as printed */
  unit: string;
  /** optional display string of the value as printed (e.g. "4π × 10⁻⁷") */
  printed?: string;
  source: ConstantSource;
  note?: string;
}

const k = (c: PhysConst) => c;

export const NESA = {
  e: k({ id: 'e', name: 'Charge on electron (magnitude: elementary charge)', symbol: 'qₑ', latex: 'q_e', value: 1.602e-19, unit: 'C', printed: '−1.602 × 10⁻¹⁹', source: 'NESA data sheet', note: 'The data sheet lists qₑ = −1.602 × 10⁻¹⁹ C. The proton charge is +1.602 × 10⁻¹⁹ C.' }),
  me: k({ id: 'me', name: 'Mass of electron', symbol: 'mₑ', latex: 'm_e', value: 9.109e-31, unit: 'kg', source: 'NESA data sheet' }),
  mn: k({ id: 'mn', name: 'Mass of neutron', symbol: 'mₙ', latex: 'm_n', value: 1.675e-27, unit: 'kg', source: 'NESA data sheet' }),
  mp: k({ id: 'mp', name: 'Mass of proton', symbol: 'mₚ', latex: 'm_p', value: 1.673e-27, unit: 'kg', source: 'NESA data sheet' }),
  vSound: k({ id: 'vSound', name: 'Speed of sound in air', symbol: 'v', latex: 'v_{sound}', value: 340, unit: 'm s⁻¹', source: 'NESA data sheet' }),
  g: k({ id: 'g', name: "Earth's gravitational acceleration", symbol: 'g', latex: 'g', value: 9.8, unit: 'm s⁻²', source: 'NESA data sheet' }),
  c: k({ id: 'c', name: 'Speed of light', symbol: 'c', latex: 'c', value: 3.0e8, unit: 'm s⁻¹', printed: '3.00 × 10⁸', source: 'NESA data sheet' }),
  eps0: k({ id: 'eps0', name: 'Electric permittivity constant', symbol: 'ε₀', latex: '\\varepsilon_0', value: 8.854e-12, unit: 'A² s⁴ kg⁻¹ m⁻³', source: 'NESA data sheet' }),
  mu0: k({ id: 'mu0', name: 'Magnetic permeability constant', symbol: 'μ₀', latex: '\\mu_0', value: 4 * Math.PI * 1e-7, unit: 'N A⁻²', printed: '4π × 10⁻⁷', source: 'NESA data sheet' }),
  G: k({ id: 'G', name: 'Universal gravitational constant', symbol: 'G', latex: 'G', value: 6.67e-11, unit: 'N m² kg⁻²', source: 'NESA data sheet' }),
  ME: k({ id: 'ME', name: 'Mass of Earth', symbol: 'M_E', latex: 'M_E', value: 6.0e24, unit: 'kg', source: 'NESA data sheet' }),
  rE: k({ id: 'rE', name: 'Radius of Earth', symbol: 'r_E', latex: 'r_E', value: 6.371e6, unit: 'm', source: 'NESA data sheet' }),
  h: k({ id: 'h', name: 'Planck constant', symbol: 'h', latex: 'h', value: 6.626e-34, unit: 'J s', source: 'NESA data sheet' }),
  R: k({ id: 'R', name: 'Rydberg constant', symbol: 'R', latex: 'R', value: 1.097e7, unit: 'm⁻¹', source: 'NESA data sheet' }),
  u: k({ id: 'u', name: 'Atomic mass unit', symbol: 'u', latex: 'u', value: 1.661e-27, unit: 'kg', printed: '1.661 × 10⁻²⁷ kg = 931.5 MeV/c²', source: 'NESA data sheet' }),
  uMeV: k({ id: 'uMeV', name: 'Atomic mass unit (energy equivalent)', symbol: 'u', latex: 'u', value: 931.5, unit: 'MeV/c²', source: 'NESA data sheet' }),
  eV: k({ id: 'eV', name: 'Electron volt', symbol: '1 eV', latex: '1\\ \\text{eV}', value: 1.602e-19, unit: 'J', source: 'NESA data sheet' }),
  rhoWater: k({ id: 'rhoWater', name: 'Density of water', symbol: 'ρ', latex: '\\rho', value: 1.0e3, unit: 'kg m⁻³', printed: '1.00 × 10³', source: 'NESA data sheet' }),
  cWater: k({ id: 'cWater', name: 'Specific heat capacity of water', symbol: 'c', latex: 'c', value: 4.18e3, unit: 'J kg⁻¹ K⁻¹', source: 'NESA data sheet' }),
  b: k({ id: 'b', name: "Wien's displacement constant", symbol: 'b', latex: 'b', value: 2.898e-3, unit: 'm K', source: 'NESA data sheet' }),
} as const;

export const DERIVED = {
  kC: k({ id: 'kC', name: 'Coulomb constant k = 1/(4πε₀)', symbol: 'k', latex: 'k', value: 1 / (4 * Math.PI * NESA.eps0.value), unit: 'N m² C⁻²', source: 'Derived from data sheet', note: 'k = 1/(4πε₀) using ε₀ from the data sheet ≈ 8.988 × 10⁹ N m² C⁻²' }),
  hc: k({ id: 'hc', name: 'Planck constant × speed of light', symbol: 'hc', latex: 'hc', value: NESA.h.value * NESA.c.value, unit: 'J m', source: 'Derived from data sheet' }),
  E1: k({ id: 'E1', name: 'Hydrogen ground-state energy (Bohr model)', symbol: 'E₁', latex: 'E_1', value: -13.6 * NESA.eV.value, unit: 'J', printed: '−13.6 eV', source: 'Derived from data sheet', note: 'From the Bohr model: Eₙ = −13.6 eV / n². Consistent with hcR = 13.6 eV using data-sheet h, c and R.' }),
  qOverMe: k({ id: 'qOverMe', name: 'Electron charge-to-mass ratio', symbol: 'e/mₑ', latex: 'e/m_e', value: NESA.e.value / NESA.me.value, unit: 'C kg⁻¹', source: 'Derived from data sheet' }),
  gE: k({ id: 'gE', name: 'g at Earth surface from GM/r²', symbol: 'g', latex: 'g', value: (NESA.G.value * NESA.ME.value) / NESA.rE.value ** 2, unit: 'N kg⁻¹', source: 'Derived from data sheet', note: 'GM_E / r_E² ≈ 9.86 N kg⁻¹ with data-sheet values (the data sheet also lists g = 9.8 m s⁻²).' }),
} as const;

export const SUPPLEMENTARY = {
  mAlpha: k({ id: 'mAlpha', name: 'Mass of alpha particle', symbol: 'm_α', latex: 'm_\\alpha', value: 6.645e-27, unit: 'kg', printed: '6.645 × 10⁻²⁷ (4.0015 u)', source: 'Not on data sheet', note: 'Not on the data sheet — HSC questions give it when needed. Used only if the question omits it, and flagged when used.' }),
  sigmaSB: k({ id: 'sigmaSB', name: 'Stefan–Boltzmann constant', symbol: 'σ', latex: '\\sigma', value: 5.67e-8, unit: 'W m⁻² K⁻⁴', source: 'Not on data sheet', note: 'Not part of the NESA data sheet; Stefan–Boltzmann is beyond the HSC formula sheet.' }),
  MSun: k({ id: 'MSun', name: 'Mass of the Sun', symbol: 'M☉', latex: 'M_\\odot', value: 1.989e30, unit: 'kg', source: 'Not on data sheet', note: 'Given in the question when needed.' }),
  RSun: k({ id: 'RSun', name: 'Radius of the Sun', symbol: 'R☉', latex: 'R_\\odot', value: 6.96e8, unit: 'm', source: 'Not on data sheet' }),
  LSun: k({ id: 'LSun', name: 'Luminosity of the Sun', symbol: 'L☉', latex: 'L_\\odot', value: 3.846e26, unit: 'W', source: 'Not on data sheet' }),
  MMoon: k({ id: 'MMoon', name: 'Mass of the Moon', symbol: 'M_Moon', latex: 'M_{Moon}', value: 7.35e22, unit: 'kg', source: 'Not on data sheet' }),
  RMoon: k({ id: 'RMoon', name: 'Radius of the Moon', symbol: 'R_Moon', latex: 'R_{Moon}', value: 1.737e6, unit: 'm', source: 'Not on data sheet' }),
  AU: k({ id: 'AU', name: 'Astronomical unit', symbol: 'AU', latex: '\\text{AU}', value: 1.496e11, unit: 'm', source: 'Not on data sheet' }),
  ly: k({ id: 'ly', name: 'Light-year', symbol: 'ly', latex: '\\text{ly}', value: 9.461e15, unit: 'm', source: 'Not on data sheet' }),
  pc: k({ id: 'pc', name: 'Parsec', symbol: 'pc', latex: '\\text{pc}', value: 3.086e16, unit: 'm', source: 'Not on data sheet' }),
  year: k({ id: 'year', name: 'Year (365.25 days)', symbol: 'yr', latex: '\\text{yr}', value: 365.25 * 86400, unit: 's', source: 'Not on data sheet', note: 'For half-life questions the time unit cancels, so no conversion is needed.' }),
} as const;

export const ALL_CONSTANTS: PhysConst[] = [...Object.values(NESA), ...Object.values(DERIVED), ...Object.values(SUPPLEMENTARY)];

/** Particle database used by the Smart Solver and the particle tools. Charges are signed. */
export interface Particle {
  id: string;
  name: string;
  words: string[];
  mass?: number;
  massSource?: ConstantSource;
  charge: number;
  symbolLatex: string;
}

export const PARTICLES: Particle[] = [
  { id: 'electron', name: 'Electron', words: ['electron', 'electrons', 'beta particle', 'beta-minus', 'beta minus', 'β⁻', 'cathode ray', 'cathode rays'], mass: NESA.me.value, massSource: 'NESA data sheet', charge: -NESA.e.value, symbolLatex: 'e^-' },
  { id: 'positron', name: 'Positron', words: ['positron', 'positrons', 'beta-plus', 'beta plus', 'β⁺'], mass: NESA.me.value, massSource: 'NESA data sheet', charge: NESA.e.value, symbolLatex: 'e^+' },
  { id: 'proton', name: 'Proton', words: ['proton', 'protons', 'hydrogen nucleus', 'hydrogen ion', 'h+ ion', 'hydrogen nuclei'], mass: NESA.mp.value, massSource: 'NESA data sheet', charge: NESA.e.value, symbolLatex: 'p' },
  { id: 'neutron', name: 'Neutron', words: ['neutron', 'neutrons'], mass: NESA.mn.value, massSource: 'NESA data sheet', charge: 0, symbolLatex: 'n' },
  { id: 'alpha', name: 'Alpha particle', words: ['alpha particle', 'alpha particles', 'α particle', 'α-particle', 'alpha-particle', 'helium nucleus', 'helium nuclei', 'helium-4 nucleus'], mass: SUPPLEMENTARY.mAlpha.value, massSource: 'Not on data sheet', charge: 2 * NESA.e.value, symbolLatex: '\\alpha' },
  { id: 'deuteron', name: 'Deuteron', words: ['deuteron', 'deuterium nucleus'], charge: NESA.e.value, symbolLatex: 'd' },
  { id: 'muon', name: 'Muon', words: ['muon', 'muons'], charge: -NESA.e.value, symbolLatex: '\\mu^-' },
  { id: 'photon', name: 'Photon', words: ['photon', 'photons'], mass: 0, charge: 0, symbolLatex: '\\gamma' },
];
