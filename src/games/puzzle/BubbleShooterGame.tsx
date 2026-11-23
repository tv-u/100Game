import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 360;
const H = 480;
const R = 18;
const COLS = 9;
const COLORS = ['#00E5FF', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];

interface CellBubble {
  row: number;
  col: number;
  color: string;
}

const cellXY = (row: number, col: number) => ({
  x: 28 + col * (R * 2) + (row % 2 === 1 ? R : 0),
  y: 30 + row * (R * 1.75),
});

const BubbleShooterGame: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'bubble-shooter',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('PLAYING');
  const [score, setScore] = useState(0);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [nextColor, setNextColor] = useState(COLORS[1]);

  const statusRef = useRef(status);
  statusRef.current = status;
  const gridRef = useRef<CellBubble[]>([]);
  const shotRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string } | null>(null);
  const aimRef = useRef(-Math.PI / 2);
  const activeRef = useRef(COLORS[0]);
  const nextRef = useRef(COLORS[1]);
  const scoreRef = useRef(0);
  const shotsCountRef = useRef(0);

  const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

  const initBoard = useCallback(() => {
    const initial: CellBubble[] = [];
    for (let r = 0; r < 5; r++) {
      const maxC = r % 2 === 1 ? COLS - 1 : COLS;
      for (let c = 0; c < maxC; c++) {
        initial.push({ row: r, col: c, color: randColor() });
      }
    }
    gridRef.current = initial;
    shotRef.current = null;
    scoreRef.current = 0;
    shotsCountRef.current = 0;
    const c1 = randColor();
    const c2 = randColor();
    activeRef.current = c1;
    nextRef.current = c2;
    setActiveColor(c1);
    setNextColor(c2);
    setScore(0);
    onScoreChange(0);
    statusRef.current = 'PLAYING';
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  useEffect(() => {
    if (ctx.restartKey > 0) initBoard();
  }, [ctx.restartKey, initBoard]);

  const swapBubble = () => {
    const tmp = activeRef.current;
    activeRef.current = nextRef.current;
    nextRef.current = tmp;
    setActiveColor(activeRef.current);
    setNextColor(nextRef.current);
    sfx.click(ctx.soundEnabled);
  };

  const shoot = () => {
    if (ctx.isPaused || statusRef.current !== 'PLAYING' || shotRef.current) return;
    shotRef.current = {
      x: W / 2,
      y: H - 34,
      vx: Math.cos(aimRef.current) * 520,
      vy: Math.sin(aimRef.current) * 520,
      color: activeRef.current,
    };
    activeRef.current = nextRef.current;
    nextRef.current = randColor();
    setActiveColor(activeRef.current);
    setNextColor(nextRef.current);
    sfx.click(ctx.soundEnabled);
  };

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const snapShot = (sx: number, sy: number, color: string) => {
      let bestR = 0;
      let bestC = 0;
      let bestDist = Infinity;
      for (let r = 0; r < 12; r++) {
        const maxC = r % 2 === 1 ? COLS - 1 : COLS;
        for (let c = 0; c < maxC; c++) {
          if (gridRef.current.some((b) => b.row === r && b.col === c)) continue;
          const pos = cellXY(r, c);
          const d = Math.hypot(pos.x - sx, pos.y - sy);
          if (d < bestDist) {
            bestDist = d;
            bestR = r;
            bestC = c;
          }
        }
      }
      const placed: CellBubble = { row: bestR, col: bestC, color };
      gridRef.current.push(placed);

      // Flood fill matching color
      const visited = new Set<string>();
      const queue = [placed];
      const cluster: CellBubble[] = [];
      const key = (b: CellBubble) => `${b.row},${b.col}`;
      visited.add(key(placed));

      while (queue.length > 0) {
        const cur = queue.shift()!;
        cluster.push(cur);
        const curPos = cellXY(cur.row, cur.col);
        for (const other of gridRef.current) {
          if (visited.has(key(other)) || other.color !== color) continue;
          const oPos = cellXY(other.row, other.col);
          if (Math.hypot(curPos.x - oPos.x, curPos.y - oPos.y) < R * 2.4) {
            visited.add(key(other));
            queue.push(other);
          }
        }
      }

      if (cluster.length >= 3) {
        const popSet = new Set(cluster.map(key));
        gridRef.current = gridRef.current.filter((b) => !popSet.has(key(b)));
        // Drop disconnected floating bubbles
        const anchored = new Set<string>();
        const aq = gridRef.current.filter((b) => b.row === 0);
        aq.forEach((b) => anchored.add(key(b)));
        while (aq.length > 0) {
          const cur = aq.shift()!;
          const cPos = cellXY(cur.row, cur.col);
          for (const other of gridRef.current) {
            if (anchored.has(key(other))) continue;
            const oPos = cellXY(other.row, other.col);
            if (Math.hypot(cPos.x - oPos.x, cPos.y - oPos.y) < R * 2.4) {
              anchored.add(key(other));
              aq.push(other);
            }
          }
        }
        const floatingCount = gridRef.current.filter((b) => !anchored.has(key(b))).length;
        gridRef.current = gridRef.current.filter((b) => anchored.has(key(b)));
        scoreRef.current += cluster.length * 20 + floatingCount * 40;
        setScore(scoreRef.current);
        onScoreChange(scoreRef.current);
        sfx.clear(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, 16);
      }

      shotsCountRef.current += 1;
      if (gridRef.current.length === 0) {
        statusRef.current = 'WON';
        setStatus('WON');
        sfx.win(ctx.soundEnabled);
        ctx.onScoreEnd(scoreRef.current, true);
      } else if (gridRef.current.some((b) => b.row >= 11)) {
        statusRef.current = 'GAME_OVER';
        setStatus('GAME_OVER');
        sfx.gameOver(ctx.soundEnabled);
        ctx.onScoreEnd(scoreRef.current, false);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.03, (now - prev) / 1000);
      prev = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused && shotRef.current) {
        const sh = shotRef.current;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        if (sh.x < R) {
          sh.x = R;
          sh.vx = Math.abs(sh.vx);
          sfx.bounce(ctx.soundEnabled);
        } else if (sh.x > W - R) {
          sh.x = W - R;
          sh.vx = -Math.abs(sh.vx);
          sfx.bounce(ctx.soundEnabled);
        }

        let hit = sh.y <= R + 12;
        if (!hit) {
          for (const b of gridRef.current) {
            const p = cellXY(b.row, b.col);
            if (Math.hypot(p.x - sh.x, p.y - sh.y) < R * 1.85) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          const snapped = sh;
          shotRef.current = null;
          snapShot(snapped.x, snapped.y, snapped.color);
        }
      }

      const c = canvasRef.current?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(244,63,94,0.35)';
        c.setLineDash([6, 6]);
        c.beginPath();
        c.moveTo(0, H - 72);
        c.lineTo(W, H - 72);
        c.stroke();
        c.setLineDash([]);

        for (const b of gridRef.current) {
          const p = cellXY(b.row, b.col);
          c.fillStyle = b.color;
          c.beginPath();
          c.arc(p.x, p.y, R - 2, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = 'rgba(255,255,255,0.35)';
          c.beginPath();
          c.arc(p.x - 5, p.y - 5, 4, 0, Math.PI * 2);
          c.fill();
        }

        // Aim line
        if (!shotRef.current && statusRef.current === 'PLAYING') {
          c.strokeStyle = 'rgba(0,229,255,0.55)';
          c.setLineDash([5, 5]);
          c.beginPath();
          c.moveTo(W / 2, H - 34);
          c.lineTo(W / 2 + Math.cos(aimRef.current) * 140, H - 34 + Math.sin(aimRef.current) * 140);
          c.stroke();
          c.setLineDash([]);
        }

        if (shotRef.current) {
          c.fillStyle = shotRef.current.color;
          c.beginPath();
          c.arc(shotRef.current.x, shotRef.current.y, R - 2, 0, Math.PI * 2);
          c.fill();
        }

        c.fillStyle = activeRef.current;
        c.beginPath();
        c.arc(W / 2, H - 34, R - 2, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#FFFFFF';
        c.lineWidth = 2;
        c.stroke();
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, onScoreChange]);

  const updateAim = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const ang = Math.atan2(Math.min(H - 65, py) - (H - 34), px - W / 2);
    aimRef.current = Math.max(-Math.PI + 0.18, Math.min(-0.18, ang));
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-3">
      <div
        className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-cyan-500/40 bg-[#070B19] game-surface-lock cursor-crosshair"
        onPointerMove={updateAim}
        onPointerDown={(e) => {
          updateAim(e);
          shoot();
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title="Bubble Shooter Pop"
          subtitle="Aim to match 3 or more neon bubbles. Hanging clusters drop for bonus points!"
          score={score}
          gameSlug={gameSlug}
          onStart={initBoard}
          onRestart={initBoard}
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
          <span>Active:</span>
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: activeColor }} />
          <span className="ml-2">Next:</span>
          <span className="w-4 h-4 rounded-full" style={{ backgroundColor: nextColor }} />
        </div>
        <button
          type="button"
          onClick={swapBubble}
          className="min-h-[44px] px-4 rounded-xl bg-purple-600/25 border border-purple-400/50 text-xs font-bold text-purple-200"
        >
          Swap Bubble
        </button>
      </div>
    </div>
  );
};

export default BubbleShooterGame;
