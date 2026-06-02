'use client';
import { useEffect, useRef } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { foldGutter, indentOnInput, bracketMatching } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { languageExtensionForPath } from '@/lib/lang';
import { editorTheme } from '@/lib/cm-theme';

type Props = {
  path: string;
  value: string;
  theme: 'light' | 'dark';
  onChange: (path: string, text: string) => void;
  onSave: (path: string) => void;
};

export function CodeEditor({ path, value, theme, onChange, onSave }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const statesRef = useRef<Map<string, EditorState>>(new Map());
  // Keep latest callbacks without re-creating the editor.
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onChangeRef.current = onChange; onSaveRef.current = onSave; });

  // Create the EditorView once.
  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({ parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, []);

  // Swap document when the active path changes (preserving per-path state).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    let cancelled = false;

    const saveKeymap = keymap.of([{
      key: 'Mod-s',
      preventDefault: true,
      run: () => { onSaveRef.current(path); return true; },
    }]);

    const baseExtensions: Extension[] = [
      lineNumbers(),
      foldGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      editorTheme(theme),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      saveKeymap,
      EditorView.updateListener.of((u) => {
        if (u.docChanged) onChangeRef.current(path, u.state.doc.toString());
      }),
    ];

    (async () => {
      const lang = await languageExtensionForPath(path);
      if (cancelled) return;
      const exts = lang ? [...baseExtensions, lang] : baseExtensions;
      const existing = statesRef.current.get(path);
      const state = existing ?? EditorState.create({ doc: value, extensions: exts });
      if (!existing) statesRef.current.set(path, state);
      view.setState(state);
    })();

    return () => {
      cancelled = true;
      // Persist the current per-path state before leaving.
      const v = viewRef.current;
      if (v) statesRef.current.set(path, v.state);
    };
    // value is only used to seed a brand-new state; we intentionally don't re-run on value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, theme]);

  return <div ref={hostRef} className="h-full overflow-auto text-sm" data-testid="code-editor" />;
}
