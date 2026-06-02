import type { Extension } from '@codemirror/state';

export type LanguageId =
  | 'javascript' | 'python' | 'json' | 'markdown' | 'css' | 'html'
  | 'csharp' | 'c' | 'cpp' | 'java' | 'kotlin' | 'go' | 'rust' | 'sql'
  | 'shell' | 'yaml' | 'xml' | 'toml' | 'ruby' | 'lua' | 'dockerfile';

const EXT_MAP: Record<string, LanguageId> = {
  ts: 'javascript', tsx: 'javascript', js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  py: 'python',
  json: 'json', jsonc: 'json',
  md: 'markdown', markdown: 'markdown',
  css: 'css', scss: 'css', less: 'css',
  html: 'html', htm: 'html', vue: 'html', svelte: 'html',
  cs: 'csharp',
  c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp',
  java: 'java',
  kt: 'kotlin', kts: 'kotlin',
  go: 'go',
  rs: 'rust',
  sql: 'sql',
  sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'shell',
  yml: 'yaml', yaml: 'yaml',
  xml: 'xml', csproj: 'xml', props: 'xml', targets: 'xml', xaml: 'xml', svg: 'xml',
  toml: 'toml',
  rb: 'ruby',
  lua: 'lua',
  dockerfile: 'dockerfile',
};

// Some files are recognized by name rather than extension.
const NAME_MAP: Record<string, LanguageId> = {
  dockerfile: 'dockerfile',
  makefile: 'shell',
};

export function languageIdForPath(path: string): LanguageId | null {
  const base = (path.split(/[\\/]/).pop() ?? path).toLowerCase();
  if (NAME_MAP[base]) return NAME_MAP[base];
  const dot = base.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = base.slice(dot + 1);
  return EXT_MAP[ext] ?? null;
}

/** Lazily build the CodeMirror language extension for a path (async import keeps bundle lean). */
export async function languageExtensionForPath(path: string): Promise<Extension | null> {
  const id = languageIdForPath(path);
  if (!id) return null;

  // First-party language packages.
  switch (id) {
    case 'javascript': {
      const m = await import('@codemirror/lang-javascript');
      const isTs = /\.(ts|tsx)$/i.test(path);
      const isJsx = /\.(jsx|tsx)$/i.test(path);
      return m.javascript({ typescript: isTs, jsx: isJsx });
    }
    case 'python': return (await import('@codemirror/lang-python')).python();
    case 'json': return (await import('@codemirror/lang-json')).json();
    case 'markdown': return (await import('@codemirror/lang-markdown')).markdown();
    case 'css': return (await import('@codemirror/lang-css')).css();
    case 'html': return (await import('@codemirror/lang-html')).html();
  }

  // Everything else uses CodeMirror legacy (stream) modes.
  const { StreamLanguage } = await import('@codemirror/language');
  switch (id) {
    case 'csharp': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).csharp);
    case 'c': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).c);
    case 'cpp': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).cpp);
    case 'java': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).java);
    case 'kotlin': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).kotlin);
    case 'go': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/go')).go);
    case 'rust': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/rust')).rust);
    case 'sql': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/sql')).standardSQL);
    case 'shell': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/shell')).shell);
    case 'yaml': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/yaml')).yaml);
    case 'xml': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/xml')).xml);
    case 'toml': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/toml')).toml);
    case 'ruby': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/ruby')).ruby);
    case 'lua': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/lua')).lua);
    case 'dockerfile': return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/dockerfile')).dockerFile);
  }
  return null;
}
