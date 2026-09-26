import { useMemo, useState } from 'react';
import { FormulaCalculator } from '../components/FormulaCalculator';
import { Tex } from '../components/Tex';
import { MODULE_CATALOG } from '../data/modules';
import { FORMULAS, getFormula, searchFormulas } from '../engine/formulas';
import { MODULE_NAMES, ModuleId } from '../engine/formulas/types';
import { getQuantity } from '../engine/quantities';
import { navigate } from '../router';

const SHEET = { yes: ['ok', 'Formula sheet'], derived: ['cyan', 'Derived'], no: ['', 'Not on sheet'] } as const;

function rearranged(fId: string, key: string): string {
  const f = getFormula(fId);
  const vd = f.vars.find((v) => v.key === key)!;
  const expr = f.solve[key].expr.replace(/#([A-Za-z_][A-Za-z0-9_]*)(\^)?/g, (_m, k: string, pow?: string) => {
    const l = f.vars.find((x) => x.key === k)?.latex ?? k;
    return pow ? `{${l}}^` : l;
  });
  return `${vd.latex} = ${expr}`;
}

function Detail({ id }: { id: string }) {
  const f = getFormula(id);
  const [sheet, cls] = [SHEET[f.sheet][1], SHEET[f.sheet][0]];
  const inModules = (Object.keys(MODULE_CATALOG) as ModuleId[]).filter((m) => MODULE_CATALOG[m].some((c) => c.items.some((it) => it.kind === 'formula' && it.id === id)));
  return (
    <div className="stack">
      <div className="row">
        <button className="btn small" onClick={() => navigate('library')}>← All formulas</button>
        {inModules.map((m) => (
          <a key={m} className="tag accent" href={`#/module/${m}/f-${id}`}>{MODULE_NAMES[m]} ↗</a>
        ))}
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2>{f.name}</h2>
          <span className={`tag ${cls}`}>{sheet}</span>
          <span className="tag">{f.topic}</span>
          {f.extension && <span className="tag warn">extension</span>}
        </div>
        <div className="panel-body stack">
          <div className="eq-display"><Tex tex={f.equation} display /></div>
          <div className="grid-2">
            <div>
              <div className="ctl-label">Variables</div>
              <table className="data-table var-table">
                <thead>
                  <tr><th>Symbol</th><th>Meaning</th><th>SI unit</th><th>Common HSC units</th></tr>
                </thead>
                <tbody>
                  {f.vars.map((v) => {
                    const k = getQuantity(v.quantity);
                    return (
                      <tr key={v.key}>
                        <td><Tex tex={v.latex} /></td>
                        <td>{v.name}{v.constant !== undefined ? ` (default ${v.constant})` : ''}</td>
                        <td>{k.si || '—'}</td>
                        <td>{k.units.filter(Boolean).join(', ') || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <div className="ctl-label">All rearrangements</div>
              {f.vars.map((v) => (
                <div key={v.key} style={{ padding: '3px 0' }}>
                  <Tex tex={`\\displaystyle ${rearranged(id, v.key)}`} />
                  {f.solve[v.key].note && <span className="faint small"> ({f.solve[v.key].note})</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="info-block"><strong>When used:</strong> {f.when}</div>
          {f.hsc.length > 0 && <div className="info-block"><strong>Typical HSC applications:</strong> {f.hsc.join('; ')}.</div>}
          <div className="info-block"><strong>Also known as:</strong> {f.aliases.join(', ')}</div>
          <div className="info-block"><strong>Category:</strong> {f.source}</div>
        </div>
      </div>
      <FormulaCalculator key={id} formulaId={id} />
    </div>
  );
}

export function FormulaLibrary({ selected }: { selected?: string }) {
  const [q, setQ] = useState('');
  const [mod, setMod] = useState<ModuleId | 'all'>('all');
  const [view, setView] = useState<'cards' | 'matrix'>('cards');
  const results = useMemo(() => searchFormulas(q, mod), [q, mod]);
  if (selected && FORMULAS.some((f) => f.id === selected)) return <Detail key={selected} id={selected} />;
  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-body row">
          <input type="text" placeholder="Search formulas — e.g. stress, modulus, friction, Bernoulli, decibel, FoS…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 240 }} autoFocus />
          <select value={mod} onChange={(e) => setMod(e.target.value as ModuleId | 'all')}>
            <option value="all">All modules</option>
            {(Object.keys(MODULE_NAMES) as ModuleId[]).map((m) => (
              <option key={m} value={m}>{MODULE_NAMES[m]}</option>
            ))}
          </select>
          <div className="seg">
            <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>Cards</button>
            <button className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}>Coverage matrix</button>
          </div>
          <span className="faint small">{results.length} formulas · every variable solvable</span>
        </div>
      </div>
      {view === 'cards' ? (
        <div className="lib-grid">
          {results.map((f) => (
            <div key={f.id} className="panel lib-card" onClick={() => navigate(`library/${f.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`library/${f.id}`)}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h4>{f.name}</h4>
                <span className={`tag ${SHEET[f.sheet][0]}`}>{SHEET[f.sheet][1]}</span>
              </div>
              <div className="eq"><Tex tex={`\\displaystyle ${f.equation}`} /></div>
              <div className="faint small">{f.topic} · {f.modules.map((m) => MODULE_NAMES[m].split(' ')[0]).join(', ')}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Module(s)</th><th>Topic</th><th>Calculation</th><th>Formula</th><th>Variables (SI)</th><th>Common HSC units</th><th>Rearranged forms</th><th>Sheet</th><th>Past-HSC style applications</th>
              </tr>
            </thead>
            <tbody>
              {results.map((f) => (
                <tr key={f.id} onClick={() => navigate(`library/${f.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontFamily: 'var(--sans)' }}>{f.modules.map((m) => MODULE_NAMES[m].split(' ')[0]).join(', ')}</td>
                  <td style={{ fontFamily: 'var(--sans)' }}>{f.topic}</td>
                  <td style={{ fontFamily: 'var(--sans)' }}>{f.name}</td>
                  <td><Tex tex={f.equation} /></td>
                  <td style={{ fontFamily: 'var(--sans)' }}>{f.vars.map((v) => `${v.latex.replace(/\\/g, '').replace(/[{}]/g, '')} [${getQuantity(v.quantity).si || '–'}]`).join(', ')}</td>
                  <td style={{ fontFamily: 'var(--sans)' }}>{[...new Set(f.vars.flatMap((v) => getQuantity(v.quantity).units.filter(Boolean)))].join(', ')}</td>
                  <td>{f.vars.length} forms</td>
                  <td style={{ fontFamily: 'var(--sans)' }}>{SHEET[f.sheet][1]}</td>
                  <td style={{ fontFamily: 'var(--sans)' }}>{f.hsc.join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
