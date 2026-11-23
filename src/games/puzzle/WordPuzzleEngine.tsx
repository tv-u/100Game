import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const WORD_PUZZLES = [
  {
    words: ['NEON', 'GAME', 'PLAY', 'CODE', 'PIXEL', 'GRID'],
    grid: [
      ['P', 'I', 'X', 'E', 'L', 'A', 'G'],
      ['N', 'C', 'O', 'D', 'E', 'B', 'A'],
      ['E', 'Q', 'W', 'R', 'T', 'Y', 'M'],
      ['O', 'G', 'R', 'I', 'D', 'K', 'E'],
      ['N', 'P', 'L', 'A', 'Y', 'Z', 'X'],
      ['V', 'B', 'N', 'M', 'L', 'K', 'J'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'P'],
    ],
  },
];

const CROSSWORD_DATA = {
  size: 5,
  solution: [
    ['S', 'T', 'A', 'R', 'S'],
    ['N', 'I', 'N', 'J', 'A'],
    ['A', 'R', 'C', 'A', 'D'],
    ['K', 'E', 'Y', 'S', 'E'],
    ['E', 'D', 'G', 'E', 'S'],
  ],
  clues: [
    'Row 1: Shining cosmic lights (5)',
    'Row 2: Shadow stealth warrior (5)',
    'Row 3: Gaming hall prefix (5)',
    'Row 4: Keyboard inputs + E (5)',
    'Row 5: Outer borders of a shape (5)',
  ],
};

const WordPuzzleEngine: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'word-search',
}) => {
  const isCrossword = gameSlug === 'crossword-puzzle';
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'WON'>('PLAYING');
  const [score, setScore] = useState(0);

  // Word search state
  const puzzle = WORD_PUZZLES[0];
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  // Crossword state
  const [cwGrid, setCwGrid] = useState<string[][]>(() =>
    CROSSWORD_DATA.solution.map((row, r) => row.map((ch, c) => ((r + c) % 4 === 0 ? ch : '')))
  );
  const [activeCell, setActiveCell] = useState<[number, number]>([0, 1]);

  const reset = useCallback(() => {
    setStartCell(null);
    setFoundWords([]);
    setHighlighted(new Set());
    setCwGrid(CROSSWORD_DATA.solution.map((row, r) => row.map((ch, c) => ((r + c) % 4 === 0 ? ch : ''))));
    setActiveCell([0, 1]);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const handleWsCellTap = (r: number, c: number) => {
    if (ctx.isPaused || status !== 'PLAYING') return;
    if (!startCell) {
      setStartCell([r, c]);
      sfx.click(ctx.soundEnabled);
      return;
    }
    const [r0, c0] = startCell;
    const dr = Math.sign(r - r0);
    const dc = Math.sign(c - c0);
    const len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
    const aligned = r === r0 || c === c0 || Math.abs(r - r0) === Math.abs(c - c0);
    if (!aligned || len < 3) {
      setStartCell([r, c]);
      return;
    }
    const coords: string[] = [];
    let word = '';
    for (let i = 0; i < len; i++) {
      const nr = r0 + dr * i;
      const nc = c0 + dc * i;
      coords.push(`${nr},${nc}`);
      word += puzzle.grid[nr][nc];
    }
    const rev = word.split('').reverse().join('');
    const matched = puzzle.words.find((w) => (w === word || w === rev) && !foundWords.includes(w));
    if (matched) {
      const nextFound = [...foundWords, matched];
      const nextHi = new Set(highlighted);
      coords.forEach((k) => nextHi.add(k));
      setFoundWords(nextFound);
      setHighlighted(nextHi);
      const nextScore = nextFound.length * 100;
      setScore(nextScore);
      onScoreChange(nextScore);
      sfx.clear(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 14);
      if (nextFound.length === puzzle.words.length) {
        setStatus('WON');
        sfx.win(ctx.soundEnabled);
        ctx.onScoreEnd(nextScore, true);
      }
    } else {
      sfx.bounce(ctx.soundEnabled);
    }
    setStartCell(null);
  };

  const enterLetter = useCallback(
    (ch: string) => {
      if (!isCrossword || status !== 'PLAYING' || ctx.isPaused) return;
      const [r, c] = activeCell;
      const next = cwGrid.map((row) => [...row]);
      next[r][c] = ch.toUpperCase();
      setCwGrid(next);
      sfx.click(ctx.soundEnabled);

      let correct = 0;
      for (let rr = 0; rr < 5; rr++) {
        for (let cc = 0; cc < 5; cc++) {
          if (next[rr][cc] === CROSSWORD_DATA.solution[rr][cc]) correct++;
        }
      }
      const nextScore = correct * 20;
      setScore(nextScore);
      onScoreChange(nextScore);

      if (correct === 25) {
        setStatus('WON');
        sfx.win(ctx.soundEnabled);
        ctx.onScoreEnd(nextScore, true);
      } else {
        const nextC = (c + 1) % 5;
        const nextR = nextC === 0 ? (r + 1) % 5 : r;
        setActiveCell([nextR, nextC]);
      }
    },
    [activeCell, ctx, cwGrid, isCrossword, onScoreChange, status]
  );

  useEffect(() => {
    if (!isCrossword) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[a-zA-Z]$/.test(e.key)) enterLetter(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enterLetter, isCrossword]);

  if (isCrossword) {
    return (
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <div className="relative w-full max-w-[320px] p-3 rounded-2xl bg-[#0D132B] border border-blue-500/40">
          <div className="grid grid-cols-5 gap-1.5">
            {cwGrid.map((row, r) =>
              row.map((val, c) => {
                const isAct = activeCell[0] === r && activeCell[1] === c;
                const isOk = val && val === CROSSWORD_DATA.solution[r][c];
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => setActiveCell([r, c])}
                    className={`aspect-square rounded-lg border font-mono text-lg font-bold flex items-center justify-center ${
                      isAct
                        ? 'border-cyan-400 bg-cyan-500/20 text-white'
                        : isOk
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/15 bg-[#161F42] text-white'
                    }`}
                  >
                    {val}
                  </button>
                );
              })
            )}
          </div>
          <GameOverlay
            status={status}
            ctx={ctx}
            title="Mini Crossword Logic"
            subtitle="Tap a square and type or use the letters below to solve all 5 rows."
            score={score}
            gameSlug={gameSlug}
            onStart={reset}
            onRestart={reset}
          />
        </div>
        <div className="w-full text-xs text-slate-300 space-y-1 bg-white/5 border border-white/10 rounded-xl p-3">
          {CROSSWORD_DATA.clues.map((clue, idx) => (
            <div key={idx}>{clue}</div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => enterLetter(ch)}
              className="w-8 h-9 rounded-lg bg-[#161F42] border border-white/15 text-xs font-bold text-white hover:border-cyan-400"
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        {puzzle.words.map((w) => (
          <span
            key={w}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
              foundWords.includes(w)
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 line-through'
                : 'bg-white/5 border-white/15 text-slate-200'
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      <div className="relative w-full max-w-[340px] p-3 rounded-2xl bg-[#0D132B] border border-cyan-500/40">
        <div className="grid grid-cols-7 gap-1.5">
          {puzzle.grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r},${c}`;
              const isStart = startCell?.[0] === r && startCell?.[1] === c;
              const isFound = highlighted.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleWsCellTap(r, c)}
                  className={`aspect-square rounded-lg border font-mono text-base font-bold flex items-center justify-center transition-colors ${
                    isStart
                      ? 'border-cyan-400 bg-cyan-500/30 text-white'
                      : isFound
                      ? 'border-emerald-400/60 bg-emerald-500/25 text-emerald-200'
                      : 'border-white/10 bg-[#161F42] text-slate-100 hover:border-cyan-400/50'
                  }`}
                >
                  {letter}
                </button>
              );
            })
          )}
        </div>
        <GameOverlay
          status={status}
          ctx={ctx}
          title="Word Search Grid"
          subtitle="Tap the first letter and last letter of any hidden word above."
          score={score}
          gameSlug={gameSlug}
          onStart={reset}
          onRestart={reset}
        />
      </div>
    </div>
  );
};

export default WordPuzzleEngine;
