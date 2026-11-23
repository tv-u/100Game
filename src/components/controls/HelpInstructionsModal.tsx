import React from 'react';
import { Gamepad2, Keyboard, Mouse, Smartphone, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useControls } from '../../controls/ControlContext';
import { formatKeyCode } from '../../controls/types';
import type { GameCatalogItem } from '../../data/games';

export const HelpInstructionsModal: React.FC<{
  game: GameCatalogItem;
  open: boolean;
  onClose: () => void;
}> = ({ game, open, onClose }) => {
  const { t } = useApp();
  const { activeModality, connectedGamepad, settings } = useControls();

  if (!open) return null;

  const kb = settings.keyBindings;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${game.title} Help and Instructions`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-white/15 p-5 sm:p-6 space-y-5 hc-surface">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {game.title} — {t.common.howToPlay}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Active Input: <span className="font-semibold capitalize">{activeModality}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-200 list-decimal list-inside">
          {game.howToPlay.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
          <div className={`p-3 rounded-xl border ${activeModality === 'touch' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-200 dark:border-white/10'}`}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1">
              <Smartphone className="w-4 h-4 text-violet-500" />
              <span>Touch Controls</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {game.mobileControls.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          </div>

          <div className={`p-3 rounded-xl border ${activeModality === 'keyboard' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-200 dark:border-white/10'}`}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1">
              <Keyboard className="w-4 h-4 text-blue-500" />
              <span>Keyboard (Active Bindings)</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {game.desktopControls.map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
              <li className="font-mono text-[11px] pt-1 text-slate-500">
                Move: {kb.up.map(formatKeyCode).join('/')} {kb.down.map(formatKeyCode).join('/')} {kb.left.map(formatKeyCode).join('/')} {kb.right.map(formatKeyCode).join('/')} · Pause: {kb.pause.map(formatKeyCode).join('/')}
              </li>
            </ul>
          </div>

          <div className={`p-3 rounded-xl border ${activeModality === 'mouse' ? 'border-violet-500 bg-violet-500/10' : 'border-slate-200 dark:border-white/10'}`}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1">
              <Mouse className="w-4 h-4 text-emerald-500" />
              <span>Mouse Controls</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Click, drag, or right-click (for flagging in Minesweeper) directly inside the game board.
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${activeModality === 'gamepad' || connectedGamepad ? 'border-violet-500 bg-violet-500/10' : 'border-slate-200 dark:border-white/10'}`}>
            <div className="flex items-center gap-2 text-xs font-bold mb-1">
              <Gamepad2 className="w-4 h-4 text-amber-500" />
              <span>Gamepad / Controller {connectedGamepad ? '(Connected)' : '(Auto-Detected)'}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Use D-Pad or Left Analog Stick to move/navigate, A to confirm/drop, B/Y to rotate or undo, X to hold/flag, and Start to pause.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
        >
          Back to Game
        </button>
      </div>
    </div>
  );
};
