import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const NONO_SOL = [
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 1, 0, 1, 0],
];

const getClues = (line: number[]) => {
  const out: number[] = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run > 0) {
      out.push(run);
      run = 0;
    }
  }
  if (run > 0) out.push(run);
  return out.length ? out : [0];
};

const LogicGridPuzzleEngine: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'nonogram',
}) => {
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'WON'>('PLAYING');
  const [score, setScore] = useState(0);

  // Nonogram state
  const [nono, setNono] = useState<number[][]>(() => Array.from({ length: 5 }, () => Array(5).fill(0)));
  // Lights out state (5x5 solvable via random reverse toggles)
  const makeLights = () => {
    const g = Array.from({ length: 5 }, () => Array(5).fill(false));
    const toggle = (r: number, c: number) => {
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) g[nr][nc] = !g[nr][nc];
      });
    };
    for (let i = 0; i < 6; i++) toggle(Math.floor(Math.random() * 5), Math.floor(Math.random() * 5));
    return g;
  };
  const [lights, setLights] = useState<boolean[][]>(() => makeLights());

  // Jigsaw 4x4 swap state
  const makeJigsaw = () => {
    const arr = Array.from({ length: 16 }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const [jigsaw, setJigsaw] = useState<number[]>(() => makeJigsaw());
  const [jigSel, setJigSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  const reset = useCallback(() => {
    setNono(Array.from({ length: 5 }, () => Array(5).fill(0)));
    setLights(makeLights());
    setJigsaw(makeJigsaw());
    setJigSel(null);
    setMoves(0);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const handleNonoTap = (r: number, c: number) => {
    if (ctx.isPaused || status !== 'PLAYING') return;
    const next = nono.map((row) => [...row]);
    next[r][c] = next[r][c] === 1 ? 0 : 1;
    setNono(next);
    sfx.click(ctx.soundEnabled);
    let ok = true;
    let filled = 0;
    for (let rr = 0; rr < 5; rr++) {
      for (let cc = 0; cc < 5; cc++) {
        if (next[rr][cc] !== NONO_SOL[rr][cc]) ok = false;
        if (next[rr][cc] === 1) filled++;
      }
    }
    const sc = filled * 20;
    setScore(sc);
    onScoreChange(sc);
    if (ok) {
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(500, true);
    }
  };

  const handleLightTap = (r: number, c: number) => {
    if (ctx.isPaused || status !== 'PLAYING') return;
    const next = lights.map((row) => [...row]);
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) next[nr][nc] = !next[nr][nc];
    });
    const nextMoves = moves + 1;
    setLights(next);
    setMoves(nextMoves);
    sfx.click(ctx.soundEnabled);
    const sc = Math.max(50, 600 - nextMoves * 15);
    setScore(sc);
    onScoreChange(sc);
    if (next.every((row) => row.every((v) => !v))) {
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(sc, true);
    }
  };

  const handleJigTap = (idx: number) => {
    if (ctx.isPaused || status !== 'PLAYING') return;
    if (jigSel === null) {
      setJigSel(idx);
      sfx.click(ctx.soundEnabled);
      return;
    }
    const next = [...jigsaw];
    [next[jigSel], next[idx]] = [next[idx], next[jigSel]];
    const nextMoves = moves + 1;
    setJigsaw(next);
    setJigSel(null);
    setMoves(nextMoves);
    triggerHaptic(ctx.hapticsEnabled, 10);
    const correctCount = next.filter((v, i) => v === i).length;
    const sc = correctCount * 30;
    setScore(sc);
    onScoreChange(sc);
    if (correctCount === 16) {
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(sc + 200, true);
    }
  };

  if (gameSlug === 'lights-out') {
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        <div className="text-xs font-mono text-slate-300">Moves: {moves} · Turn every glowing light OFF</div>
        <div className="relative w-full aspect-square p-3 rounded-2xl bg-[#0D132B] border border-amber-500/40">
          <div className="grid grid-cols-5 gap-2 w-full h-full">
            {lights.map((row, r) =>
              row.map((on, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleLightTap(r, c)}
                  className={`rounded-xl border transition-all ${
                    on
                      ? 'bg-amber-400 border-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.65)]'
                      : 'bg-[#161F42] border-white/10'
                  }`}
                />
              ))
            )}
          </div>
          <GameOverlay status={status} ctx={ctx} title="Lights Out Matrix" subtitle="Tapping a tile toggles it and its 4 neighbors." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
        </div>
      </div>
    );
  }

  if (gameSlug === 'jigsaw-puzzle') {
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        <div className="text-xs font-mono text-slate-300">Tap two tiles to swap into gradient & number order 1–16</div>
        <div className="relative w-full aspect-square p-3 rounded-2xl bg-[#0D132B] border border-purple-500/40">
          <div className="grid grid-cols-4 gap-1.5 w-full h-full">
            {jigsaw.map((val, idx) => {
              const correct = val === idx;
              const hue = Math.round((val / 16) * 260 + 180);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleJigTap(idx)}
                  style={{
                    backgroundColor: `hsla(${hue}, 78%, 48%, 0.78)`,
                  }}
                  className={`rounded-xl border-2 font-mono text-lg font-bold text-white flex items-center justify-center ${
                    jigSel === idx ? 'border-white scale-95' : correct ? 'border-emerald-300' : 'border-white/20'
                  }`}
                >
                  {val + 1}
                </button>
              );
            })}
          </div>
          <GameOverlay status={status} ctx={ctx} title="Tile Swap Jigsaw" subtitle="Restore the neon spectrum 1 to 16." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-3">
      <div className="relative w-full p-3 rounded-2xl bg-[#0D132B] border border-purple-500/40">
        <div className="grid grid-cols-6 gap-1.5 items-center">
          <div />
          {[0, 1, 2, 3, 4].map((c) => (
            <div key={c} className="text-center font-mono text-[11px] font-bold text-cyan-300 leading-tight">
              {getClues(NONO_SOL.map((row) => row[c])).join(' ')}
            </div>
          ))}
          {nono.map((row, r) => (
            <React.Fragment key={r}>
              <div className="text-right pr-1.5 font-mono text-[11px] font-bold text-cyan-300">
                {getClues(NONO_SOL[r]).join(' ')}
              </div>
              {row.map((val, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleNonoTap(r, c)}
                  className={`aspect-square rounded-lg border transition-colors ${
                    val === 1 ? 'bg-purple-500 border-purple-300' : 'bg-[#161F42] border-white/15'
                  }`}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
        <GameOverlay status={status} ctx={ctx} title="Nonogram Picross" subtitle="Match row and column block length clues." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
      </div>
    </div>
  );
};

export default LogicGridPuzzleEngine;
