import { describe, it, expect } from 'vitest';
import { flagFromPanelEvent } from './panel-sync';

describe('flagFromPanelEvent', () => {
  it('maps collapse to false and expand to true in md/code modes', () => {
    expect(flagFromPanelEvent('collapse', 'md')).toBe(false);
    expect(flagFromPanelEvent('expand', 'md')).toBe(true);
    expect(flagFromPanelEvent('collapse', 'code')).toBe(false);
    expect(flagFromPanelEvent('expand', 'code')).toBe(true);
  });

  it('ignores events in terminal mode (forced collapse must not change the user preference)', () => {
    expect(flagFromPanelEvent('collapse', 'terminal')).toBeNull();
    expect(flagFromPanelEvent('expand', 'terminal')).toBeNull();
  });
});
