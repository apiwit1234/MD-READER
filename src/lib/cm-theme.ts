import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

// GitHub-like palettes — picked for contrast on the app's light and dark themes.
const lightHighlight = HighlightStyle.define([
  { tag: [t.comment], color: '#6a737d', fontStyle: 'italic' },
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword], color: '#d73a49' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#032f62' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#005cc5' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#6f42c1' },
  { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName)], color: '#22863a' },
  { tag: [t.propertyName, t.attributeName], color: '#005cc5' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#24292e' },
  { tag: [t.tagName], color: '#22863a' },
  { tag: [t.heading], color: '#005cc5', fontWeight: 'bold' },
  { tag: [t.link, t.url], color: '#032f62', textDecoration: 'underline' },
  { tag: [t.meta, t.processingInstruction], color: '#6a737d' },
]);

const darkHighlight = HighlightStyle.define([
  { tag: [t.comment], color: '#8b949e', fontStyle: 'italic' },
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword], color: '#ff7b72' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#a5d6ff' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#79c0ff' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#d2a8ff' },
  { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName)], color: '#7ee787' },
  { tag: [t.propertyName, t.attributeName], color: '#79c0ff' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#c9d1d9' },
  { tag: [t.tagName], color: '#7ee787' },
  { tag: [t.heading], color: '#79c0ff', fontWeight: 'bold' },
  { tag: [t.link, t.url], color: '#a5d6ff', textDecoration: 'underline' },
  { tag: [t.meta, t.processingInstruction], color: '#8b949e' },
]);

/** Editor chrome theme + syntax highlighting for the given light/dark mode.
 *  Background is transparent so the editor inherits the active app theme's bg. */
export function editorTheme(mode: 'light' | 'dark'): Extension {
  // The code area gets its own dedicated surface (GitHub light/dark) so contrast
  // is guaranteed regardless of the surrounding app theme's colors.
  const dark = mode === 'dark';
  const bg = dark ? '#0d1117' : '#ffffff';
  const fg = dark ? '#c9d1d9' : '#24292e';
  const gutterBg = dark ? '#0d1117' : '#ffffff';
  const gutter = dark ? '#6e7681' : '#9aa0a6';
  const activeLine = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const selection = dark ? 'rgba(56,139,253,0.35)' : 'rgba(3,102,214,0.20)';
  return [
    EditorView.theme(
      {
        '&': { backgroundColor: bg, color: fg, height: '100%' },
        '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
        '.cm-content': { caretColor: fg },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: fg },
        '.cm-gutters': { backgroundColor: gutterBg, border: 'none', color: gutter },
        '.cm-activeLine': { backgroundColor: activeLine },
        '.cm-activeLineGutter': { backgroundColor: activeLine, color: fg },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
          backgroundColor: selection,
        },
        '.cm-foldGutter span': { color: gutter },
      },
      { dark },
    ),
    syntaxHighlighting(dark ? darkHighlight : lightHighlight, { fallback: true }),
  ];
}
