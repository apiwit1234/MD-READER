import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiffView } from './DiffView';

const diff = ['@@ -1,2 +1,2 @@', ' a', '-b', '+c'].join('\n');

describe('DiffView', () => {
  it('renders both sides of a modified line', () => {
    render(<DiffView unified={diff} title="f.ts" />);
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
  });

  it('shows an empty-diff message when there are no changes', () => {
    render(<DiffView unified="" title="f.ts" />);
    expect(screen.getByText(/no changes/i)).toBeInTheDocument();
  });
});
