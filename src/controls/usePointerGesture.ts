import { useRef } from 'react';
import type React from 'react';
import { useControls } from './ControlContext';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

interface PointerGestureOptions {
  onSwipe?: (dir: SwipeDirection) => void;
  onTap?: (clientX: number, clientY: number) => void;
  onDoubleTap?: (clientX: number, clientY: number) => void;
  onLongPress?: (clientX: number, clientY: number) => void;
  onDrag?: (clientX: number, clientY: number) => void;
  swipeThreshold?: number;
  longPressMs?: number;
}

export function usePointerGesture(opts: PointerGestureOptions) {
  const { reportModality } = useControls();
  const activePointerId = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const movedBeyondTap = useRef(false);
  const lastTapTime = useRef(0);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    // Only track primary button for mouse; track first active pointer for touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');

    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    longPressFired.current = false;
    movedBeyondTap.current = false;
    startPos.current = { x: e.clientX, y: e.clientY, time: performance.now() };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors on synthetic events
    }

    if (opts.onDrag) {
      opts.onDrag(e.clientX, e.clientY);
    }

    if (opts.onLongPress) {
      const cx = e.clientX;
      const cy = e.clientY;
      clearLongPress();
      longPressTimer.current = window.setTimeout(() => {
        if (activePointerId.current === e.pointerId && !movedBeyondTap.current) {
          longPressFired.current = true;
          opts.onLongPress?.(cx, cy);
        }
      }, opts.longPressMs ?? 420);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (activePointerId.current !== e.pointerId || !startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.hypot(dx, dy) > 10) {
      movedBeyondTap.current = true;
      clearLongPress();
    }
    if (opts.onDrag) {
      opts.onDrag(e.clientX, e.clientY);
    }
  };

  const finishPointer = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    if (activePointerId.current !== e.pointerId) return;
    clearLongPress();

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    const start = startPos.current;
    activePointerId.current = null;
    startPos.current = null;

    if (cancelled || !start || longPressFired.current) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const threshold = opts.swipeThreshold ?? 22;

    if (opts.onSwipe && (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold)) {
      if (Math.abs(dx) > Math.abs(dy)) {
        opts.onSwipe(dx > 0 ? 'right' : 'left');
      } else {
        opts.onSwipe(dy > 0 ? 'down' : 'up');
      }
      return;
    }

    if (!movedBeyondTap.current) {
      const now = performance.now();
      if (opts.onDoubleTap && now - lastTapTime.current < 280) {
        lastTapTime.current = 0;
        opts.onDoubleTap(e.clientX, e.clientY);
      } else {
        lastTapTime.current = now;
        opts.onTap?.(e.clientX, e.clientY);
      }
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => finishPointer(e, false),
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => finishPointer(e, true),
  };
}
