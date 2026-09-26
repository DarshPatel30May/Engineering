import { fmt } from '../engine/format';
import type { BeamInput, BeamResult } from '../engine/tools/beam';
import type { Rect, SectionResult } from '../engine/tools/section';
import type { TrussInput, TrussResult } from '../engine/tools/truss';

const W = 760;

function niceStep(max: number, n = 4) {
  if (max <= 0) return 1;
  const raw = max / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function BeamDiagram({ data }: { data: { input: BeamInput; result: BeamResult } }) {
  const { input: inp, result: r } = data;
  const L = inp.length;
  const padL = 54;
  const padR = 24;
  const X = (x: number) => padL + (x / L) * (W - padL - padR);
  const kN = Math.max(...inp.points.map((p) => Math.abs(p.P)), ...inp.udls.map((u) => Math.abs(u.w)), 0) >= 1000;
  const sc = kN ? 1e-3 : 1;
  const Fu = kN ? 'kN' : 'N';
  const Mu = kN ? 'kN·m' : 'N·m';
  // panel geometry
  const beamY = 70;
  const sfdTop = 150;
  const panelH = 120;
  const bmdTop = sfdTop + panelH + 40;
  const H = bmdTop + panelH + 30;
  const maxV = Math.max(...r.diagram.map((p) => Math.abs(p.V)), 1e-9);
  const maxM = Math.max(...r.diagram.map((p) => Math.abs(p.M)), 1e-9);
  const Vy = (v: number) => sfdTop + panelH / 2 - (v / maxV) * (panelH / 2 - 8);
  const My = (m: number) => bmdTop + panelH / 2 - (m / maxM) * (panelH / 2 - 8);
  const sfdPath = `M ${X(0)} ${Vy(0)} ` + r.diagram.map((p) => `L ${X(p.x)} ${Vy(p.V)}`).join(' ') + ` L ${X(L)} ${Vy(0)} Z`;
  const bmdPath = `M ${X(0)} ${My(0)} ` + r.diagram.map((p) => `L ${X(p.x)} ${My(p.M)}`).join(' ') + ` L ${X(L)} ${My(0)} Z`;
  const maxLoad = Math.max(...inp.points.map((p) => Math.abs(p.P)), 1e-9);
  const cant = inp.type !== 'simply';
  const xf = inp.type === 'cantilever-right' ? L : 0;
  return (
    <div className="panel">
      <div className="panel-head"><h3>Load, shear force &amp; bending moment diagrams</h3><span className="tag">sagging +</span></div>
      <div className="panel-body" style={{ padding: 8 }}>
        <svg className="diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Beam diagrams">
          <defs>
            <marker id="arrowDown" viewBox="0 0 10 10" refX="5" refY="9" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,0 L5,10 z" className="load" />
            </marker>
            <marker id="arrowUp" viewBox="0 0 10 10" refX="5" refY="1" markerWidth="7" markerHeight="7">
              <path d="M0,10 L10,10 L5,0 z" className="react" />
            </marker>
          </defs>
          {/* UDLs */}
          {inp.udls.map((u, i) => (
            <g key={'u' + i}>
              <rect x={X(u.x1)} y={beamY - 30} width={X(u.x2) - X(u.x1)} height={22} className="udl" />
              <text x={(X(u.x1) + X(u.x2)) / 2} y={beamY - 34} textAnchor="middle">{fmt(u.w * sc, 3)} {Fu}/m</text>
            </g>
          ))}
          {/* beam */}
          <rect x={X(0)} y={beamY - 6} width={X(L) - X(0)} height={12} className="beam" />
          {/* supports */}
          {!cant &&
            r.reactions.map((re, i) => (
              <g key={'s' + i}>
                {i === 0 ? (
                  <path d={`M ${X(re.x)} ${beamY + 6} l -9 14 h 18 z`} className="beam" />
                ) : (
                  <>
                    <circle cx={X(re.x)} cy={beamY + 13} r={6} className="beam" />
                    <line x1={X(re.x) - 10} x2={X(re.x) + 10} y1={beamY + 20} y2={beamY + 20} className="axis" />
                  </>
                )}
                <line x1={X(re.x)} x2={X(re.x)} y1={beamY + 48} y2={beamY + 26} className="react" markerEnd="url(#arrowUp)" strokeWidth={2} />
                <text x={X(re.x)} y={beamY + 60} textAnchor="middle" className="label-strong">{re.label.replace('_', '')} = {fmt(re.value * sc, 3)} {Fu}</text>
              </g>
            ))}
          {cant && (
            <g>
              <rect x={xf === 0 ? X(0) - 12 : X(L)} y={beamY - 30} width={12} height={60} className="beam" />
              <text x={xf === 0 ? X(0) + 4 : X(L) - 4} y={beamY + 44} textAnchor={xf === 0 ? 'start' : 'end'} className="label-strong">
                R = {fmt(r.reactions[0].value * sc, 3)} {Fu}, M = {fmt(Math.abs(r.fixingMoment ?? 0) * sc, 3)} {Mu}
              </text>
            </g>
          )}
          {/* point loads */}
          {inp.points.map((p, i) => {
            const len = 18 + 26 * (Math.abs(p.P) / maxLoad);
            return (
              <g key={'p' + i}>
                <line x1={X(p.x)} x2={X(p.x)} y1={beamY - 8 - len} y2={beamY - 9} className="load" strokeWidth={2} markerEnd="url(#arrowDown)" />
                <text x={X(p.x)} y={beamY - 12 - len} textAnchor="middle" className="label-strong">{fmt(p.P * sc, 3)} {Fu}</text>
              </g>
            );
          })}
          {/* dimension ticks */}
          {[...new Set([0, L, ...inp.points.map((p) => p.x), ...inp.udls.flatMap((u) => [u.x1, u.x2]), ...r.reactions.map((re) => re.x)])]
            .sort((a, b) => a - b)
            .map((x) => (
              <text key={'d' + x} x={X(x)} y={beamY + 76} textAnchor="middle" className="faint">{fmt(x, 3)}</text>
            ))}
          {/* SFD */}
          <text x={8} y={sfdTop + 12} className="label-strong">SFD ({Fu})</text>
          <line x1={X(0)} x2={X(L)} y1={Vy(0)} y2={Vy(0)} className="axis" />
          <path d={sfdPath} className="sfd" />
          {r.keyPoints.map((kp, i) => (
            <text key={'v' + i} x={X(kp.x) + 3} y={Vy(kp.V) + (kp.V >= 0 ? -4 : 12)} fontSize={10}>{fmt(kp.V * sc, 3)}</text>
          ))}
          {/* BMD */}
          <text x={8} y={bmdTop + 12} className="label-strong">BMD ({Mu})</text>
          <line x1={X(0)} x2={X(L)} y1={My(0)} y2={My(0)} className="axis" />
          <path d={bmdPath} className="bmd" />
          {r.keyPoints.map((kp, i) =>
            Math.abs(kp.M) > maxM * 0.02 ? (
              <text key={'m' + i} x={X(kp.x) + 3} y={My(kp.M) + (kp.M >= 0 ? -4 : 12)} fontSize={10}>{fmt(kp.M * sc, 3)}</text>
            ) : null,
          )}
          <circle cx={X(r.maxM.x)} cy={My(r.maxM.M)} r={3.5} fill="var(--accent)" />
          <text x={X(r.maxM.x)} y={My(r.maxM.M) + (r.maxM.M >= 0 ? -14 : 24)} textAnchor="middle" className="label-strong">M max = {fmt(r.maxM.M * sc, 4)}</text>
        </svg>
      </div>
    </div>
  );
}

export function TrussDiagram({ data }: { data: { input: TrussInput; result: TrussResult } }) {
  const { input: inp, result: r } = data;
  const xs = inp.nodes.map((n) => n.x);
  const ys = inp.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1e-9);
  const pad = 60;
  const scale = (W - 2 * pad) / span;
  const H = Math.max(220, (maxY - minY) * scale + 2 * pad + 20);
  const X = (x: number) => pad + (x - minX) * scale;
  const Y = (y: number) => H - pad - (y - minY) * scale;
  const node = (id: string) => inp.nodes.find((n) => n.id === id)!;
  const kN = inp.loads.some((l) => Math.abs(l.Fx) >= 1000 || Math.abs(l.Fy) >= 1000);
  const sc = kN ? 1e-3 : 1;
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Truss</h3>
        <span className="tag cyan">tension</span>
        <span className="tag err">compression</span>
      </div>
      <div className="panel-body" style={{ padding: 8 }}>
        <svg className="diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Truss diagram">
          {inp.members.map((m) => {
            const a = node(m.a);
            const b = node(m.b);
            const F = r.forces[m.id] ?? 0;
            const cls = Math.abs(F) < 1e-9 ? 'member-0' : F > 0 ? 'member-t' : 'member-c';
            return (
              <g key={m.id}>
                <line x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} className={cls} />
                <text x={(X(a.x) + X(b.x)) / 2 + 4} y={(Y(a.y) + Y(b.y)) / 2 - 4} className="label-strong">
                  {m.id}: {fmt(Math.abs(F) * sc, 3)}{F > 1e-9 ? ' T' : F < -1e-9 ? ' C' : ''}
                </text>
              </g>
            );
          })}
          {inp.supports.map((s) => {
            const n = node(s.node);
            return s.type === 'pin' ? <path key={'s' + s.node} d={`M ${X(n.x)} ${Y(n.y) + 6} l -10 16 h 20 z`} className="beam" /> : <circle key={'s' + s.node} cx={X(n.x)} cy={Y(n.y) + 13} r={7} className="beam" />;
          })}
          {inp.loads.map((l, i) => {
            const n = node(l.node);
            const mag = Math.hypot(l.Fx, l.Fy) || 1;
            const ux = l.Fx / mag;
            const uy = l.Fy / mag;
            return (
              <g key={'l' + i}>
                <line x1={X(n.x) - ux * 44} y1={Y(n.y) + uy * 44} x2={X(n.x) - ux * 8} y2={Y(n.y) + uy * 8} className="load" strokeWidth={2} />
                <circle cx={X(n.x) - ux * 8} cy={Y(n.y) + uy * 8} r={2.5} className="load" />
                <text x={X(n.x) - ux * 50} y={Y(n.y) + uy * 50 - 4} textAnchor="middle" className="label-strong">{fmt(mag * sc, 3)} {kN ? 'kN' : 'N'}</text>
              </g>
            );
          })}
          {inp.nodes.map((n) => (
            <g key={n.id}>
              <circle cx={X(n.x)} cy={Y(n.y)} r={5} className="node" />
              <text x={X(n.x) - 10} y={Y(n.y) - 9} className="label-strong">{n.id}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function SectionDiagram({ data }: { data: { rects: Rect[]; result: SectionResult } }) {
  const { rects, result } = data;
  const solid = rects.filter((r) => !r.subtract);
  const maxW = Math.max(...solid.map((r) => r.b));
  const top = Math.max(...solid.map((r) => r.yb + r.h));
  const S = 220 / Math.max(maxW, top);
  const H = top * S + 40;
  const cx = 200;
  return (
    <div className="panel">
      <div className="panel-head"><h3>Cross-section</h3><span className="tag accent">neutral axis ȳ = {fmt(result.ybar * 1000, 4)} mm</span></div>
      <div className="panel-body" style={{ padding: 8 }}>
        <svg className="diagram" viewBox={`0 0 400 ${H}`} style={{ maxHeight: 320 }}>
          {rects.map((r, i) => (
            <rect key={i} x={cx - (r.b * S) / 2} y={H - 20 - (r.yb + r.h) * S} width={r.b * S} height={r.h * S} className="beam" style={r.subtract ? { fill: 'var(--panel)' } : undefined} />
          ))}
          <line x1={20} x2={380} y1={H - 20 - result.ybar * S} y2={H - 20 - result.ybar * S} stroke="var(--accent)" strokeDasharray="6 4" />
          <text x={24} y={H - 24 - result.ybar * S} className="label-strong">N.A.</text>
        </svg>
      </div>
    </div>
  );
}

export function StressStrainChart({ data }: { data: { points: { s: number; e: number }[] } }) {
  const pts = data.points;
  const maxS = Math.max(...pts.map((p) => p.s)) / 1e6;
  const maxE = Math.max(...pts.map((p) => p.e));
  const H = 300;
  const pad = 50;
  const X = (e: number) => pad + (e / maxE) * (W - pad - 20);
  const Y = (s: number) => H - pad + 10 - (s / 1e6 / maxS) * (H - pad - 20);
  const stepS = niceStep(maxS);
  return (
    <div className="panel">
      <div className="panel-head"><h3>Stress–strain graph</h3></div>
      <div className="panel-body" style={{ padding: 8 }}>
        <svg className="diagram" viewBox={`0 0 ${W} ${H}`}>
          <line x1={pad} x2={W - 20} y1={Y(0)} y2={Y(0)} className="axis" />
          <line x1={pad} x2={pad} y1={Y(0)} y2={10} className="axis" />
          {Array.from({ length: Math.floor(maxS / stepS) + 1 }, (_, i) => i * stepS).map((v) => (
            <g key={v}>
              <line x1={pad - 4} x2={pad} y1={Y(v * 1e6)} y2={Y(v * 1e6)} className="axis" />
              <text x={pad - 6} y={Y(v * 1e6) + 4} textAnchor="end">{fmt(v, 3)}</text>
            </g>
          ))}
          <text x={10} y={16}>σ (MPa)</text>
          <text x={W - 20} y={H - 12} textAnchor="end">ε</text>
          <polyline points={pts.map((p) => `${X(p.e)},${Y(p.s)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={2} />
          {pts.map((p, i) => (
            <circle key={i} cx={X(p.e)} cy={Y(p.s)} r={3} fill="var(--cyan)" />
          ))}
        </svg>
      </div>
    </div>
  );
}
