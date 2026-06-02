'use client';

export type WindowContext = {
  windowId: string;
  isMain: boolean;
};

let cached: WindowContext | null = null;

export function getWindowContext(): WindowContext {
  if (cached) return cached;
  if (typeof window === 'undefined') {
    cached = { windowId: 'main', isMain: true };
    return cached;
  }
  const params = new URLSearchParams(window.location.search);
  const windowId = params.get('windowId') || 'main';
  cached = { windowId, isMain: windowId === 'main' };
  return cached;
}

export function withWindowSuffix(key: string): string {
  return `${key}.${getWindowContext().windowId}`;
}
