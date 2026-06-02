import { describe, it, expect } from 'vitest';
import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { useTextHighlight } from './useTextHighlight';

function TestHost({ query, caseSensitive = false }: { query: string; caseSensitive?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const h = useTextHighlight(ref, query, caseSensitive);
  return (
    <div>
      <div ref={ref}>
        Hello world. The <code>start</code> token. Another start here.
        <svg><text>start in diagram</text></svg>
      </div>
      <span data-testid="total">{h.total}</span>
      <span data-testid="current">{h.currentIndex}</span>
      <button onClick={h.next}>next</button>
      <button onClick={h.prev}>prev</button>
      <button onClick={h.clear}>clear</button>
    </div>
  );
}

describe('useTextHighlight', () => {
  it('wraps HTML matches in <mark> and counts all matches including SVG', () => {
    const { container, getByTestId } = render(<TestHost query="start" />);
    expect(container.querySelectorAll('mark.md-find-hit').length).toBe(2);
    // 2 HTML marks + 1 SVG label = 3 total.
    expect(getByTestId('total').textContent).toBe('3');
  });

  it('highlights SVG (mermaid) labels on the text element, not via <mark>', () => {
    const { container } = render(<TestHost query="start" />);
    expect(container.querySelectorAll('text.md-find-hit').length).toBe(1);
    expect(container.querySelectorAll('svg mark').length).toBe(0);
  });

  it('respects caseSensitive flag', () => {
    const { container } = render(<TestHost query="START" caseSensitive />);
    expect(container.querySelectorAll('mark.md-find-hit').length).toBe(0);
    expect(container.querySelectorAll('text.md-find-hit').length).toBe(0);
  });

  it('clears all marks', () => {
    const { container, getByText } = render(<TestHost query="start" />);
    act(() => { getByText('clear').click(); });
    expect(container.querySelectorAll('mark.md-find-hit').length).toBe(0);
    expect(container.querySelectorAll('text.md-find-hit').length).toBe(0);
  });

  it('returns total 0 for an empty query', () => {
    const { getByTestId } = render(<TestHost query="" />);
    expect(getByTestId('total').textContent).toBe('0');
  });
});
