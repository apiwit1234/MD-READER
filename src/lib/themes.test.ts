import { describe, it, expect } from 'vitest';
import { THEMES, THEME_IDS, isTheme, themeMode } from './themes';

describe('themes registry', () => {
  it('has 5 themes with unique ids', () => {
    expect(THEMES).toHaveLength(5);
    expect(new Set(THEME_IDS).size).toBe(5);
  });

  it('every theme has an icon, a label, and 4 swatch colors', () => {
    for (const t of THEMES) {
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.swatch).toHaveLength(4);
    }
  });

  it('isTheme accepts every registered id and rejects unknown values', () => {
    for (const id of THEME_IDS) expect(isTheme(id)).toBe(true);
    expect(isTheme('bogus')).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it('themeMode maps each theme to a light/dark base', () => {
    expect(themeMode('light')).toBe('light');
    expect(themeMode('dark')).toBe('dark');
    expect(themeMode('retro')).toBe('light');
    expect(themeMode('space')).toBe('dark');
    expect(themeMode('moneh')).toBe('light');
  });
});
