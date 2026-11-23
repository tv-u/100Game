import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

export const TacticalSimEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'dungeon-crawler' }) => {
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);

  // Dungeon Crawler 7x7 state
  const [dun, setDun] = useState({
    floor: 1,
    hp: 30,
    maxHp: 30,
    atk: 6,
    px: 0,
    py: 0,
    exit: { x: 6, y: 6 },
    enemies: [] as Array<{ x: number; y: number; hp: number }>,
    potions: [] as Array<{ x: number; y: number }>,
  });

  // Turn Battle state
  const [rpg, setRpg] = useState({
    wave: 1,
    heroHp: 100,
    energy: 40,
    bossHp: 90,
    bossMax: 90,
    guarding: false,
    log: 'Prepare your tactical strike!',
  });

  // Traffic Management state
  const [nsGreen, setNsGreen] = useState(true);
  const [queues, setQueues] = useState({ ns: 2, ew: 2, cleared: 0, crashed: false });

  // Tower Builder (Pendulum Crane) state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const craneRef = useRef({
    blocks: [{ x: 145, w: 90 }],
    angle: 0,
    speed: 2.2,
    dropping: false,
    dropX: 145,
    dropY: 80,
  });
  const statusRef = useRef(status);
  statusRef.current = status;

  const makeFloor = (floor: number, hp: number, atk: number) => ({
    floor,
    hp,
    maxHp: 30,
    atk,
    px: 0,
    py: 0,
    exit: { x: 6, y: 6 },
    enemies: [
      { x: 3, y: 2, hp: 8 + floor * 3 },
      { x: 4, y: 5, hp: 10 + floor * 3 },
      { x: 2, y: 4, hp: 8 + floor * 2 },
    ],
    potions: [{ x: 5, y: 1 }],
  });

  const reset = useCallback(
    (startImmediately = false) => {
      setScore(0);
      onScoreChange(0);
      setDun(makeFloor(1, 30, 6));
      setRpg({ wave: 1, heroHp: 100, energy: 40, bossHp: 90, bossMax: 90, guarding: false, log: 'Choose Strike, Fireball, Guard, or Heal!' });
      setNsGreen(true);
      setQueues({ ns: 2, ew: 2, cleared: 0, crashed: false });
      craneRef.current = { blocks: [{ x: 145, w: 90 }], angle: 0, speed: 2.2, dropping: false, dropX: 145, dropY: 80 };
      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  // Dungeon step logic
  const moveDungeon = useCallback(
    (dx: number, dy: number) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      setDun((prev) => {
        const nx = Math.max(0, Math.min(6, prev.px + dx));
        const ny = Math.max(0, Math.min(6, prev.py + dy));
        if (nx === prev.px && ny === prev.py) return prev;

        const enemies = prev.enemies.map((e) => ({ ...e }));
        const hitIdx = enemies.findIndex((e) => e.x === nx && e.y === ny);
        let hp = prev.hp;
        let px = prev.px;
        let py = prev.py;

        if (hitIdx >= 0) {
          enemies[hitIdx].hp -= prev.atk;
          sfx.click(ctx.soundEnabled);
          if (enemies[hitIdx].hp <= 0) {
            enemies.splice(hitIdx, 1);
            setScore((s) => {
              const ns = s + 60;
              onScoreChange(ns);
              return ns;
            });
            sfx.eat(ctx.soundEnabled);
          } else {
            hp -= 4 + prev.floor;
          }
        } else {
          px = nx;
          py = ny;
        }

        // Potions
        const potions = prev.potions.filter((p) => {
          if (p.x === px && p.y === py) {
            hp = Math.min(prev.maxHp, hp + 12);
            sfx.merge(ctx.soundEnabled);
            return false;
          }
          return true;
        });

        // Nearby enemy counter-step
        for (const en of enemies) {
          if (Math.abs(en.x - px) + Math.abs(en.y - py) === 1 && hitIdx < 0) {
            hp -= 3 + prev.floor;
          }
        }

        if (hp <= 0) {
          setStatus('GAME_OVER');
          sfx.gameOver(ctx.soundEnabled);
          ctx.onScoreEnd(score, false);
          return { ...prev, hp: 0 };
        }

        if (px === prev.exit.x && py === prev.exit.y) {
          const nf = prev.floor + 1;
          setScore((s) => {
            const ns = s + 150;
            onScoreChange(ns);
            return ns;
          });
          sfx.clear(ctx.soundEnabled);
          return makeFloor(nf, hp + 4, prev.atk + 2);
        }

        return { ...prev, px, py, hp, enemies, potions };
      });
    },
    [ctx, onScoreChange, score]
  );

  // Keyboard bindings for Dungeon
  useEffect(() => {
    if (gameSlug !== 'dungeon-crawler') return;
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      if (e.key === 'ArrowUp' || e.key === 'w') moveDungeon(0, -1);
      if (e.key === 'ArrowDown' || e.key === 's') moveDungeon(0, 1);
      if (e.key === 'ArrowLeft' || e.key === 'a') moveDungeon(-1, 0);
      if (e.key === 'ArrowRight' || e.key === 'd') moveDungeon(1, 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx.isPaused, gameSlug, moveDungeon]);

  // Traffic Management loop
  useEffect(() => {
    if (gameSlug !== 'traffic-management' || status !== 'PLAYING' || ctx.isPaused) return;
    const id = window.setInterval(() => {
      setQueues((prev) => {
        let ns = prev.ns + (Math.random() < 0.55 ? 1 : 0);
        let ew = prev.ew + (Math.random() < 0.55 ? 1 : 0);
        let cleared = prev.cleared;
        if (nsGreen && ns > 0) {
          ns -= Math.min(2, ns);
          cleared += 1;
        }
        if (!nsGreen && ew > 0) {
          ew -= Math.min(2, ew);
          cleared += 1;
        }
        const newScore = cleared * 25;
        setScore(newScore);
        onScoreChange(newScore);
        if (ns >= 9 || ew >= 9) {
          setStatus('GAME_OVER');
          sfx.gameOver(ctx.soundEnabled);
          ctx.onScoreEnd(newScore, false);
          return { ...prev, ns, ew, crashed: true };
        }
        return { ...prev, ns, ew, cleared };
      });
    }, 850);
    return () => clearInterval(id);
  }, [ctx, gameSlug, nsGreen, onScoreChange, status]);

  // Tower Builder canvas loop
  useEffect(() => {
    if (gameSlug !== 'tower-builder') return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const cr = craneRef.current;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        cr.angle += dt * cr.speed;
        const swingX = 190 + Math.sin(cr.angle) * 125 - 45;
        if (!cr.dropping) cr.dropX = swingX;
        else {
          cr.dropY += 380 * dt;
          const topIdx = cr.blocks.length;
          const targetY = Math.max(190, 360 - topIdx * 32);
          if (cr.dropY >= targetY) {
            cr.dropping = false;
            cr.dropY = 80;
            const prev = cr.blocks[cr.blocks.length - 1];
            if (Math.abs(cr.dropX - prev.x) > 58) {
              setStatus('GAME_OVER');
              sfx.gameOver(ctx.soundEnabled);
              ctx.onScoreEnd(score, false);
            } else {
              cr.blocks.push({ x: cr.dropX, w: 90 });
              cr.speed = Math.min(4.2, 2.2 + cr.blocks.length * 0.12);
              const pts = cr.blocks.length * 50;
              setScore(pts);
              onScoreChange(pts);
              sfx.click(ctx.soundEnabled);
            }
          }
        }
      }

      const c = canvasRef.current?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, 380, 400);
        const offset = Math.max(0, cr.blocks.length - 6) * 32;
        cr.blocks.forEach((b, i) => {
          const y = 360 - i * 32 + offset;
          c.fillStyle = i % 2 === 0 ? '#00E5FF' : '#3B82F6';
          c.fillRect(b.x, y, b.w, 28);
        });
        c.strokeStyle = '#94A3B8';
        c.beginPath();
        c.moveTo(190, 0);
        c.lineTo(cr.dropX + 45, cr.dropY);
        c.stroke();
        c.fillStyle = '#A855F7';
        c.fillRect(cr.dropX, cr.dropY, 90, 28);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, gameSlug, onScoreChange, score]);

  const rpgAction = (act: 'strike' | 'skill' | 'guard' | 'heal') => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    setRpg((prev) => {
      let heroHp = prev.heroHp;
      let bossHp = prev.bossHp;
      let energy = prev.energy;
      let log = '';
      if (act === 'strike') {
        bossHp -= 22;
        energy = Math.min(100, energy + 15);
        log = 'You struck the boss for 22 DMG!';
      } else if (act === 'skill' && energy >= 30) {
        bossHp -= 45;
        energy -= 30;
        log = 'Plasma Nova dealt 45 DMG!';
      } else if (act === 'heal' && energy >= 20) {
        heroHp = Math.min(100, heroHp + 32);
        energy -= 20;
        log = 'Nano-Repair restored 32 HP!';
      } else {
        energy = Math.min(100, energy + 25);
        log = 'Shield raised! Incoming damage halved.';
      }
      sfx.click(ctx.soundEnabled);

      if (bossHp <= 0) {
        const nw = prev.wave + 1;
        const pts = prev.wave * 150;
        setScore(pts);
        onScoreChange(pts);
        sfx.clear(ctx.soundEnabled);
        return {
          wave: nw,
          heroHp: Math.min(100, heroHp + 20),
          energy: 50,
          bossHp: 90 + nw * 25,
          bossMax: 90 + nw * 25,
          guarding: false,
          log: `Wave ${prev.wave} cleared! Boss ${nw} arrives.`,
        };
      }

      const incoming = act === 'guard' ? 8 : 16 + prev.wave * 2;
      heroHp -= incoming;
      if (heroHp <= 0) {
        setStatus('GAME_OVER');
        sfx.gameOver(ctx.soundEnabled);
        ctx.onScoreEnd(score, false);
        return { ...prev, heroHp: 0, log: 'Defeated!' };
      }

      return { ...prev, heroHp, bossHp, energy, guarding: false, log };
    });
  };

  const titleMap: Record<string, string> = {
    'dungeon-crawler': 'Pixel Dungeon Crawler',
    'turn-based-battle': 'Squad Turn Battle',
    'tower-builder': 'Skyline Crane Builder',
    'traffic-management': 'Intersection Traffic Control',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>{gameSlug === 'dungeon-crawler' ? `Floor ${dun.floor} · HP ${dun.hp}` : gameSlug === 'turn-based-battle' ? `Wave ${rpg.wave}` : 'Live Sim'}</span>
        <span>Score: {score}</span>
      </div>

      <div className="relative w-full rounded-2xl border border-violet-500/35 bg-[#070B19] p-4 min-h-[370px] flex flex-col justify-center">
        {gameSlug === 'dungeon-crawler' && (
          <div className="flex flex-col items-center gap-3">
            <div className="grid grid-cols-7 gap-1 w-full max-w-[300px]">
              {Array.from({ length: 49 }, (_, i) => {
                const x = i % 7;
                const y = Math.floor(i / 7);
                const isPlayer = dun.px === x && dun.py === y;
                const isExit = dun.exit.x === x && dun.exit.y === y;
                const en = dun.enemies.find((e) => e.x === x && e.y === y);
                const pot = dun.potions.find((p) => p.x === x && p.y === y);
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-md border flex items-center justify-center text-xs font-bold ${
                      isPlayer
                        ? 'bg-cyan-500 border-white text-slate-950'
                        : en
                        ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                        : pot
                        ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                        : isExit
                        ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    {isPlayer ? 'H' : en ? en.hp : pot ? '+' : isExit ? 'E' : ''}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-1.5 w-44">
              <div />
              <button type="button" onClick={() => moveDungeon(0, -1)} className="h-11 rounded-xl bg-white/10 text-white font-bold">↑</button>
              <div />
              <button type="button" onClick={() => moveDungeon(-1, 0)} className="h-11 rounded-xl bg-white/10 text-white font-bold">←</button>
              <button type="button" onClick={() => moveDungeon(0, 1)} className="h-11 rounded-xl bg-white/10 text-white font-bold">↓</button>
              <button type="button" onClick={() => moveDungeon(1, 0)} className="h-11 rounded-xl bg-white/10 text-white font-bold">→</button>
            </div>
          </div>
        )}

        {gameSlug === 'turn-based-battle' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-rose-300 font-bold">Cyber Boss Lv.{rpg.wave}</div>
                <div className="text-lg font-mono font-bold text-white">HP {rpg.bossHp}/{rpg.bossMax}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-cyan-300 font-bold">Hero Squad</div>
                <div className="text-lg font-mono font-bold text-white">HP {rpg.heroHp} · EN {rpg.energy}</div>
              </div>
            </div>
            <div className="text-xs text-center text-slate-300 font-medium">{rpg.log}</div>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => rpgAction('strike')} className="min-h-[48px] rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-white font-bold text-xs">Strike (22 DMG)</button>
              <button type="button" onClick={() => rpgAction('skill')} disabled={rpg.energy < 30} className="min-h-[48px] rounded-xl bg-violet-500/20 border border-violet-400/50 disabled:opacity-40 text-white font-bold text-xs">Nova (45 DMG · 30 EN)</button>
              <button type="button" onClick={() => rpgAction('guard')} className="min-h-[48px] rounded-xl bg-amber-500/20 border border-amber-400/50 text-white font-bold text-xs">Guard (+25 EN)</button>
              <button type="button" onClick={() => rpgAction('heal')} disabled={rpg.energy < 20} className="min-h-[48px] rounded-xl bg-emerald-500/20 border border-emerald-400/50 disabled:opacity-40 text-white font-bold text-xs">Heal (+32 HP · 20 EN)</button>
            </div>
          </div>
        )}

        {gameSlug === 'traffic-management' && (
          <div className="space-y-5 text-center">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border ${nsGreen ? 'border-emerald-400 bg-emerald-500/15' : 'border-rose-400 bg-rose-500/15'}`}>
                <div className="text-xs font-bold text-white">North-South Lane</div>
                <div className="text-2xl font-mono font-bold text-white mt-1">{queues.ns} cars</div>
                <div className="text-[11px] font-bold mt-1 text-slate-200">{nsGreen ? 'GREEN' : 'RED'}</div>
              </div>
              <div className={`p-4 rounded-xl border ${!nsGreen ? 'border-emerald-400 bg-emerald-500/15' : 'border-rose-400 bg-rose-500/15'}`}>
                <div className="text-xs font-bold text-white">East-West Lane</div>
                <div className="text-2xl font-mono font-bold text-white mt-1">{queues.ew} cars</div>
                <div className="text-[11px] font-bold mt-1 text-slate-200">{!nsGreen ? 'GREEN' : 'RED'}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNsGreen((v) => !v);
                triggerHaptic(ctx.hapticsEnabled, 10);
                sfx.click(ctx.soundEnabled);
              }}
              className="w-full min-h-[54px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
            >
              Switch Intersection Signal ⚡
            </button>
          </div>
        )}

        {gameSlug === 'tower-builder' && (
          <div
            onPointerDown={() => {
              if (statusRef.current === 'PLAYING' && !ctx.isPaused && !craneRef.current.dropping) {
                craneRef.current.dropping = true;
              }
            }}
            className="w-full"
          >
            <canvas ref={canvasRef} width={380} height={400} className="w-full rounded-xl block" />
          </div>
        )}

        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Tactical Sim'}
          subtitle="Make fast tactical choices and clear escalating stages."
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default TacticalSimEngine;
