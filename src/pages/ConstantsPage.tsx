import { FRICTION, MATERIALS, PHYSICAL_CONSTANTS, REFRACTIVE } from '../data/constants';

export function ConstantsPage() {
  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-head"><h2>Standard values</h2></div>
        <div className="panel-body table-wrap">
          <table className="data-table">
            <thead><tr><th>Quantity</th><th>Symbol</th><th>Value</th><th>Unit</th><th>Note</th></tr></thead>
            <tbody>
              {PHYSICAL_CONSTANTS.map((c) => (
                <tr key={c.name}><td style={{ fontFamily: 'var(--sans)' }}>{c.name}</td><td>{c.symbol}</td><td>{c.value}</td><td>{c.unit}</td><td style={{ fontFamily: 'var(--sans)' }}>{c.note}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Typical material properties</h2><span className="tag warn">indicative — use values given in the question</span></div>
        <div className="panel-body table-wrap">
          <table className="data-table">
            <thead><tr><th>Material</th><th>E (GPa)</th><th>Density (kg/m³)</th><th>UTS (MPa)</th><th>Note</th></tr></thead>
            <tbody>
              {MATERIALS.map((m) => (
                <tr key={m.material}><td style={{ fontFamily: 'var(--sans)' }}>{m.material}</td><td>{m.E}</td><td>{m.density}</td><td>{m.uts}</td><td style={{ fontFamily: 'var(--sans)' }}>{m.note}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head"><h2>Typical coefficients of friction</h2></div>
          <div className="panel-body">
            <table className="data-table">
              <thead><tr><th>Surfaces</th><th>μ (static)</th></tr></thead>
              <tbody>{FRICTION.map((f) => <tr key={f.pair}><td style={{ fontFamily: 'var(--sans)' }}>{f.pair}</td><td>{f.mu}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Refractive indices</h2></div>
          <div className="panel-body">
            <table className="data-table">
              <thead><tr><th>Medium</th><th>n</th></tr></thead>
              <tbody>{REFRACTIVE.map((r) => <tr key={r.medium}><td style={{ fontFamily: 'var(--sans)' }}>{r.medium}</td><td>{r.n}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
