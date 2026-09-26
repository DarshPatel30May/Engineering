import { getQuantity, inputUnitsFor } from '../engine/quantities';
import { Tex } from './Tex';

export interface QValue {
  raw: string;
  unit: string;
}

export function parseNumber(raw: string): number {
  const s = raw.trim().replace(/,/g, '').replace(/\s+/g, '').replace(/[×x]10\^?([-+]?\d+)/i, 'e$1');
  if (!s) return NaN;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
  return parseFloat(s);
}

export function defaultUnit(quantity: string): string {
  const k = getQuantity(quantity);
  if (k.angle) return '°';
  if (k.percent) return '%';
  return k.hsc;
}

export function QuantityInput({ symbol, name, quantity, value, onChange, constant, placeholder }: { symbol: string; name: string; quantity: string; value: QValue; onChange: (v: QValue) => void; constant?: boolean; placeholder?: string }) {
  const units = inputUnitsFor(quantity);
  const invalid = value.raw.trim() !== '' && !isFinite(parseNumber(value.raw));
  return (
    <div className={`qin${constant ? ' constant' : ''}`}>
      <div className="sym"><Tex tex={symbol} /></div>
      <input
        type="text"
        inputMode="decimal"
        className={`num${invalid ? ' invalid' : ''}`}
        value={value.raw}
        placeholder={placeholder ?? 'value'}
        onChange={(e) => onChange({ ...value, raw: e.target.value })}
        aria-label={name}
      />
      {units.length > 1 || units[0] !== '' ? (
        <select value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value })} aria-label={`${name} unit`}>
          {units.map((u) => (
            <option key={u} value={u}>{u === '' ? '(none)' : u}</option>
          ))}
        </select>
      ) : (
        <span className="faint small">—</span>
      )}
      <div className="name">{name}{constant ? ' · default constant (editable)' : ''}</div>
    </div>
  );
}
