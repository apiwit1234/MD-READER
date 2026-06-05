import { describe, it, expect } from 'vitest';
import { THEMES, THEME_IDS, isTheme, themeMode, migrateTheme } from './themes';

describe('themes registry', () => {
  it('has exactly light, dark, cartoon-light, cartoon-dark', () => {
    expect(THEME_IDS).toEqual(['light', 'dark', 'cartoon-light', 'cartoon-dark']);
    expect(THEMES).toHaveLength(4);
  });

  it('every theme has an icon, a label, and 4 swatch colors', () => {
    for (const t of THEMES) {
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.swatch).toHaveLength(4);
    }
  });

  it('isTheme accepts registered ids and rejects removed/unknown values', () => {
    for (const id of THEME_IDS) expect(isTheme(id)).toBe(true);
    for (const removed of ['retro', 'space', 'moneh', 'cartoon', 'bogus']) expect(isTheme(removed)).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it('themeMode maps each theme to a light/dark base', () => {
    expect(themeMode('light')).toBe('light');
    expect(themeMode('dark')).toBe('dark');
    expect(themeMode('cartoon-light')).toBe('light');
    expect(themeMode('cartoon-dark')).toBe('dark');
  });
});

describe('migrateTheme', () => {
  it('keeps valid themes', () => {
    expect(migrateTheme('light')).toBe('light');
    expect(migrateTheme('dark')).toBe('dark');
    expect(migrateTheme('cartoon-light')).toBe('cartoon-light');
    expect(migrateTheme('cartoon-dark')).toBe('cartoon-dark');
  });

  it('maps removed dark-base theme to dark, light-base to light', () => {
    expect(migrateTheme('space')).toBe('dark');
    expect(migrateTheme('retro')).toBe('light');
    expect(migrateTheme('moneh')).toBe('light');
  });

  it('maps the pre-1.0.5 cartoon theme to cartoon-light', () => {
    expect(migrateTheme('cartoon')).toBe('cartoon-light');
  });

  it('falls back to light for unknown values', () => {
    expect(migrateTheme('neon')).toBe('light');
    expect(migrateTheme(null)).toBe('light');
    expect(migrateTheme(42)).toBe('light');
  });
});
