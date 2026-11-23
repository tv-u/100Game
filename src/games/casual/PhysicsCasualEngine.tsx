import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 380;
const H = 440;

const COLORS = ['#00E5FF', '#A855F7', '#10B981', '#F59E0B', '#EC4899'];

export const PhysicsCasualEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'stack-tower' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reportModality } = useControls();

  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);
  const [info, setInfo] = useState('');

  // Bubble Pop grid state
  const [popGrid, setPopGrid] = useState<number[][]>([]);
  const [popTimer, setPopTimer] = useState(60);

  const statusRef = useRef<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const scoreRef = useRef(0);
  const endedRef = useRef(false);

  // Canvas-based casual physics state
  const stRef = useRef({
    // Stack tower
    slabs: [] as Array<{ x: number; w: number; color: string }>,
    movingX: 80,
    movingW: 160,
    movingDir: 1,
    movingSpeed: 185,
    streak: 0,
    // Helix jump
    helixAngle: 0,
    ballY: 160,
    ballVy: 0,
    rings: [] as Array<{ y: number; gapStart: number; gapSize: number; hazardStart: number; passed: boolean }>,
    // Paper plane
    planeY: 200,
    planeVy: 0,
    pitch: 0,
    gates: [] as Array<{ x: number; y: number; passed: boolean }>,
    // Rope cut / Physics drop
    orbX: 190,
    orbY: 90,
    orbVx: 0,
    orbVy: 0,
    ropes: [] as Array<{ x: number; y: number; len: number; intact: boolean }>,
    cupX: 190,
    cupY: 390,
    ramps: [] as Array<{ x1: number; y1: number; x2: number; y2: number }>,
    drawingRamp: null as { x1: number; y1: number; x2: number; y2: number } | null,
    ballDropped: false,
    stage: 1,
  });

  const makePopGrid = () =>
    Array.from({ length: 8 }, () => Array.from({ length: 7 }, () => Math.floor(Math.random() * 4)));

  const reset = useCallback(
    (startImmediately = false) => {
      scoreRef.current = 0;
      endedRef.current = false;
      setScore(0);
      onScoreChange(0);

      if (gameSlug === 'bubble-pop') {
        setPopGrid(makePopGrid());
        setPopTimer(45);
        setInfo('45s');
      } else {
        stRef.current = {
          slabs: [{ x: 110, w: 160, color: '#00E5FF' }],
          movingX: 40,
          movingW: 160,
          movingDir: 1,
          movingSpeed: 195,
          streak: 0,
          helixAngle: 0,
          ballY: 140,
          ballVy: 0,
          rings: Array.from({ length: 8 }, (_, i) => ({
            y: 230 + i * 70,
            gapStart: (i * 1.1) % (Math.PI * 2),
            gapSize: 1.25,
            hazardStart: (i * 1.1 + 2.4) % (Math.PI * 2),
            passed: false,
          })),
          planeY: 200,
          planeVy: 0,
          pitch: 0,
          gates: Array.from({ length: 5 }, (_, i) => ({
            x: 340 + i * 160,
            y: 90 + ((i * 73) % 240),
            passed: false,
          })),
          orbX: 190,
          orbY: 96,
          orbVx: 45,
          orbVy: 0,
          ropes: [
            { x: 115, y: 20, len: 105, intact: true },
            { x: 265, y: 20, len: 105, intact: true },
          ],
          cupX: 190,
          cupY: 392,
          ramps: [],
          drawingRamp: null,
          ballDropped: gameSlug === 'rope-cut',
          stage: 1,
        };
        setInfo(gameSlug === 'physics-drop' ? 'Draw ramp then Drop' : 'Stage 1');
      }

      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [gameSlug, onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  const finish = useCallback(
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

  // Bubble Pop countdown
  useEffect(() => {
    if (gameSlug !== 'bubble-pop' || status !== 'PLAYING' || ctx.isPaused) return;
    const id = window.setInterval(() => {
      setPopTimer((prev) => {
        if (prev <= 1) {
          finish(true);
          return 0;
        }
        setInfo(`${prev - 1}s`);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ctx.isPaused, finish, gameSlug, status]);

  // Bubble Pop cluster tap
  const tapBubble = (r: number, c: number) => {
    if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
    const target = popGrid[r][c];
    if (target < 0) return;

    const visited = new Set<string>();
    const stack: Array<[number, number]> = [[r, c]];
    const group: Array<[number, number]> = [];
    while (stack.length > 0) {
      const [cr, cc] = stack.pop()!;
      const k = `${cr},${cc}`;
      if (visited.has(k)) continue;
      visited.add(k);
      if (cr < 0 || cr >= popGrid.length || cc < 0 || cc >= popGrid[0].length) continue;
      if (popGrid[cr][cc] !== target) continue;
      group.push([cr, cc]);
      stack.push([cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]);
    }
    if (group.length < 2) return;

    const next = popGrid.map((row) => [...row]);
    for (const [gr, gc] of group) next[gr][gc] = -1;

    // Gravity collapse & fill top
    for (let col = 0; col < 7; col++) {
      const colVals: number[] = [];
      for (let row = 7; row >= 0; row--) {
        if (next[row][col] >= 0) colVals.push(next[row][col]);
      }
      for (let row = 7; row >= 0; row--) {
        next[row][col] = colVals[7 - row] ?? Math.floor(Math.random() * 4);
      }
    }

    setPopGrid(next);
    const pts = group.length * group.length * 5;
    scoreRef.current += pts;
    setScore(scoreRef.current);
    onScoreChange(scoreRef.current);
    sfx.eat(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, 12);
  };

  // Stack Tower tap drop
  const dropSlab = useCallback(() => {
    if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
    const s = stRef.current;
    const prev = s.slabs[s.slabs.length - 1];
    const overlapLeft = Math.max(prev.x, s.movingX);
    const overlapRight = Math.min(prev.x + prev.w, s.movingX + s.movingW);
    const overlap = overlapRight - overlapLeft;

    if (overlap <= 4) {
      finish(false);
      return;
    }

    let finalX = overlapLeft;
    let finalW = overlap;
    if (Math.abs(s.movingX - prev.x) < 9) {
      finalX = prev.x;
      finalW = Math.min(180, prev.w + 4);
      s.streak += 1;
      sfx.merge(ctx.soundEnabled);
    } else {
      s.streak = 0;
      sfx.click(ctx.soundEnabled);
    }

    s.slabs.push({ x: finalX, w: finalW, color: COLORS[s.slabs.length % COLORS.length] });
    s.movingW = finalW;
    s.movingSpeed = Math.min(360, 195 + s.slabs.length * 6);
    scoreRef.current += 25 + s.streak * 10;
    setScore(scoreRef.current);
    onScoreChange(scoreRef.current);
    setInfo(`Height ${s.slabs.length}`);
    triggerHaptic(ctx.hapticsEnabled, 14);
  }, [ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled, finish, onScoreChange]);

  useEffect(() => {
    if (gameSlug === 'bubble-pop') return;
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      if (gameSlug === 'stack-tower' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        dropSlab();
      } else if (gameSlug === 'helix-jump') {
        if (e.key === 'ArrowLeft' || e.key === 'a') stRef.current.helixAngle -= 0.25;
        if (e.key === 'ArrowRight' || e.key === 'd') stRef.current.helixAngle += 0.25;
      } else if (gameSlug === 'paper-plane') {
        if (e.key === 'ArrowUp' || e.key === 'w') stRef.current.pitch = -0.35;
        if (e.key === 'ArrowDown' || e.key === 's') stRef.current.pitch = 0.35;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx.isPaused, dropSlab, gameSlug]);

  useEffect(() => {
    if (gameSlug === 'bubble-pop') return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const s = stRef.current;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (gameSlug === 'stack-tower') {
          s.movingX += s.movingDir * s.movingSpeed * dt;
          if (s.movingX + s.movingW > W - 16) {
            s.movingX = W - 16 - s.movingW;
            s.movingDir = -1;
          } else if (s.movingX < 16) {
            s.movingX = 16;
            s.movingDir = 1;
          }
        } else if (gameSlug === 'helix-jump') {
          s.ballVy += 640 * dt;
          s.ballY += s.ballVy * dt;
          for (const r of s.rings) {
            if (!r.passed && s.ballY >= r.y - 10 && s.ballY <= r.y + 12 && s.ballVy > 0) {
              // Check ball angle relative to ring
              const ballAng = ((Math.PI / 2 - s.helixAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              const inGap = Math.abs(Math.atan2(Math.sin(ballAng - r.gapStart), Math.cos(ballAng - r.gapStart))) < r.gapSize * 0.5;
              const inHazard = Math.abs(Math.atan2(Math.sin(ballAng - r.hazardStart), Math.cos(ballAng - r.hazardStart))) < 0.48;
              if (inGap) {
                r.passed = true;
                scoreRef.current += 35;
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.eat(ctx.soundEnabled);
              } else if (inHazard) {
                finish(false);
                break;
              } else {
                s.ballY = r.y - 10;
                s.ballVy = -280;
                sfx.bounce(ctx.soundEnabled);
              }
            }
          }
          // Scroll rings upward as ball drops past center
          if (s.ballY > 230) {
            const shift = s.ballY - 230;
            s.ballY = 230;
            for (const r of s.rings) r.y -= shift;
          }
          if (s.rings.length > 0 && s.rings[0].y < -30) {
            s.rings.shift();
            const lastY = s.rings[s.rings.length - 1].y;
            const gStart = Math.random() * Math.PI * 2;
            s.rings.push({
              y: lastY + 70,
              gapStart: gStart,
              gapSize: 1.25,
              hazardStart: (gStart + 2.2) % (Math.PI * 2),
              passed: false,
            });
          }
        } else if (gameSlug === 'paper-plane') {
          s.planeVy += (s.pitch * 380 + 45) * dt;
          s.planeVy *= 0.96;
          s.planeY += s.planeVy * dt;
          s.pitch *= 0.94;
          if (s.planeY < 20 || s.planeY > H - 20) finish(false);
          for (const g of s.gates) {
            g.x -= 175 * dt;
            if (!g.passed && Math.abs(g.x - 95) < 22 && Math.abs(g.y - s.planeY) < 42) {
              g.passed = true;
              scoreRef.current += 50;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.eat(ctx.soundEnabled);
            }
          }
          if (s.gates[0] && s.gates[0].x < -40) {
            s.gates.shift();
            s.gates.push({
              x: s.gates[s.gates.length - 1].x + 165,
              y: 80 + Math.random() * 270,
              passed: false,
            });
          }
          scoreRef.current += Math.round(dt * 15);
          setScore(scoreRef.current);
          onScoreChange(scoreRef.current);
        } else if (gameSlug === 'rope-cut' || gameSlug === 'physics-drop') {
          if (s.ballDropped) {
            const attached = gameSlug === 'rope-cut' ? s.ropes.filter((r) => r.intact) : [];
            s.orbVy += 460 * dt;
            s.orbX += s.orbVx * dt;
            s.orbY += s.orbVy * dt;

            for (const r of attached) {
              const dx = s.orbX - r.x;
              const dy = s.orbY - r.y;
              const d = Math.hypot(dx, dy);
              if (d > r.len && d > 0) {
                const nx = dx / d;
                const ny = dy / d;
                s.orbX = r.x + nx * r.len;
                s.orbY = r.y + ny * r.len;
                const dot = s.orbVx * nx + s.orbVy * ny;
                if (dot > 0) {
                  s.orbVx -= dot * nx * 1.1;
                  s.orbVy -= dot * ny * 1.1;
                }
              }
            }

            // Ramp collisions
            for (const rm of s.ramps) {
              const rx = rm.x2 - rm.x1;
              const ry = rm.y2 - rm.y1;
              const l2 = rx * rx + ry * ry;
              if (l2 < 10) continue;
              const t = Math.max(0, Math.min(1, ((s.orbX - rm.x1) * rx + (s.orbY - rm.y1) * ry) / l2));
              const cx = rm.x1 + t * rx;
              const cy = rm.y1 + t * ry;
              const dist = Math.hypot(s.orbX - cx, s.orbY - cy);
              if (dist < 16 && dist > 0) {
                const nx = (s.orbX - cx) / dist;
                const ny = (s.orbY - cy) / dist;
                s.orbX = cx + nx * 16;
                s.orbY = cy + ny * 16;
                const dot = s.orbVx * nx + s.orbVy * ny;
                if (dot < 0) {
                  s.orbVx -= 1.45 * dot * nx;
                  s.orbVy -= 1.45 * dot * ny;
                  sfx.bounce(ctx.soundEnabled);
                }
              }
            }

            if (s.orbX < 14 || s.orbX > W - 14) {
              s.orbVx *= -0.7;
              s.orbX = Math.max(14, Math.min(W - 14, s.orbX));
            }

            if (Math.hypot(s.orbX - s.cupX, s.orbY - s.cupY) < 28) {
              scoreRef.current += 150;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.clear(ctx.soundEnabled);
              s.stage += 1;
              s.orbX = 75 + ((s.stage * 97) % 230);
              s.orbY = 86;
              s.orbVx = 30;
              s.orbVy = 0;
              s.cupX = 90 + ((s.stage * 131) % 200);
              s.ramps = [];
              s.ballDropped = gameSlug === 'rope-cut';
              s.ropes = [
                { x: s.orbX - 70, y: 20, len: 105, intact: true },
                { x: s.orbX + 70, y: 20, len: 105, intact: true },
              ];
              setInfo(`Stage ${s.stage}`);
            } else if (s.orbY > H + 25) {
              finish(false);
            }
          }
        }
      }

      // Draw frame
      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);

        if (gameSlug === 'stack-tower') {
          const baseOffset = Math.max(0, s.slabs.length - 8) * 28;
          s.slabs.forEach((sl, idx) => {
            const sy = H - 36 - idx * 28 + baseOffset;
            if (sy > H + 30) return;
            c.fillStyle = sl.color;
            c.fillRect(sl.x, sy, sl.w, 24);
          });
          const curY = H - 36 - s.slabs.length * 28 + baseOffset;
          c.fillStyle = COLORS[s.slabs.length % COLORS.length];
          c.fillRect(s.movingX, curY, s.movingW, 24);
        } else if (gameSlug === 'helix-jump') {
          c.fillStyle = '#1E293B';
          c.fillRect(W / 2 - 22, 0, 44, H);
          for (const r of s.rings) {
            c.strokeStyle = '#3B82F6';
            c.lineWidth = 10;
            c.beginPath();
            c.arc(W / 2, r.y, 125, r.gapStart + r.gapSize * 0.5 + s.helixAngle, r.gapStart - r.gapSize * 0.5 + Math.PI * 2 + s.helixAngle);
            c.stroke();

            c.strokeStyle = '#EF4444';
            c.beginPath();
            c.arc(W / 2, r.y, 125, r.hazardStart - 0.35 + s.helixAngle, r.hazardStart + 0.35 + s.helixAngle);
            c.stroke();
          }
          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.arc(W / 2, s.ballY, 12, 0, Math.PI * 2);
          c.fill();
        } else if (gameSlug === 'paper-plane') {
          for (const g of s.gates) {
            c.strokeStyle = g.passed ? '#10B981' : '#00E5FF';
            c.lineWidth = 4;
            c.beginPath();
            c.ellipse(g.x, g.y, 12, 38, 0, 0, Math.PI * 2);
            c.stroke();
          }
          c.save();
          c.translate(95, s.planeY);
          c.rotate(s.planeVy * 0.002);
          c.fillStyle = '#FFFFFF';
          c.beginPath();
          c.moveTo(20, 0);
          c.lineTo(-16, -11);
          c.lineTo(-10, 0);
          c.lineTo(-16, 11);
          c.closePath();
          c.fill();
          c.restore();
        } else if (gameSlug === 'rope-cut' || gameSlug === 'physics-drop') {
          // Cup
          c.strokeStyle = '#10B981';
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(s.cupX - 26, s.cupY - 12);
          c.lineTo(s.cupX - 20, s.cupY + 18);
          c.lineTo(s.cupX + 20, s.cupY + 18);
          c.lineTo(s.cupX + 26, s.cupY - 12);
          c.stroke();

          if (gameSlug === 'rope-cut') {
            for (const r of s.ropes) {
              if (!r.intact) continue;
              c.strokeStyle = '#F59E0B';
              c.lineWidth = 3;
              c.beginPath();
              c.moveTo(r.x, r.y);
              c.lineTo(s.orbX, s.orbY);
              c.stroke();
            }
          }

          c.strokeStyle = '#00E5FF';
          c.lineWidth = 5;
          for (const rm of s.ramps) {
            c.beginPath();
            c.moveTo(rm.x1, rm.y1);
            c.lineTo(rm.x2, rm.y2);
            c.stroke();
          }
          if (s.drawingRamp) {
            c.beginPath();
            c.moveTo(s.drawingRamp.x1, s.drawingRamp.y1);
            c.lineTo(s.drawingRamp.x2, s.drawingRamp.y2);
            c.stroke();
          }

          c.fillStyle = '#EC4899';
          c.beginPath();
          c.arc(s.orbX, s.orbY, 13, 0, Math.PI * 2);
          c.fill();
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, finish, gameSlug, onScoreChange]);

  const titleMap: Record<string, string> = {
    'bubble-pop': 'Bubble Pop Blitz',
    'rope-cut': 'Rope Cut Physics',
    'physics-drop': 'Physics Line Drop',
    'paper-plane': 'Paper Plane Glide',
    'stack-tower': 'Precision Stack Tower',
    'helix-jump': 'Helix Spiral Drop',
  };

  if (gameSlug === 'bubble-pop') {
    const colorMap = ['bg-cyan-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-400'];
    return (
      <div className="w-full max-w-md flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
          <span>Time: {popTimer}s</span>
          <span>Score: {score}</span>
        </div>
        <div className="relative w-full aspect-[7/8] rounded-2xl border border-cyan-500/35 bg-[#070B19] p-3 grid grid-cols-7 gap-2">
          {popGrid.flatMap((row, r) =>
            row.map((val, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => tapBubble(r, c)}
                className={`rounded-full transition-transform active:scale-90 ${val >= 0 ? colorMap[val] : 'bg-transparent'} shadow-md`}
                aria-label={`Bubble row ${r + 1} col ${c + 1}`}
              />
            ))
          )}
          <GameOverlay
            status={status}
            ctx={ctx}
            title="Bubble Pop Blitz"
            subtitle="Tap connected groups of 2 or more same-colored bubbles before 45 seconds expire."
            score={score}
            gameSlug="bubble-pop"
            onStart={() => reset(true)}
            onRestart={() => reset(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>{info}</span>
        <span>Score: {score}</span>
      </div>
      <div
        className="relative w-full aspect-[38/44] rounded-2xl overflow-hidden border border-purple-500/35 bg-[#070B19] game-surface-lock"
        onPointerDown={(e) => {
          if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const py = ((e.clientY - rect.top) / rect.height) * H;
          if (gameSlug === 'stack-tower') {
            dropSlab();
          } else if (gameSlug === 'paper-plane') {
            stRef.current.pitch = py < H / 2 ? -0.35 : 0.35;
          } else if (gameSlug === 'physics-drop') {
            stRef.current.drawingRamp = { x1: px, y1: py, x2: px, y2: py };
          } else if (gameSlug === 'rope-cut') {
            for (const r of stRef.current.ropes) {
              if (!r.intact) continue;
              const mx = (r.x + stRef.current.orbX) / 2;
              const my = (r.y + stRef.current.orbY) / 2;
              if (Math.hypot(px - mx, py - my) < 55) {
                r.intact = false;
                sfx.click(ctx.soundEnabled);
              }
            }
          } else if (gameSlug === 'helix-jump') {
            stRef.current.helixAngle += px < W / 2 ? -0.32 : 0.32;
          }
        }}
        onPointerMove={(e) => {
          if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const py = ((e.clientY - rect.top) / rect.height) * H;
          if (gameSlug === 'physics-drop' && stRef.current.drawingRamp && e.buttons > 0) {
            stRef.current.drawingRamp.x2 = px;
            stRef.current.drawingRamp.y2 = py;
          } else if (gameSlug === 'rope-cut' && (e.buttons > 0 || e.pointerType === 'touch')) {
            for (const r of stRef.current.ropes) {
              if (!r.intact) continue;
              const mx = (r.x + stRef.current.orbX) / 2;
              const my = (r.y + stRef.current.orbY) / 2;
              if (Math.hypot(px - mx, py - my) < 55) {
                r.intact = false;
                sfx.click(ctx.soundEnabled);
              }
            }
          } else if (gameSlug === 'helix-jump' && (e.buttons > 0 || e.pointerType === 'touch')) {
            stRef.current.helixAngle += e.movementX * 0.018;
          }
        }}
        onPointerUp={() => {
          if (gameSlug === 'physics-drop' && stRef.current.drawingRamp) {
            stRef.current.ramps.push(stRef.current.drawingRamp);
            stRef.current.drawingRamp = null;
            stRef.current.ballDropped = true;
          }
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Casual Physics'}
          subtitle="Interactive touch & mouse physics arcade. Tap Start to play!"
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
      {gameSlug === 'physics-drop' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (stRef.current.ballDropped = true)}
            className="min-h-[44px] px-5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-xs font-bold text-cyan-200"
          >
            Drop Ball
          </button>
          <button
            type="button"
            onClick={() => (stRef.current.ramps = [])}
            className="min-h-[44px] px-5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-white"
          >
            Clear Ramps
          </button>
        </div>
      )}
    </div>
  );
};

export default PhysicsCasualEngine;
