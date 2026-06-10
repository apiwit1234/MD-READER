import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (_id: string, src: string) => ({
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" data-src="${src}"></svg>`,
    })),
  },
}));

vi.mock('svg-pan-zoom', () => ({
  default: () => ({ destroy: vi.fn(), reset: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn() }),
}));

import { DiagramView } from './DiagramView';

beforeEach(() => {
  document.body.replaceChildren();
});

describe('DiagramView', () => {
  it('renders the diagram by default and toggles to source', async () => {
    render(<DiagramView source="graph LR; A-->B" theme="light" />);
    expect(await screen.findByText(/scroll to zoom/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Source' }));
    expect(screen.getByText('graph LR; A-->B')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }));
    await waitFor(() => expect(screen.getByText(/scroll to zoom/i)).toBeInTheDocument());
  });

  it('marks the active view with aria-pressed', () => {
    render(<DiagramView source="graph LR; A-->B" theme="light" />);
    expect(screen.getByRole('button', { name: 'Diagram' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Source' })).toHaveAttribute('aria-pressed', 'false');
  });
});
