import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import type { GameControlContext } from '../components/GameShell';
import { sfx, triggerHaptic } from '../utils/sound';

type Cell = 'X' | 'O' | null;
type Difficulty = 'easy' | 'medium' | 'hard';
type Mode = 'ai' | 'pvp';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Cell[]): { winner: 'X' | 'O' | 'draw' | null; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((c) => c !== null)) return { winner: 'draw', line: null };
  return { winner: null, line: null };
}

function minimax(board: Cell[], depth: number, isMax: boolean): number {
  const { winner } = checkWinner(board);
  if (winner === 'O') return 10 - depth;
  if (winner === 'X') return depth - 10;
  if (winner === 'draw') return 0;

  let best = isMax ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = isMax ? 'O' : 'X';
    const score = minimax(board, depth + 1, !isMax);
    board[i] = null;
    best = isMax ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function chooseAIMove(board: Cell[], difficulty: Difficulty): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
  if (empty.length === 0) return -1;
  if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];

  if (difficulty === 'medium') {
    for (const mark of ['O', 'X'] as const) {
      for (const idx of empty) {
        const copy = [...board];
        copy[idx] = mark;
        if (checkWinner(copy).winner === mark) return idx;
      }
    }
    return empty[Math.floor(Math.random() * empty.length)];
  }

  let bestScore = -Infinity;
  let bestMove = empty[0];
  for (const idx of empty) {
    const copy = [...board];
    copy[idx] = 'O';
    const score = minimax(copy, 0, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = idx;
    }
  }
  return bestMove;
}

const TicTacToeGame: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { subscribeAction, activeModality } = useControls();
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [mode, setMode] = useState<Mode>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [tally, setTally] = useState({ X: 0, O: 0, draw: 0 });
  const [aiThinking, setAiThinking] = useState(false);
  const [cursor, setCursor] = useState(4);

  const { winner, line } = checkWinner(board);

  const resetRound = useCallback(() => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setAiThinking(false);
    setCursor(4);
  }, []);

  useEffect(() => {
    if (ctx.restartKey > 0) resetRound();
  }, [ctx.restartKey, resetRound]);

  const finishRound = useCallback(
    (result: 'X' | 'O' | 'draw') => {
      setTally((prev) => {
        const next = { ...prev, [result]: prev[result] + 1 };
        const pts = next.X * 10;
        onScoreChange(pts);
        ctx.onScoreEnd(pts, result === 'X');
        return next;
      });
      if (result === 'X') sfx.win(ctx.soundEnabled);
      else if (result === 'O') sfx.gameOver(ctx.soundEnabled);
      else sfx.click(ctx.soundEnabled);
    },
    [ctx, onScoreChange]
  );

  const handleCellClick = useCallback(
    (idx: number) => {
      if (ctx.isPaused || winner || board[idx] !== null || aiThinking) return;
      setCursor(idx);
      const next = [...board];
      next[idx] = turn;
      setBoard(next);
      sfx.click(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 10);

      const res = checkWinner(next);
      if (res.winner) {
        finishRound(res.winner);
        return;
      }

      if (mode === 'pvp') {
        setTurn(turn === 'X' ? 'O' : 'X');
      } else {
        setTurn('O');
        setAiThinking(true);
      }
    },
    [aiThinking, board, ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled, finishRound, mode, turn, winner]
  );

  // Full keyboard & gamepad grid cursor navigation + 1-9 shortcuts
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'up') setCursor((c) => (c >= 3 ? c - 3 : c + 6));
      else if (action === 'down') setCursor((c) => (c <= 5 ? c + 3 : c - 6));
      else if (action === 'left') setCursor((c) => (c % 3 === 0 ? c + 2 : c - 1));
      else if (action === 'right') setCursor((c) => (c % 3 === 2 ? c - 2 : c + 1));
      else if (action === 'primary' || action === 'secondary') {
        if (winner) resetRound();
        else handleCellClick(cursor);
      }
    });
  }, [cursor, handleCellClick, resetRound, subscribeAction, winner]);

  useEffect(() => {
    const onDigit = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        handleCellClick(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onDigit);
    return () => window.removeEventListener('keydown', onDigit);
  }, [handleCellClick]);

  // Trigger AI turn
  useEffect(() => {
    if (mode !== 'ai' || turn !== 'O' || winner || ctx.isPaused) return;
    const timer = setTimeout(() => {
      const move = chooseAIMove(board, difficulty);
      if (move >= 0) {
        const next = [...board];
        next[move] = 'O';
        setBoard(next);
        sfx.bounce(ctx.soundEnabled);
        const res = checkWinner(next);
        if (res.winner) finishRound(res.winner);
        else setTurn('X');
      }
      setAiThinking(false);
    }, 320);
    return () => clearTimeout(timer);
  }, [board, ctx.isPaused, ctx.soundEnabled, difficulty, finishRound, mode, turn, winner]);

  const showCursorHighlight = activeModality === 'keyboard' || activeModality === 'gamepad';

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-5">
      <div className="w-full flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200 dark:bg-white/5">
          <button
            type="button"
            onClick={() => {
              setMode('ai');
              resetRound();
            }}
            className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors ${
              mode === 'ai' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.common.vsAI}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('pvp');
              resetRound();
            }}
            className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors ${
              mode === 'pvp' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.common.twoPlayers}
          </button>
        </div>

        {mode === 'ai' && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200 dark:bg-white/5">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDifficulty(d);
                  resetRound();
                }}
                className={`px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors ${
                  difficulty === d ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {t.common[d]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 w-full text-center">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-2.5">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Player X</div>
          <div className="font-mono text-lg font-bold text-violet-500 tabular-nums">{tally.X}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-2.5">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.common.draw}</div>
          <div className="font-mono text-lg font-bold text-slate-700 dark:text-slate-200 tabular-nums">{tally.draw}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 p-2.5">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{mode === 'ai' ? 'AI (O)' : 'Player O'}</div>
          <div className="font-mono text-lg font-bold text-sky-500 tabular-nums">{tally.O}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] aspect-square">
        {board.map((cell, idx) => {
          const isWinCell = line?.includes(idx);
          const isFocused = showCursorHighlight && cursor === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCellClick(idx)}
              disabled={Boolean(cell || winner || aiThinking)}
              aria-label={`Cell ${idx + 1}${cell ? ` ${cell}` : ''}`}
              className={`rounded-2xl border text-4xl font-display font-extrabold flex items-center justify-center transition-all min-h-[84px] hc-button ${
                isWinCell
                  ? 'bg-violet-600/20 border-violet-500'
                  : isFocused
                  ? 'bg-violet-500/15 border-violet-500 ring-2 ring-violet-400'
                  : 'bg-slate-100 dark:bg-[#171C2E] border-slate-200 dark:border-white/10 hover:border-violet-500/60'
              } ${cell === 'X' ? 'text-violet-500' : 'text-sky-400'}`}
            >
              {cell}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 min-h-[60px]">
        {winner ? (
          <>
            <div className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {winner === 'draw' ? t.common.draw : `${winner} ${t.common.youWin}`}
            </div>
            <button
              type="button"
              onClick={resetRound}
              className="min-h-[48px] px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold hc-button"
            >
              {t.common.playAgain}
            </button>
          </>
        ) : (
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {aiThinking ? 'AI thinking...' : `Turn: ${turn}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicTacToeGame;
