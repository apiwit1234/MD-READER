export type Theme = 'light' | 'dark' | 'retro' | 'space' | 'moneh';

export type ThemeMeta = {
  id: Theme;
  label: string;
  icon: string; // emoji
  swatch: [string, string, string, string]; // 4 hex shown in the settings strip
};

export const THEMES: ThemeMeta[] = [
  { id: 'light', label: 'Light',         icon: '☀️', swatch: ['#FFFFFF', '#F8FAFC', '#0F172A', '#2563EB'] },
  { id: 'dark',  label: 'Dark',          icon: '🌙', swatch: ['#0F172A', '#1E293B', '#F1F5F9', '#3B82F6'] },
  { id: 'retro', label: 'Retro Calm',    icon: '🎨', swatch: ['#F7F2E9', '#81D8D0', '#D99E82', '#AE82D9'] },
  { id: 'space', label: 'Space & Stars', icon: '🪐', swatch: ['#0A0E1F', '#121833', '#8B7CF6', '#5EEAD4'] },
  { id: 'moneh', label: 'Moneh',         icon: '💎', swatch: ['#FFFFFF', '#F6F7F9', '#5B4BDB', '#00C896'] },
];

export const THEME_IDS: Theme[] = THEMES.map((t) => t.id);

export function isTheme(x: unknown): x is Theme {
  return typeof x === 'string' && (THEME_IDS as string[]).includes(x);
}

export function themeMeta(id: Theme): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// Light/dark base of each theme. Drives the `.dark` class (prose, highlight.js,
// mermaid, find-hit) — distinct from the per-theme color tokens (data-theme).
const DARK_THEMES: ReadonlySet<Theme> = new Set<Theme>(['dark', 'space']);

export function themeMode(id: Theme): 'light' | 'dark' {
  return DARK_THEMES.has(id) ? 'dark' : 'light';
}
