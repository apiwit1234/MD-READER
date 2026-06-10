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

import { MermaidBlock, __clearMermaidRenderCache } from './MermaidBlock';

beforeEach(async () => {
  document.body.replaceChildren();
  __clearMermaidRenderCache();
  // Reset the render mock fully (incl. any unconsumed mock*Once queue from a
  // prior test) and restore the default success implementation.
  const mermaid = (await import('mermaid')).default;
  const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
  renderMock.mockReset();
  renderMock.mockImplementation(async (_id: string, src: string) => ({
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" data-src="${src}"></svg>`,
  }));
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

  it('keeps the last good SVG and shows a stale badge when the source turns invalid', async () => {
    const mermaid = (await import('mermaid')).default;
    const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
    const onRendered = vi.fn();
    const { rerender } = render(<MermaidBlock source="graph LR; A-->B" theme="light" onRendered={onRendered} />);
    await waitFor(() => expect(onRendered).toHaveBeenCalled());

    renderMock.mockRejectedValueOnce(new Error('parse fail'));
    rerender(<MermaidBlock source="bad" theme="light" onRendered={onRendered} />);

    expect(await screen.findByText(/stale/i)).toBeInTheDocument();
    expect(screen.getByText(/scroll to zoom/i)).toBeInTheDocument();
    expect(screen.queryByText(/diagram failed to render/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show error/i })).toBeInTheDocument();
  });

  it('expands the error panel with the mermaid message on click', async () => {
    const mermaid = (await import('mermaid')).default;
    const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
    const onRendered = vi.fn();
    const { rerender } = render(<MermaidBlock source="graph LR; A-->B" theme="light" onRendered={onRendered} />);
    await waitFor(() => expect(onRendered).toHaveBeenCalled());
    renderMock.mockRejectedValueOnce(new Error('Parse error on line 2'));
    rerender(<MermaidBlock source="bad" theme="light" onRendered={onRendered} />);

    fireEvent.click(await screen.findByRole('button', { name: /show error/i }));

    expect(await screen.findByText(/parse error on line 2/i)).toBeInTheDocument();
  });

  it('serves a re-mounted identical diagram from the SVG cache (no second mermaid.render)', async () => {
    const mermaid = (await import('mermaid')).default;
    const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
    const onRendered = vi.fn();
    const { unmount } = render(<MermaidBlock source="graph LR; C-->D" theme="light" onRendered={onRendered} />);
    await waitFor(() => expect(onRendered).toHaveBeenCalled());
    expect(renderMock).toHaveBeenCalledTimes(1);
    unmount();

    const onRendered2 = vi.fn();
    render(<MermaidBlock source="graph LR; C-->D" theme="light" onRendered={onRendered2} />);
    await waitFor(() => expect(onRendered2).toHaveBeenCalled());

    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it('does not serve the cache across themes', async () => {
    const mermaid = (await import('mermaid')).default;
    const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
    const onRendered = vi.fn();
    const { unmount } = render(<MermaidBlock source="graph LR; C-->D" theme="light" onRendered={onRendered} />);
    await waitFor(() => expect(onRendered).toHaveBeenCalled());
    unmount();

    const onRendered2 = vi.fn();
    render(<MermaidBlock source="graph LR; C-->D" theme="dark" onRendered={onRendered2} />);
    await waitFor(() => expect(onRendered2).toHaveBeenCalled());

    expect(renderMock).toHaveBeenCalledTimes(2);
  });

  it('retries with normalizeMermaidSource when the raw CRLF source fails', async () => {
    const mermaid = (await import('mermaid')).default;
    const renderMock = mermaid.render as ReturnType<typeof vi.fn>;
    renderMock.mockClear();
    renderMock.mockRejectedValueOnce(new Error('Parse error'));
    render(<MermaidBlock source={'graph LR\r\nA-->B'} theme="light" />);
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(2));
    expect(renderMock.mock.calls[1][1]).toBe('graph LR\nA-->B');
    expect(await screen.findByText(/scroll to zoom/i)).toBeInTheDocument();
    expect(screen.queryByText(/diagram failed to render/i)).not.toBeInTheDocument();
  });
});
