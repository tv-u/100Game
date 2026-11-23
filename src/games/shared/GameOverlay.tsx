import React from 'react';
import { useApp } from '../../context/AppContext';
import type { GameControlContext } from '../../components/GameShell';
import { LeaderboardSubmitWidget } from '../../components/LeaderboardSubmitWidget';

export const GameOverlay: React.FC<{
  status: 'READY' | 'PLAYING' | 'GAME_OVER' | 'WON';
  ctx: GameControlContext;
  title: string;
  subtitle: string;
  score: number;
  gameSlug: string;
  mode?: string;
  onStart: () => void;
  onRestart: () => void;
}> = ({ status, ctx, title, subtitle, score, gameSlug, mode, onStart, onRestart }) => {
  const { t } = useApp();

  if (status === 'READY') {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#070B19]/80 backdrop-blur-xs p-6 text-center"
      >
        <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-xs text-slate-300 max-w-xs">{subtitle}</p>
        <button
          type="button"
          onClick={onStart}
          className="mt-5 min-h-[48px] px-7 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.45)] hc-button"
        >
          {t.common.startGame}
        </button>
      </div>
    );
  }

  if (ctx.isPaused && status === 'PLAYING') {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070B19]/85 backdrop-blur-xs p-6 text-center"
      >
        <h2 className="font-display text-2xl font-bold text-white">{t.common.pausedTitle}</h2>
        <button
          type="button"
          onClick={() => ctx.setIsPaused(false)}
          className="mt-4 min-h-[48px] px-7 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm hc-button"
        >
          {t.common.resume}
        </button>
      </div>
    );
  }

  if (status === 'GAME_OVER' || status === 'WON') {
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070B19]/88 backdrop-blur-xs p-6 text-center"
      >
        <h2 className="font-display text-2xl font-bold text-white">
          {status === 'WON' ? t.common.youWin : t.common.gameOver}
        </h2>
        <p className="mt-1 font-mono text-xl font-bold text-cyan-400 tabular-nums">
          {t.common.score}: {score}
        </p>
        <LeaderboardSubmitWidget gameSlug={gameSlug} score={score} mode={mode} />
        <button
          type="button"
          onClick={onRestart}
          className="mt-4 min-h-[48px] px-7 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.45)] hc-button"
        >
          {t.common.playAgain}
        </button>
      </div>
    );
  }

  return null;
};
