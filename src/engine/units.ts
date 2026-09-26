/**
 * Central unit-conversion engine.
 *
 * Every quantity is stored internally in coherent SI units. A unit is described by
 * a multiplicative factor to SI and a dimension vector over the SI base dimensions
 * [L (m), M (kg), T (s), I (A)]. Angles and counts (bits, revolutions) are treated
 * as dimensionless.
 *
 * Compound units such as "N/mm²", "kN·m", "kg/m^3" or "m/s2" are parsed into a
 * product of known units with integer exponents, so squared and cubed prefixes are
 * handled exactly: (1 mm)² = (10⁻³ m)² = 10⁻⁶ m².
 */

export type Dim = readonly [number, number, number, number];

export const DIMLESS: Dim = [0, 0, 0, 0];

export function dimMul(a: Dim, b: Dim): Dim {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}
export function dimPow(a: Dim, n: number): Dim {
  return [a[0] * n, a[1] * n, a[2] * n, a[3] * n];
}
export function dimEq(a: Dim, b: Dim): boolean {
  return a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
}

/** Human readable SI expression of a dimension, e.g. "kg·m⁻¹·s⁻²". */
export function dimToString(d: Dim): string {
  const names = ['m', 'kg', 's', 'A'];
  const parts: string[] = [];
  d.forEach((e, i) => {
    if (Math.abs(e) < 1e-9) return;
    parts.push(e === 1 ? names[i] : `${names[i]}${toSuperscript(e)}`);
  });
  return parts.length ? parts.join('·') : '1';
}

const SUP: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};
export function toSuperscript(n: number): string {
  return String(n).split('').map((c) => SUP[c] ?? c).join('');
}

export interface UnitDef {
  /** canonical display symbol */
  sym: string;
  /** factor: value_SI = value × factor */
  factor: number;
  dim: Dim;
}

const L: Dim = [1, 0, 0, 0];
const M: Dim = [0, 1, 0, 0];
const T: Dim = [0, 0, 1, 0];
const I: Dim = [0, 0, 0, 1];
const N_: Dim = [1, 1, -2, 0];
const PA: Dim = [-1, 1, -2, 0];
const J_: Dim = [2, 1, -2, 0];
const W_: Dim = [2, 1, -3, 0];
const V_: Dim = [2, 1, -3, -1];
const OHM: Dim = [2, 1, -3, -2];
const C_: Dim = [0, 0, 1, 1];
const HZ: Dim = [0, 0, -1, 0];

const PREFIX: Record<string, number> = {
  G: 1e9, M: 1e6, k: 1e3, c: 1e-2, m: 1e-3, 'μ': 1e-6, 'µ': 1e-6, u: 1e-6, n: 1e-9,
};

/** Base symbols that accept SI prefixes, with the prefixes they are allowed to take. */
const PREFIXABLE: { sym: string; factor: number; dim: Dim; prefixes: string[]; aliases?: string[] }[] = [
  { sym: 'm', factor: 1, dim: L, prefixes: ['k', 'c', 'm', 'μ', 'µ', 'u', 'n'] },
  { sym: 'g', factor: 1e-3, dim: M, prefixes: ['k', 'm', 'μ', 'µ', 'u'] },
  { sym: 's', factor: 1, dim: T, prefixes: ['m', 'μ', 'µ', 'u', 'n'] },
  { sym: 'N', factor: 1, dim: N_, prefixes: ['G', 'M', 'k', 'm'] },
  { sym: 'Pa', factor: 1, dim: PA, prefixes: ['G', 'M', 'k', 'h'] },
  { sym: 'J', factor: 1, dim: J_, prefixes: ['G', 'M', 'k', 'm'] },
  { sym: 'W', factor: 1, dim: W_, prefixes: ['G', 'M', 'k', 'm', 'μ', 'µ', 'u'] },
  { sym: 'Wh', factor: 3600, dim: J_, prefixes: ['G', 'M', 'k'] },
  { sym: 'V', factor: 1, dim: V_, prefixes: ['M', 'k', 'm', 'μ', 'µ', 'u'] },
  { sym: 'A', factor: 1, dim: I, prefixes: ['k', 'm', 'μ', 'µ', 'u', 'n'] },
  { sym: 'Ah', factor: 3600, dim: C_, prefixes: ['m', 'k'] },
  { sym: 'Ω', factor: 1, dim: OHM, prefixes: ['G', 'M', 'k', 'm'], aliases: ['ohm', 'ohms', 'Ohm', 'Ohms', 'Ω', 'Ω'] },
  { sym: 'Hz', factor: 1, dim: HZ, prefixes: ['G', 'M', 'k'] },
  { sym: 'C', factor: 1, dim: C_, prefixes: ['m', 'μ', 'µ', 'u', 'n'] },
  { sym: 'L', factor: 1e-3, dim: [3, 0, 0, 0], prefixes: ['m', 'k'], aliases: ['l'] },
  { sym: 'bit', factor: 1, dim: DIMLESS, prefixes: ['G', 'M', 'k'], aliases: ['bits', 'b'] },
  { sym: 'B', factor: 8, dim: DIMLESS, prefixes: ['G', 'M', 'k', 'T'], aliases: ['byte', 'bytes'] },
  { sym: 'bps', factor: 1, dim: HZ, prefixes: ['G', 'M', 'k'] },
];

const EXTRA_PREFIX: Record<string, number> = { h: 1e2, T: 1e12 };

/** Non-prefixable or irregular units. */
const SPECIAL: [string[], number, Dim][] = [
  [['min', 'mins', 'minute', 'minutes'], 60, T],
  [['h', 'hr', 'hrs', 'hour', 'hours'], 3600, T],
  [['t', 'tonne', 'tonnes'], 1000, M],
  [['°', 'deg', 'degree', 'degrees', 'º'], Math.PI / 180, DIMLESS],
  [['rad', 'radian', 'radians'], 1, DIMLESS],
  [['rev', 'revs', 'revolution', 'revolutions'], 2 * Math.PI, DIMLESS],
  [['rpm', 'RPM', 'r/min', 'rev/min'], (2 * Math.PI) / 60, HZ],
  [['%', 'percent', 'per cent'], 0.01, DIMLESS],
  [['dB'], 1, DIMLESS],
  [['Nm', 'N·m', 'N.m'], 1, J_],
  [['kNm', 'kN·m', 'kN.m'], 1e3, J_],
  [['MNm', 'MN·m'], 1e6, J_],
  [['Nmm', 'N·mm', 'N.mm'], 1e-3, J_],
  [['kNmm', 'kN·mm'], 1, J_],
  [['km/h', 'kmh', 'kph', 'kmph', 'km/hr'], 1000 / 3600, [1, 0, -1, 0]],
  [['bar'], 1e5, PA],
  [['atm'], 101325, PA],
  [['cc'], 1e-6, [3, 0, 0, 0]],
  [['kgf'], 9.80665, N_],
  [['HB', 'BHN'], 9.80665e6, PA],
  [['HV', 'VHN'], 9.80665e6, PA],
  [['$', 'AUD', 'dollars', 'dollar'], 1, DIMLESS],
  [['c', 'cents', 'cent'], 0.01, DIMLESS],
  [['div', 'divs', 'division', 'divisions', 'cm div'], 1, DIMLESS],
  [['1', ''], 1, DIMLESS],
];

const TABLE = new Map<string, UnitDef>();

function addUnit(key: string, def: UnitDef) {
  if (!TABLE.has(key)) TABLE.set(key, def);
}

// Specials first so e.g. "min" and "h" win over prefix interpretations.
for (const [names, factor, dim] of SPECIAL) {
  for (const n of names) addUnit(n, { sym: names[0], factor, dim });
}
for (const b of PREFIXABLE) {
  addUnit(b.sym, { sym: b.sym, factor: b.factor, dim: b.dim });
  for (const a of b.aliases ?? []) addUnit(a, { sym: b.sym, factor: b.factor, dim: b.dim });
  for (const p of b.prefixes) {
    const pf = PREFIX[p] ?? EXTRA_PREFIX[p];
    const canonP = p === 'µ' || p === 'u' ? 'μ' : p;
    addUnit(p + b.sym, { sym: canonP + b.sym, factor: pf * b.factor, dim: b.dim });
    for (const a of b.aliases ?? []) {
      if (a.length > 1) addUnit(p + a, { sym: canonP + b.sym, factor: pf * b.factor, dim: b.dim });
    }
  }
}

export function lookupUnit(sym: string): UnitDef | undefined {
  return TABLE.get(sym);
}

export interface ParsedUnit {
  factor: number;
  dim: Dim;
  /** normalised display string */
  display: string;
}

export class UnitParseError extends Error {}

const SUPER_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-',
};

/** Normalise a raw unit string: superscripts → ^n, multiplication dots → '·'. */
export function normaliseUnitString(raw: string): string {
  let s = raw.trim();
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + m.split('').map((c) => SUPER_MAP[c]).join(''));
  s = s.replace(/[×*⋅•∙]/g, '·');
  s = s.replace(/\s*·\s*/g, '·');
  s = s.replace(/\s*\/\s*/g, '/');
  s = s.replace(/Ω/g, 'Ω');
  return s;
}

/**
 * Parse a unit expression. Supports products (·, *, ., space), quotients (/),
 * parentheses, integer exponents (^2, ², trailing digit as in "m2" or "mm3").
 */
export function parseUnit(raw: string): ParsedUnit {
  const s = normaliseUnitString(raw);
  if (s === '' || s === '1') return { factor: 1, dim: DIMLESS, display: '' };
  const direct = TABLE.get(s);
  if (direct) return { factor: direct.factor, dim: direct.dim, display: direct.sym };

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
      const m = /^[A-Za-zΩμµ°º%$]+/.exec(s.slice(pos));
      if (!m) throw new UnitParseError(`Cannot read unit "${raw}"`);
      let word = m[0];
      // trailing digit exponent like m2, mm3 (only when not followed by more letters)
      pos += word.length;
      let def = TABLE.get(word);
      if (!def) {
        // allow glued compound like "kNm" handled in SPECIAL; otherwise try splitting word into two known units
        const split = splitGlued(word);
        if (!split) throw new UnitParseError(`Unknown unit "${word}"`);
        base = split;
      } else {
        base = { factor: def.factor, dim: def.dim };
      }
      word = '';
    }
    // exponent
    let exp = 1;
    const em = /^\^?(-?\d+)/.exec(s.slice(pos));
    if (em && (s[pos] === '^' || /\d/.test(s[pos]))) {
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
    if (a && b) return { factor: a.factor * b.factor, dim: dimMul(a.dim, b.dim) };
  }
  return null;
}

/** Returns true if the string can be parsed as a unit. */
export function isUnit(raw: string): boolean {
  try {
    parseUnit(raw);
    return true;
  } catch {
    return false;
  }
}

export function toSI(value: number, unit: string): number {
  return value * parseUnit(unit).factor;
}

export function fromSI(valueSI: number, unit: string): number {
  return valueSI / parseUnit(unit).factor;
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
  return (value * a.factor) / b.factor;
}
