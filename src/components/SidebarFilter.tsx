'use client';
import { X } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SidebarFilter({ value, onChange }: Props) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter files..."
        className="w-full rounded border border-border bg-surface px-2 py-1 pr-7 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-xs text-muted hover:bg-surface-2 hover:text-fg"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}
