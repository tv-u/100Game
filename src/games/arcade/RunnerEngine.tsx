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

const W = 540;
const H = 300;
const GROUND_Y = 248;

const RunnerEngine: React.FC<Props> = ({ ctx, onScoreChange, gameSlug = 'endless-runner' }) => {
  const isNinja = gameSlug === 'ninja-jump';
  const { subscribeAction, reportModality } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);

  const statusRef = useRef(status);
  statusRef.current = status;
  const endedRef = useRef(false);

  // Endless runner state
  const playerRef = useRef({ y: GROUND_Y - 34, vy: 0, jumps: 0, duck: false });
  const obsRef = useRef<Array<{ x: number; w: number; h: number; y: number; type: 'spike' | 'drone' | 'orb'; collected?: boolean }>>([]);
  // Ninja wall jump state
  const ninjaRef = useRef({ side: 0 as 0 | 1, x: 56, y: 210, targetX: 56, camY: 0, vy: -140 });
  const wallObsRef = useRef<Array<{ side: 0 | 1; y: number; kind: 'spike' | 'lantern'; got?: boolean }>>([]);
  const scoreRef = useRef(0);
  const speedRef = useRef(240);
  const spawnTimerRef = useRef(0);

  const reset = useCallback(
    (autoStart = false) => {
      scoreRef.current = 0;
      speedRef.current = 240;
      spawnTimerRef.current = 0.6;
      endedRef.current = false;
      playerRef.current = { y: GROUND_Y - 34, vy: 0, jumps: 0, duck: false };
      obsRef.current = [];
      ninjaRef.current = { side: 0, x: 56, y: 210, targetX: 56, camY: 0, vy: -140 };
      wallObsRef.current = [
        { side: 1, y: 120, kind: 'spike' },
        { side: 0, y: 30, kind: 'spike' },
        { side: 1, y: -60, kind: 'lantern' },
        { side: 1, y: -150, kind: 'spike' },
      ];
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

  const jumpAction = useCallback(() => {
    if (ctx.isPaused) return;
    if (statusRef.current === 'READY') {
      reset(true);
    }
    if (statusRef.current !== 'PLAYING') return;

    if (isNinja) {
      const n = ninjaRef.current;
      n.side = n.side === 0 ? 1 : 0;
      n.targetX = n.side === 0 ? 56 : W - 56;
      sfx.bounce(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 10);
      return;
    }

    const p = playerRef.current;
    if (p.jumps < 2) {
      p.vy = p.jumps === 0 ? -470 : -410;
      p.jumps += 1;
      p.duck = false;
      sfx.bounce(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 10);
    }
  }, [ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled, isNinja, reset]);

  const dropAction = useCallback(() => {
    if (ctx.isPaused || statusRef.current !== 'PLAYING' || isNinja) return;
    const p = playerRef.current;
    p.vy = Math.max(p.vy, 380);
    p.duck = true;
  }, [ctx.isPaused, isNinja]);

  useEffect(() => {
    return subscribeAction((act) => {
      if (act === 'primary' || act === 'up' || (isNinja && (act === 'left' || act === 'right'))) {
        if (statusRef.current === 'GAME_OVER') reset(true);
        else jumpAction();
      } else if (act === 'down') {
        dropAction();
      }
    });
  }, [dropAction, isNinja, jumpAction, reset, subscribeAction]);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - prev) / 1000);
      prev = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (isNinja) {
          const n = ninjaRef.current;
          n.vy = -Math.min(260, 145 + scoreRef.current * 0.6);
          n.y += n.vy * dt;
          n.x += (n.targetX - n.x) * Math.min(1, dt * 18);
          n.camY = n.y - 210;

          scoreRef.current = Math.max(scoreRef.current, Math.floor(Math.abs(n.y - 210) / 8));
          setScore(scoreRef.current);
          onScoreChange(scoreRef.current);

          const topObsY = wallObsRef.current.reduce((m, o) => Math.min(m, o.y), n.camY);
          if (topObsY > n.camY - 60) {
            const side: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
            wallObsRef.current.push({
              side,
              y: topObsY - (86 + Math.random() * 44),
              kind: Math.random() < 0.28 ? 'lantern' : 'spike',
            });
          }
          wallObsRef.current = wallObsRef.current.filter((o) => o.y < n.camY + H + 80);

          for (const o of wallObsRef.current) {
            const ox = o.side === 0 ? 52 : W - 52;
            if (Math.hypot(n.x - ox, n.y - o.y) < 24) {
              if (o.kind === 'lantern' && !o.got) {
                o.got = true;
                scoreRef.current += 25;
                sfx.eat(ctx.soundEnabled);
              } else if (o.kind === 'spike') {
                statusRef.current = 'GAME_OVER';
                setStatus('GAME_OVER');
                sfx.gameOver(ctx.soundEnabled);
                triggerHaptic(ctx.hapticsEnabled, [30, 40]);
                if (!endedRef.current) {
                  endedRef.current = true;
                  ctx.onScoreEnd(scoreRef.current, false);
                }
              }
            }
          }
        } else {
          const p = playerRef.current;
          speedRef.current = Math.min(540, speedRef.current + dt * 7);
          p.vy += 1280 * dt;
          p.y += p.vy * dt;
          const standH = p.duck ? 20 : 34;
          if (p.y >= GROUND_Y - standH) {
            p.y = GROUND_Y - standH;
            p.vy = 0;
            p.jumps = 0;
            p.duck = false;
          }

          spawnTimerRef.current -= dt;
          if (spawnTimerRef.current <= 0) {
            spawnTimerRef.current = Math.max(0.62, 1.35 - (speedRef.current - 240) / 450) + Math.random() * 0.4;
            const r = Math.random();
            if (r < 0.25) {
              obsRef.current.push({ x: W + 20, w: 18, h: 18, y: GROUND_Y - 75 - Math.random() * 45, type: 'orb' });
            } else if (r < 0.55) {
              obsRef.current.push({ x: W + 20, w: 32, h: 24, y: GROUND_Y - 56, type: 'drone' });
            } else {
              const h = 28 + Math.random() * 24;
              obsRef.current.push({ x: W + 20, w: 24, h, y: GROUND_Y - h, type: 'spike' });
            }
          }

          scoreRef.current += Math.round(dt * 18);
          for (const o of obsRef.current) {
            o.x -= speedRef.current * dt;
            const px = 76;
            const pw = 24;
            const py = p.y;
            const ph = p.duck ? 20 : 34;
            if (px < o.x + o.w - 4 && px + pw > o.x + 4 && py < o.y + o.h - 4 && py + ph > o.y + 4) {
              if (o.type === 'orb' && !o.collected) {
                o.collected = true;
                scoreRef.current += 35;
                sfx.eat(ctx.soundEnabled);
              } else if (o.type !== 'orb') {
                statusRef.current = 'GAME_OVER';
                setStatus('GAME_OVER');
                sfx.gameOver(ctx.soundEnabled);
                triggerHaptic(ctx.hapticsEnabled, [30, 40]);
                if (!endedRef.current) {
                  endedRef.current = true;
                  ctx.onScoreEnd(scoreRef.current, false);
                }
              }
            }
          }
          obsRef.current = obsRef.current.filter((o) => o.x + o.w > -20 && !o.collected);
          setScore(scoreRef.current);
          onScoreChange(scoreRef.current);
        }
      }

      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);

        if (isNinja) {
          c.fillStyle = '#131C3A';
          c.fillRect(0, 0, 42, H);
          c.fillRect(W - 42, 0, 42, H);
          c.strokeStyle = '#9D4EDD';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(42, 0);
          c.lineTo(42, H);
          c.moveTo(W - 42, 0);
          c.lineTo(W - 42, H);
          c.stroke();

          const n = ninjaRef.current;
          for (const o of wallObsRef.current) {
            const sy = o.y - n.camY;
            if (sy < -30 || sy > H + 30) continue;
            if (o.kind === 'spike') {
              c.fillStyle = '#F43F5E';
              c.beginPath();
              if (o.side === 0) {
                c.moveTo(42, sy - 14);
                c.lineTo(72, sy);
                c.lineTo(42, sy + 14);
              } else {
                c.moveTo(W - 42, sy - 14);
                c.lineTo(W - 72, sy);
                c.lineTo(W - 42, sy + 14);
              }
              c.fill();
            } else if (!o.got) {
              c.fillStyle = '#F59E0B';
              c.beginPath();
              c.arc(o.side === 0 ? 58 : W - 58, sy, 10, 0, Math.PI * 2);
              c.fill();
            }
          }

          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.roundRect(n.x - 13, 210 - 15, 26, 30, 8);
          c.fill();
          c.fillStyle = '#EF4444';
          c.fillRect(n.x - 12, 202, 24, 5);
        } else {
          // Parallax grid floor
          c.strokeStyle = 'rgba(0, 229, 255, 0.14)';
          c.lineWidth = 1;
          for (let gx = 0; gx < W; gx += 45) {
            c.beginPath();
            c.moveTo(gx, 0);
            c.lineTo(gx, GROUND_Y);
            c.stroke();
          }
          c.fillStyle = '#111A36';
          c.fillRect(0, GROUND_Y, W, H - GROUND_Y);
          c.strokeStyle = '#00E5FF';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(0, GROUND_Y);
          c.lineTo(W, GROUND_Y);
          c.stroke();

          for (const o of obsRef.current) {
            if (o.type === 'orb') {
              c.fillStyle = '#F59E0B';
              c.beginPath();
              c.arc(o.x + 9, o.y + 9, 9, 0, Math.PI * 2);
              c.fill();
            } else if (o.type === 'drone') {
              c.fillStyle = '#A855F7';
              c.beginPath();
              c.roundRect(o.x, o.y, o.w, o.h, 6);
              c.fill();
            } else {
              c.fillStyle = '#F43F5E';
              c.beginPath();
              c.moveTo(o.x, o.y + o.h);
              c.lineTo(o.x + o.w / 2, o.y);
              c.lineTo(o.x + o.w, o.y + o.h);
              c.closePath();
              c.fill();
            }
          }

          const p = playerRef.current;
          const ph = p.duck ? 20 : 34;
          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.roundRect(76, p.y, 24, ph, 6);
          c.fill();
          c.fillStyle = '#070B19';
          c.fillRect(90, p.y + 6, 6, 5);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, isNinja, onScoreChange]);

  return (
    <div className="w-full max-w-2xl flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-cyan-500/35 bg-[#070B19] game-surface-lock cursor-pointer"
        onPointerDown={(e) => {
          e.preventDefault();
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          jumpAction();
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title={isNinja ? 'Shadow Ninja Jump' : 'Cyber Dash Runner'}
          subtitle={
            isNinja
              ? 'Tap or press Space to vault cleanly between twin neon walls.'
              : 'Tap or press Space to Jump & Double-Jump over cyber barriers.'
          }
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            jumpAction();
          }}
          className="min-h-[48px] px-6 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 font-bold text-sm"
        >
          {isNinja ? 'Vault Wall (Space)' : 'Jump / Double Jump'}
        </button>
        {!isNinja && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              dropAction();
            }}
            className="min-h-[48px] px-5 rounded-xl bg-purple-500/15 border border-purple-400/40 text-purple-200 font-bold text-sm"
          >
            Fast Drop (Down)
          </button>
        )}
      </div>
    </div>
  );
};

export default RunnerEngine;
