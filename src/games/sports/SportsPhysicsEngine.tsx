import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 400;
const H = 460;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  active: boolean;
}

export const SportsPhysicsEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'mini-golf' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reportModality } = useControls();

  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);
  const [roundInfo, setRoundInfo] = useState('Round 1');

  const statusRef = useRef<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const scoreRef = useRef(0);
  const endedRef = useRef(false);

  const dragRef = useRef<{ active: boolean; sx: number; sy: number; cx: number; cy: number }>({
    active: false,
    sx: 0,
    sy: 0,
    cx: 0,
    cy: 0,
  });

  const simRef = useRef({
    hole: 1,
    shotsLeft: 10,
    ball: { x: 200, y: 380, vx: 0, vy: 0, r: 10, color: '#FFFFFF', active: true } as Ball,
    targets: [] as Ball[],
    targetX: 200,
    targetY: 75,
    keeperX: 200,
    keeperDir: 1,
    paddleX: 200,
    aiPaddleX: 200,
    playerPts: 0,
    aiPts: 0,
    pins: [] as Array<{ x: number; y: number; down: boolean }>,
    laneOffset: 0,
    bowlRollDone: false,
  });

  const setupRound = useCallback(
    (holeNum = 1) => {
      const s = simRef.current;
      s.hole = holeNum;
      if (gameSlug === 'mini-golf') {
        s.ball = { x: 200, y: 390, vx: 0, vy: 0, r: 10, color: '#FFFFFF', active: true };
        s.targetX = 80 + ((holeNum * 79) % 240);
        s.targetY = 66;
        setRoundInfo(`Hole ${holeNum}/5`);
      } else if (gameSlug === 'basketball-shots') {
        s.ball = { x: 200, y: 390, vx: 0, vy: 0, r: 14, color: '#F97316', active: true };
        s.targetX = holeNum > 2 ? 120 + ((holeNum * 53) % 160) : 200;
        s.targetY = 120;
        setRoundInfo(`Shots Left: ${s.shotsLeft}`);
      } else if (gameSlug === 'penalty-shootout') {
        s.ball = { x: 200, y: 390, vx: 0, vy: 0, r: 12, color: '#FFFFFF', active: true };
        setRoundInfo(`Kick ${6 - Math.min(5, s.shotsLeft)}/5`);
      } else if (gameSlug === 'table-tennis') {
        s.ball = { x: 200, y: 230, vx: 170, vy: 220, r: 8, color: '#FFFFFF', active: true };
        setRoundInfo(`You ${s.playerPts} – ${s.aiPts} AI`);
      } else if (gameSlug === 'bowling') {
        s.ball = { x: 200, y: 400, vx: 0, vy: 0, r: 14, color: '#8B5CF6', active: true };
        s.bowlRollDone = false;
        if (holeNum === 1 || s.pins.every((p) => p.down)) {
          s.pins = [];
          const rows = [4, 3, 2, 1];
          rows.forEach((count, rIdx) => {
            for (let i = 0; i < count; i++) {
              s.pins.push({ x: 200 + (i - (count - 1) / 2) * 26, y: 74 + rIdx * 22, down: false });
            }
          });
        }
        setRoundInfo(`Frame ${holeNum}/6`);
      } else if (gameSlug === 'pool-billiards') {
        s.ball = { x: 200, y: 360, vx: 0, vy: 0, r: 10, color: '#FFFFFF', active: true };
        if (holeNum === 1) {
          const colors = ['#F59E0B', '#3B82F6', '#EF4444', '#A855F7', '#10B981', '#EC4899'];
          s.targets = [];
          let idx = 0;
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c <= r; c++) {
              s.targets.push({
                x: 200 + (c - r / 2) * 23,
                y: 120 - r * 20,
                vx: 0,
                vy: 0,
                r: 10,
                color: colors[idx % colors.length],
                active: true,
              });
              idx++;
            }
          }
        }
        setRoundInfo(`Shots Left: ${s.shotsLeft}`);
      }
    },
    [gameSlug]
  );

  const reset = useCallback(
    (startImmediately = false) => {
      simRef.current = {
        hole: 1,
        shotsLeft: gameSlug === 'pool-billiards' ? 12 : gameSlug === 'penalty-shootout' ? 5 : 8,
        ball: { x: 200, y: 380, vx: 0, vy: 0, r: 10, color: '#FFFFFF', active: true },
        targets: [],
        targetX: 200,
        targetY: 80,
        keeperX: 200,
        keeperDir: 1,
        paddleX: 200,
        aiPaddleX: 200,
        playerPts: 0,
        aiPts: 0,
        pins: [],
        laneOffset: 0,
        bowlRollDone: false,
      };
      setupRound(1);
      scoreRef.current = 0;
      endedRef.current = false;
      setScore(0);
      onScoreChange(0);
      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [gameSlug, onScoreChange, setupRound]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  const finishGame = useCallback(
    (won: boolean) => {
      statusRef.current = won ? 'WON' : 'GAME_OVER';
      setStatus(won ? 'WON' : 'GAME_OVER');
      if (won) sfx.win(ctx.soundEnabled);
      else sfx.gameOver(ctx.soundEnabled);
      if (!endedRef.current) {
        endedRef.current = true;
        ctx.onScoreEnd(scoreRef.current, won);
      }
    },
    [ctx]
  );

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = simRef.current;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (gameSlug === 'table-tennis') {
          const b = s.ball;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < 28 + b.r || b.x > W - 28 - b.r) {
            b.vx *= -1;
            b.x = Math.max(28 + b.r, Math.min(W - 28 - b.r, b.x));
            sfx.bounce(ctx.soundEnabled);
          }

          // AI paddle tracking
          s.aiPaddleX += (b.x - s.aiPaddleX) * 5.2 * dt;
          s.aiPaddleX = Math.max(66, Math.min(W - 66, s.aiPaddleX));

          // Player bottom paddle
          if (b.vy > 0 && b.y >= H - 56 && b.y <= H - 38 && Math.abs(b.x - s.paddleX) < 46) {
            b.vy = -Math.min(480, Math.abs(b.vy) * 1.04 + 12);
            b.vx += (b.x - s.paddleX) * 4.5;
            scoreRef.current += 10;
            setScore(scoreRef.current);
            onScoreChange(scoreRef.current);
            sfx.bounce(ctx.soundEnabled);
          }

          // AI top paddle
          if (b.vy < 0 && b.y <= 56 && b.y >= 38 && Math.abs(b.x - s.aiPaddleX) < 44) {
            b.vy = Math.abs(b.vy) * 1.03;
            b.vx += (b.x - s.aiPaddleX) * 3;
            sfx.bounce(ctx.soundEnabled);
          }

          if (b.y < 14) {
            s.playerPts += 1;
            scoreRef.current += 100;
            setScore(scoreRef.current);
            onScoreChange(scoreRef.current);
            sfx.clear(ctx.soundEnabled);
            setRoundInfo(`You ${s.playerPts} – ${s.aiPts} AI`);
            if (s.playerPts >= 7) finishGame(true);
            else {
              b.x = 200;
              b.y = 230;
              b.vx = (Math.random() - 0.5) * 200;
              b.vy = 220;
            }
          } else if (b.y > H - 14) {
            s.aiPts += 1;
            sfx.gameOver(ctx.soundEnabled);
            setRoundInfo(`You ${s.playerPts} – ${s.aiPts} AI`);
            if (s.aiPts >= 7) finishGame(false);
            else {
              b.x = 200;
              b.y = 230;
              b.vx = (Math.random() - 0.5) * 200;
              b.vy = -220;
            }
          }
        } else if (gameSlug === 'basketball-shots') {
          const b = s.ball;
          if (Math.hypot(b.vx, b.vy) > 2) {
            b.vy += 650 * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < 24 || b.x > W - 24) b.vx *= -0.7;

            if (b.vy > 0 && Math.hypot(b.x - s.targetX, b.y - s.targetY) < 26) {
              scoreRef.current += 120;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.clear(ctx.soundEnabled);
              s.shotsLeft -= 1;
              if (s.shotsLeft <= 0) finishGame(true);
              else setupRound(s.hole + 1);
            } else if (b.y > H + 30) {
              s.shotsLeft -= 1;
              if (s.shotsLeft <= 0) finishGame(scoreRef.current >= 240);
              else setupRound(s.hole);
            }
          }
        } else if (gameSlug === 'penalty-shootout') {
          s.keeperX += s.keeperDir * 155 * dt;
          if (s.keeperX > 280) {
            s.keeperX = 280;
            s.keeperDir = -1;
          } else if (s.keeperX < 120) {
            s.keeperX = 120;
            s.keeperDir = 1;
          }

          const b = s.ball;
          if (Math.hypot(b.vx, b.vy) > 2) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.y <= 92) {
              const saved = Math.abs(b.x - s.keeperX) < 32;
              const onTarget = b.x >= 76 && b.x <= 324;
              if (onTarget && !saved) {
                scoreRef.current += 100;
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.clear(ctx.soundEnabled);
              } else {
                sfx.bounce(ctx.soundEnabled);
              }
              s.shotsLeft -= 1;
              if (s.shotsLeft <= 0) finishGame(scoreRef.current >= 300);
              else setupRound(s.hole + 1);
            }
          }
        } else if (gameSlug === 'bowling') {
          const b = s.ball;
          if (Math.hypot(b.vx, b.vy) > 4) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.x < 96 || b.x > W - 96) b.vx *= -0.4;
            for (const p of s.pins) {
              if (!p.down && Math.hypot(b.x - p.x, b.y - p.y) < 22) {
                p.down = true;
                scoreRef.current += 25;
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.eat(ctx.soundEnabled);
              }
            }
            if (b.y < 30) {
              b.vx = 0;
              b.vy = 0;
              if (s.hole >= 6) finishGame(true);
              else setupRound(s.hole + 1);
            }
          }
        } else {
          // Mini-golf and Pool Billiards 2D elastic physics
          const b = s.ball;
          const balls = gameSlug === 'pool-billiards' ? [b, ...s.targets.filter((t) => t.active)] : [b];
          for (const obj of balls) {
            obj.x += obj.vx * dt;
            obj.y += obj.vy * dt;
            obj.vx *= Math.pow(0.975, dt * 60);
            obj.vy *= Math.pow(0.975, dt * 60);
            if (Math.hypot(obj.vx, obj.vy) < 8) {
              obj.vx = 0;
              obj.vy = 0;
            }
            if (obj.x < 34 + obj.r || obj.x > W - 34 - obj.r) {
              obj.vx *= -0.86;
              obj.x = Math.max(34 + obj.r, Math.min(W - 34 - obj.r, obj.x));
              sfx.bounce(ctx.soundEnabled);
            }
            if (obj.y < 34 + obj.r || obj.y > H - 34 - obj.r) {
              obj.vy *= -0.86;
              obj.y = Math.max(34 + obj.r, Math.min(H - 34 - obj.r, obj.y));
              sfx.bounce(ctx.soundEnabled);
            }
          }

          if (gameSlug === 'mini-golf') {
            // Center bumper obstacle
            const bx = 200;
            const by = 220;
            if (Math.abs(b.x - bx) < 55 && Math.abs(b.y - by) < 18) {
              b.vy *= -0.9;
              b.y += b.y < by ? -6 : 6;
              sfx.bounce(ctx.soundEnabled);
            }
            if (Math.hypot(b.x - s.targetX, b.y - s.targetY) < 18) {
              scoreRef.current += 150;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.clear(ctx.soundEnabled);
              if (s.hole >= 5) finishGame(true);
              else setupRound(s.hole + 1);
            }
          } else if (gameSlug === 'pool-billiards') {
            for (let i = 0; i < balls.length; i++) {
              for (let j = i + 1; j < balls.length; j++) {
                const a = balls[i];
                const c = balls[j];
                const dx = c.x - a.x;
                const dy = c.y - a.y;
                const dist = Math.hypot(dx, dy);
                const minD = a.r + c.r;
                if (dist > 0 && dist < minD) {
                  const nx = dx / dist;
                  const ny = dy / dist;
                  const overlap = (minD - dist) * 0.5;
                  a.x -= nx * overlap;
                  a.y -= ny * overlap;
                  c.x += nx * overlap;
                  c.y += ny * overlap;
                  const p = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
                  if (p > 0) {
                    a.vx -= p * nx;
                    a.vy -= p * ny;
                    c.vx += p * nx;
                    c.vy += p * ny;
                    sfx.bounce(ctx.soundEnabled);
                  }
                }
              }
            }
            const pockets = [
              [34, 34],
              [W - 34, 34],
              [34, H / 2],
              [W - 34, H / 2],
              [34, H - 34],
              [W - 34, H - 34],
            ];
            for (const t of s.targets) {
              if (!t.active) continue;
              if (pockets.some(([px, py]) => Math.hypot(t.x - px, t.y - py) < 22)) {
                t.active = false;
                scoreRef.current += 100;
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.eat(ctx.soundEnabled);
              }
            }
            if (s.targets.every((t) => !t.active)) {
              finishGame(true);
            }
          }
        }
      }

      // Render canvas
      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = gameSlug === 'pool-billiards' || gameSlug === 'mini-golf' ? '#0B2820' : '#081024';
        c.fillRect(0, 0, W, H);

        if (gameSlug === 'bowling') {
          c.fillStyle = '#151E3A';
          c.fillRect(88, 20, W - 176, H - 40);
          c.strokeStyle = '#8B5CF6';
          c.lineWidth = 3;
          c.strokeRect(88, 20, W - 176, H - 40);
          for (const p of s.pins) {
            if (!p.down) {
              c.fillStyle = '#FFFFFF';
              c.beginPath();
              c.arc(p.x, p.y, 7, 0, Math.PI * 2);
              c.fill();
              c.fillStyle = '#EF4444';
              c.fillRect(p.x - 4, p.y - 2, 8, 2);
            }
          }
        } else if (gameSlug === 'table-tennis') {
          c.strokeStyle = 'rgba(0,229,255,0.4)';
          c.lineWidth = 3;
          c.strokeRect(26, 20, W - 52, H - 40);
          c.beginPath();
          c.moveTo(26, H / 2);
          c.lineTo(W - 26, H / 2);
          c.stroke();

          c.fillStyle = '#EF4444';
          c.beginPath();
          c.roundRect(s.aiPaddleX - 38, 38, 76, 12, 6);
          c.fill();

          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.roundRect(s.paddleX - 38, H - 50, 76, 12, 6);
          c.fill();
        } else if (gameSlug === 'basketball-shots') {
          c.strokeStyle = '#F97316';
          c.lineWidth = 4;
          c.strokeRect(s.targetX - 34, s.targetY - 22, 68, 44);
          c.strokeStyle = '#FFFFFF';
          c.beginPath();
          c.moveTo(s.targetX - 24, s.targetY);
          c.lineTo(s.targetX + 24, s.targetY);
          c.stroke();
        } else if (gameSlug === 'penalty-shootout') {
          c.strokeStyle = '#FFFFFF';
          c.lineWidth = 4;
          c.strokeRect(72, 42, 256, 54);
          c.fillStyle = '#F59E0B';
          c.beginPath();
          c.roundRect(s.keeperX - 24, 72, 48, 22, 6);
          c.fill();
        } else {
          // Golf / Pool frame
          c.strokeStyle = gameSlug === 'pool-billiards' ? '#92400E' : '#10B981';
          c.lineWidth = 10;
          c.strokeRect(24, 24, W - 48, H - 48);

          if (gameSlug === 'mini-golf') {
            c.fillStyle = '#020617';
            c.beginPath();
            c.arc(s.targetX, s.targetY, 15, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#00E5FF';
            c.fillRect(150, 212, 100, 16);
          } else {
            const pockets = [
              [34, 34],
              [W - 34, 34],
              [34, H / 2],
              [W - 34, H / 2],
              [34, H - 34],
              [W - 34, H - 34],
            ];
            c.fillStyle = '#020617';
            for (const [px, py] of pockets) {
              c.beginPath();
              c.arc(px, py, 16, 0, Math.PI * 2);
              c.fill();
            }
            for (const t of s.targets) {
              if (!t.active) continue;
              c.fillStyle = t.color;
              c.beginPath();
              c.arc(t.x, t.y, t.r, 0, Math.PI * 2);
              c.fill();
            }
          }
        }

        // Aim guide when dragging
        if (dragRef.current.active && gameSlug !== 'table-tennis') {
          c.strokeStyle = 'rgba(0,229,255,0.75)';
          c.lineWidth = 2;
          c.setLineDash([6, 6]);
          c.beginPath();
          c.moveTo(s.ball.x, s.ball.y);
          if (gameSlug === 'penalty-shootout' || gameSlug === 'basketball-shots' || gameSlug === 'bowling') {
            c.lineTo(dragRef.current.cx, dragRef.current.cy);
          } else {
            c.lineTo(s.ball.x + (s.ball.x - dragRef.current.cx) * 1.4, s.ball.y + (s.ball.y - dragRef.current.cy) * 1.4);
          }
          c.stroke();
          c.setLineDash([]);
        }

        // Main ball
        c.fillStyle = s.ball.color;
        c.beginPath();
        c.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
        c.fill();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, finishGame, gameSlug, onScoreChange, setupRound]);

  const toCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const titleMap: Record<string, string> = {
    'mini-golf': 'Mini Golf Neon Putt',
    'basketball-shots': 'Arc Basketball Shots',
    'penalty-shootout': 'Penalty Kick Shootout',
    'table-tennis': 'Turbo Table Tennis',
    bowling: 'Neon Strike Bowling',
    'pool-billiards': '8-Ball Pool & Billiards',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>{roundInfo}</span>
        <span>Score: {score}</span>
      </div>

      <div
        className="relative w-full aspect-[10/11.5] rounded-2xl overflow-hidden border border-emerald-500/35 bg-[#070B19] game-surface-lock"
        onPointerDown={(e) => {
          if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          const p = toCanvas(e);
          if (gameSlug === 'table-tennis') {
            simRef.current.paddleX = Math.max(66, Math.min(W - 66, p.x));
            return;
          }
          if (Math.hypot(simRef.current.ball.vx, simRef.current.ball.vy) > 15) return;
          dragRef.current = { active: true, sx: p.x, sy: p.y, cx: p.x, cy: p.y };
        }}
        onPointerMove={(e) => {
          if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
          const p = toCanvas(e);
          if (gameSlug === 'table-tennis') {
            simRef.current.paddleX = Math.max(66, Math.min(W - 66, p.x));
          } else if (dragRef.current.active) {
            dragRef.current.cx = p.x;
            dragRef.current.cy = p.y;
          }
        }}
        onPointerUp={(e) => {
          if (!dragRef.current.active) return;
          const p = toCanvas(e);
          dragRef.current.active = false;
          const s = simRef.current;
          if (gameSlug === 'penalty-shootout' || gameSlug === 'basketball-shots' || gameSlug === 'bowling') {
            const dx = p.x - s.ball.x;
            const dy = Math.min(-140, p.y - s.ball.y);
            s.ball.vx = dx * 2.1;
            s.ball.vy = dy * 2.2;
          } else {
            const dx = s.ball.x - p.x;
            const dy = s.ball.y - p.y;
            s.ball.vx = Math.max(-540, Math.min(540, dx * 4.2));
            s.ball.vy = Math.max(-540, Math.min(540, dy * 4.2));
            if (gameSlug === 'pool-billiards') {
              s.shotsLeft -= 1;
              setRoundInfo(`Shots Left: ${s.shotsLeft}`);
              if (s.shotsLeft <= 0 && !s.targets.every((t) => !t.active)) {
                setTimeout(() => {
                  if (statusRef.current === 'PLAYING') finishGame(false);
                }, 1400);
              }
            }
          }
          triggerHaptic(ctx.hapticsEnabled, 14);
          sfx.click(ctx.soundEnabled);
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Sports Arena'}
          subtitle={
            gameSlug === 'table-tennis'
              ? 'Slide your paddle smoothly across the bottom edge to win points to 7.'
              : 'Drag from the ball to aim your shot or flick forward cleanly!'
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

export default SportsPhysicsEngine;
