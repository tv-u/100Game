import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import { getTouchButtonPx } from '../controls/types';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { sfx, triggerHaptic } from '../utils/sound';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  color: string;
}

const W = 440;
const H = 520;
const PADDLE_W = 84;
const PADDLE_H = 12;
const BALL_R = 7;

function buildLevel(level: number): Brick[] {
  const rows = Math.min(7, 4 + level);
  const cols = 8;
  const pad = 8;
  const bw = (W - pad * (cols + 1)) / cols;
  const bh = 18;
  const colors = ['#F43F5E', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6'];
  const bricks: Brick[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        x: pad + c * (bw + pad),
        y: 44 + r * (bh + 6),
        w: bw,
        h: bh,
        hp: level > 1 && r === 0 ? 2 : 1,
        color: colors[r % colors.length],
      });
    }
  }
  return bricks;
}

const BreakoutGame: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { settings, subscribeAction, gamepadAnalog, reportModality } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');

  const paddleXRef = useRef((W - PADDLE_W) / 2);
  const ballRef = useRef({ x: W / 2, y: H - 56, vx: 190, vy: -240 });
  const bricksRef = useRef<Brick[]>(buildLevel(1));
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const statusRef = useRef<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const virtualHoldRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const analogRef = useRef(gamepadAnalog);
  analogRef.current = gamepadAnalog;
  const highContrastRef = useRef(settings.highContrast);
  highContrastRef.current = settings.highContrast;
  const keyBindingsRef = useRef(settings.keyBindings);
  keyBindingsRef.current = settings.keyBindings;
  const activePointerIdRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  const resetBallOnPaddle = useCallback(() => {
    ballRef.current = {
      x: paddleXRef.current + PADDLE_W / 2,
      y: H - 46,
      vx: (Math.random() > 0.5 ? 1 : -1) * (185 + levelRef.current * 20),
      vy: -(240 + levelRef.current * 20),
    };
  }, []);

  const resetAll = useCallback(() => {
    paddleXRef.current = (W - PADDLE_W) / 2;
    levelRef.current = 1;
    livesRef.current = 3;
    scoreRef.current = 0;
    endedRef.current = false;
    bricksRef.current = buildLevel(1);
    setLevel(1);
    setLives(3);
    setScore(0);
    onScoreChange(0);
    resetBallOnPaddle();
    statusRef.current = 'PLAYING';
    setStatus('PLAYING');
  }, [onScoreChange, resetBallOnPaddle]);

  useEffect(() => {
    if (ctx.restartKey > 0) resetAll();
  }, [ctx.restartKey, resetAll]);

  // Subscribe to primary start/launch + discrete gamepad/keyboard nudges
  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'primary' && statusRef.current !== 'PLAYING') {
        resetAll();
      } else if (action === 'left' && !keysRef.current.left) {
        paddleXRef.current = Math.max(0, paddleXRef.current - 20);
      } else if (action === 'right' && !keysRef.current.right) {
        paddleXRef.current = Math.min(W - PADDLE_W, paddleXRef.current + 20);
      }
    });
  }, [resetAll, subscribeAction]);

  // Smooth continuous keyboard key hold respecting remapped Left / Right keys
  useEffect(() => {
    const isBound = (codes: string[], e: KeyboardEvent) => codes.includes(e.code) || codes.includes(e.key);
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (isBound(keyBindingsRef.current.left, e) || e.key === 'ArrowLeft') {
        keysRef.current.left = true;
      }
      if (isBound(keyBindingsRef.current.right, e) || e.key === 'ArrowRight') {
        keysRef.current.right = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isBound(keyBindingsRef.current.left, e) || e.key === 'ArrowLeft') {
        keysRef.current.left = false;
      }
      if (isBound(keyBindingsRef.current.right, e) || e.key === 'ArrowRight') {
        keysRef.current.right = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const movePaddleToClientX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    paddleXRef.current = Math.max(0, Math.min(W - PADDLE_W, relX - PADDLE_W / 2));
  };

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const c = canvas.getContext('2d');
      if (!c) return;
      const hc = highContrastRef.current;

      c.fillStyle = hc ? '#000000' : '#090D18';
      c.fillRect(0, 0, W, H);

      for (const b of bricksRef.current) {
        if (b.hp <= 0) continue;
        c.fillStyle = b.color;
        c.globalAlpha = b.hp > 1 || hc ? 1 : 0.88;
        c.beginPath();
        c.roundRect(b.x, b.y, b.w, b.h, 4);
        c.fill();
        if (b.hp > 1 || hc) {
          c.strokeStyle = '#FFFFFF';
          c.lineWidth = hc ? 2 : 1.5;
          c.stroke();
        }
        c.globalAlpha = 1;
      }

      c.fillStyle = hc ? '#FFFFFF' : '#6366F1';
      c.beginPath();
      c.roundRect(paddleXRef.current, H - 30, PADDLE_W, PADDLE_H, 6);
      c.fill();

      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.arc(ballRef.current.x, ballRef.current.y, BALL_R, 0, Math.PI * 2);
      c.fill();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.03, (now - lastTime) / 1000);
      lastTime = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (keysRef.current.left || virtualHoldRef.current.left) {
          paddleXRef.current = Math.max(0, paddleXRef.current - 380 * dt);
        }
        if (keysRef.current.right || virtualHoldRef.current.right) {
          paddleXRef.current = Math.min(W - PADDLE_W, paddleXRef.current + 380 * dt);
        }
        if (Math.abs(analogRef.current.x) > 0.1) {
          paddleXRef.current = Math.max(
            0,
            Math.min(W - PADDLE_W, paddleXRef.current + analogRef.current.x * 420 * dt)
          );
        }

        const b = ballRef.current;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x - BALL_R < 0) {
          b.x = BALL_R;
          b.vx = Math.abs(b.vx);
          sfx.bounce(ctx.soundEnabled);
        } else if (b.x + BALL_R > W) {
          b.x = W - BALL_R;
          b.vx = -Math.abs(b.vx);
          sfx.bounce(ctx.soundEnabled);
        }
        if (b.y - BALL_R < 0) {
          b.y = BALL_R;
          b.vy = Math.abs(b.vy);
          sfx.bounce(ctx.soundEnabled);
        }

        const paddleY = H - 30;
        if (
          b.vy > 0 &&
          b.y + BALL_R >= paddleY &&
          b.y - BALL_R <= paddleY + PADDLE_H &&
          b.x >= paddleXRef.current - 4 &&
          b.x <= paddleXRef.current + PADDLE_W + 4
        ) {
          const hitRatio = (b.x - (paddleXRef.current + PADDLE_W / 2)) / (PADDLE_W / 2);
          const speed = Math.hypot(b.vx, b.vy);
          const angle = hitRatio * (Math.PI / 3);
          b.vx = speed * Math.sin(angle);
          b.vy = -Math.abs(speed * Math.cos(angle));
          b.y = paddleY - BALL_R;
          sfx.bounce(ctx.soundEnabled);
          triggerHaptic(ctx.hapticsEnabled, 8);
        }

        for (const br of bricksRef.current) {
          if (br.hp <= 0) continue;
          if (
            b.x + BALL_R > br.x &&
            b.x - BALL_R < br.x + br.w &&
            b.y + BALL_R > br.y &&
            b.y - BALL_R < br.y + br.h
          ) {
            br.hp -= 1;
            b.vy = -b.vy;
            scoreRef.current += br.hp === 0 ? 20 * levelRef.current : 10;
            setScore(scoreRef.current);
            onScoreChange(scoreRef.current);
            sfx.eat(ctx.soundEnabled);
            triggerHaptic(ctx.hapticsEnabled, 10);
            break;
          }
        }

        if (bricksRef.current.every((br) => br.hp <= 0)) {
          levelRef.current += 1;
          setLevel(levelRef.current);
          bricksRef.current = buildLevel(levelRef.current);
          resetBallOnPaddle();
          sfx.win(ctx.soundEnabled);
        }

        if (b.y - BALL_R > H) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            statusRef.current = 'GAME_OVER';
            setStatus('GAME_OVER');
            sfx.gameOver(ctx.soundEnabled);
            triggerHaptic(ctx.hapticsEnabled, [30, 40, 60]);
            if (!endedRef.current) {
              endedRef.current = true;
              ctx.onScoreEnd(scoreRef.current, false);
            }
          } else {
            resetBallOnPaddle();
          }
        }
      }

      draw();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ctx, onScoreChange, resetBallOnPaddle]);

  const btnPx = Math.max(48, getTouchButtonPx(settings.buttonSize));

  const dirCluster = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Move Paddle Left"
        style={{ minHeight: btnPx, minWidth: btnPx + 14, opacity: settings.buttonOpacity }}
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality('touch');
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          virtualHoldRef.current.left = true;
        }}
        onPointerUp={() => {
          virtualHoldRef.current.left = false;
        }}
        onPointerCancel={() => {
          virtualHoldRef.current.left = false;
        }}
        className="rounded-xl bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/15 flex items-center justify-center active:scale-95 touch-none hc-button"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="Move Paddle Right"
        style={{ minHeight: btnPx, minWidth: btnPx + 14, opacity: settings.buttonOpacity }}
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality('touch');
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          virtualHoldRef.current.right = true;
        }}
        onPointerUp={() => {
          virtualHoldRef.current.right = false;
        }}
        onPointerCancel={() => {
          virtualHoldRef.current.right = false;
        }}
        className="rounded-xl bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/15 flex items-center justify-center active:scale-95 touch-none hc-button"
      >
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const launchBtn = (
    <button
      type="button"
      aria-label={status === 'PLAYING' ? 'Pause or Resume' : t.common.startGame}
      style={{ minHeight: btnPx, opacity: settings.buttonOpacity }}
      onPointerDown={(e) => {
        e.preventDefault();
        reportModality('touch');
        if (status !== 'PLAYING') resetAll();
        else ctx.setIsPaused(!ctx.isPaused);
      }}
      className="px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 touch-none hc-button"
    >
      <Play className="w-4 h-4" />
      <span>{status === 'PLAYING' ? (ctx.isPaused ? t.common.resume : t.common.pause) : t.common.startGame}</span>
    </button>
  );

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
        <span>
          {t.common.level}: <strong>{level}</strong>
        </span>
        <span>
          {t.common.lives}: <strong>{lives}</strong>
        </span>
      </div>

      <div
        className="relative w-full aspect-[44/52] rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 bg-[#090D18] game-surface-lock hc-surface"
        onPointerDown={(e) => {
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          activePointerIdRef.current = e.pointerId;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          movePaddleToClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' || activePointerIdRef.current === e.pointerId) {
            movePaddleToClientX(e.clientX);
          }
        }}
        onPointerUp={(e) => {
          if (activePointerIdRef.current === e.pointerId) activePointerIdRef.current = null;
        }}
        onPointerCancel={(e) => {
          if (activePointerIdRef.current === e.pointerId) activePointerIdRef.current = null;
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />

        {status === 'READY' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-white">Brick Breaker</h2>
            <p className="mt-2 text-xs text-slate-300">
              Drag pointer, use virtual buttons, Arrow keys / WASD, or a Gamepad stick.
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="mt-5 min-h-[48px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm hc-button"
            >
              {t.common.startGame}
            </button>
          </div>
        )}

        {ctx.isPaused && status === 'PLAYING' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs p-6 text-center"
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

        {status === 'GAME_OVER' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center"
          >
            <h2 className="font-display text-2xl font-bold text-white">{t.common.gameOver}</h2>
            <p className="mt-1 font-mono text-lg text-indigo-400 tabular-nums">
              {t.common.score}: {score}
            </p>
            <LeaderboardSubmitWidget gameSlug="breakout" score={score} />
            <button
              type="button"
              onClick={resetAll}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm hc-button"
            >
              {t.common.playAgain}
            </button>
          </div>
        )}
      </div>

      {/* Optional Virtual Directional Buttons */}
      {settings.showVirtualButtonsOnBreakout && (
        <div className="w-full flex items-center justify-between gap-2 px-1">
          {settings.handedness === 'left' ? (
            <>
              {launchBtn}
              {dirCluster}
            </>
          ) : (
            <>
              {dirCluster}
              {launchBtn}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BreakoutGame;
