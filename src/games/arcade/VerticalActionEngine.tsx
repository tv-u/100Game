import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

interface Props {
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}

const W = 380;
const H = 480;

const VerticalActionEngine: React.FC<Props> = ({ ctx, onScoreChange, gameSlug = 'doodle-jump' }) => {
  const isChopper = gameSlug === 'helicopter-rescue';
  const { reportModality } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);

  const statusRef = useRef(status);
  statusRef.current = status;
  const endedRef = useRef(false);
  const scoreRef = useRef(0);

  // Doodle Jump state
  const doodleRef = useRef({ x: W / 2, y: H - 90, vx: 0, vy: -460 });
  const platsRef = useRef<Array<{ x: number; y: number; w: number; spring?: boolean }>>([]);
  const steerRef = useRef(0);

  // Chopper state
  const chopperRef = useRef({ y: H / 2, vy: 0, thrust: false });
  const wallsRef = useRef<Array<{ x: number; top: number; bot: number; beacon?: boolean; got?: boolean }>>([]);

  const reset = useCallback(
    (autoStart = false) => {
      scoreRef.current = 0;
      endedRef.current = false;
      doodleRef.current = { x: W / 2, y: H - 90, vx: 0, vy: -480 };
      const initialPlats: Array<{ x: number; y: number; w: number; spring?: boolean }> = [
        { x: W / 2 - 40, y: H - 40, w: 80 },
      ];
      for (let i = 1; i < 9; i++) {
        initialPlats.push({
          x: 20 + Math.random() * (W - 110),
          y: H - 40 - i * 54,
          w: 70,
          spring: Math.random() < 0.16,
        });
      }
      platsRef.current = initialPlats;

      chopperRef.current = { y: H / 2, vy: 0, thrust: false };
      wallsRef.current = Array.from({ length: 12 }, (_, idx) => ({
        x: idx * 44,
        top: 50 + Math.sin(idx * 0.5) * 24,
        bot: H - 55 - Math.cos(idx * 0.4) * 24,
        beacon: idx > 4 && idx % 5 === 0,
      }));

      setScore(0);
      onScoreChange(0);
      const next = autoStart ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    if (ctx.restartKey > 0) reset(false);
  }, [ctx.restartKey, reset]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') steerRef.current = -1;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') steerRef.current = 1;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') chopperRef.current.thrust = true;
    };
    const up = (e: KeyboardEvent) => {
      if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && steerRef.current < 0) steerRef.current = 0;
      if ((e.code === 'ArrowRight' || e.code === 'KeyD') && steerRef.current > 0) steerRef.current = 0;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') chopperRef.current.thrust = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - prev) / 1000);
      prev = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (isChopper) {
          const ch = chopperRef.current;
          ch.vy += (ch.thrust ? -920 : 680) * dt;
          ch.vy = Math.max(-320, Math.min(340, ch.vy));
          ch.y += ch.vy * dt;
          scoreRef.current += Math.round(dt * 24);

          for (const w of wallsRef.current) {
            w.x -= 170 * dt;
            if (w.beacon && !w.got && Math.abs(w.x - 86) < 22 && Math.abs((w.top + w.bot) / 2 - ch.y) < 34) {
              w.got = true;
              scoreRef.current += 40;
              sfx.eat(ctx.soundEnabled);
            }
            if (w.x <= 96 && w.x + 44 >= 72) {
              if (ch.y - 12 < w.top || ch.y + 12 > w.bot) {
                statusRef.current = 'GAME_OVER';
                setStatus('GAME_OVER');
                sfx.gameOver(ctx.soundEnabled);
                if (!endedRef.current) {
                  endedRef.current = true;
                  ctx.onScoreEnd(scoreRef.current, false);
                }
              }
            }
          }
          if (wallsRef.current[0].x < -48) {
            const last = wallsRef.current[wallsRef.current.length - 1];
            wallsRef.current.shift();
            const gap = Math.max(150, 250 - scoreRef.current * 0.08);
            const mid = Math.max(110, Math.min(H - 110, (last.top + last.bot) / 2 + (Math.random() - 0.5) * 65));
            wallsRef.current.push({
              x: last.x + 44,
              top: mid - gap / 2,
              bot: mid + gap / 2,
              beacon: Math.random() < 0.18,
            });
          }
          setScore(scoreRef.current);
          onScoreChange(scoreRef.current);
        } else {
          const d = doodleRef.current;
          d.vx = steerRef.current * 290;
          d.x = (d.x + d.vx * dt + W) % W;
          d.vy += 980 * dt;
          d.y += d.vy * dt;

          if (d.vy > 0) {
            for (const p of platsRef.current) {
              if (d.x > p.x - 10 && d.x < p.x + p.w + 10 && d.y + 16 >= p.y && d.y + 16 <= p.y + 18) {
                d.vy = p.spring ? -760 : -490;
                sfx.bounce(ctx.soundEnabled);
                triggerHaptic(ctx.hapticsEnabled, 8);
              }
            }
          }

          if (d.y < H * 0.42) {
            const shift = H * 0.42 - d.y;
            d.y = H * 0.42;
            scoreRef.current += Math.round(shift * 0.5);
            setScore(scoreRef.current);
            onScoreChange(scoreRef.current);
            for (const p of platsRef.current) p.y += shift;
          }

          platsRef.current = platsRef.current.filter((p) => p.y < H + 20);
          while (platsRef.current.length < 9) {
            const topY = platsRef.current.reduce((m, p) => Math.min(m, p.y), H);
            platsRef.current.push({
              x: 16 + Math.random() * (W - 102),
              y: topY - (48 + Math.random() * 20),
              w: 68,
              spring: Math.random() < 0.16,
            });
          }

          if (d.y > H + 30) {
            statusRef.current = 'GAME_OVER';
            setStatus('GAME_OVER');
            sfx.gameOver(ctx.soundEnabled);
            if (!endedRef.current) {
              endedRef.current = true;
              ctx.onScoreEnd(scoreRef.current, false);
            }
          }
        }
      }

      const c = canvasRef.current?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);
        if (isChopper) {
          c.fillStyle = '#1E293B';
          for (const w of wallsRef.current) {
            c.fillRect(w.x, 0, 45, w.top);
            c.fillRect(w.x, w.bot, 45, H - w.bot);
            if (w.beacon && !w.got) {
              c.fillStyle = '#F59E0B';
              c.beginPath();
              c.arc(w.x + 22, (w.top + w.bot) / 2, 8, 0, Math.PI * 2);
              c.fill();
              c.fillStyle = '#1E293B';
            }
          }
          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.roundRect(72, chopperRef.current.y - 11, 28, 22, 8);
          c.fill();
          c.fillStyle = '#FFFFFF';
          c.fillRect(68, chopperRef.current.y - 16, 36, 3);
        } else {
          for (const p of platsRef.current) {
            c.fillStyle = p.spring ? '#10B981' : '#38BDF8';
            c.beginPath();
            c.roundRect(p.x, p.y, p.w, 10, 5);
            c.fill();
          }
          const d = doodleRef.current;
          c.fillStyle = '#F59E0B';
          c.beginPath();
          c.arc(d.x, d.y, 15, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#070B19';
          c.beginPath();
          c.arc(d.x + 5, d.y - 4, 3, 0, Math.PI * 2);
          c.fill();
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, isChopper, onScoreChange]);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-emerald-500/35 bg-[#070B19] game-surface-lock"
        onPointerDown={(e) => {
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          if (isChopper) {
            chopperRef.current.thrust = true;
          } else {
            const rect = e.currentTarget.getBoundingClientRect();
            steerRef.current = e.clientX - rect.left < rect.width / 2 ? -1 : 1;
          }
        }}
        onPointerUp={() => {
          chopperRef.current.thrust = false;
          steerRef.current = 0;
        }}
        onPointerLeave={() => {
          chopperRef.current.thrust = false;
          steerRef.current = 0;
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title={isChopper ? 'Chopper Tunnel Rescue' : 'Sky Spring Jump'}
          subtitle={
            isChopper
              ? 'Hold anywhere or Spacebar to ascend through neon cavern tunnels.'
              : 'Steer left/right with Arrows or touch sides to bounce upward endlessly.'
          }
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default VerticalActionEngine;
