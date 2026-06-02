'use client';
import { useEffect, useRef } from 'react';

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  total: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
};

export function FindBar({ query, onQueryChange, total, currentIndex, onNext, onPrev, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const display = total === 0 ? '0/0' : `${currentIndex + 1}/${total}`;

  return (
    <div className="sticky top-2 z-30 mx-auto flex w-fit items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 shadow-md">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onNext(); }
          else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onPrev(); }
          else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        }}
        placeholder="Find"
        className="w-48 rounded border border-border bg-surface-2 px-2 py-0.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <span className="min-w-[3rem] text-center font-mono text-[11px] text-muted">{display}</span>
      <button type="button" onClick={onPrev} aria-label="Previous match" className="rounded p-0.5 hover:bg-surface-2">▲</button>
      <button type="button" onClick={onNext} aria-label="Next match" className="rounded p-0.5 hover:bg-surface-2">▼</button>
      <button type="button" onClick={onClose} aria-label="Close find" className="rounded p-0.5 text-muted hover:bg-surface-2">✕</button>
    </div>
  );
}
