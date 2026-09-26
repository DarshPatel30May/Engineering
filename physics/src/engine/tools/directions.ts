/**
 * Vector and direction engine (Modules 5, 6, 8).
 *
 * Directions are unit vectors in one of two frames:
 *  - page frame:    right +x, left −x, up the page +y, down the page −y, out of the page +z, into the page −z
 *  - compass frame: east +x, west −x, north +y, south −y, vertically up +z, vertically down −z
 * Forces use the vector products F = q v × B and F = I L × B (conventional current). A
 * negative charge (electron) experiences the force opposite to a positive charge. Magnitude
 * and direction are reported separately, and no direction is given unless every input
 * direction is known.
 */
import type { DirectionNote, Solution } from '../solution';
import { newSolution } from './common';

export type Vec = [number, number, number];
export type Frame = 'page' | 'compass';

const WORDS: { frame: Frame | 'any'; names: string[]; v: Vec }[] = [
  { frame: 'page', names: ['right', 'to the right', 'rightwards', '+x', 'east'], v: [1, 0, 0] },
  { frame: 'page', names: ['left', 'to the left', 'leftwards', '-x', 'west'], v: [-1, 0, 0] },
  { frame: 'page', names: ['up', 'up the page', 'upwards', 'top of the page', 'towards the top', '+y', 'north'], v: [0, 1, 0] },
  { frame: 'page', names: ['down', 'down the page', 'downwards', 'bottom of the page', 'towards the bottom', '-y', 'south'], v: [0, -1, 0] },
  { frame: 'page', names: ['out of the page', 'out of page', 'out', 'towards the viewer', 'towards you', 'out of the screen', '+z'], v: [0, 0, 1] },
  { frame: 'page', names: ['into the page', 'into page', 'in', 'away from the viewer', 'away from you', 'into the screen', '-z'], v: [0, 0, -1] },
  { frame: 'compass', names: ['east', 'e', '+x'], v: [1, 0, 0] },
  { frame: 'compass', names: ['west', 'w', '-x'], v: [-1, 0, 0] },
  { frame: 'compass', names: ['north', 'n', '+y'], v: [0, 1, 0] },
  { frame: 'compass', names: ['south', 's', '-y'], v: [0, -1, 0] },
  { frame: 'compass', names: ['vertically up', 'up', 'upwards', 'vertically upwards', '+z'], v: [0, 0, 1] },
  { frame: 'compass', names: ['vertically down', 'down', 'downwards', 'vertically downwards', '-z'], v: [0, 0, -1] },
];

export const PAGE_DIRECTIONS = ['right', 'left', 'up the page', 'down the page', 'out of the page', 'into the page'] as const;
export const COMPASS_DIRECTIONS = ['east', 'west', 'north', 'south', 'vertically up', 'vertically down'] as const;

export function parseDirection(word: string, frame: Frame): Vec | null {
  const w = word.trim().toLowerCase();
  for (const d of WORDS) if ((d.frame === frame || d.frame === 'any') && d.names.includes(w)) return d.v;
  return null;
}

export function describe(v: Vec, frame: Frame): string {
  const names = frame === 'page' ? PAGE_DIRECTIONS : COMPASS_DIRECTIONS;
  const axes: [Vec, string][] = [
    [[1, 0, 0], names[0]],
    [[-1, 0, 0], names[1]],
    [[0, 1, 0], names[2]],
    [[0, -1, 0], names[3]],
    [[0, 0, 1], names[4]],
    [[0, 0, -1], names[5]],
  ];
  const n = norm(v);
  if (n < 1e-12) return 'zero (no force)';
  const u = v.map((x) => x / n) as Vec;
  for (const [a, name] of axes) if (dot(u, a) > 1 - 1e-9) return name;
  // combination
  const parts: string[] = [];
  axes.forEach(([a, name]) => {
    const d = dot(u, a);
    if (d > 1e-9) parts.push(`${name} (${(d * 100).toFixed(0)}%)`);
  });
  return parts.join(' + ');
}

export const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a: Vec) => Math.hypot(a[0], a[1], a[2]);
export const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];

export type ChargeSign = 'positive' | 'negative';

/** Direction of the magnetic force on a moving charge, F = q v × B. */
export function magneticForceDirection(vDir: Vec, BDir: Vec, sign: ChargeSign, frame: Frame): { F: Vec; text: string; note: DirectionNote } {
  const vxB = cross(vDir, BDir);
  const F = sign === 'positive' ? vxB : scale(vxB, -1);
  const zero = norm(vxB) < 1e-12;
  const lines = zero
    ? ['v is parallel (or antiparallel) to B, so sin θ = 0 and there is NO magnetic force.']
    : [
        `Right-hand (palm) rule for a POSITIVE charge: fingers along B (${describe(BDir, frame)}), thumb along v (${describe(vDir, frame)}) → palm pushes ${describe(vxB, frame)}.`,
        sign === 'negative'
          ? `The particle is NEGATIVE (e.g. an electron), so the force is REVERSED: ${describe(F, frame)}.`
          : `The particle is positive, so the force is ${describe(F, frame)}.`,
        'The force is always perpendicular to both v and B, so it changes the direction of motion but not the speed (it does no work).',
      ];
  if (!zero) {
    const omega = scale(BDir, sign === 'positive' ? -1 : 1);
    const sense = frame === 'page' && Math.abs(BDir[2]) > 0.99 ? (omega[2] > 0 ? 'anticlockwise' : 'clockwise') : null;
    if (sense) lines.push(`If the field region is large enough, the particle moves in a circle, turning ${sense} as seen on the page.`);
  }
  return { F, text: zero ? 'no force' : describe(F, frame), note: { title: 'Direction of the magnetic force', lines, diagram: { kind: 'rhr', v: vDir, B: BDir, F, labels: ['v', 'B', 'F'] } } };
}

/** Direction of the force on a current-carrying conductor, F = I L × B (conventional current). */
export function wireForceDirection(IDir: Vec, BDir: Vec, frame: Frame, electronFlow = false): { F: Vec; text: string; note: DirectionNote } {
  const conv = electronFlow ? scale(IDir, -1) : IDir;
  const F = cross(conv, BDir);
  const zero = norm(F) < 1e-12;
  const lines = zero
    ? ['The conductor is parallel to B: no force.']
    : [
        ...(electronFlow ? [`Electron flow is ${describe(IDir, frame)}, so CONVENTIONAL current is ${describe(conv, frame)}.`] : []),
        `Right-hand palm rule: fingers along B (${describe(BDir, frame)}), thumb along the conventional current (${describe(conv, frame)}) → force ${describe(F, frame)}.`,
      ];
  return { F, text: zero ? 'no force' : describe(F, frame), note: { title: 'Direction of the motor-effect force', lines, diagram: { kind: 'rhr', v: conv, B: BDir, F, labels: ['I', 'B', 'F'] } } };
}

/** Direction of the electric force: along E for positive charges, opposite for negative. */
export function electricForceDirection(EDir: Vec, sign: ChargeSign, frame: Frame): { F: Vec; text: string; note: DirectionNote } {
  const F = sign === 'positive' ? EDir : scale(EDir, -1);
  return {
    F,
    text: describe(F, frame),
    note: {
      title: 'Direction of the electric force',
      lines: [
        `The field points ${describe(EDir, frame)} (from the positive plate towards the negative plate).`,
        sign === 'positive' ? `A positive charge is pushed along the field: ${describe(F, frame)}.` : `A negative charge (electron) is pushed opposite to the field: ${describe(F, frame)} (towards the positive plate).`,
      ],
    },
  };
}

export type FluxChange = 'increasing' | 'decreasing';

/**
 * Lenz's law for a flat loop in the page. `fieldOut` = external field through the loop points
 * out of the page (towards the viewer). Returns the induced field and current as viewed from the front.
 */
export function lenzLoop(fieldOut: boolean, change: FluxChange): { inducedOut: boolean; current: 'clockwise' | 'anticlockwise'; note: DirectionNote } {
  const inducedOut = change === 'increasing' ? !fieldOut : fieldOut;
  const current = inducedOut ? 'anticlockwise' : 'clockwise';
  return {
    inducedOut,
    current,
    note: {
      title: "Lenz's law",
      lines: [
        `External flux through the loop points ${fieldOut ? 'out of' : 'into'} the page and is ${change}.`,
        change === 'increasing'
          ? `The induced current must OPPOSE the increase, so its field inside the loop points ${inducedOut ? 'out of' : 'into'} the page (opposite to the external field).`
          : `The induced current must OPPOSE the decrease, so its field inside the loop points ${inducedOut ? 'out of' : 'into'} the page (the SAME way as the external field, to maintain the flux).`,
        `Right-hand grip rule: a field ${inducedOut ? 'out of' : 'into'} the page inside the loop needs a ${current.toUpperCase()} current (as seen from the front).`,
      ],
    },
  };
}

/** Magnet moved relative to a coil (end view from the magnet side). */
export function lenzMagnet(pole: 'N' | 'S', motion: 'towards' | 'away'): { face: 'N' | 'S'; current: 'clockwise' | 'anticlockwise'; force: string; note: DirectionNote } {
  // The induced pole on the coil face nearest the magnet opposes the motion.
  const face: 'N' | 'S' = motion === 'towards' ? pole : pole === 'N' ? 'S' : 'N';
  const current = face === 'N' ? 'anticlockwise' : 'clockwise';
  const force = motion === 'towards' ? 'repulsion (opposes the approach)' : 'attraction (opposes the removal)';
  return {
    face,
    current,
    force,
    note: {
      title: "Lenz's law — magnet and coil",
      lines: [
        `Moving the ${pole} pole ${motion} the coil ${motion === 'towards' ? 'increases' : 'decreases'} the flux through it.`,
        `The induced current makes the near face of the coil a ${face} pole, producing ${force}.`,
        `Viewed from the magnet’s side, a ${face} pole face has an ${current.toUpperCase()} current.`,
        'Energy is conserved: work must be done against this opposing force to keep the magnet moving.',
      ],
    },
  };
}

/** Right-hand grip rule for a straight wire seen end-on. */
export function wireFieldSense(currentOut: boolean): DirectionNote {
  return {
    title: 'Right-hand grip rule',
    lines: [`Current ${currentOut ? 'out of' : 'into'} the page: thumb ${currentOut ? 'towards you' : 'away from you'}, fingers curl ${currentOut ? 'ANTICLOCKWISE' : 'CLOCKWISE'} — the magnetic field circles the wire ${currentOut ? 'anticlockwise' : 'clockwise'}.`],
  };
}

export interface DirectionToolInput {
  kind: 'charge' | 'wire' | 'efield' | 'lenzLoop' | 'lenzMagnet' | 'parallelWires';
  frame: Frame;
  v?: string;
  B?: string;
  E?: string;
  sign?: ChargeSign;
  electronFlow?: boolean;
  fieldOut?: boolean;
  change?: FluxChange;
  pole?: 'N' | 'S';
  motion?: 'towards' | 'away';
  sameDirection?: boolean;
}

/** Direction tool as a Solution (magnitude-free). */
export function solveDirection(inp: DirectionToolInput): Solution {
  const sol = newSolution('Direction (vector) reasoning', 'm6', 'bfields');
  const need = (s: string | undefined, name: string) => {
    if (!s) {
      sol.issues.push({ level: 'error', message: `The direction of ${name} is needed.` });
      return null;
    }
    const d = parseDirection(s, inp.frame);
    if (!d) sol.issues.push({ level: 'error', message: `Cannot read the direction "${s}" for ${name}.` });
    return d;
  };
  if (inp.kind === 'charge') {
    const vv = need(inp.v, 'the velocity');
    const bb = need(inp.B, 'the magnetic field');
    if (!vv || !bb) return sol;
    const r = magneticForceDirection(vv, bb, inp.sign ?? 'positive', inp.frame);
    sol.directions.push(r.note);
    sol.finals.push({ symbolLatex: '\\vec F', name: 'Direction of magnetic force', valueSI: NaN, quantity: 'dimensionless', direction: r.text });
  } else if (inp.kind === 'wire') {
    const ii = need(inp.v, 'the current');
    const bb = need(inp.B, 'the magnetic field');
    if (!ii || !bb) return sol;
    const r = wireForceDirection(ii, bb, inp.frame, inp.electronFlow);
    sol.topic = 'motor';
    sol.directions.push(r.note);
    sol.finals.push({ symbolLatex: '\\vec F', name: 'Direction of force on the conductor', valueSI: NaN, quantity: 'dimensionless', direction: r.text });
  } else if (inp.kind === 'efield') {
    const ee = need(inp.E, 'the electric field');
    if (!ee) return sol;
    const r = electricForceDirection(ee, inp.sign ?? 'positive', inp.frame);
    sol.topic = 'efields';
    sol.directions.push(r.note);
    sol.finals.push({ symbolLatex: '\\vec F', name: 'Direction of electric force', valueSI: NaN, quantity: 'dimensionless', direction: r.text });
  } else if (inp.kind === 'lenzLoop') {
    const r = lenzLoop(inp.fieldOut ?? true, inp.change ?? 'increasing');
    sol.topic = 'induction';
    sol.directions.push(r.note);
    sol.finals.push({ symbolLatex: 'I', name: 'Induced current (viewed from the front)', valueSI: NaN, quantity: 'dimensionless', direction: r.current });
  } else if (inp.kind === 'lenzMagnet') {
    const r = lenzMagnet(inp.pole ?? 'N', inp.motion ?? 'towards');
    sol.topic = 'induction';
    sol.directions.push(r.note);
    sol.finals.push({ symbolLatex: 'I', name: 'Induced current (viewed from the magnet)', valueSI: NaN, quantity: 'dimensionless', direction: `${r.current}; near face is a ${r.face} pole; ${r.force}` });
  } else if (inp.kind === 'parallelWires') {
    sol.topic = 'motor';
    const same = inp.sameDirection ?? true;
    sol.directions.push({ title: 'Force between parallel wires', lines: [same ? 'Currents in the SAME direction: the wires ATTRACT.' : 'Currents in OPPOSITE directions: the wires REPEL.', 'Each wire sits in the other’s magnetic field (right-hand grip rule) and the motor-effect force (right-hand palm rule) gives this result. The forces are equal and opposite (Newton’s third law).'] });
    sol.finals.push({ symbolLatex: '\\vec F', name: 'Force between the wires', valueSI: NaN, quantity: 'dimensionless', direction: same ? 'attraction' : 'repulsion' });
  }
  sol.ok = !sol.issues.some((i) => i.level === 'error');
  return sol;
}
