# Phase 2: Canva-Style UI/Theme Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4-theme system with 6 modern themes (Light, Dark, Aurora, Nord, Sepia, Dracula), rebuild the design tokens (radius/elevation/motion/gradient accents), switch icons to lucide-react, and restyle every component to a Canva-like modern look — with zero behavior/layout changes.

**Architecture:** Theme definitions become a single source of truth in `src/lib/themes.ts` (per-theme metadata incl. mermaid/hljs/terminal/titlebar mappings). CSS custom properties in `globals.css` carry color + shape + elevation + motion tokens per `data-theme`. Tailwind config maps tokens to utilities. Components are restyled via a class-mapping sweep plus a small shared `cx` recipe block in globals.css.

**Tech Stack:** Tailwind 3.4, CSS custom properties, lucide-react, existing React components (no structural changes).

**Conventions:** Spec at `docs/superpowers/specs/2026-06-10-pax-reader-2.0-revamp-design.md`. The existing token consumers use Tailwind utilities `bg-bg/bg-surface/bg-surface-2/text-fg/text-muted/border-border/bg-accent/text-accent/rounded-theme` — these names stay so most components keep working untouched; new tokens are additive.

---

### Task 1: New Theme type + theme table with surface mappings

**Files:**
- Modify: `src/lib/themes.ts` (full rewrite below)
- Test: `src/lib/themes.test.ts` (create or extend if exists)

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/themes.test.ts
import { describe, expect, it } from 'vitest';
import { THEMES, THEME_IDS, isTheme, migrateTheme, themeMeta, themeMode } from './themes';

describe('themes', () => {
  it('defines exactly the 6 revamp themes', () => {
    expect(THEME_IDS).toEqual(['light', 'dark', 'aurora', 'nord', 'sepia', 'dracula']);
  });

  it('every theme has complete surface mappings', () => {
    for (const t of THEMES) {
      expect(t.swatch).toHaveLength(4);
      expect(['light', 'dark']).toContain(t.mode);
      expect(['default', 'dark', 'neutral', 'base']).toContain(t.mermaid.theme);
      expect(t.titleBar.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.titleBar.fg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.terminal.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.terminal.foreground).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.terminal.cursor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('migrates removed themes to the surviving base', () => {
    expect(migrateTheme('cartoon-light')).toBe('light');
    expect(migrateTheme('cartoon-dark')).toBe('dark');
    expect(migrateTheme('retro')).toBe('light');
    expect(migrateTheme('space')).toBe('dark');
    expect(migrateTheme('nonsense')).toBe('light');
    expect(migrateTheme('dracula')).toBe('dracula');
  });

  it('themeMode reflects each theme base', () => {
    expect(themeMode('light')).toBe('light');
    expect(themeMode('sepia')).toBe('light');
    expect(themeMode('dark')).toBe('dark');
    expect(themeMode('aurora')).toBe('dark');
    expect(themeMode('nord')).toBe('dark');
    expect(themeMode('dracula')).toBe('dark');
  });

  it('isTheme rejects removed ids', () => {
    expect(isTheme('cartoon-light')).toBe(false);
    expect(isTheme('aurora')).toBe(true);
  });

  it('themeMeta falls back to light', () => {
    expect(themeMeta('aurora').label).toBe('Aurora');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/themes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite `src/lib/themes.ts`**

```ts
export type Theme = 'light' | 'dark' | 'aurora' | 'nord' | 'sepia' | 'dracula';

export type ThemeMeta = {
  id: Theme;
  label: string;
  icon: string; // lucide icon name rendered by ThemeIcon (see Task 4)
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

export function themeMode(id: Theme): 'light' | 'dark' {
  return themeMeta(id).mode;
}
```

- [ ] **Step 4: Run tests + type-check; fix fallout**

Run: `npx vitest run src/lib/themes.test.ts && npx tsc --noEmit`
Type errors will surface every place referencing `'cartoon-light' | 'cartoon-dark'` or `ThemeMeta.icon` as emoji — fix call sites mechanically (theme favorites defaults in `lib/storage.ts`, settings `AppearanceSection`, any literal theme arrays). `themeFavorites` default becomes `['light', 'dark']`; run `migrateTheme` over both stored favorites in `loadState` (it already migrates `theme` — confirm and mirror).

- [ ] **Step 5: Run the whole suite, commit**

```bash
npx vitest run
git add -A src
git commit -m "feat(themes): 6-theme table with mermaid/hljs/terminal/titlebar mappings, cartoon migration"
```

---

### Task 2: Design tokens in globals.css + tailwind.config.ts

**Files:**
- Modify: `src/app/globals.css` (replace lines 14-120: theme blocks + cartoon chrome rules)
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Replace the theme blocks in `globals.css`**

Delete `[data-theme="cartoon-light"]`, `[data-theme="cartoon-dark"]` blocks and ALL `[data-theme^="cartoon"]` rules (lines 42-120). Replace the `:root`/light/dark blocks with:

```css
/* ---- Design tokens. Color channels are space-separated RGB for Tailwind
   alpha support. Shape/elevation/motion tokens are per-theme tunable. ---- */
:root,
[data-theme="light"] {
  --c-bg: 255 255 255;
  --c-surface: 247 247 251;
  --c-surface-2: 240 240 247;
  --c-fg: 22 22 29;
  --c-muted: 110 112 128;
  --c-border: 228 228 238;
  --c-accent: 109 93 246;        /* #6D5DF6 blue-violet */
  --c-accent-2: 56 189 248;      /* gradient endpoint #38BDF8 */
  --c-accent-fg: 255 255 255;
  --c-accent-soft: 237 234 255;
  --c-danger: 225 29 72;
  --c-warn: 217 119 6;
  --c-ok: 5 150 105;
  --radius: 12px;
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px;
  --shadow-1: 0 1px 2px rgb(16 16 24 / 0.06);
  --shadow-2: 0 4px 12px rgb(16 16 24 / 0.08);
  --shadow-3: 0 12px 32px rgb(16 16 24 / 0.14);
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --glass: none; /* aurora overrides */
}

[data-theme="dark"] {
  --c-bg: 16 17 23;
  --c-surface: 24 26 35;
  --c-surface-2: 33 35 48;
  --c-fg: 232 233 240;
  --c-muted: 146 149 168;
  --c-border: 42 44 60;
  --c-accent: 139 124 255;       /* #8B7CFF */
  --c-accent-2: 94 200 248;
  --c-accent-fg: 255 255 255;
  --c-accent-soft: 41 37 78;
  --c-danger: 251 113 133;
  --c-warn: 251 191 36;
  --c-ok: 52 211 153;
  --radius: 12px;
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px;
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.35);
  --shadow-2: 0 4px 12px rgb(0 0 0 / 0.4);
  --shadow-3: 0 12px 32px rgb(0 0 0 / 0.55);
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --glass: none;
}

[data-theme="aurora"] {
  --c-bg: 14 11 30;
  --c-surface: 26 21 48;
  --c-surface-2: 36 27 69;
  --c-fg: 238 234 251;
  --c-muted: 158 149 195;
  --c-border: 53 43 96;
  --c-accent: 167 139 250;       /* #A78BFA */
  --c-accent-2: 125 211 252;     /* #7DD3FC */
  --c-accent-fg: 20 14 45;
  --c-accent-soft: 59 45 114;
  --c-danger: 251 113 133;
  --c-warn: 252 211 77;
  --c-ok: 110 231 183;
  --radius: 14px;
  --r-sm: 10px; --r-md: 14px; --r-lg: 18px;
  --shadow-1: 0 1px 3px rgb(8 5 20 / 0.5);
  --shadow-2: 0 6px 18px rgb(8 5 20 / 0.55);
  --shadow-3: 0 16px 40px rgb(8 5 20 / 0.7);
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --glass: blur(14px) saturate(1.4);
}

[data-theme="nord"] {
  --c-bg: 46 52 64;
  --c-surface: 59 66 82;
  --c-surface-2: 67 76 94;
  --c-fg: 236 239 244;
  --c-muted: 160 170 190;
  --c-border: 76 86 106;
  --c-accent: 136 192 208;       /* #88C0D0 */
  --c-accent-2: 129 161 193;     /* #81A1C1 */
  --c-accent-fg: 36 41 51;
  --c-accent-soft: 64 80 95;
  --c-danger: 191 97 106;
  --c-warn: 235 203 139;
  --c-ok: 163 190 140;
  --radius: 10px;
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px;
  --shadow-1: 0 1px 2px rgb(20 24 32 / 0.4);
  --shadow-2: 0 4px 12px rgb(20 24 32 / 0.45);
  --shadow-3: 0 12px 32px rgb(20 24 32 / 0.6);
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --glass: none;
}

[data-theme="sepia"] {
  --c-bg: 247 241 227;
  --c-surface: 253 248 236;
  --c-surface-2: 240 231 211;
  --c-fg: 61 52 39;
  --c-muted: 130 116 95;
  --c-border: 222 210 186;
  --c-accent: 181 128 60;        /* #B5803C */
  --c-accent-2: 142 101 48;
  --c-accent-fg: 255 251 240;
  --c-accent-soft: 238 224 198;
  --c-danger: 178 58 72;
  --c-warn: 170 110 20;
  --c-ok: 82 124 70;
  --radius: 10px;
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px;
  --shadow-1: 0 1px 2px rgb(90 70 40 / 0.10);
  --shadow-2: 0 4px 12px rgb(90 70 40 / 0.12);
  --shadow-3: 0 12px 32px rgb(90 70 40 / 0.18);
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --glass: none;
}

[data-theme="dracula"] {
  --c-bg: 40 42 54;
  --c-surface: 52 55 70;
  --c-surface-2: 60 63 81;
  --c-fg: 248 248 242;
  --c-muted: 154 158 180;
  --c-border: 68 71 90;
  --c-accent: 189 147 249;       /* #BD93F9 */
  --c-accent-2: 255 121 198;     /* #FF79C6 */
  --c-accent-fg: 30 31 41;
  --c-accent-soft: 72 62 105;
  --c-danger: 255 85 85;
  --c-warn: 241 250 140;
  --c-ok: 80 250 123;
  --radius: 12px;
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px;
  --shadow-1: 0 1px 2px rgb(15 16 22 / 0.45);
  --shadow-2: 0 4px 12px rgb(15 16 22 / 0.5);
  --shadow-3: 0 12px 32px rgb(15 16 22 / 0.65);
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --glass: none;
}
```

After the `body` rule, add the shared modern-chrome layer (replaces the cartoon chrome layer):

```css
/* ---- Modern chrome: motion, gradient accents, glass, scrollbars. ---- */
@media (prefers-reduced-motion: no-preference) {
  button, [role="tab"], input, select {
    transition: background-color 150ms var(--ease), border-color 150ms var(--ease),
                color 150ms var(--ease), box-shadow 200ms var(--ease),
                transform 150ms var(--ease);
  }
}

/* Primary action surfaces get the accent gradient. Components opt in with .btn-gradient. */
.btn-gradient {
  background-image: linear-gradient(135deg, rgb(var(--c-accent)), rgb(var(--c-accent-2)));
  color: rgb(var(--c-accent-fg));
}
.btn-gradient:hover { filter: brightness(1.08); box-shadow: var(--shadow-2); }
.btn-gradient:active { filter: brightness(0.96); transform: translateY(1px); }

/* Floating panels (modals, menus, popovers) — components opt in with .panel-float. */
.panel-float {
  border: 1px solid rgb(var(--c-border));
  border-radius: var(--r-lg);
  background-color: rgb(var(--c-surface));
  box-shadow: var(--shadow-3);
}
[data-theme="aurora"] .panel-float {
  background-color: rgb(var(--c-surface) / 0.75);
  backdrop-filter: var(--glass);
}

/* Slim themed scrollbars everywhere. */
* { scrollbar-width: thin; scrollbar-color: rgb(var(--c-border)) transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: rgb(var(--c-border)); border-radius: 8px; }
*::-webkit-scrollbar-thumb:hover { background: rgb(var(--c-muted) / 0.6); }
*::-webkit-scrollbar-track { background: transparent; }
```

- [ ] **Step 2: Extend `tailwind.config.ts`**

In `theme.extend` (merge with what exists — current config already maps `bg/surface/fg/muted/border/accent` colors and `rounded-theme`):

```ts
colors: {
  // keep existing: bg, surface, 'surface-2', fg, muted, border, accent, 'accent-fg', 'accent-soft'
  'accent-2': 'rgb(var(--c-accent-2) / <alpha-value>)',
  danger: 'rgb(var(--c-danger) / <alpha-value>)',
  warn: 'rgb(var(--c-warn) / <alpha-value>)',
  ok: 'rgb(var(--c-ok) / <alpha-value>)',
},
borderRadius: {
  theme: 'var(--radius)',
  'theme-sm': 'var(--r-sm)',
  'theme-md': 'var(--r-md)',
  'theme-lg': 'var(--r-lg)',
},
boxShadow: {
  'elev-1': 'var(--shadow-1)',
  'elev-2': 'var(--shadow-2)',
  'elev-3': 'var(--shadow-3)',
},
```

- [ ] **Step 3: Verify build + visual smoke**

Run: `npx tsc --noEmit && npm run build && npx vitest run`
Then `npm run dev`: switch through all 6 themes in Settings → Appearance — every surface recolors, no unstyled flash, no leftover cartoon styling.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "feat(design): token system rebuild — 6 theme palettes, radius/elevation/motion, glass, scrollbars"
```

---

### Task 3: Per-theme surface wiring (mermaid, hljs, terminal, title bar)

**Files:**
- Modify: `src/components/MermaidBlock.tsx` (initialize from theme table)
- Modify: `src/app/page.tsx` (titleBar effect — find the existing `window.setTitleBarColors` call wired to theme changes)
- Modify: `src/components/TerminalPanel.tsx` (xterm theme option)
- Modify: hljs stylesheet wiring (find where `rehype-highlight` CSS is imported — likely `globals.css` or `layout.tsx`; the `.dark` class already switches it, which keeps working since `themeMode` drives `.dark`)

- [ ] **Step 1: MermaidBlock uses the theme table**

Replace the `mermaid.initialize` call from Phase 1 with:

```tsx
import { themeMeta } from '@/lib/themes';
// ...
const meta = themeMeta(theme);
mermaid.initialize({
  startOnLoad: false,
  theme: meta.mermaid.theme,
  themeVariables: meta.mermaid.themeVariables,
  securityLevel: 'strict',
});
```

- [ ] **Step 2: Title bar colors from the table**

Locate the effect in `page.tsx` that calls `getApi().window.setTitleBarColors(...)` on theme change (search `setTitleBarColors`). Replace its color derivation with:

```tsx
const meta = themeMeta(state.theme);
void getApi().window.setTitleBarColors(meta.titleBar.bg); // keep the existing call signature
```

If the existing IPC takes one color string, keep it; if it takes `{bg, fg}`, pass both from `meta.titleBar`. Match the existing `window:setTitleBarColors` handler signature in `electron/main.cjs` — do not change the IPC contract in this task.

- [ ] **Step 3: Terminal palette**

In `TerminalPanel.tsx`, find where `new Terminal({...})` is constructed; add/replace the `theme` option, re-applied when the app theme changes (xterm supports live `terminal.options.theme = ...`):

```tsx
import { themeMeta } from '@/lib/themes';
// at construction and in a theme-change effect:
const t = themeMeta(theme).terminal;
term.options.theme = {
  background: t.background,
  foreground: t.foreground,
  cursor: t.cursor,
  selectionBackground: t.selectionBackground,
};
```

`TerminalPanel` may not currently receive `theme` as a prop — pass it down from `page.tsx` like other themed components (`BottomPanel` → `TerminalPanel`).

- [ ] **Step 4: CodeMirror editor theme**

`CodeEditor.tsx` builds its CodeMirror extensions; today it likely keys dark styling off the theme mode. Drive it from the tokens instead so all 6 themes match: add an `EditorView.theme` extension built from CSS variables (they resolve at paint time, so one extension serves all themes):

```tsx
import { EditorView } from '@codemirror/view';

const themedEditor = EditorView.theme({
  '&': { backgroundColor: 'rgb(var(--c-bg))', color: 'rgb(var(--c-fg))' },
  '.cm-gutters': { backgroundColor: 'rgb(var(--c-surface))', color: 'rgb(var(--c-muted))', border: 'none' },
  '.cm-activeLine': { backgroundColor: 'rgb(var(--c-surface-2) / 0.6)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgb(var(--c-surface-2))' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'rgb(var(--c-accent-soft))' },
  '.cm-cursor': { borderLeftColor: 'rgb(var(--c-accent))' },
});
```

Append `themedEditor` to the existing extension array; keep the existing syntax-highlight extension switched by `themeMode(theme)` (`oneDark` or equivalent for dark-mode themes) as today.

- [ ] **Step 5: Verify, run suite, commit**

Manual: per theme — open a mermaid diagram (colors match palette), code block (hljs readable), code editor (background/gutter/selection match), terminal (background matches), title bar matches.

```bash
npx vitest run && npx tsc --noEmit
git add -A src
git commit -m "feat(themes): mermaid/terminal/titlebar surfaces driven by the theme table"
```

---

### Task 4: lucide-react icons

**Files:**
- Modify: `package.json` (`npm install --save-dev lucide-react` — renderer dep, bundled by Next)
- Create: `src/components/ThemeIcon.tsx`
- Modify: every component using emoji/ad-hoc glyph icons

- [ ] **Step 1: Install + ThemeIcon helper**

```tsx
// src/components/ThemeIcon.tsx — maps ThemeMeta.icon names to lucide components
import { BookOpen, Ghost, Moon, Snowflake, Sparkles, Sun, type LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  sun: Sun, moon: Moon, sparkles: Sparkles, snowflake: Snowflake,
  'book-open': BookOpen, ghost: Ghost,
};

export function ThemeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Sun;
  return <Icon className={className ?? 'h-4 w-4'} aria-hidden />;
}
```

- [ ] **Step 2: Sweep emoji icons → lucide**

Grep for emoji and glyph buttons and replace with lucide equivalents at `h-4 w-4` (chrome) / `h-3.5 w-3.5` (dense rows). Known sites and mappings:

| Site | Old | New lucide |
|---|---|---|
| `MermaidBlock.tsx` reset | `⟳` | `RotateCcw` |
| `MermaidBlock.tsx` open-in-tab | `↗` | `ExternalLink` |
| `MermaidBlock.tsx` fullscreen | `⛶` | `Maximize2` |
| `MermaidBlock.tsx` copy source | `📋` | `Clipboard` |
| `MermaidBlock.tsx` fullscreen close | `✕` | `X` |
| Theme picker (AppearanceSection/ThemeToggle) | emoji per theme | `ThemeIcon` |
| TabBar close/pin, Sidebar chevrons/folder actions, SettingsModal close, toasts | various | `X`, `Pin`, `ChevronRight`, `ChevronDown`, `FolderOpen`, `Plus`, `Search`, `GitBranch`, `TerminalSquare`, `Settings` |

Run `npx vitest run` after each component file — tests asserting on emoji text (e.g. MermaidBlock copy button) must switch to `aria-label` queries (labels already exist).

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npx vitest run && npm run build
git add -A src package.json package-lock.json
git commit -m "feat(ui): lucide-react icon set replaces emoji glyphs"
```

---

### Task 5: Component restyle sweep

**Files:**
- Modify: `src/components/TabBar.tsx`, `Sidebar.tsx`, `StatusStrip.tsx`, `BottomPanel.tsx`, `SettingsModal.tsx`, `FolderPickerModal.tsx`, `SearchPanel.tsx`, `GitPanel.tsx`, toast/context-menu components, `MarkdownView.tsx` find bar
- No behavior or prop changes; class-level only.

- [ ] **Step 1: Apply the class mapping**

Mechanical sweep, file by file; commit per file or logical group. Mapping (old pattern → new):

| Old | New |
|---|---|
| `rounded`, `rounded-md` on buttons/inputs | `rounded-theme-sm` |
| `rounded-lg`/cards/modals | `rounded-theme-lg panel-float` (drop ad-hoc `border ... shadow-xl`) |
| `shadow`, `shadow-md`, `shadow-xl` | `shadow-elev-1/-2/-3` respectively |
| primary action buttons (`bg-accent text-accent-fg`) | add `btn-gradient` (remove `bg-accent`) |
| square icon buttons | `rounded-theme-sm p-1.5 hover:bg-surface-2 active:scale-95` |
| text inputs/selects | `rounded-theme-sm border border-border bg-surface-2 px-2.5 py-1.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30` |
| active tab styling | `rounded-t-theme-sm` + bottom 2px gradient indicator: an absolutely-positioned `<span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-2" />` |
| red/danger ad-hoc colors (`text-red-*`, `bg-red-*`) | `text-danger`, `bg-danger/10`, `border-danger/40` |
| green/ok ad-hoc | `text-ok` etc. |

- [ ] **Step 2: Modal polish (SettingsModal, FolderPickerModal)**

Backdrop: `bg-black/40 backdrop-blur-sm` with a 150ms fade (`animate-[fadeIn_150ms_var(--ease)]`; add the keyframes to globals.css):

```css
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes popIn { from { opacity: 0; transform: scale(0.97) translateY(4px) } to { opacity: 1; transform: none } }
```

Dialog card: `panel-float animate-[popIn_180ms_var(--ease)]`.

- [ ] **Step 3: Verify per surface, then full pass**

After each file: `npx vitest run` (component tests are behavioral and should not break). Full manual sweep in `npm run dev` across all 6 themes using the spec's checklist: sidebar, tabs, markdown view, code editor, diff view, terminal, search, settings, toasts, mermaid blocks, context menus, drag overlays, find bar.

- [ ] **Step 4: Commit (per group during the sweep, final)**

```bash
git add -A src
git commit -m "feat(ui): Canva-style restyle sweep — gradients, floating panels, motion, semantic colors"
```

---

### Task 6: Settings appearance strip + theme favorites for 6 themes

**Files:**
- Modify: `src/components/settings/AppearanceSection.tsx`, `src/components/ThemeToggle.tsx`

- [ ] **Step 1:** Theme strip renders from `THEMES` (it already maps over the array — verify nothing hardcodes 4 slots; the swatch quads come straight from `ThemeMeta.swatch`). Favorites UI: both slots offer all 6 themes; stored favorites run through `migrateTheme` on load (done in Task 1 Step 4 — verify here).
- [ ] **Step 2:** `npx vitest run && npx tsc --noEmit`; manual check of the picker, favorites toggle cycling, persistence across restart.
- [ ] **Step 3:** Commit: `git commit -am "feat(settings): appearance strip and favorites for the 6-theme set"`

---

### Task 7: Full regression + docs

- [ ] **Step 1:** `npx tsc --noEmit && npx vitest run && npm run lint && npm run build` — all clean.
- [ ] **Step 2:** Manual regression with the spec checklist across all 6 themes; verify localStorage from a pre-revamp profile migrates (set `mdreader` theme key to `cartoon-dark` manually → app loads as `dark`).
- [ ] **Step 3:** Update `README.md` theme list. Commit:

```bash
git add README.md
git commit -m "docs: phase 2 — modern design system and 6-theme set"
```
