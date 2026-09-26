/**
 * Unit engine. Every quantity is held internally in coherent SI units.
 *
 * A unit has a multiplicative factor to SI and a dimension vector over the SI base
 * dimensions [L (m), M (kg), T (s), I (A), Θ (K)]. Angles and counts are dimensionless.
 *
 * Compound units ("km/s/Mpc", "N A⁻²", "MeV/c²", "lines/mm", "kg m s^-1") are parsed
 * into a product of known units with integer exponents, so squared prefixes are exact:
 * (1 mm)² = 10⁻⁶ m². The speed of light "c" is itself a unit (0.80c, MeV/c²) using the
 * NESA data-sheet value c = 3.00 × 10⁸ m s⁻¹. Degrees Celsius is the only offset unit and
 * is handled by `toSIValue`/`fromSIValue`.
 */

export type Dim = readonly [number, number, number, number, number];

export const DIMLESS: Dim = [0, 0, 0, 0, 0];

export function dimMul(a: Dim, b: Dim): Dim {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3], a[4] + b[4]];
}
export function dimPow(a: Dim, n: number): Dim {
  return [a[0] * n, a[1] * n, a[2] * n, a[3] * n, a[4] * n];
}
export function dimEq(a: Dim, b: Dim): boolean {
  return a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export function toSuperscript(n: number): string {
  return String(n).split('').map((c) => SUP[c] ?? c).join('');
}

/** Human-readable SI expression of a dimension, e.g. "kg·m·s⁻²". */
export function dimToString(d: Dim): string {
  const names = ['m', 'kg', 's', 'A', 'K'];
  const parts: string[] = [];
  d.forEach((e, i) => {
    if (Math.abs(e) < 1e-9) return;
    parts.push(e === 1 ? names[i] : `${names[i]}${toSuperscript(e)}`);
  });
  return parts.length ? parts.join('·') : '1';
}

export interface UnitDef {
  sym: string;
  factor: number;
  dim: Dim;
  offset?: number;
}

/** NESA data-sheet values used inside unit definitions. */
export const C_NESA = 3.0e8;
export const EV_NESA = 1.602e-19;
export const U_NESA = 1.661e-27;

const L: Dim = [1, 0, 0, 0, 0];
const M: Dim = [0, 1, 0, 0, 0];
const T: Dim = [0, 0, 1, 0, 0];
const I: Dim = [0, 0, 0, 1, 0];
const K: Dim = [0, 0, 0, 0, 1];
const N_: Dim = [1, 1, -2, 0, 0];
const PA: Dim = [-1, 1, -2, 0, 0];
const J_: Dim = [2, 1, -2, 0, 0];
const W_: Dim = [2, 1, -3, 0, 0];
const V_: Dim = [2, 1, -3, -1, 0];
const OHM: Dim = [2, 1, -3, -2, 0];
const C_: Dim = [0, 0, 1, 1, 0];
const HZ: Dim = [0, 0, -1, 0, 0];
const TESLA: Dim = [0, 1, -2, -1, 0];
const WB: Dim = [2, 1, -2, -1, 0];
const VEL: Dim = [1, 0, -1, 0, 0];

const PREFIX: Record<string, number> = {
  T: 1e12, G: 1e9, M: 1e6, k: 1e3, h: 1e2, c: 1e-2, m: 1e-3, 'μ': 1e-6, 'µ': 1e-6, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15,
};

/** Base symbols that accept SI prefixes (with the prefixes each may take). */
const PREFIXABLE: { sym: string; factor: number; dim: Dim; prefixes: string[]; aliases?: string[] }[] = [
  { sym: 'm', factor: 1, dim: L, prefixes: ['k', 'c', 'm', 'μ', 'µ', 'u', 'n', 'p', 'f'] },
  { sym: 'g', factor: 1e-3, dim: M, prefixes: ['k', 'm', 'μ', 'µ', 'u'] },
  { sym: 's', factor: 1, dim: T, prefixes: ['m', 'μ', 'µ', 'u', 'n', 'p'] },
  { sym: 'N', factor: 1, dim: N_, prefixes: ['G', 'M', 'k', 'm', 'μ', 'µ'] },
  { sym: 'Pa', factor: 1, dim: PA, prefixes: ['G', 'M', 'k', 'h'] },
  { sym: 'J', factor: 1, dim: J_, prefixes: ['T', 'G', 'M', 'k', 'm', 'μ', 'µ'] },
  { sym: 'W', factor: 1, dim: W_, prefixes: ['T', 'G', 'M', 'k', 'm', 'μ', 'µ', 'u'] },
  { sym: 'Wh', factor: 3600, dim: J_, prefixes: ['T', 'G', 'M', 'k'] },
  { sym: 'V', factor: 1, dim: V_, prefixes: ['M', 'k', 'm', 'μ', 'µ', 'u'] },
  { sym: 'A', factor: 1, dim: I, prefixes: ['k', 'm', 'μ', 'µ', 'u', 'n'] },
  { sym: 'Ω', factor: 1, dim: OHM, prefixes: ['G', 'M', 'k', 'm'], aliases: ['ohm', 'ohms', 'Ohm', 'Ohms'] },
  { sym: 'Hz', factor: 1, dim: HZ, prefixes: ['P', 'T', 'G', 'M', 'k'] },
  { sym: 'C', factor: 1, dim: C_, prefixes: ['m', 'μ', 'µ', 'u', 'n', 'p'] },
  { sym: 'T', factor: 1, dim: TESLA, prefixes: ['m', 'μ', 'µ', 'u', 'n'] },
  { sym: 'Wb', factor: 1, dim: WB, prefixes: ['m', 'μ', 'µ', 'u'] },
  { sym: 'eV', factor: EV_NESA, dim: J_, prefixes: ['T', 'G', 'M', 'k'] },
  { sym: 'Bq', factor: 1, dim: HZ, prefixes: ['T', 'G', 'M', 'k'] },
  { sym: 'L', factor: 1e-3, dim: [3, 0, 0, 0, 0], prefixes: ['m'] },
  { sym: 'pc', factor: 3.086e16, dim: L, prefixes: ['k', 'M', 'G'] },
  { sym: 'ly', factor: 9.461e15, dim: L, prefixes: ['k', 'M', 'G'] },
  { sym: 'K', factor: 1, dim: K, prefixes: ['m'] },
];

const EXTRA_PREFIX: Record<string, number> = { P: 1e15 };

/** Non-prefixable or irregular units. */
const SPECIAL: [string[], number, Dim][] = [
  [['min', 'mins', 'minute', 'minutes'], 60, T],
  [['h', 'hr', 'hrs', 'hour', 'hours'], 3600, T],
  [['d', 'day', 'days'], 86400, T],
  [['y', 'yr', 'yrs', 'year', 'years'], 365.25 * 86400, T],
  [['kyr'], 1e3 * 365.25 * 86400, T],
  [['Myr'], 1e6 * 365.25 * 86400, T],
  [['Gyr'], 1e9 * 365.25 * 86400, T],
  [['t', 'tonne', 'tonnes'], 1000, M],
  [['u', 'amu', 'Da'], U_NESA, M],
  [['°', 'deg', 'degree', 'degrees', 'º'], Math.PI / 180, DIMLESS],
  [['rad', 'radian', 'radians'], 1, DIMLESS],
  [['rev', 'revs', 'revolution', 'revolutions', 'rotation', 'rotations', 'turn'], 2 * Math.PI, DIMLESS],
  [['rpm', 'RPM', 'r/min', 'rev/min'], (2 * Math.PI) / 60, HZ],
  [['rps', 'rev/s'], 2 * Math.PI, HZ],
  [['%', 'percent'], 0.01, DIMLESS],
  [['Nm', 'N·m', 'N.m'], 1, J_],
  [['km/h', 'kmh', 'kph', 'kmph', 'km/hr'], 1000 / 3600, VEL],
  [['c'], C_NESA, VEL],
  [['AU', 'au'], 1.496e11, L],
  [['Å', 'angstrom', 'angstroms'], 1e-10, L],
  [['atm'], 101325, PA],
  [['bar'], 1e5, PA],
  [['lines', 'line', 'slits', 'slit', 'rulings', 'grooves', 'nuclei', 'atoms', 'particles', 'photons', 'electrons', 'counts', 'decays', 'turns', 'loops', 'windings'], 1, DIMLESS],
  [['1', ''], 1, DIMLESS],
];

const TABLE = new Map<string, UnitDef>();
function addUnit(key: string, def: UnitDef) {
  if (!TABLE.has(key)) TABLE.set(key, def);
}
for (const [names, factor, dim] of SPECIAL) for (const n of names) addUnit(n, { sym: names[0], factor, dim });
for (const b of PREFIXABLE) {
  addUnit(b.sym, { sym: b.sym, factor: b.factor, dim: b.dim });
  for (const a of b.aliases ?? []) addUnit(a, { sym: b.sym, factor: b.factor, dim: b.dim });
  for (const p of b.prefixes) {
    const pf = PREFIX[p] ?? EXTRA_PREFIX[p];
    const canonP = p === 'µ' || p === 'u' ? 'μ' : p;
    addUnit(p + b.sym, { sym: canonP + b.sym, factor: pf * b.factor, dim: b.dim });
    for (const a of b.aliases ?? []) if (a.length > 1) addUnit(p + a, { sym: canonP + b.sym, factor: pf * b.factor, dim: b.dim });
  }
}
// Celsius: offset unit (only valid on its own)
const CELSIUS: UnitDef = { sym: '°C', factor: 1, dim: K, offset: 273.15 };
for (const k of ['°C', 'degC', 'ºC', '℃', 'C°']) TABLE.set(k, CELSIUS);

export function lookupUnit(sym: string): UnitDef | undefined {
  return TABLE.get(sym);
}

export interface ParsedUnit {
  factor: number;
  dim: Dim;
  display: string;
  offset?: number;
}

export class UnitParseError extends Error {}

const SUPER_MAP: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

/** Normalise a raw unit string: superscripts → ^n, multiplication dots → '·'. */
export function normaliseUnitString(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + m.split('').map((c) => SUPER_MAP[c]).join(''));
  s = s.replace(/[×*⋅•∙]/g, '·');
  s = s.replace(/\s+per\s+/g, '/');
  s = s.replace(/\s*·\s*/g, '·');
  s = s.replace(/\s*\/\s*/g, '/');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/Ω/g, 'Ω').replace(/µ/g, 'μ');
  return s;
}

/**
 * Parse a unit expression. Supports products (·, *, ., space), quotients (/), parentheses,
 * integer exponents (^2, ², ^-1, trailing digit as in "m2").
 */
export function parseUnit(raw: string): ParsedUnit {
  const s = normaliseUnitString(raw);
  if (s === '' || s === '1') return { factor: 1, dim: DIMLESS, display: '' };
  const direct = TABLE.get(s);
  if (direct) return { factor: direct.factor, dim: direct.dim, display: direct.sym, offset: direct.offset };

  let pos = 0;
  const peek = () => s[pos];

  function parseExpr(): { factor: number; dim: Dim } {
    let acc = parseFactor();
    while (pos < s.length) {
      const c = peek();
      if (c === ')') break;
      if (c === '/') {
        pos++;
        const f = parseFactor();
        acc = { factor: acc.factor / f.factor, dim: dimMul(acc.dim, dimPow(f.dim, -1)) };
      } else if (c === '·' || c === '.' || c === ' ') {
        pos++;
        const f = parseFactor();
        acc = { factor: acc.factor * f.factor, dim: dimMul(acc.dim, f.dim) };
      } else {
        throw new UnitParseError(`Unexpected character "${c}" in unit "${raw}"`);
      }
    }
    return acc;
  }

  function parseFactor(): { factor: number; dim: Dim } {
    let base: { factor: number; dim: Dim };
    if (peek() === '(') {
      pos++;
      base = parseExpr();
      if (peek() !== ')') throw new UnitParseError(`Missing ")" in unit "${raw}"`);
      pos++;
    } else {
      const m = /^[A-Za-zΩμ°º%Å]+/.exec(s.slice(pos));
      if (!m) throw new UnitParseError(`Cannot read unit "${raw}"`);
      const word = m[0];
      pos += word.length;
      const def = TABLE.get(word);
      if (def) {
        if (def.offset) throw new UnitParseError('°C cannot be used inside a compound unit — convert the temperature to kelvin first.');
        base = { factor: def.factor, dim: def.dim };
      } else {
        const split = splitGlued(word);
        if (!split) throw new UnitParseError(`Unknown unit "${word}"`);
        base = split;
      }
    }
    let exp = 1;
    const em = /^\^?\(?(-?\d+)\)?/.exec(s.slice(pos));
    if (em && (s[pos] === '^' || /\d/.test(s[pos]) || (s[pos] === '-' && /\d/.test(s[pos + 1] ?? '')))) {
      exp = parseInt(em[1], 10);
      pos += em[0].length;
    }
    return { factor: Math.pow(base.factor, exp), dim: dimPow(base.dim, exp) };
  }

  const r = parseExpr();
  if (pos !== s.length) throw new UnitParseError(`Could not parse unit "${raw}"`);
  return { factor: r.factor, dim: r.dim, display: s };
}

function splitGlued(word: string): { factor: number; dim: Dim } | null {
  for (let i = word.length - 1; i > 0; i--) {
    const a = TABLE.get(word.slice(0, i));
    const b = TABLE.get(word.slice(i));
    if (a && b && !a.offset && !b.offset) return { factor: a.factor * b.factor, dim: dimMul(a.dim, b.dim) };
  }
  return null;
}

export function isUnit(raw: string): boolean {
  try {
    parseUnit(raw);
    return true;
  } catch {
    return false;
  }
}

/** Convert a value in `unit` to SI (handles the °C offset). */
export function toSIValue(value: number, unit: string): number {
  const p = parseUnit(unit);
  return value * p.factor + (p.offset ?? 0);
}

/** Convert an SI value to `unit` (handles the °C offset). */
export function fromSIValue(valueSI: number, unit: string): number {
  const p = parseUnit(unit);
  return (valueSI - (p.offset ?? 0)) / p.factor;
}

export class DimensionMismatchError extends Error {}

/** Convert value between two units, checking dimensional compatibility. */
export function convert(value: number, from: string, to: string): number {
  const a = parseUnit(from);
  const b = parseUnit(to);
  if (!dimEq(a.dim, b.dim)) {
    throw new DimensionMismatchError(
      `Cannot convert ${from || '(no unit)'} [${dimToString(a.dim)}] to ${to || '(no unit)'} [${dimToString(b.dim)}] — incompatible dimensions`,
    );
  }
  return (value * a.factor + (a.offset ?? 0) - (b.offset ?? 0)) / b.factor;
}
