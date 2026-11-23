import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  Heart,
  HelpCircle,
  Keyboard,
  LogOut,
  Maximize2,
  Minimize2,
  Mouse,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import type { GameCatalogItem } from '../data/games';
import { ControlSettingsModal } from './controls/ControlSettingsModal';
import { HelpInstructionsModal } from './controls/HelpInstructionsModal';

export interface GameControlContext {
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  restartKey: number;
  triggerRestart: () => void;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onScoreEnd: (score: number, won: boolean, durationSec?: number) => void;
}

interface GameShellProps {
  game: GameCatalogItem;
  children: (ctx: GameControlContext) => React.ReactNode;
  scoreLabel?: string;
  currentScore?: number;
  bestScore?: number;
  extraHud?: React.ReactNode;
}

export const GameShell: React.FC<GameShellProps> = ({
  game,
  children,
  currentScore,
  bestScore,
  extraHud,
}) => {
  const navigate = useNavigate();
  const { lang, t, prefs, toggleSound, isFavorite, toggleFavorite, recordSessionStart, recordGameResult } = useApp();
  const { activeModality, connectedGamepad, setGameplayFocused, subscribeAction } = useControls();

  const [isPaused, setIsPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const recordedStartRef = useRef<boolean>(false);

  useEffect(() => {
    if (!recordedStartRef.current) {
      recordSessionStart(game.slug);
      recordedStartRef.current = true;
    }
    sessionStartRef.current = Date.now();
  }, [game.slug, recordSessionStart]);

  // Keep global gameplay focus flag active only when modals are closed
  useEffect(() => {
    setGameplayFocused(!settingsOpen && !helpOpen);
    return () => setGameplayFocused(false);
  }, [helpOpen, setGameplayFocused, settingsOpen]);

  // Auto-pause when tab becomes inactive or window loses visibility
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Sync native fullscreen exits (Escape key)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const triggerRestart = useCallback(() => {
    setIsPaused(false);
    setRestartKey((k) => k + 1);
    sessionStartRef.current = Date.now();
  }, []);

  // Universal keyboard/gamepad Pause & Restart actions
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'pause') {
        setIsPaused((p) => !p);
      } else if (action === 'restart') {
        triggerRestart();
      }
    });
  }, [subscribeAction, triggerRestart]);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (containerRef.current && containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } catch {
        // Fallback to CSS full-viewport overlay if Fullscreen API is blocked
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore
      }
    }
  };

  const onScoreEnd = useCallback(
    (score: number, won: boolean, durationSec?: number) => {
      const elapsed = durationSec ?? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000));
      recordGameResult(game.slug, score, won, elapsed);
    },
    [game.slug, recordGameResult]
  );

  const fav = isFavorite(game.slug);

  const ModalityIcon =
    activeModality === 'touch'
      ? Smartphone
      : activeModality === 'gamepad'
      ? Gamepad2
      : activeModality === 'mouse'
      ? Mouse
      : Keyboard;

  const modalityHint =
    activeModality === 'touch'
      ? game.mobileControls[0]
      : activeModality === 'gamepad'
      ? 'Gamepad active · D-Pad / Stick + A/B/X/Y'
      : game.desktopControls[0];

  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#090B12] flex flex-col overflow-y-auto p-3 sm:p-6'
          : 'rounded-2xl bg-white dark:bg-[#111524] border border-slate-200 dark:border-white/10 p-3 sm:p-6 hc-surface'
      }
    >
      {/* Universal Game Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/${lang}/games/`)}
            aria-label="Exit Game"
            className="min-h-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0 hc-button"
          >
            <LogOut className="w-4 h-4 rotate-180" />
            <span className="hidden sm:inline">Exit</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
              {game.title}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              <ModalityIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
              <span className="truncate">{modalityHint}</span>
            </div>
          </div>
        </div>

        {/* Live Score + 8 Universal Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {typeof currentScore === 'number' && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-mono tabular-nums">
              <span className="text-slate-500 dark:text-slate-400 mr-1.5">{t.common.score}:</span>
              <span className="font-bold text-slate-900 dark:text-white">{currentScore}</span>
            </div>
          )}
          {typeof bestScore === 'number' && bestScore > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-mono tabular-nums">
              <span className="text-slate-500 dark:text-slate-400 mr-1.5">{t.common.bestScore}:</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">{bestScore}</span>
            </div>
          )}
          {extraHud}

          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? t.common.resume : t.common.pause}
            title={isPaused ? t.common.resume : t.common.pause}
            className="min-h-[44px] min-w-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 hc-button"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span className="hidden md:inline">{isPaused ? t.common.resume : t.common.pause}</span>
          </button>

          <button
            type="button"
            onClick={triggerRestart}
            aria-label={t.common.restart}
            title={t.common.restart}
            className="min-h-[44px] min-w-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 hc-button"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden md:inline">{t.common.restart}</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={prefs.soundEnabled ? t.common.soundOn : t.common.soundOff}
            title={prefs.soundEnabled ? t.common.soundOn : t.common.soundOff}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 hc-button"
          >
            {prefs.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Control Settings"
            title="Control Settings"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 hc-button"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Help and Instructions"
            title="Help and Instructions"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 hc-button"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(game.slug)}
            aria-label={fav ? t.common.unfavorite : t.common.favorite}
            title={fav ? t.common.unfavorite : t.common.favorite}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 hc-button"
          >
            <Heart className={`w-4 h-4 ${fav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? t.common.exitFullscreen : t.common.fullscreen}
            title={isFullscreen ? t.common.exitFullscreen : t.common.fullscreen}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 text-white hc-button"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Controller Status Banner (only shown when a physical gamepad is connected) */}
      {connectedGamepad && (
        <div className="mt-3 px-3 py-2 rounded-xl bg-violet-600/10 border border-violet-500/25 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-violet-200">
          <div className="flex items-center gap-2 min-w-0">
            <Gamepad2 className="w-4 h-4 text-violet-500 shrink-0" />
            <span className="truncate font-medium">Controller Connected: {connectedGamepad}</span>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="font-semibold text-violet-600 dark:text-violet-300 hover:underline whitespace-nowrap"
          >
            View Controller Help
          </button>
        </div>
      )}

      {/* Active Game Surface */}
      <div className="mt-4 flex-1 flex flex-col items-center justify-center">
        {children({
          isPaused,
          setIsPaused,
          restartKey,
          triggerRestart,
          soundEnabled: prefs.soundEnabled,
          hapticsEnabled: prefs.hapticsEnabled,
          onScoreEnd,
        })}
      </div>

      <ControlSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HelpInstructionsModal game={game} open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};
