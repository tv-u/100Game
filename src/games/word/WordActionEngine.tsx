import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const WORDS_5 = ['REACT', 'CYBER', 'PIXEL', 'QUEST', 'LASER', 'SPARK', 'BRAIN', 'LOGIC', 'FLASH', 'TURBO', 'ORBIT', 'SMART', 'PRISM', 'DRIFT', 'STACK'];
const HANGMAN_WORDS = [
  { word: 'PLANET', hint: 'Space' },
  { word: 'JAVASCRIPT', hint: 'Code' },
  { word: 'ARCADE', hint: 'Gaming' },
  { word: 'SYNTHESIS', hint: 'Science' },
  { word: 'COMPASS', hint: 'Navigation' },
];
const TYPING_PROMPTS = [
  'play instant browser games anywhere on mobile and desktop',
  'reflex speed and clean strategy win high arcade scores',
  'neon grids glow brighter when every combo chain lands cleanly',
];

export const WordActionEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'word-guess' }) => {
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);

  // Word Guess (5-letter)
  const [target5, setTarget5] = useState('CYBER');
  const [guesses5, setGuesses5] = useState<string[]>([]);
  const [curr5, setCurr5] = useState('');

  // Hangman
  const [hmIdx, setHmIdx] = useState(0);
  const [hmPicked, setHmPicked] = useState<string[]>([]);
  const hmWrong = hmPicked.filter((l) => !HANGMAN_WORDS[hmIdx].word.includes(l)).length;

  // Anagram
  const [anaWord, setAnaWord] = useState('LASER');
  const [anaShuffled, setAnaShuffled] = useState<string[]>([]);
  const [anaInput, setAnaInput] = useState('');

  // Typing speed
  const [promptIdx, setPromptIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [startMs, setStartMs] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);

  // Memory numbers
  const [seqTarget, setSeqTarget] = useState('482');
  const [seqReveal, setSeqReveal] = useState(true);
  const [seqInput, setSeqInput] = useState('');

  const statusRef = useRef(status);
  statusRef.current = status;

  const shuffleWord = (w: string) => w.split('').sort(() => Math.random() - 0.5);

  const reset = useCallback(
    (startImmediately = false) => {
      setScore(0);
      onScoreChange(0);

      const pick5 = WORDS_5[Math.floor(Math.random() * WORDS_5.length)];
      setTarget5(pick5);
      setGuesses5([]);
      setCurr5('');

      setHmIdx(Math.floor(Math.random() * HANGMAN_WORDS.length));
      setHmPicked([]);

      const aw = WORDS_5[Math.floor(Math.random() * WORDS_5.length)];
      setAnaWord(aw);
      setAnaShuffled(shuffleWord(aw));
      setAnaInput('');

      setPromptIdx(Math.floor(Math.random() * TYPING_PROMPTS.length));
      setTyped('');
      setStartMs(null);
      setWpm(0);

      const num = String(100 + Math.floor(Math.random() * 899));
      setSeqTarget(num);
      setSeqInput('');
      setSeqReveal(true);

      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  // Memory numbers reveal window
  useEffect(() => {
    if (gameSlug !== 'memory-numbers' || status !== 'PLAYING' || !seqReveal) return;
    const t = window.setTimeout(() => setSeqReveal(false), 1800);
    return () => clearTimeout(t);
  }, [gameSlug, seqReveal, seqTarget, status]);

  const submit5 = useCallback(() => {
    if (curr5.length !== 5) return;
    const nextGuesses = [...guesses5, curr5];
    setGuesses5(nextGuesses);
    setCurr5('');
    if (curr5 === target5) {
      const pts = (7 - nextGuesses.length) * 100;
      setScore(pts);
      onScoreChange(pts);
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(pts, true);
    } else if (nextGuesses.length >= 6) {
      setStatus('GAME_OVER');
      sfx.gameOver(ctx.soundEnabled);
      ctx.onScoreEnd(0, false);
    } else {
      sfx.click(ctx.soundEnabled);
    }
  }, [ctx, curr5, guesses5, onScoreChange, target5]);

  const pickHangmanLetter = (ch: string) => {
    if (status !== 'PLAYING' || ctx.isPaused || hmPicked.includes(ch)) return;
    const next = [...hmPicked, ch];
    setHmPicked(next);
    const word = HANGMAN_WORDS[hmIdx].word;
    const wrong = next.filter((l) => !word.includes(l)).length;
    if (word.split('').every((l) => next.includes(l))) {
      const pts = Math.max(50, (6 - wrong) * 75);
      setScore((s) => {
        const ns = s + pts;
        onScoreChange(ns);
        return ns;
      });
      sfx.clear(ctx.soundEnabled);
      setHmIdx((hmIdx + 1) % HANGMAN_WORDS.length);
      setHmPicked([]);
    } else if (wrong >= 6) {
      setStatus('GAME_OVER');
      sfx.gameOver(ctx.soundEnabled);
      ctx.onScoreEnd(score, false);
    } else {
      sfx.click(ctx.soundEnabled);
    }
  };

  const handleTypingChange = (val: string) => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    const target = TYPING_PROMPTS[promptIdx];
    const now = performance.now();
    const sTime = startMs ?? now;
    if (!startMs) setStartMs(now);
    setTyped(val);
    const elapsedMin = Math.max(0.02, (now - sTime) / 60000);
    const words = val.trim().split(/\s+/).filter(Boolean).length;
    const curWpm = Math.round(words / elapsedMin);
    setWpm(curWpm);
    if (val === target) {
      setScore(curWpm * 10);
      onScoreChange(curWpm * 10);
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(curWpm * 10, true);
    }
  };

  const submitSeq = () => {
    if (seqInput === seqTarget) {
      const nextLen = seqTarget.length + 1;
      const pts = nextLen * 50;
      setScore(pts);
      onScoreChange(pts);
      sfx.clear(ctx.soundEnabled);
      const min = Math.pow(10, nextLen - 1);
      const max = Math.pow(10, nextLen) - 1;
      setSeqTarget(String(Math.floor(min + Math.random() * (max - min))));
      setSeqInput('');
      setSeqReveal(true);
    } else {
      setStatus('GAME_OVER');
      sfx.gameOver(ctx.soundEnabled);
      ctx.onScoreEnd(score, false);
    }
  };

  useEffect(() => {
    if (gameSlug !== 'word-guess') return;
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      if (/^[a-zA-Z]$/.test(e.key) && curr5.length < 5) setCurr5((c) => c + e.key.toUpperCase());
      if (e.key === 'Backspace') setCurr5((c) => c.slice(0, -1));
      if (e.key === 'Enter') submit5();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx.isPaused, curr5.length, gameSlug, submit5]);

  const titleMap: Record<string, string> = {
    'word-guess': '5-Letter Word Guess',
    hangman: 'Word Rescue Hangman',
    'anagram-challenge': 'Anagram Word Scramble',
    'typing-speed': 'Typing Speed Test',
    'memory-numbers': 'Digit Span Memory',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>{gameSlug === 'hangman' ? `Mistakes: ${hmWrong}/6` : gameSlug === 'typing-speed' ? `${wpm} WPM` : 'Word Arena'}</span>
        <span>Score: {score}</span>
      </div>

      <div className="relative w-full rounded-2xl border border-emerald-500/35 bg-[#070B19] p-4 min-h-[380px] flex flex-col justify-between gap-4">
        {gameSlug === 'word-guess' && (
          <>
            <div className="grid grid-rows-6 gap-1.5 max-w-[260px] mx-auto w-full">
              {Array.from({ length: 6 }, (_, r) => {
                const rowStr = guesses5[r] || (r === guesses5.length ? curr5 : '');
                const committed = r < guesses5.length;
                return (
                  <div key={r} className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 5 }, (_, c) => {
                      const ch = rowStr[c] || '';
                      let cls = 'border-white/15 bg-white/5 text-white';
                      if (committed) {
                        if (target5[c] === ch) cls = 'border-emerald-400 bg-emerald-500/30 text-emerald-100';
                        else if (target5.includes(ch)) cls = 'border-amber-400 bg-amber-500/30 text-amber-100';
                        else cls = 'border-slate-700 bg-slate-800/80 text-slate-400';
                      }
                      return (
                        <div key={c} className={`aspect-square rounded-lg border flex items-center justify-center font-bold text-lg ${cls}`}>
                          {ch}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => curr5.length < 5 && setCurr5((c) => c + l)}
                  className="w-8 h-10 rounded-md bg-white/10 text-xs font-bold text-white"
                >
                  {l}
                </button>
              ))}
              <button type="button" onClick={() => setCurr5((c) => c.slice(0, -1))} className="px-3 h-10 rounded-md bg-rose-500/20 text-xs font-bold text-rose-200">DEL</button>
              <button type="button" onClick={submit5} className="px-3 h-10 rounded-md bg-emerald-500 text-slate-950 text-xs font-bold">ENTER</button>
            </div>
          </>
        )}

        {gameSlug === 'hangman' && (
          <div className="space-y-5 text-center my-auto">
            <div className="text-xs font-semibold text-cyan-300">Hint: {HANGMAN_WORDS[hmIdx].hint}</div>
            <div className="flex justify-center gap-2 flex-wrap">
              {HANGMAN_WORDS[hmIdx].word.split('').map((ch, idx) => (
                <span key={idx} className="w-8 h-10 border-b-2 border-cyan-400 flex items-center justify-center font-mono text-xl font-bold text-white">
                  {hmPicked.includes(ch) ? ch : ''}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
                <button
                  key={l}
                  type="button"
                  disabled={hmPicked.includes(l)}
                  onClick={() => pickHangmanLetter(l)}
                  className="w-9 h-9 rounded-lg bg-white/10 disabled:opacity-30 text-xs font-bold text-white"
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameSlug === 'anagram-challenge' && (
          <div className="space-y-5 text-center my-auto">
            <div className="flex justify-center gap-2">
              {anaShuffled.map((ch, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const next = anaInput + ch;
                    setAnaInput(next);
                    if (next === anaWord) {
                      const pts = score + 100;
                      setScore(pts);
                      onScoreChange(pts);
                      sfx.clear(ctx.soundEnabled);
                      const nw = WORDS_5[Math.floor(Math.random() * WORDS_5.length)];
                      setAnaWord(nw);
                      setAnaShuffled(shuffleWord(nw));
                      setAnaInput('');
                    } else if (next.length >= anaWord.length) {
                      setAnaInput('');
                      triggerHaptic(ctx.hapticsEnabled, 20);
                    }
                  }}
                  className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-xl font-bold text-white"
                >
                  {ch}
                </button>
              ))}
            </div>
            <div className="font-mono text-2xl tracking-widest text-amber-300 min-h-[36px]">{anaInput || 'TAP LETTERS'}</div>
            <button type="button" onClick={() => setAnaInput('')} className="px-4 py-2 rounded-lg bg-white/10 text-xs text-white">Clear</button>
          </div>
        )}

        {gameSlug === 'typing-speed' && (
          <div className="space-y-4 my-auto">
            <p className="p-4 rounded-xl bg-white/5 border border-white/10 font-mono text-sm leading-relaxed text-slate-200">
              {TYPING_PROMPTS[promptIdx].split('').map((ch, i) => (
                <span
                  key={i}
                  className={
                    i >= typed.length
                      ? 'text-slate-400'
                      : typed[i] === ch
                      ? 'text-emerald-400'
                      : 'text-rose-400 underline'
                  }
                >
                  {ch}
                </span>
              ))}
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => handleTypingChange(e.target.value)}
              placeholder="Start typing exact phrase above..."
              className="w-full min-h-[48px] rounded-xl bg-[#0D142B] border border-cyan-400/40 px-4 text-sm text-white font-mono"
            />
          </div>
        )}

        {gameSlug === 'memory-numbers' && (
          <div className="space-y-4 text-center my-auto">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 font-mono text-3xl font-bold tracking-widest text-cyan-300">
              {seqReveal ? seqTarget : '•••••'}
            </div>
            {!seqReveal && (
              <>
                <div className="font-mono text-xl text-white min-h-[28px]">{seqInput || 'Enter digits'}</div>
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'DEL', 0, 'OK'].map((k) => (
                    <button
                      key={String(k)}
                      type="button"
                      onClick={() => {
                        if (k === 'DEL') setSeqInput((v) => v.slice(0, -1));
                        else if (k === 'OK') submitSeq();
                        else setSeqInput((v) => v + String(k));
                      }}
                      className="min-h-[44px] rounded-xl bg-white/10 hover:bg-cyan-500/20 text-sm font-bold text-white"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Word Challenge'}
          subtitle="Sharpen vocabulary, speed typing, and working memory across crisp levels."
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default WordActionEngine;
