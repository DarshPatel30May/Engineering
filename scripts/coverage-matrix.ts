/**
 * Generates docs/COVERAGE.md — the coverage matrix — directly from the central formula
 * registry and tool catalogue, so the documentation can never drift from the code.
 *   npm run coverage-matrix
 */
import { writeFileSync } from 'node:fs';
import { FORMULAS } from '../src/engine/formulas';
import { MODULE_NAMES, ModuleId } from '../src/engine/formulas/types';
import { getQuantity } from '../src/engine/quantities';
import { MODULE_CATALOG, TOOL_NAMES } from '../src/data/modules';

const strip = (t: string) =>
  t
    .replace(/\\(?:t|d)?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\\left|\\right|\\,|\\;/g, '')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\(sigma|varepsilon|mu|eta|rho|lambda|theta|phi|gamma|tau|omega|alpha|pi|Delta|Sigma|parallel)/g, (_m, g: string) => ({ sigma: 'σ', varepsilon: 'ε', mu: 'μ', eta: 'η', rho: 'ρ', lambda: 'λ', theta: 'θ', phi: 'φ', gamma: 'γ', tau: 'τ', omega: 'ω', alpha: 'α', pi: 'π', Delta: 'Δ', Sigma: 'Σ', parallel: '∥' })[g] ?? g)
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\(sin|cos|tan|log)/g, '$1')
    .replace(/_\{([^{}]*)\}/g, '_$1')
    .replace(/\^\{([^{}]*)\}/g, '^$1')
    .replace(/[{}]/g, '')
    .replace(/\\%/g, '%')
    .replace(/\|/g, '\\|');

const rearr = (fId: string) => {
  const f = FORMULAS.find((x) => x.id === fId)!;
  return f.vars
    .map((v) => `${strip(v.latex)} = ${strip(f.solve[v.key].expr.replace(/#([A-Za-z_][A-Za-z0-9_]*)/g, (_m, k: string) => f.vars.find((x) => x.key === k)!.latex))}`)
    .join('; ');
};

const lines: string[] = [];
lines.push('# HSC Engineering Studies — calculation coverage matrix');
lines.push('');
lines.push('_Generated from `src/engine/formulas` by `npm run coverage-matrix`. Do not edit by hand._');
lines.push('');
lines.push(`Formulas: **${FORMULAS.length}**, every variable solvable (${FORMULAS.reduce((s, f) => s + f.vars.length, 0)} rearrangements, all verified by automated round-trip and dimensional tests).`);
lines.push('');
lines.push('Sheet column: **yes** = expected on the NESA Engineering Studies formulae sheet; **derived** = a rearrangement/combination of sheet formulae; **no** = must be known or derived by the student (HSC-relevant, or marked _extension_). Formula-sheet status is based on the author’s knowledge of the NESA sheet — verify against the current official sheet.');
lines.push('');
for (const m of Object.keys(MODULE_NAMES) as ModuleId[]) {
  lines.push(`## ${MODULE_NAMES[m]}`);
  lines.push('');
  for (const cat of MODULE_CATALOG[m]) {
    lines.push(`### ${cat.title}`);
    lines.push('');
    const tools = cat.items.filter((i) => i.kind === 'tool');
    if (tools.length) lines.push(`Multi-step tools: ${tools.map((t) => `**${TOOL_NAMES[t.id as keyof typeof TOOL_NAMES]}**`).join(', ')}`), lines.push('');
    const fs = cat.items.filter((i) => i.kind === 'formula').map((i) => FORMULAS.find((f) => f.id === i.id)!);
    if (!fs.length) continue;
    lines.push('| Calculation | Formula | Variables (SI) | Common HSC units | Rearranged forms | Sheet | Past-HSC style applications |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const f of fs) {
      const vars = f.vars.map((v) => `${strip(v.latex)} ${v.name} [${getQuantity(v.quantity).si || '–'}]`).join('; ');
      const units = [...new Set(f.vars.flatMap((v) => getQuantity(v.quantity).units.filter(Boolean)))].join(', ');
      lines.push(`| ${f.name}${f.extension ? ' _(extension)_' : ''} | ${strip(f.equation)} | ${vars} | ${units} | ${rearr(f.id)} | ${f.sheet} | ${f.hsc.join('; ')} |`);
    }
    lines.push('');
  }
}
writeFileSync(new URL('../docs/COVERAGE.md', import.meta.url), lines.join('\n') + '\n');
console.log(`Wrote docs/COVERAGE.md (${FORMULAS.length} formulas)`);
