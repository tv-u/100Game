import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const COLORS = ['#00E5FF', '#EC4899', '#F59E0B', '#10B981'];
const CAP = 4;

const createTubes = (): string[][] => {
  const pool: string[] = [];
  for (const c of COLORS) for (let i = 0; i < CAP; i++) pool.push(c);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [pool.slice(0, 4), pool.slice(4, 8), pool.slice(8, 12), pool.slice(12, 16), [], []];
};

const SortPuzzleEngine: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'color-sort',
}) => {
  const [tubes, setTubes] = useState<string[][]>(() => createTubes());
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'WON'>('PLAYING');

  const isBall = gameSlug === 'ball-sort';

  const reset = useCallback(() => {
    setTubes(createTubes());
    setSelected(null);
    setMoves(0);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const handleTubeTap = (idx: number) => {
    if (ctx.isPaused || status !== 'PLAYING') return;
    if (selected === null) {
      if (tubes[idx].length > 0) {
        setSelected(idx);
        sfx.click(ctx.soundEnabled);
      }
      return;
    }
    if (selected === idx) {
      setSelected(null);
      return;
    }

    const src = tubes[selected];
    const dst = tubes[idx];
    const topColor = src[src.length - 1];
    if (dst.length >= CAP || (dst.length > 0 && dst[dst.length - 1] !== topColor)) {
      sfx.bounce(ctx.soundEnabled);
      setSelected(null);
      return;
    }

    const next = tubes.map((t) => [...t]);
    next[idx].push(next[selected].pop()!);
    const nextMoves = moves + 1;
    setTubes(next);
    setSelected(null);
    setMoves(nextMoves);
    sfx.merge(ctx.soundEnabled);
    triggerHaptic(ctx.hapticsEnabled, 10);

    const solvedCount = next.filter((t) => t.length === CAP && t.every((c) => c === t[0])).length;
    const sc = solvedCount * 100 + Math.max(0, 200 - nextMoves * 3);
    setScore(sc);
    onScoreChange(sc);

    if (solvedCount === COLORS.length) {
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(sc, true);
    }
  };

  const title = gameSlug === 'ball-sort' ? 'Ball Sort Stack' : gameSlug === 'water-sort' ? 'Water Sort Flask' : 'Color Tube Sort';

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-4">
      <div className="text-xs font-mono text-slate-300">Moves: {moves} · Tap source then target tube</div>
      <div className="relative w-full p-5 rounded-2xl bg-[#0D132B] border border-pink-500/40">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 justify-items-center">
          {tubes.map((tube, idx) => {
            const isSel = selected === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleTubeTap(idx)}
                className={`w-14 h-40 rounded-b-2xl rounded-t-md border-2 p-1.5 flex flex-col-reverse gap-1.5 bg-[#080C1C] transition-transform ${
                  isSel ? 'border-cyan-400 -translate-y-2 shadow-[0_0_16px_rgba(0,229,255,0.4)]' : 'border-slate-500/60 hover:border-slate-300'
                }`}
              >
                {tube.map((clr, layerIdx) => (
                  <div
                    key={layerIdx}
                    style={{ backgroundColor: clr }}
                    className={`w-full ${isBall ? 'h-8 rounded-full' : 'h-7 rounded-md'} border border-white/25`}
                  />
                ))}
              </button>
            );
          })}
        </div>
        <GameOverlay status={status} ctx={ctx} title={title} subtitle="Group matching colors into separate tubes." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
      </div>
    </div>
  );
};

export default SortPuzzleEngine;
