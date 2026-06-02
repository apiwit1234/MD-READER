export type Mode = 'md' | 'code' | 'terminal';

export const MODES: Mode[] = ['md', 'code', 'terminal'];

export function isMode(x: unknown): x is Mode {
  return x === 'md' || x === 'code' || x === 'terminal';
}

export function nextMode(m: Mode): Mode {
  const i = MODES.indexOf(m);
  return MODES[(i + 1) % MODES.length];
}

type KeydownLike = { ctrlKey: boolean; metaKey: boolean; key: string };

export function modeForKeydown(e: KeydownLike): Mode | null {
  if (!e.ctrlKey && !e.metaKey) return null;
  if (e.key === '1') return 'md';
  if (e.key === '2') return 'code';
  if (e.key === '3') return 'terminal';
  return null;
}
