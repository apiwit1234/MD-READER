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
 *  Chrome colors come from the design tokens (CSS variables resolve at paint
 *  time), so the editor surface matches whichever of the 6 app themes is
 *  active; only the syntax palette switches on the light/dark base. */
export function editorTheme(mode: 'light' | 'dark'): Extension {
  const dark = mode === 'dark';
  return [
    EditorView.theme(
      {
        '&': { backgroundColor: 'rgb(var(--c-bg))', color: 'rgb(var(--c-fg))', height: '100%' },
        '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
        '.cm-content': { caretColor: 'rgb(var(--c-accent))' },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'rgb(var(--c-accent))' },
        '.cm-gutters': { backgroundColor: 'rgb(var(--c-surface))', border: 'none', color: 'rgb(var(--c-muted))' },
        '.cm-activeLine': { backgroundColor: 'rgb(var(--c-surface-2) / 0.6)' },
        '.cm-activeLineGutter': { backgroundColor: 'rgb(var(--c-surface-2))', color: 'rgb(var(--c-fg))' },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
          backgroundColor: 'rgb(var(--c-accent-soft))',
        },
        '.cm-foldGutter span': { color: 'rgb(var(--c-muted))' },
      },
      { dark },
    ),
    syntaxHighlighting(dark ? darkHighlight : lightHighlight, { fallback: true }),
  ];
}
