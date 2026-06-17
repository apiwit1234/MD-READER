'use client';
import { BookOpen, Ghost, Moon, Snowflake, Sparkles, Sun, TreePine, type LucideIcon } from 'lucide-react';

// Maps ThemeMeta.icon names to lucide components.
const MAP: Record<string, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  sparkles: Sparkles,
  snowflake: Snowflake,
  'book-open': BookOpen,
  ghost: Ghost,
  'tree-pine': TreePine,
};

export function ThemeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Sun;
  return <Icon className={className ?? 'h-4 w-4'} aria-hidden data-icon={name} />;
}
