import katex from 'katex';
import { memo, useMemo } from 'react';

/** KaTeX-rendered maths. Falls back to the raw source on a parse error. */
export const Tex = memo(function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false });
    } catch {
      return tex;
    }
  }, [tex, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
});
