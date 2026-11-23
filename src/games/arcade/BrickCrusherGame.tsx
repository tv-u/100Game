import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 380;
const H = 480;
const COLS = 6;
const CELL = 56;
const OFFSET_X = 22;

interface Brick {
  col: number;
  row: number;
  hp: number;
  isOrb?: boolean;
}

const BrickCrusherGame: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'brick-crusher',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);
  const [ballCount, setBallCount] = useState(3);

  const statusRef = useRef(status);
  statusRef.current = status;
  const endedRef = useRef(false);

  const launcherXRef = useRef(W / 2);
  const aimAngleRef = useRef(-Math.PI / 2);
  const shootingRef = useRef(false);
  const ballsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number }>>([]);
  const queueRef = useRef(0);
  const queueCdRef = useRef(0);
  const bricksRef = useRef<Brick[]>([]);
  const ballCountRef = useRef(3);
  const waveRef = useRef(1);
  const scoreRef = useRef(0);

  const spawnRow = useCallback((wave: number) => {
    for (const b of bricksRef.current) b.row += 1;
    for (let c = 0; c < COLS; c++) {
      const r = Math.random();
      if (r < 0.18) {
        bricksRef.current.push({ col: c, row: 1, hp: 1, isOrb: true });
      } else if (r < 0.72) {
        bricksRef.current.push({ col: c, row: 1, hp: wave + Math.floor(Math.random() * 2) });
      }
    }
    if (bricksRef.current.some((b) => !b.isOrb && b.row >= 7)) {
      statusRef.current = 'GAME_OVER';
      setStatus('GAME_OVER');
      sfx.gameOver(ctx.soundEnabled);
      if (!endedRef.current) {
        endedRef.current = true;
        ctx.onScoreEnd(scoreRef.current, false);
      }
    }
  }, [ctx]);

  const reset = useCallback(
    (autoStart = false) => {
      bricksRef.current = [];
      ballsRef.current = [];
      shootingRef.current = false;
      launcherXRef.current = W / 2;
      ballCountRef.current = 3;
      waveRef.current = 1;
      scoreRef.current = 0;
      endedRef.current = false;
      setBallCount(3);
      setScore(0);
      onScoreChange(0);
      spawnRow(1);
      const next = autoStart ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange, spawnRow]
  );

  useEffect(() => {
    if (ctx.restartKey > 0) reset(false);
  }, [ctx.restartKey, reset]);

  const fireVolley = useCallback(() => {
    if (ctx.isPaused || statusRef.current !== 'PLAYING' || shootingRef.current) return;
    shootingRef.current = true;
    queueRef.current = ballCountRef.current;
    queueCdRef.current = 0;
  }, [ctx.isPaused]);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.03, (now - prev) / 1000);
      prev = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused && shootingRef.current) {
        if (queueRef.current > 0) {
          queueCdRef.current -= dt;
          if (queueCdRef.current <= 0) {
            queueCdRef.current = 0.08;
            queueRef.current -= 1;
            const ang = aimAngleRef.current;
            ballsRef.current.push({
              x: launcherXRef.current,
              y: H - 24,
              vx: Math.cos(ang) * 440,
              vy: Math.sin(ang) * 440,
            });
          }
        }

        for (const ball of ballsRef.current) {
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          if (ball.x < 8) {
            ball.x = 8;
            ball.vx = Math.abs(ball.vx);
          } else if (ball.x > W - 8) {
            ball.x = W - 8;
            ball.vx = -Math.abs(ball.vx);
          }
          if (ball.y < 8) {
            ball.y = 8;
            ball.vy = Math.abs(ball.vy);
          }

          for (const br of bricksRef.current) {
            if (br.hp <= 0) continue;
            const bx = OFFSET_X + br.col * CELL + 4;
            const by = 24 + br.row * 44 + 4;
            const bw = CELL - 8;
            const bh = 36;
            if (br.isOrb) {
              if (Math.hypot(ball.x - (bx + bw / 2), ball.y - (by + bh / 2)) < 18) {
                br.hp = 0;
                ballCountRef.current += 1;
                setBallCount(ballCountRef.current);
                sfx.eat(ctx.soundEnabled);
              }
            } else if (ball.x + 6 > bx && ball.x - 6 < bx + bw && ball.y + 6 > by && ball.y - 6 < by + bh) {
              br.hp -= 1;
              scoreRef.current += 10;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.bounce(ctx.soundEnabled);
              const overlapX = Math.min(ball.x + 6 - bx, bx + bw - (ball.x - 6));
              const overlapY = Math.min(ball.y + 6 - by, by + bh - (ball.y - 6));
              if (overlapX < overlapY) ball.vx = -ball.vx;
              else ball.vy = -ball.vy;
              break;
            }
          }
        }

        bricksRef.current = bricksRef.current.filter((b) => b.hp > 0);
        ballsRef.current = ballsRef.current.filter((b) => b.y < H - 14);

        if (queueRef.current === 0 && ballsRef.current.length === 0) {
          shootingRef.current = false;
          waveRef.current += 1;
          spawnRow(waveRef.current);
        }
      }

      const c = canvasRef.current?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);

        for (const br of bricksRef.current) {
          const bx = OFFSET_X + br.col * CELL + 4;
          const by = 24 + br.row * 44 + 4;
          const bw = CELL - 8;
          const bh = 36;
          if (br.isOrb) {
            c.strokeStyle = '#10B981';
            c.lineWidth = 2.5;
            c.beginPath();
            c.arc(bx + bw / 2, by + bh / 2, 11, 0, Math.PI * 2);
            c.stroke();
          } else {
            c.fillStyle = br.hp > 4 ? '#EC4899' : br.hp > 2 ? '#8B5CF6' : '#3B82F6';
            c.beginPath();
            c.roundRect(bx, by, bw, bh, 7);
            c.fill();
            c.fillStyle = '#FFFFFF';
            c.font = 'bold 14px monospace';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(String(br.hp), bx + bw / 2, by + bh / 2);
          }
        }

        if (!shootingRef.current && statusRef.current === 'PLAYING') {
          c.strokeStyle = 'rgba(0,229,255,0.5)';
          c.setLineDash([5, 5]);
          c.beginPath();
          c.moveTo(launcherXRef.current, H - 24);
          c.lineTo(launcherXRef.current + Math.cos(aimAngleRef.current) * 140, H - 24 + Math.sin(aimAngleRef.current) * 140);
          c.stroke();
          c.setLineDash([]);
        }

        c.fillStyle = '#00E5FF';
        c.beginPath();
        c.arc(launcherXRef.current, H - 24, 8, 0, Math.PI * 2);
        c.fill();
        for (const b of ballsRef.current) {
          c.beginPath();
          c.arc(b.x, b.y, 6, 0, Math.PI * 2);
          c.fill();
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, onScoreChange, spawnRow]);

  const updateAim = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const ang = Math.atan2(Math.min(H - 55, py) - (H - 24), px - launcherXRef.current);
    aimAngleRef.current = Math.max(-Math.PI + 0.2, Math.min(-0.2, ang));
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-3">
      <div className="w-full flex justify-between text-xs font-mono text-slate-300 px-1">
        <span>Balls: {ballCount}</span>
        <span>Score: {score}</span>
      </div>
      <div
        className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-rose-500/35 bg-[#070B19] game-surface-lock cursor-crosshair"
        onPointerMove={updateAim}
        onPointerDown={(e) => {
          updateAim(e);
          fireVolley();
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title="Brick Crusher DX"
          subtitle="Aim upward and tap to unleash a multi-ball volley against descending neon bricks."
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default BrickCrusherGame;
