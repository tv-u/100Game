import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const ClassicTableBoardEngine: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'mancala',
}) => {
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'WON' | 'GAME_OVER'>('PLAYING');
  const [turn, setTurn] = useState<1 | 2>(1);

  // Mancala state: 0..5 = P1 pits, 6 = P1 store, 7..12 = AI pits, 13 = AI store
  const [pits, setPits] = useState<number[]>(() => [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]);

  // Ludo simplified fast 28-step cross track (2 tokens per player)
  const [ludoDice, setLudoDice] = useState<number | null>(null);
  const [ludoP1, setLudoP1] = useState<[number, number]>([-1, -1]); // -1 base, 0..27 track, 28 home
  const [ludoP2, setLudoP2] = useState<[number, number]>([-1, -1]);

  // Battleship 6x6 quick naval grid
  const makeFleet = () => {
    const grid = Array.from({ length: 6 }, () => Array(6).fill(0)); // 0 water, 1 ship, 2 hit, 3 miss
    let placed = 0;
    while (placed < 7) {
      const r = Math.floor(Math.random() * 6);
      const c = Math.floor(Math.random() * 6);
      if (grid[r][c] === 0) {
        grid[r][c] = 1;
        placed++;
      }
    }
    return grid;
  };
  const [enemySea, setEnemySea] = useState<number[][]>(() => makeFleet());
  const [salvos, setSalvos] = useState(20);

  // Chinese checkers (Star Hop 7x7 corner swap race)
  const makeHalma = () => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
    [[0, 0], [0, 1], [1, 0], [0, 2], [1, 1], [2, 0]].forEach(([r, c]) => (g[r][c] = 2));
    [[6, 6], [6, 5], [5, 6], [6, 4], [5, 5], [4, 6]].forEach(([r, c]) => (g[r][c] = 1));
    return g;
  };
  const [halma, setHalma] = useState<number[][]>(() => makeHalma());
  const [halmaSel, setHalmaSel] = useState<[number, number] | null>(null);

  const reset = useCallback(() => {
    setPits([4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
    setLudoDice(null);
    setLudoP1([-1, -1]);
    setLudoP2([-1, -1]);
    setEnemySea(makeFleet());
    setSalvos(20);
    setHalma(makeHalma());
    setHalmaSel(null);
    setTurn(1);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  // Mancala Sow
  const sowMancala = useCallback(
    (pitIdx: number, side: 1 | 2) => {
      if (status !== 'PLAYING' || ctx.isPaused) return;
      const np = [...pits];
      let seeds = np[pitIdx];
      if (seeds === 0) return;
      np[pitIdx] = 0;
      let idx = pitIdx;
      while (seeds > 0) {
        idx = (idx + 1) % 14;
        if ((side === 1 && idx === 13) || (side === 2 && idx === 6)) continue;
        np[idx] += 1;
        seeds -= 1;
      }
      // Capture opposite if landing in empty own pit
      if (side === 1 && idx >= 0 && idx <= 5 && np[idx] === 1 && np[12 - idx] > 0) {
        np[6] += np[12 - idx] + 1;
        np[idx] = 0;
        np[12 - idx] = 0;
      } else if (side === 2 && idx >= 7 && idx <= 12 && np[idx] === 1 && np[12 - idx] > 0) {
        np[13] += np[12 - idx] + 1;
        np[idx] = 0;
        np[12 - idx] = 0;
      }

      const p1Empty = np.slice(0, 6).every((v) => v === 0);
      const p2Empty = np.slice(7, 13).every((v) => v === 0);
      if (p1Empty || p2Empty) {
        np[6] += np.slice(0, 6).reduce((a, b) => a + b, 0);
        np[13] += np.slice(7, 13).reduce((a, b) => a + b, 0);
        for (let i = 0; i < 6; i++) np[i] = 0;
        for (let i = 7; i < 13; i++) np[i] = 0;
        const won = np[6] >= np[13];
        setPits(np);
        const sc = np[6] * 25;
        setScore(sc);
        onScoreChange(sc);
        setStatus(won ? 'WON' : 'GAME_OVER');
        ctx.onScoreEnd(sc, won);
        return;
      }

      setPits(np);
      const sc = np[6] * 25;
      setScore(sc);
      onScoreChange(sc);
      sfx.click(ctx.soundEnabled);
      const freeTurn = (side === 1 && idx === 6) || (side === 2 && idx === 13);
      if (!freeTurn) setTurn(side === 1 ? 2 : 1);
    },
    [ctx, onScoreChange, pits, status]
  );

  // Mancala AI turn
  useEffect(() => {
    if (gameSlug !== 'mancala' || turn !== 2 || status !== 'PLAYING' || ctx.isPaused) return;
    const t = setTimeout(() => {
      const valid = [7, 8, 9, 10, 11, 12].filter((i) => pits[i] > 0);
      if (valid.length > 0) sowMancala(valid[Math.floor(Math.random() * valid.length)], 2);
    }, 380);
    return () => clearTimeout(t);
  }, [ctx.isPaused, gameSlug, pits, sowMancala, status, turn]);

  // Ludo Roll + AI
  const rollLudo = () => {
    if (status !== 'PLAYING' || ludoDice !== null || turn !== 1) return;
    const d = 1 + Math.floor(Math.random() * 6);
    setLudoDice(d);
    sfx.click(ctx.soundEnabled);
    const canMove = ludoP1.some((pos) => (pos === -1 ? d === 6 : pos + d <= 28));
    if (!canMove) {
      setTimeout(() => {
        setLudoDice(null);
        setTurn(2);
      }, 450);
    }
  };

  const moveLudoToken = (idx: 0 | 1) => {
    if (ludoDice === null || turn !== 1) return;
    const pos = ludoP1[idx];
    if (pos === -1 && ludoDice !== 6) return;
    if (pos >= 0 && pos + ludoDice > 28) return;
    const nextPos = pos === -1 ? 0 : pos + ludoDice;
    const np1: [number, number] = [...ludoP1] as [number, number];
    np1[idx] = nextPos;
    setLudoP1(np1);
    const sc = np1.reduce((a, b) => a + Math.max(0, b) * 10, 0);
    setScore(sc);
    onScoreChange(sc);
    sfx.merge(ctx.soundEnabled);
    const rolledSix = ludoDice === 6;
    setLudoDice(null);
    if (np1[0] === 28 && np1[1] === 28) {
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(sc + 300, true);
    } else if (!rolledSix) {
      setTurn(2);
    }
  };

  useEffect(() => {
    if (gameSlug !== 'ludo' || turn !== 2 || status !== 'PLAYING' || ctx.isPaused) return;
    const t = setTimeout(() => {
      const d = 1 + Math.floor(Math.random() * 6);
      const np2: [number, number] = [...ludoP2] as [number, number];
      for (const i of [0, 1] as const) {
        if (np2[i] === -1 && d === 6) {
          np2[i] = 0;
          break;
        } else if (np2[i] >= 0 && np2[i] + d <= 28) {
          np2[i] += d;
          break;
        }
      }
      setLudoP2(np2);
      if (np2[0] === 28 && np2[1] === 28) {
        setStatus('GAME_OVER');
        ctx.onScoreEnd(score, false);
      } else {
        setTurn(1);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [ctx, gameSlug, ludoP2, score, status, turn]);

  // Battleship Salvo
  const fireSalvo = (r: number, c: number) => {
    if (status !== 'PLAYING' || ctx.isPaused || enemySea[r][c] >= 2) return;
    const ns = enemySea.map((row) => [...row]);
    const isHit = ns[r][c] === 1;
    ns[r][c] = isHit ? 2 : 3;
    const nextSalvos = salvos - 1;
    setEnemySea(ns);
    setSalvos(nextSalvos);
    const sc = score + (isHit ? 100 : 0);
    setScore(sc);
    onScoreChange(sc);
    if (isHit) {
      sfx.clear(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 16);
    } else {
      sfx.click(ctx.soundEnabled);
    }
    const shipsLeft = ns.flat().filter((v) => v === 1).length;
    if (shipsLeft === 0) {
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(sc + nextSalvos * 25, true);
    } else if (nextSalvos <= 0) {
      setStatus('GAME_OVER');
      sfx.gameOver(ctx.soundEnabled);
      ctx.onScoreEnd(sc, false);
    }
  };

  if (gameSlug === 'battleship') {
    const shipsLeft = enemySea.flat().filter((v) => v === 1).length;
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        <div className="w-full flex justify-between text-xs font-mono text-cyan-300">
          <span>Enemy Vessels Left: {shipsLeft}</span>
          <span>Salvos: {salvos}</span>
        </div>
        <div className="relative w-full aspect-square p-3 rounded-2xl bg-[#091834] border border-sky-500/40">
          <div className="grid grid-cols-6 gap-1.5 w-full h-full">
            {enemySea.map((row, r) =>
              row.map((val, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => fireSalvo(r, c)}
                  className={`rounded-lg border font-mono text-sm font-bold flex items-center justify-center ${
                    val === 2
                      ? 'bg-rose-500/35 border-rose-400 text-rose-200'
                      : val === 3
                      ? 'bg-slate-800 border-slate-600 text-slate-500'
                      : 'bg-[#10264F] border-sky-500/30 hover:border-cyan-400'
                  }`}
                >
                  {val === 2 ? '✕' : val === 3 ? '•' : ''}
                </button>
              ))
            )}
          </div>
          <GameOverlay status={status} ctx={ctx} title="Naval Battleship vs AI" subtitle="Locate and sink all 7 hidden enemy fleet coordinates before salvos run out!" score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
        </div>
      </div>
    );
  }

  if (gameSlug === 'ludo') {
    return (
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <div className="w-full flex justify-between items-center text-xs font-mono">
          <span className="text-cyan-300 font-bold">{turn === 1 ? 'Your Turn (Cyan)' : 'AI Rolling...'}</span>
          <span>Roll 6 to deploy from Base!</span>
        </div>
        <div className="relative w-full p-5 rounded-2xl bg-[#0D132B] border border-amber-500/40 space-y-4">
          <div className="space-y-2">
            <div className="text-xs text-slate-300 font-semibold">Your Tokens (0 → 28 Home)</div>
            <div className="grid grid-cols-2 gap-3">
              {ludoP1.map((pos, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={ludoDice === null || (pos === -1 && ludoDice !== 6) || (pos >= 0 && pos + ludoDice > 28)}
                  onClick={() => moveLudoToken(idx as 0 | 1)}
                  className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-400/50 disabled:opacity-45 text-left"
                >
                  <div className="text-xs font-bold text-cyan-300">Token #{idx + 1}</div>
                  <div className="font-mono text-sm text-white mt-0.5">
                    {pos === -1 ? 'In Base' : pos === 28 ? 'Home Crown ✓' : `Step ${pos} / 28`}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1 text-xs text-rose-300 font-mono">
            AI Tokens: #{1} {ludoP2[0] === -1 ? 'Base' : `${ludoP2[0]}/28`} · #{2} {ludoP2[1] === -1 ? 'Base' : `${ludoP2[1]}/28`}
          </div>
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={rollLudo}
              disabled={turn !== 1 || ludoDice !== null}
              className="min-h-[48px] px-7 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 font-extrabold text-sm"
            >
              {ludoDice ? `Rolled: ${ludoDice} — Pick Token` : 'Roll Dice'}
            </button>
          </div>
          <GameOverlay status={status} ctx={ctx} title="Ludo Club Local" subtitle="Roll a 6 to deploy tokens and race both tokens to step 28." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
        </div>
      </div>
    );
  }

  if (gameSlug === 'chinese-checkers') {
    const moveHalma = (r: number, c: number) => {
      if (status !== 'PLAYING' || ctx.isPaused) return;
      if (halma[r][c] === 1) {
        setHalmaSel([r, c]);
        sfx.click(ctx.soundEnabled);
        return;
      }
      if (halmaSel && halma[r][c] === 0) {
        const [sr, sc] = halmaSel;
        const dr = Math.abs(r - sr);
        const dc = Math.abs(c - sc);
        const isStep = dr <= 1 && dc <= 1;
        const isJump = (dr === 2 && dc === 0 || dr === 0 && dc === 2 || dr === 2 && dc === 2) && halma[(sr + r) / 2][(sc + c) / 2] !== 0;
        if (isStep || isJump) {
          const ng = halma.map((row) => [...row]);
          ng[sr][sc] = 0;
          ng[r][c] = 1;
          setHalma(ng);
          setHalmaSel(null);
          const scNext = score + (isJump ? 40 : 10);
          setScore(scNext);
          onScoreChange(scNext);
          sfx.merge(ctx.soundEnabled);
          const won = [[0, 0], [0, 1], [1, 0], [0, 2], [1, 1], [2, 0]].every(([gr, gc]) => ng[gr][gc] === 1);
          if (won) {
            setStatus('WON');
            sfx.win(ctx.soundEnabled);
            ctx.onScoreEnd(scNext + 400, true);
          }
        }
      }
    };

    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        <div className="text-xs font-mono text-pink-300">Move or hop all 6 Cyan pegs into the top-left corner!</div>
        <div className="relative w-full aspect-square p-3 rounded-2xl bg-[#0D132B] border border-pink-500/40">
          <div className="grid grid-cols-7 gap-1.5 w-full h-full">
            {halma.map((row, r) =>
              row.map((val, c) => {
                const isSel = halmaSel?.[0] === r && halmaSel?.[1] === c;
                const isGoal = r + c <= 2;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => moveHalma(r, c)}
                    className={`rounded-full border flex items-center justify-center ${
                      isSel
                        ? 'border-white ring-2 ring-cyan-400'
                        : isGoal
                        ? 'border-amber-400/50 bg-amber-500/10'
                        : 'border-white/15 bg-[#151F42]'
                    }`}
                  >
                    {val === 1 && <span className="w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_10px_#00E5FF]" />}
                    {val === 2 && <span className="w-6 h-6 rounded-full bg-rose-500/75" />}
                  </button>
                );
              })
            )}
          </div>
          <GameOverlay status={status} ctx={ctx} title="Star Halma Hop" subtitle="Step adjacent or leap over any peg to reach the top-left home triangle." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
        </div>
      </div>
    );
  }

  // Mancala default
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-4">
      <div className="text-xs font-mono text-amber-300 font-bold">
        {turn === 1 ? 'Your Turn — Pick one of your 6 lower pits' : 'Opponent Sowing Seeds...'}
      </div>
      <div className="relative w-full p-4 rounded-2xl bg-[#18120B] border border-amber-500/45 flex items-center gap-3">
        {/* AI Store (13) */}
        <div className="w-16 h-36 rounded-2xl bg-[#2B1F12] border border-rose-500/40 flex flex-col items-center justify-center">
          <span className="text-[10px] text-rose-300">RIVAL</span>
          <span className="font-mono text-2xl font-bold text-white">{pits[13]}</span>
        </div>

        {/* Two rows of 6 pits */}
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-6 gap-2">
            {[12, 11, 10, 9, 8, 7].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-[#271C10] border border-white/10 flex items-center justify-center font-mono font-bold text-rose-300">
                {pits[i]}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                disabled={turn !== 1 || pits[i] === 0}
                onClick={() => sowMancala(i, 1)}
                className="h-14 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-400/50 flex items-center justify-center font-mono text-lg font-bold text-white"
              >
                {pits[i]}
              </button>
            ))}
          </div>
        </div>

        {/* Player Store (6) */}
        <div className="w-16 h-36 rounded-2xl bg-[#2B1F12] border border-cyan-400/50 flex flex-col items-center justify-center">
          <span className="text-[10px] text-cyan-300">YOU</span>
          <span className="font-mono text-2xl font-bold text-white">{pits[6]}</span>
        </div>

        <GameOverlay status={status} ctx={ctx} title="Mancala Pit Capture" subtitle="Sow seeds counter-clockwise. Landing in your store grants a free turn!" score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
      </div>
    </div>
  );
};

export default ClassicTableBoardEngine;
