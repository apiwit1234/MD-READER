import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BatSwarm } from './BatSwarm';

describe('BatSwarm', () => {
  it('renders nothing for non-dracula themes', () => {
    const { queryByTestId } = render(<BatSwarm theme="dark" />);
    expect(queryByTestId('bat-swarm')).toBeNull();
  });

  it('renders a flock when dracula is active', () => {
    const { getByTestId } = render(<BatSwarm theme="dracula" />);
    const swarm = getByTestId('bat-swarm');
    expect(swarm.querySelectorAll('.bat').length).toBeGreaterThanOrEqual(8);
  });

  it('clears the flock and does not replay until dracula is re-entered', () => {
    const { queryByTestId, rerender } = render(<BatSwarm theme="dracula" />);
    const swarm = queryByTestId('bat-swarm')!;
    swarm.querySelectorAll('.bat').forEach((el) => el.dispatchEvent(new Event('animationend', { bubbles: true })));
    rerender(<BatSwarm theme="dracula" />);
    expect(queryByTestId('bat-swarm')).toBeNull();

    rerender(<BatSwarm theme="dark" />);
    rerender(<BatSwarm theme="dracula" />);
    expect(queryByTestId('bat-swarm')).not.toBeNull();
  });
});
