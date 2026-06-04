import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

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

import { MermaidBlock } from './MermaidBlock';

beforeEach(() => {
  document.body.replaceChildren();
});

describe('MermaidBlock', () => {
  it('calls mermaid.render with the source', async () => {
    const mermaid = (await import('mermaid')).default;
    render(<MermaidBlock source="graph LR; A-->B" theme="light" />);
    await waitFor(() => expect(mermaid.render).toHaveBeenCalled());
    const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
    expect(renderMock.mock.calls[0][1]).toBe('graph LR; A-->B');
  });

  it('renders the chrome header with controls', async () => {
    render(<MermaidBlock source="graph LR; A-->B" theme="light" />);
    expect(await screen.findByText(/scroll to zoom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/open fullscreen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reset diagram/i)).toBeInTheDocument();
  });

  it('opens fullscreen overlay when fullscreen button clicked', async () => {
    render(<MermaidBlock source="graph LR; A-->B" theme="light" />);
    await waitFor(() => screen.getByLabelText(/open fullscreen/i));
    fireEvent.click(screen.getByLabelText(/open fullscreen/i));
    expect(screen.getByRole('dialog', { name: /diagram fullscreen/i })).toBeInTheDocument();
  });

  it('shows error UI when mermaid throws', async () => {
    const mermaid = (await import('mermaid')).default;
    (mermaid.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('parse fail'));
    render(<MermaidBlock source="bad" theme="light" />);
    await waitFor(() => expect(screen.getByText(/diagram failed to render/i)).toBeInTheDocument());
  });

  it('retries with normalized entities when the first render fails', async () => {
    const mermaid = (await import('mermaid')).default;
    const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
    renderMock.mockClear();
    renderMock.mockRejectedValueOnce(new Error('Parse error'));
    render(<MermaidBlock source={'sequenceDiagram\n    A-->>B: List&lt;x&gt;'} theme="light" />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));
    expect(renderMock.mock.calls[1][1]).toContain('List#60;x#62;');
    // Retry succeeded (default mock resolves) — no error panel.
    expect(screen.queryByText(/diagram failed to render/i)).not.toBeInTheDocument();
  });

  it('shows the ORIGINAL error when both attempts fail', async () => {
    const mermaid = (await import('mermaid')).default;
    const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
    renderMock.mockClear();
    renderMock.mockRejectedValueOnce(new Error('original parse error'));
    renderMock.mockRejectedValueOnce(new Error('retry error'));
    render(<MermaidBlock source="bad &lt;x&gt;" theme="light" />);
    await waitFor(() => expect(screen.getByText(/diagram failed to render/i)).toBeInTheDocument());
    expect(screen.getByText(/original parse error/i)).toBeInTheDocument();
  });
});
