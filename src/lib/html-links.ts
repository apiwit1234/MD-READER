import { isHtmlPath } from './file-kinds';

export type LinkClass =
  | { kind: 'external'; url: string }
  | { kind: 'internal'; relativePath: string }
  | { kind: 'ignore' };

const EXTERNAL = /^(https?:|mailto:)/i;

/** Normalize a POSIX-style relative path, resolving `.` and `..` segments. */
function resolveRelative(currentRelPath: string, href: string): string {
  const baseDir = currentRelPath.includes('/') ? currentRelPath.slice(0, currentRelPath.lastIndexOf('/')) : '';
  const parts = (baseDir ? baseDir.split('/') : []);
  for (const seg of href.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

/** Classify an <a href> clicked inside an HTML page rendered in MD mode. */
export function classifyLink(href: string, currentRelPath: string): LinkClass {
  const raw = (href ?? '').trim();
  if (!raw || raw.startsWith('#')) return { kind: 'ignore' };
  if (EXTERNAL.test(raw)) return { kind: 'external', url: raw };
  // Reject traversal/escape vectors: backslashes (collapse to `../` later),
  // NUL bytes, and absolute/UNC paths.
  if (raw.includes('\\') || raw.includes('\0') || raw.startsWith('/')) return { kind: 'ignore' };
  // Strip any in-page anchor/query before resolving.
  const clean = raw.split('#')[0].split('?')[0];
  if (!isHtmlPath(clean)) return { kind: 'ignore' };
  const relativePath = resolveRelative(currentRelPath, clean);
  // Normalization consumes all `..`; reject anything that escaped to the front.
  if (!relativePath || relativePath.startsWith('..') || relativePath.split('/').includes('..')) {
    return { kind: 'ignore' };
  }
  return { kind: 'internal', relativePath };
}
