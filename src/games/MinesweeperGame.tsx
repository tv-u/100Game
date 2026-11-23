import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bomb, Flag, Pickaxe } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { sfx, triggerHaptic } from '../utils/sound';

type Difficulty = 'easy' | 'medium' | 'hard';

const PRESETS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 24 },
  hard: { rows: 14, cols: 14, mines: 36 },
};

interface CellState {
  hasMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

function createEmptyGrid(rows: number, cols: number): CellState[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      hasMine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    }))
  );
}

function populateMines(grid: CellState[][], mines: number, safeR: number, safeC: number): CellState[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const next = grid.map((row) => row.map((cell) => ({ ...cell })));
  const candidates: Array<[number, number]> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      candidates.push([r, c]);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (let i = 0; i < Math.min(mines, candidates.length); i++) {
    const [mr, mc] = candidates[i];
    next[mr][mc].hasMine = true;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].hasMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && next[nr][nc].hasMine) {
            count++;
          }
        }
      }
      next[r][c].adjacent = count;
    }
  }
  return next;
}

function floodReveal(grid: CellState[][], startR: number, startC: number): CellState[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const next = grid.map((row) => row.map((cell) => ({ ...cell })));
  const queue: Array<[number, number]> = [[startR, startC]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const cell = next[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.hasMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !next[nr][nc].revealed) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }
  return next;
}

const NUMBER_COLORS: Record<number, string> = {
  1: 'text-sky-400',
  2: 'text-emerald-400',
  3: 'text-rose-400',
  4: 'text-violet-400',
  5: 'text-amber-400',
  6: 'text-cyan-400',
  7: 'text-pink-400',
  8: 'text-slate-300',
};

const MinesweeperGame: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { subscribeAction, activeModality, reportModality } = useControls();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const preset = PRESETS[difficulty];
  const [grid, setGrid] = useState<CellState[][]>(() => createEmptyGrid(preset.rows, preset.cols));
  const [minesPlaced, setMinesPlaced] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [outcome, setOutcome] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const pointerStartRef = useRef<{ id: number; x: number; y: number; r: number; c: number } | null>(null);
  const skipNextClickRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  const reset = useCallback(
    (nextDiff: Difficulty = difficulty) => {
      clearLongPress();
      const p = PRESETS[nextDiff];
      setGrid(createEmptyGrid(p.rows, p.cols));
      setMinesPlaced(false);
      setSeconds(0);
      setOutcome('PLAYING');
      setCursor([0, 0]);
      onScoreChange(0);
    },
    [clearLongPress, difficulty, onScoreChange]
  );

  useEffect(() => {
    if (ctx.restartKey > 0) reset(difficulty);
  }, [ctx.restartKey, difficulty, reset]);

  useEffect(() => {
    if (!minesPlaced || outcome !== 'PLAYING' || ctx.isPaused) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [ctx.isPaused, minesPlaced, outcome]);

  const toggleFlag = useCallback(
    (r: number, c: number) => {
      if (ctx.isPaused || outcome !== 'PLAYING' || grid[r]?.[c]?.revealed) return;
      setCursor([r, c]);
      setGrid((prev) =>
        prev.map((row, ri) =>
          row.map((cell, ci) => (ri === r && ci === c ? { ...cell, flagged: !cell.flagged } : cell))
        )
      );
      sfx.click(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 16);
    },
    [ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled, grid, outcome]
  );

  const revealCell = useCallback(
    (r: number, c: number, forceReveal = false) => {
      if (ctx.isPaused || outcome !== 'PLAYING') return;
      setCursor([r, c]);
      if (flagMode && !forceReveal) {
        toggleFlag(r, c);
        return;
      }
      const target = grid[r]?.[c];
      if (!target || target.flagged || target.revealed) return;

      let currentGrid = grid;
      if (!minesPlaced) {
        currentGrid = populateMines(grid, preset.mines, r, c);
        setMinesPlaced(true);
      }

      if (currentGrid[r][c].hasMine) {
        const revealedAll = currentGrid.map((row) =>
          row.map((cell) => (cell.hasMine ? { ...cell, revealed: true } : cell))
        );
        setGrid(revealedAll);
        setOutcome('LOST');
        sfx.gameOver(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, [40, 40, 60]);
        ctx.onScoreEnd(0, false, seconds);
        return;
      }

      const afterFlood = floodReveal(currentGrid, r, c);
      setGrid(afterFlood);
      sfx.click(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 8);

      const safeTotal = preset.rows * preset.cols - preset.mines;
      const revealedCount = afterFlood.flat().filter((cell) => cell.revealed && !cell.hasMine).length;
      onScoreChange(revealedCount * 10);

      if (revealedCount === safeTotal) {
        const finalScore = Math.max(250, safeTotal * 15 - seconds * 3);
        onScoreChange(finalScore);
        setOutcome('WON');
        sfx.win(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, [20, 30, 50]);
        ctx.onScoreEnd(finalScore, true, seconds);
      }
    },
    [ctx, flagMode, grid, minesPlaced, onScoreChange, outcome, preset.cols, preset.mines, preset.rows, seconds, toggleFlag]
  );

  // Normalized Keyboard & Gamepad Grid Navigation + Reveal + Flag
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'up') {
        setCursor(([r, c]) => [(r - 1 + preset.rows) % preset.rows, c]);
      } else if (action === 'down') {
        setCursor(([r, c]) => [(r + 1) % preset.rows, c]);
      } else if (action === 'left') {
        setCursor(([r, c]) => [r, (c - 1 + preset.cols) % preset.cols]);
      } else if (action === 'right') {
        setCursor(([r, c]) => [r, (c + 1) % preset.cols]);
      } else if (action === 'primary') {
        if (outcome !== 'PLAYING') reset(difficulty);
        else revealCell(cursor[0], cursor[1]);
      } else if (action === 'flag' || action === 'secondary') {
        toggleFlag(cursor[0], cursor[1]);
      }
    });
  }, [cursor, difficulty, outcome, preset.cols, preset.rows, reset, revealCell, subscribeAction, toggleFlag]);

  const handleCellPointerDown = (e: React.PointerEvent<HTMLButtonElement>, r: number, c: number) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
    clearLongPress();
    longPressFiredRef.current = false;
    pointerStartRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, r, c };

    longPressTimerRef.current = window.setTimeout(() => {
      if (pointerStartRef.current && pointerStartRef.current.r === r && pointerStartRef.current.c === c) {
        longPressFiredRef.current = true;
        skipNextClickRef.current = true;
        toggleFlag(r, c);
      }
    }, 420);
  };

  const handleCellPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current;
    if (!start || start.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
      clearLongPress();
    }
  };

  const handleCellPointerUp = (e: React.PointerEvent<HTMLButtonElement>, r: number, c: number) => {
    clearLongPress();
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== e.pointerId) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10;
    if (!longPressFiredRef.current && !moved) {
      skipNextClickRef.current = true;
      revealCell(r, c);
    }
  };

  const handleCellPointerCancel = () => {
    clearLongPress();
    pointerStartRef.current = null;
    longPressFiredRef.current = false;
  };

  const flagCount = grid.flat().filter((c) => c.flagged).length;
  const minesRemaining = preset.mines - flagCount;
  const winScore = Math.max(250, (preset.rows * preset.cols - preset.mines) * 15 - seconds * 3);
  const showCursor = activeModality === 'keyboard' || activeModality === 'gamepad';

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-4">
      <div className="w-full flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200 dark:bg-white/5">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDifficulty(d);
                reset(d);
              }}
              className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors hc-button ${
                difficulty === d ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t.common[d]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFlagMode((f) => !f)}
            aria-pressed={flagMode}
            className={`inline-flex items-center gap-1.5 min-h-[48px] px-4 rounded-xl text-xs font-semibold transition-colors hc-button ${
              flagMode
                ? 'bg-amber-500 text-slate-950'
                : 'border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200'
            }`}
          >
            {flagMode ? <Flag className="w-4 h-4" /> : <Pickaxe className="w-4 h-4" />}
            <span>{flagMode ? t.common.flagMode : t.common.digMode}</span>
          </button>

          <span className="text-xs font-mono tabular-nums px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5">
            {t.common.minesLeft}: <strong>{minesRemaining}</strong> · {seconds}s
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto flex justify-center">
        <div
          className="grid gap-1 bg-slate-200 dark:bg-[#0B0F1C] p-2 rounded-2xl border border-slate-300 dark:border-white/10 select-none hc-surface"
          style={{ gridTemplateColumns: `repeat(${preset.cols}, minmax(28px, 36px))` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isFocused = showCursor && cursor[0] === r && cursor[1] === c && outcome === 'PLAYING';
              const cellAria = cell.revealed
                ? cell.hasMine
                  ? `Row ${r + 1} Column ${c + 1}: Mine`
                  : `Row ${r + 1} Column ${c + 1}: ${cell.adjacent} adjacent mines`
                : cell.flagged
                ? `Row ${r + 1} Column ${c + 1}: Flagged`
                : `Row ${r + 1} Column ${c + 1}: Unrevealed`;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onPointerDown={(e) => handleCellPointerDown(e, r, c)}
                  onPointerMove={handleCellPointerMove}
                  onPointerUp={(e) => handleCellPointerUp(e, r, c)}
                  onPointerCancel={handleCellPointerCancel}
                  onClick={() => {
                    if (skipNextClickRef.current) {
                      skipNextClickRef.current = false;
                      return;
                    }
                    revealCell(r, c);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFlag(r, c);
                  }}
                  aria-label={cellAria}
                  className={`aspect-square min-w-[28px] rounded-md text-xs font-mono font-bold flex items-center justify-center transition-colors touch-manipulation ${
                    cell.revealed
                      ? cell.hasMine
                        ? 'bg-rose-600 text-white'
                        : 'bg-white dark:bg-[#161B2E] text-slate-900 dark:text-white'
                      : 'bg-slate-300 dark:bg-[#27304A] hover:bg-slate-400/70 dark:hover:bg-[#334163]'
                  } ${isFocused ? 'ring-2 ring-amber-400 z-10' : ''}`}
                >
                  {cell.revealed ? (
                    cell.hasMine ? (
                      <Bomb className="w-3.5 h-3.5" />
                    ) : cell.adjacent > 0 ? (
                      <span className={NUMBER_COLORS[cell.adjacent]}>{cell.adjacent}</span>
                    ) : (
                      ''
                    )
                  ) : cell.flagged ? (
                    <Flag className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {ctx.isPaused && outcome === 'PLAYING' && (
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center">
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

        {outcome !== 'PLAYING' && (
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center">
            <h2 className={`font-display text-2xl font-bold ${outcome === 'WON' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {outcome === 'WON' ? t.common.youWin : t.common.gameOver}
            </h2>
            <p className="mt-1 font-mono text-sm text-slate-200 tabular-nums">
              {t.common.time}: {seconds}s
            </p>
            {outcome === 'WON' && <LeaderboardSubmitWidget gameSlug="minesweeper" score={winScore} mode={difficulty} />}
            <button
              type="button"
              onClick={() => reset(difficulty)}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm hc-button"
            >
              {t.common.playAgain}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinesweeperGame;
