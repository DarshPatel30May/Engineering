import { Fragment } from 'react';
import { displayValue, equivalents, fmt, resolveSigFigs } from '../engine/format';
import { getQuantity } from '../engine/quantities';
import type { FinalAnswer, Solution } from '../engine/solution';
import { useSettings } from '../settings';
import { BeamDiagram, SectionDiagram, StressStrainChart, TrussDiagram } from './Diagrams';
import { Tex } from './Tex';

function FinalRow({ f, sf }: { f: FinalAnswer; sf: number }) {
  const k = getQuantity(f.quantity);
  const dv = displayValue(f.valueSI, f.quantity, sf);
  const showEquivs = k.units.filter(Boolean).length > 1;
  const eqs = showEquivs ? equivalents(f.valueSI, f.quantity, sf) : [];
  const extra = k.angle ? '' : k.percent ? ` (${fmt(f.valueSI, sf)} as a decimal)` : '';
  return (
    <div className="final-row">
      <div className="final-main">
        <Tex tex={`${f.symbolLatex} = ${dv.latex}`} />
      </div>
      <div className="final-name">
        {f.name}
        {f.suffix ? <span className="tag cyan" style={{ marginLeft: 8 }}>{f.suffix}</span> : null}
        {extra}
      </div>
      {eqs.length > 0 && (
        <div className="equivs">
          {eqs.map((e) => (
            <span key={e.unit} className={`equiv${e.hsc ? ' hsc' : ''}`} title={e.hsc ? 'Unit normally expected in an HSC answer' : undefined}>
              {e.text}
              {e.hsc ? ' ★' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Line({ label, tex, cls }: { label: string; tex?: string; cls?: string }) {
  if (!tex) return null;
  return (
    <div className={`step-line ${cls ?? ''}`}>
      <div className="lbl">{label}</div>
      <div className="val">
        <Tex tex={`\\displaystyle ${tex}`} />
      </div>
    </div>
  );
}

export function SolutionView({ solution, compact }: { solution: Solution | null; compact?: boolean }) {
  const { mode, sf: sfMode } = useSettings();
  if (!solution) return <div className="empty">Enter values to see the working.</div>;
  const sf = resolveSigFigs(sfMode, solution.inputSigFigs);
  const errors = solution.issues.filter((i) => i.level === 'error');
  const warnings = solution.issues.filter((i) => i.level === 'warning');
  const full = mode === 'full';
  const d = solution.diagram as { kind?: string } | undefined;
  return (
    <div className="solution">
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="issues">
          {errors.map((i, n) => (
            <div key={'e' + n} className="issue error">✖ {i.message}</div>
          ))}
          {warnings.map((i, n) => (
            <div key={'w' + n} className="issue warning">⚠ {i.message}</div>
          ))}
        </div>
      )}

      {solution.finals.length > 0 && (
        <div className="final-card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Final answer{solution.finals.length > 1 ? 's' : ''}</span>
            <span className="faint small">{sfMode === 'full' ? 'full precision' : `${sf} s.f.`} · ★ = usual HSC unit</span>
          </div>
          {solution.finals.map((f, i) => (
            <FinalRow key={i} f={f} sf={sf} />
          ))}
        </div>
      )}

      {d?.kind === 'beam' && <BeamDiagram data={solution.diagram as never} />}
      {d?.kind === 'truss' && <TrussDiagram data={solution.diagram as never} />}
      {d?.kind === 'section' && <SectionDiagram data={solution.diagram as never} />}
      {d?.kind === 'stressStrain' && <StressStrainChart data={solution.diagram as never} />}

      {full && !compact && solution.given.length > 0 && (
        <div className="work-section">
          <div className="ws-head">Given</div>
          <div className="ws-body">
            <table className="given-table">
              <tbody>
                {solution.given.map((g, i) => (
                  <tr key={i}>
                    <td className="g-sym"><Tex tex={g.symbolLatex} /></td>
                    <td className="g-val">{g.raw}</td>
                    <td className="muted small">{g.name}{g.constant ? ' (standard value)' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {full && !compact && solution.find.length > 0 && (
        <div className="work-section">
          <div className="ws-head">Find</div>
          <div className="ws-body row">
            {solution.find.map((f, i) => (
              <span key={i} className="tag accent">
                <Tex tex={f.symbolLatex} /> {f.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {full && solution.conversions.length > 0 && (
        <div className="work-section">
          <div className="ws-head">Unit conversions (to coherent SI)</div>
          <div className="ws-body">
            {solution.conversions.map((c, i) => (
              <div key={i} style={{ padding: '2px 0' }}>
                <Tex tex={c} />
              </div>
            ))}
          </div>
        </div>
      )}

      {solution.steps.length > 0 && (
        <div className="work-section">
          <div className="ws-head">
            {full ? 'Working' : 'Quick working'}
            {solution.steps.length > 1 && <span className="tag">{solution.steps.length} steps</span>}
          </div>
          <div className="ws-body">
            {solution.steps.map((s, i) => (
              <div className="step" key={i}>
                <div className="step-title">{s.title}</div>
                <Line label="Formula" tex={s.formulaLatex} />
                {full && <Line label="Rearrange" tex={s.rearrangedLatex} />}
                <Line label="Substitute" tex={s.substitutionLatex} />
                {s.workingLatex?.map((w, j) => (
                  <Line key={j} label={j === 0 ? 'Working' : ''} tex={w} />
                ))}
                <Line label="Result" tex={s.resultLatex || undefined} cls="result" />
                {full && s.unitCheckLatex && (
                  <div className="step-line">
                    <div className="lbl">Unit check</div>
                    <div className={`val ${s.unitCheckOk ? 'check-ok' : 'check-bad'}`}>
                      <Tex tex={s.unitCheckLatex} />
                    </div>
                  </div>
                )}
                {full && (s.note || s.explanation) && (
                  <div className="step-line">
                    <div className="lbl">Note</div>
                    <div className="val step-note">
                      {[s.note && `(${s.note})`, s.explanation].filter(Boolean).join(' ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {solution.tables?.map((t, i) => (
        <div className="work-section" key={i}>
          <div className="ws-head">{t.title}</div>
          <div className="ws-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {t.headers.map((h, j) => (
                    <th key={j}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, j) => (
                  <tr key={j}>
                    {r.map((c, k) => (
                      <td key={k}>{/[\\^_{}]/.test(c) ? <Tex tex={c} /> : c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {full && solution.explanation.length > 0 && (
        <div className="work-section">
          <div className="ws-head">HSC explanation</div>
          <div className="ws-body">
            {solution.explanation.map((e, i) => (
              <Fragment key={i}>
                <p style={{ margin: '4px 0' }} className="muted">{e}</p>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
