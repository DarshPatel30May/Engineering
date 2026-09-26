/**
 * Solution data model shared by every solver (single formula, chain, tools). The UI renders
 * it in either Quick or Full HSC Working mode.
 */
import type { Issue, ModuleId, TopicId } from './formulas/types';

export interface GivenItem {
  symbolLatex: string;
  name: string;
  /** value as entered, e.g. "8 kN" */
  raw: string;
  valueSI: number;
  quantity: string;
  unit: string;
  sf?: number;
  /** value came from the data sheet / a default rather than the question */
  constant?: boolean;
  source?: string;
}

export interface Step {
  title: string;
  formulaId?: string;
  formulaName?: string;
  formulaLatex: string;
  /** derivation lines shown before the rearrangement */
  derivationLatex?: string[];
  rearrangedLatex?: string;
  substitutionLatex?: string;
  resultLatex: string;
  unitCheckLatex?: string;
  unitCheckOk?: boolean;
  resultSI?: number;
  quantity?: string;
  symbolLatex?: string;
  name?: string;
  note?: string;
  workingLatex?: string[];
  explanation?: string;
}

export interface FinalAnswer {
  symbolLatex: string;
  name: string;
  valueSI: number;
  quantity: string;
  /** force a display unit (e.g. the unit the amount was given in) */
  unit?: string;
  suffix?: string;
  /** direction statement accompanying the magnitude */
  direction?: string;
}

export interface DirectionNote {
  title: string;
  lines: string[];
  /** optional vector-diagram payload */
  diagram?: { kind: 'rhr'; v: [number, number, number]; B: [number, number, number]; F: [number, number, number]; labels?: string[] };
}

export interface GraphSeries {
  label: string;
  points: [number, number][];
  dashed?: boolean;
}

export interface GraphSpec {
  title: string;
  xLabel: string;
  yLabel: string;
  series: GraphSeries[];
  markers?: { x: number; y: number; label: string }[];
  yZero?: boolean;
}

export interface Solution {
  ok: boolean;
  title: string;
  module?: ModuleId;
  topic?: TopicId;
  given: GivenItem[];
  find: { symbolLatex: string; name: string }[];
  conversions: string[];
  assumptions: string[];
  steps: Step[];
  finals: FinalAnswer[];
  directions: DirectionNote[];
  issues: Issue[];
  explanation: string[];
  inputSigFigs: number[];
  graph?: GraphSpec;
  tables?: { title: string; headers: string[]; rows: string[][] }[];
}

export function emptySolution(title: string): Solution {
  return { ok: false, title, given: [], find: [], conversions: [], assumptions: [], steps: [], finals: [], directions: [], issues: [], explanation: [], inputSigFigs: [] };
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
