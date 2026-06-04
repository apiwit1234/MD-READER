/**
 * Mermaid treats ';' as a statement terminator, so HTML entities like '&lt;'
 * inside message/label text cut the line short and break parsing. Mermaid's
 * own escape syntax is '#<code>;', which its lexer handles. This rewrites
 * entities to that form so diagrams written with '&lt;' / '&gt;' render.
 */
const NAMED_ENTITY_CODES: Record<string, number> = {
  lt: 60,
  gt: 62,
  amp: 38,
  quot: 34,
  apos: 39,
  nbsp: 160,
};

export function normalizeMermaidEntities(source: string): string {
  return source
    .replace(/&#(\d+);/g, '#$1;')
    .replace(/&(\w+);/g, (match, name: string) =>
      name in NAMED_ENTITY_CODES ? `#${NAMED_ENTITY_CODES[name]};` : match,
    );
}
