import { useEffect, useState } from 'react';
import { MODULE_NAMES, ModuleId } from './engine/formulas/types';
import { ConstantsPage } from './pages/ConstantsPage';
import { FormulaLibrary } from './pages/FormulaLibrary';
import { ModulePage } from './pages/ModulePage';
import { SmartSolver } from './pages/SmartSolver';
import { ToolPage } from './pages/ToolPage';
import { UnitConverter } from './pages/UnitConverter';
import { useRoute } from './router';
import { SettingsProvider, useSettings } from './settings';
import type { SigFigMode } from './engine/format';
import type { ToolId } from './data/modules';

const NAV: { path: string; label: string; num?: string; section?: string }[] = [
  { path: 'solver', label: 'Smart Solver', num: '⌕', section: 'Solve' },
  { path: 'module/civil', label: 'Civil Structures', num: '01', section: 'HSC modules' },
  { path: 'module/transport', label: 'Personal & Public Transport', num: '02' },
  { path: 'module/aero', label: 'Aeronautical Engineering', num: '03' },
  { path: 'module/telecom', label: 'Telecommunications Engineering', num: '04' },
  { path: 'library', label: 'Formula Library', num: 'ƒ', section: 'Reference' },
  { path: 'units', label: 'Unit Converter', num: '⇄' },
  { path: 'constants', label: 'Constants & Data', num: 'κ' },
];

function Controls() {
  const s = useSettings();
  const sfOpts: { v: SigFigMode; l: string }[] = [
    { v: 'auto', l: 'Auto' },
    { v: 2, l: '2' },
    { v: 3, l: '3' },
    { v: 4, l: '4' },
    { v: 'full', l: 'Full' },
  ];
  return (
    <>
      <div className="ctl">
        <span className="ctl-label">Working</span>
        <div className="seg">
          <button className={s.mode === 'quick' ? 'on' : ''} onClick={() => s.set({ mode: 'quick' })}>Quick</button>
          <button className={s.mode === 'full' ? 'on' : ''} onClick={() => s.set({ mode: 'full' })}>Full HSC</button>
        </div>
      </div>
      <div className="ctl">
        <span className="ctl-label">s.f.</span>
        <div className="seg">
          {sfOpts.map((o) => (
            <button key={String(o.v)} className={s.sf === o.v ? 'on' : ''} onClick={() => s.set({ sf: o.v })}>{o.l}</button>
          ))}
        </div>
      </div>
      <div className="ctl">
        <span className="ctl-label">g</span>
        <div className="seg">
          <button className={s.g === 9.81 ? 'on' : ''} onClick={() => s.set({ g: 9.81 })}>9.81</button>
          <button className={s.g === 9.8 ? 'on' : ''} onClick={() => s.set({ g: 9.8 })}>9.8</button>
        </div>
      </div>
      <button className="btn small ghost" onClick={() => s.set({ theme: s.theme === 'dark' ? 'light' : 'dark' })} title="Toggle light/dark mode">
        {s.theme === 'dark' ? '☀ Light' : '☾ Dark'}
      </button>
    </>
  );
}

function Shell() {
  const route = useRoute();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => setNavOpen(false), [route.join('/')]);
  const path = route.join('/');
  let title = 'Smart Solver';
  let crumb = 'Paste an HSC question — deterministic working';
  let page = <SmartSolver />;
  if (route[0] === 'module' && route[1] in MODULE_NAMES) {
    const m = route[1] as ModuleId;
    title = MODULE_NAMES[m];
    crumb = `HSC Module ${['civil', 'transport', 'aero', 'telecom'].indexOf(m) + 1}`;
    page = <ModulePage module={m} itemKey={route[2]} />;
  } else if (route[0] === 'library') {
    title = 'Formula Library';
    crumb = 'Searchable database & coverage matrix';
    page = <FormulaLibrary selected={route[1]} />;
  } else if (route[0] === 'units') {
    title = 'Unit Converter';
    crumb = 'Coherent SI conversions';
    page = <UnitConverter />;
  } else if (route[0] === 'constants') {
    title = 'Constants & Data';
    crumb = 'Standard values and typical material properties';
    page = <ConstantsPage />;
  } else if (route[0] === 'tool' && route[1]) {
    title = 'Tool';
    crumb = '';
    page = <ToolPage id={route[1] as ToolId} />;
  }
  return (
    <div className={`app${navOpen ? ' nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">
            <span className="brand-mark">Σ</span>
            HSC Engineering Solver
          </div>
          <div className="brand-sub">NSW Engineering Studies · Stage 6</div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <div key={n.path} style={{ display: 'contents' }}>
              {n.section && <div className="nav-section">{n.section}</div>}
              <a href={`#/${n.path}`} className={path === n.path || path.startsWith(n.path + '/') ? 'active' : ''}>
                <span className="nav-num">{n.num}</span>
                {n.label}
              </a>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          All arithmetic is performed by a deterministic engine in coherent SI units. No AI or network service is used for calculation.
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn small menu-btn" onClick={() => setNavOpen((o) => !o)} aria-label="Open navigation">☰</button>
          <div>
            <h1>{title}</h1>
            {crumb && <div className="crumb">{crumb}</div>}
          </div>
          <div className="spacer" />
          <Controls />
        </header>
        <main className="content" onClick={() => navOpen && setNavOpen(false)}>
          <div className="content-inner">{page}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}
