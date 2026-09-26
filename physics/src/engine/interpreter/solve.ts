/**
 * Smart Solver: turns an Interpretation into a fully worked Solution — either through the
 * multi-step chain solver or one of the specialised tools. Missing information is reported,
 * never invented.
 */
import { consistencyIssues, chainToSteps, Known, missingInputsFor, solveChain } from '../chain';
import { getConcept } from '../concepts';
import { fmtLatex, qtyLatex } from '../format';
import { FORMULAS } from '../formulas';
import type { Issue } from '../formulas/types';
import { getQuantity } from '../quantities';
import { emptySolution, hasErrors, Solution } from '../solution';
import { solveTransition } from '../tools/atomic';
import { q, Qty } from '../tools/common';
import { electricForceDirection, magneticForceDirection, parseDirection, wireForceDirection } from '../tools/directions';
import { solveConservation, solveDecay, solveQuarks } from '../tools/m8tools';
import { solveEquation } from '../tools/nuclear';
import { solveProjectile, ProjectileMode } from '../tools/projectile';
import { Interpretation, QtyAssignment } from './interpret';

function conceptLatex(c: string): string {
  return getConcept(c)?.latex ?? c;
}
function conceptName(c: string): string {
  return getConcept(c)?.name ?? c;
}

function active(interp: Interpretation): QtyAssignment[] {
  return interp.quantities.filter((x) => x.concept && !x.ignored);
}

function qtyOf(interp: Interpretation, concept: string): Qty | undefined {
  const x = active(interp).find((a) => a.concept === concept);
  if (x) return q(x.value, x.unit, x.numText);
  const imp = interp.implied.find((i) => i.concept === concept);
  if (imp) return q(getQuantity(getConcept(concept)!.quantity).angle ? imp.valueSI / (Math.PI / 180) : imp.valueSI, getQuantity(getConcept(concept)!.quantity).angle ? '°' : getQuantity(getConcept(concept)!.quantity).si, imp.display);
  return undefined;
}

function addDirections(interp: Interpretation, sol: Solution) {
  const dirs = interp.directions;
  const get = (w: 'v' | 'B' | 'E' | 'I') => dirs.find((d) => d.what === w);
  const sign = interp.chargeSign;
  const frame = dirs.some((d) => d.frame === 'compass') ? 'compass' : 'page';
  const vB = get('v');
  const BB = get('B');
  const EE = get('E');
  const II = get('I');
  const pv = vB && parseDirection(vB.dir, frame);
  const pB = BB && parseDirection(BB.dir, frame);
  if (pv && pB && sign && (interp.topics.includes('particles') || interp.topics.includes('bfields'))) {
    const r = magneticForceDirection(pv, pB, sign, frame);
    r.note.lines.unshift(`Read from the question: velocity ${vB!.dir}, magnetic field ${BB!.dir}, ${sign} charge.`);
    sol.directions.push(r.note);
    const f = sol.finals.find((x) => /force|acceleration/i.test(x.name));
    if (f) f.direction = r.text;
    return;
  }
  if (II && pB) {
    const pI = parseDirection(II.dir, frame);
    if (pI) {
      const r = wireForceDirection(pI, pB, frame);
      sol.directions.push(r.note);
      const f = sol.finals.find((x) => /force/i.test(x.name));
      if (f) f.direction = r.text;
      return;
    }
  }
  if (EE && sign) {
    const pE = parseDirection(EE.dir, frame);
    if (pE) {
      const r = electricForceDirection(pE, sign, frame);
      sol.directions.push(r.note);
      const f = sol.finals.find((x) => /force|acceleration/i.test(x.name));
      if (f) f.direction = r.text;
      return;
    }
  }
  if (interp.wantsDirection) {
    const missing: string[] = [];
    if ((interp.topics.includes('particles') || interp.topics.includes('bfields')) && !pv) missing.push('the direction of the velocity');
    if ((interp.topics.includes('particles') || interp.topics.includes('bfields') || interp.topics.includes('motor')) && !pB) missing.push('the direction of the magnetic field');
    if (!sign && interp.topics.includes('particles')) missing.push('the sign of the charge');
    sol.directions.push({ title: 'Direction', lines: [missing.length ? `The direction cannot be determined from the text: ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} not stated (it may be on a diagram). Use the Direction tool once you know them.` : 'Use the right-hand palm rule: fingers along B, thumb along v (positive charge) or conventional current; the palm pushes in the direction of the force. Reverse for a negative charge.'] });
  }
}

function withCommon(interp: Interpretation, sol: Solution): Solution {
  sol.issues.unshift(...interp.ambiguities.map((m) => ({ level: 'warning' as const, message: m })));
  for (const n of interp.notes) sol.explanation.unshift(n);
  if (!sol.module && interp.modules[0]) sol.module = interp.modules[0];
  if (!sol.topic && interp.topics[0]) sol.topic = interp.topics[0];
  return sol;
}

export function solveInterpretation(interp: Interpretation, sf = 4): Solution {
  switch (interp.problemType) {
    case 'transition':
      return withCommon(interp, solveTransition({ ni: interp.transition!.ni, nf: interp.transition!.nf }, sf));
    case 'nuclearEquation':
      return withCommon(interp, solveEquation(interp.equation!));
    case 'conservation':
      return withCommon(interp, solveConservation(interp.equation!));
    case 'quarks': {
      const m = /\b([udscbt](?:\s*(?:bar|~))?(?:\s*[udscbt](?:\s*(?:bar|~))?){1,2})\b/i.exec(interp.normalised);
      if (m) return withCommon(interp, solveQuarks(m[1]));
      break;
    }
    case 'projectile': {
      const s = solveProjectileFromText(interp, sf);
      if (s.ok) return withCommon(interp, s);
      const c = solveByChain(interp, sf);
      if (c.ok) return withCommon(interp, c);
      return withCommon(interp, s);
    }
    case 'decay': {
      const s = solveDecayFromText(interp, sf);
      if (s.ok) return withCommon(interp, s);
      const c = solveByChain(interp, sf);
      return withCommon(interp, c.ok ? c : s);
    }
    case 'direction': {
      const sol = emptySolution('Direction reasoning');
      addDirections(interp, sol);
      sol.ok = sol.directions.length > 0;
      if (!sol.ok) sol.issues.push({ level: 'error', message: 'No numerical unknown and no directions could be read. Use the Direction tool on the Magnetic Fields page.' });
      return withCommon(interp, sol);
    }
  }
  return withCommon(interp, solveByChain(interp, sf));
}

function solveProjectileFromText(interp: Interpretation, sf: number): Solution {
  const lower = interp.normalised.toLowerCase();
  let u = qtyOf(interp, 'u') ?? qtyOf(interp, 'ux') ?? (interp.targets.includes('v') && !qtyOf(interp, 'u') ? undefined : qtyOf(interp, 'v'));
  let angle = qtyOf(interp, 'thetaL');
  const horizontal = /horizontally|horizontal velocity|rolls off|horizontal speed/.test(lower) && !angle;
  if (horizontal) angle = q(0, '°', '0');
  if (!angle && /vertically up|straight up|thrown up/.test(lower)) angle = q(90, '°', '90');
  if (!u && qtyOf(interp, 'uy') && /vertically|straight up/.test(lower)) {
    u = qtyOf(interp, 'uy');
    angle = q(90, '°', '90');
  }
  const h0q = qtyOf(interp, 'hDrop');
  const syq = qtyOf(interp, 'sy');
  let h0: Qty | undefined = h0q;
  if (!h0 && syq) h0 = q(-syq.value, syq.unit, syq.raw);
  const range = qtyOf(interp, 'sx');
  const hmax = qtyOf(interp, 'H');
  const g = qtyOf(interp, 'g');
  const t = interp.targets;
  let mode: ProjectileMode = 'forward';
  if ((t.includes('u') || t.includes('v') && !u) && range && angle) mode = 'speedFromRange';
  else if (t.includes('thetaL') && range && u) mode = 'angleFromRange';
  else if ((t.includes('u') || (t.includes('v') && !u)) && hmax && angle) mode = 'speedFromHeight';
  const tAtQ = interp.quantities.find((x) => x.concept === 't' && !x.ignored);
  const sol = solveProjectile({ mode, u, angle, h0, range: mode !== 'forward' ? range : undefined, hmax, g, tAt: tAtQ ? q(tAtQ.value, tAtQ.unit, tAtQ.numText) : undefined }, sf);
  if (h0q) sol.assumptions.push('The height given is taken as the launch height above the landing level.');
  if (horizontal) sol.assumptions.push('Launched horizontally: θ = 0°, so u_y = 0.');
  // put the asked-for answers first
  const want = new Set(t);
  const order = (name: string) => {
    if (want.has('tFlight') && /time of flight/i.test(name)) return 0;
    if (want.has('sx') && /range/i.test(name)) return 0;
    if (want.has('H') && /maximum height/i.test(name)) return 0;
    if (want.has('v') && /speed at landing/i.test(name)) return 0;
    return 1;
  };
  sol.finals.sort((a, b) => order(a.name) - order(b.name));
  return sol;
}

function solveDecayFromText(interp: Interpretation, sf: number): Solution {
  const lower = interp.normalised.toLowerCase();
  let N0 = qtyOf(interp, 'N0');
  let N = qtyOf(interp, 'Nt');
  let fraction: number | undefined;
  const fr = /(one|a) (half|quarter|eighth|sixteenth|third)(?![- ]?li(?:fe|ves))(?=[^.]*(?:remain|left|of (?:the |its )?(?:original|initial)))|(\d+(?:\.\d+)?)\s*%\s*(?:of (?:the |its )?(?:original|initial)|remain|is left|left)/.exec(lower);
  if (fr) {
    if (fr[2]) fraction = { half: 0.5, quarter: 0.25, eighth: 0.125, sixteenth: 0.0625, third: 1 / 3 }[fr[2] as 'half'];
    else if (fr[3]) fraction = parseFloat(fr[3]) / 100;
  }
  if (N0 && N0.unit === '%' && fraction !== undefined) N0 = undefined;
  if (N && N.unit === '%' && !N0) {
    fraction = N.value / 100;
    N = undefined;
  }
  const tq = qtyOf(interp, 't') ?? qtyOf(interp, 'tAge');
  const th = qtyOf(interp, 'tHalf');
  const lam = qtyOf(interp, 'lambdaD');
  return solveDecay({ N0, N, t: tq, tHalf: th, lambda: lam, fraction }, sf);
}

function solveByChain(interp: Interpretation, _sf: number): Solution {
  const sol = emptySolution('Smart Solver');
  sol.topic = interp.topics[0];
  sol.module = interp.modules[0];
  const known: Known[] = [];
  let anyRef: string | undefined;
  for (const x of active(interp)) {
    const c = getConcept(x.concept!)!;
    const kind = getQuantity(c.quantity);
    let valueSI = x.valueSI;
    if (kind.anyUnit) {
      anyRef = anyRef ?? x.unit;
      valueSI = x.value;
    }
    if (kind.percent && x.unit === '') valueSI = x.value > 1 ? x.value / 100 : x.value;
    if (c.id === 'q' || c.id === 'q1' || c.id === 'q2') valueSI = Math.abs(valueSI);
    known.push({ concept: c.id, valueSI, source: 'given' });
    const uDisp = x.unit === '°' ? '°' : x.unit ? ` ${x.unit}` : '';
    sol.given.push({ symbolLatex: c.latex, name: c.name, raw: `${x.numText}${uDisp}`, valueSI, quantity: c.quantity, unit: x.unit, sf: x.sf });
    sol.inputSigFigs.push(x.sf);
    if (x.unit && x.unit !== kind.si && !kind.angle && !kind.anyUnit && x.unit !== '%') {
      if (x.unit === '°C') sol.conversions.push(`${c.latex} = ${fmtLatex(x.value, 12)}\\ ^{\\circ}\\text{C} + 273.15 = ${fmtLatex(valueSI, 12)}\\ \\text{K}`);
      else if (x.unit === 'c') sol.conversions.push(`${c.latex} = ${fmtLatex(x.value, 12)}c = ${fmtLatex(x.value, 12)} \\times 3.00 \\times 10^{8} = ${fmtLatex(valueSI, 12, true)}\\ ${kind.siLatex}`);
      else sol.conversions.push(`${c.latex} = ${qtyLatex(x.value, x.unit, 12)} = ${fmtLatex(valueSI, 12, Math.abs(valueSI) >= 1e5 || (Math.abs(valueSI) < 1e-3 && valueSI !== 0))}\\ ${kind.siLatex}`);
    }
  }
  for (const imp of interp.implied) {
    if (known.some((k) => k.concept === imp.concept)) continue;
    known.push({ concept: imp.concept, valueSI: imp.valueSI, source: 'constant' });
    const c = getConcept(imp.concept)!;
    sol.given.push({ symbolLatex: c.latex, name: imp.label, raw: imp.display, valueSI: imp.valueSI, quantity: c.quantity, unit: '', constant: true, source: imp.source });
    if (/ASSUMED/.test(imp.source)) sol.assumptions.push(`${imp.label}: ${imp.display}.`);
  }
  // angle to the plane of a coil → angle to the normal
  if (interp.flags.anglePlane) {
    const k = known.find((x) => x.concept === 'thetaN' || x.concept === 'thetaB' || x.concept === 'thetaIB');
    if (k) {
      const orig = k.valueSI;
      k.concept = 'thetaN';
      k.valueSI = Math.PI / 2 - orig;
      sol.conversions.push(`\\theta_{normal} = 90^{\\circ} - ${fmtLatex(orig / (Math.PI / 180), 6)}^{\\circ} = ${fmtLatex(k.valueSI / (Math.PI / 180), 6)}^{\\circ}`);
    }
  }
  // flux falls to zero: ΔΦ = Φ
  if (interp.flags.fluxToZero && !known.some((k) => k.concept === 'dPhi')) {
    const phi = known.find((k) => k.concept === 'Phi');
    if (phi) {
      known.push({ concept: 'dPhi', valueSI: Math.abs(phi.valueSI), source: 'derived' });
      sol.assumptions.push('The flux falls to zero, so |ΔΦ| = Φ_initial.');
    } else sol.assumptions.push('The flux falls to zero, so |ΔΦ| = Φ_initial = BA cos θ.');
  }
  const targets = interp.targets.length ? interp.targets : [];
  for (const t of targets) sol.find.push({ symbolLatex: conceptLatex(t), name: conceptName(t) });
  if (!targets.length) {
    sol.issues.push({ level: 'error', message: 'Could not identify what the question asks for. Add the unknown in the Interpretation panel (or rephrase with "Calculate the …").' });
    return sol;
  }
  const topics = interp.topics;
  let res = solveChain(known, targets, { topics, anyRef });
  if (interp.flags.fluxToZero && !known.some((k) => k.concept === 'dPhi') && res.missing.includes('emf')) {
    // derive Φ first, then |ΔΦ| = Φ
    const r0 = solveChain(known, ['Phi'], { topics });
    if (r0.found.includes('Phi')) {
      known.push({ concept: 'dPhi', valueSI: Math.abs(r0.known.get('Phi')!.valueSI), source: 'derived' });
      res = solveChain(known, targets, { topics });
      res.steps.unshift(...r0.steps);
    }
  }
  const { steps, issues } = chainToSteps(res, 4, anyRef);
  sol.steps.push(...steps);
  sol.issues.push(...issues);
  sol.issues.push(...consistencyIssues(known, { topics }));
  const knownSet = new Set(known.map((k) => k.concept));
  for (const t of res.found) {
    const c = getConcept(t)!;
    const kind = getQuantity(c.quantity);
    sol.finals.push({ symbolLatex: c.latex, name: c.name, valueSI: res.known.get(t)!.valueSI, quantity: c.quantity, unit: kind.anyUnit ? anyRef : undefined });
  }
  for (const t of res.missing) {
    const opts = missingInputsFor(t, knownSet, { topics }).filter((o) => o.missing.length > 0);
    const msg = opts.length
      ? `Missing information to find ${conceptName(t)}: ` + opts.slice(0, 3).map((o) => `${o.formula.name} (${o.formula.equation.replace(/\\[a-zA-Z]+\{?|[{}]/g, '').slice(0, 40)}) needs ${o.missing.map(conceptName).join(', ')}`).join('; or ')
      : `No HSC relationship links the given data to ${conceptName(t)}.`;
    sol.issues.push({ level: 'error', message: msg });
  }
  for (const s of res.steps) if (s.formula.sheet === 'extension') sol.issues.push({ level: 'info', message: `${s.formula.name} is beyond the NESA formula sheet (extension).` });
  const explained = new Set<string>();
  for (const s of res.steps) if (!s.formula.identity && !explained.has(s.formula.id)) {
    explained.add(s.formula.id);
  }
  if (res.steps.length > 1) sol.explanation.push(`Multi-step: ${res.steps.filter((s) => !s.formula.identity).map((s) => s.formula.name).join(' → ')}.`);
  sol.title = res.found.length ? `${conceptName(res.found[0])}${res.found.length > 1 ? ' and more' : ''}` : 'Smart Solver';
  addDirections(interp, sol);
  sol.ok = res.found.length > 0 && !hasErrors(issues);
  return sol;
}

/** Which formulas could apply to a set of given concepts (used by the quantity detector). */
export function applicableFormulas(concepts: Set<string>): { id: string; name: string; target: string }[] {
  const out: { id: string; name: string; target: string }[] = [];
  for (const f of FORMULAS) {
    if (f.manualOnly) continue;
    const unknown = f.vars.filter((v) => !concepts.has(v.concept) && v.constant === undefined);
    if (unknown.length === 1 && f.solve[unknown[0].key]) out.push({ id: f.id, name: f.name, target: unknown[0].concept });
  }
  return out;
}

export type { Issue };
