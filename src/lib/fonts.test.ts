import { describe, expect, test } from 'vitest';
import { buildFontChain, familyFor, BUILTIN_FONTS } from './fonts';

const CUSTOMS = [{ id: 'custom-sarabun', label: 'Sarabun' }];

describe('familyFor', () => {
  test('default means no override', () => {
    expect(familyFor('default', CUSTOMS)).toBeNull();
  });

  test('builtin and custom map to quoted families', () => {
    expect(familyFor('noto-sans-thai', CUSTOMS)).toBe("'Noto Sans Thai'");
    expect(familyFor('custom-sarabun', CUSTOMS)).toBe("'custom-sarabun'");
  });

  test('unknown custom id means no override', () => {
    expect(familyFor('custom-gone', CUSTOMS)).toBeNull();
  });
});

describe('buildFontChain', () => {
  const base = { fontSource: 'default', fontSplit: false, fontEnglish: 'default', fontThai: 'default' };

  test('all default → empty (inherit app font)', () => {
    expect(buildFontChain(base, CUSTOMS)).toBe('');
  });

  test('single source applies to both languages', () => {
    expect(buildFontChain({ ...base, fontSource: 'noto-sans-thai' }, CUSTOMS))
      .toBe("'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif");
  });

  test('split: English first, Thai falls through second', () => {
    const s = { ...base, fontSplit: true, fontEnglish: 'custom-sarabun', fontThai: 'noto-sans-thai' };
    expect(buildFontChain(s, CUSTOMS))
      .toBe("'custom-sarabun', 'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif");
  });

  test('split with a default slot keeps only the set one', () => {
    const s = { ...base, fontSplit: true, fontEnglish: 'default', fontThai: 'noto-sans-thai' };
    expect(buildFontChain(s, CUSTOMS))
      .toBe("'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif");
  });

  test('same font in both slots is deduplicated', () => {
    const s = { ...base, fontSplit: true, fontEnglish: 'noto-sans-thai', fontThai: 'noto-sans-thai' };
    expect(buildFontChain(s, CUSTOMS))
      .toBe("'Noto Sans Thai', ui-sans-serif, system-ui, sans-serif");
  });
});

test('BUILTIN_FONTS exposes default + noto', () => {
  expect(BUILTIN_FONTS.map((f) => f.id)).toEqual(['default', 'noto-sans-thai']);
});
