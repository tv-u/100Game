import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import { usePointerGesture } from '../controls/usePointerGesture';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { sfx, triggerHaptic } from '../utils/sound';

type Board = number[][];
type Dir = 'up' | 'down' | 'left' | 'right';

function createEmptyBoard(): Board {
  return Array.from({ length: 4 }, () => [0, 0, 0, 0]);
}

function addRandomTile(board: Board): Board {
  const empty: Array<[number, number]> = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function initBoard(): Board {
  return addRandomTile(addRandomTile(createEmptyBoard()));
}

function slideLineLeft(line: number[]): { result: number[]; gained: number; merged: boolean } {
  const nonZero = line.filter((v) => v !== 0);
  const result: number[] = [];
  let gained = 0;
  let merged = false;
  for (let i = 0; i < nonZero.length; i++) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const val = nonZero[i] * 2;
      result.push(val);
      gained += val;
      merged = true;
      i++;
    } else {
      result.push(nonZero[i]);
    }
  }
  while (result.length < 4) result.push(0);
  return { result, gained, merged };
}

function moveBoard(board: Board, dir: Dir): { next: Board; changed: boolean; gained: number; merged: boolean } {
  let changed = false;
  let totalGained = 0;
  let anyMerged = false;
  const next = createEmptyBoard();

  for (let i = 0; i < 4; i++) {
    let line: number[] = [];
    if (dir === 'left') line = [...board[i]];
    if (dir === 'right') line = [...board[i]].reverse();
    if (dir === 'up') line = [board[0][i], board[1][i], board[2][i], board[3][i]];
    if (dir === 'down') line = [board[3][i], board[2][i], board[1][i], board[0][i]];

    const { result, gained, merged } = slideLineLeft(line);
    totalGained += gained;
    if (merged) anyMerged = true;

    const restored = dir === 'right' || dir === 'down' ? [...result].reverse() : result;
    for (let j = 0; j < 4; j++) {
      if (dir === 'left' || dir === 'right') {
        next[i][j] = restored[j];
        if (next[i][j] !== board[i][j]) changed = true;
      } else {
        next[j][i] = restored[j];
        if (next[j][i] !== board[j][i]) changed = true;
      }
    }
  }
  return { next, changed, gained: totalGained, merged: anyMerged };
}

function canMove(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
    }
  }
  return false;
}

function tileStyle(val: number): string {
  const styles: Record<number, string> = {
    0: 'bg-slate-800/70 text-transparent',
    2: 'bg-slate-200 text-slate-900',
    4: 'bg-indigo-100 text-slate-900',
    8: 'bg-violet-500 text-white',
    16: 'bg-violet-600 text-white',
    32: 'bg-indigo-600 text-white',
    64: 'bg-blue-600 text-white',
    128: 'bg-cyan-500 text-slate-950',
    256: 'bg-teal-500 text-slate-950',
    512: 'bg-emerald-500 text-slate-950',
    1024: 'bg-amber-400 text-slate-950',
    2048: 'bg-rose-500 text-white',
  };
  return styles[val] || 'bg-fuchsia-600 text-white';
}

const Game2048: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { subscribeAction } = useControls();
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [history, setHistory] = useState<Array<{ board: Board; score: number }>>([]);
  const [score, setScore] = useState(0);
  const [won2048, setWon2048] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const endedRef = useRef(false);

  const reset = useCallback(() => {
    setBoard(initBoard());
    setHistory([]);
    setScore(0);
    onScoreChange(0);
    setWon2048(false);
    setKeepPlaying(false);
    setGameOver(false);
    endedRef.current = false;
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const applyMove = useCallback(
    (dir: Dir) => {
      if (ctx.isPaused || gameOver || (won2048 && !keepPlaying)) return;
      const { next, changed, gained, merged } = moveBoard(board, dir);
      if (!changed) return;

      setHistory((h) => [...h.slice(-5), { board, score }]);
      const withTile = addRandomTile(next);
      const nextScore = score + gained;
      setBoard(withTile);
      setScore(nextScore);
      onScoreChange(nextScore);

      if (merged) {
        sfx.merge(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, 10);
      } else {
        sfx.click(ctx.soundEnabled);
      }

      const reached2048 = !won2048 && withTile.some((row) => row.some((v) => v >= 2048));
      if (reached2048) {
        setWon2048(true);
        sfx.win(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, [20, 30, 40]);
        if (!endedRef.current) {
          endedRef.current = true;
          ctx.onScoreEnd(nextScore, true);
        }
      } else if (!canMove(withTile)) {
        setGameOver(true);
        sfx.gameOver(ctx.soundEnabled);
        if (!endedRef.current) {
          endedRef.current = true;
          ctx.onScoreEnd(nextScore, false);
        }
      }
    },
    [board, ctx, gameOver, keepPlaying, onScoreChange, score, won2048]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0 || ctx.isPaused) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setBoard(prev.board);
    setScore(prev.score);
    onScoreChange(prev.score);
    setGameOver(false);
  }, [ctx.isPaused, history, onScoreChange]);

  // Normalized Keyboard & Gamepad action subscription
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'up') applyMove('up');
      else if (action === 'down') applyMove('down');
      else if (action === 'left') applyMove('left');
      else if (action === 'right') applyMove('right');
      else if (action === 'undo') handleUndo();
    });
  }, [applyMove, handleUndo, subscribeAction]);

  const swipeHandlers = usePointerGesture({
    onSwipe: (dir) => applyMove(dir),
    swipeThreshold: 20,
  });

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4">
      <div className="w-full flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Swipe, Arrow keys, WASD, or Gamepad
        </span>
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0}
          className="inline-flex items-center gap-1.5 min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/5 hc-button"
        >
          <Undo2 className="w-4 h-4" />
          <span>{t.common.undo}</span>
        </button>
      </div>

      <div
        {...swipeHandlers}
        className="relative w-full aspect-square rounded-2xl bg-[#16192B] p-3 grid grid-cols-4 gap-2.5 border border-white/10 game-surface-lock hc-surface"
      >
        {board.flat().map((val, idx) => (
          <div
            key={idx}
            className={`rounded-xl flex items-center justify-center font-display font-extrabold tabular-nums transition-transform duration-150 ${
              val >= 1024 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
            } ${tileStyle(val)}`}
          >
            {val > 0 ? val : ''}
          </div>
        ))}

        {ctx.isPaused && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs p-6 text-center"
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

        {won2048 && !keepPlaying && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-amber-400">{t.common.youWin}</h2>
            <p className="mt-1 font-mono text-base text-white tabular-nums">
              {t.common.score}: {score}
            </p>
            <LeaderboardSubmitWidget gameSlug="2048" score={score} />
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => setKeepPlaying(true)}
                className="min-h-[48px] px-5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm hc-button"
              >
                {t.common.keepPlaying}
              </button>
              <button
                type="button"
                onClick={reset}
                className="min-h-[48px] px-5 rounded-xl border border-white/20 text-white font-semibold text-sm hc-button"
              >
                {t.common.playAgain}
              </button>
            </div>
          </div>
        )}

        {gameOver && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-white">{t.common.gameOver}</h2>
            <p className="mt-1 font-mono text-lg text-violet-300 tabular-nums">
              {t.common.score}: {score}
            </p>
            <LeaderboardSubmitWidget gameSlug="2048" score={score} />
            <button
              type="button"
              onClick={reset}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm hc-button"
            >
              {t.common.playAgain}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game2048;
