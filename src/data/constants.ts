/** Constants and typical material data used in HSC Engineering Studies. */
export interface ConstantRow {
  name: string;
  symbol: string;
  value: string;
  unit: string;
  note?: string;
}

export const PHYSICAL_CONSTANTS: ConstantRow[] = [
  { name: 'Gravitational acceleration', symbol: 'g', value: '9.81 (or 9.8)', unit: 'm/s²', note: 'Both accepted in HSC marking; choose in the top bar.' },
  { name: 'Speed of light in vacuum / air', symbol: 'c', value: '3.00 × 10⁸', unit: 'm/s' },
  { name: 'Density of fresh water', symbol: 'ρ', value: '1000', unit: 'kg/m³' },
  { name: 'Density of seawater', symbol: 'ρ', value: '1025', unit: 'kg/m³' },
  { name: 'Density of air (sea level, 15 °C)', symbol: 'ρ', value: '1.225', unit: 'kg/m³' },
  { name: 'Standard atmospheric pressure', symbol: 'P₀', value: '101.3', unit: 'kPa' },
  { name: 'Speed of sound in air (sea level)', symbol: 'a', value: '≈ 340', unit: 'm/s' },
  { name: 'Geostationary orbit altitude', symbol: 'h', value: '≈ 35 786', unit: 'km' },
  { name: 'Eutectoid composition (Fe–C)', symbol: '', value: '0.8 (≈ 0.77)', unit: '% C', note: 'at 727 °C' },
  { name: 'Max carbon in ferrite (α)', symbol: '', value: '0.025 (≈ 0.02)', unit: '% C' },
  { name: 'Carbon in cementite (Fe₃C)', symbol: '', value: '6.67', unit: '% C' },
];

export const MATERIALS: { material: string; E: string; density: string; uts: string; note?: string }[] = [
  { material: 'Mild (low-carbon) steel', E: '200–210', density: '7850', uts: '400–550', note: 'yield ≈ 250 MPa' },
  { material: 'High-tensile steel (cable wire)', E: '200', density: '7850', uts: '1500–1800' },
  { material: 'Stainless steel', E: '193', density: '8000', uts: '500–700' },
  { material: 'Cast iron (grey)', E: '100–120', density: '7200', uts: '150–250', note: 'brittle; strong in compression' },
  { material: 'Aluminium alloy (2024-T3 / 6061-T6)', E: '69–73', density: '2700–2780', uts: '310–480' },
  { material: 'Titanium alloy (Ti-6Al-4V)', E: '114', density: '4430', uts: '900–1000' },
  { material: 'Copper', E: '110–130', density: '8960', uts: '210–250' },
  { material: 'Brass', E: '100–125', density: '8500', uts: '300–500' },
  { material: 'Concrete', E: '25–40', density: '2400', uts: '2–5 (tension)', note: 'compressive strength 20–50 MPa' },
  { material: 'Timber (softwood, along grain)', E: '8–12', density: '450–600', uts: '40–100' },
  { material: 'CFRP (carbon fibre composite)', E: '70–150', density: '1600', uts: '600–1500' },
  { material: 'GFRP (glass fibre composite)', E: '20–40', density: '1900', uts: '200–500' },
  { material: 'Glass / silica optical fibre', E: '70', density: '2200–2500', uts: 'varies', note: 'n ≈ 1.44–1.50' },
];

export const FRICTION: { pair: string; mu: string }[] = [
  { pair: 'Rubber tyre on dry asphalt/concrete', mu: '0.7 – 1.0' },
  { pair: 'Rubber tyre on wet road', mu: '0.4 – 0.6' },
  { pair: 'Steel wheel on steel rail', mu: '0.2 – 0.4 (dry)' },
  { pair: 'Steel on steel (dry)', mu: '0.5 – 0.8' },
  { pair: 'Steel on steel (lubricated)', mu: '0.05 – 0.15' },
  { pair: 'Brake pad on disc', mu: '0.35 – 0.5' },
  { pair: 'Wood on wood', mu: '0.25 – 0.5' },
  { pair: 'PTFE on steel', mu: '0.04' },
];

export const REFRACTIVE: { medium: string; n: string }[] = [
  { medium: 'Vacuum / air', n: '1.00' },
  { medium: 'Water', n: '1.33' },
  { medium: 'Optical fibre cladding (typical)', n: '1.45 – 1.47' },
  { medium: 'Optical fibre core (typical)', n: '1.47 – 1.50' },
  { medium: 'Crown glass', n: '1.52' },
];
