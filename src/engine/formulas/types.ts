import type { QuantityId } from '../quantities';

export type ModuleId = 'civil' | 'transport' | 'aero' | 'telecom';

export const MODULE_NAMES: Record<ModuleId, string> = {
  civil: 'Civil Structures',
  transport: 'Personal & Public Transport',
  aero: 'Aeronautical Engineering',
  telecom: 'Telecommunications Engineering',
};

export interface VarDef {
  /** local key used in templates (#key) and solver functions */
  key: string;
  /** global concept id shared across formulas (defaults to key) */
  concept: string;
  latex: string;
  name: string;
  quantity: QuantityId;
  /** constant with default SI value (e.g. g) — auto-filled, still overridable */
  constant?: number;
  positive?: boolean;
  nonNegative?: boolean;
  nonZero?: boolean;
  integer?: boolean;
  /** hard limits (SI) */
  min?: number;
  max?: number;
  /** soft limits: produce a warning, not an error */
  warnAbove?: number;
  warnBelow?: number;
  warnText?: string;
}

export interface SolveDef {
  /** LaTeX RHS with #key placeholders */
  expr: string;
  fn: (v: Record<string, number>) => number;
  /** extra remark shown with the rearrangement (e.g. "taking the positive root") */
  note?: string;
}

export type SheetStatus = 'yes' | 'derived' | 'no';

export interface Issue {
  level: 'error' | 'warning';
  message: string;
}

export interface FormulaDef {
  id: string;
  name: string;
  modules: ModuleId[];
  topic: string;
  /** equation in LaTeX */
  equation: string;
  vars: VarDef[];
  solve: Record<string, SolveDef>;
  aliases: string[];
  /** when the formula is used */
  when: string;
  /** Formula-sheet status: yes = printed on the NESA sheet, derived = rearrangement/combination of sheet formulae, no = must be known/derived by student */
  sheet: SheetStatus;
  /** category label for the library */
  source: string;
  /** typical past-HSC applications */
  hsc: string[];
  /** Example SI values for every var except vars[0] (used by tests and "load example") */
  example: Record<string, number>;
  /** cross-variable validity checks run on the full solved set */
  checks?: (v: Record<string, number>) => Issue[];
  /** ordering preference in the chain solver (higher first). identities are low. */
  priority?: number;
  /** explicit cost in the chain solver (default ≈ 1 per step) — raise to prefer multi-step HSC working */
  chainCost?: number;
  /** only use in the automatic chain solver when one of these modules is detected */
  contextOnly?: ModuleId[];
  /** beyond core HSC scope but occasionally useful */
  extension?: boolean;
  /** bridging identity used only by the chain solver (hidden from the library) */
  identity?: boolean;
  /** chain solver: skip this formula if any of these concepts are known */
  unlessKnown?: string[];
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

export const G_DEFAULT = 9.81;
export const C_LIGHT = 3.0e8;

/** Standard g variable (constant, overridable). */
export const gVar = () => v('g', 'g', 'Gravitational acceleration', 'acceleration', { constant: G_DEFAULT, positive: true });
export const cVar = () => v('c', 'c', 'Speed of light in vacuum', 'velocity', { constant: C_LIGHT, positive: true });
