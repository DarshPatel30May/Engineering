/**
 * Text normalisation and extraction of numeric quantities (value + unit) from an HSC-style
 * Physics question. Purely deterministic (regular expressions + the unit parser).
 */
import { countSigFigs } from '../format';
import { Dim, parseUnit } from '../units';

export interface RawQuantity {
  index: number;
  numText: string;
  value: number;
  unit: string;
  valueSI: number;
  dim: Dim | null;
  start: number;
  end: number;
  /** symbol written immediately before "=" (e.g. "B" in "B = 3.0 T") */
  symbol?: string;
  sf: number;
}

const SUPERSCRIPT: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

/** Normalise unicode, scientific notation, thousands separators and unit words. */
export function normaliseText(src: string): string {
  let s = src.replace(/\r/g, '');
  s = s.replace(/[‐‑‒–—−]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  s = s.replace(/[  \t]/g, ' ');
  s = s.replace(/µ/g, 'μ');
  // "3.00 × 10^8", "3.00 x 10^-3", "6.63×10⁻³⁴", "2.0 × 10-3", "5 * 10^(−3)"
  s = s.replace(/(\d*\.?\d+)\s*[×xX*·]\s*10\s*(?:\^\s*\(?\s*([-+]?\s*\d+)\s*\)?|([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)|(-\d+)(?![\d.]))/g, (_m, mant: string, e1?: string, e2?: string, e3?: string) => {
    const e = e1 ? e1.replace(/\s/g, '') : e2 ? e2.split('').map((c) => SUPERSCRIPT[c]).join('') : e3!;
    return `${mant}e${e}`;
  });
  s = s.replace(/(^|[^\d.a-z])10\s*\^\s*\(?([-+]?\d+)\)?/gi, (_m, pre: string, e: string) => `${pre}1e${e}`);
  s = s.replace(/(^|[^\d.a-z])10([⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_m, pre: string, e: string) => `${pre}1e${e.split('').map((c) => SUPERSCRIPT[c]).join('')}`);
  // thousands separators: 40,000 and 12 000 (NESA style)
  for (let i = 0; i < 3; i++) {
    s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
    s = s.replace(/(^|[^\d.])(\d{1,3}) (\d{3})(?![\d.])/g, '$1$2$3');
  }
  s = s.replace(/per cent\b/gi, '%');
  s = s.replace(/°\s*C\b|degrees? celsius|degrees? centigrade/gi, ' degC');
  s = s.replace(/\bkelvin\b/gi, 'K');
  s = s.replace(/degrees?(?![a-z])/gi, '°').replace(/\bdeg\b/gi, '°');
  s = s.replace(/\bohms?\b/gi, 'Ω').replace(/\bkilo-?ohms?\b/gi, 'kΩ');
  s = s.replace(/\bmetres? per second squared\b|\bmeters? per second squared\b/gi, 'm/s²');
  s = s.replace(/\bmetres? per second\b|\bmeters? per second\b/gi, 'm/s').replace(/\bkilometres? per hour\b/gi, 'km/h').replace(/\bkilometres? per second\b/gi, 'km/s');
  s = s.replace(/\b(lines|slits|rulings|lines?) per (mm|millimetre|millimeter|cm|centimetre|centimeter|m|metre|meter)\b/gi, (_m, _l: string, u: string) => `lines/${u.startsWith('mil') ? 'mm' : u.startsWith('cen') ? 'cm' : u.startsWith('met') ? 'm' : u}`);
  s = s.replace(/\blines\s*(mm|cm|m)\s*-\s*1\b/gi, 'lines/$1');
  s = s.replace(/\bnewtons?\b/gi, 'N').replace(/\bkilonewtons?\b/gi, 'kN');
  s = s.replace(/\bnanometres?\b|\bnanometers?\b/gi, 'nm').replace(/\bmicrometres?\b|\bmicrometers?\b|\bmicrons?\b/gi, 'μm');
  s = s.replace(/\bkilometres?\b|\bkilometers?\b/gi, 'km').replace(/\bcentimetres?\b|\bcentimeters?\b/gi, 'cm').replace(/\bmillimetres?\b|\bmillimeters?\b/gi, 'mm').replace(/\bmetres?\b|\bmeters?\b/gi, 'm');
  s = s.replace(/\bkilograms?\b/gi, 'kg').replace(/\bgrams?\b/gi, 'g').replace(/\bmilliseconds?\b/gi, 'ms').replace(/\bmicroseconds?\b/gi, 'μs').replace(/\bnanoseconds?\b/gi, 'ns').replace(/\bseconds?\b/gi, 's');
  s = s.replace(/\bmillivolts?\b/gi, 'mV').replace(/\bkilovolts?\b/gi, 'kV').replace(/\bvolts?\b/gi, 'V');
  s = s.replace(/\bmilliamps?\b|\bmilliamperes?\b/gi, 'mA').replace(/\bamps?\b|\bamperes?\b/gi, 'A');
  s = s.replace(/\bmegawatts?\b/gi, 'MW').replace(/\bkilowatts?\b/gi, 'kW').replace(/\bwatts?\b/gi, 'W');
  s = s.replace(/\bkilojoules?\b/gi, 'kJ').replace(/\bjoules?\b/gi, 'J');
  s = s.replace(/\bmega ?electron ?volts?\b/gi, 'MeV').replace(/\belectron ?volts?\b/gi, 'eV');
  s = s.replace(/\bmillitesla\b/gi, 'mT').replace(/\bmicrotesla\b/gi, 'μT').replace(/\btesla\b/gi, 'T');
  s = s.replace(/\bwebers?\b/gi, 'Wb').replace(/\bcoulombs?\b/gi, 'C').replace(/\bhertz\b/gi, 'Hz').replace(/\bbecquerels?\b/gi, 'Bq');
  s = s.replace(/\bmicrocoulombs?\b/gi, 'μC').replace(/\bnanocoulombs?\b/gi, 'nC');
  s = s.replace(/\blight[- ]years?\b/gi, 'ly').replace(/\bmegaparsecs?\b/gi, 'Mpc').replace(/\bparsecs?\b/gi, 'pc');
  s = s.replace(/\batomic mass units?\b/gi, 'u');
  s = s.replace(/\bminutes?\b/gi, 'min').replace(/\bhours?\b/gi, 'h');
  s = s.replace(/\bsquare (mm|m|cm)\b/gi, '$1²');
  s = s.replace(/\bkm\s*s\s*-\s*1\s*Mpc\s*-\s*1\b/g, 'km/s/Mpc');
  // "m s-1", "m s^-1", "N C-1" etc: keep (the unit parser understands negative exponents)
  return s;
}

const UNIT_CHARS = /[A-Za-zΩμ°º%²³⁴/·.^\d\-~]/;
/** words that must not be read as units in prose */
const NOT_UNITS = new Set(['a', 'at', 'in', 'is', 'as', 'an', 'and', 'on', 'of', 'or', 'to', 'by', 'if', 'it', 'be', 'L', 'l', 'y', 'rad', 'rev', 'bar', 'd', 'h.', 'Pa.', 'mm.', 'turn', 'line', 'slit', 'Da', 'a.']);

function readUnit(s: string, pos: number): { unit: string; len: number } | null {
  let p = pos;
  let spaces = 0;
  while (s[p] === ' ' && spaces < 2) {
    p++;
    spaces++;
  }
  if (s[p] === '°') {
    if (s.slice(p, p + 2) === '°/') {
      /* fallthrough: °/s */
    } else return { unit: '°', len: p - pos + 1 };
  }
  if (s[p] === '%') return { unit: '%', len: p - pos + 1 };
  if (s.slice(p, p + 5) === 'degC') return { unit: '°C', len: p - pos + 4 };
  let q = p;
  while (q < s.length && q - p < 24 && (UNIT_CHARS.test(s[q]) || (s[q] === ' ' && /^ ?(?:s|m|kg|A|K|C|mol|Mpc|sr)(?:\^?-?\d)/.test(s.slice(q, q + 6))))) q++;
  let cand = s.slice(p, q);
  cand = cand.replace(/[.\-/·^]+$/, '');
  for (let L = cand.length; L > 0; L--) {
    const u = cand.slice(0, L).trim();
    const next = s[p + L] ?? ' ';
    if (/[A-Za-z]/.test(next)) continue;
    if (!u || /^\d/.test(u)) break;
    if (NOT_UNITS.has(u)) continue;
    if (/[-^]$/.test(u)) continue;
    try {
      parseUnit(u);
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
    let numText = m[1];
    const start = m.index;
    let end = start + numText.length;
    const before = text.slice(Math.max(0, start - 14), start).toLowerCase();
    if (/(question|figure|fig\.|table|part|page|q|step|diagram|graph|option|exam|syllabus)\s*$/.test(before)) continue;
    // mass numbers in isotope names: "U-235", "carbon-14", "He-4"
    if (/[a-z][- ]$/i.test(text.slice(Math.max(0, start - 2), start)) && /(?:^|[^a-z])(?:[A-Z][a-z]?|uranium|carbon|helium|iodine|cobalt|radium|radon|thorium|plutonium|strontium|caesium|cesium|hydrogen|deuterium|tritium|lead|iron|oxygen|nitrogen|potassium|technetium|americium|polonium|bismuth|lithium|beryllium|barium|krypton|xenon|sodium|phosphorus|neon|boron|argon)-?$/i.test(text.slice(Math.max(0, start - 14), start)) && !/\s*[=:]/.test(text.slice(start - 2, start))) continue;
    // leading "12." question numbers at line start
    if (/^\s*$/.test(text.slice(text.lastIndexOf('\n', start) + 1, start)) && /^\d+[.)]\s/.test(text.slice(start, start + 4))) continue;
    // sign: only a real minus if not "10 - 3" arithmetic between words
    if (numText.startsWith('+')) numText = numText.slice(1);
    if (numText.startsWith('-') && /\d\s*$/.test(text.slice(Math.max(0, start - 3), start))) {
      numText = numText.slice(1);
    }
    const value = parseFloat(numText);
    if (!isFinite(value)) continue;
    const u = readUnit(text, end);
    let unit = '';
    if (u) {
      unit = u.unit;
      end += u.len;
    }
    let dim: Dim | null = null;
    let factor = 1;
    let offset = 0;
    if (unit) {
      try {
        const pu = parseUnit(unit);
        dim = pu.dim;
        factor = pu.factor;
        offset = pu.offset ?? 0;
      } catch {
        unit = '';
      }
    }
    const pre = text.slice(Math.max(0, start - 16), start);
    const sm = /([A-Za-zσεμηρλθφγτωΔδαΦνϕ][A-Za-z0-9_σεμηρλθφγτωΔΦ½/]{0,6})\s*(?:=|:|≈)\s*$/.exec(pre);
    re.lastIndex = end;
    out.push({ index: idx++, numText, value, unit, valueSI: value * factor + offset, dim, start, end, symbol: sm ? sm[1] : undefined, sf: countSigFigs(numText) });
  }
  return out.map((q, i) => ({ ...q, index: i }));
}
