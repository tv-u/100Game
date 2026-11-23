import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

type Shape = number[][];
const SHAPES: Array<{ shape: Shape; color: string }> = [
  { shape: [[1, 1], [1, 1]], color: '#9D4EDD' },
  { shape: [[1, 1, 1]], color: '#00E5FF' },
  { shape: [[1], [1], [1]], color: '#00E5FF' },
  { shape: [[1, 1, 1, 1]], color: '#3B82F6' },
  { shape: [[1, 0], [1, 0], [1, 1]], color: '#F59E0B' },
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#EC4899' },
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#10B981' },
  { shape: [[1, 1]], color: '#38BDF8' },
  { shape: [[1]], color: '#F43F5E' },
];

const pickTray = () =>
  Array.from({ length: 3 }, () => {
    const item = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return { ...item, used: false };
  });

const canPlaceAt = (board: (string | null)[][], shape: Shape, r0: number, c0: number) => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (!shape[r][c]) continue;
      const nr = r0 + r;
      const nc = c0 + c;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8 || board[nr][nc] !== null) return false;
    }
  }
  return true;
};

const hasAnyFit = (board: (string | null)[][], tray: Array<{ shape: Shape; used: boolean }>) => {
  for (const item of tray) {
    if (item.used) continue;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (canPlaceAt(board, item.shape, r, c)) return true;
      }
    }
  }
  return false;
};

const BlockBlastGame: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'block-blast',
}) => {
  const [board, setBoard] = useState<(string | null)[][]>(() => Array.from({ length: 8 }, () => Array(8).fill(null)));
  const [tray, setTray] = useState(() => pickTray());
  const [selected, setSelected] = useState<number>(0);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('PLAYING');

  const reset = useCallback(() => {
    setBoard(Array.from({ length: 8 }, () => Array(8).fill(null)));
    setTray(pickTray());
    setSelected(0);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const placePiece = (r0: number, c0: number) => {
    if (ctx.isPaused || status !== 'PLAYING') return;
    const item = tray[selected];
    if (!item || item.used) return;
    if (!canPlaceAt(board, item.shape, r0, c0)) {
      sfx.bounce(ctx.soundEnabled);
      return;
    }

    const nextBoard = board.map((row) => [...row]);
    let blocksAdded = 0;
    for (let r = 0; r < item.shape.length; r++) {
      for (let c = 0; c < item.shape[0].length; c++) {
        if (item.shape[r][c]) {
          nextBoard[r0 + r][c0 + c] = item.color;
          blocksAdded += 1;
        }
      }
    }

    // Check full rows & columns
    const fullRows: number[] = [];
    const fullCols: number[] = [];
    for (let r = 0; r < 8; r++) {
      if (nextBoard[r].every((cell) => cell !== null)) fullRows.push(r);
    }
    for (let c = 0; c < 8; c++) {
      if (nextBoard.every((row) => row[c] !== null)) fullCols.push(c);
    }
    for (const r of fullRows) nextBoard[r].fill(null);
    for (const c of fullCols) nextBoard.forEach((row) => (row[c] = null));

    const linesCleared = fullRows.length + fullCols.length;
    const gained = blocksAdded * 5 + linesCleared * linesCleared * 50;
    const nextScore = score + gained;
    setScore(nextScore);
    onScoreChange(nextScore);
    setBoard(nextBoard);
    if (linesCleared > 0) {
      sfx.clear(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 18);
    } else {
      sfx.click(ctx.soundEnabled);
    }

    let nextTray = tray.map((tItem, idx) => (idx === selected ? { ...tItem, used: true } : tItem));
    if (nextTray.every((tItem) => tItem.used)) {
      nextTray = pickTray();
    }
    setTray(nextTray);
    const firstUnused = nextTray.findIndex((tItem) => !tItem.used);
    if (firstUnused >= 0) setSelected(firstUnused);

    if (!hasAnyFit(nextBoard, nextTray)) {
      setStatus('GAME_OVER');
      sfx.gameOver(ctx.soundEnabled);
      ctx.onScoreEnd(nextScore, false);
    }
  };

  const activeShape = tray[selected] && !tray[selected].used ? tray[selected] : null;
  const previewValid = hoverCell && activeShape ? canPlaceAt(board, activeShape.shape, hoverCell[0], hoverCell[1]) : false;

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4">
      <div className="relative w-full aspect-square max-w-[360px] p-2.5 rounded-2xl bg-[#0D132B] border border-purple-500/40">
        <div className="grid grid-cols-8 gap-1.5 w-full h-full">
          {board.map((row, r) =>
            row.map((cell, c) => {
              let isGhost = false;
              if (hoverCell && activeShape && previewValid) {
                const dr = r - hoverCell[0];
                const dc = c - hoverCell[1];
                if (dr >= 0 && dr < activeShape.shape.length && dc >= 0 && dc < activeShape.shape[0].length && activeShape.shape[dr][dc]) {
                  isGhost = true;
                }
              }
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onMouseEnter={() => setHoverCell([r, c])}
                  onMouseLeave={() => setHoverCell(null)}
                  onClick={() => placePiece(r, c)}
                  style={{
                    backgroundColor: cell ? cell : isGhost && activeShape ? `${activeShape.color}66` : '#172042',
                  }}
                  className="rounded-md border border-white/10 transition-colors"
                  aria-label={`Row ${r + 1} Column ${c + 1}`}
                />
              );
            })
          )}
        </div>

        <GameOverlay
          status={status}
          ctx={ctx}
          title="Block Blast Neon"
          subtitle="Select a polyomino block below and tap an open spot on the 8x8 grid."
          score={score}
          gameSlug={gameSlug}
          onStart={reset}
          onRestart={reset}
        />
      </div>

      {/* 3-Piece Tray */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[360px]">
        {tray.map((item, idx) => (
          <button
            key={idx}
            type="button"
            disabled={item.used}
            onClick={() => setSelected(idx)}
            className={`min-h-[82px] rounded-2xl border flex items-center justify-center p-2 transition-all ${
              item.used
                ? 'opacity-20 border-white/5 bg-white/[0.02]'
                : selected === idx
                ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_16px_rgba(0,229,255,0.3)]'
                : 'border-white/10 bg-[#111936] hover:border-white/30'
            }`}
          >
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${item.shape[0].length}, 14px)` }}
            >
              {item.shape.flatMap((row, r) =>
                row.map((v, c) => (
                  <div
                    key={`${r}-${c}`}
                    className="w-3.5 h-3.5 rounded-xs"
                    style={{ backgroundColor: v ? item.color : 'transparent' }}
                  />
                ))
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BlockBlastGame;
