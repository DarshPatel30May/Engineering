import { useEffect, useMemo, useState } from 'react';
import { fmt } from '../engine/format';
import { getFormula } from '../engine/formulas';
import { getQuantity } from '../engine/quantities';
import { parseUnit } from '../engine/units';
import { solveFormula, RawInput } from '../engine/solver';
import { navigate } from '../router';
import { useSettings } from '../settings';
import { defaultUnit, parseNumber, QuantityInput, QValue } from './QuantityInput';
import { SolutionView } from './SolutionView';
import { Tex } from './Tex';

const SHEET_LABEL = { yes: 'On formula sheet', derived: 'Derived from sheet formulae', no: 'Not on sheet — must know/derive' } as const;

function exampleValues(id: string): Record<string, QValue> {
  const f = getFormula(id);
  const vals: Record<string, number> = { ...f.example };
  f.vars.forEach((x) => {
    if (vals[x.key] === undefined && x.constant !== undefined && x.key !== f.vars[0].key) vals[x.key] = x.constant;
  });
  vals[f.vars[0].key] = f.solve[f.vars[0].key].fn(vals);
  const out = blankValues(id);
  for (const v of f.vars) {
    const unit = out[v.key].unit;
    const si = vals[v.key];
    if (si === undefined) continue;
    const factor = unit === '' ? 1 : parseUnit(unit).factor;
    out[v.key] = { raw: String(Number((si / factor).toPrecision(6))), unit };
  }
  return out;
}

export function FormulaCalculator({ formulaId, initialUnknown }: { formulaId: string; initialUnknown?: string }) {
  const f = getFormula(formulaId);
  const { sf } = useSettings();
  const [unknown, setUnknown] = useState<string>(initialUnknown ?? f.vars[0].key);
  const [vals, setVals] = useState<Record<string, QValue>>(() => blankValues(formulaId));

  useEffect(() => {
    setUnknown(initialUnknown ?? f.vars[0].key);
    setVals(blankValues(formulaId));
  }, [formulaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const solution = useMemo(() => {
    const inputs: Record<string, RawInput> = {};
    let any = false;
    for (const v of f.vars) {
      if (v.key === unknown) continue;
      const q = vals[v.key];
      if (!q) continue;
      const n = parseNumber(q.raw);
      if (q.raw.trim() !== '') any = true;
      inputs[v.key] = { value: n, unit: q.unit, raw: q.raw.trim() };
    }
    if (!any) return null;
    return solveFormula(f, unknown, inputs, 4);
  }, [f, unknown, vals, sf]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = f.vars.find((v) => v.key === unknown)!;
  const solver = f.solve[unknown];

  return (
    <div className="calc">
      <div className="calc-inputs">
        <div className="panel">
          <div className="panel-head">
            <h2>{f.name}</h2>
            <span className={`tag ${f.sheet === 'yes' ? 'ok' : f.sheet === 'derived' ? 'cyan' : ''}`}>{SHEET_LABEL[f.sheet]}</span>
            {f.extension && <span className="tag warn">extension</span>}
          </div>
          <div className="panel-body stack">
            <div className="eq-display"><Tex tex={f.equation} display /></div>
            <div>
              <div className="ctl-label" style={{ marginBottom: 6 }}>Solve for</div>
              <div className="unknown-picker">
                {f.vars.map((v) => (
                  <button key={v.key} className={v.key === unknown ? 'on' : ''} onClick={() => setUnknown(v.key)} title={v.name}>
                    <Tex tex={v.latex} />
                  </button>
                ))}
              </div>
            </div>
            <div className="info-block">
              <Tex tex={`\\displaystyle ${target.latex} = ${solver.expr.replace(/#([A-Za-z_][A-Za-z0-9_]*)/g, (_m, k: string) => `{${f.vars.find((x) => x.key === k)?.latex ?? k}}`)}`} />
              {solver.note ? <span className="faint"> — {solver.note}</span> : null}
            </div>
            <div className="stack" style={{ gap: 12 }}>
              {f.vars
                .filter((v) => v.key !== unknown)
                .map((v) => (
                  <QuantityInput
                    key={v.key}
                    symbol={v.latex}
                    name={v.name}
                    quantity={v.quantity}
                    constant={v.constant !== undefined}
                    placeholder={v.constant !== undefined ? fmt(displayConstant(v.quantity, v.constant), 6) : 'value'}
                    value={vals[v.key] ?? { raw: '', unit: defaultUnit(v.quantity) }}
                    onChange={(nv) => setVals((p) => ({ ...p, [v.key]: nv }))}
                  />
                ))}
            </div>
            <div className="row">
              <button className="btn small" onClick={() => setVals(exampleValues(formulaId))}>Load example</button>
              <button className="btn small ghost" onClick={() => setVals(blankValues(formulaId))}>Clear</button>
              <button className="btn small ghost" onClick={() => navigate(`library/${f.id}`)}>Formula details</button>
            </div>
            <div className="info-block">
              <strong>When used:</strong> {f.when}
              {f.hsc.length > 0 && (
                <>
                  <br />
                  <strong>HSC applications:</strong> {f.hsc.join('; ')}.
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <SolutionView solution={solution} />
    </div>
  );
}

function displayConstant(quantity: string, c: number): number {
  const k = getQuantity(quantity);
  if (k.percent) return c * 100;
  return c;
}

function blankValues(id: string): Record<string, QValue> {
  const f = getFormula(id);
  const out: Record<string, QValue> = {};
  for (const v of f.vars) {
    const k = getQuantity(v.quantity);
    const unit = v.constant !== undefined && k.si && !k.percent && k.units.includes(k.si) ? k.si : defaultUnit(v.quantity);
    out[v.key] = { raw: '', unit };
  }
  return out;
}
