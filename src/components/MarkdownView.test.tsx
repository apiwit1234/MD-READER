import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' })),
  },
}));
vi.mock('svg-pan-zoom', () => ({ default: () => ({ destroy: vi.fn(), reset: vi.fn() }) }));

import { MarkdownView } from './MarkdownView';

describe('MarkdownView', () => {
  it('renders headings and paragraphs', () => {
    render(<MarkdownView content={'# Hello\n\nWorld'} theme="light" />);
    expect(screen.getByRole('heading', { level: 1, name: /hello/i })).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  it('renders a code block', () => {
    const { container } = render(<MarkdownView content={'```js\nconsole.log(1)\n```'} theme="light" />);
    expect(container.querySelector('pre code')).not.toBeNull();
    expect(container.textContent).toContain('console.log(1)');
  });

  it('renders mermaid block via MermaidBlock', () => {
    render(<MarkdownView content={'```mermaid\ngraph LR\nA-->B\n```'} theme="light" />);
    expect(screen.getByText(/scroll to zoom/i)).toBeInTheDocument();
  });
});
