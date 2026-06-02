'use client';
import type { Mode } from '@/lib/mode';

const LABELS: { mode: Mode; label: string }[] = [
  { mode: 'md', label: 'MD' },
  { mode: 'code', label: 'Code' },
  { mode: 'terminal', label: 'Terminal' },
];

type Props = { mode: Mode; onChange: (mode: Mode) => void };

export function ModeSwitcher({ mode, onChange }: Props) {
  return (
    <div className="flex items-center overflow-hidden rounded-theme border border-border text-xs">
      {LABELS.map(({ mode: m, label }) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={[
            'px-3 py-1 transition-colors',
            mode === m ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
