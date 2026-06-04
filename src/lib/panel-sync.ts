import type { Mode } from './mode';

/**
 * Map a panel collapse/expand event (drag on a resize handle) to the new value
 * of its view flag, or null when the flag must not change. Terminal mode
 * force-collapses panels without changing the user's saved preference, so its
 * events are ignored — the panels come back when leaving terminal mode.
 */
export function flagFromPanelEvent(event: 'collapse' | 'expand', mode: Mode): boolean | null {
  if (mode === 'terminal') return null;
  return event === 'expand';
}
