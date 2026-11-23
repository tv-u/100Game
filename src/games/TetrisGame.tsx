import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, PauseCircle, RotateCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import { getTouchButtonPx } from '../controls/types';
import { usePointerGesture } from '../controls/usePointerGesture';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { sfx, triggerHaptic } from '../utils/sound';

const COLS = 10;
const ROWS = 20;

interface PieceDef {
  shape: number[][];
  color: string;
}

const PIECES: PieceDef[] = [
  { shape: [[1, 1, 1, 1]], color: '#06B6D4' },
  { shape: [[1, 1], [1, 1]], color: '#F59E0B' },
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#8B5CF6' },
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#10B981' },
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#F43F5E' },
  { shape: [[1, 0, 0], [1, 1, 1]], color: '#3B82F6' },
  { shape: [[0, 0, 1], [1, 1, 1]], color: '#F97316' },
];

function rotateMatrix(m: number[][]): number[][] {
  return m[0].map((_, c) => m.map((row) => row[c]).reverse());
}

function emptyGrid(): (string | null)[][] {
  return Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
}

const TetrisGame: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { settings, subscribeAction, reportModality } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  const gridRef = useRef<(string | null)[][]>(emptyGrid());
  const bagRef = useRef<PieceDef[]>([]);
  const activeRef = useRef<{ def: PieceDef; shape: number[][]; color: string; x: number; y: number } | null>(null);
  const nextPieceRef = useRef<PieceDef>(PIECES[0]);
  const holdPieceRef = useRef<PieceDef | null>(null);
  const holdUsedRef = useRef(false);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const lastDropRef = useRef(0);
  const gameOverRef = useRef(false);

  const popBag = useCallback((): PieceDef => {
    if (bagRef.current.length === 0) {
      const copy = [...PIECES];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      bagRef.current = copy;
    }
    return bagRef.current.pop()!;
  }, []);

  const collides = useCallback((shape: number[][], px: number, py: number, grid: (string | null)[][]): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = px + c;
        const ny = py + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && grid[ny][nx] !== null) return true;
      }
    }
    return false;
  }, []);

  const spawnPiece = useCallback(
    (explicitDef?: PieceDef) => {
      const piece = explicitDef || nextPieceRef.current;
      if (!explicitDef) {
        nextPieceRef.current = popBag();
        holdUsedRef.current = false;
      }
      const x = Math.floor((COLS - piece.shape[0].length) / 2);
      const y = 0;
      if (collides(piece.shape, x, y, gridRef.current)) {
        gameOverRef.current = true;
        setGameOver(true);
        sfx.gameOver(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, [30, 40, 60]);
        ctx.onScoreEnd(scoreRef.current, false);
        activeRef.current = null;
        return;
      }
      activeRef.current = { def: piece, shape: piece.shape, color: piece.color, x, y };
    },
    [collides, ctx, popBag]
  );

  const resetGame = useCallback(() => {
    gridRef.current = emptyGrid();
    bagRef.current = [];
    holdPieceRef.current = null;
    holdUsedRef.current = false;
    nextPieceRef.current = popBag();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    gameOverRef.current = false;
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    onScoreChange(0);
    spawnPiece();
  }, [onScoreChange, popBag, spawnPiece]);

  useEffect(() => {
    resetGame();
  }, [ctx.restartKey, resetGame]);

  const lockPiece = useCallback(() => {
    const curr = activeRef.current;
    if (!curr) return;
    const g = gridRef.current;
    for (let r = 0; r < curr.shape.length; r++) {
      for (let c = 0; c < curr.shape[r].length; c++) {
        if (curr.shape[r][c] && curr.y + r >= 0) {
          g[curr.y + r][curr.x + c] = curr.color;
        }
      }
    }

    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r].every((cell) => cell !== null)) {
        g.splice(r, 1);
        g.unshift(Array<string | null>(COLS).fill(null));
        cleared++;
        r++;
      }
    }

    if (cleared > 0) {
      const pts = [0, 100, 300, 500, 800][cleared] || 800;
      scoreRef.current += pts * levelRef.current;
      linesRef.current += cleared;
      levelRef.current = Math.floor(linesRef.current / 10) + 1;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(levelRef.current);
      onScoreChange(scoreRef.current);
      sfx.clear(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 20);
    } else {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      onScoreChange(scoreRef.current);
      sfx.click(ctx.soundEnabled);
    }
    spawnPiece();
  }, [ctx.hapticsEnabled, ctx.soundEnabled, onScoreChange, spawnPiece]);

  const moveHorizontal = useCallback(
    (dx: number) => {
      const curr = activeRef.current;
      if (!curr || ctx.isPaused || gameOverRef.current) return;
      if (!collides(curr.shape, curr.x + dx, curr.y, gridRef.current)) {
        curr.x += dx;
      }
    },
    [collides, ctx.isPaused]
  );

  const rotateActive = useCallback(() => {
    const curr = activeRef.current;
    if (!curr || ctx.isPaused || gameOverRef.current) return;
    const rotated = rotateMatrix(curr.shape);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(rotated, curr.x + kick, curr.y, gridRef.current)) {
        curr.shape = rotated;
        curr.x += kick;
        sfx.click(ctx.soundEnabled);
        return;
      }
    }
  }, [collides, ctx.isPaused, ctx.soundEnabled]);

  const softDrop = useCallback(() => {
    const curr = activeRef.current;
    if (!curr || ctx.isPaused || gameOverRef.current) return;
    if (!collides(curr.shape, curr.x, curr.y + 1, gridRef.current)) {
      curr.y += 1;
    } else {
      lockPiece();
    }
  }, [collides, ctx.isPaused, lockPiece]);

  const hardDrop = useCallback(() => {
    const curr = activeRef.current;
    if (!curr || ctx.isPaused || gameOverRef.current) return;
    while (!collides(curr.shape, curr.x, curr.y + 1, gridRef.current)) {
      curr.y += 1;
    }
    triggerHaptic(ctx.hapticsEnabled, 16);
    lockPiece();
  }, [collides, ctx.hapticsEnabled, ctx.isPaused, lockPiece]);

  const holdActivePiece = useCallback(() => {
    const curr = activeRef.current;
    if (!curr || ctx.isPaused || gameOverRef.current || holdUsedRef.current) return;
    holdUsedRef.current = true;
    const saved = holdPieceRef.current;
    holdPieceRef.current = curr.def;
    sfx.bounce(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, 10);
    if (saved) {
      spawnPiece(saved);
    } else {
      spawnPiece();
    }
  }, [ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled, spawnPiece]);

  // Normalized Keyboard & Gamepad actions
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'left') moveHorizontal(-1);
      else if (action === 'right') moveHorizontal(1);
      else if (action === 'up' || action === 'secondary') rotateActive();
      else if (action === 'down') softDrop();
      else if (action === 'primary') hardDrop();
      else if (action === 'hold') holdActivePiece();
    });
  }, [hardDrop, holdActivePiece, moveHorizontal, rotateActive, softDrop, subscribeAction]);

  const boardGesture = usePointerGesture({
    onTap: () => rotateActive(),
    onSwipe: (dir) => {
      if (dir === 'left') moveHorizontal(-1);
      else if (dir === 'right') moveHorizontal(1);
      else if (dir === 'down') hardDrop();
      else if (dir === 'up') holdActivePiece();
    },
  });

  useEffect(() => {
    let rafId = 0;

    const drawMiniPiece = (canvas: HTMLCanvasElement | null, piece: PieceDef | null) => {
      if (!canvas) return;
      const nc = canvas.getContext('2d');
      if (!nc) return;
      nc.clearRect(0, 0, canvas.width, canvas.height);
      if (!piece) return;
      const bSize = 15;
      const ox = (canvas.width - piece.shape[0].length * bSize) / 2;
      const oy = (canvas.height - piece.shape.length * bSize) / 2;
      nc.fillStyle = piece.color;
      piece.shape.forEach((row, r) =>
        row.forEach((v, col) => {
          if (v) {
            nc.beginPath();
            nc.roundRect(ox + col * bSize + 1, oy + r * bSize + 1, bSize - 2, bSize - 2, 3);
            nc.fill();
          }
        })
      );
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const c = canvas.getContext('2d');
      if (!c) return;
      const cell = canvas.width / COLS;

      c.fillStyle = settings.highContrast ? '#000000' : '#090D18';
      c.fillRect(0, 0, canvas.width, canvas.height);

      c.strokeStyle = settings.highContrast ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.04)';
      c.lineWidth = 1;
      for (let x = 1; x < COLS; x++) {
        c.beginPath();
        c.moveTo(x * cell, 0);
        c.lineTo(x * cell, canvas.height);
        c.stroke();
      }
      for (let y = 1; y < ROWS; y++) {
        c.beginPath();
        c.moveTo(0, y * cell);
        c.lineTo(canvas.width, y * cell);
        c.stroke();
      }

      gridRef.current.forEach((row, r) => {
        row.forEach((color, col) => {
          if (!color) return;
          c.fillStyle = color;
          c.beginPath();
          c.roundRect(col * cell + 1.5, r * cell + 1.5, cell - 3, cell - 3, 4);
          c.fill();
        });
      });

      const curr = activeRef.current;
      if (curr) {
        let ghostY = curr.y;
        while (!collides(curr.shape, curr.x, ghostY + 1, gridRef.current)) ghostY++;
        curr.shape.forEach((row, r) => {
          row.forEach((v, col) => {
            if (!v) return;
            c.strokeStyle = curr.color;
            c.globalAlpha = 0.35;
            c.strokeRect((curr.x + col) * cell + 2, (ghostY + r) * cell + 2, cell - 4, cell - 4);
            c.globalAlpha = 1;
            c.fillStyle = curr.color;
            c.beginPath();
            c.roundRect((curr.x + col) * cell + 1.5, (curr.y + r) * cell + 1.5, cell - 3, cell - 3, 4);
            c.fill();
          });
        });
      }

      drawMiniPiece(nextCanvasRef.current, nextPieceRef.current);
      drawMiniPiece(holdCanvasRef.current, holdPieceRef.current);
    };

    const loop = (now: number) => {
      const interval = Math.max(110, 680 - (levelRef.current - 1) * 60);
      if (!ctx.isPaused && !gameOverRef.current) {
        if (now - lastDropRef.current >= interval) {
          lastDropRef.current = now;
          softDrop();
        }
      }
      draw();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [collides, ctx.isPaused, settings.highContrast, softDrop]);

  const btnPx = getTouchButtonPx(settings.buttonSize);
  const padStyle: React.CSSProperties = { minHeight: btnPx, opacity: settings.buttonOpacity };

  const moveCluster = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Move Left"
        style={{ ...padStyle, minWidth: btnPx }}
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality('touch');
          moveHorizontal(-1);
        }}
        className="rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center active:scale-95 touch-none hc-button"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="Soft Drop"
        style={{ ...padStyle, minWidth: btnPx }}
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality('touch');
          softDrop();
        }}
        className="rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center active:scale-95 touch-none hc-button"
      >
        <ArrowDown className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="Move Right"
        style={{ ...padStyle, minWidth: btnPx }}
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality('touch');
          moveHorizontal(1);
        }}
        className="rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center active:scale-95 touch-none hc-button"
      >
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const actionCluster = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Hold Piece"
        style={{ ...padStyle, minWidth: btnPx }}
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality('touch');
          holdActivePiece();
        }}
        className="rounded-xl bg-amber-500 text-slate-950 font-bold text-xs px-2 flex items-center justify-center active:scale-95 touch-none hc-button"
      >
        <PauseCircle className="w-4 h-4 mr-1" />
        Hold
      </button>
      <button
        type="button"
        aria-label="Rotate Piece"
        style={{ ...padStyle, minWidth: btnPx }}
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality('touch');
          rotateActive();
        }}
        className="rounded-xl bg-violet-600 text-white flex items-center justify-center active:scale-95 touch-none hc-button"
      >
        <RotateCw className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="Hard Drop"
        style={{ ...padStyle, minWidth: btnPx }}
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality('touch');
          hardDrop();
        }}
        className="rounded-xl bg-blue-600 text-white flex items-center justify-center active:scale-95 touch-none hc-button"
      >
        <ChevronsDown className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-4">
      <div className="w-full flex flex-col sm:flex-row items-center sm:items-start justify-center gap-4">
        <div
          {...boardGesture}
          className="relative w-full max-w-[260px] sm:max-w-[280px] aspect-[1/2] rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 bg-[#090D18] game-surface-lock hc-surface"
        >
          <canvas ref={canvasRef} width={280} height={560} className="w-full h-full block" />

          {ctx.isPaused && !gameOver && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs p-4 text-center"
            >
              <h2 className="font-display text-xl font-bold text-white">{t.common.pausedTitle}</h2>
              <button
                type="button"
                onClick={() => ctx.setIsPaused(false)}
                className="mt-4 min-h-[48px] px-6 rounded-xl bg-violet-600 text-white font-semibold text-sm hc-button"
              >
                {t.common.resume}
              </button>
            </div>
          )}

          {gameOver && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-4 text-center"
            >
              <h2 className="font-display text-xl font-bold text-white">{t.common.gameOver}</h2>
              <p className="mt-1 font-mono text-base text-blue-400 tabular-nums">
                {t.common.score}: {score}
              </p>
              <LeaderboardSubmitWidget gameSlug="tetris" score={score} />
              <button
                type="button"
                onClick={resetGame}
                className="mt-4 min-h-[48px] px-6 rounded-xl bg-blue-600 text-white font-semibold text-sm hc-button"
              >
                {t.common.playAgain}
              </button>
            </div>
          )}
        </div>

        {/* Side HUD with Next & Hold piece */}
        <div className="grid grid-cols-4 sm:grid-cols-1 gap-2.5 w-full sm:w-32">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2.5 flex flex-col items-center">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hold</span>
            <canvas ref={holdCanvasRef} width={76} height={54} className="mt-1" />
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2.5 flex flex-col items-center">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Next</span>
            <canvas ref={nextCanvasRef} width={76} height={54} className="mt-1" />
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2.5 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t.common.level}</span>
            <span className="font-mono text-lg font-bold tabular-nums">{level}</span>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2.5 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t.common.lines}</span>
            <span className="font-mono text-lg font-bold tabular-nums">{lines}</span>
          </div>
        </div>
      </div>

      {/* Multi-touch Handedness-Aware Arcade Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1">
        {settings.handedness === 'left' ? (
          <>
            {actionCluster}
            {moveCluster}
          </>
        ) : (
          <>
            {moveCluster}
            {actionCluster}
          </>
        )}
      </div>
    </div>
  );
};

export default TetrisGame;
