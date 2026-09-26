import { useMemo, useState } from 'react';
import { SolutionView } from '../../components/SolutionView';
import type { BeamInput, BeamType } from '../../engine/tools/beam';
import { beamSolution } from '../../engine/tools/beam';
import { centroidSolution, Rect, SECTION_PRESETS, sectionSolution } from '../../engine/tools/section';
import { trussSolution, TrussInput } from '../../engine/tools/truss';
import { forcesSolution } from '../../engine/tools/mechanics';
import { tensileSolution } from '../../engine/tools/materials';
import { takePendingTool } from '../../router';
import { EditTable, num, Panel, QField, QV, Seg, si } from './common';

// ——— Beam ———
type PL = { x: string; P: string };
type UD = { x1: string; x2: string; w: string };
type CP = { x: string; M: string };

export function BeamTool() {
  const pre = useMemo(() => takePendingTool<BeamInput>('beam'), []);
  const [type, setType] = useState<BeamType>(pre?.type ?? 'simply');
  const [L, setL] = useState(pre ? String(pre.length) : '6');
  const [a, setA] = useState(pre?.a !== undefined ? String(pre.a) : '0');
  const [b, setB] = useState(pre?.b !== undefined ? String(pre.b) : pre ? String(pre.length) : '6');
  const [unit, setUnit] = useState<'kN' | 'N'>('kN');
  const f = unit === 'kN' ? 1000 : 1;
  const [points, setPoints] = useState<PL[]>(pre ? pre.points.map((p) => ({ x: String(p.x), P: String(p.P / 1000) })) : [{ x: '2', P: '12' }]);
  const [udls, setUdls] = useState<UD[]>(pre ? pre.udls.map((u) => ({ x1: String(u.x1), x2: String(u.x2), w: String(u.w / 1000) })) : []);
  const [couples, setCouples] = useState<CP[]>([]);
  const [I, setI] = useState<QV>({ raw: pre?.I ? String(pre.I * 1e12) : '', unit: 'mm⁴' });
  const [y, setY] = useState<QV>({ raw: pre?.y ? String(pre.y * 1000) : '', unit: 'mm' });
  const sol = useMemo(() => {
    const inp: BeamInput = {
      type,
      length: num(L),
      a: type === 'simply' ? num(a) : undefined,
      b: type === 'simply' ? num(b) : undefined,
      points: points.filter((p) => p.x !== '' && p.P !== '').map((p) => ({ x: num(p.x), P: num(p.P) * f })),
      udls: udls.filter((u) => u.w !== '').map((u) => ({ x1: num(u.x1), x2: num(u.x2), w: num(u.w) * f })),
      couples: couples.filter((c) => c.M !== '').map((c) => ({ x: num(c.x), M: num(c.M) * f })),
      I: isFinite(si(I)) ? si(I) : undefined,
      y: isFinite(si(y)) ? si(y) : undefined,
    };
    if ([inp.length, ...inp.points.flatMap((p) => [p.x, p.P]), ...inp.udls.flatMap((u) => [u.x1, u.x2, u.w])].some((v) => !isFinite(v))) return null;
    return beamSolution(inp);
  }, [type, L, a, b, points, udls, couples, I, y, f]);
  return (
    <div className="tool-layout">
      <div className="stack">
        <Panel title="Beam definition" right={<Seg value={unit} options={[{ v: 'kN', l: 'kN, kN/m' }, { v: 'N', l: 'N, N/m' }]} onChange={setUnit} />}>
          <Seg value={type} options={[{ v: 'simply', l: 'Simply supported' }, { v: 'cantilever-left', l: 'Cantilever (fixed left)' }, { v: 'cantilever-right', l: 'Cantilever (fixed right)' }]} onChange={setType} />
          <div className="grid-2">
            <label className="field">Length L (m)<input className="num" value={L} onChange={(e) => { setL(e.target.value); if (b === L) setB(e.target.value); }} /></label>
            {type === 'simply' && (
              <div className="row" style={{ gap: 8 }}>
                <label className="field" style={{ flex: 1 }}>Support A at x (m)<input className="num" value={a} onChange={(e) => setA(e.target.value)} /></label>
                <label className="field" style={{ flex: 1 }}>Support B at x (m)<input className="num" value={b} onChange={(e) => setB(e.target.value)} /></label>
              </div>
            )}
          </div>
          <div className="faint small">x is measured from the left end. Downward loads positive.</div>
          <div><strong className="small">Point loads</strong></div>
          <EditTable rows={points} onChange={setPoints} blank={{ x: '', P: '' }} cols={[{ key: 'x', label: 'x (m)' }, { key: 'P', label: `P (${unit}) ↓` }]} />
          <div><strong className="small">Uniformly distributed loads</strong></div>
          <EditTable rows={udls} onChange={setUdls} blank={{ x1: '0', x2: L, w: '' }} cols={[{ key: 'x1', label: 'from x (m)' }, { key: 'x2', label: 'to x (m)' }, { key: 'w', label: `w (${unit}/m) ↓` }]} />
          <div><strong className="small">Applied couples (clockwise +)</strong></div>
          <EditTable rows={couples} onChange={setCouples} blank={{ x: '', M: '' }} cols={[{ key: 'x', label: 'x (m)' }, { key: 'M', label: `M (${unit}·m)` }]} />
        </Panel>
        <Panel title="Section (optional — for bending stress)">
          <div className="grid-2">
            <QField label="Second moment of area I" quantity="secondMoment" value={I} onChange={setI} />
            <QField label="Extreme fibre distance y" quantity="length" value={y} onChange={setY} />
          </div>
          <div className="faint small">Use the Section Properties tool to calculate I and y for I-beams, T-beams and hollow sections.</div>
        </Panel>
      </div>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Truss ———
type NodeRow = { id: string; x: string; y: string };
type MemRow = { id: string; a: string; b: string; area: string };
type SupRow = { node: string; type: string };
type LoadRow = { node: string; Fx: string; Fy: string };

const TRUSS_PRESETS: Record<string, { nodes: NodeRow[]; members: MemRow[]; supports: SupRow[]; loads: LoadRow[] }> = {
  Triangle: {
    nodes: [{ id: 'A', x: '0', y: '0' }, { id: 'B', x: '4', y: '0' }, { id: 'C', x: '2', y: '2' }],
    members: [{ id: 'AB', a: 'A', b: 'B', area: '' }, { id: 'AC', a: 'A', b: 'C', area: '' }, { id: 'BC', a: 'B', b: 'C', area: '' }],
    supports: [{ node: 'A', type: 'pin' }, { node: 'B', type: 'roller-y' }],
    loads: [{ node: 'C', Fx: '0', Fy: '-10' }],
  },
  'Warren (5 joints)': {
    nodes: [{ id: 'A', x: '0', y: '0' }, { id: 'B', x: '4', y: '0' }, { id: 'C', x: '8', y: '0' }, { id: 'D', x: '2', y: '3' }, { id: 'E', x: '6', y: '3' }],
    members: ['AB', 'BC', 'AD', 'BD', 'BE', 'CE', 'DE'].map((m) => ({ id: m, a: m[0], b: m[1], area: '' })),
    supports: [{ node: 'A', type: 'pin' }, { node: 'C', type: 'roller-y' }],
    loads: [{ node: 'B', Fx: '0', Fy: '-20' }],
  },
  'Pratt (6 joints)': {
    nodes: [{ id: 'A', x: '0', y: '0' }, { id: 'B', x: '3', y: '0' }, { id: 'C', x: '6', y: '0' }, { id: 'D', x: '9', y: '0' }, { id: 'E', x: '3', y: '3' }, { id: 'F', x: '6', y: '3' }],
    members: ['AB', 'BC', 'CD', 'AE', 'EF', 'FD', 'BE', 'CF', 'BF'].map((m) => ({ id: m, a: m[0], b: m[1], area: '' })),
    supports: [{ node: 'A', type: 'pin' }, { node: 'D', type: 'roller-y' }],
    loads: [{ node: 'B', Fx: '0', Fy: '-15' }, { node: 'C', Fx: '0', Fy: '-15' }],
  },
  'Wall bracket (cantilever)': {
    nodes: [{ id: 'A', x: '0', y: '2' }, { id: 'B', x: '0', y: '0' }, { id: 'C', x: '3', y: '2' }],
    members: [{ id: 'AC', a: 'A', b: 'C', area: '' }, { id: 'BC', a: 'B', b: 'C', area: '' }],
    supports: [{ node: 'A', type: 'pin' }, { node: 'B', type: 'pin' }],
    loads: [{ node: 'C', Fx: '0', Fy: '-5' }],
  },
};

export function TrussTool() {
  const [preset, setPreset] = useState('Triangle');
  const p = TRUSS_PRESETS[preset];
  const [nodes, setNodes] = useState<NodeRow[]>(p.nodes);
  const [members, setMembers] = useState<MemRow[]>(p.members);
  const [supports, setSupports] = useState<SupRow[]>(p.supports);
  const [loads, setLoads] = useState<LoadRow[]>(p.loads);
  const load = (name: string) => {
    const q = TRUSS_PRESETS[name];
    setPreset(name);
    setNodes(q.nodes);
    setMembers(q.members);
    setSupports(q.supports);
    setLoads(q.loads);
  };
  const sol = useMemo(() => {
    const inp: TrussInput = {
      nodes: nodes.filter((n) => n.id).map((n) => ({ id: n.id.trim(), x: num(n.x), y: num(n.y) })),
      members: members.filter((m) => m.a && m.b).map((m) => ({ id: m.id.trim() || `${m.a}${m.b}`, a: m.a.trim(), b: m.b.trim(), area: num(m.area) > 0 ? num(m.area) * 1e-6 : undefined })),
      supports: supports.filter((s) => s.node).map((s) => ({ node: s.node.trim(), type: s.type as 'pin' })),
      loads: loads.filter((l) => l.node).map((l) => ({ node: l.node.trim(), Fx: (num(l.Fx) || 0) * 1000, Fy: (num(l.Fy) || 0) * 1000 })),
    };
    if (inp.nodes.some((n) => !isFinite(n.x) || !isFinite(n.y))) return null;
    return trussSolution(inp);
  }, [nodes, members, supports, loads]);
  return (
    <div className="tool-layout">
      <div className="stack">
        <Panel title="Truss definition" right={<select value={preset} onChange={(e) => load(e.target.value)}>{Object.keys(TRUSS_PRESETS).map((k) => <option key={k}>{k}</option>)}</select>}>
          <div className="faint small">Coordinates in metres, loads in kN (Fy negative = downward). Supports: pin = 2 reactions, roller-y = vertical reaction only, roller-x = horizontal only.</div>
          <strong className="small">Joints</strong>
          <EditTable rows={nodes} onChange={setNodes} blank={{ id: '', x: '', y: '' }} cols={[{ key: 'id', label: 'Joint' }, { key: 'x', label: 'x (m)' }, { key: 'y', label: 'y (m)' }]} />
          <strong className="small">Members</strong>
          <EditTable rows={members} onChange={setMembers} blank={{ id: '', a: '', b: '', area: '' }} cols={[{ key: 'id', label: 'Member' }, { key: 'a', label: 'Joint 1' }, { key: 'b', label: 'Joint 2' }, { key: 'area', label: 'Area mm² (opt.)' }]} />
          <strong className="small">Supports</strong>
          <EditTable rows={supports} onChange={setSupports} blank={{ node: '', type: 'pin' }} cols={[{ key: 'node', label: 'Joint' }, { key: 'type', label: 'Type', options: ['pin', 'roller-y', 'roller-x'] }]} />
          <strong className="small">Loads</strong>
          <EditTable rows={loads} onChange={setLoads} blank={{ node: '', Fx: '0', Fy: '' }} cols={[{ key: 'node', label: 'Joint' }, { key: 'Fx', label: 'Fx (kN) →' }, { key: 'Fy', label: 'Fy (kN) ↑' }]} />
        </Panel>
      </div>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Section properties ———
type Shape = 'rectangle' | 'hollowRect' | 'iBeam' | 'tBeam' | 'channel' | 'custom';
type RectRow = { name: string; b: string; h: string; yb: string; sub: string };

export function SectionTool() {
  const [shape, setShape] = useState<Shape>('iBeam');
  const [d, setD] = useState<Record<string, string>>({ b: '100', h: '200', t: '10', bf: '100', tf: '10', hw: '180', tw: '6' });
  const [custom, setCustom] = useState<RectRow[]>([{ name: 'Web', b: '10', h: '100', yb: '0', sub: 'no' }, { name: 'Flange', b: '100', h: '10', yb: '100', sub: 'no' }]);
  const g = (k: string) => num(d[k]) / 1000;
  const rects: Rect[] = useMemo(() => {
    switch (shape) {
      case 'rectangle':
        return SECTION_PRESETS.rectangle(g('b'), g('h'));
      case 'hollowRect':
        return SECTION_PRESETS.hollowRect(g('b'), g('h'), g('t'));
      case 'iBeam':
        return SECTION_PRESETS.iBeam(g('bf'), g('tf'), g('hw'), g('tw'));
      case 'tBeam':
        return SECTION_PRESETS.tBeam(g('bf'), g('tf'), g('hw'), g('tw'));
      case 'channel':
        return SECTION_PRESETS.channel(g('b'), g('h'), g('tf'), g('tw'));
      default:
        return custom.map((r) => ({ name: r.name || 'part', b: num(r.b) / 1000, h: num(r.h) / 1000, yb: num(r.yb) / 1000, subtract: r.sub === 'yes' }));
    }
  }, [shape, d, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const sol = useMemo(() => (rects.some((r) => !isFinite(r.b) || !isFinite(r.h) || !isFinite(r.yb)) ? null : sectionSolution(rects)), [rects]);
  const fields: Record<Shape, [string, string][]> = {
    rectangle: [['b', 'Breadth b'], ['h', 'Depth d']],
    hollowRect: [['b', 'Outer breadth B'], ['h', 'Outer depth D'], ['t', 'Wall thickness t']],
    iBeam: [['bf', 'Flange width'], ['tf', 'Flange thickness'], ['hw', 'Web height (between flanges)'], ['tw', 'Web thickness']],
    tBeam: [['bf', 'Flange width'], ['tf', 'Flange thickness'], ['hw', 'Web height'], ['tw', 'Web thickness']],
    channel: [['b', 'Flange width'], ['h', 'Overall depth'], ['tf', 'Flange thickness'], ['tw', 'Web thickness']],
    custom: [],
  };
  return (
    <div className="tool-layout">
      <Panel title="Cross-section (dimensions in mm)">
        <select value={shape} onChange={(e) => setShape(e.target.value as Shape)}>
          <option value="rectangle">Solid rectangle</option>
          <option value="hollowRect">Hollow rectangle (RHS)</option>
          <option value="iBeam">I-beam (symmetric)</option>
          <option value="tBeam">T-beam</option>
          <option value="channel">Channel (bending about x–x)</option>
          <option value="custom">Custom — rectangles</option>
        </select>
        {shape !== 'custom' ? (
          <div className="grid-2">
            {fields[shape].map(([k, l]) => (
              <label key={k} className="field">{l} (mm)<input className="num" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></label>
            ))}
          </div>
        ) : (
          <>
            <div className="faint small">Each rectangle: breadth b, height h and the height of its bottom edge above the base. Mark voids as subtract = yes.</div>
            <EditTable rows={custom} onChange={setCustom} blank={{ name: '', b: '', h: '', yb: '0', sub: 'no' }} cols={[{ key: 'name', label: 'Part' }, { key: 'b', label: 'b' }, { key: 'h', label: 'h' }, { key: 'yb', label: 'bottom y' }, { key: 'sub', label: 'Subtract', options: ['no', 'yes'] }]} />
          </>
        )}
        <div className="faint small">For circles use the I = πD⁴/64 and tube calculators.</div>
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Centroid / CG ———
type PartRow = { name: string; w: string; x: string; y: string };
export function CentroidTool() {
  const [rows, setRows] = useState<PartRow[]>([
    { name: 'Empty aircraft', w: '1200', x: '2.1', y: '' },
    { name: 'Pilot', w: '80', x: '1.8', y: '' },
    { name: 'Fuel', w: '150', x: '2.4', y: '' },
  ]);
  const [label, setLabel] = useState<'mass' | 'area'>('mass');
  const sol = useMemo(() => {
    const parts = rows.filter((r) => r.w !== '' && r.x !== '').map((r) => ({ name: r.name || '—', w: num(r.w), x: num(r.x), y: r.y === '' ? undefined : num(r.y) }));
    if (parts.some((p) => !isFinite(p.w) || !isFinite(p.x))) return null;
    return centroidSolution(parts, label === 'mass' ? { w: 'W', unitW: '(mass or weight)', x: 'x', title: 'Centre of gravity (weight & balance)' } : { w: 'A', unitW: '(area)', x: 'x', title: 'Centroid of a composite area' });
  }, [rows, label]);
  return (
    <div className="tool-layout">
      <Panel title="Parts" right={<Seg value={label} options={[{ v: 'mass', l: 'Masses / weights' }, { v: 'area', l: 'Areas' }]} onChange={setLabel} />}>
        <div className="faint small">Positions are measured from a common datum (any consistent length unit). Leave y blank for one-dimensional problems.</div>
        <EditTable rows={rows} onChange={setRows} blank={{ name: '', w: '', x: '', y: '' }} cols={[{ key: 'name', label: 'Item' }, { key: 'w', label: label === 'mass' ? 'Mass/weight' : 'Area' }, { key: 'x', label: 'x (arm)' }, { key: 'y', label: 'y (opt.)' }]} />
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Concurrent forces ———
type FRow = { name: string; F: string; angle: string };
export function ForcesTool() {
  const pre = useMemo(() => takePendingTool<{ name: string; F?: number; angle: number }[]>('forces'), []);
  const [unit, setUnit] = useState<'N' | 'kN'>('kN');
  const [rows, setRows] = useState<FRow[]>(
    pre
      ? pre.map((f) => ({ name: f.name, F: f.F === undefined ? '' : String(Number((f.F / 1000).toPrecision(6))), angle: String(f.angle) }))
      : [
          { name: 'W', F: '5', angle: '270' },
          { name: 'T_1', F: '', angle: '30' },
          { name: 'T_2', F: '', angle: '150' },
        ],
  );
  const sol = useMemo(() => {
    const f = unit === 'kN' ? 1000 : 1;
    const forces = rows.filter((r) => r.angle !== '').map((r) => ({ name: r.name || 'F', F: r.F.trim() === '' ? undefined : num(r.F) * f, angle: num(r.angle) }));
    if (forces.some((x) => !isFinite(x.angle) || (x.F !== undefined && !isFinite(x.F)))) return null;
    return forcesSolution(forces);
  }, [rows, unit]);
  return (
    <div className="tool-layout">
      <Panel title="Forces acting at a point" right={<Seg value={unit} options={[{ v: 'kN', l: 'kN' }, { v: 'N', l: 'N' }]} onChange={setUnit} />}>
        <div className="faint small">Angles are measured anticlockwise from the positive x-axis (0° = right, 90° = up, 270° = down). Leave a magnitude blank to solve for it (up to two unknowns for equilibrium); fill all magnitudes to get the resultant and equilibrant.</div>
        <EditTable rows={rows} onChange={setRows} blank={{ name: '', F: '', angle: '' }} cols={[{ key: 'name', label: 'Force' }, { key: 'F', label: `|F| (${unit})` }, { key: 'angle', label: 'θ (°)' }]} />
      </Panel>
      <SolutionView solution={sol} />
    </div>
  );
}

// ——— Tensile test ———
type TRow = { F: string; dL: string };
export function TensileTool() {
  const [L0, setL0] = useState<QV>({ raw: '50', unit: 'mm' });
  const [dia, setDia] = useState<QV>({ raw: '10', unit: 'mm' });
  const [rows, setRows] = useState<TRow[]>([
    { F: '5', dL: '0.016' },
    { F: '10', dL: '0.032' },
    { F: '15', dL: '0.048' },
    { F: '20', dL: '0.1' },
    { F: '30', dL: '2.5' },
    { F: '34', dL: '6' },
    { F: '31', dL: '9' },
  ]);
  const [nLin, setNLin] = useState('3');
  const [Lf, setLf] = useState<QV>({ raw: '59', unit: 'mm' });
  const [df, setDf] = useState<QV>({ raw: '7', unit: 'mm' });
  const [fos, setFos] = useState('3');
  const sol = useMemo(() => {
    const d = si(dia);
    const A0 = (Math.PI * d * d) / 4;
    const dfv = si(df);
    const data = rows.filter((r) => r.F !== '' && r.dL !== '').map((r) => ({ F: num(r.F) * 1000, dL: num(r.dL) / 1000 }));
    if (!isFinite(A0) || !isFinite(si(L0)) || data.some((p) => !isFinite(p.F) || !isFinite(p.dL))) return null;
    return tensileSolution({ L0: si(L0), A0, data, linearPoints: num(nLin), Lf: isFinite(si(Lf)) ? si(Lf) : undefined, Af: isFinite(dfv) ? (Math.PI * dfv * dfv) / 4 : undefined, fos: num(fos) || undefined });
  }, [L0, dia, rows, nLin, Lf, df, fos]);
  return (
    <div className="tool-layout">
      <div className="stack">
        <Panel title="Specimen">
          <div className="grid-2">
            <QField label="Gauge length L₀" quantity="length" value={L0} onChange={setL0} />
            <QField label="Original diameter d₀" quantity="length" value={dia} onChange={setDia} />
            <QField label="Final gauge length L_f (optional)" quantity="length" value={Lf} onChange={setLf} />
            <QField label="Diameter at fracture d_f (optional)" quantity="length" value={df} onChange={setDf} />
            <label className="field">Points used for E (elastic region)<input className="num" value={nLin} onChange={(e) => setNLin(e.target.value)} /></label>
            <label className="field">Factor of safety (optional)<input className="num" value={fos} onChange={(e) => setFos(e.target.value)} /></label>
          </div>
        </Panel>
        <Panel title="Load–extension data">
          <EditTable rows={rows} onChange={setRows} blank={{ F: '', dL: '' }} cols={[{ key: 'F', label: 'Load F (kN)' }, { key: 'dL', label: 'Extension ΔL (mm)' }]} />
        </Panel>
      </div>
      <SolutionView solution={sol} />
    </div>
  );
}
