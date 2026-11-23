import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 400;
const H = 480;

export const RacingEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = '2d-car-racing' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { subscribeAction, reportModality } = useControls();

  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);
  const [speedDisplay, setSpeedDisplay] = useState(120);

  const statusRef = useRef<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const scoreRef = useRef(0);
  const endedRef = useRef(false);
  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  // Shared game entity state
  const stateRef = useRef({
    carX: W / 2,
    carVx: 0,
    carAngle: 0,
    speed: 240,
    roadOffset: 0,
    lapProgress: 0,
    bikeY: 320,
    bikeVy: 0,
    bikePitch: 0,
    onGround: true,
    terrainX: 0,
    obstacles: [] as Array<{ x: number; y: number; w: number; h: number; lane: number; color: string; passed?: boolean }>,
    spawnT: 0,
    driftChain: 0,
    driftTargetAngle: 0,
  });

  const reset = useCallback(
    (startImmediately = false) => {
      stateRef.current = {
        carX: W / 2,
        carVx: 0,
        carAngle: 0,
        speed: 240,
        roadOffset: 0,
        lapProgress: 0,
        bikeY: 300,
        bikeVy: 0,
        bikePitch: 0,
        onGround: true,
        terrainX: 0,
        obstacles: [],
        spawnT: 0.4,
        driftChain: 0,
        driftTargetAngle: 0,
      };
      scoreRef.current = 0;
      endedRef.current = false;
      setScore(0);
      setSpeedDisplay(120);
      onScoreChange(0);
      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keysRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
      if (statusRef.current === 'READY' && (e.key === ' ' || e.key === 'Enter')) reset(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keysRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [reset]);

  useEffect(() => {
    return subscribeAction((act) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      const st = stateRef.current;
      if (act === 'left') st.carX = Math.max(76, st.carX - 42);
      if (act === 'right') st.carX = Math.min(W - 76, st.carX + 42);
      if (act === 'up' || act === 'primary') st.speed = Math.min(460, st.speed + 40);
    });
  }, [ctx.isPaused, subscribeAction]);

  const finish = useCallback(() => {
    statusRef.current = 'GAME_OVER';
    setStatus('GAME_OVER');
    sfx.gameOver(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, [40, 40]);
    if (!endedRef.current) {
      endedRef.current = true;
      ctx.onScoreEnd(scoreRef.current, false);
    }
  }, [ctx]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const terrainHeightAt = (wx: number) => {
      return 340 + Math.sin(wx * 0.011) * 44 + Math.cos(wx * 0.005) * 26;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (gameSlug === 'bike-racing') {
          // 2D Side-scrolling Motocross hill-climb & flips
          const throttle = keysRef.current.up ? 310 : 185;
          st.speed += (throttle - st.speed) * 4 * dt;
          st.terrainX += st.speed * dt;
          const groundY = terrainHeightAt(st.terrainX + 110);

          if (!st.onGround) {
            st.bikeVy += 540 * dt;
            st.bikeY += st.bikeVy * dt;
            if (keysRef.current.left) st.bikePitch -= 3.9 * dt;
            if (keysRef.current.right) st.bikePitch += 3.9 * dt;
            if (Math.abs(st.bikePitch) > Math.PI * 1.85) {
              // Full backflip / frontflip bonus!
              st.bikePitch = 0;
              scoreRef.current += 150;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.merge(ctx.soundEnabled);
            }
          } else {
            const slope = (terrainHeightAt(st.terrainX + 125) - terrainHeightAt(st.terrainX + 95)) / 30;
            const targetAngle = Math.atan(slope);
            st.bikePitch += (targetAngle - st.bikePitch) * 8 * dt;
            if (keysRef.current.up && slope < -0.25) {
              // Launch off crest
              st.onGround = false;
              st.bikeVy = -190;
            }
          }

          if (st.bikeY >= groundY - 14) {
            // Check safe upright landing angle
            const norm = Math.atan2(Math.sin(st.bikePitch), Math.cos(st.bikePitch));
            if (!st.onGround && Math.abs(norm) > 1.35) {
              finish();
            } else {
              st.bikeY = groundY - 14;
              st.bikeVy = 0;
              st.onGround = true;
            }
          } else if (st.bikeY < groundY - 18) {
            st.onGround = false;
          }

          scoreRef.current += Math.round(st.speed * dt * 0.16);
          setScore(scoreRef.current);
          onScoreChange(scoreRef.current);
          setSpeedDisplay(Math.round(st.speed * 0.45));
        } else {
          // Top-down Racing / Traffic / Drift
          const boost = keysRef.current.up ? 130 : keysRef.current.down ? -75 : 0;
          const targetSpd = Math.min(480, 235 + scoreRef.current * 0.12 + boost);
          st.speed += (targetSpd - st.speed) * 3 * dt;
          st.roadOffset = (st.roadOffset + st.speed * dt) % 60;

          const steerAcc = gameSlug === 'drift-challenge' ? 880 : 1200;
          if (keysRef.current.left) st.carVx -= steerAcc * dt;
          if (keysRef.current.right) st.carVx += steerAcc * dt;
          const friction = gameSlug === 'drift-challenge' ? 0.94 : 0.85;
          st.carVx *= Math.pow(friction, dt * 60);
          st.carX += st.carVx * dt;

          if (gameSlug === 'drift-challenge') {
            st.carAngle = Math.max(-0.65, Math.min(0.65, st.carVx * 0.0022));
            if (Math.abs(st.carAngle) > 0.16) {
              st.driftChain += dt * 45;
            }
          } else {
            st.carAngle = Math.max(-0.22, Math.min(0.22, st.carVx * 0.001));
          }

          // Clamp to road track
          if (st.carX < 74 || st.carX > W - 74) {
            if (gameSlug === '2d-car-racing' || gameSlug === 'drift-challenge') {
              st.carX = Math.max(74, Math.min(W - 74, st.carX));
              st.carVx *= -0.4;
              st.speed = Math.max(150, st.speed - 60);
            } else {
              st.carX = Math.max(74, Math.min(W - 74, st.carX));
            }
          }

          // Spawn rivals / traffic / apex rings
          st.spawnT -= dt;
          if (st.spawnT <= 0) {
            st.spawnT = Math.max(0.45, 1.15 - scoreRef.current * 0.0005);
            const lane = Math.floor(Math.random() * 4);
            const laneX = 95 + lane * 70;
            const colors = ['#EF4444', '#F59E0B', '#A855F7', '#10B981'];
            st.obstacles.push({
              x: laneX,
              y: -50,
              w: 32,
              h: gameSlug === 'drift-challenge' ? 32 : 52,
              lane,
              color: colors[lane % colors.length],
            });
          }

          for (const ob of st.obstacles) {
            const relSpeed = gameSlug === 'drift-challenge' ? st.speed * 0.85 : st.speed * 0.65;
            ob.y += relSpeed * dt;

            if (gameSlug === 'drift-challenge') {
              // Drift target hoops give big bonus points on pass
              if (!ob.passed && Math.hypot(ob.x - st.carX, ob.y - (H - 84)) < 36) {
                ob.passed = true;
                scoreRef.current += 50 + Math.round(st.driftChain);
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.eat(ctx.soundEnabled);
              }
            } else {
              // Collision check
              if (Math.abs(ob.x - st.carX) < 28 && Math.abs(ob.y - (H - 84)) < 44) {
                finish();
                break;
              }
              // Near-miss bonus in Traffic Racer
              if (!ob.passed && ob.y > H - 60) {
                ob.passed = true;
                if (gameSlug === 'traffic-racer' && Math.abs(ob.x - st.carX) < 52) {
                  scoreRef.current += 25;
                  sfx.click(ctx.soundEnabled);
                }
              }
            }
          }

          st.obstacles = st.obstacles.filter((o) => o.y < H + 80);
          scoreRef.current += Math.round(st.speed * dt * 0.1);
          setScore(scoreRef.current);
          onScoreChange(scoreRef.current);
          setSpeedDisplay(Math.round(st.speed * 0.72));
        }
      }

      // Draw frame
      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);

        if (gameSlug === 'bike-racing') {
          // Stars sky
          c.fillStyle = 'rgba(0,229,255,0.25)';
          for (let i = 0; i < 16; i++) {
            const sx = ((i * 73 - st.terrainX * 0.15) % W + W) % W;
            c.fillRect(sx, 25 + (i % 5) * 28, 2, 2);
          }

          // Terrain curve
          c.beginPath();
          c.moveTo(0, H);
          for (let px = 0; px <= W; px += 10) {
            c.lineTo(px, terrainHeightAt(st.terrainX + px));
          }
          c.lineTo(W, H);
          c.closePath();
          c.fillStyle = '#111A36';
          c.fill();
          c.strokeStyle = '#10B981';
          c.lineWidth = 3;
          c.stroke();

          // Bike at x=110
          c.save();
          c.translate(110, st.bikeY);
          c.rotate(st.bikePitch);
          c.strokeStyle = '#00E5FF';
          c.lineWidth = 3;
          c.beginPath();
          c.arc(-14, 10, 9, 0, Math.PI * 2);
          c.arc(14, 10, 9, 0, Math.PI * 2);
          c.stroke();
          c.fillStyle = '#10B981';
          c.fillRect(-16, -6, 32, 10);
          c.fillStyle = '#F59E0B';
          c.beginPath();
          c.arc(-2, -14, 6, 0, Math.PI * 2);
          c.fill();
          c.restore();
        } else {
          // Track asphalt
          c.fillStyle = '#11172D';
          c.fillRect(54, 0, W - 108, H);

          // Neon curbs
          for (let y = -60; y < H + 60; y += 60) {
            const cy = y + st.roadOffset;
            c.fillStyle = Math.floor((y + st.roadOffset) / 60) % 2 === 0 ? '#00E5FF' : '#7C3AED';
            c.fillRect(46, cy, 8, 30);
            c.fillRect(W - 54, cy, 8, 30);
          }

          // Dashed lane lines
          c.strokeStyle = 'rgba(255,255,255,0.22)';
          c.lineWidth = 2;
          c.setLineDash([22, 24]);
          c.lineDashOffset = -st.roadOffset;
          [130, 200, 270].forEach((lx) => {
            c.beginPath();
            c.moveTo(lx, 0);
            c.lineTo(lx, H);
            c.stroke();
          });
          c.setLineDash([]);

          // Obstacles / Drift Rings
          for (const ob of st.obstacles) {
            if (gameSlug === 'drift-challenge') {
              c.strokeStyle = ob.passed ? '#10B981' : '#A855F7';
              c.lineWidth = 4;
              c.beginPath();
              c.arc(ob.x, ob.y, 18, 0, Math.PI * 2);
              c.stroke();
            } else {
              c.fillStyle = ob.color;
              c.beginPath();
              c.roundRect(ob.x - 16, ob.y - 26, 32, 52, 7);
              c.fill();
              c.fillStyle = '#070B19';
              c.fillRect(ob.x - 11, ob.y - 12, 22, 12);
            }
          }

          // Player car
          c.save();
          c.translate(st.carX, H - 84);
          c.rotate(st.carAngle);
          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.roundRect(-16, -27, 32, 54, 8);
          c.fill();
          c.fillStyle = '#070B19';
          c.fillRect(-11, -15, 22, 14);
          c.fillStyle = '#FFFFFF';
          c.fillRect(-13, -27, 6, 4);
          c.fillRect(7, -27, 6, 4);
          c.restore();
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, finish, gameSlug, onScoreChange]);

  const titleMap: Record<string, string> = {
    '2d-car-racing': 'Apex 2D Car Racing',
    'traffic-racer': 'Highway Traffic Racer',
    'drift-challenge': 'Neon Drift Challenge',
    'bike-racing': 'Moto Stunt Bike Racing',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>{speedDisplay} km/h</span>
        <span>Score: {score}</span>
      </div>

      <div
        className="relative w-full aspect-[5/6] rounded-2xl overflow-hidden border border-cyan-500/35 bg-[#070B19] game-surface-lock"
        onPointerDown={(e) => {
          if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width;
          if (gameSlug === 'bike-racing') {
            keysRef.current.up = true;
          } else {
            keysRef.current.left = relX < 0.5;
            keysRef.current.right = relX >= 0.5;
          }
        }}
        onPointerUp={() => {
          keysRef.current.left = false;
          keysRef.current.right = false;
          keysRef.current.up = false;
        }}
        onPointerCancel={() => {
          keysRef.current.left = false;
          keysRef.current.right = false;
          keysRef.current.up = false;
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Neon Racing'}
          subtitle={
            gameSlug === 'bike-racing'
              ? 'Hold throttle to climb and use Left/Right to pull clean flips!'
              : 'Steer Left/Right to weave traffic or nail neon drift apexes.'
          }
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
          {gameSlug === 'bike-racing' ? '↺ Lean Back' : '← Steer Left'}
        </button>
        <button
          type="button"
          onPointerDown={() => (keysRef.current.up = true)}
          onPointerUp={() => (keysRef.current.up = false)}
          onPointerLeave={() => (keysRef.current.up = false)}
          className="min-h-[48px] px-5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-xs font-bold text-cyan-200"
        >
          {gameSlug === 'bike-racing' ? 'Throttle ⚡' : 'Nitro ⚡'}
        </button>
        <button
          type="button"
          onPointerDown={() => (keysRef.current.right = true)}
          onPointerUp={() => (keysRef.current.right = false)}
          onPointerLeave={() => (keysRef.current.right = false)}
          className="min-h-[48px] px-5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-white"
        >
          {gameSlug === 'bike-racing' ? 'Lean Fwd ↻' : 'Steer Right →'}
        </button>
      </div>
    </div>
  );
};

export default RacingEngine;
