/**
 * App-wide settings: working mode, significant figures, theme, g.
 * Stored in localStorage (wrapped in try/catch — storage may be unavailable).
 */
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { SigFigMode } from './engine/format';
import { setGravity } from './engine/formulas';

export type WorkingMode = 'quick' | 'full';
export type Theme = 'dark' | 'light';

export interface Settings {
  mode: WorkingMode;
  sf: SigFigMode;
  theme: Theme;
  g: number;
}

interface Ctx extends Settings {
  set: (patch: Partial<Settings>) => void;
}

const DEFAULTS: Settings = { mode: 'full', sf: 'auto', theme: 'dark', g: 9.81 };
const KEY = 'hsc-eng-settings-v1';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return DEFAULTS;
}

const SettingsCtx = createContext<Ctx>({ ...DEFAULTS, set: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(load);
  useEffect(() => {
    document.documentElement.dataset.theme = s.theme;
    setGravity(s.g);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);
  const value = useMemo(() => ({ ...s, set: (p: Partial<Settings>) => setS((prev) => ({ ...prev, ...p })) }), [s]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => useContext(SettingsCtx);
