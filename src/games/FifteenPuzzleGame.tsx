import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import { usePointerGesture } from '../controls/usePointerGesture';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { sfx, triggerHaptic } from '../utils/sound';

const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];

function isSolvable(tiles: number[]): boolean {
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === 0) continue;
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[j] !== 0 && tiles[i] > tiles[j]) inversions++;
    }
  }
  const blankIdx = tiles.indexOf(0);
  const blankRowFromBottom = 4 - Math.floor(blankIdx / 4);
  if (blankRowFromBottom % 2 === 0) {
    return inversions % 2 === 1;
  }
  return inversions % 2 === 0;
}

function generateSolvableBoard(): number[] {
  const arr = [...SOLVED];
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } while (!isSolvable(arr) || arr.every((v, idx) => v === SOLVED[idx]));
  return arr;
}

const FifteenPuzzleGame: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { subscribeAction } = useControls();
  const [tiles, setTiles] = useState<number[]>(() => generateSolvableBoard());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);

  const reset = useCallback(() => {
    setTiles(generateSolvableBoard());
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setWon(false);
    onScoreChange(0);
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  useEffect(() => {
    if (!started || won || ctx.isPaused) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [ctx.isPaused, started, won]);

  const slideTileAt = useCallback(
    (idx: number) => {
      if (ctx.isPaused || won) return;
      const blank = tiles.indexOf(0);
      const r = Math.floor(idx / 4);
      const c = idx % 4;
      const br = Math.floor(blank / 4);
      const bc = blank % 4;

      if (r !== br && c !== bc) return;
      if (idx === blank) return;

      if (!started) setStarted(true);
      const next = [...tiles];

      // Slide single or multi-tile row/column cleanly toward empty slot
      if (r === br) {
        const step = c < bc ? -1 : 1;
        for (let col = bc; col !== c; col += step) {
          next[br * 4 + col] = next[br * 4 + col + step];
        }
        next[idx] = 0;
      } else {
        const step = r < br ? -1 : 1;
        for (let row = br; row !== r; row += step) {
          next[row * 4 + bc] = next[(row + step) * 4 + bc];
        }
        next[idx] = 0;
      }

      const nextMoves = moves + 1;
      setTiles(next);
      setMoves(nextMoves);
      sfx.click(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 8);

      const solvedNow = next.every((v, i) => v === SOLVED[i]);
      if (solvedNow) {
        const finalScore = Math.max(250, 1500 - nextMoves * 6 - seconds * 3);
        onScoreChange(finalScore);
        setWon(true);
        sfx.win(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, [20, 30, 50]);
        ctx.onScoreEnd(finalScore, true, seconds);
      } else {
        const inPlace = next.filter((v, i) => v !== 0 && v === SOLVED[i]).length;
        onScoreChange(inPlace * 15);
      }
    },
    [ctx, moves, onScoreChange, seconds, started, tiles, won]
  );

  const slideByDirection = useCallback(
    (dr: number, dc: number) => {
      const blank = tiles.indexOf(0);
      const br = Math.floor(blank / 4);
      const bc = blank % 4;
      const tr = br - dr;
      const tc = bc - dc;
      if (tr >= 0 && tr < 4 && tc >= 0 && tc < 4) {
        slideTileAt(tr * 4 + tc);
      }
    },
    [slideTileAt, tiles]
  );

  // Normalized Keyboard & Gamepad sliding
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'up') slideByDirection(-1, 0);
      else if (action === 'down') slideByDirection(1, 0);
      else if (action === 'left') slideByDirection(0, -1);
      else if (action === 'right') slideByDirection(0, 1);
      else if (action === 'primary' && won) reset();
    });
  }, [reset, slideByDirection, subscribeAction, won]);

  const pointerHandlers = usePointerGesture({
    onSwipe: (dir) => {
      if (dir === 'up') slideByDirection(-1, 0);
      else if (dir === 'down') slideByDirection(1, 0);
      else if (dir === 'left') slideByDirection(0, -1);
      else if (dir === 'right') slideByDirection(0, 1);
    },
  });

  const winScore = Math.max(250, 1500 - moves * 6 - seconds * 3);

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4">
      <div className="w-full flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
        <span>
          {t.common.moves}: <strong>{moves}</strong>
        </span>
        <span>
          {t.common.time}: <strong>{seconds}s</strong>
        </span>
      </div>

      <div
        {...pointerHandlers}
        className="relative w-full aspect-square rounded-2xl bg-[#111C24] p-3 grid grid-cols-4 gap-2.5 border border-white/10 game-surface-lock hc-surface"
      >
        {tiles.map((num, idx) => {
          if (num === 0) {
            return <div key={`empty-${idx}`} aria-label="Empty slot" className="rounded-xl bg-black/25" />;
          }
          const correctSpot = num === SOLVED[idx];
          return (
            <button
              key={num}
              type="button"
              onClick={() => slideTileAt(idx)}
              aria-label={`Tile ${num}${correctSpot ? ', in correct position' : ''}`}
              className={`rounded-xl font-display text-2xl sm:text-3xl font-extrabold flex items-center justify-center transition-transform active:scale-95 min-h-[56px] hc-button ${
                correctSpot
                  ? 'bg-teal-500 text-slate-950'
                  : 'bg-slate-200 dark:bg-[#1E2E3B] text-slate-900 dark:text-white border border-white/10 hover:border-teal-400/60'
              }`}
            >
              {num}
            </button>
          );
        })}

        {ctx.isPaused && !won && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-white">{t.common.pausedTitle}</h2>
            <button
              type="button"
              onClick={() => ctx.setIsPaused(false)}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-violet-600 text-white font-semibold text-sm hc-button"
            >
              {t.common.resume}
            </button>
          </div>
        )}

        {won && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-teal-400">{t.common.youWin}</h2>
            <p className="mt-1 font-mono text-sm text-white tabular-nums">
              {moves} {t.common.moves} · {seconds}s
            </p>
            <LeaderboardSubmitWidget gameSlug="15-puzzle" score={winScore} />
            <button
              type="button"
              onClick={reset}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm hc-button"
            >
              {t.common.playAgain}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FifteenPuzzleGame;
