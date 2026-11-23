import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

interface Tile {
  id: number;
  r: number;
  c: number;
  layer: number;
  symbol: string;
  color: string;
  removed: boolean;
}

const SYMBOLS = [
  { s: '龍', c: '#EF4444' },
  { s: '風', c: '#00E5FF' },
  { s: '竹', c: '#10B981' },
  { s: '花', c: '#EC4899' },
  { s: '星', c: '#F59E0B' },
  { s: '月', c: '#A855F7' },
  { s: '山', c: '#3B82F6' },
  { s: '火', c: '#F97316' },
  { s: '水', c: '#06B6D4' },
];

const generateLayout = (): Tile[] => {
  const slots: Array<{ r: number; c: number; layer: number }> = [];
  // Layer 0: 6x4 = 24
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) slots.push({ r, c, layer: 0 });
  // Layer 1: 4x2 = 8
  for (let r = 1; r < 3; r++) for (let c = 1; c < 5; c++) slots.push({ r, c, layer: 1 });
  // Layer 2: 2x2 = 4 (Total 36 tiles = 18 pairs)
  for (let r = 1; r < 3; r++) for (let c = 2; c < 4; c++) slots.push({ r, c, layer: 2 });

  const pool: typeof SYMBOLS = [];
  for (let i = 0; i < slots.length / 2; i++) {
    const sym = SYMBOLS[i % SYMBOLS.length];
    pool.push(sym, sym);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return slots.map((slot, id) => ({
    id,
    ...slot,
    symbol: pool[id].s,
    color: pool[id].c,
    removed: false,
  }));
};

const isTileFree = (tile: Tile, tiles: Tile[]) => {
  if (tile.removed) return false;
  const active = tiles.filter((t) => !t.removed && t.id !== tile.id);
  const blockedAbove = active.some((t) => t.layer > tile.layer && t.r === tile.r && t.c === tile.c);
  if (blockedAbove) return false;
  const leftBlocked = active.some((t) => t.layer === tile.layer && t.r === tile.r && t.c === tile.c - 1);
  const rightBlocked = active.some((t) => t.layer === tile.layer && t.r === tile.r && t.c === tile.c + 1);
  return !(leftBlocked && rightBlocked);
};

const MahjongGame: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'mahjong-solitaire',
}) => {
  const [tiles, setTiles] = useState<Tile[]>(() => generateLayout());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'WON'>('PLAYING');

  const reset = useCallback(() => {
    setTiles(generateLayout());
    setSelectedId(null);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const shuffleRemaining = () => {
    const remaining = tiles.filter((t) => !t.removed);
    const syms = remaining.map((t) => ({ symbol: t.symbol, color: t.color }));
    for (let i = syms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [syms[i], syms[j]] = [syms[j], syms[i]];
    }
    let idx = 0;
    setTiles(tiles.map((t) => (t.removed ? t : { ...t, ...syms[idx++] })));
    setSelectedId(null);
    sfx.click(ctx.soundEnabled);
  };

  const handleTileTap = (tile: Tile) => {
    if (ctx.isPaused || status !== 'PLAYING' || !isTileFree(tile, tiles)) return;
    if (selectedId === tile.id) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null) {
      setSelectedId(tile.id);
      sfx.click(ctx.soundEnabled);
      return;
    }
    const prev = tiles.find((t) => t.id === selectedId);
    if (prev && prev.symbol === tile.symbol) {
      const next = tiles.map((t) => (t.id === prev.id || t.id === tile.id ? { ...t, removed: true } : t));
      const nextScore = score + 50;
      setTiles(next);
      setSelectedId(null);
      setScore(nextScore);
      onScoreChange(nextScore);
      sfx.clear(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 12);
      if (next.every((t) => t.removed)) {
        setStatus('WON');
        sfx.win(ctx.soundEnabled);
        ctx.onScoreEnd(nextScore, true);
      }
    } else {
      setSelectedId(tile.id);
      sfx.bounce(ctx.soundEnabled);
    }
  };

  const remainingCount = tiles.filter((t) => !t.removed).length;

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1">
        <span>Tiles Left: {remainingCount}</span>
        <button
          type="button"
          onClick={shuffleRemaining}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-semibold"
        >
          Shuffle Free
        </button>
      </div>
      <div className="relative w-full h-80 sm:h-96 rounded-2xl bg-[#0B1426] border border-emerald-500/35 overflow-hidden">
        {tiles.map((tile) => {
          if (tile.removed) return null;
          const free = isTileFree(tile, tiles);
          const isSel = selectedId === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleTileTap(tile)}
              disabled={!free}
              style={{
                left: `${12 + tile.c * 13}%`,
                top: `${14 + tile.r * 20 - tile.layer * 3.5}%`,
                zIndex: tile.layer * 10 + tile.r,
                borderColor: isSel ? '#00E5FF' : free ? `${tile.color}88` : '#334155',
                color: tile.color,
              }}
              className={`absolute w-[12%] h-[18%] rounded-lg border-2 font-bold text-lg sm:text-2xl flex items-center justify-center shadow-lg transition-transform ${
                free ? 'bg-[#172447] hover:scale-105 cursor-pointer' : 'bg-[#0F172A] opacity-55 cursor-not-allowed'
              } ${isSel ? 'ring-2 ring-cyan-400 scale-105' : ''}`}
            >
              {tile.symbol}
            </button>
          );
        })}

        <GameOverlay
          status={status}
          ctx={ctx}
          title="Mahjong Solitaire Zen"
          subtitle="Match identical bright tiles that have no tile above and at least one open side."
          score={score}
          gameSlug={gameSlug}
          onStart={reset}
          onRestart={reset}
        />
      </div>
    </div>
  );
};

export default MahjongGame;
