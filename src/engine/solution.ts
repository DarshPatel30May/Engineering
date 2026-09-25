/**
 * Solution data model shared by every solver (single formula, chain, tools). The UI
 * renders this in either Quick or Full HSC Working mode.
 */
import type { Issue, ModuleId } from './formulas/types';

export interface GivenItem {
  symbolLatex: string;
  name: string;
  /** value as entered, e.g. "8 kN" */
  raw: string;
  valueSI: number;
  quantity: string;
  /** unit as entered */
  unit: string;
  /** significant figures of the entered value */
  sf?: number;
  constant?: boolean;
}

export interface Step {
  title: string;
  formulaId?: string;
  formulaName?: string;
  /** the formula as normally written */
  formulaLatex: string;
  /** rearranged form (omitted when the unknown is already the subject) */
  rearrangedLatex?: string;
  substitutionLatex?: string;
  /** full-precision (4 s.f.) intermediate result */
  resultLatex: string;
  unitCheckLatex?: string;
  unitCheckOk?: boolean;
  resultSI?: number;
  quantity?: string;
  symbolLatex?: string;
  name?: string;
  note?: string;
  /** free-form extra lines of LaTeX working (e.g. ΣM equations) */
  workingLatex?: string[];
  /** plain text explanation */
  explanation?: string;
}

export interface FinalAnswer {
  symbolLatex: string;
  name: string;
  valueSI: number;
  quantity: string;
  /** optional description such as "(tension)" */
  suffix?: string;
}

export interface Solution {
  ok: boolean;
  title: string;
  module?: ModuleId;
  topic?: string;
  given: GivenItem[];
  find: { symbolLatex: string; name: string }[];
  conversions: string[];
  steps: Step[];
  finals: FinalAnswer[];
  issues: Issue[];
  explanation: string[];
  /** sig figs detected from inputs (for auto mode) */
  inputSigFigs: number[];
  /** optional structured payload for diagrams (beam SFD/BMD, truss…) */
  diagram?: unknown;
  /** optional table output (truth tables, member forces) */
  tables?: { title: string; headers: string[]; rows: string[][] }[];
}

export function emptySolution(title: string): Solution {
  return { ok: false, title, given: [], find: [], conversions: [], steps: [], finals: [], issues: [], explanation: [], inputSigFigs: [] };
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
