import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const N = 8;
const GEMS = [
  { id: 0, color: '#00E5FF', glyph: '◆' },
  { id: 1, color: '#EC4899', glyph: '●' },
  { id: 2, color: '#10B981', glyph: '▲' },
  { id: 3, color: '#F59E0B', glyph: '★' },
  { id: 4, color: '#9D4EDD', glyph: '⬢' },
  { id: 5, color: '#F43F5E', glyph: '♥' },
];

const findMatches = (grid: number[][]) => {
  const matched = new Set<string>();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 2; c++) {
      const v = grid[r][c];
      if (v >= 0 && v === grid[r][c + 1] && v === grid[r][c + 2]) {
        matched.add(`${r},${c}`);
        matched.add(`${r},${c + 1}`);
        matched.add(`${r},${c + 2}`);
      }
    }
  }
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N - 2; r++) {
      const v = grid[r][c];
      if (v >= 0 && v === grid[r + 1][c] && v === grid[r + 2][c]) {
        matched.add(`${r},${c}`);
        matched.add(`${r + 1},${c}`);
        matched.add(`${r + 2},${c}`);
      }
    }
  }
  return matched;
};

const createCleanGrid = (): number[][] => {
  const g = Array.from({ length: N }, () => Array.from({ length: N }, () => Math.floor(Math.random() * GEMS.length)));
  while (findMatches(g).size > 0) {
    for (const k of findMatches(g)) {
      const [r, c] = k.split(',').map(Number);
      g[r][c] = Math.floor(Math.random() * GEMS.length);
    }
  }
  return g;
};

const Match3Game: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'match-3',
}) => {
  const [grid, setGrid] = useState<number[][]>(() => createCleanGrid());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [movesLeft, setMovesLeft] = useState(25);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('PLAYING');

  const reset = useCallback(() => {
    setGrid(createCleanGrid());
    setSelected(null);
    setMovesLeft(25);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const resolveBoard = (initial: number[][]) => {
    const g = initial.map((r) => [...r]);
    let totalGained = 0;
    let chain = 1;

    while (true) {
      const matches = findMatches(g);
      if (matches.size === 0) break;
      totalGained += matches.size * 15 * chain;
      chain += 1;
      for (const k of matches) {
        const [r, c] = k.split(',').map(Number);
        g[r][c] = -1;
      }
      // Gravity drop
      for (let c = 0; c < N; c++) {
        const colVals: number[] = [];
        for (let r = N - 1; r >= 0; r--) {
          if (g[r][c] !== -1) colVals.push(g[r][c]);
        }
        for (let r = N - 1, idx = 0; r >= 0; r--, idx++) {
          g[r][c] = idx < colVals.length ? colVals[idx] : Math.floor(Math.random() * GEMS.length);
        }
      }
    }
    return { g, totalGained };
  };

  const handleTap = (r: number, c: number) => {
    if (ctx.isPaused || status !== 'PLAYING') return;
    if (!selected) {
      setSelected([r, c]);
      sfx.click(ctx.soundEnabled);
      return;
    }
    const [sr, sc] = selected;
    if (sr === r && sc === c) {
      setSelected(null);
      return;
    }
    if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) {
      setSelected([r, c]);
      return;
    }

    const swapped = grid.map((row) => [...row]);
    const tmp = swapped[sr][sc];
    swapped[sr][sc] = swapped[r][c];
    swapped[r][c] = tmp;

    if (findMatches(swapped).size === 0) {
      sfx.bounce(ctx.soundEnabled);
      setSelected(null);
      return;
    }

    const { g, totalGained } = resolveBoard(swapped);
    const nextScore = score + totalGained;
    const nextMoves = movesLeft - 1;
    setGrid(g);
    setSelected(null);
    setScore(nextScore);
    setMovesLeft(nextMoves);
    onScoreChange(nextScore);
    sfx.clear(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, 14);

    if (nextMoves <= 0) {
      setStatus('GAME_OVER');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(nextScore, true);
    }
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-3">
      <div className="w-full flex justify-between text-xs font-mono text-slate-300 px-1">
        <span>Moves Left: {movesLeft}</span>
        <span>Score: {score}</span>
      </div>
      <div className="relative w-full aspect-square p-2.5 rounded-2xl bg-[#0D132B] border border-pink-500/40">
        <div className="grid grid-cols-8 gap-1.5 w-full h-full">
          {grid.map((row, r) =>
            row.map((gemIdx, c) => {
              const gem = GEMS[gemIdx] || GEMS[0];
              const isSel = selected?.[0] === r && selected?.[1] === c;
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleTap(r, c)}
                  style={{
                    color: gem.color,
                    backgroundColor: isSel ? `${gem.color}33` : '#161F42',
                    borderColor: isSel ? '#FFFFFF' : `${gem.color}44`,
                  }}
                  className="rounded-lg border text-lg sm:text-xl font-bold flex items-center justify-center transition-transform active:scale-95"
                >
                  {gem.glyph}
                </button>
              );
            })
          )}
        </div>
        <GameOverlay
          status={status}
          ctx={ctx}
          title="Gem Cascade Match-3"
          subtitle="Swap adjacent gems to match 3 or more and trigger chain cascades."
          score={score}
          gameSlug={gameSlug}
          onStart={reset}
          onRestart={reset}
        />
      </div>
    </div>
  );
};

export default Match3Game;
