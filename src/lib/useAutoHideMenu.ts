import { useEffect, useRef } from 'react';

type Handlers = {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

/** Auto-closes a context menu shortly after the pointer leaves it.
 *  Spread the returned handlers onto the menu element. When `enabled` is
 *  false (Settings → Behavior), no handlers are returned and the menu keeps
 *  the classic click-away behavior. */
export function useAutoHideMenu(
  enabled: boolean,
  open: boolean,
  onClose: () => void,
  delayMs = 400,
): Handlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Menu closed by other means (click-away, Esc, item click) — drop the timer.
  useEffect(() => {
    if (!open && timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, [open]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!enabled) return {};
  return {
    onMouseEnter: () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    },
    onMouseLeave: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        onCloseRef.current();
      }, delayMs);
    },
  };
}
