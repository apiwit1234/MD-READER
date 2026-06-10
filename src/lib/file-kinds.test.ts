import { describe, expect, it } from 'vitest';
import { isMarkdownPath, isMermaidPath } from './file-kinds';

describe('file kinds', () => {
  it('detects markdown', () => {
    expect(isMarkdownPath('a/B.MD')).toBe(true);
    expect(isMarkdownPath('a/b.markdown')).toBe(true);
    expect(isMarkdownPath('a/b.mmd')).toBe(false);
  });

  it('detects mermaid files', () => {
    expect(isMermaidPath('x/flow.mmd')).toBe(true);
    expect(isMermaidPath('x/flow.MERMAID')).toBe(true);
    expect(isMermaidPath('x/flow.md')).toBe(false);
  });
});
