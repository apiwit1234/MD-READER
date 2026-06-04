import { describe, it, expect } from 'vitest';
import mermaid from 'mermaid';
import { normalizeMermaidEntities } from './mermaid-entities';

// The user-reported regression: a named entity's trailing ';' terminates the
// mermaid statement mid-line, so the parser falls over at the next block.
const ENTITY_FIXTURE = `sequenceDiagram
    participant BF as Flow
    participant DB as PostgreSQL
    DB-->>BF: List&lt;loanId&gt;

    alt frequency = MONTHLY
        BF->>DB: GetActiveTransactionInMonth()
    end
`;

describe('normalizeMermaidEntities', () => {
  it('rewrites known named entities to mermaid #N; escapes', () => {
    expect(normalizeMermaidEntities('a: List&lt;loanId&gt;')).toBe('a: List#60;loanId#62;');
    expect(normalizeMermaidEntities('x &amp; y &quot;q&quot; &apos;a&apos; b&nbsp;c'))
      .toBe('x #38; y #34;q#34; #39;a#39; b#160;c');
  });

  it('rewrites numeric entities', () => {
    expect(normalizeMermaidEntities('a&#35;b')).toBe('a#35;b');
  });

  it('leaves unknown named entities untouched', () => {
    expect(normalizeMermaidEntities('&unknown; stays')).toBe('&unknown; stays');
  });

  it('returns sources without entities unchanged', () => {
    const src = 'graph LR; A-->B';
    expect(normalizeMermaidEntities(src)).toBe(src);
  });
});

describe('regression: entity sequence diagram', () => {
  it('raw fixture fails to parse, normalized fixture parses', async () => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
    await expect(mermaid.parse(ENTITY_FIXTURE)).rejects.toThrow();
    await expect(mermaid.parse(normalizeMermaidEntities(ENTITY_FIXTURE))).resolves.toBeTruthy();
  }, 30000);
});
