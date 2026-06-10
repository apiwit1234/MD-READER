/**
 * Whole-source cleanup applied as a retry pass when a mermaid render fails:
 * BOM, Windows/old-Mac line endings, word-processor smart quotes and
 * trailing whitespace all break mermaid's parser in hard-to-see ways.
 * Distinct from normalizeMermaidEntities (HTML entities inside labels).
 */
export function normalizeMermaidSource(source: string): string {
  return source
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n');
}
