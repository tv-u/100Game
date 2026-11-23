import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 400;
const H = 360;

const PATH_POINTS = [
  { x: 0, y: 72 },
  { x: 310, y: 72 },
  { x: 310, y: 180 },
  { x: 88, y: 180 },
  { x: 88, y: 288 },
  { x: 400, y: 288 },
];

const BUILD_PADS = [
  { id: 0, x: 115, y: 124 },
  { id: 1, x: 220, y: 124 },
  { id: 2, x: 356, y: 132 },
  { id: 3, x: 185, y: 234 },
  { id: 4, x: 285, y: 234 },
  { id: 5, x: 42, y: 234 },
  { id: 6, x: 250, y: 332 },
];

type TurretType = 'laser' | 'frost' | 'cannon';
const TURRET_SPEC: Record<TurretType, { label: string; cost: number; range: number; dmg: number; rate: number; color: string }> = {
  laser: { label: 'Laser (50)', cost: 50, range: 115, dmg: 14, rate: 0.45, color: '#00E5FF' },
  frost: { label: 'Frost (70)', cost: 70, range: 105, dmg: 8, rate: 0.7, color: '#818CF8' },
  cannon: { label: 'Cannon (90)', cost: 90, range: 125, dmg: 32, rate: 1.15, color: '#F59E0B' },
};

export const TowerDefenseGame: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
}> = ({ ctx, onScoreChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);
  const [credits, setCredits] = useState(140);
  const [lives, setLives] = useState(12);
  const [wave, setWave] = useState(1);
  const [selectedType, setSelectedType] = useState<TurretType>('laser');

  const statusRef = useRef<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const scoreRef = useRef(0);
  const creditsRef = useRef(140);
  const livesRef = useRef(12);
  const waveRef = useRef(1);
  const endedRef = useRef(false);

  const turretsRef = useRef<Array<{ padId: number; x: number; y: number; type: TurretType; cd: number; lvl: number }>>([]);
  const enemiesRef = useRef<Array<{ x: number; y: number; seg: number; hp: number; maxHp: number; speed: number; slowT: number }>>([]);
  const bulletsRef = useRef<Array<{ x: number; y: number; tx: number; ty: number; color: string; life: number }>>([]);
  const spawnQueueRef = useRef(0);
  const spawnTimerRef = useRef(0);

  const spawnWave = useCallback((wNum: number) => {
    waveRef.current = wNum;
    setWave(wNum);
    spawnQueueRef.current = 5 + wNum * 2;
    spawnTimerRef.current = 0.2;
  }, []);

  const reset = useCallback(
    (startImmediately = false) => {
      turretsRef.current = [];
      enemiesRef.current = [];
      bulletsRef.current = [];
      scoreRef.current = 0;
      creditsRef.current = 140;
      livesRef.current = 12;
      endedRef.current = false;
      setScore(0);
      setCredits(140);
      setLives(12);
      onScoreChange(0);
      spawnWave(1);
      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange, spawnWave]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, reset]);

  const handleCanvasClick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;

    for (const pad of BUILD_PADS) {
      if (Math.hypot(px - pad.x, py - pad.y) <= 24) {
        const existing = turretsRef.current.find((t) => t.padId === pad.id);
        if (existing) {
          const upgCost = 60 * existing.lvl;
          if (creditsRef.current >= upgCost && existing.lvl < 3) {
            creditsRef.current -= upgCost;
            existing.lvl += 1;
            setCredits(creditsRef.current);
            sfx.merge(ctx.soundEnabled);
            triggerHaptic(ctx.hapticsEnabled, 14);
          }
          return;
        }
        const spec = TURRET_SPEC[selectedType];
        if (creditsRef.current >= spec.cost) {
          creditsRef.current -= spec.cost;
          setCredits(creditsRef.current);
          turretsRef.current.push({ padId: pad.id, x: pad.x, y: pad.y, type: selectedType, cd: 0, lvl: 1 });
          sfx.click(ctx.soundEnabled);
          triggerHaptic(ctx.hapticsEnabled, 12);
        }
        return;
      }
    }
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (spawnQueueRef.current > 0) {
          spawnTimerRef.current -= dt;
          if (spawnTimerRef.current <= 0) {
            spawnQueueRef.current -= 1;
            spawnTimerRef.current = 0.72;
            const hp = 32 + waveRef.current * 18;
            enemiesRef.current.push({
              x: PATH_POINTS[0].x,
              y: PATH_POINTS[0].y,
              seg: 1,
              hp,
              maxHp: hp,
              speed: 55 + Math.min(45, waveRef.current * 4),
              slowT: 0,
            });
          }
        } else if (enemiesRef.current.length === 0) {
          if (waveRef.current >= 8) {
            statusRef.current = 'WON';
            setStatus('WON');
            sfx.win(ctx.soundEnabled);
            if (!endedRef.current) {
              endedRef.current = true;
              ctx.onScoreEnd(scoreRef.current + 300, true);
            }
          } else {
            creditsRef.current += 35;
            setCredits(creditsRef.current);
            spawnWave(waveRef.current + 1);
          }
        }

        // Move enemies
        for (const en of enemiesRef.current) {
          if (en.slowT > 0) en.slowT -= dt;
          const spd = en.speed * (en.slowT > 0 ? 0.55 : 1);
          const target = PATH_POINTS[en.seg];
          if (!target) continue;
          const dx = target.x - en.x;
          const dy = target.y - en.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= spd * dt + 1) {
            en.x = target.x;
            en.y = target.y;
            en.seg += 1;
            if (en.seg >= PATH_POINTS.length) {
              en.hp = -999;
              livesRef.current -= 1;
              setLives(livesRef.current);
              triggerHaptic(ctx.hapticsEnabled, 30);
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
          } else {
            en.x += (dx / dist) * spd * dt;
            en.y += (dy / dist) * spd * dt;
          }
        }

        // Turret firing
        for (const t of turretsRef.current) {
          const spec = TURRET_SPEC[t.type];
          t.cd -= dt;
          if (t.cd <= 0) {
            const target = enemiesRef.current.find((e) => e.hp > 0 && Math.hypot(e.x - t.x, e.y - t.y) <= spec.range);
            if (target) {
              t.cd = spec.rate;
              target.hp -= spec.dmg * t.lvl;
              if (t.type === 'frost') target.slowT = 1.6;
              bulletsRef.current.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, color: spec.color, life: 0.14 });
              if (target.hp <= 0) {
                scoreRef.current += 20;
                creditsRef.current += 12;
                setScore(scoreRef.current);
                setCredits(creditsRef.current);
                onScoreChange(scoreRef.current);
                sfx.eat(ctx.soundEnabled);
              }
            }
          }
        }

        enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0);
        bulletsRef.current = bulletsRef.current.filter((b) => {
          b.life -= dt;
          return b.life > 0;
        });
      }

      const canvas = canvasRef.current;
      const c = canvas?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);

        // Path
        c.strokeStyle = '#1E293B';
        c.lineWidth = 34;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
        for (let i = 1; i < PATH_POINTS.length; i++) c.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
        c.stroke();

        c.strokeStyle = 'rgba(0,229,255,0.28)';
        c.lineWidth = 2;
        c.stroke();

        // Build pads
        for (const pad of BUILD_PADS) {
          c.strokeStyle = 'rgba(139,92,246,0.45)';
          c.lineWidth = 2;
          c.strokeRect(pad.x - 16, pad.y - 16, 32, 32);
        }

        // Turrets
        for (const t of turretsRef.current) {
          const spec = TURRET_SPEC[t.type];
          c.fillStyle = spec.color;
          c.beginPath();
          c.arc(t.x, t.y, 13, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#FFFFFF';
          c.font = 'bold 10px monospace';
          c.textAlign = 'center';
          c.fillText(`L${t.lvl}`, t.x, t.y + 3);
        }

        // Lasers
        for (const b of bulletsRef.current) {
          c.strokeStyle = b.color;
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(b.x, b.y);
          c.lineTo(b.tx, b.ty);
          c.stroke();
        }

        // Enemies
        for (const en of enemiesRef.current) {
          c.fillStyle = en.slowT > 0 ? '#818CF8' : '#F43F5E';
          c.beginPath();
          c.arc(en.x, en.y, 10, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#0F172A';
          c.fillRect(en.x - 10, en.y - 16, 20, 3);
          c.fillStyle = '#10B981';
          c.fillRect(en.x - 10, en.y - 16, Math.max(0, (en.hp / en.maxHp) * 20), 3);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, onScoreChange, spawnWave]);

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>Wave {wave}/8 · HP: {lives}</span>
        <span className="text-amber-400">Credits: {credits}</span>
        <span>Score: {score}</span>
      </div>

      <div className="flex gap-2 w-full justify-center">
        {(Object.keys(TURRET_SPEC) as TurretType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold transition-colors ${
              selectedType === type ? 'border-cyan-400 bg-cyan-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300'
            }`}
          >
            {TURRET_SPEC[type].label}
          </button>
        ))}
      </div>

      <div
        className="relative w-full aspect-[10/9] rounded-2xl overflow-hidden border border-blue-500/35 bg-[#070B19] game-surface-lock"
        onPointerDown={handleCanvasClick}
      >
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
        <GameOverlay
          status={status}
          ctx={ctx}
          title="Cyber Tower Defense"
          subtitle="Select Laser, Frost, or Cannon above and tap purple pads to defend all 8 waves. Tap placed turrets to upgrade!"
          score={score}
          gameSlug="tower-defense"
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default TowerDefenseGame;
