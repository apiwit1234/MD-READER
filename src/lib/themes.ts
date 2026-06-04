export type Theme = 'light' | 'dark' | 'cartoon';

export type ThemeMeta = {
  id: Theme;
  label: string;
  icon: string; // emoji
  swatch: [string, string, string, string]; // 4 hex shown in the settings strip
};

export const THEMES: ThemeMeta[] = [
  { id: 'light',   label: 'Light',   icon: '☀️', swatch: ['#FFFFFF', '#F8FAFC', '#0F172A', '#2563EB'] },
  { id: 'dark',    label: 'Dark',    icon: '🌙', swatch: ['#0F172A', '#1E293B', '#F1F5F9', '#3B82F6'] },
  { id: 'cartoon', label: 'Cartoon', icon: '🎨', swatch: ['#FFFDF8', '#FFF4DA', '#111827', '#FFC480'] },
];

export const THEME_IDS: Theme[] = THEMES.map((t) => t.id);

export function isTheme(x: unknown): x is Theme {
  return typeof x === 'string' && (THEME_IDS as string[]).includes(x);
}

export function themeMeta(id: Theme): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// Removed in v1.1 — mapped to the surviving theme with the same light/dark base.
const LEGACY_THEME_MAP: Record<string, Theme> = { retro: 'light', moneh: 'light', space: 'dark' };

/** Coerce any stored value to a valid Theme, mapping removed themes by base. */
export function migrateTheme(x: unknown): Theme {
  if (isTheme(x)) return x;
  if (typeof x === 'string' && x in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[x];
  return 'light';
}

// Light/dark base of each theme. Drives the `.dark` class (prose, highlight.js,
// mermaid, find-hit) — distinct from the per-theme color tokens (data-theme).
const DARK_THEMES: ReadonlySet<Theme> = new Set<Theme>(['dark']);

export function themeMode(id: Theme): 'light' | 'dark' {
  return DARK_THEMES.has(id) ? 'dark' : 'light';
}
