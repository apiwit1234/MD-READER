'use client';
import { useState } from 'react';
import { Clipboard } from 'lucide-react';

type Props = {
  hostPath: string | null;
  hasActiveHighlight?: boolean;
  onClearHighlight?: () => void;
};

export function StatusStrip({ hostPath, hasActiveHighlight, onClearHighlight }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  if (!hostPath) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hostPath);
      setToast('Path copied');
      setTimeout(() => setToast(null), 1500);
    } catch {
      setToast('Copy failed');
      setTimeout(() => setToast(null), 1500);
    }
  };

  return (
    <div className="relative flex items-center justify-between border-t border-border bg-surface px-3 py-1.5 text-xs text-muted">
      <span className="truncate">{hostPath}</span>
      {hasActiveHighlight && (
        <button
          type="button"
          onClick={onClearHighlight}
          aria-label="Clear highlight"
          className="ml-2 flex-shrink-0 rounded px-2 py-0.5 hover:bg-surface-2"
        >
          Clear highlight
        </button>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy path"
        className="ml-2 flex-shrink-0 rounded px-2 py-0.5 hover:bg-surface-2"
      >
        <Clipboard className="mr-1 inline h-3 w-3" aria-hidden /> Copy path
      </button>
      {toast && (
        <div className="pointer-events-none absolute bottom-8 right-2 rounded bg-fg px-3 py-1 text-xs text-bg shadow">
          {toast}
        </div>
      )}
    </div>
  );
}
