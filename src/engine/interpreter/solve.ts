/**
 * Turns an Interpretation into a full worked Solution: specialised tools for beams,
 * circuits etc., otherwise the multi-step chain solver.
 */
import { chainToSteps, consistencyIssues, IDENTITIES, Known, solveChain } from '../chain';
import { getConcept } from '../concepts';
import { fmt, fmtLatex, qtyLatex } from '../format';
import { FORMULAS } from '../formulas';
import { getQuantity } from '../quantities';
import { emptySolution, hasErrors, Solution } from '../solution';
import { beamSolution } from '../tools/beam';
import { circuitSolution } from '../tools/circuit';
import { logicSolution } from '../tools/logic';
import { forcesSolution, gearSolution, inclineSolution } from '../tools/mechanics';
import { leverRuleSolution } from '../tools/materials';
import { numberSolution } from '../tools/numbase';
import type { Interpretation } from './interpret';

/** Suggest which data would allow the target to be found. */
function missingHint(target: string, known: Set<string>): string {
  const options = [...FORMULAS, ...IDENTITIES]
    .filter((f) => !f.identity && f.vars.some((v) => v.concept === target))
    .map((f) => {
      const need = f.vars.filter((v) => v.concept !== target && !known.has(v.concept) && v.constant === undefined).map((v) => getConcept(v.concept)?.name ?? v.name);
      return { f, need };
    })
    .sort((a, b) => a.need.length - b.need.length)
    .slice(0, 3);
  return options.map((o) => `${o.f.name} (${o.f.equation.replace(/\\[a-z]+\{?|[{}]/g, '').replace(/\s+/g, ' ')})${o.need.length ? ' needs ' + [...new Set(o.need)].join(', ') : ''}`).join('; ');
}

export function solveInterpretation(interp: Interpretation, sf = 4): Solution {
  const sp = interp.special;
  let sol: Solution;
  if (sp && interp.problemType !== 'chain') {
    switch (sp.type) {
      case 'beam':
        sol = beamSolution(sp.input);
        break;
      case 'circuit':
        sol = circuitSolution(sp.input);
        break;
      case 'incline':
        sol = inclineSolution(sp.input);
        break;
      case 'logic':
        sol = logicSolution(sp.expr);
        break;
      case 'numbase':
        sol = numberSolution(sp.value, sp.from);
        break;
      case 'lever':
        sol = leverRuleSolution({ C0: sp.C0 });
        break;
      case 'gear':
        sol = gearSolution(sp.input);
        break;
      case 'forces':
        sol = forcesSolution(sp.forces);
        break;
      case 'truss':
        sol = emptySolution('Truss analysis');
        sol.issues.push({ level: 'warning', message: sp.notes[0] });
        break;
    }
    sol.module = sol.module ?? interp.modules[0];
    sol.explanation.unshift(...sp.notes);
    return sol;
  }
  return solveChainInterpretation(interp, sf);
}

export function solveChainInterpretation(interp: Interpretation, sf = 4): Solution {
  const sol = emptySolution('Smart Solver');
  sol.module = interp.modules[0];
  sol.topic = interp.topic;
  const knowns: Known[] = [];
  const seen = new Set<string>();
  for (const q of interp.quantities) {
    if (q.ignored || !q.concept) continue;
    const c = getConcept(q.concept);
    if (!c) continue;
    if (seen.has(q.concept)) {
      sol.issues.push({ level: 'warning', message: `Two values were assigned to ${c.name}; only the first (${knowns.find((k) => k.concept === q.concept)?.valueSI}) is used. Reassign one of them.` });
      continue;
    }
    seen.add(q.concept);
    // dimension check between the number's unit and the concept
    const kind = getQuantity(c.quantity);
    if (q.dim && q.unit && q.unit !== '°' && q.unit !== '%' && q.unit !== 'dB') {
      const same = kind.dim.every((x, i) => Math.abs(x - q.dim![i]) < 1e-9);
      if (!same) {
        sol.issues.push({ level: 'error', message: `${q.numText} ${q.unit} cannot be ${c.name.toLowerCase()} — incompatible units (expected ${kind.units.filter(Boolean).join(', ') || 'a pure number'}).` });
        continue;
      }
    }
    let valueSI = q.valueSI;
    if (kind.angle && !q.unit) valueSI = (q.value * Math.PI) / 180; // bare angle numbers are degrees
    knowns.push({ concept: q.concept, valueSI, source: 'given' });
    const unitText = q.unit === '°' ? '°' : q.unit ? ` ${q.unit}` : '';
    sol.given.push({ symbolLatex: c.latex, name: c.name, raw: `${q.numText}${unitText}`, valueSI, quantity: c.quantity, unit: q.unit, sf: q.sf });
    sol.inputSigFigs.push(q.sf);
    if (q.unit && q.unit !== kind.si && !kind.angle && !(kind.percent && q.unit === '%')) {
      sol.conversions.push(`${c.latex} = ${qtyLatex(q.value, q.unit, 12)} = ${fmtLatex(valueSI, 12)}${kind.siLatex ? '\\ ' + kind.siLatex : ''}`);
    } else if (kind.percent && q.unit === '%') {
      sol.conversions.push(`${c.latex} = ${fmtLatex(q.value, 12)}\\% = ${fmtLatex(valueSI, 12)}`);
    }
  }
  // implicit data from wording
  const add = (concept: string, v: number, why: string) => {
    if (seen.has(concept)) return;
    seen.add(concept);
    knowns.push({ concept, valueSI: v, source: 'given' });
    const c = getConcept(concept)!;
    sol.given.push({ symbolLatex: c.latex, name: `${c.name} (${why})`, raw: String(v), valueSI: v, quantity: c.quantity, unit: '' });
  };
  if (interp.flags.fromRest) add('u', 0, 'starts from rest');
  if (interp.flags.toRest && interp.flags.fromRest === false) {
    // a single speed given together with "comes to rest" is the initial speed
    const vK = knowns.find((k) => k.concept === 'v');
    if (vK && !seen.has('u')) {
      vK.concept = 'u';
      seen.delete('v');
      seen.add('u');
      const g = sol.given.find((x) => x.symbolLatex === 'v');
      if (g) {
        g.symbolLatex = 'u';
        g.name = 'Initial speed';
      }
    }
    add('v', 0, 'comes to rest');
  }
  const lowerText = interp.normalised.toLowerCase();
  // satellite links: altitude is the one-way signal path; "up and back" doubles it
  if (/satellite/.test(lowerText) && !seen.has('s')) {
    const hK = knowns.find((k) => k.concept === 'h');
    if (hK) {
      const factor = interp.flags.roundTrip ? 2 : 1;
      add('s', hK.valueSI * factor, factor === 2 ? 'signal path = 2 × altitude (up and back)' : 'signal path = altitude');
      sol.given[sol.given.length - 1].raw = `${fmt(hK.valueSI * factor, 4)} m`;
    }
  }
  if (interp.flags.doubleShear) add('shearPlanes', 2, 'double shear');
  if (interp.flags.singleShear) add('shearPlanes', 1, 'single shear');

  if (!interp.targets.length) {
    sol.issues.push({ level: 'error', message: 'No unknown identified. Choose what to find from the “Find” list.' });
    return sol;
  }
  interp.targets.forEach((t) => {
    const c = getConcept(t);
    if (c) sol.find.push({ symbolLatex: c.latex, name: c.name });
  });
  // light passing from/into air: n(air) = 1.00
  if (/\bair\b/.test(lowerText) && interp.targets.some((t) => ['theta1', 'theta2', 'n1', 'n2', 'thetaC'].includes(t))) {
    const fromAir = /from air|in air (onto|into|to)|air into|air to/.test(lowerText);
    const intoAir = /into air|to air|out into the air|emerges into air|glass to air|water to air/.test(lowerText);
    if (fromAir && !seen.has('n1')) add('n1', 1, 'refractive index of air');
    else if (fromAir && seen.has('n1') && !seen.has('n2')) {
      // the single index given belongs to the second medium
      const k = knowns.find((x) => x.concept === 'n1')!;
      k.concept = 'n2';
      seen.delete('n1');
      seen.add('n2');
      const gv = sol.given.find((x) => x.symbolLatex === 'n_1');
      if (gv) {
        gv.symbolLatex = 'n_2';
        gv.name = 'Refractive index of medium 2';
      }
      add('n1', 1, 'refractive index of air');
    } else if (intoAir && !seen.has('n2')) add('n2', 1, 'refractive index of air');
  }
  const exclude: string[] = [];
  if (interp.targets.includes('antennaLength')) exclude.push(interp.flags.quarterWave ? 'halfWave' : 'quarterWave');
  sol.issues.push(...consistencyIssues(knowns, { modules: interp.modules }));

  const allSteps: ReturnType<typeof chainToSteps>['steps'] = [];
  const seenSteps = new Set<string>();
  const knownSet = new Set(knowns.map((k) => k.concept));
  for (const t of interp.targets) {
    if (knownSet.has(t) && knowns.find((k) => k.concept === t)?.source === 'given') {
      const k = knowns.find((x) => x.concept === t)!;
      const c = getConcept(t)!;
      sol.finals.push({ symbolLatex: c.latex, name: `${c.name} (given)`, valueSI: k.valueSI, quantity: c.quantity });
      continue;
    }
    let res = solveChain(knowns, [t], { modules: interp.modules, exclude });
    if (res.missing.length) {
      // standard assumptions students are expected to make
      const assumptions: [string, number, string, RegExp][] = [
        ['rho', 1025, 'seawater density assumed 1025 kg/m³', /sea ?water|ocean|marine/],
        ['rho', 1000, 'density of water assumed 1000 kg/m³', /water|dam|tank|reservoir/],
        ['rho', 1.225, 'sea-level air density assumed 1.225 kg/m³', /\bair\b|aircraft|wing|sea level/],
      ];
      for (const [c, val, why, re] of assumptions) {
        if (seen.has(c) || !re.test(lowerText)) continue;
        const trial = solveChain([...knowns, { concept: c, valueSI: val, source: 'given' }], [t], { modules: interp.modules, exclude });
        if (!trial.missing.length) {
          add(c, val, why);
          sol.issues.push({ level: 'warning', message: `Assumption: ${why}.` });
          res = trial;
          break;
        }
      }
    }
    if (res.missing.length) {
      const c = getConcept(t)!;
      sol.issues.push({ level: 'error', message: `Missing data: cannot find ${c.name.toLowerCase()} from the information given. Options: ${missingHint(t, knownSet)}.` });
      continue;
    }
    const { steps, issues } = chainToSteps(res, sf);
    steps.forEach((s, i) => {
      const key = `${res.steps[i].formula.id}:${res.steps[i].concept}`;
      if (seenSteps.has(key)) return;
      seenSteps.add(key);
      allSteps.push(s);
    });
    sol.issues.push(...issues);
    const c = getConcept(t)!;
    sol.finals.push({ symbolLatex: c.latex, name: c.name, valueSI: res.known.get(t)!.valueSI, quantity: c.quantity });
    // add derived knowns so later targets reuse them (and number steps continuously)
    res.steps.forEach((s) => {
      if (!knownSet.has(s.concept)) {
        knowns.push({ concept: s.concept, valueSI: s.result, source: 'derived' });
        knownSet.add(s.concept);
      }
    });
  }
  allSteps.forEach((s, i) => (s.title = s.title.replace(/^Step \d+/, `Step ${i + 1}`)));
  sol.steps = allSteps;
  sol.ok = sol.finals.length > 0 && !hasErrors(sol.issues);
  if (sol.steps.length) sol.explanation.push(...[...new Set(sol.steps.map((s) => s.explanation).filter(Boolean) as string[])].slice(0, 4));
  return sol;
}
