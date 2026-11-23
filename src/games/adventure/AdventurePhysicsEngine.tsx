import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 400;
const H = 360;

export const AdventurePhysicsEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'pixel-platformer' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reportModality } = useControls();

  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);

  const statusRef = useRef<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const scoreRef = useRef(0);
  const endedRef = useRef(false);
  const holdRef = useRef(false);
  const keysRef = useRef({ left: false, right: false });

  const simRef = useRef({
    px: 80,
    py: 260,
    vx: 140,
    vy: 0,
    gravityDir: 1,
    onGround: false,
    camX: 0,
    // Obstacles / coins / anchors
    gates: [] as Array<{ x: number; top: boolean; passed: boolean }>,
    platforms: [] as Array<{ x: number; y: number; w: number; coin?: boolean; coinTaken?: boolean }>,
    anchors: [] as Array<{ x: number; y: number }>,
    latchedIdx: -1,
    ropeLen: 110,
    // Bridge builder
    bridgeLen: 0,
    bridgeState: 'idle' as 'idle' | 'growing' | 'falling' | 'walking',
    bridgeAngle: 0,
    curPlatW: 70,
    nextGap: 110,
    nextPlatW: 65,
    roverX: 40,
  });

  const reset = useCallback(
    (startImmediately = false) => {
      simRef.current = {
        px: 80,
        py: gameSlug === 'gravity-switch' ? 280 : 250,
        vx: gameSlug === 'hook-swing' ? 195 : 155,
        vy: 0,
        gravityDir: 1,
        onGround: false,
        camX: 0,
        gates: Array.from({ length: 7 }, (_, i) => ({ x: 340 + i * 175, top: i % 2 === 0, passed: false })),
        platforms: [
          { x: 0, y: 310, w: 220 },
          { x: 260, y: 265, w: 140, coin: true },
          { x: 440, y: 215, w: 150, coin: true },
          { x: 635, y: 265, w: 140, coin: true },
          { x: 820, y: 225, w: 180, coin: true },
        ],
        anchors: Array.from({ length: 12 }, (_, i) => ({ x: 180 + i * 210, y: 72 })),
        latchedIdx: -1,
        ropeLen: 120,
        bridgeLen: 0,
        bridgeState: 'idle',
        bridgeAngle: 0,
        curPlatW: 72,
        nextGap: 95,
        nextPlatW: 65,
        roverX: 42,
      };
      scoreRef.current = 0;
      endedRef.current = false;
      setScore(0);
      onScoreChange(0);
      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [gameSlug, onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  const finish = useCallback(() => {
    statusRef.current = 'GAME_OVER';
    setStatus('GAME_OVER');
    sfx.gameOver(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, [35, 35]);
    if (!endedRef.current) {
      endedRef.current = true;
      ctx.onScoreEnd(scoreRef.current, false);
    }
  }, [ctx]);

  const triggerPrimaryDown = useCallback(() => {
    if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
    const s = simRef.current;
    holdRef.current = true;
    if (gameSlug === 'gravity-switch') {
      s.gravityDir *= -1;
      sfx.click(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 12);
    } else if (gameSlug === 'pixel-platformer') {
      if (s.onGround) {
        s.vy = -370;
        s.onGround = false;
        sfx.click(ctx.soundEnabled);
      }
    } else if (gameSlug === 'hook-swing') {
      let best = -1;
      let bestD = Infinity;
      s.anchors.forEach((a, i) => {
        if (a.x > s.px - 40) {
          const d = Math.hypot(a.x - s.px, a.y - s.py);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      });
      if (best >= 0) {
        s.latchedIdx = best;
        s.ropeLen = Math.max(70, Math.min(185, bestD));
        sfx.click(ctx.soundEnabled);
      }
    } else if (gameSlug === 'bridge-builder' && s.bridgeState === 'idle') {
      s.bridgeState = 'growing';
      s.bridgeLen = 0;
      s.bridgeAngle = -Math.PI / 2;
    }
  }, [ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled, gameSlug]);

  const triggerPrimaryUp = useCallback(() => {
    holdRef.current = false;
    const s = simRef.current;
    if (gameSlug === 'hook-swing') {
      s.latchedIdx = -1;
    } else if (gameSlug === 'bridge-builder' && s.bridgeState === 'growing') {
      s.bridgeState = 'falling';
    }
  }, [gameSlug]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        if (!e.repeat) triggerPrimaryDown();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') triggerPrimaryUp();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [triggerPrimaryDown, triggerPrimaryUp]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const s = simRef.current;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (gameSlug === 'gravity-switch') {
          s.vy += s.gravityDir * 1150 * dt;
          s.py += s.vy * dt;
          if (s.py > H - 46) {
            s.py = H - 46;
            s.vy = 0;
          } else if (s.py < 46) {
            s.py = 46;
            s.vy = 0;
          }
          const spd = 225 + Math.min(180, scoreRef.current * 0.12);
          for (const g of s.gates) {
            g.x -= spd * dt;
            if (Math.abs(g.x - 85) < 18) {
              const hit = g.top ? s.py < 175 : s.py > 185;
              if (hit) {
                finish();
                break;
              }
            }
            if (!g.passed && g.x < 65) {
              g.passed = true;
              scoreRef.current += 35;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.eat(ctx.soundEnabled);
            }
          }
          if (s.gates[0] && s.gates[0].x < -30) {
            s.gates.shift();
            s.gates.push({
              x: s.gates[s.gates.length - 1].x + 170,
              top: Math.random() < 0.5,
              passed: false,
            });
          }
        } else if (gameSlug === 'pixel-platformer') {
          const moveDir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
          s.px += (moveDir !== 0 ? moveDir * 185 : 0) * dt;
          s.vy += 880 * dt;
          s.py += s.vy * dt;
          s.onGround = false;
          for (const p of s.platforms) {
            if (s.vy >= 0 && s.px >= p.x - 10 && s.px <= p.x + p.w + 10 && s.py >= p.y - 16 && s.py <= p.y + 12) {
              s.py = p.y - 16;
              s.vy = 0;
              s.onGround = true;
              if (p.coin && !p.coinTaken) {
                p.coinTaken = true;
                scoreRef.current += 100;
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.eat(ctx.soundEnabled);
              }
            }
          }
          s.camX = Math.max(0, s.px - 120);
          if (s.px > s.platforms[s.platforms.length - 1].x - 120) {
            const lastP = s.platforms[s.platforms.length - 1];
            s.platforms.push({
              x: lastP.x + lastP.w + 55 + Math.random() * 45,
              y: 190 + Math.random() * 115,
              w: 130,
              coin: true,
            });
          }
          if (s.py > H + 30) finish();
        } else if (gameSlug === 'hook-swing') {
          s.vy += 490 * dt;
          s.px += s.vx * dt;
          s.py += s.vy * dt;
          if (s.latchedIdx >= 0) {
            const anc = s.anchors[s.latchedIdx];
            const dx = s.px - anc.x;
            const dy = s.py - anc.y;
            const d = Math.hypot(dx, dy);
            if (d > s.ropeLen && d > 0) {
              const nx = dx / d;
              const ny = dy / d;
              s.px = anc.x + nx * s.ropeLen;
              s.py = anc.y + ny * s.ropeLen;
              const radial = s.vx * nx + s.vy * ny;
              if (radial > 0) {
                s.vx -= radial * nx;
                s.vy -= radial * ny;
                s.vx = Math.max(180, s.vx + 22 * dt);
              }
            }
          }
          s.camX = s.px - 100;
          scoreRef.current = Math.max(scoreRef.current, Math.floor((s.px - 80) / 8));
          setScore(scoreRef.current);
          onScoreChange(scoreRef.current);
          if (s.px > s.anchors[s.anchors.length - 2].x) {
            const lx = s.anchors[s.anchors.length - 1].x;
            s.anchors.push({ x: lx + 195 + Math.random() * 45, y: 58 + Math.random() * 45 });
          }
          if (s.py > H + 30 || s.py < -60) finish();
        } else if (gameSlug === 'bridge-builder') {
          if (s.bridgeState === 'growing') {
            s.bridgeLen = Math.min(240, s.bridgeLen + 205 * dt);
          } else if (s.bridgeState === 'falling') {
            s.bridgeAngle += 5.5 * dt;
            if (s.bridgeAngle >= 0) {
              s.bridgeAngle = 0;
              s.bridgeState = 'walking';
            }
          } else if (s.bridgeState === 'walking') {
            const targetX = s.curPlatW + s.bridgeLen;
            s.roverX += 195 * dt;
            if (s.roverX >= targetX) {
              if (s.bridgeLen >= s.nextGap && s.bridgeLen <= s.nextGap + s.nextPlatW) {
                scoreRef.current += 50;
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.eat(ctx.soundEnabled);
                s.curPlatW = s.nextPlatW;
                s.nextGap = 60 + Math.random() * 145;
                s.nextPlatW = 45 + Math.random() * 55;
                s.roverX = s.curPlatW - 22;
                s.bridgeLen = 0;
                s.bridgeState = 'idle';
              } else {
                finish();
              }
            }
          }
        }
      }

      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);

        if (gameSlug === 'gravity-switch') {
          c.fillStyle = '#1E293B';
          c.fillRect(0, 0, W, 32);
          c.fillRect(0, H - 32, W, 32);
          for (const g of s.gates) {
            c.fillStyle = '#F43F5E';
            c.fillRect(g.x - 10, g.top ? 32 : 185, 20, 143);
          }
          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.arc(85, s.py, 14, 0, Math.PI * 2);
          c.fill();
        } else if (gameSlug === 'pixel-platformer' || gameSlug === 'hook-swing') {
          c.save();
          c.translate(-s.camX, 0);
          if (gameSlug === 'pixel-platformer') {
            for (const p of s.platforms) {
              c.fillStyle = '#3B82F6';
              c.fillRect(p.x, p.y, p.w, 16);
              if (p.coin && !p.coinTaken) {
                c.fillStyle = '#F59E0B';
                c.beginPath();
                c.arc(p.x + p.w / 2, p.y - 26, 9, 0, Math.PI * 2);
                c.fill();
              }
            }
          } else {
            for (const a of s.anchors) {
              c.fillStyle = '#EC4899';
              c.beginPath();
              c.arc(a.x, a.y, 7, 0, Math.PI * 2);
              c.fill();
            }
            if (s.latchedIdx >= 0) {
              const anc = s.anchors[s.latchedIdx];
              c.strokeStyle = '#00E5FF';
              c.lineWidth = 3;
              c.beginPath();
              c.moveTo(anc.x, anc.y);
              c.lineTo(s.px, s.py);
              c.stroke();
            }
          }
          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.arc(s.px, s.py, 14, 0, Math.PI * 2);
          c.fill();
          c.restore();
        } else if (gameSlug === 'bridge-builder') {
          c.fillStyle = '#1E293B';
          c.fillRect(0, 240, s.curPlatW, H - 240);
          c.fillRect(s.curPlatW + s.nextGap, 240, s.nextPlatW, H - 240);
          // Bullseye center
          c.fillStyle = '#EF4444';
          c.fillRect(s.curPlatW + s.nextGap + s.nextPlatW / 2 - 4, 240, 8, 5);
          // Bridge beam
          c.save();
          c.translate(s.curPlatW, 240);
          c.rotate(s.bridgeAngle);
          c.fillStyle = '#14B8A6';
          c.fillRect(0, -5, s.bridgeLen, 5);
          c.restore();
          // Rover
          c.fillStyle = '#00E5FF';
          c.fillRect(s.roverX - 10, 220, 20, 20);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, finish, gameSlug, onScoreChange]);

  const titleMap: Record<string, string> = {
    'pixel-platformer': 'Pixel Coin Platformer',
    'gravity-switch': 'Gravity Flip Runner',
    'hook-swing': 'Grapple Hook Swing',
    'bridge-builder': 'Span Bridge Builder',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>Adventure Action</span>
        <span>Score: {score}</span>
      </div>
      <div
        className="relative w-full aspect-[10/9] rounded-2xl overflow-hidden border border-cyan-500/35 bg-[#070B19] game-surface-lock"
        onPointerDown={(e) => {
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          triggerPrimaryDown();
        }}
        onPointerUp={triggerPrimaryUp}
        onPointerCancel={triggerPrimaryUp}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Adventure Runner'}
          subtitle={
            gameSlug === 'bridge-builder'
              ? 'Hold to extend your bridge beam, release to drop it across the gap!'
              : gameSlug === 'hook-swing'
              ? 'Hold to latch onto overhead anchors and swing forward; release to fly!'
              : 'Tap/Space to flip gravity or jump across floating neon platforms.'
          }
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
      {gameSlug === 'pixel-platformer' && (
        <div className="flex gap-2">
          <button
            type="button"
            onPointerDown={() => (keysRef.current.left = true)}
            onPointerUp={() => (keysRef.current.left = false)}
            onPointerLeave={() => (keysRef.current.left = false)}
            className="min-h-[48px] px-5 rounded-xl bg-white/10 text-xs font-bold text-white"
          >
            ← Run Left
          </button>
          <button
            type="button"
            onPointerDown={triggerPrimaryDown}
            className="min-h-[48px] px-6 rounded-xl bg-cyan-500/25 border border-cyan-400/50 text-xs font-bold text-cyan-200"
          >
            Jump ↑
          </button>
          <button
            type="button"
            onPointerDown={() => (keysRef.current.right = true)}
            onPointerUp={() => (keysRef.current.right = false)}
            onPointerLeave={() => (keysRef.current.right = false)}
            className="min-h-[48px] px-5 rounded-xl bg-white/10 text-xs font-bold text-white"
          >
            Run Right →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdventurePhysicsEngine;
