/**
 * Smart problem interpreter. Deterministic, rule-based reading of an HSC Physics question:
 * topic/module detection, particle and planet recognition (data-sheet values), quantity-to-
 * variable assignment from units + nearby wording + typed symbols, identification of the
 * unknown(s), direction words, and routing to a specialised tool where one fits better.
 */
import { CONCEPTS, Concept, getConcept } from '../concepts';
import { NESA, Particle, PARTICLES } from '../constants';
import { FORMULAS } from '../formulas';
import type { ModuleId, TopicId } from '../formulas/types';
import { TOPICS } from '../formulas/types';
import { getQuantity } from '../quantities';
import { dimEq } from '../units';
import { extractQuantities, normaliseText, RawQuantity } from './extract';

export interface Candidate {
  concept: string;
  score: number;
}

export interface QtyAssignment extends RawQuantity {
  concept: string | null;
  candidates: Candidate[];
  confidence: 'high' | 'medium' | 'low';
  ignored?: boolean;
}

/** A value the interpreter adds that is not a number in the question (particle mass, Earth data …). */
export interface ImpliedValue {
  concept: string;
  valueSI: number;
  label: string;
  source: string;
  display: string;
}

export type ProblemType =
  | 'chain' | 'projectile' | 'orbit' | 'relativity' | 'decay' | 'transition' | 'nuclearEquation' | 'binding' | 'reaction'
  | 'quarks' | 'conservation' | 'direction' | 'photoelectric';

export interface DirectionRead {
  what: 'v' | 'B' | 'E' | 'I';
  dir: string;
  frame: 'page' | 'compass';
}

export interface Interpretation {
  text: string;
  normalised: string;
  modules: ModuleId[];
  topics: TopicId[];
  topicScores: Partial<Record<TopicId, number>>;
  quantities: QtyAssignment[];
  implied: ImpliedValue[];
  particle?: Particle;
  chargeSign?: 'positive' | 'negative';
  targets: string[];
  problemType: ProblemType;
  flags: Record<string, boolean>;
  notes: string[];
  ambiguities: string[];
  directions: DirectionRead[];
  wantsDirection: boolean;
  transition?: { ni: number; nf: number };
  equation?: string;
}

// ───────────────────────── topic detection ─────────────────────────

const TOPIC_WORDS: Record<TopicId, string[]> = {
  projectile: ['projectile', 'launched', 'kicked', 'thrown', 'fired', 'cannon', 'ball', 'cliff', 'horizontally', 'range', 'maximum height', 'trajectory', 'lands', 'hits the ground', 'arrow', 'golf', 'javelin', 'shot put', 'long jump', 'basketball', 'soccer', 'football', 'angle of projection', 'above the horizontal', 'rolls off', 'time of flight'],
  circular: ['circular', 'circle', 'centripetal', 'banked', 'bend', 'corner', 'curve', 'revolution', 'rotates', 'merry-go-round', 'string', 'whirled', 'swung', 'conical pendulum', 'angular velocity', 'rpm', 'uniform circular motion', 'roundabout'],
  gravitation: ['gravitational', 'gravity', 'planet', 'earth', 'mars', 'jupiter', 'moon', 'mass of the', 'surface', 'weight', 'field strength', 'universal gravitation', 'escape velocity', 'potential energy'],
  orbital: ['orbit', 'satellite', 'geostationary', 'kepler', 'period', 'altitude', 'space station', 'iss', 'orbital', 'low earth orbit', 'moons'],
  forces: ['resultant', 'components', 'net force', 'equilibrant', 'work done', 'power', 'incline', 'ramp', 'friction'],
  torque: ['torque', 'pivot', 'lever', 'spanner', 'wrench', 'hinge', 'seesaw', 'see-saw', 'fulcrum', 'door', 'moment', 'turning'],
  efields: ['electric field', 'parallel plates', 'plates', 'potential difference', 'coulomb', 'point charge', 'charges', 'n/c', 'v/m', 'electrostatic', 'volts', 'charged sphere'],
  particles: ['electron', 'proton', 'alpha particle', 'ion', 'charged particle', 'cathode ray', 'mass spectrometer', 'velocity selector', 'cyclotron', 'accelerated through', 'deflected', 'beam', 'radius of its path', 'circular path', 'enters a uniform'],
  bfields: ['magnetic field', 'tesla', 'solenoid', 'straight wire', 'right-hand', 'magnetic force'],
  motor: ['motor', 'current-carrying', 'conductor', 'wire', 'coil', 'torque on', 'commutator', 'parallel wires', 'parallel conductors', 'back emf', 'current balance'],
  induction: ['induced', 'emf', 'flux', 'faraday', 'lenz', 'generator', 'magnet is', 'moved into', 'pulled out', 'rotated', 'eddy', 'weber', 'induction', 'alternator'],
  transformers: ['transformer', 'primary', 'secondary', 'step-up', 'step-down', 'step up', 'step down', 'transmission', 'power lines', 'turns ratio', 'power station', 'mains'],
  waves: ['wave', 'sound', 'refraction', 'refractive index', 'snell', 'critical angle', 'glass', 'water', 'prism', 'total internal reflection', 'optical fibre', 'medium'],
  interference: ['double slit', 'double-slit', 'slits', 'grating', 'fringe', 'fringes', 'interference', 'diffraction', 'young', 'lines per', 'lines/mm', 'lines/cm', 'order', 'maxima', 'minima', 'screen', 'path difference'],
  emr: ['polaris', 'polariz', 'malus', 'maxwell', 'electromagnetic wave', 'radio', 'microwave', 'x-ray', 'intensity', 'analyser', 'analyzer', 'polarising filter'],
  quantumLight: ['photon', 'planck', 'black body', 'blackbody', 'black-body', 'wien', 'peak wavelength', 'quantum', 'laser', 'photons per second', 'star', 'surface temperature'],
  photoelectric: ['photoelectric', 'work function', 'threshold', 'photoelectrons', 'photoelectron', 'stopping voltage', 'stopping potential', 'cut-off', 'ejected', 'emitted electrons', 'kmax', 'photocell', 'metal surface', 'illuminated'],
  relativity: ['relativ', 'dilation', 'contraction', 'muon', 'lorentz', 'proper time', 'proper length', 'spaceship', 'spacecraft', 'rocket', 'astronaut', 'twin', 'rest frame', 'frame of reference', 'observer on earth', 'moving clock', 'rest mass', 'rest energy', 'e = mc', 'mc2', 'mc²'],
  stars: ['hubble', 'galaxy', 'galaxies', 'redshift', 'red shift', 'blueshift', 'recession', 'expanding universe', 'age of the universe', 'sun', 'star', 'luminosity', 'fusion in', 'spectral class', 'hertzsprung', 'big bang', 'mpc', 'light-year'],
  atomic: ['bohr', 'energy level', 'hydrogen atom', 'transition', 'spectral line', 'emission spectrum', 'absorption spectrum', 'balmer', 'lyman', 'paschen', 'rydberg', 'millikan', 'oil drop', 'thomson', 'rutherford', 'ground state', 'ionisation', 'ionization', 'excited', 'n = ', 'charge-to-mass', 'charge to mass'],
  quantum: ['de broglie', 'matter wave', 'wave-particle', 'electron diffraction', 'davisson', 'germer', 'wavelength of the electron', 'wavelength of an electron', 'schrödinger', 'momentum'],
  nuclear: ['nucleus', 'nuclei', 'nuclear', 'binding energy', 'mass defect', 'fission', 'fusion', 'uranium', 'u-235', 'deuterium', 'tritium', 'reactor', 'nucleon', 'released', 'q value', 'atomic mass unit', 'mev', 'alpha decay', 'beta decay'],
  radioactivity: ['half-life', 'half life', 'decay', 'radioactive', 'activity', 'becquerel', 'isotope', 'carbon dating', 'carbon-14', 'remaining', 'radioisotope', 'sample', 'decay constant', 'undecayed'],
  standardModel: ['quark', 'lepton', 'hadron', 'baryon', 'meson', 'boson', 'neutrino', 'antiparticle', 'standard model', 'conservation of lepton', 'gluon', 'pion', 'muon neutrino'],
};

export function detectTopics(text: string): { topics: TopicId[]; scores: Partial<Record<TopicId, number>> } {
  const t = ' ' + text.toLowerCase() + ' ';
  const scores: Partial<Record<TopicId, number>> = {};
  (Object.keys(TOPIC_WORDS) as TopicId[]).forEach((tp) => {
    let s = 0;
    for (const w of TOPIC_WORDS[tp]) {
      const esc = w.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![a-z])${esc}`, 'g');
      const n = (t.match(re) ?? []).length;
      s += n * (w.includes(' ') ? 2 : 1);
    }
    if (s) scores[tp] = s;
  });
  // unit-based hints
  const add = (tp: TopicId, n: number) => (scores[tp] = (scores[tp] ?? 0) + n);
  if (/\d\s*c\b/.test(text) && /0\.\d+\s*c\b/.test(text)) add('relativity', 3);
  if (/\d\s*(?:nm)\b/.test(text)) add('quantumLight', 0.5);
  if (/\d\s*(?:eV|keV|MeV)\b/.test(text)) add('photoelectric', 0.3);
  if (/\d\s*(?:m|μ|n)?T\b/.test(text)) add('bfields', 1);
  if (/\d\s*u\b/.test(text)) add('nuclear', 2);
  if (/\d\s*(?:Bq|kBq|MBq)\b/.test(text)) add('radioactivity', 2);
  if (/km\/s\/Mpc|Mpc/.test(text)) add('stars', 3);
  if (/\d\s*Wb\b/.test(text)) add('induction', 2);
  if (/(?:^|\W)n\s*=\s*\d+.*(?:to|→|->)\s*n\s*=\s*\d+/i.test(text)) add('atomic', 4);
  const max = Math.max(0, ...Object.values(scores));
  const topics = max === 0 ? [] : (Object.keys(scores) as TopicId[]).filter((k) => scores[k]! >= max * 0.45).sort((a, b) => scores[b]! - scores[a]!);
  return { topics, scores };
}

// ───────────────────────── quantity → concept ─────────────────────────

/** Concepts used by formulas in each topic. */
const TOPIC_CONCEPTS = (() => {
  const map = new Map<TopicId, Set<string>>();
  for (const f of FORMULAS) {
    for (const tp of [f.topic, ...(f.alsoIn ?? [])]) {
      if (!map.has(tp)) map.set(tp, new Set());
      f.vars.forEach((v) => map.get(tp)!.add(v.concept));
    }
  }
  return map;
})();

function occurrences(textLower: string, kw: string): number[] {
  const out: number[] = [];
  const esc = kw.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![a-z])${esc}(?:s|es|ed|ing)?(?![a-z])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(textLower))) out.push(m.index);
  return out;
}

function candidateConcepts(q: RawQuantity): Concept[] {
  const dimless = (c: Concept) => ['ratio', 'percent', 'count', 'dimensionless', 'amount'].includes(getQuantity(c.quantity).id);
  if (!q.unit) return CONCEPTS.filter(dimless);
  if (q.unit === '%') return CONCEPTS.filter((c) => ['ratio', 'percent', 'amount'].includes(getQuantity(c.quantity).id));
  if (q.unit === '°') return CONCEPTS.filter((c) => getQuantity(c.quantity).angle);
  if (/^(turns|loops|windings|lines|slits|nuclei|atoms|particles|photons|electrons|decays|counts)$/.test(q.unit)) return CONCEPTS.filter((c) => ['count', 'amount', 'ratio'].includes(getQuantity(c.quantity).id));
  return CONCEPTS.filter((c) => {
    const k = getQuantity(c.quantity);
    if (k.angle) return false;
    if (k.anyUnit) return true;
    return q.dim !== null && dimEq(k.dim, q.dim);
  });
}

function candidatesFor(q: RawQuantity, topics: TopicId[]): Concept[] {
  const list = candidateConcepts(q);
  if (topics.includes('radioactivity')) return list;
  return list.filter((c) => !getQuantity(c.quantity).anyUnit);
}

const DEFAULT_CONCEPT: Record<string, string> = {
  force: 'F', mass: 'm', time: 't', longTime: 'tHalf', velocity: 'v', acceleration: 'a', gfield: 'g', area: 'A', energy: 'E', energyAtomic: 'Eph', energyNuclear: 'Enuc',
  power: 'P', voltage: 'V', current: 'I', resistance: 'R', frequency: 'f', charge: 'q', efield: 'Ef', bfield: 'B', flux: 'Phi', wavelength: 'lambda', length: 'r',
  temperature: 'Temp', momentum: 'p', torque: 'tau', angularVelocity: 'omega', activity: 'Act', hubble: 'H0', lineDensity: 'Nlines', decayConst: 'lambdaD', intensity: 'Iint', forcePerLength: 'Fl', chargeToMass: 'qm', astroDistance: 'Dgal', atomicMass: 'dm',
};

function unitBoost(q: RawQuantity, c: Concept, topics: TopicId[]): number {
  const u = q.unit;
  const has = (t: TopicId) => topics.includes(t);
  let b = 0;
  if (/eV$/.test(u)) b += ['Kmax', 'phi', 'Eph', 'En', 'Ei', 'Ef_level', 'Enuc', 'K', 'BEperA', 'Etot'].includes(c.id) ? 0.4 : c.id === 'E' ? 0 : -0.4;
  if (u === 'u' || /MeV\/c/.test(u)) b += ['dm', 'mAtom', 'm'].includes(c.id) ? 0.3 : 0;
  if (u === 'c' && has('relativity')) b += c.id === 'v' ? 0.6 : 0;
  if (/nm$|pm$|Å/.test(u)) b += ['lambda', 'lambdaMax', 'lambda0', 'lambdaN', 'dLambda', 'lambdaRest'].includes(c.id) ? 0.6 : -0.3;
  if (/Mpc|ly|pc$/.test(u)) b += c.id === 'Dgal' ? 1 : 0;
  if (/years?|y$|yr|days?|Gyr|Myr/.test(u)) b += ['tHalf', 't', 'tAge'].includes(c.id) ? 0.2 : 0;
  if (/^(turns|loops|windings)$/.test(u)) b += ['N', 'Np', 'Ns'].includes(c.id) ? 1.5 : -1;
  if (/^(lines|slits)/.test(u)) b += c.id === 'Nlines' ? 1.5 : -1;
  if (/^(nuclei|atoms)$/.test(u)) b += ['N0', 'Nt', 'nReact', 'Nnuclei'].includes(c.id) ? 0.8 : -1;
  if (/^(photons)$/.test(u)) b += c.id === 'photonRate' ? 1 : -1;
  if (/^(electrons)$/.test(u)) b += c.id === 'nCharges' ? 1 : -1;
  if (/Bq$/.test(u)) b += ['Act', 'N0', 'Nt'].includes(c.id) ? 0.4 : 0;
  if (/°C|degC/.test(u) || u === 'K') b += c.id === 'Temp' ? 0.5 : 0;
  if (u === 'rpm' || u === 'rev/s') b += c.id === 'omega' ? 0.5 : c.id === 'f' ? 0.3 : 0;
  return b;
}

/** Concepts only plausible when certain wording is present. */
const CONTEXT_REQUIRED: Record<string, RegExp> = {
  M: /planet|earth|sun|star|moon|mars|jupiter|central|orbit|gravit|galaxy|black hole|saturn|venus|mercury|neptune|uranus/,
  Rp: /planet|earth|sun|star|moon|mars|jupiter|radius of|surface/,
  hAlt: /altitude|above|height|orbit/,
  hDrop: /cliff|building|table|height|high|tall|above the ground|dropped|falls|tower|bench|bridge|balcony|roof|platform|drop/,
  Vp: /primary|transformer|input/, Vs: /secondary|transformer|output|steps|stepped/, Np: /primary|transformer/, Ns: /secondary|transformer/, Ip: /primary|transformer/, Is: /secondary|transformer/,
  Pp: /transformer|input|primary/, Ps: /transformer|output|secondary/,
  Vstop: /stopping|cut-off|retarding|reverse/, emf: /emf|e\.m\.f|induc|generat|electromotive/, emfBack: /back/,
  t0: /proper|lifetime|own frame|rest frame|on board|onboard|ship|astronaut|traveller|traveler|muon|pion|particle|spacecraft|rocket|measured by the|clock/,
  tDil: /earth|observer|stationary|dilat|laboratory|lab frame|ground/,
  L0: /proper|rest|at rest|length|spaceship|ship|rocket|atmosphere|distance/,
  Lc: /contract|observed|measured by|appear/,
  tHalf: /half/, lambdaD: /decay constant|disintegration constant/, N0: /initial|original|sample|start|fresh|living|begin/, Nt: /remain|left|undecayed|still|now|drops|falls|reduced|decreased|measured/,
  phi: /work function/, f0: /threshold|cut-off|cutoff|minimum frequency/, lambda0: /threshold|cut-off|cutoff|maximum wavelength|longest wavelength/,
  Kmax: /photo|kinetic|kmax|ejected|emitted electron|energetic/, lambdaMax: /peak|maximum intensity|wien|black|λmax|most intense|emits most/,
  H0: /hubble/, vRec: /reced|recession|moving away|galaxy|redshift/, Dgal: /galaxy|distance|mpc|light-year|ly/,
  dSlit: /slit|grating|separation|spacing/, Lscreen: /screen/, yFringe: /fringe|maximum|band|spot|screen/, dyFringe: /fringe|spacing|separation|adjacent|successive/, Nlines: /lines|grating/,
  thetaPol: /polari|analy|malus/, Imax: /intensit/, Iint: /intensit/, n1: /refractive|index/, n2: /refractive|index/, n: /refractive|index/,
  theta1: /incid|strike/, theta2: /refract/, thetaC: /critical/, thetaBank: /bank|incline|slope|ramp|vertical|string|pendulum/,
  thetaL: /launch|project|kick|thrown|fire|horizontal|elevation|hit|shot/, thetaT: /spanner|wrench|lever|handle|door|bar|pivot|torque/,
  thetaN: /normal|coil|loop|flux|plane/, thetaB: /field|magnetic/, thetaIB: /wire|conductor|rod/, thetaFs: /pulled|pushed|work|drag|rope|handle/,
  rWire: /wire|conductor|cable/, lw: /wire|conductor|rod|length|side|metre|meter/, dPlate: /plate|separat|apart|gap/, rArm: /pivot|hinge|axis|axle|spanner|wrench|lever|door|fulcrum|handle|centre of rotation/,
  Ploss: /loss|lost|heat/, eta: /efficien/, R: /resist|ohm|Ω/, qm: /charge.to.mass|q\/m|e\/m/, nCharges: /electron|excess|charge/, En: /level|state|energy of/, gamma: /lorentz|gamma|γ/,
  Anuc: /mass number|nucleon/, BEperA: /per nucleon/, dm: /defect|mass difference|mass lost|loss of mass|converted/, mAtom: /atomic mass|mass of one|nuclear mass|mass of a nucleus|mass of the nucleus|nucleus has/,
  Temp: /temperat|kelvin|hot|°c|degc|k\b/, photonRate: /photon/, mu: /friction|coefficient/, tension: /tension|string|rope|cable/, tFlight: /flight|air|land|ground|hit/, H: /maximum height|highest|peak|max/, tPeak: /maximum height|highest|top|peak/,
  Rstar: /star/, tAge: /age/, Wt: /weight|weighs/, dh: /height|raised|lifted/, dU: /potential/, Ug: /potential/, dUg: /potential/, Eorb: /total/, dEorb: /move|raise|transfer|higher orbit/, vesc: /escape/,
  q1: /charge/, q2: /charge/, qSource: /charge/, I1: /current|wire/, I2: /current|wire/, T1: /period|orbit/, T2: /period|orbit/, r1: /orbit|radius|initial|lower/, r2: /orbit|radius|final|higher|new/,
  Fl: /per unit length|per metre|per meter/, Lsol: /solenoid/, emfPeak: /peak|maximum/, Vsupply: /supply/, pathDiff: /path difference/, mOrder: /order|fringe|maximum|maxima/, mMax: /maximum order|highest order|how many/,
  nReact: /fission|fusion|reaction|nuclei|atoms/, mSample: /sample|fuel|kilogram|kg of/, Act: /activity|becquerel|decays|count/, Nnuclei: /nuclei/, lambdaRest: /laboratory|rest|emitted/, dLambda: /shift/,
  Iint1: /intensit/, Iint2: /intensit/, dI1: /intensit/, dI2: /intensit/, Fpar: /slope|incline|ramp/, Fx: /component|horizontal/, Fy: /component|vertical/,
  rPerp: /perpendicular distance/, cPred: /maxwell/, ux: /horizontal/, uy: /vertical/, vx: /horizontal/, vy: /vertical/, sx: /horizontal|range|from the base|from the foot|lands|far/, sy: /vertical|below|above/,
  me: /electron/, K: /kinetic/, eCharge: /elementary/, Etot: /total energy/, PhiI: /initial/, PhiF: /final/, dPhi: /change/,
};

function scoreConcept(q: RawQuantity, c: Concept, textLower: string, all: RawQuantity[], topics: TopicId[]): number {
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
      if (gap > (after ? 36 : 90)) continue;
      const lo = after ? q.end : kEnd;
      const hi = after ? pos : q.start;
      const between = textLower.slice(lo, hi);
      if (/\.(\s|$)|\?|;/.test(between)) continue;
      const intervening = all.filter((o) => o !== q && o.start >= lo && o.end <= hi).length;
      let s = (1 + Math.min(kw.length, 30) / 8) * (1 - gap / 110) * Math.pow(0.35, intervening);
      if (after) s *= 0.8;
      best = Math.max(best, s);
    }
  }
  if (q.symbol && c.symbols?.length) {
    const sym = q.symbol;
    if (c.symbols.includes(sym)) best += 4;
    else if (c.symbols.some((s) => s.toLowerCase() === sym.toLowerCase())) best += 1.5;
  }
  best += unitBoost(q, c, topics);
  const req = CONTEXT_REQUIRED[c.id];
  if (req && !req.test(textLower)) best *= 0.25;
  // topic context
  if (topics.length) {
    const inTopic = topics.some((t, i) => TOPIC_CONCEPTS.get(t)?.has(c.id) && (i < 2 || true));
    best += inTopic ? 0.3 : -0.3;
    if (topics[0] && TOPIC_CONCEPTS.get(topics[0])?.has(c.id)) best += 0.15;
  }
  const kind = getQuantity(c.quantity).id;
  if (DEFAULT_CONCEPT[kind] === c.id) best += 0.12;
  return best;
}

// ───────────────────────── targets ─────────────────────────

const TARGET_RE = /(calculate|determine|find|what is|what's|what was|what are|what will|what would|evaluate|compute|how (?:much|far|long|fast|many|high|much time)|show that|estimate|work out|obtain|deduce|predict|solve for|state the|quantify|by how much|how does .* compare|what fraction|what percentage|what|which)\s*([^.?;\n]*)/gi;

const HOW_MAP: Record<string, string> = { 'how far': 's', 'how long': 't', 'how fast': 'v', 'how high': 'H', 'how much time': 't', 'how many': 'N' };

/** Specific phrase → concept rules checked before the generic keyword search. */
const TARGET_PHRASES: [RegExp, string, RegExp?][] = [
  [/binding energy per nucleon/, 'BEperA'],
  [/binding energy|energy released|energy liberated|energy produced by (?:the|this|each) (?:reaction|fission|fusion)|q[- ]value/, 'Enuc', /nuclear|fission|fusion|nucle|binding|reaction|decay|mev|\bu\b/],
  [/mass defect/, 'dm'],
  [/work function/, 'phi'],
  [/threshold frequency|cut-?off frequency|minimum frequency/, 'f0'],
  [/threshold wavelength|longest wavelength|maximum wavelength|cut-?off wavelength/, 'lambda0'],
  [/stopping (?:voltage|potential)|cut-?off voltage/, 'Vstop'],
  [/maximum kinetic energy|kinetic energy of the (?:fastest|most energetic|emitted|ejected|photo)|kmax/, 'Kmax'],
  [/(?:maximum )?(?:speed|velocity) of the (?:fastest |emitted |ejected )?photoelectrons?/, 'v'],
  [/peak wavelength|wavelength (?:of|at) (?:maximum|peak)|λ ?max/, 'lambdaMax'],
  [/(?:surface )?temperature/, 'Temp'],
  [/de broglie wavelength|wavelength of (?:the|an|a) (?:electron|proton|neutron|particle|alpha)/, 'lambda'],
  [/(?:energy|frequency|wavelength) of (?:the|a|each|one) photon/, 'Eph'],
  [/photon energy|energy of (?:the )?(?:emitted|absorbed) photon|energy of the photons/, 'Eph'],
  [/number of photons|photons (?:per|each) second/, 'photonRate'],
  [/lorentz factor|γ|gamma factor/, 'gamma'],
  [/proper time|lifetime (?:in|measured in) (?:its|the muon's|the particle's) (?:own|rest) frame/, 't0'],
  [/(?:lifetime|time)[^,]*(?:measured|observed|as seen) (?:by|from|on) (?:an? )?(?:observer|earth|the ground|a stationary|the laboratory|someone)/, 'tDil'],
  [/proper length/, 'L0'],
  [/(?:length|distance)[^,]*(?:measured|observed|as seen) (?:by|from|in) (?:an? |the )?(?:observer|earth|muon|spaceship|astronaut|particle)/, 'Lc'],
  [/relativistic momentum|momentum/, 'p'],
  [/rest energy|energy equivalent|equivalent energy/, 'E'],
  [/half-?life/, 'tHalf'],
  [/decay constant/, 'lambdaD'],
  [/activity/, 'Act', /bq|becquerel|activity/],
  [/(?:mass|amount|number|fraction|percentage|proportion)[^,]*(?:remain|left|undecayed)|(?:how much|what mass)[^,]*(?:remain|left)|remaining/, 'Nt'],
  [/initial (?:mass|activity|amount|number)|original (?:mass|activity|amount)/, 'N0'],
  [/age of the universe/, 'tAge'],
  [/hubble constant/, 'H0'],
  [/recession(?:al)? (?:velocity|speed)|(?:speed|velocity) (?:at which|with which)[^,]*reced/, 'vRec'],
  [/distance to (?:the )?galaxy|how far away/, 'Dgal', /galaxy|hubble|mpc/],
  [/(?:number of )?(?:excess )?electrons (?:on|gained|lost)|how many electrons|number of electrons/, 'nCharges'],
  [/charge.to.mass|q\/m|e\/m|specific charge/, 'qm'],
  [/charge on the (?:oil )?drop|charge of the drop|charge on the (?:sphere|particle|ion|object)/, 'q'],
  [/energy (?:of|in) (?:the )?(?:level|state|n ?=)|energy of the electron in/, 'En'],
  [/principal quantum number|which (?:energy )?level|initial (?:energy )?level|value of n/, 'ni'],
  [/escape (?:velocity|speed)/, 'vesc'],
  [/orbital (?:velocity|speed)|speed of the satellite|(?:speed|velocity) (?:of|at which) (?:the )?(?:satellite|moon|planet|space station|iss)/, 'v'],
  [/orbital radius|radius of (?:the |its )?orbit/, 'r'],
  [/(?:orbital )?period|time (?:taken )?(?:for|to (?:complete|make)) (?:one|each|a) (?:complete )?(?:orbit|revolution|rotation)/, 'T'],
  [/altitude|height above (?:the )?(?:surface|earth|planet)/, 'hAlt', /orbit|satellite|planet|earth|surface/],
  [/gravitational field strength|acceleration due to gravity|value of g|surface gravity/, 'g'],
  [/gravitational potential energy|potential energy/, 'Ug', /orbit|satellite|planet|gm|centre|infinity|gravitational/],
  [/change in (?:gravitational )?potential energy|increase in (?:gravitational )?potential energy/, 'dUg'],
  [/(?:total|mechanical) energy/, 'Eorb', /orbit|satellite/],
  [/energy (?:required|needed) to (?:move|raise|transfer|lift)/, 'dEorb', /orbit/],
  [/mass of (?:the )?(?:earth|planet|sun|star|jupiter|mars|central|moon|black hole|saturn|galaxy)/, 'M'],
  [/time of flight|how long (?:is|was|will) (?:it|the \w+) (?:in the air|in flight)|time (?:taken )?to (?:hit|reach|land on) the ground|time to land/, 'tFlight'],
  [/maximum height|highest point|how high/, 'H'],
  [/range|horizontal distance|horizontal displacement|how far from the (?:base|foot|edge)|how far (?:from|along)/, 'sx', /projectile|launch|kick|thrown|fired|cliff|horizontal|ball|land/],
  [/(?:speed|velocity) (?:with which|at which|when) it (?:hits|strikes|lands|reaches the ground)|impact (?:speed|velocity)|final velocity/, 'v', /projectile|ground|cliff|hit|land/],
  [/vertical (?:component of (?:the )?)?velocity|vertical component/, 'vy'],
  [/horizontal (?:component of (?:the )?)?velocity|horizontal component/, 'ux'],
  [/time (?:taken )?to reach (?:the |its )?(?:maximum height|highest point|top)/, 'tPeak'],
  [/banking angle|angle (?:of|at which) (?:the )?(?:track|road|curve) (?:is|should be) banked|angle of bank/, 'thetaBank'],
  [/centripetal acceleration/, 'a'],
  [/centripetal force|tension in the string|friction (?:force )?(?:needed|required)|force (?:needed|required) to keep/, 'F'],
  [/angular (?:velocity|speed)/, 'omega'],
  [/torque/, 'tau'],
  [/induced emf|average emf|emf induced|magnitude of the emf|emf/, 'emf', /emf|induc|generat|flux|coil|magnet|electromotive/],
  [/(?:change in |magnetic )?flux(?! density)/, 'Phi', /flux/],
  [/induced current|current induced/, 'I'],
  [/back emf/, 'emfBack'],
  [/secondary (?:voltage|coil voltage)|output voltage|voltage (?:across|in|of) the secondary/, 'Vs'],
  [/primary (?:voltage)|input voltage|voltage (?:across|in|of) the primary/, 'Vp'],
  [/secondary current|current (?:in|through|drawn from) the secondary|output current/, 'Is'],
  [/primary current|current (?:in|through|drawn by|drawn from|in) the primary|input current|current drawn/, 'Ip', /transformer|primary/],
  [/(?:number of )?turns (?:on|in) the secondary|secondary turns/, 'Ns'],
  [/(?:number of )?turns (?:on|in) the primary|primary turns/, 'Np'],
  [/efficiency/, 'eta'],
  [/power (?:loss|lost)|lost as heat|energy lost per second/, 'Ploss'],
  [/current in the (?:transmission )?(?:lines|cables|wires)|transmission current/, 'I', /transmission|lines|cables/],
  [/force per (?:unit )?(?:length|metre|meter)|force on each (?:metre|meter)/, 'Fl'],
  [/electric field (?:strength)?|field strength between/, 'Ef', /electric|plates|charge|v\/m|n\/c/],
  [/magnetic field (?:strength)?|flux density|strength of the magnetic field/, 'B'],
  [/radius (?:of (?:the |its )?(?:circular )?path|of curvature|of the circle|of its motion)/, 'r'],
  [/(?:magnitude of the )?(?:magnetic |electric |electrostatic |gravitational |net |resultant )?force/, 'F'],
  [/weight/, 'Wt'],
  [/acceleration/, 'a'],
  [/kinetic energy/, 'K'],
  [/work done|work/, 'Wk'],
  [/(?:potential difference|voltage)/, 'V'],
  [/angle of refraction|refracted angle/, 'theta2'],
  [/angle of incidence/, 'theta1'],
  [/critical angle/, 'thetaC'],
  [/refractive index|index of refraction/, 'n'],
  [/slit separation|separation of the slits|grating spacing|spacing of the (?:slits|lines)|distance between (?:the )?(?:slits|lines)/, 'dSlit'],
  [/fringe (?:spacing|separation)|(?:spacing|distance|separation) between (?:adjacent |successive |the )?(?:bright )?fringes/, 'dyFringe'],
  [/(?:highest|maximum) order|number of (?:orders|maxima)|how many (?:orders|maxima|bright)/, 'mMax'],
  [/angle (?:of|at which|to) the (?:first|second|third|\d+(?:st|nd|rd|th))[- ]order|angle of (?:diffraction|the maximum)|diffraction angle/, 'thetaM'],
  [/transmitted intensity|intensity (?:of the light )?(?:transmitted|emerging|after|passing)/, 'Iint'],
  [/speed of light in|speed in (?:the )?(?:glass|water|medium|diamond|perspex|oil)/, 'v'],
  [/wavelength/, 'lambda'],
  [/frequency/, 'f'],
  [/speed|velocity/, 'v'],
  [/distance|displacement/, 's'],
  [/time|how long/, 't'],
  [/mass/, 'm'],
  [/charge/, 'q'],
  [/current/, 'I'],
  [/resistance/, 'R'],
  [/power|luminosity/, 'P'],
  [/energy/, 'E'],
  [/radius/, 'r'],
  [/period/, 'T'],
];

export function findTargets(norm: string, topics: TopicId[]): string[] {
  const lower = norm.toLowerCase();
  const targets: string[] = [];
  TARGET_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TARGET_RE.exec(lower))) {
    const verb = m[1];
    const whole = m[2].split(/\b(?:if|given that|given|when it is|using|assuming|where|with a|required for|in terms of)\b/)[0];
    for (const [k, v] of Object.entries(HOW_MAP)) {
      if (verb.startsWith(k)) {
        let c = v;
        if (k === 'how long' && topics.includes('projectile')) c = /hit|land|ground|air|flight/.test(whole) ? 'tFlight' : 't';
        if (k === 'how long' && topics.includes('radioactivity')) c = 't';
        if (k === 'how long' && topics.includes('relativity')) c = /earth|observer/.test(whole) ? 'tDil' : 't0';
        if (k === 'how far' && topics.includes('projectile')) c = 'sx';
        if (k === 'how many') c = /turns/.test(whole) ? (/secondary/.test(whole) ? 'Ns' : /primary/.test(whole) ? 'Np' : 'N') : /electron/.test(whole) ? 'nCharges' : /photon/.test(whole) ? 'photonRate' : /half/.test(whole) ? 'nHalf' : /order|maxima|fringes/.test(whole) ? 'mMax' : /fission|reaction|nuclei|atoms/.test(whole) ? 'nReact' : 'N';
        if (!targets.includes(c)) targets.push(c);
      }
    }
    const parts = whole.split(/\s+and\s+(?:the\s+|its\s+|hence\s+)?|,\s*(?:and\s+)?|\bthen\b|\bhence\b/).filter((p) => p.trim().length > 1);
    for (const clause of parts) {
      // choose the phrase that appears EARLIEST in the clause (the object of the verb);
      // ties go to the longer (more specific) match, then to list order
      let pick: { concept: string; pos: number; len: number; order: number } | null = null;
      TARGET_PHRASES.forEach(([re, concept, ctx], order) => {
        const mm = new RegExp(re.source, 'i').exec(clause);
        if (!mm) return;
        if (ctx && !ctx.test(lower)) return;
        const cand = { concept, pos: mm.index, len: mm[0].length, order };
        if (!pick || cand.pos < pick.pos || (cand.pos === pick.pos && (cand.len > pick.len || (cand.len === pick.len && cand.order < pick.order)))) pick = cand;
      });
      if (!pick) continue;
      let c = (pick as { concept: string }).concept;
      // context-specific refinements
      if (c === 'v' && topics.includes('stars') && /reced|galaxy/.test(lower)) c = 'vRec';
      if (c === 't' && topics.includes('projectile')) c = /maximum height|highest|top|peak/.test(clause) ? 'tPeak' : /air|flight|land|ground|hit/.test(clause) ? 'tFlight' : 't';
      if (c === 't' && topics.includes('relativity')) c = /earth|observer|stationary|ground|laboratory/.test(clause) ? 'tDil' : 't0';
      if (c === 't' && topics.includes('stars') && /age/.test(clause)) c = 'tAge';
      if (c === 'lambda' && (topics[0] === 'quantumLight' || topics.includes('stars')) && /peak|maximum/.test(clause)) c = 'lambdaMax';
      if (c === 'E' && !/rest energy|energy equivalent|equivalent energy/.test(clause) && (topics.includes('quantumLight') || topics.includes('photoelectric') || topics.includes('atomic')) && /photon|emitted|absorbed|transition|light/.test(lower)) c = 'Eph';
      if (c === 'E' && topics.includes('nuclear') && !/rest energy|energy equivalent|equivalent energy/.test(clause)) c = 'Enuc';
      if (c === 'K' && topics.includes('photoelectric')) c = 'Kmax';
      if (c === 'V' && topics.includes('photoelectric')) c = 'Vstop';
      if (c === 'V' && topics.includes('transformers')) c = /secondary|output/.test(clause) ? 'Vs' : /primary|input/.test(clause) ? 'Vp' : 'V';
      if (c === 'V' && topics.includes('induction') && /induc|emf/.test(lower)) c = 'emf';
      if (c === 's' && topics.includes('projectile')) c = /vertical|height|below|drop/.test(clause) ? 'sy' : 'sx';
      if (c === 'r' && topics.includes('orbital') && /altitude|above/.test(clause)) c = 'hAlt';
      if (c === 'm' && /planet|earth|sun|star|jupiter|mars|moon|central/.test(clause) && !/loses|lost|converted/.test(clause + lower)) c = 'M';
      if (c === 'm' && topics.includes('nuclear') && /defect|lost|converted/.test(clause)) c = 'dm';
      if (c === 'Ef' && topics.includes('gravitation') && !/electric/.test(clause)) c = 'g';
      if (c === 'F' && /weight/.test(clause)) c = 'Wt';
      if (c === 'ux' && /force/.test(clause + ' ' + lower) && !/velocity|speed|launch|projectile/.test(clause)) c = 'Fx';
      if (c === 'vy' && /force/.test(clause + ' ' + lower) && !/velocity|speed|launch|projectile/.test(clause)) c = 'Fy';
      if (c === 'Nt' && topics.includes('radioactivity') === false && !/decay|half|radio/.test(lower)) continue;
      if (!targets.includes(c)) targets.push(c);
    }
  }
  return targets;
}

// ───────────────────────── particles, planets, directions ─────────────────────────

function detectParticle(lower: string): Particle | undefined {
  let best: { p: Particle; pos: number } | undefined;
  for (const p of PARTICLES) {
    for (const w of p.words) {
      const pos = occurrences(lower, w)[0];
      if (pos !== undefined && (!best || pos < best.pos)) best = { p, pos };
    }
  }
  // "photoelectrons" are electrons
  if (!best && /photoelectron/.test(lower)) best = { p: PARTICLES.find((x) => x.id === 'electron')!, pos: 0 };
  return best?.p;
}

const DIR_WORDS = '(east|west|north|south|to the right|to the left|right|left|up the page|down the page|upwards|downwards|vertically upwards?|vertically downwards?|into the page|out of the page|into the screen|out of the screen)';

export function detectDirections(lower: string): DirectionRead[] {
  const out: DirectionRead[] = [];
  const re = new RegExp(`([a-z ]{0,60}?)\\b${DIR_WORDS}`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower))) {
    const before = lower.slice(Math.max(0, m.index - 70), m.index + m[1].length);
    let what: DirectionRead['what'] | null = null;
    if (/(magnetic field|field of|b field|tesla|\bb\b)[^.]*$/.test(before) && !/electric field[^.]*$/.test(before)) what = 'B';
    else if (/electric field[^.]*$/.test(before)) what = 'E';
    else if (/(current|conventional current)[^.]*$/.test(before)) what = 'I';
    else if (/(moving|travell?ing|travels|moves|velocity|projected|fired|enters|heading|directed|electron|proton|particle|beam|ion)[^.]*$/.test(before)) what = 'v';
    if (!what) continue;
    let dir = m[2].replace(/^to the /, '').replace(/^vertically upwards?$/, 'vertically up').replace(/^vertically downwards?$/, 'vertically down').replace('screen', 'page');
    const compass = /east|west|north|south|vertically/.test(dir);
    if (dir === 'upwards') dir = 'up';
    if (dir === 'downwards') dir = 'down';
    if (!out.some((o) => o.what === what)) out.push({ what, dir, frame: compass ? 'compass' : 'page' });
  }
  const anyCompass = out.some((o) => o.frame === 'compass');
  if (anyCompass) out.forEach((o) => { if (o.dir === 'up') o.dir = 'vertically up'; if (o.dir === 'down') o.dir = 'vertically down'; o.frame = 'compass'; });
  return out;
}

/** [base concept, numbered pair, required wording] */
const PAIRS: [string, [string, string], RegExp][] = [
  ['Vp', ['Vp', 'Vs'], /transformer|step/],
  ['V', ['Vp', 'Vs'], /transformer|step-?(?:up|down)/],
  ['Vs', ['Vp', 'Vs'], /transformer|step/],
  ['I', ['I1', 'I2'], /parallel|two (?:long )?(?:straight )?(?:wires|conductors|cables)|each other|wires/],
  ['q', ['q1', 'q2'], /two (?:point )?charges|between (?:the )?(?:two )?(?:charges|spheres|particles)|charges of|and a charge|charged spheres/],
  ['m', ['M', 'm'], /between|attract|gravitational force/],
  ['r', ['r1', 'r2'], /two (?:satellites|moons|planets|orbits)|kepler|another (?:moon|satellite|planet)|from an orbit|to an orbit|moves from|raised from|higher orbit|lower orbit|new orbit/],
  ['T', ['T1', 'T2'], /two (?:satellites|moons|planets|orbits)|kepler|another (?:moon|satellite|planet)/],
  ['Iint', ['Iint1', 'Iint2'], /inverse square|distance from (?:the )?(?:source|lamp|bulb|star)/],
];

const ORDINALS: Record<string, number> = { zeroth: 0, central: 0, first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5 };

// ───────────────────────── main ─────────────────────────

export function interpret(text: string): Interpretation {
  const normalised = normaliseText(text);
  const lower = normalised.toLowerCase();
  const { topics, scores } = detectTopics(normalised);
  const modules = [...new Set(topics.map((t) => TOPICS.find((x) => x.id === t)!.module))];
  const raw = extractQuantities(normalised);
  const notes: string[] = [];
  const ambiguities: string[] = [];
  const flags: Record<string, boolean> = {};
  const implied: ImpliedValue[] = [];

  // Hydrogen transition "n = 3 to n = 2"
  let transition: Interpretation['transition'];
  const tm = /n\s*=\s*(\d+)\s*(?:to|→|->|and|down to|into)\s*(?:the\s*)?n\s*=\s*(\d+)/i.exec(normalised) ?? /from (?:the )?(\w+) (?:energy )?level to (?:the )?(\w+) (?:energy )?level/i.exec(lower);
  if (tm) {
    const words: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, ground: 1 };
    const a = parseInt(tm[1], 10) || words[tm[1]];
    const b = parseInt(tm[2], 10) || words[tm[2]];
    if (a && b) transition = { ni: a, nf: b };
  }

  const quantities: QtyAssignment[] = raw.map((q) => {
    const cands = candidatesFor(q, topics)
      .map((c) => ({ concept: c.id, score: scoreConcept(q, c, lower, raw, topics) }))
      .sort((a, b) => b.score - a.score);
    return { ...q, concept: null, candidates: cands.slice(0, 6), confidence: 'low' as const };
  });

  const used = new Set<string>();
  const done = new Set<number>();
  // pairs of like quantities (two currents, two charges, two masses …) → numbered concepts
  for (const [base, pair, ctx] of PAIRS) {
    if (!ctx.test(lower) || !topics.some((t) => TOPIC_CONCEPTS.get(t)?.has(pair[0]))) continue;
    const idx = quantities.map((q, i) => ({ q, i })).filter(({ q, i }) => !done.has(i) && (q.candidates[0]?.concept === base || (pair.includes(q.candidates[0]?.concept ?? '') && pair.includes(base))) && !(q.symbol && getConcept(base)?.symbols?.includes(q.symbol) && quantities.filter((o) => o.candidates[0]?.concept === base).length === 1));
    if (idx.length !== 2) continue;
    idx.forEach(({ q, i }, k) => {
      q.concept = pair[k];
      q.confidence = 'medium';
      used.add(pair[k]);
      done.add(i);
    });
  }
  // "each carrying a current of 1.0 A" → both currents equal
  const each = /each (?:carry|carrying|carries|with|has|having|of)[^.]*?(\d)/.exec(lower);
  if (each) {
    for (const [base, pair, ctx] of PAIRS) {
      if (!ctx.test(lower) || !topics.some((t) => TOPIC_CONCEPTS.get(t)?.has(pair[0]))) continue;
      const one = quantities.filter((q, i) => !done.has(i) && q.candidates[0]?.concept === base);
      if (one.length === 1) {
        const qi = quantities.indexOf(one[0]);
        one[0].concept = pair[0];
        one[0].confidence = 'medium';
        used.add(pair[0]);
        done.add(qi);
        const dup: QtyAssignment = { ...one[0], concept: pair[1], index: quantities.length };
        quantities.push(dup);
        used.add(pair[1]);
        done.add(quantities.length - 1);
        notes.push(`"each" — both ${getConcept(pair[0])?.name.toLowerCase()} and ${getConcept(pair[1])?.name.toLowerCase()} are ${one[0].numText} ${one[0].unit}.`);
      }
    }
  }
  // greedy assignment: best-scoring (quantity, concept) pairs first, no concept used twice
  const pairs: { qi: number; concept: string; score: number }[] = [];
  quantities.forEach((q, qi) => q.candidates.forEach((c) => pairs.push({ qi, concept: c.concept, score: c.score })));
  pairs.sort((a, b) => b.score - a.score);
  for (const p of pairs) {
    if (done.has(p.qi) || used.has(p.concept)) continue;
    if (p.score < 0.05) continue;
    const q = quantities[p.qi];
    q.concept = p.concept;
    q.confidence = p.score > 2 ? 'high' : p.score > 0.9 ? 'medium' : 'low';
    used.add(p.concept);
    done.add(p.qi);
  }
  // transition quantum numbers are handled by the tool
  if (transition) for (const q of quantities) if (!q.unit && (q.value === transition.ni || q.value === transition.nf) && q.symbol === 'n') q.ignored = true;
  for (const q of quantities) {
    if (!q.concept && !q.ignored) ambiguities.push(`Could not tell what "${q.numText}${q.unit ? ' ' + q.unit : ''}" represents — assign it in the Interpretation panel.`);
    else if (q.confidence === 'low' && !q.ignored && q.candidates[1] && q.candidates[1].score > q.candidates[0].score * 0.8) ambiguities.push(`"${q.numText}${q.unit ? ' ' + q.unit : ''}" read as ${getConcept(q.concept!)?.name ?? q.concept} — could also be ${getConcept(q.candidates[1].concept)?.name}.`);
  }

  // particle (mass and charge from the data sheet)
  const particle = detectParticle(lower);
  const hasConcept = (c: string) => quantities.some((q) => q.concept === c && !q.ignored);
  const chargeSign: Interpretation['chargeSign'] = particle ? (particle.charge < 0 ? 'negative' : particle.charge > 0 ? 'positive' : undefined) : /negative(?:ly)? charge|negative ion|anion/.test(lower) ? 'negative' : /positive(?:ly)? charge|positive ion|cation/.test(lower) ? 'positive' : undefined;
  const particleMatters = topics.some((t) => ['particles', 'efields', 'bfields', 'quantum', 'relativity', 'photoelectric', 'atomic'].includes(t));
  if (particle && particleMatters) {
    if (particle.mass !== undefined && particle.mass > 0 && !hasConcept('m')) {
      implied.push({ concept: 'm', valueSI: particle.mass, label: `Mass of ${particle.name.toLowerCase()}`, source: particle.massSource ?? 'NESA data sheet', display: `${particle.mass.toExponential(3).replace('e', ' × 10^')} kg` });
      if (particle.massSource === 'Not on data sheet') notes.push(`The ${particle.name.toLowerCase()} mass (${particle.mass.toExponential(3)} kg) is NOT on the NESA data sheet — use the value given in the question if there is one.`);
    }
    if (particle.charge !== 0 && !hasConcept('q')) implied.push({ concept: 'q', valueSI: Math.abs(particle.charge), label: `Charge of ${particle.name.toLowerCase()} (magnitude)`, source: 'NESA data sheet', display: `${particle.id === 'alpha' ? '2 × ' : ''}1.602 × 10⁻¹⁹ C` });
    if (particle.id === 'alpha' || particle.id === 'deuteron') notes.push(`${particle.name}: charge +${particle.id === 'alpha' ? '2' : ''}e.`);
  }
  // Earth / geostationary
  const earth = /\bearth\b|\bearth's|earth’s/.test(lower) && !/mass of (?:the )?(?:planet|mars|moon|jupiter)/.test(lower);
  const otherBody = /\b(mars|moon|jupiter|saturn|venus|mercury|neptune|uranus|sun|pluto|titan|europa|io|ganymede)\b/.exec(lower);
  const gravityTopic = topics.some((t) => ['gravitation', 'orbital'].includes(t));
  if (gravityTopic && earth && !hasConcept('M') && (!otherBody || /orbits? (?:the )?earth|above (?:the )?earth|earth's surface/.test(lower))) {
    implied.push({ concept: 'M', valueSI: NESA.ME.value, label: 'Mass of Earth', source: 'NESA data sheet', display: '6.0 × 10²⁴ kg' });
    if (!hasConcept('Rp')) implied.push({ concept: 'Rp', valueSI: NESA.rE.value, label: 'Radius of Earth', source: 'NESA data sheet', display: '6.371 × 10⁶ m' });
  } else if (gravityTopic && otherBody && !hasConcept('M')) {
    notes.push(`The question involves ${otherBody[1][0].toUpperCase()}${otherBody[1].slice(1)}: its mass/radius are NOT on the data sheet and must be given in the question.`);
  }
  if (/geostationary|geosynchronous/.test(lower) && !hasConcept('T')) {
    implied.push({ concept: 'T', valueSI: 86400, label: 'Period of a geostationary orbit', source: 'one day (24 h)', display: '24 h = 86 400 s' });
    flags.geostationary = true;
  }
  // stationary start
  if (/(?:from|at) rest|initially (?:at rest|stationary)|released from rest|starts from rest|is dropped/.test(lower) && !hasConcept('u')) implied.push({ concept: 'u', valueSI: 0, label: 'Initial velocity (starts from rest)', source: 'stated in the question', display: '0 m/s' });
  // perpendicular
  if ((topics.includes('particles') || topics.includes('bfields') || topics.includes('motor')) && !hasConcept('thetaB') && !hasConcept('thetaIB')) {
    const perp = /perpendicular|at right angles|normal to the field|90°|into the page|out of the page/.test(lower);
    const angleConcept = topics.includes('motor') && /wire|conductor|rod/.test(lower) ? 'thetaIB' : 'thetaB';
    if (perp) implied.push({ concept: angleConcept, valueSI: Math.PI / 2, label: 'Angle between motion/current and the field', source: 'perpendicular (stated)', display: '90°' });
    else if (/magnetic/.test(lower) && !/parallel to the field/.test(lower)) {
      implied.push({ concept: angleConcept, valueSI: Math.PI / 2, label: 'Angle between motion/current and the field', source: 'ASSUMED perpendicular — not stated', display: '90° (assumed)' });
      ambiguities.push('The angle between the motion (or current) and the magnetic field is not stated — θ = 90° (perpendicular) has been assumed. Check the diagram.');
    }
  }
  // plane of coil vs normal
  if ((topics.includes('induction') || topics.includes('motor')) && /plane of the (?:coil|loop)[^.]*\d+\s*°|\d+\s*°[^.]*(?:to|with) the plane/.test(lower)) {
    flags.anglePlane = true;
    notes.push('The angle is measured to the PLANE of the coil; Φ = BA cos θ and τ = nIAB sin θ use the angle to the NORMAL, so θ = 90° − (given angle).');
  }
  if (topics.includes('induction') && /(?:parallel to the (?:plane|coil|loop)|field lines? (?:are |is )?parallel to the plane)/.test(lower) && !hasConcept('thetaN')) implied.push({ concept: 'thetaN', valueSI: Math.PI / 2, label: 'Angle between B and the normal', source: 'field in the plane of the coil', display: '90°' });
  if ((topics.includes('induction') || topics.includes('motor')) && /perpendicular to the (?:plane of the )?(?:coil|loop)|normal to the (?:coil|loop)|at right angles to the (?:plane|coil|loop)/.test(lower) && !hasConcept('thetaN')) implied.push({ concept: 'thetaN', valueSI: 0, label: 'Angle between B and the normal', source: 'field perpendicular to the plane of the coil', display: '0° (B along the normal)' });
  // at the surface of a planet: r = R (altitude 0)
  if (gravityTopic && /(?:on|at|from|near) (?:the )?(?:its )?surface|surface (?:of|gravity)/.test(lower) && !hasConcept('hAlt') && !hasConcept('r') && !/above (?:the )?(?:earth|surface|planet)/.test(lower)) implied.push({ concept: 'hAlt', valueSI: 0, label: 'Altitude (at the surface)', source: 'at the surface: r = R', display: '0 m' });
  // maxima of sin/cos relationships
  if (/maximum torque/.test(lower) && !hasConcept('thetaN')) implied.push({ concept: 'thetaN', valueSI: Math.PI / 2, label: 'Angle between B and the normal (maximum torque)', source: 'maximum when the plane of the coil is parallel to B', display: '90°' });
  if (/maximum (?:magnetic )?flux/.test(lower) && !hasConcept('thetaN')) implied.push({ concept: 'thetaN', valueSI: 0, label: 'Angle between B and the normal (maximum flux)', source: 'maximum when B is perpendicular to the plane of the coil', display: '0°' });
  if (/maximum (?:magnetic )?force/.test(lower) && !hasConcept('thetaB') && !implied.some((i) => i.concept === 'thetaB')) implied.push({ concept: topics.includes('motor') ? 'thetaIB' : 'thetaB', valueSI: Math.PI / 2, label: 'Angle for maximum force', source: 'maximum when perpendicular to B', display: '90°' });
  // order of a maximum written in words
  if (topics.includes('interference') && !hasConcept('mOrder')) {
    const om = /\b(zeroth|central|first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)[- ](?:order|bright|maxim|fringe|dark)/.exec(lower);
    if (om) implied.push({ concept: 'mOrder', valueSI: ORDINALS[om[1]], label: 'Order of the maximum', source: `"${om[0]}" in the question`, display: String(ORDINALS[om[1]]) });
  }
  // refraction with air: n_air = 1.00
  if (topics.includes('waves') && /\bair\b/.test(lower)) {
    const nq = quantities.find((q) => (q.concept === 'n' || q.concept === 'n1' || q.concept === 'n2') && !q.ignored);
    const outOf = /(?:from|out of|leaves|leaving|emerges from|travell?ing (?:in|through)) (?:the |a )?(?:glass|water|perspex|diamond|plastic|oil|block|prism|fibre|fiber|core|medium|liquid|ice|acrylic)|(?:into|to) (?:the )?air|critical angle|total internal reflection|(?:glass|water|diamond|perspex|core)[- –]air/.test(lower);
    const into = /(?:from|in) air (?:into|to)|(?:enters|entering|passes into|into) (?:the |a )?(?:glass|water|perspex|diamond|plastic|oil|block|prism|medium|liquid)/.test(lower);
    if (nq && !hasConcept('n1') && !hasConcept('n2')) {
      const toN2 = into || !outOf;
      nq.concept = toN2 ? 'n2' : 'n1';
      implied.push({ concept: toN2 ? 'n1' : 'n2', valueSI: 1.0, label: 'Refractive index of air', source: 'standard assumption (n_air = 1.00)', display: '1.00' });
    }
  }
  // flux falls to zero
  if (topics.includes('induction') && /(?:switched off|reduced to zero|removed|falls to zero|drops to zero|pulled (?:completely )?out)/.test(lower)) flags.fluxToZero = true;
  // units of g in the question override
  if (/g\s*=\s*9\.81/.test(normalised)) notes.push('The question gives g = 9.81 m s⁻² — that value is used.');
  // per second → t = 1 s
  if (/(?:each|per|every) (?:second|s\b)/.test(text.toLowerCase() + ' ' + lower) && !hasConcept('t') && (topics.includes('stars') || topics.includes('nuclear') || topics.includes('relativity'))) implied.push({ concept: 't', valueSI: 1, label: 'Time interval', source: '"per second" in the question', display: '1 s' });

  // targets
  let targets = findTargets(normalised, topics);
  const wantsDirection = /direction|which way|clockwise|anticlockwise|north|south|east|west|into the page|out of the page|deflect(?:ed)? (?:up|down|towards)/.test(lower) && /(?:determine|state|find|what|which|identify|predict|indicate|show)[^.?]*direction|which way|in which direction|direction of/.test(lower);
  targets = targets.filter((c) => !hasConcept(c) || c === 'v');
  // remove targets that are also given, except when the given value belongs to another concept
  targets = targets.filter((c) => !quantities.some((q) => q.concept === c && !q.ignored));

  // equation & special tools
  const equation = /(?:->|→|⟶)/.test(normalised) ? normalised.split('\n').find((l) => /->|→|⟶/.test(l))?.trim() : undefined;
  let problemType: ProblemType = 'chain';
  const hasAngle = hasConcept('thetaL');
  if (equation && /\b(?:[A-Z][a-z]?-\d+|\d+\s*[A-Z][a-z]?|alpha|beta|neutron|\bn\b|\?|X)\b/.test(equation) && /[?X]|balance|identify|missing|complete/.test(normalised)) problemType = 'nuclearEquation';
  else if (equation && topics.includes('standardModel')) problemType = 'conservation';
  else if (/quark|uud|udd|\bu\s*d\s*d\b|antiquark/.test(lower) && topics[0] === 'standardModel') problemType = 'quarks';
  else if (transition && (topics.includes('atomic') || /hydrogen/.test(lower))) problemType = 'transition';
  else if (topics[0] === 'projectile' || (topics.includes('projectile') && (hasAngle || /horizontally|cliff|thrown|kicked|launched|projected/.test(lower)))) problemType = 'projectile';
  else if ((topics.includes('radioactivity')) && (hasConcept('tHalf') || /half-?life/.test(lower)) && !targets.includes('Act')) problemType = 'decay';
  if (problemType === 'chain' && wantsDirection && !targets.length) problemType = 'direction';

  return {
    text,
    normalised,
    modules,
    topics,
    topicScores: scores,
    quantities,
    implied,
    particle,
    chargeSign,
    targets,
    problemType,
    flags,
    notes,
    ambiguities,
    directions: detectDirections(lower),
    wantsDirection,
    transition,
    equation,
  };
}
