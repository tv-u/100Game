import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_GAMEPAD_BINDINGS,
  DEFAULT_KEY_BINDINGS,
  type ControlSettings,
  type InputModality,
  type LogicalAction,
} from './types';

const STORAGE_KEY = 'goo_controls_v1';

function loadControlSettings(): ControlSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTROL_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ControlSettings>;
    return {
      ...DEFAULT_CONTROL_SETTINGS,
      ...parsed,
      keyBindings: { ...DEFAULT_KEY_BINDINGS, ...(parsed.keyBindings || {}) },
      gamepadBindings: { ...DEFAULT_GAMEPAD_BINDINGS, ...(parsed.gamepadBindings || {}) },
    };
  } catch {
    return DEFAULT_CONTROL_SETTINGS;
  }
}

interface ControlContextValue {
  settings: ControlSettings;
  updateSettings: (patch: Partial<ControlSettings>) => void;
  setKeyBinding: (action: LogicalAction, code: string) => void;
  setGamepadBinding: (action: LogicalAction, buttonIndex: number) => void;
  resetControlSettings: () => void;
  activeModality: InputModality;
  reportModality: (modality: InputModality) => void;
  connectedGamepad: string | null;
  gamepadAnalog: { x: number; y: number };
  isGameplayFocused: boolean;
  setGameplayFocused: (active: boolean) => void;
  subscribeAction: (handler: (action: LogicalAction, source: InputModality) => void) => () => void;
  dispatchAction: (action: LogicalAction, source: InputModality) => void;
  lastGamepadButtonPressed: number | null;
}

const ControlContext = createContext<ControlContextValue | null>(null);

const SCROLL_LOCK_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export const ControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ControlSettings>(() => loadControlSettings());
  const [activeModality, setActiveModality] = useState<InputModality>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
      return 'touch';
    }
    return 'keyboard';
  });
  const [connectedGamepad, setConnectedGamepad] = useState<string | null>(null);
  const [gamepadAnalog, setGamepadAnalog] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isGameplayFocused, setGameplayFocused] = useState(false);
  const [lastGamepadButtonPressed, setLastGamepadButtonPressed] = useState<number | null>(null);

  const lastModalityChangeRef = useRef<number>(0);
  const listenersRef = useRef<Set<(action: LogicalAction, source: InputModality) => void>>(new Set());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const focusedRef = useRef(isGameplayFocused);
  focusedRef.current = isGameplayFocused;

  // Persist settings & apply accessibility classes to <html>
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage error
    }
    const root = document.documentElement;
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('reduced-motion', settings.reducedMotion);
  }, [settings]);

  const reportModality = useCallback((next: InputModality) => {
    const now = performance.now();
    // Hysteresis prevents rapid flickering between touch/mouse or keyboard/mouse
    if (now - lastModalityChangeRef.current < 550) return;
    setActiveModality((prev) => {
      if (prev === next) return prev;
      lastModalityChangeRef.current = now;
      return next;
    });
  }, []);

  const dispatchAction = useCallback((action: LogicalAction, source: InputModality) => {
    reportModality(source);
    listenersRef.current.forEach((fn) => fn(action, source));
  }, [reportModality]);

  const subscribeAction = useCallback((handler: (action: LogicalAction, source: InputModality) => void) => {
    listenersRef.current.add(handler);
    return () => {
      listenersRef.current.delete(handler);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<ControlSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setKeyBinding = useCallback((action: LogicalAction, code: string) => {
    setSettings((prev) => {
      const existing = prev.keyBindings[action] || [];
      const updated = [code, ...existing.filter((c) => c !== code)].slice(0, 2);
      return {
        ...prev,
        keyBindings: { ...prev.keyBindings, [action]: updated },
      };
    });
  }, []);

  const setGamepadBinding = useCallback((action: LogicalAction, buttonIndex: number) => {
    setSettings((prev) => ({
      ...prev,
      gamepadBindings: { ...prev.gamepadBindings, [action]: [buttonIndex] },
    }));
  }, []);

  const resetControlSettings = useCallback(() => {
    setSettings(DEFAULT_CONTROL_SETTINGS);
  }, []);

  // Smart global pointer & keyboard detection + selective scroll prevention
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        reportModality('touch');
      } else if (e.pointerType === 'mouse') {
        reportModality('mouse');
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }

      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        reportModality('keyboard');
      }

      const code = e.code || e.key;
      const bindings = settingsRef.current.keyBindings;
      let matchedAction: LogicalAction | null = null;

      for (const [act, codes] of Object.entries(bindings) as Array<[LogicalAction, string[]]>) {
        if (codes.includes(code) || codes.includes(e.key)) {
          matchedAction = act;
          break;
        }
      }

      // Prevent browser scrolling only for gameplay keys while a game is active
      if (focusedRef.current && (SCROLL_LOCK_KEYS.has(code) || matchedAction !== null)) {
        if (code !== 'Tab' && code !== 'F5' && code !== 'F12') {
          e.preventDefault();
        }
      }

      if (matchedAction && focusedRef.current) {
        dispatchAction(matchedAction, 'keyboard');
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dispatchAction, reportModality]);

  // Gamepad API detection & polling
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return;
    }

    let rafId = 0;
    let prevButtons: boolean[] = [];
    let lastAxisDir: { x: number; y: number } = { x: 0, y: 0 };
    let lastAxisRepeatAt = 0;

    const refreshGamepadConnection = () => {
      const pads = navigator.getGamepads();
      let activePad: Gamepad | null = null;
      for (const p of pads) {
        if (p && p.connected) {
          activePad = p;
          break;
        }
      }
      setConnectedGamepad(activePad ? activePad.id : null);
      if (!activePad) {
        setGamepadAnalog({ x: 0, y: 0 });
      }
    };

    const poll = (now: number) => {
      const pads = navigator.getGamepads();
      let pad: Gamepad | null = null;
      for (const p of pads) {
        if (p && p.connected) {
          pad = p;
          break;
        }
      }

      if (pad) {
        // Check analog left stick
        const rawX = pad.axes[0] ?? 0;
        const rawY = pad.axes[1] ?? 0;
        const deadzone = 0.25;
        const ax = Math.abs(rawX) > deadzone ? rawX : 0;
        const ay = Math.abs(rawY) > deadzone ? rawY : 0;
        setGamepadAnalog({ x: ax, y: ay });

        if (ax !== 0 || ay !== 0) {
          reportModality('gamepad');
        }

        // Convert analog stick tilts to discrete navigation/direction actions with repeat guard
        const dx = ax > 0.55 ? 1 : ax < -0.55 ? -1 : 0;
        const dy = ay > 0.55 ? 1 : ay < -0.55 ? -1 : 0;
        if (focusedRef.current && (dx !== 0 || dy !== 0)) {
          const dirChanged = dx !== lastAxisDir.x || dy !== lastAxisDir.y;
          if (dirChanged || now - lastAxisRepeatAt > 190) {
            lastAxisRepeatAt = now;
            if (Math.abs(ax) >= Math.abs(ay)) {
              if (dx > 0) dispatchAction('right', 'gamepad');
              else if (dx < 0) dispatchAction('left', 'gamepad');
            } else {
              if (dy > 0) dispatchAction('down', 'gamepad');
              else if (dy < 0) dispatchAction('up', 'gamepad');
            }
          }
        }
        lastAxisDir = { x: dx, y: dy };

        // Edge-triggered button checks
        const gBindings = settingsRef.current.gamepadBindings;
        pad.buttons.forEach((btn, idx) => {
          const pressed = btn.pressed || btn.value > 0.5;
          const wasPressed = prevButtons[idx] || false;
          if (pressed && !wasPressed) {
            setLastGamepadButtonPressed(idx);
            reportModality('gamepad');
            if (focusedRef.current) {
              for (const [act, btnList] of Object.entries(gBindings) as Array<[LogicalAction, number[]]>) {
                if (btnList.includes(idx)) {
                  dispatchAction(act, 'gamepad');
                }
              }
            }
          }
          prevButtons[idx] = pressed;
        });
      }

      rafId = requestAnimationFrame(poll);
    };

    const onConnect = (e: GamepadEvent) => {
      setConnectedGamepad(e.gamepad.id);
      reportModality('gamepad');
    };
    const onDisconnect = () => {
      prevButtons = [];
      refreshGamepadConnection();
    };

    refreshGamepadConnection();
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    rafId = requestAnimationFrame(poll);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, [dispatchAction, reportModality]);

  return (
    <ControlContext.Provider
      value={{
        settings,
        updateSettings,
        setKeyBinding,
        setGamepadBinding,
        resetControlSettings,
        activeModality,
        reportModality,
        connectedGamepad,
        gamepadAnalog,
        isGameplayFocused,
        setGameplayFocused,
        subscribeAction,
        dispatchAction,
        lastGamepadButtonPressed,
      }}
    >
      {children}
    </ControlContext.Provider>
  );
};

export function useControls(): ControlContextValue {
  const ctx = useContext(ControlContext);
  if (!ctx) throw new Error('useControls must be used inside ControlProvider');
  return ctx;
}
