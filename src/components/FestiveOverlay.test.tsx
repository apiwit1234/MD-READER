import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FestiveOverlay } from './FestiveOverlay';

beforeEach(() => {
  vi.useRealTimers();
});

describe('FestiveOverlay', () => {
  it('renders nothing for non-christmas themes', () => {
    render(<FestiveOverlay theme="dark" tabCount={1} />);
    expect(screen.queryByTestId('festive-overlay')).not.toBeInTheDocument();
  });

  it('renders the snow overlay for the christmas theme', () => {
    render(<FestiveOverlay theme="christmas" tabCount={1} />);
    const overlay = screen.getByTestId('festive-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay.querySelectorAll('.festive-flake').length).toBeGreaterThan(0);
  });

  it('flies Santa shortly after the theme activates', () => {
    vi.useFakeTimers();
    render(<FestiveOverlay theme="christmas" tabCount={1} />);
    expect(screen.getByTestId('festive-overlay').querySelector('.festive-santa')).toBeNull();
    act(() => { vi.advanceTimersByTime(1300); });
    expect(screen.getByTestId('festive-overlay').querySelector('.festive-santa')).not.toBeNull();
  });

  it('flies Santa when a new tab opens (tabCount increases)', () => {
    const { rerender } = render(<FestiveOverlay theme="christmas" tabCount={1} />);
    act(() => { rerender(<FestiveOverlay theme="christmas" tabCount={2} />); });
    expect(screen.getByTestId('festive-overlay').querySelector('.festive-santa')).not.toBeNull();
  });
});
