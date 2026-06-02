/**
 * Normalize separators and resolve '.'/'..' segments so a crafted path cannot
 * traverse out of a root via prefix matching. Preserves a leading root marker
 * (posix '' from a leading '/', or a Windows drive like 'C:').
 */
function norm(p: string): string {
  const segs = p.replace(/[\\/]+/g, '/').split('/');
  const out: string[] = [];
  for (const seg of segs) {
    if (seg === '.') continue;
    if (seg === '..') {
      // Don't pop past the root marker (leading '' or a drive letter).
      if (out.length > 1 || (out.length === 1 && out[0] !== '' && !/^[A-Za-z]:$/.test(out[0]))) {
        out.pop();
      }
      continue;
    }
    out.push(seg);
  }
  return out.join('/').replace(/\/+$/, '');
}

/** True when `target` resolves under at least one of `roots` (boundary-safe). */
export function isPathUnderRoots(target: string, roots: string[]): boolean {
  const t = norm(target);
  return roots.some((r) => {
    const root = norm(r);
    return t === root || t.startsWith(root + '/');
  });
}
