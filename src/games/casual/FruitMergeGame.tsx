import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 380;
const H = 470;
const TOP_LIMIT = 86;

const FRUIT_TIERS = [
  { r: 14, color: '#F43F5E', label: 'C' },
  { r: 18, color: '#EC4899', label: 'S' },
  { r: 23, color: '#A855F7', label: 'G' },
  { r: 28, color: '#F59E0B', label: 'O' },
  { r: 33, color: '#F97316', label: 'P' },
  { r: 39, color: '#EF4444', label: 'A' },
  { r: 46, color: '#EAB308', label: 'N' },
  { r: 54, color: '#10B981', label: 'M' },
];

interface Fruit {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

export const FruitMergeGame: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
}> = ({ ctx, onScoreChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reportModality } = useControls();

  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);
  const [nextTier, setNextTier] = useState(0);

  const statusRef = useRef<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const scoreRef = useRef(0);
  const endedRef = useRef(false);
  const fruitsRef = useRef<Fruit[]>([]);
  const aimXRef = useRef(W / 2);
  const currTierRef = useRef(0);
  const nextTierRef = useRef(1);
  const cooldownRef = useRef(0);
  const idSeqRef = useRef(1);

  const reset = useCallback(
    (startImmediately = false) => {
      fruitsRef.current = [];
      aimXRef.current = W / 2;
      currTierRef.current = Math.floor(Math.random() * 3);
      const nt = Math.floor(Math.random() * 3);
      nextTierRef.current = nt;
      setNextTier(nt);
      cooldownRef.current = 0;
      scoreRef.current = 0;
      endedRef.current = false;
      setScore(0);
      onScoreChange(0);
      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, reset]);

  const dropFruit = useCallback(() => {
    if (statusRef.current !== 'PLAYING' || ctx.isPaused || cooldownRef.current > 0) return;
    const tier = currTierRef.current;
    const r = FRUIT_TIERS[tier].r;
    const x = Math.max(r + 12, Math.min(W - r - 12, aimXRef.current));
    fruitsRef.current.push({
      id: idSeqRef.current++,
      tier,
      x,
      y: 52,
      vx: 0,
      vy: 40,
      age: 0,
    });
    currTierRef.current = nextTierRef.current;
    const nt = Math.floor(Math.random() * 4);
    nextTierRef.current = nt;
    setNextTier(nt);
    cooldownRef.current = 0.38;
    sfx.click(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, 10);
  }, [ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') aimXRef.current = Math.max(30, aimXRef.current - 22);
      if (e.key === 'ArrowRight' || e.key === 'd') aimXRef.current = Math.min(W - 30, aimXRef.current + 22);
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        dropFruit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx.isPaused, dropFruit]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - last) / 1000);
      last = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (cooldownRef.current > 0) cooldownRef.current -= dt;

        const list = fruitsRef.current;
        for (const f of list) {
          const r = FRUIT_TIERS[f.tier].r;
          f.age += dt;
          f.vy += 680 * dt;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.vx *= 0.992;

          if (f.x - r < 10) {
            f.x = 10 + r;
            f.vx = Math.abs(f.vx) * 0.45;
          } else if (f.x + r > W - 10) {
            f.x = W - 10 - r;
            f.vx = -Math.abs(f.vx) * 0.45;
          }
          if (f.y + r > H - 10) {
            f.y = H - 10 - r;
            f.vy = -Math.abs(f.vy) * 0.25;
            f.vx *= 0.9;
          }
        }

        // Pairwise collision + merge resolution
        const removeIds = new Set<number>();
        const spawned: Fruit[] = [];
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i];
            const b = list[j];
            if (removeIds.has(a.id) || removeIds.has(b.id)) continue;
            const ra = FRUIT_TIERS[a.tier].r;
            const rb = FRUIT_TIERS[b.tier].r;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            const minD = ra + rb;

            if (dist < minD) {
              if (a.tier === b.tier && a.tier < FRUIT_TIERS.length - 1) {
                removeIds.add(a.id);
                removeIds.add(b.id);
                const newTier = a.tier + 1;
                spawned.push({
                  id: idSeqRef.current++,
                  tier: newTier,
                  x: (a.x + b.x) / 2,
                  y: (a.y + b.y) / 2,
                  vx: 0,
                  vy: -60,
                  age: 0.5,
                });
                const pts = (newTier + 1) * 15;
                scoreRef.current += pts;
                setScore(scoreRef.current);
                onScoreChange(scoreRef.current);
                sfx.merge(ctx.soundEnabled);
                triggerHaptic(ctx.hapticsEnabled, 18);
              } else if (dist > 0.01) {
                const nx = dx / dist;
                const ny = dy / dist;
                const pen = (minD - dist) * 0.52;
                a.x -= nx * pen;
                a.y -= ny * pen;
                b.x += nx * pen;
                b.y += ny * pen;
                const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                if (rv > 0) {
                  a.vx -= rv * nx * 0.65;
                  a.vy -= rv * ny * 0.65;
                  b.vx += rv * nx * 0.65;
                  b.vy += rv * ny * 0.65;
                }
              }
            }
          }
        }

        if (removeIds.size > 0 || spawned.length > 0) {
          fruitsRef.current = [...list.filter((f) => !removeIds.has(f.id)), ...spawned];
        }

        // Check overflow
        if (fruitsRef.current.some((f) => f.age > 1.8 && f.y - FRUIT_TIERS[f.tier].r < TOP_LIMIT)) {
          statusRef.current = 'GAME_OVER';
          setStatus('GAME_OVER');
          sfx.gameOver(ctx.soundEnabled);
          if (!endedRef.current) {
            endedRef.current = true;
            ctx.onScoreEnd(scoreRef.current, false);
          }
        }
      }

      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);

        // Jar outline
        c.strokeStyle = 'rgba(236,72,153,0.45)';
        c.lineWidth = 4;
        c.strokeRect(8, TOP_LIMIT, W - 16, H - TOP_LIMIT - 8);

        // Drop guide line
        if (statusRef.current === 'PLAYING') {
          const preview = FRUIT_TIERS[currTierRef.current];
          c.strokeStyle = 'rgba(255,255,255,0.16)';
          c.lineWidth = 1.5;
          c.setLineDash([5, 5]);
          c.beginPath();
          c.moveTo(aimXRef.current, 50);
          c.lineTo(aimXRef.current, H - 12);
          c.stroke();
          c.setLineDash([]);

          c.fillStyle = preview.color;
          c.beginPath();
          c.arc(aimXRef.current, 48, preview.r, 0, Math.PI * 2);
          c.fill();
        }

        for (const f of fruitsRef.current) {
          const spec = FRUIT_TIERS[f.tier];
          c.fillStyle = spec.color;
          c.beginPath();
          c.arc(f.x, f.y, spec.r, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.35)';
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = '#FFFFFF';
          c.font = `bold ${Math.max(11, Math.round(spec.r * 0.6))}px sans-serif`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(spec.label, f.x, f.y + 1);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, onScoreChange]);

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>Next Tier: {FRUIT_TIERS[nextTier].label}</span>
        <span>Score: {score}</span>
      </div>
      <div
        className="relative w-full aspect-[38/47] rounded-2xl overflow-hidden border border-pink-500/35 bg-[#070B19] game-surface-lock"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          aimXRef.current = ((e.clientX - rect.left) / rect.width) * W;
        }}
        onPointerDown={(e) => {
          if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
          reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
          const rect = e.currentTarget.getBoundingClientRect();
          aimXRef.current = ((e.clientX - rect.left) / rect.width) * W;
          dropFruit();
        }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title="Fruit Merge Drop"
          subtitle="Aim above the neon jar and drop fruits. Merge identical pairs up to Giant Melon!"
          score={score}
          gameSlug="fruit-merge"
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default FruitMergeGame;
