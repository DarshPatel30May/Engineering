/**
 * Central formula registry. Every calculator, the chain solver, the Smart Solver, the
 * formula library and the tests read from this single list.
 */
import { m5Formulas } from './m5';
import { m6Formulas } from './m6';
import { m7Formulas } from './m7';
import { m8Formulas } from './m8';
import type { FormulaDef, ModuleId, TopicId, VarDef } from './types';

export * from './types';

export const FORMULAS: FormulaDef[] = [...m5Formulas, ...m6Formulas, ...m7Formulas, ...m8Formulas];

const BY_ID = new Map(FORMULAS.map((f) => [f.id, f]));

export function getFormula(id: string): FormulaDef {
  const f = BY_ID.get(id);
  if (!f) throw new Error(`Unknown formula "${id}"`);
  return f;
}

export function findFormula(id: string): FormulaDef | undefined {
  return BY_ID.get(id);
}

export function getVar(f: FormulaDef, key: string): VarDef {
  const vd = f.vars.find((x) => x.key === key);
  if (!vd) throw new Error(`Formula ${f.id} has no variable ${key}`);
  return vd;
}

export function formulasForModule(m: ModuleId): FormulaDef[] {
  return FORMULAS.filter((f) => f.module === m);
}

export function formulasForTopic(t: TopicId): FormulaDef[] {
  return FORMULAS.filter((f) => f.topic === t || f.alsoIn?.includes(t));
}

/** Ranked text search across name, aliases, topic, variables, equation. */
export function searchFormulas(query: string, module?: ModuleId | 'all'): FormulaDef[] {
  const q = query.trim().toLowerCase();
  const pool = module && module !== 'all' ? formulasForModule(module) : FORMULAS;
  if (!q) return pool;
  const terms = q.split(/\s+/);
  const scored = pool
    .map((f) => {
      const hay = [f.name, f.topic, f.when, f.equation, ...f.aliases, ...f.vars.map((v) => v.name), ...f.hsc].join(' ').toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (!hay.includes(t)) return { f, score: -1 };
        if (f.name.toLowerCase().includes(t)) score += 5;
        if (f.aliases.some((a) => a.toLowerCase().includes(t))) score += 4;
        if (f.topic.toLowerCase().includes(t)) score += 2;
        score += 1;
      }
      if (f.sheet === 'extension') score -= 3;
      return { f, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.f);
}

/** Update the default value of g used by every formula (NESA data sheet: 9.8 m s⁻²). */
export function setGravity(g: number) {
  for (const f of FORMULAS) for (const v of f.vars) if (v.concept === 'g') v.constant = g;
}

export function currentGravity(): number {
  for (const f of FORMULAS) for (const v of f.vars) if (v.concept === 'g' && v.constant !== undefined) return v.constant;
  return 9.8;
}
