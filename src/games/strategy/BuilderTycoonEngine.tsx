import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

export const BuilderTycoonEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'idle-clicker' }) => {
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);

  // Idle / Cookie clicker state
  const [currency, setCurrency] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [cps, setCps] = useState(0);
  const [upgrades, setUpgrades] = useState<Array<{ id: string; name: string; cost: number; cpsAdd: number; clickAdd: number; owned: number }>>([]);

  // Farm 4x4 grid state
  const [farmPlots, setFarmPlots] = useState<Array<{ crop: string | null; progress: number }>>([]);
  const [selectedSeed, setSelectedSeed] = useState<'wheat' | 'berry' | 'melon'>('wheat');

  // City 5x5 grid state
  const [cityGrid, setCityGrid] = useState<string[]>(Array(25).fill('empty'));
  const [cityTool, setCityTool] = useState<'home' | 'solar' | 'park' | 'tech'>('home');
  const [cityStats, setCityStats] = useState({ pop: 0, power: 2, cycle: 1 });

  // Resource manager state
  const [colony, setColony] = useState({ cycle: 1, ore: 20, energy: 25, food: 25, hull: 100, idle: 6, solar: 2, farm: 2, drill: 2 });

  const statusRef = useRef(status);
  statusRef.current = status;

  const init = useCallback(
    (startImmediately = false) => {
      setScore(0);
      onScoreChange(0);
      setCurrency(gameSlug === 'farm-builder' || gameSlug === 'city-builder' ? 60 : 0);
      setClickPower(1);
      setCps(0);
      setUpgrades(
        gameSlug === 'cookie-factory'
          ? [
              { id: 'u1', name: 'Auto Baker', cost: 15, cpsAdd: 2, clickAdd: 0, owned: 0 },
              { id: 'u2', name: 'Cyber Oven', cost: 65, cpsAdd: 8, clickAdd: 1, owned: 0 },
              { id: 'u3', name: 'Star Bakery', cost: 220, cpsAdd: 28, clickAdd: 3, owned: 0 },
            ]
          : [
              { id: 'u1', name: 'Pulse Tapper', cost: 15, cpsAdd: 0, clickAdd: 2, owned: 0 },
              { id: 'u2', name: 'Energy Drone', cost: 40, cpsAdd: 4, clickAdd: 0, owned: 0 },
              { id: 'u3', name: 'Fusion Reactor', cost: 180, cpsAdd: 20, clickAdd: 2, owned: 0 },
            ]
      );
      setFarmPlots(Array.from({ length: 16 }, () => ({ crop: null, progress: 0 })));
      setCityGrid(Array(25).fill('empty'));
      setCityStats({ pop: 0, power: 2, cycle: 1 });
      setColony({ cycle: 1, ore: 20, energy: 25, food: 25, hull: 100, idle: 0, solar: 2, farm: 2, drill: 2 });

      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [gameSlug, onScoreChange]
  );

  useEffect(() => {
    init(false);
  }, [ctx.restartKey, gameSlug, init]);

  // Passive loop for clickers & farm growth
  useEffect(() => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    if (gameSlug === 'idle-clicker' || gameSlug === 'cookie-factory') {
      if (cps <= 0) return;
      const id = window.setInterval(() => {
        setCurrency((prev) => prev + cps);
        setScore((s) => {
          const nxt = s + cps;
          onScoreChange(nxt);
          return nxt;
        });
      }, 1000);
      return () => clearInterval(id);
    }
    if (gameSlug === 'farm-builder') {
      const id = window.setInterval(() => {
        setFarmPlots((prev) =>
          prev.map((p) => {
            if (!p.crop || p.progress >= 100) return p;
            const rate = p.crop === 'wheat' ? 25 : p.crop === 'berry' ? 18 : 12;
            return { ...p, progress: Math.min(100, p.progress + rate) };
          })
        );
      }, 650);
      return () => clearInterval(id);
    }
  }, [cps, ctx.isPaused, gameSlug, onScoreChange, status]);

  const handleCoreClick = () => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    setCurrency((c) => c + clickPower);
    setScore((s) => {
      const nxt = s + clickPower;
      onScoreChange(nxt);
      return nxt;
    });
    sfx.click(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, 10);
  };

  const buyUpgrade = (idx: number) => {
    const up = upgrades[idx];
    if (!up || currency < up.cost) return;
    setCurrency((c) => c - up.cost);
    setCps((p) => p + up.cpsAdd);
    setClickPower((p) => p + up.clickAdd);
    setUpgrades((prev) =>
      prev.map((u, i) => (i === idx ? { ...u, owned: u.owned + 1, cost: Math.round(u.cost * 1.45) } : u))
    );
    sfx.merge(ctx.soundEnabled);
  };

  const tapFarmPlot = (idx: number) => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    const p = farmPlots[idx];
    const seedCost = selectedSeed === 'wheat' ? 5 : selectedSeed === 'berry' ? 12 : 25;
    const reward = p.crop === 'wheat' ? 14 : p.crop === 'berry' ? 32 : 70;
    if (!p.crop) {
      if (currency < seedCost) return;
      setCurrency((c) => c - seedCost);
      setFarmPlots((prev) => prev.map((it, i) => (i === idx ? { crop: selectedSeed, progress: 10 } : it)));
      sfx.click(ctx.soundEnabled);
    } else if (p.progress >= 100) {
      setCurrency((c) => c + reward);
      setScore((s) => {
        const nxt = s + reward;
        onScoreChange(nxt);
        return nxt;
      });
      setFarmPlots((prev) => prev.map((it, i) => (i === idx ? { crop: null, progress: 0 } : it)));
      sfx.eat(ctx.soundEnabled);
    } else {
      setFarmPlots((prev) => prev.map((it, i) => (i === idx ? { ...it, progress: Math.min(100, it.progress + 25) } : it)));
    }
  };

  const tapCityCell = (idx: number) => {
    if (status !== 'PLAYING' || ctx.isPaused || cityGrid[idx] !== 'empty') return;
    const costs = { home: 15, solar: 20, park: 15, tech: 30 };
    const cost = costs[cityTool];
    if (currency < cost) return;
    const nextGrid = [...cityGrid];
    nextGrid[idx] = cityTool;
    setCityGrid(nextGrid);
    setCurrency((c) => c - cost + (cityTool === 'tech' ? 18 : 8));
    const homes = nextGrid.filter((x) => x === 'home').length;
    const solars = nextGrid.filter((x) => x === 'solar').length;
    const parks = nextGrid.filter((x) => x === 'park').length;
    const techs = nextGrid.filter((x) => x === 'tech').length;
    const pop = homes * 40 + parks * 15 + techs * 25;
    const power = 2 + solars * 3 - homes - techs * 2;
    setCityStats((s) => ({ pop, power, cycle: s.cycle + 1 }));
    const pts = Math.max(0, pop + Math.max(0, power) * 10);
    setScore(pts);
    onScoreChange(pts);
    sfx.click(ctx.soundEnabled);
  };

  const stepColonyCycle = () => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    const nextCycle = colony.cycle + 1;
    const storm = nextCycle % 4 === 0 ? 15 : 0;
    const nextEnergy = colony.energy + colony.solar * 5 - colony.drill * 2 - 4;
    const nextFood = colony.food + colony.farm * 5 - 8;
    const nextOre = colony.ore + colony.drill * 6;
    const nextHull = colony.hull - storm + (colony.solar >= 2 ? 4 : 0);

    if (nextEnergy <= 0 || nextFood <= 0 || nextHull <= 0) {
      setStatus('GAME_OVER');
      sfx.gameOver(ctx.soundEnabled);
      ctx.onScoreEnd(score, false);
      return;
    }

    const pts = nextCycle * 40 + nextOre + nextFood + nextEnergy;
    setColony({ ...colony, cycle: nextCycle, energy: nextEnergy, food: nextFood, ore: nextOre, hull: Math.min(100, nextHull) });
    setScore(pts);
    onScoreChange(pts);
    sfx.clear(ctx.soundEnabled);
    if (nextCycle >= 15) {
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(pts + 300, true);
    }
  };

  const titleMap: Record<string, string> = {
    'idle-clicker': 'Quantum Core Clicker',
    'cookie-factory': 'Cookie Factory Tycoon',
    'farm-builder': 'Harvest Farm Builder',
    'city-builder': 'Metro City Grid Builder',
    'resource-manager': 'Colony Resource Manager',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3 relative">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>Credits: {currency}</span>
        <span>Score: {score}</span>
      </div>

      <div className="relative w-full rounded-2xl border border-cyan-500/35 bg-[#070B19] p-4 min-h-[360px] flex flex-col justify-between gap-4">
        {(gameSlug === 'idle-clicker' || gameSlug === 'cookie-factory') && (
          <>
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="text-xs text-cyan-300 font-mono">+{clickPower} / tap · +{cps} / sec</div>
              <button
                type="button"
                onClick={handleCoreClick}
                className="w-36 h-36 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 shadow-[0_0_32px_rgba(0,229,255,0.4)] active:scale-95 transition-transform flex flex-col items-center justify-center text-white font-display font-bold"
              >
                <span className="text-2xl">{gameSlug === 'cookie-factory' ? 'Cookie' : 'Core'}</span>
                <span className="text-xs opacity-90">Tap!</span>
              </button>
            </div>
            <div className="space-y-2">
              {upgrades.map((u, idx) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => buyUpgrade(idx)}
                  disabled={currency < u.cost}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-45 flex items-center justify-between text-xs text-white"
                >
                  <span className="font-semibold">{u.name} (x{u.owned})</span>
                  <span className="font-mono text-cyan-300">Cost {u.cost}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {gameSlug === 'farm-builder' && (
          <>
            <div className="flex justify-center gap-2">
              {(['wheat', 'berry', 'melon'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSeed(s)}
                  className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold capitalize ${
                    selectedSeed === s ? 'border-emerald-400 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {s} ({s === 'wheat' ? 5 : s === 'berry' ? 12 : 25})
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {farmPlots.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => tapFarmPlot(idx)}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-[11px] font-bold ${
                    !p.crop
                      ? 'border-white/10 bg-white/5 text-slate-400'
                      : p.progress >= 100
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200 animate-pulse'
                      : 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                  }`}
                >
                  <span>{p.crop || 'Plant'}</span>
                  {p.crop && <span className="font-mono text-[10px]">{p.progress >= 100 ? 'Ready!' : `${p.progress}%`}</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {gameSlug === 'city-builder' && (
          <>
            <div className="flex flex-wrap justify-center gap-1.5 text-xs">
              {(['home', 'solar', 'park', 'tech'] as const).map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => setCityTool(tool)}
                  className={`min-h-[38px] px-3 rounded-lg border font-bold capitalize ${
                    cityTool === tool ? 'border-sky-400 bg-sky-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
            <div className="text-center text-xs font-mono text-slate-300">
              Pop: {cityStats.pop} · Power Net: {cityStats.power}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {cityGrid.map((cell, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => tapCityCell(idx)}
                  className={`aspect-square rounded-lg border text-[10px] font-bold uppercase ${
                    cell === 'empty'
                      ? 'border-white/10 bg-white/5 text-slate-500'
                      : cell === 'home'
                      ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                      : cell === 'solar'
                      ? 'border-amber-400/50 bg-amber-500/20 text-amber-200'
                      : cell === 'park'
                      ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                      : 'border-purple-400/50 bg-purple-500/20 text-purple-200'
                  }`}
                >
                  {cell === 'empty' ? '+' : cell}
                </button>
              ))}
            </div>
          </>
        )}

        {gameSlug === 'resource-manager' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">Cycle: {colony.cycle}/15</div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">Hull: {colony.hull}%</div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-amber-300">Energy: {colony.energy}</div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-emerald-300">Food: {colony.food}</div>
            </div>
            <div className="text-xs text-slate-300 font-mono">Idle Drones: {colony.idle} · Ore: {colony.ore}</div>
            {(['solar', 'farm', 'drill'] as const).map((sector) => (
              <div key={sector} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <span className="capitalize font-bold text-white">{sector} Crew: {colony[sector]}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      colony[sector] > 0 && setColony((c) => ({ ...c, [sector]: c[sector] - 1, idle: c.idle + 1 }))
                    }
                    className="w-9 h-9 rounded-lg bg-white/10 text-white font-bold"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      colony.idle > 0 && setColony((c) => ({ ...c, [sector]: c[sector] + 1, idle: c.idle - 1 }))
                    }
                    className="w-9 h-9 rounded-lg bg-cyan-500/30 text-white font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={stepColonyCycle}
              className="w-full min-h-[48px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
            >
              Advance Cycle →
            </button>
          </div>
        )}

        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Strategy Builder'}
          subtitle="Build, automate, and balance resources efficiently to maximize your strategy score."
          score={score}
          gameSlug={gameSlug}
          onStart={() => init(true)}
          onRestart={() => init(true)}
        />
      </div>
    </div>
  );
};

export default BuilderTycoonEngine;
