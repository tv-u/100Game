import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const COLS = 90;
const ROWS = 100;

const EMPTY = 0;
const SAND = 1;
const WATER = 2;
const STONE = 3;
const WOOD = 4;
const FIRE = 5;
const ACID = 6;

const PALETTE: Record<number, { name: string; color: string }> = {
  [SAND]: { name: 'Sand', color: '#F59E0B' },
  [WATER]: { name: 'Water', color: '#38BDF8' },
  [STONE]: { name: 'Stone', color: '#64748B' },
  [WOOD]: { name: 'Wood', color: '#92400E' },
  [FIRE]: { name: 'Fire', color: '#EF4444' },
  [ACID]: { name: 'Acid', color: '#22C55E' },
};

export const FallingSandGame: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
}> = ({ ctx, onScoreChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reportModality } = useControls();

  const [status, setStatus] = useState<'READY' | 'PLAYING'>('READY');
  const [brush, setBrush] = useState<number>(SAND);
  const [particles, setParticles] = useState(0);

  const gridRef = useRef(new Uint8Array(COLS * ROWS));
  const brushRef = useRef(SAND);
  const drawingRef = useRef(false);
  const statusRef = useRef<'READY' | 'PLAYING'>('READY');

  useEffect(() => {
    brushRef.current = brush;
  }, [brush]);

  const reset = useCallback(
    (startImmediately = false) => {
      gridRef.current.fill(EMPTY);
      // Pre-seed a clean stone shelf
      for (let x = 25; x < 65; x++) gridRef.current[62 * COLS + x] = STONE;
      setParticles(0);
      onScoreChange(0);
      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, reset]);

  const paintAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const gx = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    const gy = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    const g = gridRef.current;
    const mat = brushRef.current;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > 5) continue;
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
          g[ny * COLS + nx] = mat;
        }
      }
    }
  };

  useEffect(() => {
    let raf = 0;
    let tick = 0;

    const step = () => {
      const g = gridRef.current;
      tick++;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        let count = 0;
        for (let y = ROWS - 2; y >= 0; y--) {
          const leftToRight = (y + tick) % 2 === 0;
          for (let i = 0; i < COLS; i++) {
            const x = leftToRight ? i : COLS - 1 - i;
            const idx = y * COLS + x;
            const el = g[idx];
            if (el === EMPTY) continue;
            count++;

            if (el === SAND) {
              const below = (y + 1) * COLS + x;
              if (g[below] === EMPTY || g[below] === WATER) {
                g[idx] = g[below];
                g[below] = SAND;
              } else {
                const dir = Math.random() < 0.5 ? -1 : 1;
                const d1 = x + dir >= 0 && x + dir < COLS ? (y + 1) * COLS + x + dir : -1;
                if (d1 >= 0 && g[d1] === EMPTY) {
                  g[d1] = SAND;
                  g[idx] = EMPTY;
                }
              }
            } else if (el === WATER) {
              const below = (y + 1) * COLS + x;
              if (g[below] === EMPTY) {
                g[below] = WATER;
                g[idx] = EMPTY;
              } else {
                const dir = Math.random() < 0.5 ? -1 : 1;
                const side = x + dir >= 0 && x + dir < COLS ? y * COLS + x + dir : -1;
                if (side >= 0 && g[side] === EMPTY) {
                  g[side] = WATER;
                  g[idx] = EMPTY;
                }
              }
            } else if (el === FIRE) {
              if (Math.random() < 0.08) {
                g[idx] = EMPTY;
                continue;
              }
              const dirs = [-COLS, COLS, -1, 1];
              for (const d of dirs) {
                const n = idx + d;
                if (n >= 0 && n < g.length) {
                  if (g[n] === WOOD && Math.random() < 0.14) g[n] = FIRE;
                  if (g[n] === WATER) g[idx] = EMPTY;
                }
              }
            } else if (el === ACID) {
              const below = (y + 1) * COLS + x;
              if (g[below] === EMPTY) {
                g[below] = ACID;
                g[idx] = EMPTY;
              } else if (g[below] !== STONE && g[below] !== ACID && Math.random() < 0.18) {
                g[below] = EMPTY;
                g[idx] = EMPTY;
              } else {
                const dir = Math.random() < 0.5 ? -1 : 1;
                const side = x + dir >= 0 && x + dir < COLS ? y * COLS + x + dir : -1;
                if (side >= 0 && g[side] === EMPTY) {
                  g[side] = ACID;
                  g[idx] = EMPTY;
                }
              }
            }
          }
        }

        if (tick % 12 === 0) {
          setParticles(count);
          onScoreChange(count);
        }
      }

      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, COLS * 4, ROWS * 4);
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const el = g[y * COLS + x];
            if (el !== EMPTY) {
              c.fillStyle = PALETTE[el]?.color || '#FFF';
              c.fillRect(x * 4, y * 4, 4, 4);
            }
          }
        }
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ctx.isPaused, onScoreChange]);

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>Active Brush: {PALETTE[brush]?.name}</span>
        <span>Elements: {particles}</span>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 w-full">
        {Object.entries(PALETTE).map(([k, v]) => {
          const val = Number(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setBrush(val);
                sfx.click(ctx.soundEnabled);
              }}
              className={`min-h-[40px] px-3 rounded-lg text-xs font-bold border transition-colors ${
                brush === val ? 'border-cyan-400 bg-cyan-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: v.color }} />
              {v.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => reset(true)}
          className="min-h-[40px] px-3 rounded-lg text-xs font-bold border border-white/10 bg-white/5 text-slate-300"
        >
          Clear
        </button>
      </div>

      <div
        className="relative w-full aspect-[9/10] rounded-2xl overflow-hidden border border-amber-500/35 bg-[#070B19] game-surface-lock"
        onPointerDown={(e) => {
          if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          drawingRef.current = true;
          paintAt(e);
        }}
        onPointerMove={(e) => {
          if (drawingRef.current && statusRef.current === 'PLAYING' && !ctx.isPaused) paintAt(e);
        }}
        onPointerUp={() => (drawingRef.current = false)}
        onPointerLeave={() => (drawingRef.current = false)}
      >
        <canvas ref={canvasRef} width={COLS * 4} height={ROWS * 4} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title="Falling Sand Sandbox"
          subtitle="Select Sand, Water, Stone, Wood, Fire, or Acid and draw freely across the cellular lab."
          score={particles}
          gameSlug="falling-sand"
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default FallingSandGame;
