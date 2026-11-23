import React, { useRef } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useControls } from '../../controls/ControlContext';
import { getTouchButtonPx, type LogicalAction } from '../../controls/types';
import { triggerHaptic } from '../../utils/sound';

interface VirtualDPadProps {
  onDirection: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onHoldDirection?: (dir: 'up' | 'down' | 'left' | 'right' | null) => void;
}

export const VirtualDPad: React.FC<VirtualDPadProps> = ({ onDirection, onHoldDirection }) => {
  const { prefs } = useApp();
  const { settings, reportModality } = useControls();
  const btnPx = getTouchButtonPx(settings.buttonSize);
  const activePointers = useRef<Map<number, LogicalAction>>(new Map());

  const bindDirButton = (dir: 'up' | 'down' | 'left' | 'right') => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
      activePointers.current.set(e.pointerId, dir);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      triggerHaptic(prefs.hapticsEnabled, 10);
      onDirection(dir);
      onHoldDirection?.(dir);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      activePointers.current.delete(e.pointerId);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      if (activePointers.current.size === 0) onHoldDirection?.(null);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size === 0) onHoldDirection?.(null);
    },
  });

  const btnStyle: React.CSSProperties = {
    width: btnPx,
    height: btnPx,
    opacity: settings.buttonOpacity,
  };

  const cls =
    'rounded-2xl bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/15 flex items-center justify-center active:scale-95 text-slate-900 dark:text-white touch-none select-none hc-button';

  return (
    <div
      className="grid grid-cols-3 gap-1.5 w-fit touch-none select-none"
      role="group"
      aria-label="Virtual directional pad"
    >
      <div />
      <button type="button" aria-label="Move Up" style={btnStyle} className={cls} {...bindDirButton('up')}>
        <ArrowUp className="w-5 h-5" />
      </button>
      <div />
      <button type="button" aria-label="Move Left" style={btnStyle} className={cls} {...bindDirButton('left')}>
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button type="button" aria-label="Move Down" style={btnStyle} className={cls} {...bindDirButton('down')}>
        <ArrowDown className="w-5 h-5" />
      </button>
      <button type="button" aria-label="Move Right" style={btnStyle} className={cls} {...bindDirButton('right')}>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};
