import type { QuantityId } from '../quantities';

export type ModuleId = 'm5' | 'm6' | 'm7' | 'm8';

export const MODULE_NAMES: Record<ModuleId, string> = {
  m5: 'Module 5 — Advanced Mechanics',
  m6: 'Module 6 — Electromagnetism',
  m7: 'Module 7 — The Nature of Light',
  m8: 'Module 8 — From the Universe to the Atom',
};

export const MODULE_SHORT: Record<ModuleId, string> = {
  m5: 'Advanced Mechanics',
  m6: 'Electromagnetism',
  m7: 'The Nature of Light',
  m8: 'From the Universe to the Atom',
};

export type TopicId =
  | 'projectile' | 'circular' | 'gravitation' | 'orbital' | 'forces' | 'torque'
  | 'efields' | 'particles' | 'bfields' | 'motor' | 'induction' | 'transformers'
  | 'waves' | 'interference' | 'emr' | 'quantumLight' | 'photoelectric' | 'relativity'
  | 'stars' | 'atomic' | 'quantum' | 'nuclear' | 'radioactivity' | 'standardModel';

export interface TopicDef {
  id: TopicId;
  module: ModuleId;
  name: string;
  /** syllabus inquiry question(s) */
  inquiry: string[];
}

export const TOPICS: TopicDef[] = [
  { id: 'projectile', module: 'm5', name: 'Projectile Motion', inquiry: ['How can models that are used to explain projectile motion be used to analyse and make predictions?'] },
  { id: 'circular', module: 'm5', name: 'Circular Motion', inquiry: ['Why do objects move in circles?'] },
  { id: 'gravitation', module: 'm5', name: 'Gravitation', inquiry: ['How does the force of gravity determine the motion of planets and satellites?'] },
  { id: 'orbital', module: 'm5', name: 'Orbital Motion', inquiry: ['How does the force of gravity determine the motion of planets and satellites?'] },
  { id: 'forces', module: 'm5', name: 'Forces & Energy', inquiry: ['Why do objects move in circles? (work, energy and forces in two dimensions)'] },
  { id: 'torque', module: 'm5', name: 'Torque', inquiry: ['Why do objects move in circles? (rotation of mechanical systems and applied torque)'] },
  { id: 'efields', module: 'm6', name: 'Electric Fields', inquiry: ['What happens to stationary and moving charged particles when they interact with an electric or magnetic field?'] },
  { id: 'particles', module: 'm6', name: 'Charged Particles', inquiry: ['What happens to stationary and moving charged particles when they interact with an electric or magnetic field?'] },
  { id: 'bfields', module: 'm6', name: 'Magnetic Fields', inquiry: ['Under what circumstances is a force produced on a current-carrying conductor in a magnetic field?'] },
  { id: 'motor', module: 'm6', name: 'Motor Effect', inquiry: ['Under what circumstances is a force produced on a current-carrying conductor in a magnetic field?', 'How has knowledge about the Motor Effect been applied to technological advances?'] },
  { id: 'induction', module: 'm6', name: 'Electromagnetic Induction', inquiry: ['How are electric and magnetic fields related?'] },
  { id: 'transformers', module: 'm6', name: 'Transformers', inquiry: ['How are electric and magnetic fields related?'] },
  { id: 'waves', module: 'm7', name: 'Waves', inquiry: ['What is light?', 'What evidence supports the classical wave model of light?'] },
  { id: 'interference', module: 'm7', name: 'Interference & Diffraction', inquiry: ['What evidence supports the classical wave model of light and what predictions can be made using this model?'] },
  { id: 'emr', module: 'm7', name: 'EM Radiation & Polarisation', inquiry: ['What is light? (Maxwell)', 'Polarisation — Malus’ law'] },
  { id: 'quantumLight', module: 'm7', name: 'Quantum Light', inquiry: ['What evidence supports the particle model of light and what are the implications of this evidence for the development of the quantum model of light?'] },
  { id: 'photoelectric', module: 'm7', name: 'Photoelectric Effect', inquiry: ['What evidence supports the particle model of light…?'] },
  { id: 'relativity', module: 'm7', name: 'Special Relativity', inquiry: ['How does the behaviour of light affect concepts of time, space and matter?'] },
  { id: 'stars', module: 'm8', name: 'Stars & Spectra', inquiry: ['What evidence is there for the origins of the elements?'] },
  { id: 'atomic', module: 'm8', name: 'Atomic Models', inquiry: ['How is it known that atoms are made up of protons, neutrons and electrons?', 'How is it known that classical physics cannot explain the properties of the atom?'] },
  { id: 'quantum', module: 'm8', name: 'Quantum Physics', inquiry: ['How is it known that classical physics cannot explain the properties of the atom? (de Broglie)'] },
  { id: 'nuclear', module: 'm8', name: 'Nuclear Physics', inquiry: ['How can the energy of the atomic nucleus be harnessed?'] },
  { id: 'radioactivity', module: 'm8', name: 'Radioactivity', inquiry: ['How can the energy of the atomic nucleus be harnessed? (decay)'] },
  { id: 'standardModel', module: 'm8', name: 'Standard Model', inquiry: ['How is it known that human understanding of matter is still incomplete?'] },
];

export function getTopic(id: TopicId): TopicDef {
  return TOPICS.find((t) => t.id === id)!;
}

/**
 * Source classification (Source integrity):
 * - sheet     printed on the NESA HSC Physics formulae sheet
 * - derived   derived by combining/rearranging formulae-sheet relationships
 * - syllabus  a relationship named in the Physics Stage 6 Syllabus that students must recall
 * - exam      required by official HSC examination questions / marking guidelines
 * - y11       Year 11 relationship (Modules 1–4) routinely used in Year 12 questions
 * - extension useful but beyond the HSC scope — clearly labelled, never presented as required
 */
export type SourceKind = 'sheet' | 'derived' | 'syllabus' | 'exam' | 'y11' | 'extension';

export const SOURCE_LABEL: Record<SourceKind, string> = {
  sheet: 'NESA formulae sheet',
  derived: 'Derived from formulae-sheet relationships',
  syllabus: 'Physics Stage 6 Syllabus (recall)',
  exam: 'Required in HSC exam applications',
  y11: 'Year 11 relationship (formulae sheet)',
  extension: 'Extension — beyond HSC scope',
};

export interface VarDef {
  key: string;
  /** global concept id shared across formulas (defaults to key) */
  concept: string;
  latex: string;
  name: string;
  quantity: QuantityId;
  /** constant with default SI value (e.g. G, h, c) — auto-filled, still overridable */
  constant?: number;
  /** label of where the constant comes from */
  constantSource?: string;
  /** chain solver: do not assume the constant if any of these concepts are given (e.g. g when a planet mass is given) */
  constantUnless?: string[];
  positive?: boolean;
  nonNegative?: boolean;
  nonZero?: boolean;
  integer?: boolean;
  /** allowed to be negative (signed vector component) */
  signed?: boolean;
  min?: number;
  max?: number;
  /** strict upper bound (e.g. v < c) */
  below?: number;
  belowText?: string;
  warnAbove?: number;
  warnBelow?: number;
  warnText?: string;
  /** preferred display unit (overrides the quantity kind's HSC unit) */
  unit?: string;
}

export interface SolveDef {
  /** LaTeX RHS with #key placeholders */
  expr: string;
  fn: (v: Record<string, number>) => number;
  note?: string;
}

export interface Issue {
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface FormulaDef {
  id: string;
  name: string;
  module: ModuleId;
  topic: TopicId;
  /** additional topics where this formula is listed */
  alsoIn?: TopicId[];
  equation: string;
  vars: VarDef[];
  solve: Record<string, SolveDef>;
  aliases: string[];
  when: string;
  whenNot?: string;
  /** LaTeX lines showing how the relationship is derived from sheet formulae */
  derivation?: string[];
  assumptions?: string[];
  related?: string[];
  sheet: SourceKind;
  /** typical HSC applications */
  hsc: string[];
  /** SI example values for every var except vars[0] */
  example: Record<string, number>;
  checks?: (v: Record<string, number>) => Issue[];
  priority?: number;
  chainCost?: number;
  /** skip in the automatic chain solver unless one of these topics is detected */
  contextOnly?: TopicId[];
  identity?: boolean;
  unlessKnown?: string[];
  /** hide from the automatic chain solver (only for manual use) */
  manualOnly?: boolean;
}

export function v(
  key: string,
  latex: string,
  name: string,
  quantity: QuantityId,
  opts: Partial<Omit<VarDef, 'key' | 'latex' | 'name' | 'quantity'>> = {},
): VarDef {
  return { key, latex, name, quantity, concept: opts.concept ?? key, ...opts };
}
