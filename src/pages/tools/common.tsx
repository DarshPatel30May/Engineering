import { ReactNode } from 'react';
import { parseNumber } from '../../components/QuantityInput';
import { inputUnitsFor } from '../../engine/quantities';
import { parseUnit } from '../../engine/units';

export interface QV {
  raw: string;
  unit: string;
}

/** SI value of a raw input + unit (NaN if blank/invalid). */
export function si(q: QV): number {
  const n = parseNumber(q.raw);
  if (!isFinite(n)) return NaN;
  return n * (q.unit === '' ? 1 : parseUnit(q.unit).factor);
}

export function num(raw: string): number {
  return parseNumber(raw);
}

export function QField({ label, quantity, value, onChange, hint, units }: { label: ReactNode; quantity: string; value: QV; onChange: (v: QV) => void; hint?: string; units?: string[] }) {
  const us = units ?? inputUnitsFor(quantity);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
        <input type="text" inputMode="decimal" className="num" style={{ flex: 1 }} value={value.raw} onChange={(e) => onChange({ ...value, raw: e.target.value })} />
        {us.length > 0 && !(us.length === 1 && us[0] === '') && (
          <select value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value })} style={{ width: 96 }}>
            {us.map((u) => (
              <option key={u} value={u}>{u || '(none)'}</option>
            ))}
          </select>
        )}
      </div>
      {hint && <span className="faint small">{hint}</span>}
    </label>
  );
}

export function Panel({ title, children, right }: { title: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
      </div>
      <div className="panel-body stack">{children}</div>
    </div>
  );
}

/** Generic editable table of string cells. */
export function EditTable<T extends Record<string, string>>({ rows, cols, onChange, blank, minRows = 0 }: { rows: T[]; cols: { key: keyof T & string; label: string; width?: number; options?: string[] }[]; onChange: (rows: T[]) => void; blank: T; minRows?: number }) {
  return (
    <div className="table-wrap">
      <table className="edit-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>{c.label}</th>
            ))}
            <th style={{ width: 28 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c.key}>
                  {c.options ? (
                    <select value={r[c.key]} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.key]: e.target.value } : x)))}>
                      {c.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" className="num" value={r[c.key]} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, [c.key]: e.target.value } : x)))} />
                  )}
                </td>
              ))}
              <td>
                <button className="x-btn" disabled={rows.length <= minRows} onClick={() => onChange(rows.filter((_, j) => j !== i))} title="Remove row">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn small" style={{ marginTop: 6 }} onClick={() => onChange([...rows, { ...blank }])}>+ Add row</button>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}
