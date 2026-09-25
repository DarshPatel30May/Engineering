/**
 * Central formula registry. Every calculator, the chain solver, the smart interpreter,
 * the formula library and the tests read from this single list.
 */
import { aeroFormulas } from './aero';
import { civilFormulas } from './civil';
import { mechanicsFormulas } from './mechanics';
import { telecomFormulas } from './telecom';
import { transportFormulas } from './transport';
import type { FormulaDef, ModuleId, VarDef } from './types';

export * from './types';

export const FORMULAS: FormulaDef[] = [...civilFormulas, ...mechanicsFormulas, ...transportFormulas, ...aeroFormulas, ...telecomFormulas];

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
  return FORMULAS.filter((f) => f.modules.includes(m));
}

/** Simple ranked text search across name, aliases, topic, variables. */
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
      return { f, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.f);
}
