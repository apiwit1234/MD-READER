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
  // Strip any in-page anchor/query before resolving.
  const clean = raw.split('#')[0].split('?')[0];
  if (!isHtmlPath(clean)) return { kind: 'ignore' };
  return { kind: 'internal', relativePath: resolveRelative(currentRelPath, clean) };
}
