/**
 * Text normalisation and extraction of numeric quantities (value + unit) from an
 * HSC-style question. Purely deterministic (regular expressions + the unit parser).
 */
import { Dim, parseUnit } from '../units';
import { countSigFigs } from '../format';

export interface RawQuantity {
  index: number;
  /** numeric text as written */
  numText: string;
  value: number;
  unit: string;
  valueSI: number;
  dim: Dim | null; // null for dimensionless numbers with no unit
  start: number;
  end: number;
  /** symbol written immediately before "=" (e.g. "F" in "F = 8 kN") */
  symbol?: string;
  sf: number;
}

const SUPERSCRIPT: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

/** Normalise unicode, scientific notation and thousands separators. */
export function normaliseText(src: string): string {
  let s = src.replace(/\r/g, '');
  s = s.replace(/[‐‑‒–—−]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  s = s.replace(/ | | /g, ' ');
  // "2.5 × 10^3", "2.5 x 10^-3", "2.5×10³", "2.5 * 10^3"
  s = s.replace(/(\d*\.?\d+)\s*[×x*]\s*10\s*(?:\^\s*\(?\s*([-+]?\d+)\s*\)?|([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+))/g, (_m, mant: string, e1?: string, e2?: string) => {
    const e = e1 ?? (e2 ?? '').split('').map((c) => SUPERSCRIPT[c]).join('');
    return `${mant}e${e}`;
  });
  // "10^6 mm^4" (bare power of ten)
  s = s.replace(/(^|[^\d.])10\s*\^\s*([-+]?\d+)/g, (_m, pre: string, e: string) => `${pre}1e${e}`);
  // thousands separators: 40,000 and 12 000 (NESA style)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
    s = s.replace(/(^|[^\d.])(\d{1,3}) (\d{3})(?![\d.])/g, '$1$2$3');
  }
  s = s.replace(/per cent/gi, '%');
  s = s.replace(/degrees?(?![a-z])/gi, '°').replace(/\bdeg\b/gi, '°');
  s = s.replace(/°\s*C\b/g, ' degC');
  s = s.replace(/\bohms?\b/gi, 'Ω');
  s = s.replace(/\bkilo-?ohms?\b/gi, 'kΩ');
  s = s.replace(/\bmetres? per second\b/gi, 'm/s').replace(/\bkilometres? per hour\b/gi, 'km/h');
  s = s.replace(/\bnewtons?\b/gi, 'N').replace(/\bkilonewtons?\b/gi, 'kN');
  s = s.replace(/\bkilometres?\b/gi, 'km').replace(/\bcentimetres?\b/gi, 'cm').replace(/\bmillimetres?\b/gi, 'mm').replace(/\bmetres?\b/gi, 'm').replace(/\bkilograms?\b/gi, 'kg').replace(/\bseconds?\b/gi, 's');
  s = s.replace(/\bvolts?\b/gi, 'V').replace(/\bamps?\b|\bamperes?\b/gi, 'A').replace(/\bwatts?\b/gi, 'W').replace(/\bjoules?\b/gi, 'J');
  s = s.replace(/\bsquare (mm|m|cm)\b/gi, '$1²');
  return s;
}

const UNIT_CHARS = /[A-Za-zΩμµ°º%²³⁴/·.^\d\-]/;
// unit words that must not be read as units in prose
const NOT_UNITS = new Set(['a', 'at', 'in', 'is', 'as', 'an', 'and', 'on', 'of', 'or', 'to', 'by', 'if', 'it', 'be', 'Pa.', 'mm.', 'B', 'C', 'L', 'l', 'b', 'T', 'cc', 'rad', 'rev', 'bar']);

function readUnit(s: string, pos: number): { unit: string; len: number } | null {
  // skip spaces (at most 2)
  let p = pos;
  let spaces = 0;
  while (s[p] === ' ' && spaces < 2) {
    p++;
    spaces++;
  }
  if (s[p] === '°') {
    return { unit: '°', len: p - pos + 1 };
  }
  if (s[p] === '%') return { unit: '%', len: p - pos + 1 };
  let q = p;
  while (q < s.length && q - p < 14 && UNIT_CHARS.test(s[q])) q++;
  let cand = s.slice(p, q);
  // strip trailing punctuation
  cand = cand.replace(/[.\-/·^]+$/, '');
  for (let L = cand.length; L > 0; L--) {
    const u = cand.slice(0, L);
    const next = s[p + L] ?? ' ';
    if (/[A-Za-z]/.test(next)) continue; // must end at a word boundary
    if (/^\d/.test(u)) break;
    if (NOT_UNITS.has(u)) continue;
    try {
      parseUnit(u);
      // disallow plain "s" glued to a word like "5s" meaning plural? accept.
      return { unit: u, len: p - pos + L };
    } catch {
      /* try shorter */
    }
  }
  return null;
}

/** Find every number (with optional unit) in normalised text. */
export function extractQuantities(text: string): RawQuantity[] {
  const out: RawQuantity[] = [];
  const re = /(?<![A-Za-z_\d.])([-+]?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(text))) {
    const numText = m[1];
    const start = m.index;
    let end = start + numText.length;
    // ignore labels: "Question 12", "Figure 3", "(a)", years
    const before = text.slice(Math.max(0, start - 12), start).toLowerCase();
    if (/(question|figure|fig\.|table|part|page|q|step|joint|member|stage)\s*$/.test(before)) continue;
    // part labels like "12." at line start
    if (/^\s*$/.test(text.slice(text.lastIndexOf('\n', start) + 1, start)) && /^\d+[.)]\s/.test(text.slice(start, start + 4))) continue;
    const value = parseFloat(numText);
    if (!isFinite(value)) continue;
    const u = readUnit(text, end);
    let unit = '';
    if (u && !(u.unit === 'degC')) {
      unit = u.unit;
      end += u.len;
    }
    if (text.slice(end, end + 5) === ' degC') continue; // temperatures are not used by any formula
    let dim: Dim | null = null;
    let factor = 1;
    if (unit) {
      try {
        const pu = parseUnit(unit);
        dim = pu.dim;
        factor = pu.factor;
      } catch {
        unit = '';
      }
    }
    // symbol before "=" or ":" e.g. "F = 8 kN", "μ=0.3", "R1 = 10 Ω"
    const pre = text.slice(Math.max(0, start - 14), start);
    const sm = /([A-Za-zσεμµηρλθφγτωΔδα][A-Za-z0-9_σεμηρλθφγτωΔ]{0,5})\s*(?:=|:)\s*$/.exec(pre);
    re.lastIndex = end;
    out.push({
      index: idx++,
      numText,
      value,
      unit,
      valueSI: value * factor,
      dim,
      start,
      end,
      symbol: sm ? sm[1] : undefined,
      sf: countSigFigs(numText),
    });
  }
  return out;
}
