import { describe, it, expect, beforeAll } from 'vitest';
import mermaid from 'mermaid';

// One sample per common Mermaid diagram type. MermaidBlock renders these, so if
// the bundled mermaid can parse them, the reader can display them.
const SAMPLES: Record<string, string> = {
  flowchart: 'flowchart TD\n  A[Start] --> B{Choice}\n  B -->|yes| C[OK]\n  B -->|no| D[Stop]',
  sequence: 'sequenceDiagram\n  Alice->>John: Hello\n  John-->>Alice: Hi',
  class: 'classDiagram\n  class Animal {\n    +int age\n    +run()\n  }\n  Animal <|-- Dog',
  state: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running\n  Running --> [*]',
  er: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE : contains',
  journey: 'journey\n  title My day\n  section Work\n    Code: 5: Me',
  gantt: 'gantt\n  title Plan\n  section A\n  Task1: a1, 2024-01-01, 3d',
  pie: 'pie title Pets\n  "Dogs" : 40\n  "Cats" : 60',
  gitGraph: 'gitGraph\n  commit\n  branch dev\n  checkout dev\n  commit',
  mindmap: 'mindmap\n  root((root))\n    a\n    b',
  timeline: 'timeline\n  title History\n  2021 : A\n  2022 : B',
};

describe('mermaid diagram types', () => {
  beforeAll(() => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  });

  for (const [name, source] of Object.entries(SAMPLES)) {
    it(`parses a ${name} diagram`, async () => {
      const result = await mermaid.parse(source);
      // parse resolves (truthy) for valid syntax and throws/false for invalid.
      expect(result).toBeTruthy();
    });
  }
});
