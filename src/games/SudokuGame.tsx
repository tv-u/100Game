import React, { useCallback, useEffect, useState } from 'react';
import { Eraser, Lightbulb, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { sfx, triggerHaptic } from '../utils/sound';

type Difficulty = 'easy' | 'medium' | 'hard';

function isSafe(board: number[][], r: number, c: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === num || board[i][c] === num) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      if (board[br + dr][bc + dc] === num) return false;
    }
  }
  return true;
}

function solveBoard(board: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const n of nums) {
          if (isSafe(board, r, c, n)) {
            board[r][c] = n;
            if (solveBoard(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSudoku(diff: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const solved = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveBoard(solved);
  const puzzle = solved.map((row) => [...row]);
  const removeCount = diff === 'easy' ? 38 : diff === 'medium' ? 47 : 55;
  const coords = Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]).sort(() => Math.random() - 0.5);

  for (let i = 0; i < removeCount; i++) {
    const [r, c] = coords[i];
    puzzle[r][c] = 0;
  }
  return { puzzle, solution: solved };
}

const SudokuGame: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { subscribeAction } = useControls();
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [initialPuzzle, setInitialPuzzle] = useState<number[][]>(() => generateSudoku('easy').puzzle);
  const [solution, setSolution] = useState<number[][]>([]);
  const [grid, setGrid] = useState<number[][]>([]);
  const [notes, setNotes] = useState<number[][][]>(() =>
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
  );
  const [selected, setSelected] = useState<[number, number]>([0, 0]);
  const [notesMode, setNotesMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);

  const startNew = useCallback(
    (diff: Difficulty = difficulty) => {
      const { puzzle, solution: sol } = generateSudoku(diff);
      setInitialPuzzle(puzzle);
      setSolution(sol);
      setGrid(puzzle.map((r) => [...r]));
      setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])));
      setSelected([0, 0]);
      setSeconds(0);
      setWon(false);
      onScoreChange(0);
    },
    [difficulty, onScoreChange]
  );

  useEffect(() => {
    startNew(difficulty);
  }, [ctx.restartKey, difficulty, startNew]);

  useEffect(() => {
    if (won || ctx.isPaused) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [ctx.isPaused, won]);

  const inputDigit = useCallback(
    (num: number) => {
      if (won || ctx.isPaused || grid.length === 0) return;
      const [r, c] = selected;
      if (initialPuzzle[r][c] !== 0) return;

      if (notesMode && num > 0) {
        setNotes((prev) =>
          prev.map((row, ri) =>
            row.map((cellNotes, ci) => {
              if (ri !== r || ci !== c) return cellNotes;
              return cellNotes.includes(num) ? cellNotes.filter((n) => n !== num) : [...cellNotes, num].sort();
            })
          )
        );
        sfx.click(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, 6);
        return;
      }

      const next = grid.map((row) => [...row]);
      next[r][c] = num;
      setGrid(next);

      if (num > 0) {
        setNotes((prev) =>
          prev.map((row, ri) => row.map((n, ci) => (ri === r && ci === c ? [] : n)))
        );
      }

      const validCorrect = next.every((row, ri) => row.every((val, ci) => val === solution[ri][ci]));
      if (validCorrect) {
        const finalScore = Math.max(300, (difficulty === 'hard' ? 1200 : difficulty === 'medium' ? 900 : 650) - seconds);
        onScoreChange(finalScore);
        setWon(true);
        sfx.win(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, [20, 30, 50]);
        ctx.onScoreEnd(finalScore, true, seconds);
      } else {
        const filledCorrect = next.flat().filter((v, idx) => {
          const ri = Math.floor(idx / 9);
          const ci = idx % 9;
          return v !== 0 && initialPuzzle[ri][ci] === 0 && v === solution[ri][ci];
        }).length;
        onScoreChange(filledCorrect * 15);
        sfx.click(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, 8);
      }
    },
    [ctx, difficulty, grid, initialPuzzle, notesMode, onScoreChange, seconds, selected, solution, won]
  );

  const giveHint = () => {
    if (won || ctx.isPaused || grid.length === 0) return;
    const [r, c] = selected;
    if (initialPuzzle[r][c] !== 0) return;
    const next = grid.map((row) => [...row]);
    next[r][c] = solution[r][c];
    setGrid(next);
    sfx.eat(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, 12);
  };

  // Universal Keyboard & Gamepad 9x9 Navigation + Notes + Erase
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'up') setSelected(([r, c]) => [(r + 8) % 9, c]);
      else if (action === 'down') setSelected(([r, c]) => [(r + 1) % 9, c]);
      else if (action === 'left') setSelected(([r, c]) => [r, (c + 8) % 9]);
      else if (action === 'right') setSelected(([r, c]) => [r, (c + 1) % 9]);
      else if (action === 'notes') setNotesMode((m) => !m);
      else if (action === 'erase') inputDigit(0);
    });
  }, [inputDigit, subscribeAction]);

  // Digits 1–9 input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key >= '1' && e.key <= '9') {
        inputDigit(Number(e.key));
      } else if (e.key === '0') {
        inputDigit(0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inputDigit]);

  if (grid.length === 0) return null;

  const winScore = Math.max(300, (difficulty === 'hard' ? 1200 : difficulty === 'medium' ? 900 : 650) - seconds);

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4">
      <div className="w-full flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200 dark:bg-white/5">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDifficulty(d);
                startNew(d);
              }}
              className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors hc-button ${
                difficulty === d ? 'bg-sky-600 text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t.common[d]}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
          {t.common.time}: <strong>{seconds}s</strong>
        </span>
      </div>

      {/* 9x9 Sudoku Grid */}
      <div className="relative w-full aspect-square grid grid-cols-9 rounded-2xl overflow-hidden border-2 border-sky-500/60 bg-white dark:bg-[#0D1424] hc-surface">
        {grid.map((row, r) =>
          row.map((val, c) => {
            const isFixed = initialPuzzle[r][c] !== 0;
            const isSel = selected[0] === r && selected[1] === c;
            const isConflict = val !== 0 && !isFixed && val !== solution[r]?.[c];
            const borderR =
              (c + 1) % 3 === 0 && c < 8
                ? 'border-r-2 border-r-sky-500/50'
                : 'border-r border-r-slate-200 dark:border-r-white/10';
            const borderB =
              (r + 1) % 3 === 0 && r < 8
                ? 'border-b-2 border-b-sky-500/50'
                : 'border-b border-b-slate-200 dark:border-b-white/10';
            const cellNotes = notes[r]?.[c] || [];

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => setSelected([r, c])}
                aria-label={`Row ${r + 1} Column ${c + 1}, ${val > 0 ? `value ${val}` : 'empty'}${
                  isFixed ? ' (fixed)' : ''
                }${isConflict ? ' (incorrect)' : ''}`}
                className={`relative flex items-center justify-center font-mono text-base sm:text-lg font-bold transition-colors ${borderR} ${borderB} ${
                  isSel
                    ? 'bg-sky-500/25 ring-2 ring-inset ring-sky-400'
                    : isFixed
                    ? 'bg-slate-100/70 dark:bg-white/[0.04]'
                    : 'bg-transparent hover:bg-sky-500/10'
                } ${
                  isConflict
                    ? 'text-rose-500 underline decoration-wavy'
                    : isFixed
                    ? 'text-slate-900 dark:text-white'
                    : 'text-sky-600 dark:text-sky-400'
                }`}
              >
                {val > 0 ? (
                  val
                ) : cellNotes.length > 0 ? (
                  <span className="grid grid-cols-3 text-[8px] leading-none text-slate-400 p-0.5 w-full h-full place-items-center">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <span key={n}>{cellNotes.includes(n) ? n : ''}</span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })
        )}

        {ctx.isPaused && !won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center">
            <h2 className="font-display text-2xl font-bold text-sky-400">{t.common.youWin}</h2>
            <p className="mt-1 font-mono text-sm text-white tabular-nums">
              {t.common.time}: {seconds}s
            </p>
            <LeaderboardSubmitWidget gameSlug="sudoku" score={winScore} mode={difficulty} />
            <button
              type="button"
              onClick={() => startNew(difficulty)}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm hc-button"
            >
              {t.common.playAgain}
            </button>
          </div>
        )}
      </div>

      {/* Controls & Number Pad */}
      <div className="w-full flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setNotesMode((m) => !m)}
          aria-pressed={notesMode}
          className={`flex-1 min-h-[48px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border transition-colors hc-button ${
            notesMode
              ? 'bg-sky-600 text-white border-sky-600'
              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
          }`}
        >
          <Pencil className="w-4 h-4" />
          <span>{t.common.notes}</span>
        </button>
        <button
          type="button"
          onClick={() => inputDigit(0)}
          className="flex-1 min-h-[48px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hc-button"
        >
          <Eraser className="w-4 h-4" />
          <span>Erase</span>
        </button>
        <button
          type="button"
          onClick={giveHint}
          className="flex-1 min-h-[48px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hc-button"
        >
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>{t.common.hint}</span>
        </button>
      </div>

      <div className="w-full grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => inputDigit(n)}
            aria-label={`Enter digit ${n}`}
            className="min-h-[48px] rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-sky-600 hover:text-white font-mono text-base font-bold transition-colors hc-button"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SudokuGame;
