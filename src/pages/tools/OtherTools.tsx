import { useMemo, useState } from 'react';
import { SolutionView } from '../../components/SolutionView';
import { circuitSolution, CircuitInput, parseResistance } from '../../engine/tools/circuit';
import { logicSolution } from '../../engine/tools/logic';
import { flightSolution, FlightMode, gearSolution, GearInput, inclineSolution, InclineCase, InclineInput } from '../../engine/tools/mechanics';
import { leverRuleSolution } from '../../engine/tools/materials';
import { Base, numberSolution } from '../../engine/tools/numbase';
import { useSettings } from '../../settings';
import { takePendingTool } from '../../router';
import { EditTable, num, Panel, QField, QV, Seg, si } from './common';

// ——— Circuit ———
export function CircuitTool() {
  const pre = useMemo(() => takePendingTool<CircuitInput>('circuit'), []);
  const [net, setNet] = useState(pre?.network ?? 'R1 + (R2 || R3)');
  const [named, setNamed] = useState<{ name: string; value: string }[]>([
    { name: 'R1', value: '10 Ω' },
    { name: 'R2', value: '20 Ω' },
    { name: 'R3', value: '30 Ω' },
  ]);
  const [supplyKind, setSupplyKind] = useState<'V' | 'I' | 'none'>(pre?.I !== undefined ? 'I' : 'V');
  const [V, setV] = useState<QV>({ raw: pre?.V !== undefined ? String(pre.V) : '12', unit: 'V' });
  const [I, setI] = useState<QV>({ raw: pre?.I !== undefined ? String(pre.I) : '', unit: 'A' });
  const sol = useMemo(() => {
    const map: Record<string, number> = {};
    named.forEach((n) => {
      if (n.name) map[n.name.trim()] = parseResistance(n.value);
    });
    return circuitSolution({ network: net, named: map, V: supplyKind === 'V' && isFinite(si(V)) ? si(V) : undefined, I: supplyKind === 'I' && isFinite(si(I)) ? si(I) : undefined });
  }, [net, named, supplyKind, V, I]);
  return (
    <div className="tool-layout">
      <div className="stack">
        <Panel title="Network">
          <label className="field">
            Network expression
            <input type="text" className="num" value={net} onChange={(e) => setNet(e.target.value)} />
          </label>
          <div className="faint small">
            Use <span className="mono">+</span> for series and <span className="mono">||</span> (or <span className="mono">//</span>) for parallel; brackets group. Values may be typed directly (e.g. <span className="mono">100 + (4.7k || 2.2k)</span>) or as names defined below.
          </div>
          <div className="row">
            {['R1 + R2 + R3', 'R1 || R2 || R3', 'R1 + (R2 || R3)', '(R1 + R2) || R3', '(R1 || R2) + (R3 || R4)'].map((e) => (
              <button key={e} className="btn small" onClick={() => setNet(e)}>{e}</button>
            ))}
          </div>
          <EditTable rows={named} onChange={setNamed} blank={{ name: `R${named.length + 1}`, value: '' }} cols={[{ key: 'name', label: 'Name' }, { key: 'value', label: 'Resistance (e.g. 4.7 kΩ)' }]} />
        </Panel>
        <Panel title="Supply">
          <Seg value={supplyKind} options={[{ v: 'V', l: 'Voltage given' }, { v: 'I', l: 'Current given' }, { v: 'none', l: 'R_T only' }]} onChange={setSupplyKind} />
          {supplyKind === 'V' && <QField label="Supply voltage" quantity="voltage" value={V} onChange={setV} />}
          {supplyKind === 'I' && <QField label="Supply current" quantity="current" value={I} onChange={setI} />}
        </Panel>
      </div>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Logic ———
export function LogicTool() {
  const pre = useMemo(() => takePendingTool<string>('logic'), []);
  const [expr, setExpr] = useState(pre ?? "A.B + C'");
  const sol = useMemo(() => (expr.trim() ? logicSolution(expr) : null), [expr]);
  return (
    <div className="tool-layout">
      <Panel title="Boolean expression">
        <input type="text" className="num" value={expr} onChange={(e) => setExpr(e.target.value)} />
        <div className="faint small">
          AND: <span className="mono">A.B</span>, <span className="mono">AB</span>, <span className="mono">A AND B</span> · OR: <span className="mono">A + B</span> · NOT: <span className="mono">A'</span>, <span className="mono">NOT A</span>, <span className="mono">¬A</span> · XOR: <span className="mono">A ⊕ B</span>, <span className="mono">A XOR B</span> · also NAND, NOR, XNOR.
        </div>
        <div className="row">
          {["A.B + C'", 'A NAND B', 'A NOR B', 'A XOR B', "(A + B)'", "A'B + AB'", 'NOT(A AND B) OR C', '(A + B).(A + C)'].map((e) => (
            <button key={e} className="btn small" onClick={() => setExpr(e)}>{e}</button>
          ))}
        </div>
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Number systems ———
export function NumberTool() {
  const pre = useMemo(() => takePendingTool<{ value: string; from: Base }>('numbase'), []);
  const [value, setValue] = useState(pre?.value ?? '45');
  const [from, setFrom] = useState<string>(String(pre?.from ?? 10));
  const [bits, setBits] = useState('8');
  const sol = useMemo(() => (value.trim() ? numberSolution(value, Number(from) as Base, num(bits) || 8) : null), [value, from, bits]);
  return (
    <div className="tool-layout">
      <Panel title="Number">
        <div className="grid-2">
          <label className="field">Value<input type="text" className="num" value={value} onChange={(e) => setValue(e.target.value)} /></label>
          <label className="field">
            Given in
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="10">Decimal (base 10)</option>
              <option value="2">Binary (base 2)</option>
              <option value="8">Octal (base 8)</option>
              <option value="16">Hexadecimal (base 16)</option>
            </select>
          </label>
          <label className="field">Two’s complement word length (bits)<input className="num" value={bits} onChange={(e) => setBits(e.target.value)} /></label>
        </div>
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Incline ———
export function InclineTool() {
  const pre = useMemo(() => takePendingTool<InclineInput>('incline'), []);
  const { g } = useSettings();
  const [m, setM] = useState<QV>({ raw: pre ? String(pre.m) : '20', unit: 'kg' });
  const [theta, setTheta] = useState(pre ? String(pre.theta) : '30');
  const [mu, setMu] = useState(pre ? String(pre.mu) : '0.3');
  const [alpha, setAlpha] = useState(pre?.alpha ? String(pre.alpha) : '0');
  const [mode, setMode] = useState<InclineCase>(pre?.mode ?? 'up');
  const [P, setP] = useState<QV>({ raw: pre?.P ? String(pre.P) : '200', unit: 'N' });
  const sol = useMemo(() => {
    const inp: InclineInput = { m: si(m), theta: num(theta), mu: num(mu), alpha: num(alpha) || 0, mode, P: si(P), g };
    if (!isFinite(inp.m) || !isFinite(inp.theta) || !isFinite(inp.mu)) return null;
    return inclineSolution(inp);
  }, [m, theta, mu, alpha, mode, P, g]);
  return (
    <div className="tool-layout">
      <Panel title="Body on an inclined plane">
        <Seg value={mode} options={[{ v: 'up', l: 'Force to move up' }, { v: 'hold', l: 'Force to hold' }, { v: 'check', l: 'Will it slide?' }, { v: 'accel', l: 'Acceleration' }]} onChange={setMode} />
        <div className="grid-2">
          <QField label="Mass m" quantity="mass" value={m} onChange={setM} />
          <label className="field">Incline angle θ (°) — 0 for a horizontal surface<input className="num" value={theta} onChange={(e) => setTheta(e.target.value)} /></label>
          <label className="field">Coefficient of friction μ<input className="num" value={mu} onChange={(e) => setMu(e.target.value)} /></label>
          <label className="field">Angle of applied force above the surface α (°)<input className="num" value={alpha} onChange={(e) => setAlpha(e.target.value)} /></label>
          {mode === 'accel' && <QField label="Applied force P (up the slope)" quantity="force" value={P} onChange={setP} />}
        </div>
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Gears ———
type StageRow = { driver: string; driven: string };
export function GearTool() {
  const pre = useMemo(() => takePendingTool<GearInput>('gear'), []);
  const [rows, setRows] = useState<StageRow[]>(pre ? pre.stages.map((s) => ({ driver: String(s.driver), driven: String(s.driven) })) : [{ driver: '20', driven: '60' }, { driver: '15', driven: '45' }]);
  const [nIn, setNIn] = useState<QV>({ raw: pre?.nIn ? String((pre.nIn * 60) / (2 * Math.PI)) : '1800', unit: 'rpm' });
  const [Tin, setTin] = useState<QV>({ raw: pre?.Tin ? String(pre.Tin) : '10', unit: 'N·m' });
  const [eta, setEta] = useState(pre?.eta ? String(pre.eta * 100) : '100');
  const [idlers, setIdlers] = useState('0');
  const [kind, setKind] = useState<'teeth' | 'diameter'>('teeth');
  const sol = useMemo(() => {
    const stages = rows.filter((r) => r.driver && r.driven).map((r) => ({ driver: num(r.driver), driven: num(r.driven) }));
    return gearSolution({ stages, nIn: isFinite(si(nIn)) ? si(nIn) : undefined, Tin: isFinite(si(Tin)) ? si(Tin) : undefined, eta: (num(eta) || 100) / 100, idlers: num(idlers) || 0, unitLabel: kind });
  }, [rows, nIn, Tin, eta, idlers, kind]);
  return (
    <div className="tool-layout">
      <Panel title="Train (driver → driven for each stage)" right={<Seg value={kind} options={[{ v: 'teeth', l: 'Teeth' }, { v: 'diameter', l: 'Pulley/sprocket diameters' }]} onChange={setKind} />}>
        <div className="faint small">For a compound train, list each meshing pair in order; the driven gear of one stage shares a shaft with the driver of the next.</div>
        <EditTable rows={rows} onChange={setRows} blank={{ driver: '', driven: '' }} minRows={1} cols={[{ key: 'driver', label: `Driver ${kind === 'teeth' ? 'teeth' : 'diameter'}` }, { key: 'driven', label: `Driven ${kind === 'teeth' ? 'teeth' : 'diameter'}` }]} />
        <div className="grid-2">
          <QField label="Input speed" quantity="angularVelocity" value={nIn} onChange={setNIn} />
          <QField label="Input torque" quantity="torque" value={Tin} onChange={setTin} />
          <label className="field">Overall efficiency (%)<input className="num" value={eta} onChange={(e) => setEta(e.target.value)} /></label>
          <label className="field">Idler gears (direction only)<input className="num" value={idlers} onChange={(e) => setIdlers(e.target.value)} /></label>
        </div>
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Flight ———
export function FlightTool() {
  const { g } = useSettings();
  const [mode, setMode] = useState<FlightMode>('level');
  const [m, setM] = useState<QV>({ raw: '60', unit: 't' });
  const [LD, setLD] = useState('15');
  const [angle, setAngle] = useState('8');
  const [h, setH] = useState<QV>({ raw: '10', unit: 'km' });
  const [S, setS] = useState<QV>({ raw: '120', unit: 'm²' });
  const sol = useMemo(() => {
    if (!isFinite(si(m)) || !isFinite(num(LD))) return null;
    return flightSolution({ mode, m: si(m), LD: num(LD), angle: num(angle), height: isFinite(si(h)) ? si(h) : undefined, S: isFinite(si(S)) ? si(S) : undefined, g });
  }, [mode, m, LD, angle, h, S, g]);
  return (
    <div className="tool-layout">
      <Panel title="Aircraft">
        <Seg value={mode} options={[{ v: 'level', l: 'Straight & level' }, { v: 'climb', l: 'Steady climb' }, { v: 'glide', l: 'Glide' }, { v: 'turn', l: 'Banked turn' }]} onChange={setMode} />
        <div className="grid-2">
          <QField label="Mass" quantity="mass" value={m} onChange={setM} />
          <label className="field">Lift-to-drag ratio L/D<input className="num" value={LD} onChange={(e) => setLD(e.target.value)} /></label>
          {(mode === 'climb' || mode === 'turn') && <label className="field">{mode === 'climb' ? 'Climb angle γ (°)' : 'Bank angle φ (°)'}<input className="num" value={angle} onChange={(e) => setAngle(e.target.value)} /></label>}
          {mode === 'glide' && <QField label="Height available" quantity="length" value={h} onChange={setH} />}
          <QField label="Wing area S (optional)" quantity="area" value={S} onChange={setS} units={['m²']} />
        </div>
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Lever rule ———
export function LeverTool() {
  const pre = useMemo(() => takePendingTool<number>('lever'), []);
  const [C0, setC0] = useState(pre !== null ? String(pre) : '0.4');
  const [eut, setEut] = useState('0.8');
  const [fer, setFer] = useState('0.025');
  const sol = useMemo(() => (isFinite(num(C0)) ? leverRuleSolution({ C0: num(C0), eutectoid: num(eut), ferriteMax: num(fer) }) : null), [C0, eut, fer]);
  return (
    <div className="tool-layout">
      <Panel title="Plain carbon steel (slow cooling, just below 727 °C)">
        <div className="grid-2">
          <label className="field">Carbon content (% C)<input className="num" value={C0} onChange={(e) => setC0(e.target.value)} /></label>
          <label className="field">
            Eutectoid composition
            <select value={eut} onChange={(e) => setEut(e.target.value)}>
              <option value="0.8">0.8 % C (common HSC value)</option>
              <option value="0.77">0.77 % C</option>
              <option value="0.76">0.76 % C</option>
            </select>
          </label>
          <label className="field">
            Max C in ferrite
            <select value={fer} onChange={(e) => setFer(e.target.value)}>
              <option value="0.025">0.025 %</option>
              <option value="0.02">0.02 %</option>
              <option value="0">0 % (simplified)</option>
            </select>
          </label>
        </div>
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}
