import React, { useCallback, useEffect, useState } from 'react';
import {
  Anchor,
  Compass,
  Crown,
  Diamond,
  Flame,
  Heart,
  Leaf,
  Moon,
  Music,
  Shield,
  Star,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useControls } from '../controls/ControlContext';
import type { GameControlContext } from '../components/GameShell';
import { LeaderboardSubmitWidget } from '../components/LeaderboardSubmitWidget';
import { sfx, triggerHaptic } from '../utils/sound';

type Difficulty = 'easy' | 'medium' | 'hard';

const ICONS = [Star, Flame, Diamond, Heart, Crown, Moon, Sun, Shield, Compass, Leaf, Anchor, Music];
const COLORS = [
  'text-amber-400',
  'text-orange-400',
  'text-cyan-400',
  'text-rose-400',
  'text-yellow-400',
  'text-indigo-400',
  'text-emerald-400',
  'text-violet-400',
  'text-sky-400',
  'text-teal-400',
  'text-blue-400',
  'text-pink-400',
];

interface CardItem {
  id: number;
  pairId: number;
  matched: boolean;
}

function buildDeck(diff: Difficulty): CardItem[] {
  const pairCount = diff === 'easy' ? 6 : diff === 'medium' ? 8 : 12;
  const raw: CardItem[] = [];
  for (let i = 0; i < pairCount; i++) {
    raw.push({ id: i * 2, pairId: i, matched: false });
    raw.push({ id: i * 2 + 1, pairId: i, matched: false });
  }
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return raw;
}

const MemoryGame: React.FC<{ ctx: GameControlContext; onScoreChange: (score: number) => void }> = ({
  ctx,
  onScoreChange,
}) => {
  const { t } = useApp();
  const { subscribeAction, activeModality } = useControls();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [cards, setCards] = useState<CardItem[]>(() => buildDeck('medium'));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [cursor, setCursor] = useState(0);

  const reset = useCallback(
    (nextDiff: Difficulty = difficulty) => {
      setCards(buildDeck(nextDiff));
      setFlipped([]);
      setMoves(0);
      setSeconds(0);
      setStarted(false);
      setLocked(false);
      setWon(false);
      setCursor(0);
      onScoreChange(0);
    },
    [difficulty, onScoreChange]
  );

  useEffect(() => {
    if (ctx.restartKey > 0) reset(difficulty);
  }, [ctx.restartKey, difficulty, reset]);

  useEffect(() => {
    if (!started || won || ctx.isPaused) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [ctx.isPaused, started, won]);

  const handleCardTap = useCallback(
    (index: number) => {
      if (ctx.isPaused || locked || won) return;
      if (index < 0 || index >= cards.length) return;
      if (flipped.includes(index) || cards[index].matched) return;

      setCursor(index);
      if (!started) setStarted(true);
      sfx.click(ctx.soundEnabled);

      const nextFlipped = [...flipped, index];
      setFlipped(nextFlipped);

      if (nextFlipped.length === 2) {
        const [firstIdx, secondIdx] = nextFlipped;
        const nextMoves = moves + 1;
        setMoves(nextMoves);

        if (cards[firstIdx].pairId === cards[secondIdx].pairId) {
          const updated = cards.map((c, idx) =>
            idx === firstIdx || idx === secondIdx ? { ...c, matched: true } : c
          );
          setCards(updated);
          setFlipped([]);
          sfx.eat(ctx.soundEnabled);
          triggerHaptic(ctx.hapticsEnabled, 12);

          const matchedPairs = updated.filter((c) => c.matched).length / 2;
          const totalPairs = updated.length / 2;
          const currentScore = Math.max(100, matchedPairs * 120 - nextMoves * 5);
          onScoreChange(currentScore);

          if (matchedPairs === totalPairs) {
            const finalScore = Math.max(200, totalPairs * 200 - nextMoves * 10 - seconds * 2);
            onScoreChange(finalScore);
            setWon(true);
            sfx.win(ctx.soundEnabled);
            triggerHaptic(ctx.hapticsEnabled, [20, 30, 50]);
            ctx.onScoreEnd(finalScore, true, seconds);
          }
        } else {
          setLocked(true);
          setTimeout(() => {
            setFlipped([]);
            setLocked(false);
          }, 620);
        }
      }
    },
    [cards, ctx, flipped, locked, moves, onScoreChange, seconds, started, won]
  );

  // Keyboard & Gamepad 2D Grid Cursor Navigation
  useEffect(() => {
    return subscribeAction((action) => {
      const total = cards.length;
      const cols =
        difficulty === 'hard' && typeof window !== 'undefined' && window.innerWidth >= 640 ? 6 : 4;
      if (action === 'left') {
        setCursor((c) => (c - 1 + total) % total);
      } else if (action === 'right') {
        setCursor((c) => (c + 1) % total);
      } else if (action === 'up') {
        setCursor((c) => (c - cols + total) % total);
      } else if (action === 'down') {
        setCursor((c) => (c + cols) % total);
      } else if (action === 'primary' || action === 'secondary') {
        if (won) reset(difficulty);
        else handleCardTap(cursor);
      }
    });
  }, [cards.length, cursor, difficulty, handleCardTap, reset, subscribeAction, won]);

  const gridCols = difficulty === 'hard' ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-4';
  const finalScore = Math.max(200, (cards.length / 2) * 200 - moves * 10 - seconds * 2);
  const showCursor = activeModality === 'keyboard' || activeModality === 'gamepad';

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-4">
      <div className="w-full flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200 dark:bg-white/5">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDifficulty(d);
                reset(d);
              }}
              className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold transition-colors hc-button ${
                difficulty === d ? 'bg-pink-600 text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t.common[d]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
          <span>
            {t.common.moves}: <strong>{moves}</strong>
          </span>
          <span>
            {t.common.time}: <strong>{seconds}s</strong>
          </span>
        </div>
      </div>

      <div className={`relative w-full grid ${gridCols} gap-2.5 sm:gap-3`}>
        {cards.map((card, idx) => {
          const isOpen = card.matched || flipped.includes(idx);
          const isFocused = showCursor && cursor === idx && !won;
          const IconComp = ICONS[card.pairId % ICONS.length];
          const colorCls = COLORS[card.pairId % COLORS.length];
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardTap(idx)}
              aria-label={
                card.matched
                  ? `Card ${idx + 1}: Matched pair ${card.pairId + 1}`
                  : isOpen
                  ? `Card ${idx + 1}: Revealed symbol ${card.pairId + 1}`
                  : `Card ${idx + 1}: Hidden`
              }
              className={`aspect-square min-h-[58px] rounded-2xl border flex items-center justify-center transition-all duration-200 hc-button ${
                card.matched
                  ? 'bg-pink-500/15 border-pink-500/50'
                  : isOpen
                  ? 'bg-slate-800 border-violet-500'
                  : 'bg-slate-200 dark:bg-[#171C2E] border-slate-300 dark:border-white/10 hover:border-pink-500/50'
              } ${isFocused ? 'ring-2 ring-pink-400 border-pink-400' : ''}`}
            >
              {isOpen ? (
                <IconComp className={`w-7 h-7 ${colorCls}`} />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400/50 dark:bg-white/15" />
              )}
            </button>
          );
        })}

        {ctx.isPaused && !won && (
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center">
            <h2 className="font-display text-2xl font-bold text-white">{t.common.pausedTitle}</h2>
            <button
              type="button"
              onClick={() => ctx.setIsPaused(false)}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-violet-600 text-white font-semibold text-sm hc-button"
            >
              {t.common.resume}
            </button>
          </div>
        )}

        {won && (
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs p-6 text-center">
            <h2 className="font-display text-2xl font-bold text-pink-400">{t.common.youWin}</h2>
            <p className="mt-1 text-sm text-slate-200 font-mono tabular-nums">
              {moves} {t.common.moves} · {seconds}s
            </p>
            <LeaderboardSubmitWidget gameSlug="memory-match" score={finalScore} mode={difficulty} />
            <button
              type="button"
              onClick={() => reset(difficulty)}
              className="mt-4 min-h-[48px] px-6 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm hc-button"
            >
              {t.common.playAgain}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryGame;
