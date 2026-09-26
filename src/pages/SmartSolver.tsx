import { useMemo, useState } from 'react';
import { SolutionView } from '../components/SolutionView';
import { Tex } from '../components/Tex';
import { CONCEPTS, getConcept } from '../engine/concepts';
import { MODULE_NAMES } from '../engine/formulas/types';
import { interpret, Interpretation } from '../engine/interpreter/interpret';
import { solveInterpretation } from '../engine/interpreter/solve';
import { getQuantity } from '../engine/quantities';
import { dimEq } from '../engine/units';
import { navigate, setPendingTool } from '../router';
import { useSettings } from '../settings';
import { TOOL_NAMES, ToolId } from '../data/modules';

const EXAMPLES: { m: string; q: string }[] = [
  { m: 'Civil', q: 'A steel rod with a diameter of 20 mm is subjected to a tensile load of 50 kN. Calculate the stress in the rod.' },
  { m: 'Civil', q: "A 2 m long steel bar with a cross-sectional area of 200 mm² extends by 0.5 mm under a load of 10 kN. Determine the Young's modulus of the steel." },
  { m: 'Civil', q: 'A cable has an ultimate tensile strength of 400 MPa and a factor of safety of 4 is used. It carries a load of 20 kN. Calculate the minimum cross-sectional area required.' },
  { m: 'Civil', q: 'A simply supported beam 6 m long carries a point load of 12 kN at 2 m from the left support and a uniformly distributed load of 4 kN/m over the whole span. Calculate the reactions and the maximum bending moment.' },
  { m: 'Civil', q: 'A cantilever beam 2 m long carries a load of 5 kN at its free end. The beam has I = 8 × 10^6 mm^4 and y = 100 mm. Calculate the maximum bending stress.' },
  { m: 'Civil', q: 'Calculate the shear stress in a 25 mm diameter pin in double shear carrying a load of 40 kN.' },
  { m: 'Civil', q: 'Water behind a dam is 25 m deep. Calculate the pressure at the base of the dam.' },
  { m: 'Transport', q: 'A car of mass 1200 kg travelling at 72 km/h brakes to a stop in 40 m. Calculate the average braking force.' },
  { m: 'Transport', q: 'A block of mass 20 kg rests on a plane inclined at 30°. The coefficient of friction is 0.3. Calculate the force parallel to the plane required to push the block up the plane.' },
  { m: 'Transport', q: 'A pulley system has a velocity ratio of 4. An effort of 300 N raises a load of 1000 N. Calculate the efficiency.' },
  { m: 'Transport', q: 'A hydraulic jack has a small piston of diameter 20 mm and a large piston of diameter 100 mm. A force of 200 N is applied to the small piston. Calculate the force on the large piston.' },
  { m: 'Transport', q: 'An engine produces a torque of 250 N·m at 3000 rpm. Calculate the power.' },
  { m: 'Transport', q: 'A gear with 20 teeth drives a gear with 60 teeth. If the driver rotates at 1200 rpm, calculate the speed of the driven gear.' },
  { m: 'Transport', q: 'Calculate the percentage of pearlite in a 0.4% carbon steel slowly cooled to room temperature.' },
  { m: 'Aero', q: 'An aircraft of mass 60 000 kg is in straight and level flight. Its lift-to-drag ratio is 15. Calculate the thrust required.' },
  { m: 'Aero', q: 'Air flows over the upper surface of a wing at 80 m/s and under the lower surface at 70 m/s. The air density is 1.2 kg/m³ and the wing area is 20 m². Calculate the lift.' },
  { m: 'Aero', q: 'A glider with a lift-to-drag ratio of 30 is at an altitude of 1500 m. How far can it glide in still air?' },
  { m: 'Telecom', q: 'A resistor of 10 Ω is connected in series with a parallel combination of 20 Ω and 30 Ω across a 12 V supply. Calculate the current drawn from the supply.' },
  { m: 'Telecom', q: 'A 240 V heater draws a current of 8 A. Calculate its power and resistance.' },
  { m: 'Telecom', q: 'Calculate the wavelength of a radio signal with a frequency of 100 MHz.' },
  { m: 'Telecom', q: 'The core of an optical fibre has a refractive index of 1.48 and the cladding has a refractive index of 1.46. Calculate the critical angle.' },
  { m: 'Telecom', q: 'A geostationary satellite orbits at an altitude of 35 786 km. Calculate the time delay for a signal travelling up to the satellite and back.' },
  { m: 'Telecom', q: 'Convert 45 to binary and hexadecimal.' },
  { m: 'Telecom', q: "Complete the truth table for X = A.B + C'" },
];

const TOOL_FOR: Record<string, ToolId | undefined> = { beam: 'beam', circuit: 'circuit', incline: 'incline', logic: 'logic', numbase: 'numbase', lever: 'lever', gear: 'gear', truss: 'truss' };

const PIPELINE = ['Module', 'Known values', 'Unknown', 'Formula chain', 'SI units', 'Rearrange', 'Substitute', 'Calculate', 'Unit check', 'Working', 'Answer', 'Equivalents'];

export function SmartSolver() {
  const [text, setText] = useState(EXAMPLES[1].q);
  const [interp, setInterp] = useState<Interpretation | null>(null);
  const { sf } = useSettings();
  const solution = useMemo(() => (interp ? solveInterpretation(interp, 4) : null), [interp, sf]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (t = text) => setInterp(interpret(t));
  const update = (patch: Partial<Interpretation>) => interp && setInterp({ ...interp, ...patch });

  const toolId = interp?.special ? TOOL_FOR[interp.special.type] : undefined;
  const openTool = () => {
    if (!interp?.special || !toolId) return;
    const sp = interp.special;
    const payload = sp.type === 'beam' || sp.type === 'circuit' || sp.type === 'incline' || sp.type === 'gear' ? sp.input : sp.type === 'logic' ? sp.expr : sp.type === 'numbase' ? { value: sp.value, from: sp.from } : sp.type === 'lever' ? sp.C0 : null;
    setPendingTool(toolId, payload);
    navigate(`tool/${toolId}`);
  };

  return (
    <div className="solver-grid">
      <div className="stack">
        <div className="panel question-box">
          <div className="panel-head">
            <h2>HSC question</h2>
            <span className="tag">deterministic engine — no AI arithmetic</span>
          </div>
          <div className="panel-body stack">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run();
              }}
              placeholder="Paste an HSC Engineering Studies calculation question…"
              aria-label="Question text"
            />
            <div className="row">
              <button className="btn primary" onClick={() => run()}>Solve ⏎</button>
              <span className="faint small">Ctrl + Enter</span>
              <span className="spacer" style={{ flex: 1 }} />
              <button className="btn small ghost" onClick={() => { setText(''); setInterp(null); }}>Clear</button>
            </div>
          </div>
        </div>

        {interp && (
          <div className="panel">
            <div className="panel-head">
              <h3>Interpretation</h3>
              <span className="tag cyan">{interp.problemType === 'chain' ? 'formula chain' : `${interp.problemType} tool`}</span>
            </div>
            <div className="panel-body stack">
              <div className="pipeline">
                {PIPELINE.map((p, i) => (
                  <span key={p} className={solution?.ok ? 'done' : ''}>{i + 1}.{p}{i < PIPELINE.length - 1 ? ' ›' : ''}</span>
                ))}
              </div>
              <div className="row">
                <span className="ctl-label">Module</span>
                {interp.modules.length ? interp.modules.map((m) => <span key={m} className="tag accent">{MODULE_NAMES[m]}</span>) : <span className="faint small">not detected</span>}
              </div>
              {interp.special && (
                <div className="row">
                  <span className="ctl-label">Mode</span>
                  <select value={interp.problemType} onChange={(e) => update({ problemType: e.target.value as Interpretation['problemType'] })}>
                    <option value={interp.special.type}>{toolId ? TOOL_NAMES[toolId] : interp.special.type}</option>
                    <option value="chain">General formula chain</option>
                  </select>
                  {toolId && <button className="btn small" onClick={openTool}>Open in tool to edit ↗</button>}
                </div>
              )}
              {interp.problemType === 'chain' && (
                <>
                  <div>
                    <div className="ctl-label" style={{ marginBottom: 4 }}>Known values (edit if misread)</div>
                    {interp.quantities.length === 0 && <div className="faint small">No numbers found.</div>}
                    {interp.quantities.map((q, i) => {
                      const compatible = CONCEPTS.filter((c) => {
                        const k = getQuantity(c.quantity);
                        if (!q.unit) return ['ratio', 'percent', 'count', 'dimensionless'].includes(k.id) || k.angle;
                        if (q.unit === '°') return !!k.angle;
                        if (q.unit === '%') return ['ratio', 'percent'].includes(k.id);
                        return q.dim !== null && !k.angle && dimEq(k.dim, q.dim);
                      });
                      const value = q.ignored ? '__ignore' : q.concept ?? '';
                      return (
                        <div className="interp-q" key={i}>
                          <span className="mono">{q.numText}{q.unit === '°' ? '°' : q.unit ? ' ' + q.unit : ''}</span>
                          <select
                            value={value}
                            onChange={(e) => {
                              const v = e.target.value;
                              const qs = interp.quantities.map((x, j) => (j === i ? { ...x, concept: v === '__ignore' || v === '' ? null : v, ignored: v === '__ignore', confidence: 'high' as const } : x));
                              update({ quantities: qs });
                            }}
                          >
                            <option value="">— choose —</option>
                            <option value="__ignore">— ignore this number —</option>
                            {compatible.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <span className={`conf ${q.ignored ? 'medium' : q.confidence}`} title={`confidence: ${q.confidence}`} />
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <div className="ctl-label" style={{ marginBottom: 4 }}>Find</div>
                    <div className="row">
                      {interp.targets.map((t) => (
                        <span key={t} className="tag accent">
                          <Tex tex={getConcept(t)?.latex ?? t} /> {getConcept(t)?.name}
                          <button className="x-btn" style={{ fontSize: 13 }} onClick={() => update({ targets: interp.targets.filter((x) => x !== t) })}>×</button>
                        </span>
                      ))}
                      <select value="" onChange={(e) => e.target.value && update({ targets: [...interp.targets, e.target.value] })}>
                        <option value="">+ add unknown…</option>
                        {CONCEPTS.filter((c) => !interp.targets.includes(c.id)).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
              {(interp.notes.length > 0 || interp.ambiguities.length > 0) && (
                <div className="issues">
                  {interp.ambiguities.map((a, i) => (
                    <div key={'a' + i} className="issue warning">⚠ {a}</div>
                  ))}
                  {interp.notes.map((n, i) => (
                    <div key={'n' + i} className="issue note">ℹ {n}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panel-head"><h3>Example questions</h3></div>
          <div className="panel-body examples">
            {EXAMPLES.map((e, i) => (
              <button key={i} onClick={() => { setText(e.q); run(e.q); }}>
                <span className="tag" style={{ marginRight: 6 }}>{e.m}</span>
                {e.q}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>{solution ? <SolutionView solution={solution} /> : <div className="empty">Paste a question and press <strong>Solve</strong>. The solver identifies the module, extracts the data, chooses the formula chain, converts to SI and shows full HSC working. You can correct any misread value in the Interpretation panel.</div>}</div>
    </div>
  );
}
