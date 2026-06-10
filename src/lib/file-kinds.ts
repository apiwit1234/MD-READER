/** File-extension classification shared by the tree, tab gating and views. */
export function isMarkdownPath(p: string): boolean {
  const l = p.toLowerCase();
  return l.endsWith('.md') || l.endsWith('.markdown');
}

export function isMermaidPath(p: string): boolean {
  const l = p.toLowerCase();
  return l.endsWith('.mmd') || l.endsWith('.mermaid');
}
