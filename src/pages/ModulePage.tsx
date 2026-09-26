import { FormulaCalculator } from '../components/FormulaCalculator';
import { MODULE_CATALOG, TOOL_NAMES, CatalogItem } from '../data/modules';
import { getFormula } from '../engine/formulas';
import type { ModuleId } from '../engine/formulas/types';
import { navigate } from '../router';
import { ToolView } from './ToolPage';

const keyOf = (it: CatalogItem) => (it.kind === 'formula' ? `f-${it.id}` : `t-${it.id}`);

export function ModulePage({ module, itemKey }: { module: ModuleId; itemKey?: string }) {
  const cats = MODULE_CATALOG[module];
  const all = cats.flatMap((c) => c.items);
  const current = all.find((it) => keyOf(it) === itemKey) ?? all[0];
  return (
    <div className="module-layout">
      <div className="panel cat-list">
        {cats.map((c) => (
          <div className="cat" key={c.title}>
            <div className="cat-title">{c.title}</div>
            {c.items.map((it) => {
              const k = keyOf(it);
              const label = it.kind === 'formula' ? getFormula(it.id).name : TOOL_NAMES[it.id];
              return (
                <button key={c.title + k} className={`cat-item${keyOf(current) === k ? ' on' : ''}`} onClick={() => navigate(`module/${module}/${k}`)}>
                  {label}
                  {it.kind === 'tool' && <span className="kind">TOOL</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div>{current.kind === 'formula' ? <FormulaCalculator key={current.id} formulaId={current.id} /> : <ToolView id={current.id} />}</div>
    </div>
  );
}
