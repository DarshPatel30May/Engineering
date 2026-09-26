import { useEffect, useState } from 'react';

/** Minimal hash router: #/path/segments */
export function useRoute(): string[] {
  const parse = () => (window.location.hash.replace(/^#\/?/, '') || 'solver').split('/').filter(Boolean).map(decodeURIComponent);
  const [route, setRoute] = useState<string[]>(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = '#/' + path.replace(/^\//, '');
}

/** Simple cross-page hand-off for pre-filling a tool from the Smart Solver. */
let pending: { tool: string; input: unknown } | null = null;
export function setPendingTool(tool: string, input: unknown) {
  pending = { tool, input };
}
export function takePendingTool<T>(tool: string): T | null {
  if (pending && pending.tool === tool) {
    const p = pending.input as T;
    pending = null;
    return p;
  }
  return null;
}
