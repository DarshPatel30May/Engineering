/**
 * Number formatting and significant-figure handling. All rounding happens only at
 * display time — internal values always keep full double precision.
 */
import { getQuantity, QuantityKind } from './quantities';
import { parseUnit } from './units';

export type SigFigMode = 'auto' | 2 | 3 | 4 | 'full';

/** Round to n significant figures (returns a number). */
export function roundSig(x: number, n: number): number {
  if (!isFinite(x) || x === 0) return x;
  const p = Math.floor(Math.log10(Math.abs(x)));
  const f = Math.pow(10, n - 1 - p);
  const r = Math.round(x * f) / f;
  // clean binary noise
  return Number(r.toPrecision(Math.min(15, Math.max(n, 1))));
}

/** Count significant figures in a user-typed number string (e.g. "200" → 1… we treat trailing zeros in integers as significant per HSC practice when ≥ 2 digits). */
export function countSigFigs(raw: string): number {
  let s = raw.trim().replace(/[,\s]/g, '').replace(/^[-+]/, '');
  const expIdx = s.search(/[eE×x]/);
  if (expIdx >= 0) s = s.slice(0, expIdx);
  if (!/\d/.test(s)) return 3;
  if (s.includes('.')) {
    const digits = s.replace('.', '').replace(/^0+/, '');
    return Math.max(1, digits.length);
  }
  const trimmed = s.replace(/^0+/, '');
  // Integers like 200: ambiguous; HSC markers treat given data as exact, so count all digits but cap later.
  return Math.max(1, trimmed.length);
}

/** Resolve a sig-fig mode to a digit count. Auto = least precise input, clamped to 3–4 (HSC convention: 3 s.f.). */
export function resolveSigFigs(mode: SigFigMode, inputSigFigs: number[] = []): number {
  if (mode === 'full') return 12;
  if (mode !== 'auto') return mode;
  if (!inputSigFigs.length) return 3;
  const min = Math.min(...inputSigFigs);
  return Math.min(4, Math.max(3, min));
}

interface NumParts {
  mantissa: string;
  exponent: number; // 0 for plain display
}

function splitNumber(x: number, sf: number, forceSci = false): NumParts {
  if (x === 0) return { mantissa: '0', exponent: 0 };
  if (!isFinite(x)) return { mantissa: String(x), exponent: 0 };
  const ax = Math.abs(x);
  const useSci = forceSci || ax >= 1e6 || ax < 1e-3;
  if (useSci) {
    let e = Math.floor(Math.log10(ax));
    let m = roundSig(x / Math.pow(10, e), sf);
    if (Math.abs(m) >= 10) {
      m /= 10;
      e += 1;
    }
    return { mantissa: trimFixed(m, sf, true), exponent: e };
  }
  const r = roundSig(x, sf);
  return { mantissa: trimFixed(r, sf, false), exponent: 0 };
}

/** Format with exactly sf significant figures (keeps trailing zeros that are significant). */
function trimFixed(x: number, sf: number, sci: boolean): string {
  if (x === 0) return '0';
  const p = Math.floor(Math.log10(Math.abs(x)));
  let decimals = Math.max(0, sf - 1 - p);
  if (sf >= 12) {
    // full precision: strip trailing zeros
    let s = x.toFixed(Math.min(decimals, 12));
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return sci ? s : groupThousands(s);
  }
  decimals = Math.min(decimals, 15);
  const s = x.toFixed(decimals);
  return sci ? s : groupThousands(s);
}

function groupThousands(s: string): string {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const [int, frac] = body.split('.');
  if (int.length <= 4) return s; // 4-digit integers not grouped (e.g. 2500)
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + g + (frac !== undefined ? '.' + frac : '');
}

/** Plain-text number, e.g. "4.00 × 10⁷" or "40,000". */
export function fmt(x: number, sf = 4, forceSci = false): string {
  const { mantissa, exponent } = splitNumber(x, sf, forceSci);
  if (exponent === 0) return mantissa;
  return `${mantissa} × 10${toSup(exponent)}`;
}

/** LaTeX number, e.g. "4.00 \times 10^{7}" or "40{,}000". */
export function fmtLatex(x: number, sf = 4, forceSci = false): string {
  const { mantissa, exponent } = splitNumber(x, sf, forceSci);
  const m = mantissa.replace(/,/g, '{,}');
  if (exponent === 0) return m;
  return `${m} \\times 10^{${exponent}}`;
}

const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function toSup(n: number): string {
  return String(n)
    .split('')
    .map((c) => (c === '-' ? '⁻' : SUPS[Number(c)]))
    .join('');
}

/** LaTeX for a unit string such as "N/mm²" or "kN·m". */
export function unitLatex(unit: string): string {
  if (!unit) return '';
  if (unit === '°') return '^{\\circ}';
  if (unit === '%') return '\\%';
  let out = '';
  let run = '';
  const flush = () => {
    if (run) out += `\\text{${run}}`;
    run = '';
  };
  const supMap: Record<string, string> = { '²': '^2', '³': '^3', '⁴': '^4' };
  for (let i = 0; i < unit.length; i++) {
    const c = unit[i];
    if (/[A-Za-z]/.test(c)) run += c;
    else {
      flush();
      if (c === 'Ω') out += '\\Omega';
      else if (c === 'μ') out += '\\mu';
      else if (supMap[c]) out += supMap[c];
      else if (c === '⁻' && unit[i + 1] === '¹') {
        out += '^{-1}';
        i++;
      } else if (c === '·') out += '\\cdot ';
      else if (c === '/') out += '/';
      else if (c === '°') out += '^{\\circ}';
      else if (c === '%') out += '\\%';
      else out += c;
    }
  }
  flush();
  return out;
}

/** Value + unit in LaTeX. */
export function qtyLatex(x: number, unit: string, sf = 4): string {
  if (unit === '°') return `${fmtLatex(x, sf)}^{\\circ}`;
  const ul = unitLatex(unit);
  return ul ? `${fmtLatex(x, sf)}\\ ${ul}` : fmtLatex(x, sf);
}

export interface Equivalent {
  unit: string;
  value: number;
  text: string;
  latex: string;
  hsc: boolean;
}

/** Convert an SI value into each of the display units of its quantity kind. */
export function equivalents(valueSI: number, kindId: string, sf = 4): Equivalent[] {
  const k = getQuantity(kindId);
  const list: Equivalent[] = [];
  for (const u of k.units) {
    const factor = u === '' ? 1 : u === 'dB' ? 1 : parseUnit(u).factor;
    const v = valueSI / factor;
    list.push({ unit: u, value: v, text: `${fmt(v, sf)}${u ? (u === '°' ? '°' : ' ' + u) : ''}`, latex: qtyLatex(v, u, sf), hsc: u === k.hsc });
  }
  return list;
}

/** Choose the most readable engineering unit for display (value between 1 and 1000 where possible), preferring the HSC unit. */
export function bestUnit(valueSI: number, kind: QuantityKind): string {
  if (kind.angle) return '°';
  if (kind.percent) return '%';
  const hscF = kind.hsc === '' ? 1 : parseUnit(kind.hsc).factor;
  const hv = Math.abs(valueSI / hscF);
  if (valueSI === 0 || (hv >= 0.1 && hv < 100000)) return kind.hsc;
  let best = kind.hsc;
  let bestScore = Infinity;
  for (const u of kind.units) {
    if (u === '' && kind.units.length > 1) continue;
    const f = u === '' ? 1 : parseUnit(u).factor;
    const v = Math.abs(valueSI / f);
    const score = v >= 1 && v < 1000 ? 0 : Math.abs(Math.log10(v) - 1.5);
    if (score < bestScore) {
      bestScore = score;
      best = u;
    }
  }
  return best;
}

/** Format an SI value in the given (or best) display unit. */
export function displayValue(valueSI: number, kindId: string, sf = 3, unit?: string): { value: number; unit: string; text: string; latex: string } {
  const k = getQuantity(kindId);
  const u = unit ?? bestUnit(valueSI, k);
  const f = u === '' || u === 'dB' ? 1 : parseUnit(u).factor;
  const v = valueSI / f;
  return { value: v, unit: u, text: `${fmt(v, sf)}${u ? (u === '°' ? '°' : ' ' + u) : ''}`, latex: qtyLatex(v, u, sf) };
}
