import { describe, expect, it } from 'vitest';
import { normalizeMermaidSource } from './mermaid-normalize';

describe('normalizeMermaidSource', () => {
  it('strips a UTF-8 BOM', () => {
    expect(normalizeMermaidSource('﻿graph LR; A-->B')).toBe('graph LR; A-->B');
  });

  it('normalizes CRLF and lone CR to LF', () => {
    expect(normalizeMermaidSource('graph LR\r\nA-->B\rB-->C')).toBe('graph LR\nA-->B\nB-->C');
  });

  it('replaces smart quotes with ASCII quotes', () => {
    expect(normalizeMermaidSource('graph LR; A["“hi”"] --> B[‘x’]'))
      .toBe('graph LR; A[""hi""] --> B[\'x\']');
  });

  it('trims trailing whitespace per line', () => {
    expect(normalizeMermaidSource('graph LR;   \nA-->B  ')).toBe('graph LR;\nA-->B');
  });

  it('returns input unchanged when already clean', () => {
    const src = 'graph LR\nA-->B';
    expect(normalizeMermaidSource(src)).toBe(src);
  });
});
