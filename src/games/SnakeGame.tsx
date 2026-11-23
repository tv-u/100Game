import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import { usePointerGesture } from '../controls/usePointerGesture';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { VirtualDPad } from '../components/controls/VirtualDPad';
import { VirtualJoystick } from '../components/controls/VirtualJoystick';
import { sfx, triggerHaptic } from '../utils/sound';

interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 20;

export interface GameModuleProps {
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
}

const SnakeGame: React.FC<GameModuleProps> = ({ ctx, onScoreChange }) => {
  const { t } = useApp();
  const { settings, subscribeAction, activeModality } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);

  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const scoreRef = useRef(0);
  const lastStepRef = useRef(0);
  const endedRef = useRef(false);

  const spawnFood = useCallback((snake: Point[]): Point => {
    const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
    const free: Point[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) return { x: 0, y: 0 };
    return free[Math.floor(Math.random() * free.length)];
  }, []);

  const resetBoard = useCallback(() => {
    const startSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    snakeRef.current = startSnake;
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = spawnFood(startSnake);
    scoreRef.current = 0;
    endedRef.current = false;
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange, spawnFood]);

  useEffect(() => {
    if (ctx.restartKey > 0) resetBoard();
  }, [ctx.restartKey, resetBoard]);

  const setDirection = useCallback(
    (dx: number, dy: number) => {
      const curr = dirRef.current;
      if (curr.x === -dx && curr.y === -dy) return;
      nextDirRef.current = { x: dx, y: dy };
      if (status === 'READY') {
        setStatus('PLAYING');
      }
    },
    [status]
  );

  // Normalized Keyboard & Gamepad actions
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'up') setDirection(0, -1);
      else if (action === 'down') setDirection(0, 1);
      else if (action === 'left') setDirection(-1, 0);
      else if (action === 'right') setDirection(1, 0);
      else if (action === 'primary' && status === 'READY') resetBoard();
      else if (action === 'primary' && status === 'GAME_OVER') resetBoard();
    });
  }, [resetBoard, setDirection, status, subscribeAction]);

  const pointerHandlers = usePointerGesture({
    onSwipe: (dir) => {
      if (dir === 'up') setDirection(0, -1);
      else if (dir === 'down') setDirection(0, 1);
      else if (dir === 'left') setDirection(-1, 0);
      else if (dir === 'right') setDirection(1, 0);
    },
    onTap: () => {
      if (status === 'READY') resetBoard();
    },
  });

  // Game loop via requestAnimationFrame
  useEffect(() => {
    let rafId = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const c = canvas.getContext('2d');
      if (!c) return;
      const size = canvas.width;
      const cell = size / GRID_SIZE;

      c.fillStyle = settings.highContrast ? '#000000' : '#090D18';
      c.fillRect(0, 0, size, size);

      c.strokeStyle = settings.highContrast ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.04)';
      c.lineWidth = 1;
      for (let i = 1; i < GRID_SIZE; i++) {
        c.beginPath();
        c.moveTo(i * cell, 0);
        c.lineTo(i * cell, size);
        c.stroke();
        c.beginPath();
        c.moveTo(0, i * cell);
        c.lineTo(size, i * cell);
        c.stroke();
      }

      const f = foodRef.current;
      const fx = f.x * cell + cell / 2;
      const fy = f.y * cell + cell / 2;
      c.fillStyle = 'rgba(244, 63, 94, 0.28)';
      c.beginPath();
      c.arc(fx, fy, cell * 0.52, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = settings.highContrast ? '#FF3B5C' : '#F43F5E';
      c.beginPath();
      c.arc(fx, fy, cell * 0.34, 0, Math.PI * 2);
      c.fill();

      snakeRef.current.forEach((seg, idx) => {
        const pad = idx === 0 ? 1.5 : 2.5;
        c.fillStyle = settings.highContrast
          ? idx === 0
            ? '#FFFFFF'
            : '#22C55E'
          : idx === 0
          ? '#34D399'
          : idx % 2 === 0
          ? '#10B981'
          : '#059669';
        c.beginPath();
        c.roundRect(seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2, 5);
        c.fill();
      });
    };

    const tick = (now: number) => {
      const speedMs = Math.max(68, 138 - Math.floor(scoreRef.current / 30) * 6);
      if (status === 'PLAYING' && !ctx.isPaused) {
        if (now - lastStepRef.current >= speedMs) {
          lastStepRef.current = now;
          dirRef.current = nextDirRef.current;
          const head = snakeRef.current[0];
          const nextHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

          const hitWall =
            nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE;
          const willGrow = nextHead.x === foodRef.current.x && nextHead.y === foodRef.current.y;
          const bodyToCheck = willGrow ? snakeRef.current : snakeRef.current.slice(0, -1);
          const hitSelf = bodyToCheck.some((s) => s.x === nextHead.x && s.y === nextHead.y);

          if (hitWall || hitSelf) {
            setStatus('GAME_OVER');
            sfx.gameOver(ctx.soundEnabled);
            triggerHaptic(ctx.hapticsEnabled, [30, 40, 50]);
            if (!endedRef.current) {
              endedRef.current = true;
              ctx.onScoreEnd(scoreRef.current, false);
            }
          } else {
            const nextSnake = [nextHead, ...snakeRef.current];
            if (!willGrow) {
              nextSnake.pop();
            } else {
              scoreRef.current += 10;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              foodRef.current = spawnFood(nextSnake);
              sfx.eat(ctx.soundEnabled);
              triggerHaptic(ctx.hapticsEnabled, 12);
            }
            snakeRef.current = nextSnake;
          }
        }
      }
      draw();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ctx, onScoreChange, settings.highContrast, spawnFood, status]);

  const handlePadDir = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (dir === 'up') setDirection(0, -1);
    else if (dir === 'down') setDirection(0, 1);
    else if (dir === 'left') setDirection(-1, 0);
    else setDirection(1, 0);
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4">
      <div
        {...pointerHandlers}
        className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 bg-[#090D18] game-surface-lock shadow-inner hc-surface"
      >
        <canvas ref={canvasRef} width={440} height={440} className="w-full h-full block" />

        {status === 'READY' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-white">Snake Arcade</h2>
            <p className="mt-2 text-xs text-slate-300 max-w-xs">
              Swipe, use D-Pad / Joystick, Arrow keys / WASD, or a Gamepad to steer.
            </p>
            <button
              type="button"
              onClick={resetBoard}
              className="mt-5 min-h-[48px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors hc-button"
            >
              {t.common.startGame}
            </button>
          </div>
        )}

        {ctx.isPaused && status === 'PLAYING' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-white">{t.common.pausedTitle}</h2>
            <button
              type="button"
              onClick={() => ctx.setIsPaused(false)}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm hc-button"
            >
              {t.common.resume}
            </button>
          </div>
        )}

        {status === 'GAME_OVER' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-white">{t.common.gameOver}</h2>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-400 tabular-nums">
              {t.common.score}: {score}
            </p>
            <LeaderboardSubmitWidget gameSlug="snake" score={score} />
            <button
              type="button"
              onClick={resetBoard}
              className="mt-5 min-h-[48px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm hc-button"
            >
              {t.common.playAgain}
            </button>
          </div>
        )}
      </div>

      {/* Touch D-Pad or Analog Joystick aligned to Left/Right handedness */}
      <div
        className={`w-full flex items-center ${
          activeModality === 'touch' ? 'flex' : 'sm:hidden flex'
        } ${settings.handedness === 'left' ? 'justify-start' : 'justify-end'} px-2`}
      >
        {settings.mobileControlStyle === 'joystick' ? (
          <VirtualJoystick onDirection={handlePadDir} />
        ) : (
          <VirtualDPad onDirection={handlePadDir} />
        )}
      </div>
    </div>
  );
};

export default SnakeGame;
