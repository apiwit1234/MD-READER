'use client';
import type { Theme } from '@/types';
import { themeMeta } from '@/lib/themes';
import { ThemeIcon } from './ThemeIcon';
import { ArrowLeftRight } from 'lucide-react';

type Props = {
  theme: Theme;
  favorites: [Theme, Theme];
  onChange: (next: Theme) => void;
};

export function ThemeToggle({ theme, favorites, onChange }: Props) {
  const target: Theme = theme === favorites[0] ? favorites[1] : favorites[0];
  const meta = themeMeta(target);
  return (
    <button
      type="button"
      onClick={() => onChange(target)}
      aria-label={`Switch to ${meta.label} theme`}
      title={`Switch to ${meta.label}`}
      className="relative rounded-theme p-2 text-muted hover:bg-surface-2"
    >
      <ThemeIcon name={meta.icon} />
      <span
        aria-hidden
        className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-accent-fg"
      >
        <ArrowLeftRight className="h-2 w-2" />
      </span>
    </button>
  );
}
