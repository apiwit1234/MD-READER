import { describe, it, expect } from 'vitest';
import { THEMES, THEME_IDS, isTheme, themeMode, themeMeta, migrateTheme } from './themes';

describe('themes registry', () => {
  it('defines exactly the 7 themes', () => {
    expect(THEME_IDS).toEqual(['light', 'dark', 'aurora', 'nord', 'sepia', 'dracula', 'christmas']);
    expect(THEMES).toHaveLength(7);
  });

  it('every theme has complete surface mappings', () => {
    for (const t of THEMES) {
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.swatch).toHaveLength(4);
      expect(['light', 'dark']).toContain(t.mode);
      expect(['default', 'dark', 'neutral', 'base']).toContain(t.mermaid.theme);
      expect(t.titleBar.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.titleBar.fg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.terminal.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.terminal.foreground).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.terminal.cursor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.terminal.selectionBackground).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('isTheme accepts registered ids and rejects removed/unknown values', () => {
    for (const id of THEME_IDS) expect(isTheme(id)).toBe(true);
    for (const removed of ['retro', 'space', 'moneh', 'cartoon', 'cartoon-light', 'cartoon-dark', 'bogus']) {
      expect(isTheme(removed)).toBe(false);
    }
    expect(isTheme(null)).toBe(false);
  });

  it('themeMode maps each theme to a light/dark base', () => {
    expect(themeMode('light')).toBe('light');
    expect(themeMode('sepia')).toBe('light');
    expect(themeMode('dark')).toBe('dark');
    expect(themeMode('aurora')).toBe('dark');
    expect(themeMode('nord')).toBe('dark');
    expect(themeMode('dracula')).toBe('dark');
    expect(themeMode('christmas')).toBe('dark');
  });

  it('themeMeta resolves and falls back to light', () => {
    expect(themeMeta('aurora').label).toBe('Aurora');
    expect(themeMeta('nope' as never).id).toBe('light');
  });
});

describe('migrateTheme', () => {
  it('keeps valid themes', () => {
    expect(migrateTheme('light')).toBe('light');
    expect(migrateTheme('dark')).toBe('dark');
    expect(migrateTheme('dracula')).toBe('dracula');
  });

  it('maps removed themes to the surviving base', () => {
    expect(migrateTheme('space')).toBe('dark');
    expect(migrateTheme('retro')).toBe('light');
    expect(migrateTheme('moneh')).toBe('light');
    expect(migrateTheme('cartoon')).toBe('light');
    expect(migrateTheme('cartoon-light')).toBe('light');
    expect(migrateTheme('cartoon-dark')).toBe('dark');
  });

  it('falls back to light for unknown values', () => {
    expect(migrateTheme('neon')).toBe('light');
    expect(migrateTheme(null)).toBe('light');
    expect(migrateTheme(42)).toBe('light');
  });
});
