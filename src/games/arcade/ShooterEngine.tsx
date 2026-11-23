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

const W = 440;
const H = 480;

const ShooterEngine: React.FC<Props> = ({ ctx, onScoreChange, gameSlug = 'space-shooter' }) => {
  const { subscribeAction, reportModality } = useControls();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  const statusRef = useRef(status);
  statusRef.current = status;
  const endedRef = useRef(false);

  const shipRef = useRef({ x: W / 2, y: H - 60, angle: -Math.PI / 2, vx: 0, vy: 0, fireCd: 0 });
  const keysRef = useRef({ left: false, right: false, up: false, down: false });
  const bulletsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number }>>([]);
  const enemiesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; r: number; hp: number }>>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const spawnRef = useRef(0);

  const reset = useCallback(
    (autoStart = false) => {
      shipRef.current = { x: W / 2, y: gameSlug === 'space-shooter' ? H - 54 : H / 2, angle: -Math.PI / 2, vx: 0, vy: 0, fireCd: 0 };
      bulletsRef.current = [];
      enemiesRef.current = [];
      scoreRef.current = 0;
      livesRef.current = 3;
      spawnRef.current = 0.4;
      endedRef.current = false;
      setScore(0);
      setLives(3);
      onScoreChange(0);
      const next = autoStart ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [gameSlug, onScoreChange]
  );

  useEffect(() => {
    if (ctx.restartKey > 0) reset(false);
  }, [ctx.restartKey, reset]);

  const fire = useCallback(() => {
    if (ctx.isPaused || statusRef.current !== 'PLAYING') return;
    const s = shipRef.current;
    if (s.fireCd > 0) return;
    s.fireCd = 0.16;
    if (gameSlug === 'space-shooter') {
      bulletsRef.current.push({ x: s.x - 9, y: s.y - 16, vx: 0, vy: -460 });
      bulletsRef.current.push({ x: s.x + 9, y: s.y - 16, vx: 0, vy: -460 });
    } else {
      bulletsRef.current.push({
        x: s.x + Math.cos(s.angle) * 18,
        y: s.y + Math.sin(s.angle) * 18,
        vx: Math.cos(s.angle) * 430,
        vy: Math.sin(s.angle) * 430,
      });
    }
    sfx.click(ctx.soundEnabled);
  }, [ctx.isPaused, ctx.soundEnabled, gameSlug]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keysRef.current.down = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    return subscribeAction((act) => {
      if (act === 'primary') {
        if (statusRef.current === 'GAME_OVER') reset(true);
        else fire();
      }
    });
  }, [fire, reset, subscribeAction]);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - prev) / 1000);
      prev = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        const s = shipRef.current;
        const k = keysRef.current;
        s.fireCd = Math.max(0, s.fireCd - dt);

        if (gameSlug === 'space-shooter') {
          if (k.left) s.x -= 260 * dt;
          if (k.right) s.x += 260 * dt;
          if (k.up) s.y -= 220 * dt;
          if (k.down) s.y += 220 * dt;
          s.x = Math.max(24, Math.min(W - 24, s.x));
          s.y = Math.max(120, Math.min(H - 28, s.y));
          if (s.fireCd <= 0) fire();
        } else if (gameSlug === 'asteroid-blaster') {
          if (k.left) s.angle -= 3.8 * dt;
          if (k.right) s.angle += 3.8 * dt;
          if (k.up) {
            s.vx += Math.cos(s.angle) * 260 * dt;
            s.vy += Math.sin(s.angle) * 260 * dt;
          }
          s.vx *= 0.99;
          s.vy *= 0.99;
          s.x = (s.x + s.vx * dt + W) % W;
          s.y = (s.y + s.vy * dt + H) % H;
        } else {
          let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
          let dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
          if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;
            s.x = Math.max(22, Math.min(W - 22, s.x + dx * 200 * dt));
            s.y = Math.max(22, Math.min(H - 22, s.y + dy * 200 * dt));
            s.angle = Math.atan2(dy, dx);
          }
          if (enemiesRef.current.length > 0 && s.fireCd <= 0) {
            // Auto-aim nearest target on mobile/twin-stick convenience
            let nearest = enemiesRef.current[0];
            let bestD = Infinity;
            for (const en of enemiesRef.current) {
              const d = Math.hypot(en.x - s.x, en.y - s.y);
              if (d < bestD) {
                bestD = d;
                nearest = en;
              }
            }
            s.angle = Math.atan2(nearest.y - s.y, nearest.x - s.x);
            fire();
          }
        }

        spawnRef.current -= dt;
        if (spawnRef.current <= 0) {
          spawnRef.current = Math.max(0.42, 1.1 - scoreRef.current / 1200);
          if (gameSlug === 'space-shooter') {
            enemiesRef.current.push({
              x: 28 + Math.random() * (W - 56),
              y: -20,
              vx: (Math.random() - 0.5) * 60,
              vy: 110 + Math.random() * 80,
              r: 16,
              hp: 1,
            });
          } else {
            const edge = Math.floor(Math.random() * 4);
            const ex = edge === 0 ? Math.random() * W : edge === 1 ? W + 20 : edge === 2 ? Math.random() * W : -20;
            const ey = edge === 0 ? -20 : edge === 1 ? Math.random() * H : edge === 2 ? H + 20 : Math.random() * H;
            const ang = Math.atan2(s.y - ey, s.x - ex);
            const spd = gameSlug === 'asteroid-blaster' ? 75 + Math.random() * 50 : 90 + Math.min(110, scoreRef.current * 0.12);
            enemiesRef.current.push({
              x: ex,
              y: ey,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              r: gameSlug === 'asteroid-blaster' ? 22 : 15,
              hp: gameSlug === 'tank-battle' ? 2 : 1,
            });
          }
        }

        for (const b of bulletsRef.current) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
        }
        bulletsRef.current = bulletsRef.current.filter((b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);

        for (const en of enemiesRef.current) {
          if (gameSlug === 'zombie-survival' || gameSlug === 'tank-battle') {
            const ang = Math.atan2(s.y - en.y, s.x - en.x);
            const spd = Math.hypot(en.vx, en.vy);
            en.vx = Math.cos(ang) * spd;
            en.vy = Math.sin(ang) * spd;
          }
          en.x += en.vx * dt;
          en.y += en.vy * dt;

          for (const b of bulletsRef.current) {
            if (Math.hypot(b.x - en.x, b.y - en.y) < en.r + 5) {
              b.x = -999;
              en.hp -= 1;
              if (en.hp <= 0) {
                scoreRef.current += 25;
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.eat(ctx.soundEnabled);
                if (gameSlug === 'asteroid-blaster' && en.r > 14) {
                  enemiesRef.current.push(
                    { x: en.x, y: en.y, vx: en.vy, vy: -en.vx, r: 12, hp: 1 },
                    { x: en.x, y: en.y, vx: -en.vy, vy: en.vx, r: 12, hp: 1 }
                  );
                }
              }
            }
          }

          if (en.hp > 0 && Math.hypot(s.x - en.x, s.y - en.y) < en.r + 14) {
            en.hp = 0;
            livesRef.current -= 1;
            setLives(livesRef.current);
            triggerHaptic(ctx.hapticsEnabled, [35, 35]);
            if (livesRef.current <= 0) {
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
        enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0 && e.y < H + 40 && e.x > -40 && e.x < W + 40 && e.y > -40);
      }

      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(59,130,246,0.12)';
        for (let i = 0; i < W; i += 44) {
          c.beginPath();
          c.moveTo(i, 0);
          c.lineTo(i, H);
          c.stroke();
        }
        for (let j = 0; j < H; j += 44) {
          c.beginPath();
          c.moveTo(0, j);
          c.lineTo(W, j);
          c.stroke();
        }

        // Bullets
        c.fillStyle = '#00E5FF';
        for (const b of bulletsRef.current) {
          c.beginPath();
          c.arc(b.x, b.y, 4, 0, Math.PI * 2);
          c.fill();
        }

        // Enemies
        for (const e of enemiesRef.current) {
          c.fillStyle = gameSlug === 'zombie-survival' ? '#22C55E' : gameSlug === 'tank-battle' ? '#F59E0B' : '#F43F5E';
          c.beginPath();
          c.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#FFFFFF';
          c.lineWidth = 1.5;
          c.stroke();
        }

        // Ship / Player
        const s = shipRef.current;
        c.save();
        c.translate(s.x, s.y);
        c.rotate(s.angle + Math.PI / 2);
        c.fillStyle = '#38BDF8';
        c.beginPath();
        c.moveTo(0, -18);
        c.lineTo(14, 14);
        c.lineTo(0, 7);
        c.lineTo(-14, 14);
        c.closePath();
        c.fill();
        c.restore();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, fire, gameSlug, onScoreChange]);

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
    reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const s = shipRef.current;
    if (gameSlug === 'space-shooter') {
      s.x = Math.max(20, Math.min(W - 20, px));
      s.y = Math.max(80, Math.min(H - 24, py));
    } else {
      s.angle = Math.atan2(py - s.y, px - s.x);
      s.x += (px - s.x) * 0.14;
      s.y += (py - s.y) * 0.14;
      fire();
    }
  };

  const titleMap: Record<string, string> = {
    'space-shooter': 'Starburst Shooter',
    'asteroid-blaster': 'Asteroid Blaster',
    'tank-battle': 'Neon Tank Battle',
    'zombie-survival': 'Outbreak Arena Survival',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1">
        <span>HP: {'♥'.repeat(Math.max(0, lives))}</span>
        <span>Score: {score}</span>
      </div>
      <div
        className="relative w-full aspect-[11/12] rounded-2xl overflow-hidden border border-blue-500/35 bg-[#070B19] game-surface-lock"
        onPointerDown={handlePointer}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') handlePointer(e);
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Neon Shooter'}
          subtitle="Move with WASD/Arrows or drag directly inside the arena. Fire blasts to survive waves."
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onPointerDown={() => (keysRef.current.left = true)}
          onPointerUp={() => (keysRef.current.left = false)}
          onPointerLeave={() => (keysRef.current.left = false)}
          className="min-h-[48px] px-5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-white"
        >
          ← Left
        </button>
        <button
          type="button"
          onPointerDown={() => fire()}
          className="min-h-[48px] px-6 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-xs font-bold text-cyan-200"
        >
          Fire (Space)
        </button>
        <button
          type="button"
          onPointerDown={() => (keysRef.current.right = true)}
          onPointerUp={() => (keysRef.current.right = false)}
          onPointerLeave={() => (keysRef.current.right = false)}
          className="min-h-[48px] px-5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-white"
        >
          Right →
        </button>
      </div>
    </div>
  );
};

export default ShooterEngine;
