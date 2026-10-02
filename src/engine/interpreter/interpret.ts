/**
 * Smart problem interpreter. Deterministic, rule-based natural-language reading of an
 * HSC-style question: module/topic detection, quantity-to-variable assignment using
 * units + nearby wording + typed symbols, identification of the unknown(s), and routing
 * to a specialised tool (beam, circuit, incline, logic, …) where appropriate.
 */
import { CONCEPTS, Concept, getConcept } from '../concepts';
import { FORMULAS } from '../formulas';
import type { ModuleId } from '../formulas/types';
import { getQuantity } from '../quantities';
import { dimEq } from '../units';
import { extractQuantities, normaliseText, RawQuantity } from './extract';
import { detectSpecial, SpecialResult } from './special';

export interface Candidate {
  concept: string;
  score: number;
}

export interface QtyAssignment extends RawQuantity {
  concept: string | null;
  candidates: Candidate[];
  confidence: 'high' | 'medium' | 'low';
  /** user excluded this number */
  ignored?: boolean;
}

export type ProblemType = 'chain' | 'beam' | 'truss' | 'circuit' | 'incline' | 'logic' | 'numbase' | 'lever' | 'gear' | 'flight' | 'forces';

export interface Interpretation {
  text: string;
  normalised: string;
  modules: ModuleId[];
  moduleScores: Record<ModuleId, number>;
  topic: string;
  quantities: QtyAssignment[];
  targets: string[];
  problemType: ProblemType;
  flags: Record<string, boolean>;
  notes: string[];
  ambiguities: string[];
  special?: SpecialResult;
}

const MODULE_WORDS: Record<ModuleId, string[]> = {
  civil: ['beam', 'truss', 'bridge', 'column', 'cable', 'girder', 'joist', 'concrete', 'reinforced', 'prestressed', 'building', 'tie', 'strut', 'member', 'simply supported', 'cantilever', 'dam', 'footing', 'pier', 'rod', 'bar', 'steel', 'tensile test', 'specimen', 'structure', 'crane', 'stress', 'strain', 'udl', 'support', 'reaction', 'deck', 'tower', 'suspension'],
  transport: ['car', 'vehicle', 'train', 'tram', 'bus', 'bicycle', 'bike', 'brake', 'braking', 'friction', 'gear', 'engine', 'motor', 'pulley', 'lever', 'rail', 'tyre', 'tire', 'pedal', 'jack', 'wheel', 'axle', 'truck', 'road', 'hill', 'incline', 'ramp', 'slope', 'crate', 'block', 'piston', 'hydraulic', 'carbon', 'steel', 'pearlite', 'ferrite', 'battery', 'electric vehicle', 'kwh', 'transformer', 'sprocket', 'chain', 'teeth', 'effort', 'load', 'mechanical advantage', 'velocity ratio'],
  aero: ['aircraft', 'aeroplane', 'airplane', 'wing', 'lift', 'drag', 'thrust', 'glide', 'glider', 'flight', 'airspeed', 'bernoulli', 'fuselage', 'jet', 'propeller', 'pitot', 'altitude', 'take-off', 'takeoff', 'runway', 'climb', 'banked', 'aerofoil', 'airfoil', 'l/d', 'cruise', 'pilot', 'mach', 'venturi', 'airliner', 'helicopter', 'drone', 'cabin'],
  telecom: ['signal', 'frequency', 'antenna', 'aerial', 'fibre', 'fiber', 'optical', 'resistor', 'circuit', 'voltage', 'current', 'binary', 'logic', 'gate', 'satellite', 'radio', 'decibel', 'db', 'bandwidth', 'modulation', 'transmitter', 'receiver', 'wavelength', 'refractive', 'critical angle', 'cladding', 'core', 'hexadecimal', 'truth table', 'bit', 'mbps', 'download', 'amplifier', 'ohm', 'series', 'parallel', 'mobile', 'microwave', 'dipole', 'sampling'],
};

export function detectModules(text: string): { modules: ModuleId[]; scores: Record<ModuleId, number> } {
  const t = ' ' + text.toLowerCase() + ' ';
  const scores = { civil: 0, transport: 0, aero: 0, telecom: 0 } as Record<ModuleId, number>;
  (Object.keys(MODULE_WORDS) as ModuleId[]).forEach((m) => {
    for (const w of MODULE_WORDS[m]) {
      const re = new RegExp(`[^a-z]${w.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?[^a-z]`, 'g');
      const n = (t.match(re) ?? []).length;
      scores[m] += n * (w.includes(' ') ? 2 : 1);
    }
  });
  // "inclined plane" is not an aeroplane
  if (/inclined plane|plane (is )?inclined/.test(t)) scores.aero = Math.max(0, scores.aero - 1);
  const max = Math.max(...Object.values(scores));
  const modules = max === 0 ? [] : (Object.keys(scores) as ModuleId[]).filter((m) => scores[m] >= max * 0.6 && scores[m] > 0).sort((a, b) => scores[b] - scores[a]);
  return { modules, scores };
}

const PA_STRESS = new Set(['sigma', 'uts', 'sy', 'sw', 'sigmaB', 'tau']);
const PA_PRESSURE = new Set(['p', 'q', 'p1', 'p2', 'deltaP', 'WL']);
const ENERGY_J = new Set(['work', 'energy', 'KE', 'PE', 'Eout', 'Ein', 'U']);

function unitBoost(q: RawQuantity, c: Concept): number {
  const u = q.unit;
  if (/GPa|kN\/mm/.test(u)) return c.id === 'youngs' ? 1.5 : PA_STRESS.has(c.id) ? 0.2 : 0;
  if (/MPa|N\/mm/.test(u)) return PA_STRESS.has(c.id) ? 0.4 : c.id === 'youngs' ? 0.1 : 0;
  if (/kPa|^Pa$|bar|atm|N\/m²|N\/m\^2/.test(u)) return PA_PRESSURE.has(c.id) ? 0.4 : 0;
  if (/^(k|M|G)?(J|Wh)$|kWh/.test(u)) return ENERGY_J.has(c.id) ? 0.5 : -0.5;
  if (/N·m|Nm|N\.m|N·mm|Nmm/.test(u)) return ENERGY_J.has(c.id) ? -0.3 : 0.2;
  if (/rpm|rad\/s|rev/.test(u)) return getQuantity(c.quantity).id === 'angularVelocity' ? 1 : -1;
  if (/Hz/.test(u)) return getQuantity(c.quantity).id === 'frequency' ? 1 : -1;
  if (/bps|bit|B\/s/.test(u)) return getQuantity(c.quantity).id === 'dataRate' ? 1 : -1;
  if (/kN\/m|^N\/m$/.test(u)) return c.id === 'w' ? 0.6 : 0;
  if (/N\/mm$/.test(u)) return c.id === 'k' ? 0.6 : 0;
  if (u === '%') return getQuantity(c.quantity).percent ? 0.3 : 0;
  return 0;
}

function candidateConcepts(q: RawQuantity): Concept[] {
  if (!q.unit) {
    return CONCEPTS.filter((c) => ['ratio', 'percent', 'count', 'dimensionless'].includes(getQuantity(c.quantity).id));
  }
  if (q.unit === '%') return CONCEPTS.filter((c) => ['ratio', 'percent'].includes(getQuantity(c.quantity).id));
  if (q.unit === '°') return CONCEPTS.filter((c) => getQuantity(c.quantity).angle);
  if (/^div/i.test(q.unit)) return CONCEPTS.filter((c) => c.id === 'divsH' || c.id === 'divsV');
  if (/^bits?$/.test(q.unit)) return CONCEPTS.filter((c) => ['count', 'data'].includes(getQuantity(c.quantity).id));
  if (q.unit === 'dB') return CONCEPTS.filter((c) => c.quantity === 'decibel');
  return CONCEPTS.filter((c) => {
    const k = getQuantity(c.quantity);
    if (k.angle || k.id === 'decibel') return false;
    return q.dim !== null && dimEq(k.dim, q.dim);
  });
}

const DEFAULT_CONCEPT: Record<string, string> = {
  force: 'F', mass: 'm', time: 't', velocity: 'v', acceleration: 'a', area: 'A', stress: 'sigma', modulus: 'youngs', pressure: 'p', moment: 'M',
  energy: 'energy', power: 'P', voltage: 'V', current: 'I', resistance: 'R', frequency: 'f', angle: 'theta', density: 'rho', secondMoment: 'Isec', udl: 'w',
  volume: 'vol', charge: 'Q', angularVelocity: 'omega', dataRate: 'bitRate', data: 'dataSize', attenuation: 'alpha', decibel: 'gainDb', massFlow: 'mdot',
};

/** Positions of every keyword occurrence in the text. */
function occurrences(textLower: string, kw: string): number[] {
  const out: number[] = [];
  const esc = kw.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![a-z])${esc}(?:s|es|ed|ing)?(?![a-z])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(textLower))) out.push(m.index);
  return out;
}

/** Concepts that only make sense when certain wording is present. */
const CONTEXT_REQUIRED: Record<string, RegExp> = {
  load: /effort|pulley|lever|machine|jack|winch|mechanical advantage|velocity ratio|block and tackle|hoist|wheel and axle|screw/,
  effort: /effort|pulley|lever|machine|jack|winch|mechanical advantage|velocity ratio|block and tackle|hoist|wheel and axle|screw/,
  distL: /effort|pulley|lever|machine|jack|winch|mechanical advantage|velocity ratio|block and tackle|hoist|wheel and axle|screw/,
  distE: /effort|pulley|lever|machine|jack|winch|mechanical advantage|velocity ratio|block and tackle|hoist|wheel and axle|screw/,
  F1: /piston|hydraulic|cylinder|pascal|plunger|ram/,
  F2: /piston|hydraulic|cylinder|pascal|plunger|ram/,
  Ffail: /fail|break|ultimate load|factor of safety|safe/,
  Fw: /working load|safe|factor of safety/,
  Lift: /aircraft|aeroplane|airplane|wing|glid|flight|aerofoil|airfoil|lift coefficient|lift force|helicopter|drone/,
  U: /strain energy|elastic|spring|stretch|extension|resilience/,
  Fr: /vehicle|car\b|train|bus\b|truck|motion|rolling|air resistance|resistance to motion|tractive|aircraft|drag|bicycle|cyclist/,
  linkLength: /fibre|fiber|signal|attenuat|\bdb\b|link|repeater/,
  alpha: /fibre|fiber|signal|attenuat|\bdb\b|link/,
  h1: /charpy|izod|pendulum|impact/,
  h2: /charpy|izod|pendulum|impact/,
  impactE: /charpy|izod|pendulum|impact/,
  Ff: /friction|μ|mu\b|coefficient|slid|brak|grip/,
  Th: /thrust|aircraft|engine|jet|propel/,
  Drag: /drag|aircraft|air resistance|aerodynamic/,
};

function scoreConcept(q: RawQuantity, c: Concept, textLower: string, all: RawQuantity[]): number {
  let best = 0;
  for (const kw of c.keywords) {
    for (const pos of occurrences(textLower, kw)) {
      const kEnd = pos + kw.length;
      let gap: number;
      let after = false;
      const numEnd = q.start + q.numText.length;
      if (kEnd <= q.start) gap = q.start - kEnd;
      else if (pos >= q.end) {
        gap = pos - q.end;
        after = true;
      } else if (pos >= numEnd) {
        gap = 0; // keyword begins inside the unit, e.g. "16 bits per sample"
        after = true;
      } else continue;
      if (gap > (after ? 30 : 90)) continue;
      const lo = after ? Math.min(q.end, pos) : kEnd;
      const hi = after ? pos : q.start;
      const between = textLower.slice(lo, hi);
      // sentence boundary (a full stop not part of a decimal) between keyword and number
      if (/\.(\s|$)|\?|;/.test(between)) continue;
      const intervening = all.filter((o) => o !== q && o.start >= lo && o.end <= hi).length;
      // a keyword written straight after another number belongs to that number ("12 mm diameter …, 25 m long")
      const ownedByOther = !after && all.some((o) => o !== q && o.start < pos && pos <= o.end + 2 && pos - o.end < q.start - kEnd);
      let s = (1 + Math.min(kw.length, 30) / 8) * (1 - gap / 100) * Math.pow(0.35, intervening);
      if (after) s *= 0.85;
      if (ownedByOther) s *= 0.3;
      best = Math.max(best, s);
    }
  }
  if (q.symbol && c.symbols?.length) {
    if (c.symbols.includes(q.symbol)) best += 4;
    else if (c.symbols.some((s) => s.toLowerCase() === q.symbol!.toLowerCase())) best += 2;
  }
  best += unitBoost(q, c);
  const req = CONTEXT_REQUIRED[c.id];
  if (req && !req.test(textLower)) best *= 0.3;
  const kind = getQuantity(c.quantity).id;
  if (DEFAULT_CONCEPT[kind] === c.id) best += 0.15;
  return best;
}

const TARGET_RE = /(calculate|determine|find|what is|what's|what was|what are|what|evaluate|compute|how (?:much|far|long|fast|many)|show that|estimate|work out|state the|obtain|deduce|predict|solve for)\s+([^.?;\n]*)/gi;

const HOW_MAP: Record<string, string[]> = {
  'how far': ['s', 'glideDist'],
  'how long': ['t'],
  'how fast': ['v'],
  'how much work': ['work'],
  'how much energy': ['energy'],
  'how much force': ['F'],
  'how much power': ['P'],
};

/** Modules in which each concept is used by some formula. */
const CONCEPT_MODULES = (() => {
  const map = new Map<string, Set<ModuleId>>();
  for (const f of FORMULAS) for (const v of f.vars) {
    if (!map.has(v.concept)) map.set(v.concept, new Set());
    f.modules.forEach((m) => map.get(v.concept)!.add(m));
  }
  return map;
})();

/** "Calculate the E of a material…": resolve a bare symbol using the other data in the question. */
function symbolTarget(norm: string, clauseStart: number, assigned: Set<string>, modules: ModuleId[]): string | null {
  const mm = /^\s*(?:the\s+)?([A-Za-zσεμηρλθφγτωΔ][A-Za-z0-9_]{0,3})(?![A-Za-z])/.exec(norm.slice(clauseStart));
  if (!mm) return null;
  const sym = mm[1];
  const cands = CONCEPTS.filter((c) => c.symbols?.includes(sym) && !assigned.has(c.id));
  if (!cands.length) return null;
  const score = (id: string) => {
    let n = 0;
    for (const f of FORMULAS) {
      if (!f.vars.some((v) => v.concept === id)) continue;
      n += f.vars.filter((v) => v.concept !== id && assigned.has(v.concept)).length;
      if (modules.length && f.modules.some((x) => modules.includes(x))) n += 0.1;
    }
    return n;
  };
  return cands.sort((a, b) => score(b.id) - score(a.id))[0].id;
}

/** Phrase patterns that name an unknown unambiguously (checked before keyword scoring). */
const TARGET_PATTERNS: [RegExp, string][] = [
  [/^\s*(?:the\s+)?(?:useful\s+|output\s+)?power (?:delivered|transmitted|available|supplied) (?:to|at) (?:the\s+)?(?:driving\s+|drive\s+)?(?:wheels?|axle|propeller|road|output)/, 'Pout'],
  [/^\s*(?:the\s+)?(?:useful\s+)?power (?:at|to) the (?:driving\s+)?wheels/, 'Pout'],
  [/^\s*(?:the\s+)?(?:tractive|driving) (?:force|effort)(?: at the (?:driving )?wheels)?/, 'Ft'],
  [/^\s*(?:the\s+)?(?:total\s+)?torque (?:at|on) (?:the\s+)?(?:driving\s+)?wheels/, 'wheelTorque'],
  [/^\s*(?:the\s+)?torque (?:at|on) each (?:driving\s+)?wheel/, 'wheelTorqueEach'],
  [/^\s*(?:the\s+)?(?:input|engine|electrical input) power/, 'Pin'],
  [/^\s*(?:the\s+)?(?:mechanical\s+|useful\s+)?(?:power output|output power)/, 'Pout'],
  [/^\s*(?:the\s+)?(?:minimum\s+|required\s+)?length of (?:a|an|the)?[^,.;]{0,30}?(?:antenna|dipole|aerial|monopole)/, 'antennaLength'],
  [/^\s*(?:the\s+)?(?:shear stress|stress) (?:on|in) each (?:bolt|rivet|pin|screw)/, 'tau'],
  [/^\s*(?:the\s+)?(?:load|force) (?:on|in|carried by) each (?:bolt|rivet|pin|screw)/, 'Fbolt'],
  [/^\s*(?:the\s+)?(?:angle of (?:the\s+)?(?:ramp|incline|slope|plane|hill))/, 'incline'],
  [/^\s*(?:the\s+)?(?:number of (?:bolts|rivets|pins|screws))/, 'nFasteners'],
];

export function findTargets(norm: string, assigned: Set<string>, modules: ModuleId[]): string[] {
  const lower = norm.toLowerCase();
  const targets: string[] = [];
  let m: RegExpExecArray | null;
  TARGET_RE.lastIndex = 0;
  while ((m = TARGET_RE.exec(lower))) {
    const verb = m[1];
    // stop at "if/given/when/using" subordinate parts which usually describe data
    const whole = m[2].split(/\b(?:if|given that|given|when|using|assuming|where|for a|required for)\b/)[0];
    // "power and resistance" → two targets
    const parts = whole.split(/\s+and\s+(?:the\s+|its\s+)?|,\s*/).filter((p) => p.trim().length > 0);
    for (const [pi, clause] of parts.entries()) {
    let best: { id: string; score: number } | null = null;
    const pat = TARGET_PATTERNS.find(([re]) => re.test(clause));
    if (pat) best = { id: pat[1], score: 100 };
    for (const c of pat ? [] : CONCEPTS) {
      for (const kw of c.keywords) {
        const occ = occurrences(clause, kw);
        if (!occ.length) continue;
        let score = kw.length * 2 - occ[0] * 0.4 + (occ[0] <= 5 ? 8 : 0);
        // a keyword immediately followed by a number labels given data, not the unknown
        if (/^[^.;]{0,14}?\d/.test(clause.slice(occ[0] + kw.length))) score -= 15;
        if (verb === 'how many' && getQuantity(c.quantity).id === 'count') score += 6;
        if (assigned.has(c.id)) score -= 12;
        if (modules.length && [...(CONCEPT_MODULES.get(c.id) ?? [])].some((mm) => modules.includes(mm))) score += 3;
        if (CONTEXT_REQUIRED[c.id] && !CONTEXT_REQUIRED[c.id].test(lower)) score -= 12;
        if (c.id === 'glideDist' && !modules.includes('aero')) score -= 20;
        if (!best || score > best.score) best = { id: c.id, score };
      }
    }
    const how = pi === 0 ? Object.keys(HOW_MAP).find((h) => verb === h || (verb + ' ' + clause).startsWith(h)) : undefined;
    if (how && (!best || best.score < 6)) {
      const opts = HOW_MAP[how];
      best = { id: modules.includes('aero') && opts.includes('glideDist') ? 'glideDist' : opts[0], score: 10 };
    }
    if ((!best || best.score <= 4) && pi === 0) {
      const sym = symbolTarget(norm, m.index + m[0].length - m[2].length, assigned, modules);
      if (sym) best = { id: sym, score: 10 };
    }
    if (best && best.score > 4 && !targets.includes(best.id)) targets.push(best.id);
    }
  }
  return targets;
}

export function assignConcepts(quantities: RawQuantity[], norm: string, likelyTargets: string[] = []): QtyAssignment[] {
  const lower = norm.toLowerCase();
  const triples: { q: RawQuantity; c: string; s: number }[] = [];
  const cands = new Map<number, Candidate[]>();
  for (const q of quantities) {
    const list = candidateConcepts(q)
      .map((c) => ({ concept: c.id, score: scoreConcept(q, c, lower, quantities) * (likelyTargets.includes(c.id) ? 0.25 : 1) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    cands.set(q.index, list);
    list.forEach((x) => triples.push({ q, c: x.concept, s: x.score }));
  }
  triples.sort((a, b) => b.s - a.s);
  const byQ = new Map<number, string>();
  const taken = new Set<string>();
  const takenValue = new Map<string, number>();
  for (const t of triples) {
    if (byQ.has(t.q.index)) continue;
    if (taken.has(t.c)) {
      // the same value stated twice for the same thing (e.g. two 12 mm thick plates) — allow the duplicate
      const tv = takenValue.get(t.c)!;
      if (!(Math.abs(tv - t.q.valueSI) <= 1e-12 * Math.max(1, Math.abs(tv)))) continue;
    }
    byQ.set(t.q.index, t.c);
    taken.add(t.c);
    takenValue.set(t.c, t.q.valueSI);
  }
  return quantities.map((q) => {
    const list = cands.get(q.index) ?? [];
    const concept = byQ.get(q.index) ?? null;
    const top = list.find((x) => x.concept === concept)?.score ?? 0;
    const second = list.find((x) => x.concept !== concept)?.score ?? 0;
    const confidence: QtyAssignment['confidence'] = !concept ? 'low' : top >= 1.2 && top - second >= 0.3 ? 'high' : top >= 0.6 ? 'medium' : 'low';
    return { ...q, concept, candidates: list, confidence };
  });
}

function detectFlags(lower: string): Record<string, boolean> {
  return {
    fromRest: /from rest|starts? from rest|initially at rest|from a standstill|stationary start/.test(lower),
    toRest: /to rest|(comes?|brought|bring|brings) to (a )?(stop|rest|halt)|stops|to a stop|to a standstill|halts|to stop|stopping|to come to rest|pulls up/.test(lower),
    doubleShear: /double shear|clevis|fork(ed)? (end|joint)|two shear planes|sandwiched between|between two (plates|straps|cover plates)|double cover|double strap|butt joint with two/.test(lower),
    singleShear: /single shear/.test(lower),
    level: /straight and level|level flight|cruis/.test(lower),
    constantSpeed: /(constant|steady|uniform) (speed|velocity)|without accelerating|at a constant rate/.test(lower),
    slideOnset: /(about|starts?|begins?|just) to slide|on the point of sliding|angle of repose|impending/.test(lower),
    halfWave: /half[- ]wave|dipole/.test(lower),
    quarterWave: /quarter[- ]wave|monopole|whip/.test(lower),
    roundTrip: /round[- ]trip|\band back\b|there and back|uplink and downlink|return journey|up and down|to .{0,80} and (?:then )?(?:back|return)/.test(lower),
    ideal: /no friction|frictionless|without friction|ideal (machine|pulley|lever|system)|neglect(ing)? friction|ignore friction|100\s*% efficient|assume no losses|no losses/.test(lower),
  };
}

/**
 * Structural wording rules that keyword proximity alone cannot resolve:
 *  - "from A to B" pairs (speeds, voltages, powers, lengths)
 *  - lever arms "x m from the fulcrum" attributed to the nearest load/effort
 */
function applyPairRules(qs: QtyAssignment[], text: string, lower: string) {
  const kindOf = (q: QtyAssignment) => (q.dim ? q.dim.join(',') : 'none');
  const PAIRS: Record<string, [string, string]> = {
    '1,0,-1,0': ['u', 'v'],
    '2,1,-3,-1': ['Vin', 'Vout'],
    '2,1,-3,0': ['Pin', 'Pout'],
  };
  for (let i = 0; i < qs.length - 1; i++) {
    const a = qs[i];
    const b = qs[i + 1];
    if (kindOf(a) !== kindOf(b) || !a.dim) continue;
    const between = text.slice(a.end, b.start);
    const before = text.slice(Math.max(0, a.start - 6), a.start).toLowerCase();
    if (!/^\s*to\s*$/i.test(between) || !/from\s*$/.test(before)) continue;
    let pair = PAIRS[kindOf(a)];
    if (kindOf(a) === '1,0,0,0' && /gauge length|fracture|final length/.test(lower)) pair = ['L0', 'Lf'];
    if (kindOf(a) === '2,1,-3,-1' && !/amplif|gain|decibel|db\b|attenuat/.test(lower)) pair = undefined as never;
    if (!pair) continue;
    a.concept = pair[0];
    b.concept = pair[1];
    a.confidence = b.confidence = 'high';
  }
  // Power/energy around an efficient component (transmission, gearbox, motor, pump, generator…):
  // decide whether each stated power is upstream (input) or downstream (output) of it.
  if (/efficien/.test(lower)) {
    const sentenceOf = (q: QtyAssignment) => {
      const a = text.lastIndexOf('.', q.start - 1) + 1;
      const bIdx = text.indexOf('.', q.end);
      return text.slice(a, bIdx < 0 ? undefined : bIdx).toLowerCase();
    };
    const OUT = /\bdelivers\b|\boutput of\b|(delivered|transmitted|supplied|passed) to (the )?(driving |drive |rear |front )?(wheels?|axle|propeller|load|output shaft|road)|at the (driving |drive )?wheels|wheel power|output (of|from) the (transmission|gearbox|drivetrain|motor|pump|machine|generator)|useful output|output power|power output|at the output|electrical output of the generator/;
    const IN = /\bengine (produces|develops|delivers|generates|outputs|supplies|provides|is rated)|produced by the engine|engine power|power of the engine|\bmotor (draws|consumes|takes|uses)|\bdraws\b|\bconsumes\b|\binput\b|supplied to the (motor|machine|pump|transmission|gearbox)|electrical power (input|supplied|drawn)|from the (mains|supply|battery)|fuel (energy|power)/;
    const component = /transmission|gearbox|drivetrain|driveline|drive train|final drive|chain drive|belt drive|differential/.test(lower);
    const nearest = (re: RegExp, sen: string, at: number) => {
      let best = Infinity;
      const g = new RegExp(re.source, 'g');
      let m: RegExpExecArray | null;
      while ((m = g.exec(sen))) {
        const d = m.index + m[0].length <= at ? at - (m.index + m[0].length) : (m.index - at) * 1.5; // prefer cues before the number
        best = Math.min(best, d);
      }
      return best;
    };
    for (const q of qs) {
      if (!q.dim || !['2,1,-3,0', '2,1,-2,0'].includes(q.dim.join(','))) continue;
      const sStart = text.lastIndexOf('.', q.start - 1) + 1;
      const sen = sentenceOf(q);
      const at = q.start - sStart;
      const isPower = q.dim.join(',') === '2,1,-3,0';
      // strong rule: an engine's power feeding a transmission/gearbox is that component's INPUT, even if called "useful"
      const engineFeeds = component && /\bengine\b/.test(sen) && !OUT.test(sen);
      const generic = !q.concept || ['P', 'energy', 'work'].includes(q.concept);
      if (!engineFeeds && !generic) continue;
      let role: 'in' | 'out' | null = engineFeeds ? 'in' : null;
      if (!role) {
        const dIn = nearest(IN, sen, at);
        const dOut = nearest(OUT, sen, at);
        if (dIn === Infinity && dOut === Infinity) continue;
        role = dIn < dOut ? 'in' : 'out';
      }
      q.concept = isPower ? (role === 'in' ? 'Pin' : 'Pout') : role === 'in' ? 'Ein' : 'Eout';
      q.confidence = 'high';
    }
  }
  // two refractive indices written as "(n = 1.5) … (n = 1.33)": first is medium 1, second is medium 2
  const ns = qs.filter((q) => !q.unit && (q.symbol === 'n' || q.concept === 'n1' || q.concept === 'n2') && q.value >= 1 && q.value < 4);
  if (ns.length === 2 && !/cladding|core/.test(lower)) {
    ns[0].concept = 'n1';
    ns[1].concept = 'n2';
    ns.forEach((q) => (q.confidence = 'high'));
  }
  // lever arms
  for (const q of qs) {
    if (!q.dim || q.dim.join(',') !== '1,0,0,0') continue;
    if (!/^\s*(?:m|mm|cm)?\s*from\s+the\s+(fulcrum|pivot|hinge)/i.test(text.slice(q.end, q.end + 30))) continue;
    const pre = lower.slice(Math.max(0, q.start - 70), q.start);
    const li = Math.max(pre.lastIndexOf('load'), pre.lastIndexOf('weight'));
    const ei = pre.lastIndexOf('effort');
    if (li < 0 && ei < 0) continue;
    q.concept = ei > li ? 'effortArm' : 'loadArm';
    q.confidence = 'high';
  }
}

export function interpret(text: string): Interpretation {
  const normalised = normaliseText(text);
  const lower = normalised.toLowerCase();
  const { modules, scores } = detectModules(normalised);
  const flags = detectFlags(lower);
  const notes: string[] = [];
  const ambiguities: string[] = [];
  const raw = extractQuantities(normalised);
  const special = detectSpecial(normalised, raw, modules, flags);
  // the unknown(s) named in the question must not be used to label given data
  const prelimTargets = findTargets(normalised, new Set(), modules);
  const quantities = assignConcepts(raw, normalised, prelimTargets);

  // angle of repose: an angle at which sliding starts is φ, not a general incline
  if (flags.slideOnset) {
    const angles = quantities.filter((q) => q.unit === '°');
    if (angles.length === 1 && !quantities.some((q) => q.concept === 'phi')) {
      angles[0].concept = 'phi';
      notes.push('The angle at which sliding just begins is the angle of friction φ (μ = tan φ).');
    }
  }
  applyPairRules(quantities, normalised, lower);
  const assignedSet = new Set(quantities.map((q) => q.concept).filter(Boolean) as string[]);
  const targets = findTargets(normalised, assignedSet, modules).map((t) => (flags.slideOnset && (t === 'incline' || t === 'theta') ? 'phi' : t));
  // antenna type
  if (targets.includes('antennaLength')) notes.push(flags.quarterWave ? 'Quarter-wave antenna: L = λ/4.' : 'Assuming a half-wave dipole: L = λ/2.');

  for (const q of special ? [] : quantities) {
    if (q.fromWord && !q.concept) continue; // a number word that does not label a quantity (e.g. "three resistors")
    if (!q.concept) ambiguities.push(`Could not decide what ${q.numText}${q.unit ? ' ' + q.unit : ''} represents — assign it below.`);
    else if (q.confidence === 'low') ambiguities.push(`${q.numText}${q.unit ? ' ' + q.unit : ''} was read as ${getConcept(q.concept)?.name.toLowerCase()} (low confidence) — check it.`);
  }
  if (!targets.length && special?.type === undefined) ambiguities.push('Could not identify what the question asks for — choose the unknown below.');

  const topicByModule: Record<ModuleId, string> = { civil: 'Civil Structures', transport: 'Personal & Public Transport', aero: 'Aeronautical Engineering', telecom: 'Telecommunications Engineering' };
  const interp: Interpretation = {
    text,
    normalised,
    modules,
    moduleScores: scores,
    topic: modules.length ? topicByModule[modules[0]] : 'General',
    quantities,
    targets,
    problemType: special?.type ?? 'chain',
    flags,
    notes,
    ambiguities,
    special,
  };
  if (special?.notes) notes.push(...special.notes);
  return interp;
}
