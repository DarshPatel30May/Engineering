/**
 * Number systems: binary, octal, decimal, hexadecimal, BCD and two's complement,
 * with the working an HSC answer expects (repeated division, positional expansion,
 * 4-bit grouping).
 */
import { emptySolution, Solution } from '../solution';

export type Base = 2 | 8 | 10 | 16;
const DIGITS = '0123456789ABCDEF';
const NAMES: Record<Base, string> = { 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hexadecimal' };

export function parseInBase(s: string, base: Base): number {
  const clean = s.trim().toUpperCase().replace(/^0[BXO]/, '').replace(/[\s_]/g, '');
  if (!clean) throw new Error('Enter a number.');
  let v = 0;
  for (const ch of clean) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) throw new Error(`"${ch}" is not a valid ${NAMES[base]} digit.`);
    v = v * base + d;
  }
  if (!Number.isSafeInteger(v)) throw new Error('Number too large.');
  return v;
}

export function toBase(v: number, base: Base): string {
  if (v === 0) return '0';
  let s = '';
  let x = v;
  while (x > 0) {
    s = DIGITS[x % base] + s;
    x = Math.floor(x / base);
  }
  return s;
}

export function toBCD(v: number): string {
  return String(v)
    .split('')
    .map((d) => Number(d).toString(2).padStart(4, '0'))
    .join(' ');
}

export function twosComplement(v: number, bits: number): string {
  const min = -(2 ** (bits - 1));
  const max = 2 ** (bits - 1) - 1;
  if (v < min || v > max) throw new Error(`${v} is outside the ${bits}-bit two's complement range ${min} to ${max}.`);
  const u = v < 0 ? 2 ** bits + v : v;
  return u.toString(2).padStart(bits, '0');
}

export function numberSolution(input: string, from: Base, bits = 8): Solution {
  const sol = emptySolution('Number system conversion');
  sol.module = 'telecom';
  sol.topic = 'Digital — number systems';
  let v: number;
  const neg = from === 10 && input.trim().startsWith('-');
  try {
    v = parseInBase(neg ? input.trim().slice(1) : input, from);
  } catch (e) {
    sol.issues.push({ level: 'error', message: (e as Error).message });
    return sol;
  }
  if (neg) v = -v;
  sol.given.push({ symbolLatex: 'N', name: `${NAMES[from]} number`, raw: `${input}${from !== 10 ? `₍${from}₎` : ''}`, valueSI: v, quantity: 'count', unit: '' });
  const abs = Math.abs(v);
  if (from !== 10) {
    const digits = input.trim().toUpperCase().replace(/^0[BXO]/, '').replace(/[\s_]/g, '');
    const terms = digits.split('').map((ch, i) => `${DIGITS.indexOf(ch)} \\times ${from}^{${digits.length - 1 - i}}`);
    sol.steps.push({
      title: `Step 1 — ${NAMES[from]} → decimal (positional expansion)`,
      formulaLatex: `N_{10} = \\sum d_i \\times ${from}^i`,
      workingLatex: [`${digits}_{${from}} = ${terms.join(' + ')}`],
      resultLatex: `= ${v}_{10}`,
    });
  }
  for (const b of [2, 8, 16] as Base[]) {
    if (b === from) continue;
    const lines: string[] = [];
    let x = abs;
    if (x === 0) lines.push(`0 \\div ${b} = 0 \\text{ r } 0`);
    let guard = 0;
    while (x > 0 && guard++ < 64) {
      lines.push(`${x} \\div ${b} = ${Math.floor(x / b)} \\text{ remainder } ${DIGITS[x % b]}`);
      x = Math.floor(x / b);
    }
    sol.steps.push({
      title: `Decimal → ${NAMES[b]} (repeated division by ${b}, read remainders bottom-up)`,
      formulaLatex: `\\text{Divide by } ${b} \\text{ repeatedly}`,
      workingLatex: lines,
      resultLatex: `${abs}_{10} = ${toBase(abs, b)}_{${b}}`,
    });
  }
  const bin = toBase(abs, 2);
  const padded = bin.padStart(Math.ceil(bin.length / 4) * 4, '0');
  const groups = padded.match(/.{4}/g) ?? [];
  sol.steps.push({
    title: 'Binary ↔ hexadecimal (group bits in fours from the right)',
    formulaLatex: '1\\ \\text{hex digit} = 4\\ \\text{bits}',
    workingLatex: [groups.map((g) => `${g}_2 = ${parseInt(g, 2).toString(16).toUpperCase()}_{16}`).join(',\\quad ')],
    resultLatex: `${padded.replace(/(.{4})(?=.)/g, '$1\\ ')}_2 = ${toBase(abs, 16)}_{16}`,
  });
  const rows: string[][] = [
    ['Decimal', String(v)],
    ['Binary', (v < 0 ? '−' : '') + bin],
    ['Octal', (v < 0 ? '−' : '') + toBase(abs, 8)],
    ['Hexadecimal', (v < 0 ? '−' : '') + toBase(abs, 16)],
    ['BCD', (v < 0 ? '−' : '') + toBCD(abs)],
  ];
  try {
    rows.push([`${bits}-bit two's complement`, twosComplement(v, bits)]);
    if (v < 0) {
      const pos = twosComplement(-v, bits);
      const inv = pos.split('').map((b) => (b === '0' ? '1' : '0')).join('');
      sol.steps.push({
        title: `Two's complement of ${v} (${bits}-bit)`,
        formulaLatex: '\\text{Invert all bits of } |N| \\text{, then add } 1',
        workingLatex: [`|N| = ${pos}`, `\\text{inverted} = ${inv}`, `${inv} + 1 = ${twosComplement(v, bits)}`],
        resultLatex: `${v} = ${twosComplement(v, bits)}_2`,
      });
    }
  } catch (e) {
    sol.issues.push({ level: 'warning', message: (e as Error).message });
  }
  sol.tables = [{ title: 'Equivalent representations', headers: ['System', 'Value'], rows }];
  sol.ok = true;
  return sol;
}
