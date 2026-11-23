import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { sfx, triggerHaptic } from '../utils/sound';

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

const WIDTH = 360;
const HEIGHT = 480;
const BIRD_X = 92;
const BIRD_R = 14;
const PIPE_W = 54;
const GAP_H = 132;
const GRAVITY = 1280;
const JUMP_V = -400;
const SPEED = 155;

const FlappyGame: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { settings, subscribeAction, reportModality } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);

  const birdYRef = useRef(HEIGHT / 2);
  const birdVelRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const statusRef = useRef<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const endedRef = useRef(false);

  const reset = useCallback(
    (autoStart = false) => {
      birdYRef.current = HEIGHT / 2;
      birdVelRef.current = 0;
      pipesRef.current = [
        { x: WIDTH + 120, gapY: 210, passed: false },
        { x: WIDTH + 330, gapY: 270, passed: false },
      ];
      scoreRef.current = 0;
      endedRef.current = false;
      setScore(0);
      onScoreChange(0);
      const nextState = autoStart ? 'PLAYING' : 'READY';
      statusRef.current = nextState;
      setStatus(nextState);
    },
    [onScoreChange]
  );

  useEffect(() => {
    if (ctx.restartKey > 0) reset(false);
  }, [ctx.restartKey, reset]);

  const flap = useCallback(() => {
    if (ctx.isPaused) return;
    if (statusRef.current === 'READY') {
      statusRef.current = 'PLAYING';
      setStatus('PLAYING');
    }
    if (statusRef.current === 'PLAYING') {
      birdVelRef.current = JUMP_V;
      sfx.bounce(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 10);
    }
  }, [ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled]);

  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'primary' || action === 'up') {
        if (statusRef.current === 'GAME_OVER') reset(true);
        else flap();
      }
    });
  }, [flap, reset, subscribeAction]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const c = canvas.getContext('2d');
      if (!c) return;

      if (settings.highContrast) {
        c.fillStyle = '#000000';
        c.fillRect(0, 0, WIDTH, HEIGHT);
      } else {
        const grad = c.createLinearGradient(0, 0, 0, HEIGHT);
        grad.addColorStop(0, '#09152B');
        grad.addColorStop(1, '#122645');
        c.fillStyle = grad;
        c.fillRect(0, 0, WIDTH, HEIGHT);
      }

      for (const p of pipesRef.current) {
        const topH = p.gapY - GAP_H / 2;
        const botY = p.gapY + GAP_H / 2;
        c.fillStyle = settings.highContrast ? '#38BDF8' : '#06B6D4';
        c.beginPath();
        c.roundRect(p.x, 0, PIPE_W, topH, [0, 0, 8, 8]);
        c.fill();
        c.beginPath();
        c.roundRect(p.x, botY, PIPE_W, HEIGHT - botY, [8, 8, 0, 0]);
        c.fill();

        c.fillStyle = '#22D3EE';
        c.fillRect(p.x - 3, topH - 14, PIPE_W + 6, 14);
        c.fillRect(p.x - 3, botY, PIPE_W + 6, 14);
      }

      c.fillStyle = '#1E293B';
      c.fillRect(0, HEIGHT - 20, WIDTH, 20);

      c.save();
      c.translate(BIRD_X, birdYRef.current);
      const angle = Math.max(-0.45, Math.min(0.65, birdVelRef.current / 520));
      c.rotate(angle);
      c.fillStyle = '#F59E0B';
      c.beginPath();
      c.ellipse(0, 0, BIRD_R + 3, BIRD_R, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#FEF3C7';
      c.beginPath();
      c.ellipse(-4, 2, 8, 5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#F97316';
      c.beginPath();
      c.moveTo(BIRD_R, -4);
      c.lineTo(BIRD_R + 10, 0);
      c.lineTo(BIRD_R, 4);
      c.closePath();
      c.fill();
      c.fillStyle = '#0F172A';
      c.beginPath();
      c.arc(6, -4, 3, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        birdVelRef.current += GRAVITY * dt;
        birdYRef.current += birdVelRef.current * dt;

        for (const p of pipesRef.current) {
          p.x -= SPEED * dt;
          if (!p.passed && p.x + PIPE_W < BIRD_X) {
            p.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            onScoreChange(scoreRef.current);
            sfx.eat(ctx.soundEnabled);
          }
        }
        if (pipesRef.current.length && pipesRef.current[0].x + PIPE_W < -10) {
          const lastX = pipesRef.current[pipesRef.current.length - 1].x;
          pipesRef.current.shift();
          pipesRef.current.push({
            x: lastX + 210,
            gapY: 115 + Math.random() * (HEIGHT - 250),
            passed: false,
          });
        }

        let crashed = birdYRef.current - BIRD_R < 0 || birdYRef.current + BIRD_R > HEIGHT - 20;
        for (const p of pipesRef.current) {
          if (BIRD_X + BIRD_R - 2 > p.x && BIRD_X - BIRD_R + 2 < p.x + PIPE_W) {
            if (birdYRef.current - BIRD_R + 2 < p.gapY - GAP_H / 2 || birdYRef.current + BIRD_R - 2 > p.gapY + GAP_H / 2) {
              crashed = true;
            }
          }
        }

        if (crashed) {
          statusRef.current = 'GAME_OVER';
          setStatus('GAME_OVER');
          sfx.gameOver(ctx.soundEnabled);
          triggerHaptic(ctx.hapticsEnabled, [30, 40, 60]);
          if (!endedRef.current) {
            endedRef.current = true;
            ctx.onScoreEnd(scoreRef.current, false);
          }
        }
      } else if (statusRef.current === 'READY') {
        birdYRef.current = HEIGHT / 2 + Math.sin(now / 260) * 8;
      }

      draw();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [ctx, onScoreChange, settings.highContrast]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 bg-[#09152B] game-surface-lock cursor-pointer hc-surface"
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          flap();
        }}
      >
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="w-full h-full block" />

        {status === 'READY' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 p-6 text-center pointer-events-none">
            <h2 className="font-display text-2xl font-bold text-white">Sky Hopper</h2>
            <p className="mt-2 text-xs text-slate-200">Tap, Click, Spacebar, or Gamepad A to fly</p>
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
            <p className="mt-1 font-mono text-lg text-cyan-400 tabular-nums">
              {t.common.score}: {score}
            </p>
            <LeaderboardSubmitWidget gameSlug="flappy-bird" score={score} />
            <button
              type="button"
              onClick={() => reset(true)}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm hc-button"
            >
              {t.common.playAgain}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlappyGame;
