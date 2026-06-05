import { describe, expect, test, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoHideMenu } from './useAutoHideMenu';

afterEach(() => { vi.useRealTimers(); });

describe('useAutoHideMenu', () => {
  test('closes after the delay once the mouse leaves', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { result } = renderHook(() => useAutoHideMenu(true, true, onClose, 400));
    act(() => { result.current.onMouseLeave?.(); });
    act(() => { vi.advanceTimersByTime(399); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('re-entering cancels the pending close', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { result } = renderHook(() => useAutoHideMenu(true, true, onClose, 400));
    act(() => { result.current.onMouseLeave?.(); });
    act(() => { vi.advanceTimersByTime(200); });
    act(() => { result.current.onMouseEnter?.(); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('disabled — returns no handlers', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useAutoHideMenu(false, true, onClose, 400));
    expect(result.current.onMouseEnter).toBeUndefined();
    expect(result.current.onMouseLeave).toBeUndefined();
  });

  test('closing the menu clears a pending timer', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { result, rerender } = renderHook(
      ({ open }) => useAutoHideMenu(true, open, onClose, 400),
      { initialProps: { open: true } },
    );
    act(() => { result.current.onMouseLeave?.(); });
    rerender({ open: false });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onClose).not.toHaveBeenCalled();
  });
});
