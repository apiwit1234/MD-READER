import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeEditor } from './CodeEditor';

describe('CodeEditor', () => {
  it('renders the editor host', () => {
    render(<CodeEditor path="/a.ts" value={'const x = 1;'} theme="light" onChange={() => {}} onSave={() => {}} />);
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
  });

  it('mounts a CodeMirror EditorView without throwing', () => {
    const { container } = render(
      <CodeEditor path="/a.ts" value={'const x = 1;'} theme="light" onChange={() => {}} onSave={() => {}} />,
    );
    // The EditorView attaches a `.cm-editor` element to the host.
    expect(container.querySelector('.cm-editor')).not.toBeNull();
  });
});
