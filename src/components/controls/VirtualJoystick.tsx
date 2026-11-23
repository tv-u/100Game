import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useControls } from '../../controls/ControlContext';
import { getTouchButtonPx } from '../../controls/types';
import { triggerHaptic } from '../../utils/sound';

interface VirtualJoystickProps {
  onVector?: (x: number, y: number) => void;
  onDirection?: (dir: 'up' | 'down' | 'left' | 'right') => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onVector, onDirection }) => {
  const { prefs } = useApp();
  const { settings, reportModality } = useControls();
  const baseRadius = getTouchButtonPx(settings.buttonSize) * 1.15;
  const knobRadius = Math.round(baseRadius * 0.42);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const lastDirRef = useRef<'up' | 'down' | 'left' | 'right' | null>(null);

  const updateStick = (clientX: number, clientY: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxDist = baseRadius - knobRadius * 0.5;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    setKnobOffset({ x: dx, y: dy });

    const nx = dx / maxDist;
    const ny = dy / maxDist;
    onVector?.(nx, ny);

    if (Math.hypot(nx, ny) > 0.42) {
      const dir: 'up' | 'down' | 'left' | 'right' =
        Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 'right' : 'left') : ny > 0 ? 'down' : 'up';
      if (dir !== lastDirRef.current) {
        lastDirRef.current = dir;
        triggerHaptic(prefs.hapticsEnabled, 8);
        onDirection?.(dir);
      }
    } else {
      lastDirRef.current = null;
    }
  };

  const resetStick = () => {
    pointerIdRef.current = null;
    lastDirRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onVector?.(0, 0);
  };

  return (
    <div
      role="slider"
      aria-label="Analog virtual joystick"
      aria-valuetext={`${Math.round(knobOffset.x)}, ${Math.round(knobOffset.y)}`}
      tabIndex={0}
      style={{
        width: baseRadius * 2,
        height: baseRadius * 2,
        opacity: settings.buttonOpacity,
      }}
      className="relative rounded-full bg-slate-200/80 dark:bg-white/10 border-2 border-slate-300 dark:border-white/20 flex items-center justify-center touch-none select-none hc-surface"
      onPointerDown={(e) => {
        e.preventDefault();
        reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
        pointerIdRef.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
        updateStick(e.clientX, e.clientY, e.currentTarget);
      }}
      onPointerMove={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        updateStick(e.clientX, e.clientY, e.currentTarget);
      }}
      onPointerUp={(e) => {
        if (pointerIdRef.current !== e.pointerId) return;
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore
        }
        resetStick();
      }}
      onPointerCancel={() => resetStick()}
    >
      <div
        style={{
          width: knobRadius * 2,
          height: knobRadius * 2,
          transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
        }}
        className="rounded-full bg-violet-600 border-2 border-white/60 shadow-md pointer-events-none"
      />
    </div>
  );
};
