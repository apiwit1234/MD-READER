import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusStrip } from './StatusStrip';

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  // happy-dom freezes navigator.clipboard's methods; replace the whole clipboard via getter override on the window prototype
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText },
    writable: true,
    configurable: true,
  });
});

describe('StatusStrip', () => {
  it('renders the host path', () => {
    render(<StatusStrip hostPath={'C:\\Users\\me\\file.md'} />);
    expect(screen.getByText(/file\.md$/)).toBeInTheDocument();
  });

  it('copies path on button click and shows toast', async () => {
    render(<StatusStrip hostPath={'C:\\file.md'} />);
    fireEvent.click(screen.getByRole('button', { name: /copy path/i }));
    expect(writeText).toHaveBeenCalledWith('C:\\file.md');
    expect(await screen.findByText(/path copied/i)).toBeInTheDocument();
  });

  it('renders nothing when hostPath is null', () => {
    const { container } = render(<StatusStrip hostPath={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Clear highlight only when hasActiveHighlight is true', () => {
    const { rerender } = render(<StatusStrip hostPath="C:\\foo" />);
    expect(screen.queryByText(/clear highlight/i)).toBeNull();
    rerender(<StatusStrip hostPath="C:\\foo" hasActiveHighlight onClearHighlight={() => {}} />);
    expect(screen.getByText(/clear highlight/i)).toBeInTheDocument();
  });
});
