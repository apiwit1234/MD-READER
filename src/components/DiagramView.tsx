'use client';
import { useState } from 'react';
import type { Theme } from '@/types';
import { MermaidBlock } from './MermaidBlock';

type Props = {
  source: string;
  theme: Theme;
  onRendered?: () => void;
};

/** Full-pane view for standalone .mmd/.mermaid files: the whole file is one
 *  diagram, with a Source toggle for reading the raw text. */
export function DiagramView({ source, theme, onRendered }: Props) {
  const [showSource, setShowSource] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-1 border-b border-border px-2 py-1 text-xs">
        <button
          type="button"
          onClick={() => setShowSource(false)}
          aria-pressed={!showSource}
          className={`rounded px-2 py-0.5 ${!showSource ? 'bg-accent text-accent-fg' : 'hover:bg-surface-2'}`}
        >
          Diagram
        </button>
        <button
          type="button"
          onClick={() => setShowSource(true)}
          aria-pressed={showSource}
          className={`rounded px-2 py-0.5 ${showSource ? 'bg-accent text-accent-fg' : 'hover:bg-surface-2'}`}
        >
          Source
        </button>
      </div>
      {showSource ? (
        <pre className="flex-1 overflow-auto bg-surface p-3 font-mono text-sm text-fg">{source}</pre>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-2">
          <MermaidBlock source={source} theme={theme} onRendered={onRendered} />
        </div>
      )}
    </div>
  );
}
