import type { FsNode } from '@/types';

/** Keep only markdown files, dropping directories that contain no markdown. */
export function pruneToMarkdown(node: FsNode): FsNode | null {
  if (node.type === 'file') {
    const n = node.name.toLowerCase();
    return n.endsWith('.md') || n.endsWith('.markdown') ? node : null;
  }
  const keptChildren = (node.children ?? [])
    .map(pruneToMarkdown)
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
