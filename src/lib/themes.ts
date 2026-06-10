export type Theme = 'light' | 'dark' | 'aurora' | 'nord' | 'sepia' | 'dracula';

export type ThemeMeta = {
  id: Theme;
  label: string;
  icon: string; // lucide icon name rendered by ThemeIcon
  mode: 'light' | 'dark';
  swatch: [string, string, string, string]; // bg, surface, fg, accent — settings strip
  mermaid: { theme: 'default' | 'dark' | 'neutral' | 'base'; themeVariables?: Record<string, string> };
  hljs: 'light' | 'dark'; // which bundled highlight stylesheet to activate
  titleBar: { bg: string; fg: string };
  terminal: { background: string; foreground: string; cursor: string; selectionBackground: string };
};

export const THEMES: ThemeMeta[] = [
  {
    id: 'light', label: 'Light', icon: 'sun', mode: 'light',
    swatch: ['#FFFFFF', '#F7F7FB', '#16161D', '#6D5DF6'],
    mermaid: { theme: 'default' },
    hljs: 'light',
    titleBar: { bg: '#FFFFFF', fg: '#16161D' },
    terminal: { background: '#FFFFFF', foreground: '#16161D', cursor: '#6D5DF6', selectionBackground: '#DCD8FD' },
  },
  {
    id: 'dark', label: 'Dark', icon: 'moon', mode: 'dark',
    swatch: ['#101117', '#181A23', '#E8E9F0', '#8B7CFF'],
    mermaid: { theme: 'dark' },
    hljs: 'dark',
    titleBar: { bg: '#101117', fg: '#E8E9F0' },
    terminal: { background: '#101117', foreground: '#E8E9F0', cursor: '#8B7CFF', selectionBackground: '#33344A' },
  },
  {
    id: 'aurora', label: 'Aurora', icon: 'sparkles', mode: 'dark',
    swatch: ['#0E0B1E', '#1A1530', '#EEEAFB', '#A78BFA'],
    mermaid: {
      theme: 'base',
      themeVariables: {
        darkMode: 'true', background: '#0E0B1E', primaryColor: '#2A2150',
        primaryTextColor: '#EEEAFB', primaryBorderColor: '#A78BFA',
        lineColor: '#7DD3FC', secondaryColor: '#1A1530', tertiaryColor: '#241B45',
      },
    },
    hljs: 'dark',
    titleBar: { bg: '#0E0B1E', fg: '#EEEAFB' },
    terminal: { background: '#0E0B1E', foreground: '#EEEAFB', cursor: '#A78BFA', selectionBackground: '#3B2D72' },
  },
  {
    id: 'nord', label: 'Nord', icon: 'snowflake', mode: 'dark',
    swatch: ['#2E3440', '#3B4252', '#ECEFF4', '#88C0D0'],
    mermaid: {
      theme: 'base',
      themeVariables: {
        darkMode: 'true', background: '#2E3440', primaryColor: '#434C5E',
        primaryTextColor: '#ECEFF4', primaryBorderColor: '#88C0D0',
        lineColor: '#81A1C1', secondaryColor: '#3B4252', tertiaryColor: '#4C566A',
      },
    },
    hljs: 'dark',
    titleBar: { bg: '#2E3440', fg: '#ECEFF4' },
    terminal: { background: '#2E3440', foreground: '#D8DEE9', cursor: '#88C0D0', selectionBackground: '#4C566A' },
  },
  {
    id: 'sepia', label: 'Sepia Paper', icon: 'book-open', mode: 'light',
    swatch: ['#F7F1E3', '#FDF8EC', '#3D3427', '#B5803C'],
    mermaid: { theme: 'neutral' },
    hljs: 'light',
    titleBar: { bg: '#F7F1E3', fg: '#3D3427' },
    terminal: { background: '#F7F1E3', foreground: '#3D3427', cursor: '#B5803C', selectionBackground: '#E8DCC2' },
  },
  {
    id: 'dracula', label: 'Dracula', icon: 'ghost', mode: 'dark',
    swatch: ['#282A36', '#343746', '#F8F8F2', '#BD93F9'],
    mermaid: {
      theme: 'base',
      themeVariables: {
        darkMode: 'true', background: '#282A36', primaryColor: '#44475A',
        primaryTextColor: '#F8F8F2', primaryBorderColor: '#BD93F9',
        lineColor: '#FF79C6', secondaryColor: '#343746', tertiaryColor: '#3C3F51',
      },
    },
    hljs: 'dark',
    titleBar: { bg: '#282A36', fg: '#F8F8F2' },
    terminal: { background: '#282A36', foreground: '#F8F8F2', cursor: '#BD93F9', selectionBackground: '#44475A' },
  },
];

export const THEME_IDS: Theme[] = THEMES.map((t) => t.id);

export function isTheme(x: unknown): x is Theme {
  return typeof x === 'string' && (THEME_IDS as string[]).includes(x);
}

export function themeMeta(id: Theme): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

// Removed/renamed themes — mapped to the surviving theme with the same base.
// 'cartoon' split into cartoon-light/cartoon-dark in v1.0.5; both retired in 2.0.
const LEGACY_THEME_MAP: Record<string, Theme> = {
  retro: 'light',
  moneh: 'light',
  space: 'dark',
  cartoon: 'light',
  'cartoon-light': 'light',
  'cartoon-dark': 'dark',
};

/** Coerce any stored value to a valid Theme, mapping removed themes by base. */
export function migrateTheme(x: unknown): Theme {
  if (isTheme(x)) return x;
  if (typeof x === 'string' && x in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[x];
  return 'light';
}

// Light/dark base of each theme. Drives the `.dark` class (prose, highlight.js,
// find-hit) — distinct from the per-theme color tokens (data-theme).
export function themeMode(id: Theme): 'light' | 'dark' {
  return themeMeta(id).mode;
}
