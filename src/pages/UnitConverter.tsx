import { useMemo, useState } from 'react';
import { parseNumber } from '../components/QuantityInput';
import { fmt } from '../engine/format';
import { QUANTITIES, QuantityKind } from '../engine/quantities';
import { dimEq, dimToString, parseUnit } from '../engine/units';

const KINDS = (Object.values(QUANTITIES) as QuantityKind[]).filter((k) => k.units.filter(Boolean).length > 1 || (k.inputUnits?.length ?? 0) > 1);

export function UnitConverter() {
  const [kindId, setKindId] = useState('stress');
  const kind = KINDS.find((k) => k.id === kindId)!;
  const units = kind.inputUnits ?? kind.units;
  const [raw, setRaw] = useState('40');
  const [unit, setUnit] = useState('MPa');
  const [free, setFree] = useState({ value: '1', from: 'N/mm²', to: 'MPa' });

  const rows = useMemo(() => {
    const n = parseNumber(raw);
    if (!isFinite(n)) return [];
    let siv: number;
    try {
      siv = n * (unit === '' ? 1 : parseUnit(unit).factor);
    } catch {
      return [];
    }
    return [...new Set([...kind.units, ...units])].filter(Boolean).map((u) => {
      const f = parseUnit(u).factor;
      return { u, v: siv / f, hsc: u === kind.hsc, si: u === kind.si };
    });
  }, [raw, unit, kind, units]);

  const freeResult = useMemo(() => {
    try {
      const a = parseUnit(free.from);
      const b = parseUnit(free.to);
      const n = parseNumber(free.value);
      if (!dimEq(a.dim, b.dim)) return { err: `Incompatible: [${dimToString(a.dim)}] vs [${dimToString(b.dim)}]` };
      return { v: (n * a.factor) / b.factor, dims: dimToString(a.dim), factor: a.factor / b.factor };
    } catch (e) {
      return { err: (e as Error).message };
    }
  }, [free]);

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="panel">
        <div className="panel-head"><h2>Quantity converter</h2></div>
        <div className="panel-body stack">
          <div className="row">
            <select value={kindId} onChange={(e) => { const k = KINDS.find((x) => x.id === e.target.value)!; setKindId(k.id); setUnit(k.hsc || k.units.filter(Boolean)[0]); }}>
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
            <input type="text" className="num" value={raw} onChange={(e) => setRaw(e.target.value)} style={{ width: 160 }} />
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {units.filter(Boolean).map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Unit</th><th>Value</th><th>Scientific</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.u}>
                  <td>{r.u}</td>
                  <td>{fmt(r.v, 6)}</td>
                  <td>{fmt(r.v, 4, true)}</td>
                  <td>{r.si && <span className="tag">SI</span>} {r.hsc && <span className="tag accent">usual HSC unit</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="info-block">
            Squared and cubed prefixes scale by the square/cube of the prefix: 1 mm² = (10⁻³ m)² = 10⁻⁶ m²; 1 mm³ = 10⁻⁹ m³; 1 mm⁴ = 10⁻¹² m⁴. 1 N/mm² = 1 MPa; 1 kN/mm² = 1 GPa; 1 kN·m = 10⁶ N·mm.
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Any unit expression</h2></div>
        <div className="panel-body stack">
          <div className="row">
            <input type="text" className="num" value={free.value} onChange={(e) => setFree({ ...free, value: e.target.value })} style={{ width: 120 }} />
            <input type="text" className="num" value={free.from} onChange={(e) => setFree({ ...free, from: e.target.value })} style={{ width: 150 }} aria-label="from unit" />
            <span>→</span>
            <input type="text" className="num" value={free.to} onChange={(e) => setFree({ ...free, to: e.target.value })} style={{ width: 150 }} aria-label="to unit" />
          </div>
          {'err' in freeResult ? (
            <div className="issue error">{freeResult.err}</div>
          ) : (
            <div className="final-card">
              <div className="final-main mono">{free.value} {free.from} = {fmt(freeResult.v!, 6)} {free.to}</div>
              <div className="faint small">dimensions [{freeResult.dims}] · factor ×{fmt(freeResult.factor!, 6, true)}</div>
            </div>
          )}
          <div className="faint small">
            Supports products (·, *, space), quotients (/), powers (^2, ², m3) and prefixes (G, M, k, c, m, μ/u, n). Examples: <span className="mono">kN·m</span>, <span className="mono">N/mm^2</span>, <span className="mono">kg/m3</span>, <span className="mono">km/h</span>, <span className="mono">kWh</span>, <span className="mono">rpm</span>, <span className="mono">dB/km</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
