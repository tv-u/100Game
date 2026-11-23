import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

interface Question {
  prompt: string;
  options: string[];
  answerIdx: number;
}

const SPELL_BANK: Question[] = [
  { prompt: 'Choose the correctly spelled word:', options: ['Accomodate', 'Accommodate', 'Acommodate', 'Accommodatte'], answerIdx: 1 },
  { prompt: 'Choose the correctly spelled word:', options: ['Definitely', 'Definately', 'Definitly', 'Definetly'], answerIdx: 0 },
  { prompt: 'Choose the correctly spelled word:', options: ['Seperate', 'Separete', 'Separate', 'Seperete'], answerIdx: 2 },
  { prompt: 'Choose the correctly spelled word:', options: ['Rhythm', 'Rythm', 'Rhythem', 'Rhytm'], answerIdx: 0 },
  { prompt: 'Choose the correctly spelled word:', options: ['Occurence', 'Occurrence', 'Ocurrence', 'Occurrance'], answerIdx: 1 },
  { prompt: 'Choose the correctly spelled word:', options: ['Neccessary', 'Necesary', 'Necessary', 'Neccesary'], answerIdx: 2 },
];

const GEO_BANK: Question[] = [
  { prompt: 'What is the capital of Japan?', options: ['Kyoto', 'Osaka', 'Tokyo', 'Yokohama'], answerIdx: 2 },
  { prompt: 'Which river flows through Cairo?', options: ['Amazon', 'Nile', 'Danube', 'Mekong'], answerIdx: 1 },
  { prompt: 'What is the capital of Canada?', options: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'], answerIdx: 3 },
  { prompt: 'Which continent has the most countries?', options: ['Asia', 'Africa', 'Europe', 'South America'], answerIdx: 1 },
  { prompt: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answerIdx: 2 },
  { prompt: 'Mount Everest borders Nepal and which country?', options: ['India', 'Bhutan', 'China', 'Pakistan'], answerIdx: 2 },
];

const TRIVIA_BANK: Question[] = [
  { prompt: 'Which planet in our solar system has the most moons?', options: ['Mars', 'Saturn', 'Uranus', 'Neptune'], answerIdx: 1 },
  { prompt: 'What chemical element has the symbol Au?', options: ['Silver', 'Argon', 'Gold', 'Aluminum'], answerIdx: 2 },
  { prompt: 'In computing, how many bits make 1 byte?', options: ['4', '8', '16', '32'], answerIdx: 1 },
  { prompt: 'Who painted The Starry Night?', options: ['Monet', 'Picasso', 'Van Gogh', 'Da Vinci'], answerIdx: 2 },
  { prompt: 'What is the hardest naturally occurring mineral?', options: ['Quartz', 'Diamond', 'Topaz', 'Corundum'], answerIdx: 1 },
  { prompt: 'At what temperature are Celsius and Fahrenheit equal?', options: ['0°', '-40°', '32°', '-18°'], answerIdx: 1 },
];

function makeMathQ(level: number): { prompt: string; options: string[]; answerIdx: number; numericAnswer: number } {
  const a = 4 + Math.floor(Math.random() * (8 + level * 2));
  const b = 2 + Math.floor(Math.random() * (7 + level));
  const op = level > 3 && Math.random() < 0.4 ? '*' : Math.random() < 0.55 ? '+' : '-';
  const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const set = new Set<number>([ans]);
  while (set.size < 4) set.add(ans + Math.floor(Math.random() * 13) - 6);
  const opts = Array.from(set).sort(() => Math.random() - 0.5).map(String);
  return { prompt: `${a} ${op} ${b} = ?`, options: opts, answerIdx: opts.indexOf(String(ans)), numericAnswer: ans };
}

export const QuizMathEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'math-challenge' }) => {
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(40);
  const [mathQ, setMathQ] = useState(() => makeMathQ(1));
  const [numInput, setNumInput] = useState('');

  const getBank = () => (gameSlug === 'spelling-challenge' ? SPELL_BANK : gameSlug === 'geography-quiz' ? GEO_BANK : TRIVIA_BANK);

  const reset = useCallback(
    (startImmediately = false) => {
      setScore(0);
      onScoreChange(0);
      setRound(1);
      setTimeLeft(40);
      setMathQ(makeMathQ(1));
      setNumInput('');
      setStatus(startImmediately ? 'PLAYING' : 'READY');
    },
    [onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  useEffect(() => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('WON');
          sfx.win(ctx.soundEnabled);
          ctx.onScoreEnd(score, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [ctx, score, status]);

  const currentQuestion: Question =
    gameSlug === 'math-challenge' || gameSlug === 'mental-arithmetic'
      ? mathQ
      : getBank()[(round - 1) % getBank().length];

  const answerChoice = (idx: number) => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    const correct = idx === currentQuestion.answerIdx;
    if (correct) {
      const nextScore = score + 100;
      setScore(nextScore);
      onScoreChange(nextScore);
      sfx.eat(ctx.soundEnabled);
    } else {
      triggerHaptic(ctx.hapticsEnabled, 25);
      sfx.click(ctx.soundEnabled);
    }
    if (gameSlug !== 'math-challenge' && round >= getBank().length) {
      const finalScore = score + (correct ? 100 : 0);
      setStatus('WON');
      sfx.win(ctx.soundEnabled);
      ctx.onScoreEnd(finalScore, true);
      return;
    }
    setRound((r) => r + 1);
    setMathQ(makeMathQ(round + 1));
  };

  const submitNumeric = () => {
    if (status !== 'PLAYING' || ctx.isPaused || numInput === '') return;
    if (Number(numInput) === mathQ.numericAnswer) {
      const ns = score + 120;
      setScore(ns);
      onScoreChange(ns);
      sfx.eat(ctx.soundEnabled);
    } else {
      triggerHaptic(ctx.hapticsEnabled, 25);
    }
    setNumInput('');
    setRound((r) => r + 1);
    setMathQ(makeMathQ(round + 1));
  };

  const titleMap: Record<string, string> = {
    'math-challenge': 'Speed Math Challenge',
    'mental-arithmetic': 'Mental Arithmetic Sprint',
    'spelling-challenge': 'Spelling Bee Challenge',
    'geography-quiz': 'World Capitals Quiz',
    'general-knowledge': 'Global Trivia Quiz',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>Round {round} · {timeLeft}s</span>
        <span>Score: {score}</span>
      </div>

      <div className="relative w-full rounded-2xl border border-blue-500/35 bg-[#070B19] p-5 min-h-[360px] flex flex-col justify-between gap-4">
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 text-center">
          <div className="font-display text-xl sm:text-2xl font-bold text-white">{currentQuestion.prompt}</div>
        </div>

        {gameSlug === 'mental-arithmetic' ? (
          <div className="space-y-3">
            <div className="min-h-[44px] rounded-xl bg-[#0D142B] border border-cyan-400/40 flex items-center justify-center font-mono text-2xl font-bold text-cyan-300">
              {numInput || '?'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', 'OK'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (k === 'OK') submitNumeric();
                    else if (k === '-') setNumInput((v) => (v.startsWith('-') ? v.slice(1) : '-' + v));
                    else setNumInput((v) => v + k);
                  }}
                  className="min-h-[48px] rounded-xl bg-white/10 hover:bg-cyan-500/25 text-white font-bold text-sm"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {currentQuestion.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => answerChoice(idx)}
                className="min-h-[50px] px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400 text-left text-sm font-semibold text-white transition-colors"
              >
                {idx + 1}. {opt}
              </button>
            ))}
          </div>
        )}

        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Brain Quiz'}
          subtitle="Answer accurately and quickly within 40 seconds to rack up high streaks."
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default QuizMathEngine;
