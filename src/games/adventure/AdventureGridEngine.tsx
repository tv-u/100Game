import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

// Procedural 9x9 recursive backtracker maze
function buildMaze(size = 9): number[][] {
  const g = Array.from({ length: size }, () => Array(size).fill(1));
  const dirs = [
    [0, -2],
    [2, 0],
    [0, 2],
    [-2, 0],
  ];
  const carve = (x: number, y: number) => {
    g[y][x] = 0;
    const shuffled = [...dirs].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of shuffled) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && g[ny][nx] === 1) {
        g[y + dy / 2][x + dx / 2] = 0;
        carve(nx, ny);
      }
    }
  };
  carve(0, 0);
  g[size - 1][size - 1] = 0;
  return g;
}

export const AdventureGridEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'maze-escape' }) => {
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);

  // Maze & Dungeon Escape state
  const [maze, setMaze] = useState<number[][]>(() => buildMaze(9));
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hasKey, setHasKey] = useState(false);
  const [guard, setGuard] = useState({ x: 4, y: 4, dir: 1 });

  // Treasure Hunt 6x6 radar digs
  const [chests, setChests] = useState<Array<{ x: number; y: number; found: boolean }>>([]);
  const [dug, setDug] = useState<Record<string, number>>({});
  const [digsLeft, setDigsLeft] = useState(16);

  // Escape Room 4-lock state
  const [locks, setLocks] = useState([false, false, false, false]);
  const [dialVals, setDialVals] = useState([1, 2, 3]);
  const [keypad, setKeypad] = useState('');

  // Laser Reflection 6x6 mirrors ('/' or '\\' or null)
  const [mirrors, setMirrors] = useState<Array<Array<0 | 1 | 2>>>([]); // 0 empty, 1 '/', 2 '\'

  // Portal Puzzle 6x6
  const [crate, setCrate] = useState({ x: 2, y: 2 });

  const statusRef = useRef(status);
  statusRef.current = status;

  const initStage = useCallback(
    (sNum: number) => {
      setStage(sNum);
      setMaze(buildMaze(9));
      setPos({ x: 0, y: 0 });
      setHasKey(gameSlug !== 'dungeon-escape');
      setGuard({ x: 4, y: 4, dir: 1 });

      // Treasure Hunt chests
      const cList: Array<{ x: number; y: number; found: boolean }> = [];
      while (cList.length < 3) {
        const x = Math.floor(Math.random() * 6);
        const y = Math.floor(Math.random() * 6);
        if (!cList.some((c) => c.x === x && c.y === y)) cList.push({ x, y, found: false });
      }
      setChests(cList);
      setDug({});
      setDigsLeft(16);

      // Escape Room
      setLocks([false, false, false, false]);
      setDialVals([0, 1, 2]);
      setKeypad('');

      // Laser mirrors: source at (0,1) going right -> target at (5,4)
      const m = Array.from({ length: 6 }, () => Array<0 | 1 | 2>(6).fill(0));
      m[1][4] = 1; // needs '\' (2) to bounce down
      m[4][4] = 2; // needs '\' (2) or '/' (1) to bounce right -> at (4,4) going down, '/' (1) bounces left, '\' (2) bounces right
      m[1][2] = 2;
      setMirrors(m);

      // Portal Puzzle
      setCrate({ x: 2, y: 2 });
    },
    [gameSlug]
  );

  const reset = useCallback(
    (startImmediately = false) => {
      setScore(0);
      onScoreChange(0);
      initStage(1);
      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [initStage, onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  const stepGrid = useCallback(
    (dx: number, dy: number) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;

      if (gameSlug === 'portal-puzzle') {
        const nx = Math.max(0, Math.min(5, pos.x + dx));
        const ny = Math.max(0, Math.min(5, pos.y + dy));
        // Crate push
        if (nx === crate.x && ny === crate.y) {
          const cx = crate.x + dx;
          const cy = crate.y + dy;
          if (cx < 0 || cx > 5 || cy < 0 || cy > 5) return;
          setCrate({ x: cx, y: cy });
        }
        // Linked portals at (1,4) <-> (4,1)
        let fx = nx;
        let fy = ny;
        if (nx === 1 && ny === 4) {
          fx = 4;
          fy = 1;
          sfx.merge(ctx.soundEnabled);
        } else if (nx === 4 && ny === 1) {
          fx = 1;
          fy = 4;
          sfx.merge(ctx.soundEnabled);
        } else {
          sfx.click(ctx.soundEnabled);
        }
        setPos({ x: fx, y: fy });

        const switchOn = crate.x === 4 && crate.y === 4;
        if (fx === 5 && fy === 5 && switchOn) {
          const ns = score + 200;
          setScore(ns);
          onScoreChange(ns);
          sfx.clear(ctx.soundEnabled);
          initStage(stage + 1);
        }
        return;
      }

      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx < 0 || nx >= 9 || ny < 0 || ny >= 9 || maze[ny][nx] === 1) {
        triggerHaptic(ctx.hapticsEnabled, 18);
        return;
      }

      if (gameSlug === 'dungeon-escape' && nx === 4 && ny === 0) {
        setHasKey(true);
        sfx.merge(ctx.soundEnabled);
      }

      // Guard patrol
      let ng = guard;
      if (gameSlug === 'dungeon-escape') {
        let gx = guard.x + guard.dir;
        let gd = guard.dir;
        if (gx < 2 || gx > 6) {
          gd *= -1;
          gx = guard.x + gd;
        }
        ng = { x: gx, y: 4, dir: gd };
        setGuard(ng);
        if (nx === ng.x && ny === ng.y) {
          setStatus('GAME_OVER');
          sfx.gameOver(ctx.soundEnabled);
          ctx.onScoreEnd(score, false);
          return;
        }
      }

      setPos({ x: nx, y: ny });
      sfx.click(ctx.soundEnabled);
      if (nx === 8 && ny === 8 && hasKey) {
        const ns = score + 150;
        setScore(ns);
        onScoreChange(ns);
        sfx.clear(ctx.soundEnabled);
        initStage(stage + 1);
      }
    },
    [crate.x, crate.y, ctx, gameSlug, guard, hasKey, initStage, maze, onScoreChange, pos.x, pos.y, score, stage]
  );

  useEffect(() => {
    if (gameSlug !== 'maze-escape' && gameSlug !== 'dungeon-escape' && gameSlug !== 'portal-puzzle') return;
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        stepGrid(0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        stepGrid(0, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        e.preventDefault();
        stepGrid(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault();
        stepGrid(1, 0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx.isPaused, gameSlug, stepGrid]);

  // Trace Laser Reflection beam
  const traceLaser = (grid: Array<Array<0 | 1 | 2>>) => {
    const path = new Set<string>();
    let x = 0;
    let y = 1;
    let dx = 1;
    let dy = 0;
    let hitTarget = false;
    for (let step = 0; step < 32; step++) {
      if (x < 0 || x >= 6 || y < 0 || y >= 6) break;
      path.add(`${x},${y}`);
      if (x === 5 && y === 4) {
        hitTarget = true;
        break;
      }
      const m = grid[y][x];
      if (m === 1) {
        // '/' reflects (dx,dy) -> (-dy, -dx)
        const ndx = -dy;
        const ndy = -dx;
        dx = ndx;
        dy = ndy;
      } else if (m === 2) {
        // '\' reflects (dx,dy) -> (dy, dx)
        const ndx = dy;
        const ndy = dx;
        dx = ndx;
        dy = ndy;
      }
      x += dx;
      y += dy;
    }
    return { path, hitTarget };
  };

  const titleMap: Record<string, string> = {
    'maze-escape': 'Labyrinth Maze Escape',
    'dungeon-escape': 'Crypt Key Escape',
    'treasure-hunt': 'Radar Treasure Hunt',
    'escape-room': 'Cipher Vault Escape Room',
    'laser-reflection': 'Prism Laser Reflection',
    'portal-puzzle': 'Quantum Portal Puzzle',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>Stage {stage} {gameSlug === 'treasure-hunt' ? `· Digs Left: ${digsLeft}` : ''}</span>
        <span>Score: {score}</span>
      </div>

      <div className="relative w-full rounded-2xl border border-cyan-500/35 bg-[#070B19] p-4 min-h-[370px] flex flex-col items-center justify-center gap-4">
        {(gameSlug === 'maze-escape' || gameSlug === 'dungeon-escape') && (
          <>
            <div className="grid grid-cols-9 gap-0.5 w-full max-w-[300px]">
              {maze.flatMap((row, y) =>
                row.map((wall, x) => {
                  const isP = pos.x === x && pos.y === y;
                  const isExit = x === 8 && y === 8;
                  const isKey = gameSlug === 'dungeon-escape' && !hasKey && x === 4 && y === 0;
                  const isGuard = gameSlug === 'dungeon-escape' && guard.x === x && guard.y === y;
                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`aspect-square rounded-[4px] flex items-center justify-center text-[10px] font-bold ${
                        isP
                          ? 'bg-cyan-400 text-slate-950'
                          : isGuard
                          ? 'bg-rose-500 text-white'
                          : isKey
                          ? 'bg-amber-400 text-slate-950'
                          : isExit
                          ? hasKey
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-600 text-slate-300'
                          : wall === 1
                          ? 'bg-[#17213F]'
                          : 'bg-[#0C1226]'
                      }`}
                    >
                      {isP ? 'P' : isGuard ? '!' : isKey ? 'K' : isExit ? 'E' : ''}
                    </div>
                  );
                })
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5 w-44">
              <div />
              <button type="button" onClick={() => stepGrid(0, -1)} className="h-11 rounded-xl bg-white/10 text-white font-bold">↑</button>
              <div />
              <button type="button" onClick={() => stepGrid(-1, 0)} className="h-11 rounded-xl bg-white/10 text-white font-bold">←</button>
              <button type="button" onClick={() => stepGrid(0, 1)} className="h-11 rounded-xl bg-white/10 text-white font-bold">↓</button>
              <button type="button" onClick={() => stepGrid(1, 0)} className="h-11 rounded-xl bg-white/10 text-white font-bold">→</button>
            </div>
          </>
        )}

        {gameSlug === 'treasure-hunt' && (
          <div className="grid grid-cols-6 gap-2 w-full max-w-[300px]">
            {Array.from({ length: 36 }, (_, idx) => {
              const x = idx % 6;
              const y = Math.floor(idx / 6);
              const k = `${x},${y}`;
              const chest = chests.find((c) => c.x === x && c.y === y);
              const revealedDist = dug[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (status !== 'PLAYING' || ctx.isPaused || revealedDist !== undefined) return;
                    if (chest) {
                      const nextC = chests.map((c) => (c.x === x && c.y === y ? { ...c, found: true } : c));
                      setChests(nextC);
                      setDug((d) => ({ ...d, [k]: 0 }));
                      const ns = score + 150;
                      setScore(ns);
                      onScoreChange(ns);
                      sfx.eat(ctx.soundEnabled);
                      if (nextC.every((c) => c.found)) {
                        sfx.clear(ctx.soundEnabled);
                        initStage(stage + 1);
                      }
                    } else {
                      const minD = Math.min(...chests.filter((c) => !c.found).map((c) => Math.abs(c.x - x) + Math.abs(c.y - y)));
                      setDug((d) => ({ ...d, [k]: minD }));
                      sfx.click(ctx.soundEnabled);
                      const rem = digsLeft - 1;
                      setDigsLeft(rem);
                      if (rem <= 0) {
                        setStatus('GAME_OVER');
                        sfx.gameOver(ctx.soundEnabled);
                        ctx.onScoreEnd(score, false);
                      }
                    }
                  }}
                  className={`aspect-square rounded-xl border font-mono text-xs font-bold flex items-center justify-center ${
                    revealedDist === 0
                      ? 'border-amber-400 bg-amber-500/30 text-amber-200'
                      : revealedDist !== undefined
                      ? revealedDist <= 2
                        ? 'border-rose-400/50 bg-rose-500/20 text-rose-200'
                        : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {revealedDist === undefined ? '?' : revealedDist === 0 ? '★' : revealedDist}
                </button>
              );
            })}
          </div>
        )}

        {gameSlug === 'escape-room' && (
          <div className="w-full space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
              {locks.map((ok, i) => (
                <div key={i} className={`py-2 rounded-lg border ${ok ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                  Lock {i + 1}: {ok ? 'OPEN' : 'LOCKED'}
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-xs text-cyan-300 font-semibold">Module A · Align Dials to [4 - 2 - 6]</div>
              <div className="flex gap-2 justify-center">
                {dialVals.map((v, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const nxt = dialVals.map((d, i) => (i === idx ? (d + 1) % 8 : d));
                      setDialVals(nxt);
                      if (nxt[0] === 4 && nxt[1] === 2 && nxt[2] === 6) {
                        setLocks((l) => [true, l[1], l[2], l[3]]);
                        setScore((s) => {
                          const ns = s + 100;
                          onScoreChange(ns);
                          return ns;
                        });
                        sfx.clear(ctx.soundEnabled);
                      }
                    }}
                    className="w-14 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 font-mono text-lg font-bold text-white"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-xs text-purple-300 font-semibold">Module B · Toggle All 3 Security Breakers</div>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3].map((bIdx) => (
                  <button
                    key={bIdx}
                    type="button"
                    onClick={() => {
                      setLocks((prev) => {
                        const nxt = [...prev];
                        nxt[bIdx] = true;
                        const pts = nxt.filter(Boolean).length * 100;
                        setScore(pts);
                        onScoreChange(pts);
                        sfx.eat(ctx.soundEnabled);
                        if (nxt.every(Boolean)) {
                          setStatus('WON');
                          sfx.win(ctx.soundEnabled);
                          ctx.onScoreEnd(pts + 200, true);
                        }
                        return nxt;
                      });
                    }}
                    className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold ${
                      locks[bIdx] ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200' : 'border-white/15 bg-white/5 text-white'
                    }`}
                  >
                    Breaker {bIdx}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameSlug === 'laser-reflection' && (() => {
          const { path } = traceLaser(mirrors);
          return (
            <div className="grid grid-cols-6 gap-1.5 w-full max-w-[300px]">
              {mirrors.flatMap((row, y) =>
                row.map((val, x) => {
                  const isSource = x === 0 && y === 1;
                  const isTarget = x === 5 && y === 4;
                  const lit = path.has(`${x},${y}`);
                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      onClick={() => {
                        if (status !== 'PLAYING' || ctx.isPaused) return;
                        const nxt = mirrors.map((r) => [...r]);
                        nxt[y][x] = ((val + 1) % 3) as 0 | 1 | 2;
                        setMirrors(nxt);
                        sfx.click(ctx.soundEnabled);
                        const res = traceLaser(nxt);
                        if (res.hitTarget) {
                          const ns = score + 200;
                          setScore(ns);
                          onScoreChange(ns);
                          setStatus('WON');
                          sfx.win(ctx.soundEnabled);
                          ctx.onScoreEnd(ns, true);
                        }
                      }}
                      className={`aspect-square rounded-lg border flex items-center justify-center font-mono text-lg font-bold ${
                        isSource
                          ? 'border-cyan-400 bg-cyan-500/30 text-white'
                          : isTarget
                          ? 'border-emerald-400 bg-emerald-500/30 text-emerald-200'
                          : lit
                          ? 'border-rose-400/60 bg-rose-500/20 text-amber-300'
                          : 'border-white/10 bg-white/5 text-slate-300'
                      }`}
                    >
                      {isSource ? '►' : isTarget ? '◎' : val === 1 ? '/' : val === 2 ? '\\' : ''}
                    </button>
                  );
                })
              )}
            </div>
          );
        })()}

        {gameSlug === 'portal-puzzle' && (
          <>
            <div className="grid grid-cols-6 gap-1.5 w-full max-w-[290px]">
              {Array.from({ length: 36 }, (_, idx) => {
                const x = idx % 6;
                const y = Math.floor(idx / 6);
                const isP = pos.x === x && pos.y === y;
                const isCrate = crate.x === x && crate.y === y;
                const isPortal = (x === 1 && y === 4) || (x === 4 && y === 1);
                const isSwitch = x === 4 && y === 4;
                const isExit = x === 5 && y === 5;
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-lg border flex items-center justify-center text-xs font-bold ${
                      isP
                        ? 'border-white bg-cyan-500 text-slate-950'
                        : isCrate
                        ? 'border-amber-400 bg-amber-500/35 text-amber-200'
                        : isPortal
                        ? 'border-purple-400 bg-purple-500/30 text-purple-200'
                        : isSwitch
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                        : isExit
                        ? 'border-cyan-400 bg-cyan-500/25 text-white'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    {isP ? 'P' : isCrate ? 'Box' : isPortal ? '◎' : isSwitch ? 'SW' : isExit ? 'EX' : ''}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-1.5 w-44">
              <div />
              <button type="button" onClick={() => stepGrid(0, -1)} className="h-11 rounded-xl bg-white/10 text-white font-bold">↑</button>
              <div />
              <button type="button" onClick={() => stepGrid(-1, 0)} className="h-11 rounded-xl bg-white/10 text-white font-bold">←</button>
              <button type="button" onClick={() => stepGrid(0, 1)} className="h-11 rounded-xl bg-white/10 text-white font-bold">↓</button>
              <button type="button" onClick={() => stepGrid(1, 0)} className="h-11 rounded-xl bg-white/10 text-white font-bold">→</button>
            </div>
          </>
        )}

        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Adventure Puzzle'}
          subtitle="Explore labyrinths, unlock vaults, reflect beams, and push crates through portals."
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default AdventureGridEngine;
