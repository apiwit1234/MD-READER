import type { CustomFont } from './electron-api';

export const FONT_DEFAULT_ID = 'default';

export const BUILTIN_FONTS: CustomFont[] = [
  { id: 'default', label: 'Default' },
  { id: 'noto-sans-thai', label: 'Noto Sans Thai' },
];

const FALLBACK = 'ui-sans-serif, system-ui, sans-serif';

/** CSS family for a font id, or null when the id means "no override".
 *  Custom fonts are registered with the FontFace API under their id. */
export function familyFor(id: string, customFonts: CustomFont[]): string | null {
  if (!id || id === FONT_DEFAULT_ID) return null;
  if (id === 'noto-sans-thai') return "'Noto Sans Thai'";
  return customFonts.some((f) => f.id === id) ? `'${id}'` : null;
}

export type ReadingFontSettings = {
  fontSource: string;
  fontSplit: boolean;
  fontEnglish: string;
  fontThai: string;
};

/** font-family for the markdown reading view; '' = no override (inherit).
 *  Split mode lists English first and Thai second — Latin glyphs resolve from
 *  the first family, Thai glyphs fall through to the second. This is what lets
 *  a Latin-only font pair with a Thai font. */
export function buildFontChain(s: ReadingFontSettings, customFonts: CustomFont[]): string {
  const ids = s.fontSplit ? [s.fontEnglish, s.fontThai] : [s.fontSource];
  const families = ids
    .map((id) => familyFor(id, customFonts))
    .filter((f): f is string => f !== null);
  const unique = families.filter((f, i) => families.indexOf(f) === i);
  if (unique.length === 0) return '';
  return `${unique.join(', ')}, ${FALLBACK}`;
}
