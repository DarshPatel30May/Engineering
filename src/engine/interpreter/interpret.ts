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

export type ProblemType = 'chain' | 'beam' | 'truss' | 'circuit' | 'incline' | 'logic' | 'numbase' | 'lever' | 'gear' | 'flight';

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
  telecom: ['signal', 'frequency', 'antenna', 'aerial', 'fibre', 'fiber', 'optical', 'resistor', 'resistance', 'circuit', 'voltage', 'current', 'binary', 'logic', 'gate', 'satellite', 'radio', 'decibel', 'db', 'bandwidth', 'modulation', 'transmitter', 'receiver', 'wavelength', 'refractive', 'critical angle', 'cladding', 'core', 'hexadecimal', 'truth table', 'bit', 'mbps', 'data', 'amplifier', 'ohm', 'series', 'parallel', 'mobile', 'microwave', 'dipole', 'sampling'],
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
  const modules = max === 0 ? [] : (Object.keys(scores) as ModuleId[]).filter((m) => scores[m] >= max * 0.5 && scores[m] > 0).sort((a, b) => scores[b] - scores[a]);
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

function scoreConcept(q: RawQuantity, c: Concept, textLower: string, all: RawQuantity[]): number {
  let best = 0;
  for (const kw of c.keywords) {
    for (const pos of occurrences(textLower, kw)) {
      const kEnd = pos + kw.length;
      let gap: number;
      let after = false;
      if (kEnd <= q.start) gap = q.start - kEnd;
      else if (pos >= q.end) {
        gap = pos - q.end;
        after = true;
      } else continue;
      if (gap > (after ? 30 : 90)) continue;
      const lo = after ? q.end : kEnd;
      const hi = after ? pos : q.start;
      const between = textLower.slice(lo, hi);
      // sentence boundary (a full stop not part of a decimal) between keyword and number
      if (/\.(\s|$)|\?|;/.test(between)) continue;
      const intervening = all.filter((o) => o !== q && o.start >= lo && o.end <= hi).length;
      let s = (1 + Math.min(kw.length, 30) / 8) * (1 - gap / 100) * Math.pow(0.35, intervening);
      if (after) s *= 0.75;
      best = Math.max(best, s);
    }
  }
  if (q.symbol && c.symbols?.length) {
    if (c.symbols.includes(q.symbol)) best += 4;
    else if (c.symbols.some((s) => s.toLowerCase() === q.symbol!.toLowerCase())) best += 2;
  }
  if (best > 0) best += unitBoost(q, c);
  const kind = getQuantity(c.quantity).id;
  if (DEFAULT_CONCEPT[kind] === c.id) best += 0.15;
  return best;
}

const TARGET_RE = /(calculate|determine|find|what is|what's|what was|evaluate|compute|how (?:much|far|long|fast|many)|show that|estimate|work out|state the|obtain|deduce|predict|solve for)\s+([^.?;\n]*)/gi;

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
    const parts = whole.split(/\s+and\s+(?:the\s+|its\s+)?|,\s*/).filter((p) => p.trim().length > 1);
    for (const [pi, clause] of parts.entries()) {
    let best: { id: string; score: number } | null = null;
    for (const c of CONCEPTS) {
      for (const kw of c.keywords) {
        const occ = occurrences(clause, kw);
        if (!occ.length) continue;
        let score = kw.length * 2 - occ[0] * 0.15;
        if (assigned.has(c.id)) score -= 12;
        if (modules.length && [...(CONCEPT_MODULES.get(c.id) ?? [])].some((mm) => modules.includes(mm))) score += 3;
        if (c.id === 'glideDist' && !modules.includes('aero')) score -= 20;
        if (!best || score > best.score) best = { id: c.id, score };
      }
    }
    const how = pi === 0 ? Object.keys(HOW_MAP).find((h) => verb === h || (verb + ' ' + clause).startsWith(h)) : undefined;
    if (how && (!best || best.score < 6)) {
      const opts = HOW_MAP[how];
      best = { id: modules.includes('aero') && opts.includes('glideDist') ? 'glideDist' : opts[0], score: 10 };
    }
    if (best && best.score > 4 && !targets.includes(best.id)) targets.push(best.id);
    }
  }
  return targets;
}

export function assignConcepts(quantities: RawQuantity[], norm: string): QtyAssignment[] {
  const lower = norm.toLowerCase();
  const triples: { q: RawQuantity; c: string; s: number }[] = [];
  const cands = new Map<number, Candidate[]>();
  for (const q of quantities) {
    const list = candidateConcepts(q)
      .map((c) => ({ concept: c.id, score: scoreConcept(q, c, lower, quantities) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    cands.set(q.index, list);
    list.forEach((x) => triples.push({ q, c: x.concept, s: x.score }));
  }
  triples.sort((a, b) => b.s - a.s);
  const byQ = new Map<number, string>();
  const taken = new Set<string>();
  for (const t of triples) {
    if (byQ.has(t.q.index) || taken.has(t.c)) continue;
    byQ.set(t.q.index, t.c);
    taken.add(t.c);
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
    toRest: /to rest|(comes?|brought|bring|brings) to (a )?(stop|rest|halt)|stops|to a stop|to a standstill|halts/.test(lower),
    doubleShear: /double shear/.test(lower),
    singleShear: /single shear/.test(lower),
    level: /straight and level|level flight|cruis/.test(lower),
    slideOnset: /(about|starts?|begins?|just) to slide|on the point of sliding|angle of repose|impending/.test(lower),
    halfWave: /half[- ]wave|dipole/.test(lower),
    quarterWave: /quarter[- ]wave|monopole|whip/.test(lower),
    roundTrip: /(round trip|up and back|up to .* and back|to the satellite and back|uplink and downlink|return journey)/.test(lower),
  };
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
  const quantities = assignConcepts(raw, normalised);

  // angle of repose: an angle at which sliding starts is φ, not a general incline
  if (flags.slideOnset) {
    const angles = quantities.filter((q) => q.unit === '°');
    if (angles.length === 1 && !quantities.some((q) => q.concept === 'phi')) {
      angles[0].concept = 'phi';
      notes.push('The angle at which sliding just begins is the angle of friction φ (μ = tan φ).');
    }
  }
  const assignedSet = new Set(quantities.map((q) => q.concept).filter(Boolean) as string[]);
  const targets = findTargets(normalised, assignedSet, modules);
  // antenna type
  if (targets.includes('antennaLength')) notes.push(flags.quarterWave ? 'Quarter-wave antenna: L = λ/4.' : 'Assuming a half-wave dipole: L = λ/2.');

  for (const q of quantities) {
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
