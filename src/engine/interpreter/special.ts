/**
 * Detection and extraction for problem types that need a specialised solver rather than
 * a formula chain: beams, resistor networks, inclined planes, logic, number systems,
 * iron–carbon lever rule, gear trains and trusses.
 */
import type { ModuleId } from '../formulas/types';
import type { BeamInput } from '../tools/beam';
import type { CircuitInput } from '../tools/circuit';
import type { InclineInput } from '../tools/mechanics';
import type { GearInput } from '../tools/mechanics';
import type { Base } from '../tools/numbase';
import { dimEq, parseUnit } from '../units';
import type { RawQuantity } from './extract';

export type SpecialResult =
  | { type: 'beam'; input: BeamInput; notes: string[] }
  | { type: 'truss'; notes: string[] }
  | { type: 'circuit'; input: CircuitInput; notes: string[] }
  | { type: 'incline'; input: InclineInput; notes: string[] }
  | { type: 'logic'; expr: string; notes: string[] }
  | { type: 'numbase'; value: string; from: Base; notes: string[] }
  | { type: 'lever'; C0: number; notes: string[] }
  | { type: 'gear'; input: GearInput; notes: string[] };

const is = (q: RawQuantity, unit: string) => q.dim !== null && dimEq(q.dim, parseUnit(unit).dim);
const lenQ = (q: RawQuantity) => is(q, 'm') && q.unit !== '';
const forceQ = (q: RawQuantity) => is(q, 'N');
const massQ = (q: RawQuantity) => is(q, 'kg');

function num(s: string): number {
  return parseFloat(s);
}

function lenToM(v: string, u: string): number {
  return num(v) * parseUnit(u || 'm').factor;
}

// ——— Beam ———
function extractBeam(text: string, qs: RawQuantity[]): SpecialResult | undefined {
  const lower = text.toLowerCase();
  if (!/\bbeam\b|\bcantilever\b|\bjoist\b|\bgirder\b/.test(lower)) return;
  if (!/simply supported|cantilever|supported at|supports? at|pinned|roller|fixed|built[- ]in|span/.test(lower)) return;
  const notes: string[] = [];
  const cantilever = /cantilever|built[- ]in|fixed (at|to|into)|encastr/.test(lower);
  const fixedRight = /fixed (at|to|into) (the )?(right|end b|b\b)|built[- ]in at (the )?right/.test(lower);
  const lengths = qs.filter(lenQ);
  // span: length followed by "long"/"span", or preceded by span/length words
  let spanQ = lengths.find((q) => /^\s*(long|span)/.test(text.slice(q.end, q.end + 8).toLowerCase()) || /(span|length|beam|cantilever)( of| is)?\s*(l\s*=\s*)?$/.test(text.slice(Math.max(0, q.start - 22), q.start).toLowerCase()));
  if (!spanQ) spanQ = [...lengths].sort((a, b) => b.valueSI - a.valueSI)[0];
  if (!spanQ) return;
  const L = spanQ.valueSI;
  const used = new Set<RawQuantity>([spanQ]);
  const posRe = /^[^.;]{0,40}?\bat\s+(?:a\s+distance\s+of\s+)?([\d.]+)\s*(mm|m)\s+(?:from|to the right of|to the left of)\s+(?:the\s+)?(left|right|a\b|b\b|support a|support b|left[- ]hand|right[- ]hand|fixed|free|wall)/i;
  const midRe = /^[^.;]{0,40}?\bat\s+(?:the\s+)?(centre|center|middle|mid-?span|mid-?point|half[- ]way)/i;
  const endRe = /^[^.;]{0,40}?\bat\s+(?:the\s+|its\s+)?(free\s+end|end|tip|right[- ]hand end|right end|end b|b\b)/i;
  const points: BeamInput['points'] = [];
  const pendingForces: RawQuantity[] = [];
  const forces = qs.filter(forceQ);
  for (const f of forces) {
    const after = text.slice(f.end, f.end + 70);
    let x: number | undefined;
    const pm = posRe.exec(after);
    const mm = midRe.exec(after);
    const em = endRe.exec(after);
    const firstIdx = (m: RegExpExecArray | null) => (m ? m.index + m[0].length : Infinity);
    const cand = [
      { m: pm, k: 'pos' },
      { m: mm, k: 'mid' },
      { m: em, k: 'end' },
    ].filter((c) => c.m).sort((a, b) => firstIdx(a.m) - firstIdx(b.m))[0];
    if (cand?.k === 'pos' && pm) {
      const d = lenToM(pm[1], pm[2]);
      const ref = pm[3].toLowerCase();
      const fromRight = /right|b\b|support b/.test(ref) || (cantilever && ((/fixed|wall/.test(ref) && fixedRight) || (/free/.test(ref) && !fixedRight)));
      x = fromRight ? L - d : d;
      // mark that length as used
      const lq = qs.find((q) => lenQ(q) && q.start >= f.end && q.start <= f.end + 70 && Math.abs(q.valueSI - d) < 1e-12);
      if (lq) used.add(lq);
    } else if (cand?.k === 'mid') x = L / 2;
    else if (cand?.k === 'end') x = cantilever ? (fixedRight ? 0 : L) : L;
    if (x === undefined) {
      // position written before the load: "at 2 m from A there is a 10 kN load"
      const before = text.slice(Math.max(0, f.start - 50), f.start);
      const bm = /at\s+([\d.]+)\s*(mm|m)\s+from\s+(?:the\s+)?(left|right|a\b|b\b|support a|support b|fixed end|free end|wall)[^.;]*$/i.exec(before);
      if (bm) {
        const d = lenToM(bm[1], bm[2]);
        x = /right|b\b/.test(bm[3].toLowerCase()) ? L - d : d;
        const lq = qs.find((q) => lenQ(q) && q.end <= f.start && q.start >= f.start - 50 && Math.abs(q.valueSI - d) < 1e-12);
        if (lq) used.add(lq);
      }
    }
    if (x === undefined) pendingForces.push(f);
    else points.push({ x, P: f.valueSI });
    used.add(f);
  }
  // Lists such as "loads of 10 kN and 20 kN at 2 m and 5 m from the left"
  if (pendingForces.length) {
    const spare = lengths
      .filter((q) => !used.has(q) && !q.symbol && q.start > pendingForces[0].end && /^\s*(?:and|,|from|m\b)?/.test(text.slice(q.end, q.end + 6)) && /\bat\b|,|and/.test(text.slice(Math.max(0, q.start - 6), q.start)))
      .slice(0, pendingForces.length);
    const refRight = /from (the )?(right|b\b)/i.test(text.slice(pendingForces[0].end, (spare[spare.length - 1]?.end ?? pendingForces[0].end) + 30));
    if (spare.length === pendingForces.length) {
      pendingForces.forEach((f, i) => {
        points.push({ x: refRight ? L - spare[i].valueSI : spare[i].valueSI, P: f.valueSI });
        used.add(spare[i]);
      });
    } else if (pendingForces.length === 1 && cantilever) {
      points.push({ x: fixedRight ? 0 : L, P: pendingForces[0].valueSI });
      notes.push('Load position not stated — assumed at the free end of the cantilever.');
    } else if (pendingForces.length === 1) {
      points.push({ x: L / 2, P: pendingForces[0].valueSI });
      notes.push('Load position not stated — assumed at mid-span.');
    } else {
      notes.push('Could not match every load to a position — check the loads in the Beam Analyser.');
      pendingForces.forEach((f) => points.push({ x: L / 2, P: f.valueSI }));
    }
  }
  // UDLs
  const udls: BeamInput['udls'] = [];
  for (const q of qs.filter((x) => is(x, 'N/m') && x.unit !== '')) {
    const after = text.slice(q.end, q.end + 80).toLowerCase();
    let x1 = 0;
    let x2 = L;
    const fr = /from\s+([\d.]+)\s*(mm|m)?\s+to\s+([\d.]+)\s*(mm|m)/.exec(after) ?? /between\s+([\d.]+)\s*(mm|m)?\s+and\s+([\d.]+)\s*(mm|m)/.exec(after);
    const first = /over\s+(?:the\s+)?(?:first|left(?:[- ]hand)?)\s+([\d.]+)\s*(mm|m)/.exec(after);
    const last = /over\s+(?:the\s+)?(?:last|right(?:[- ]hand)?|final)\s+([\d.]+)\s*(mm|m)/.exec(after);
    if (fr) {
      x1 = lenToM(fr[1], fr[2] || fr[4]);
      x2 = lenToM(fr[3], fr[4]);
    } else if (first) x2 = lenToM(first[1], first[2]);
    else if (last) x1 = L - lenToM(last[1], last[2]);
    else if (!/whole|entire|full|total|along its length|over its length|the span|length of the beam/.test(after)) notes.push('UDL extent not stated — assumed over the whole span.');
    udls.push({ x1, x2, w: q.valueSI });
    used.add(q);
    qs.filter((l) => lenQ(l) && l.start > q.end && l.start < q.end + 80).forEach((l) => {
      if ([x1, x2, L - x1].some((v) => Math.abs(v - l.valueSI) < 1e-9)) used.add(l);
    });
  }
  if (!points.length && !udls.length) return;
  // Section for bending stress
  let I: number | undefined;
  let y: number | undefined;
  const Iq = qs.find((q) => is(q, 'm^4') && q.unit !== '');
  if (Iq) I = Iq.valueSI;
  const yq = qs.find((q) => lenQ(q) && !used.has(q) && (q.symbol === 'y' || /neutral axis|extreme fibre|ymax|y max/.test(text.slice(Math.max(0, q.start - 40), q.start + 40).toLowerCase())));
  if (yq) y = yq.valueSI;
  const rect = /([\d.]+)\s*(mm|m)\s*(?:wide|width|broad)[^.]*?([\d.]+)\s*(mm|m)\s*(?:deep|depth|high)/i.exec(text) ?? /([\d.]+)\s*(mm|m)?\s*[×x]\s*([\d.]+)\s*(mm|m)\s*(?:deep|rectangular|section|beam|timber|cross)/i.exec(text);
  const depthQ = qs.find((q) => lenQ(q) && !used.has(q) && /^\s*(deep|depth)|(depth|deep) (of )?$/.test(text.slice(q.end, q.end + 7).toLowerCase() + '|' + text.slice(Math.max(0, q.start - 10), q.start).toLowerCase()));
  if (rect && I === undefined) {
    const b = lenToM(rect[1], rect[2] || rect[4]);
    const d = lenToM(rect[3], rect[4]);
    I = (b * d ** 3) / 12;
    y = y ?? d / 2;
    notes.push(`Rectangular section b = ${b * 1000} mm, d = ${d * 1000} mm: I = bd³/12, y = d/2.`);
  } else if (I !== undefined && y === undefined && depthQ) {
    y = depthQ.valueSI / 2;
    notes.push('y taken as half the section depth (symmetric section).');
  }
  const type: BeamInput['type'] = cantilever ? (fixedRight ? 'cantilever-right' : 'cantilever-left') : 'simply';
  if (!cantilever) notes.push('Supports assumed at each end of the span (A at the left, B at the right).');
  return { type: 'beam', input: { type, length: L, points, udls, couples: [], I, y }, notes };
}

// ——— Resistor network ———
function extractCircuit(text: string, qs: RawQuantity[]): SpecialResult | undefined {
  const lower = text.toLowerCase();
  const rs = qs.filter((q) => is(q, 'Ω') && q.unit !== '');
  if (rs.length < 2 || !/series|parallel/.test(lower)) return;
  const notes: string[] = [];
  const vals = rs.map((r) => r.valueSI);
  const hasS = /series/.test(lower);
  const hasP = /parallel/.test(lower);
  let network: string;
  if (hasP && !hasS) network = vals.join(' || ');
  else if (hasS && !hasP) network = vals.join(' + ');
  else {
    // find resistors mentioned as being in parallel with each other
    const par = rs.filter((r, i) => {
      const win = text.slice(r.end, Math.min(text.length, (rs[i + 1]?.end ?? r.end) + 45)).toLowerCase();
      const back = text.slice(Math.max(0, r.start - 45), r.start).toLowerCase();
      return /in parallel|parallel (combination|with)/.test(win) || /parallel (combination )?of\s*$|parallel with\s*$/.test(back);
    });
    let parSet = new Set(par.map((r) => r.index));
    if (parSet.size < 2) {
      // default: first in series with the rest in parallel
      parSet = new Set(rs.slice(1).map((r) => r.index));
      notes.push('Assumed the first resistor is in series with a parallel combination of the others — check the network expression.');
    } else if (/parallel (combination )?of/.test(lower)) {
      // "... in series with a parallel combination of R2 and R3": everything after "parallel combination of"
      const idx = lower.search(/parallel (combination )?of/);
      parSet = new Set(rs.filter((r) => r.start > idx).map((r) => r.index));
    }
    const ser = rs.filter((r) => !parSet.has(r.index)).map((r) => r.valueSI);
    const parVals = rs.filter((r) => parSet.has(r.index)).map((r) => r.valueSI);
    network = [...ser.map(String), `(${parVals.join(' || ')})`].join(' + ');
  }
  const V = qs.find((q) => is(q, 'V') && q.unit !== '');
  const I = qs.find((q) => is(q, 'A') && q.unit !== '');
  return { type: 'circuit', input: { network, V: V?.valueSI, I: V ? undefined : I?.valueSI }, notes: [`Network read as: ${network.replace(/\|\|/g, '∥')} (values in Ω).`, ...notes] };
}

// ——— Inclined plane ———
function extractIncline(text: string, qs: RawQuantity[], flags: Record<string, boolean>): SpecialResult | undefined {
  const lower = text.toLowerCase();
  if (!/incline|inclined|slope|ramp/.test(lower)) return;
  const angle = qs.find((q) => q.unit === '°');
  const mass = qs.find(massQ);
  const weight = qs.find((q) => forceQ(q) && /weigh/.test(text.slice(Math.max(0, q.start - 20), q.end + 10).toLowerCase()));
  const mu = qs.find((q) => q.unit === '' && (q.symbol === 'μ' || q.symbol === 'mu' || /coefficient/.test(text.slice(Math.max(0, q.start - 40), q.start).toLowerCase())));
  if (!angle || (!mass && !weight)) return;
  if (flags.slideOnset && !mu) return; // angle-of-repose question → formula chain
  const m = mass ? mass.valueSI : weight!.valueSI / 9.81;
  let mode: InclineInput['mode'] = 'up';
  if (/prevent|stop (it|the \w+) (from )?sliding|hold|keep .* (stationary|at rest)|minimum force .* (stationary|rest)/.test(lower)) mode = 'hold';
  else if (/will (it|the \w+) slide|determine whether|does (it|the \w+) slide|remain (stationary|at rest)/.test(lower)) mode = 'check';
  else if (/accelerat/.test(lower) && qs.some((q) => forceQ(q) && q !== weight)) mode = 'accel';
  if (!mu && mode !== 'check') return;
  const P = qs.find((q) => forceQ(q) && q !== weight);
  const alphaQ = qs.filter((q) => q.unit === '°')[1];
  const notes = [`Mode: ${mode === 'up' ? 'force to move the load up the incline' : mode === 'hold' ? 'minimum force to stop it sliding down' : mode === 'check' ? 'check whether it slides' : 'acceleration under an applied force'}.`];
  return { type: 'incline', input: { m, theta: angle.value, mu: mu ? mu.value : 0, alpha: alphaQ?.value ?? 0, P: P?.valueSI, mode }, notes };
}

// ——— Logic ———
function extractLogic(text: string): SpecialResult | undefined {
  const lower = text.toLowerCase();
  const gateWords = /\b(AND|OR|NAND|NOR|XOR|XNOR|NOT)\b/.test(text);
  if (!/truth table|logic|boolean|gate/.test(lower) && !gateWords) return;
  const eq = /(?:^|[^A-Za-z])([A-Z])\s*=\s*([A-Z0-9'’()+.·¬~!⊕ ]*(?:\b(?:AND|OR|NAND|NOR|XOR|XNOR|NOT)\b[A-Z0-9'’()+.·¬~!⊕ ]*)*)/.exec(text);
  let expr = eq?.[2]?.trim();
  if (!expr || expr.length < 2) {
    const m = /((?:NOT\s+)?\(?\s*[A-Z]'?\s*\)?(?:\s*(?:AND|OR|NAND|NOR|XOR|XNOR|[.+·⊕])\s*(?:NOT\s+)?\(?\s*[A-Z]'?\s*\)?)+)/.exec(text);
    expr = m?.[1]?.trim();
  }
  if (!expr) return;
  return { type: 'logic', expr, notes: [`Boolean expression read as: ${expr}`] };
}

// ——— Number systems ———
function extractNumbase(text: string): SpecialResult | undefined {
  const lower = text.toLowerCase();
  if (!/binary|hexadecimal|\bhex\b|octal|two'?s complement|base\s*(2|8|16)/.test(lower)) return;
  if (!/convert|equivalent|express|represent|value|what is|write|in binary|in decimal|in hex/.test(lower)) return;
  const m = /(?:number|convert|value|express|represent|write)\s+(?:the\s+)?(?:(binary|hexadecimal|hex|octal|decimal|denary)\s+(?:number\s+|value\s+)?)?(-?(?:0x)?[0-9A-Fa-f]+)(?:\s*(?:₂|₁₆|₈|₁₀|_?\(?(?:base\s*)?(2|8|10|16)\)?))?/i.exec(text);
  if (!m) return;
  const val = m[2];
  let from: Base = 10;
  const sub = /(₂|₁₆|₈)/.exec(text.slice(m.index, m.index + m[0].length + 2))?.[1];
  const explicit = (m[1] ?? '').toLowerCase();
  const baseNum = m[3];
  const fromWord = /from\s+(binary|hexadecimal|hex|octal|decimal)/i.exec(lower)?.[1];
  const w = explicit || fromWord || '';
  if (w.startsWith('bin') || baseNum === '2' || sub === '₂') from = 2;
  else if (w.startsWith('hex') || baseNum === '16' || sub === '₁₆' || /^0x/i.test(val) || /[a-f]/i.test(val)) from = 16;
  else if (w.startsWith('oct') || baseNum === '8' || sub === '₈') from = 8;
  else if (w === 'decimal' || w === 'denary') from = 10;
  else if (/to (decimal|denary)/.test(lower) && /^[01]+$/.test(val)) from = 2;
  return { type: 'numbase', value: val.replace(/^0x/i, ''), from, notes: [`Reading ${val} as a ${from === 2 ? 'binary' : from === 16 ? 'hexadecimal' : from === 8 ? 'octal' : 'decimal'} number.`] };
}

// ——— Lever rule ———
function extractLever(text: string, qs: RawQuantity[]): SpecialResult | undefined {
  const lower = text.toLowerCase();
  if (!/pearlite|ferrite|cementite|lever rule|eutectoid/.test(lower)) return;
  const c = qs.find((q) => q.unit === '%' && /carbon|\bc\b/.test(text.slice(q.end, q.end + 12).toLowerCase() + text.slice(Math.max(0, q.start - 25), q.start).toLowerCase())) ?? qs.find((q) => q.unit === '%');
  if (!c) return;
  return { type: 'lever', C0: c.value, notes: [`Plain carbon steel with ${c.value}% C, slowly cooled to just below 727 °C.`] };
}

// ——— Gear train ———
function extractGear(text: string, qs: RawQuantity[]): SpecialResult | undefined {
  const lower = text.toLowerCase();
  if (!/gear|sprocket|pinion/.test(lower)) return;
  const teeth = qs.filter((q) => q.unit === '' && /^\s*(teeth|tooth|t\b)/i.test(text.slice(q.end, q.end + 8)));
  if (teeth.length < 4 || teeth.length % 2 !== 0) return;
  const stages = [];
  for (let i = 0; i < teeth.length; i += 2) stages.push({ driver: teeth[i].value, driven: teeth[i + 1].value });
  const speed = qs.find((q) => q.unit && /rpm|rad\/s|rev/.test(q.unit));
  const torque = qs.find((q) => q.dim !== null && dimEq(q.dim, parseUnit('N·m').dim) && q.unit !== '');
  const eta = qs.find((q) => q.unit === '%' && /effic/.test(text.slice(Math.max(0, q.start - 30), q.end + 20).toLowerCase()));
  return { type: 'gear', input: { stages, nIn: speed?.valueSI, Tin: torque?.valueSI, eta: eta?.valueSI }, notes: ['Gears paired in the order given: (driver, driven), (driver, driven)…'] };
}

export function detectSpecial(text: string, qs: RawQuantity[], modules: ModuleId[], flags: Record<string, boolean>): SpecialResult | undefined {
  const lower = text.toLowerCase();
  void modules;
  if (/force in (each|every|all)?\s*(of the )?members?|member forces|forces in (all )?the members|method of joints|method of sections/.test(lower) && /truss|frame/.test(lower)) {
    return { type: 'truss', notes: ['Truss geometry cannot be read reliably from text. Enter the joints, members, supports and loads in the Truss Solver.'] };
  }
  return extractNumbase(text) ?? extractLever(text, qs) ?? extractLogic(text) ?? extractCircuit(text, qs) ?? extractBeam(text, qs) ?? extractIncline(text, qs, flags) ?? extractGear(text, qs);
}
