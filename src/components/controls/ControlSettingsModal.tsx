import React, { useEffect, useState } from 'react';
import { Gamepad2, RotateCcw, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useControls } from '../../controls/ControlContext';
import {
  ACTION_LABELS,
  GAMEPAD_BUTTON_NAMES,
  formatKeyCode,
  type LogicalAction,
} from '../../controls/types';

export const ControlSettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { prefs, toggleSound, toggleHaptics } = useApp();
  const {
    settings,
    updateSettings,
    setKeyBinding,
    setGamepadBinding,
    resetControlSettings,
    connectedGamepad,
    lastGamepadButtonPressed,
  } = useControls();

  const [remappingAction, setRemappingAction] = useState<LogicalAction | null>(null);
  const [remappingGamepadAction, setRemappingGamepadAction] = useState<LogicalAction | null>(null);

  useEffect(() => {
    if (!open || !remappingAction) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setRemappingAction(null);
        return;
      }
      setKeyBinding(remappingAction, e.code || e.key);
      setRemappingAction(null);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [open, remappingAction, setKeyBinding]);

  // Listen for gamepad button press when remapping gamepad button
  useEffect(() => {
    if (!open || !remappingGamepadAction || lastGamepadButtonPressed === null) return;
    setGamepadBinding(remappingGamepadAction, lastGamepadButtonPressed);
    setRemappingGamepadAction(null);
  }, [lastGamepadButtonPressed, open, remappingGamepadAction, setGamepadBinding]);

  if (!open) return null;

  const actionsToMap: LogicalAction[] = ['up', 'down', 'left', 'right', 'primary', 'secondary', 'hold', 'undo', 'flag', 'pause', 'restart'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Control and Accessibility Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-white/15 p-5 sm:p-7 space-y-6 hc-surface">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Controls & Accessibility
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize touch layout, keyboard bindings, gamepad mappings, and visual accessibility.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Touch Layout & Ergonomics */}
        <section className="space-y-4">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Mobile & Touch Layout
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Handedness</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
                {(['right', 'left'] as const).map((hand) => (
                  <button
                    key={hand}
                    type="button"
                    onClick={() => updateSettings({ handedness: hand })}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold capitalize ${
                      settings.handedness === hand
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {hand}-Handed
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Directional Pad Style</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
                {[
                  { id: 'dpad', label: 'Virtual D-Pad' },
                  { id: 'joystick', label: 'Analog Joystick' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSettings({ mobileControlStyle: opt.id as 'dpad' | 'joystick' })}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold ${
                      settings.mobileControlStyle === opt.id
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Touch Button Size</span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
                {[
                  { id: 'compact', label: '44px' },
                  { id: 'standard', label: '50px' },
                  { id: 'large', label: '58px' },
                ].map((sz) => (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => updateSettings({ buttonSize: sz.id as 'compact' | 'standard' | 'large' })}
                    className={`min-h-[40px] rounded-lg text-xs font-semibold ${
                      settings.buttonSize === sz.id
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="opacity-slider" className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Touch Button Opacity</span>
                <span className="font-mono tabular-nums">{Math.round(settings.buttonOpacity * 100)}%</span>
              </label>
              <input
                id="opacity-slider"
                type="range"
                min={0.35}
                max={1}
                step={0.05}
                value={settings.buttonOpacity}
                onChange={(e) => updateSettings({ buttonOpacity: Number(e.target.value) })}
                className="w-full accent-violet-600 h-10"
              />
            </div>
          </div>
        </section>

        {/* Accessibility & Feedback Toggles */}
        <section className="space-y-3 border-t border-slate-200 dark:border-white/10 pt-4">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Accessibility & Feedback
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer min-h-[48px]">
              <span className="text-xs font-semibold">High-Contrast Mode</span>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                className="w-4 h-4 accent-violet-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer min-h-[48px]">
              <span className="text-xs font-semibold">Reduced Motion</span>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                className="w-4 h-4 accent-violet-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer min-h-[48px]">
              <span className="text-xs font-semibold">Sound Effects</span>
              <input
                type="checkbox"
                checked={prefs.soundEnabled}
                onChange={toggleSound}
                className="w-4 h-4 accent-violet-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer min-h-[48px]">
              <span className="text-xs font-semibold">Vibration / Haptics</span>
              <input
                type="checkbox"
                checked={prefs.hapticsEnabled}
                onChange={toggleHaptics}
                className="w-4 h-4 accent-violet-600"
              />
            </label>

            <label className="sm:col-span-2 flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer min-h-[48px]">
              <span className="text-xs font-semibold">Show Breakout Virtual Left/Right Buttons</span>
              <input
                type="checkbox"
                checked={settings.showVirtualButtonsOnBreakout}
                onChange={(e) => updateSettings({ showVirtualButtonsOnBreakout: e.target.checked })}
                className="w-4 h-4 accent-violet-600"
              />
            </label>
          </div>
        </section>

        {/* Keyboard & Gamepad Remapping */}
        <section className="space-y-3 border-t border-slate-200 dark:border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Keyboard & Gamepad Mappings
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Gamepad2 className="w-4 h-4 text-violet-500" />
              <span className="truncate max-w-[220px]">
                {connectedGamepad ? connectedGamepad : 'No controller connected'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {actionsToMap.map((act) => {
              const keys = settings.keyBindings[act] || [];
              const padBtns = settings.gamepadBindings[act] || [];
              const isWaitingKey = remappingAction === act;
              const isWaitingPad = remappingGamepadAction === act;

              return (
                <div
                  key={act}
                  className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{ACTION_LABELS[act]}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRemappingGamepadAction(null);
                        setRemappingAction(isWaitingKey ? null : act);
                      }}
                      className={`min-h-[36px] px-3 rounded-lg font-mono font-semibold border transition-colors ${
                        isWaitingKey
                          ? 'bg-violet-600 text-white border-violet-500'
                          : 'bg-white dark:bg-[#090B12] border-slate-200 dark:border-white/15'
                      }`}
                    >
                      {isWaitingKey ? 'Press key...' : keys.map(formatKeyCode).join(' / ')}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRemappingAction(null);
                        setRemappingGamepadAction(isWaitingPad ? null : act);
                      }}
                      disabled={!connectedGamepad}
                      title={connectedGamepad ? 'Click then press controller button' : 'Connect a gamepad to remap'}
                      className={`min-h-[36px] px-3 rounded-lg font-mono font-semibold border transition-colors disabled:opacity-40 ${
                        isWaitingPad
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-white dark:bg-[#090B12] border-slate-200 dark:border-white/15'
                      }`}
                    >
                      {isWaitingPad
                        ? 'Press pad...'
                        : padBtns.map((b) => GAMEPAD_BUTTON_NAMES[b] || `Btn ${b}`).join(', ')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
          <button
            type="button"
            onClick={resetControlSettings}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
