import type { FsNode } from '@/types';
import { isMarkdownPath, isHtmlPath } from './file-kinds';

/** Keep markdown (and optionally HTML) files, dropping dirs with no kept files. */
export function pruneToReadable(node: FsNode, includeHtml: boolean): FsNode | null {
  if (node.type === 'file') {
    const keep = isMarkdownPath(node.name) || (includeHtml && isHtmlPath(node.name));
    return keep ? node : null;
  }
  const keptChildren = (node.children ?? [])
    .map((c) => pruneToReadable(c, includeHtml))
    .filter((c): c is FsNode => c !== null);
  return keptChildren.length > 0 ? { ...node, children: keptChildren } : null;
}

export function filterTree(node: FsNode, query: string): FsNode | null {
  if (!query) return node;
  const q = query.toLowerCase();
  if (node.type === 'file') {
    return node.name.toLowerCase().includes(q) ? node : null;
  }
  const keptChildren = (node.children ?? [])
    .map((c) => filterTree(c, q))
    .filter((c): c is FsNode => c !== null);
  return keptChildren.length > 0 ? { ...node, children: keptChildren } : null;
}
