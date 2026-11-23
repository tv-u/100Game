import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

export const ReflexAndRhythmEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'reaction-time' }) => {
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);

  // Reaction / Quick Draw shared wait-flash state
  const [phase, setPhase] = useState<'WAIT' | 'GO' | 'EARLY' | 'DONE_ROUND'>('WAIT');
  const [trial, setTrial] = useState(1);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const goTimeRef = useRef(0);

  // Rock Paper Scissors state
  const [rps, setRps] = useState({ round: 1, pWins: 0, aiWins: 0, lastMsg: 'Pick Rock, Paper, or Scissors!' });

  // Speed Tap 10s
  const [tapTime, setTapTime] = useState(10);
  const [taps, setTaps] = useState(0);

  // Target Shooting
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [rangeTime, setRangeTime] = useState(25);

  // Rhythm Tap (4-lane)
  const [notes, setNotes] = useState<Array<{ id: number; lane: number; y: number }>>([]);
  const [combo, setCombo] = useState(0);
  const noteSeqRef = useRef(1);

  // Reflex Runner (3-lane canvas/DOM)
  const [lane, setLane] = useState(1); // 0, 1, 2
  const [gates, setGates] = useState<Array<{ id: number; safeLane: number; y: number }>>([]);
  const laneRef = useRef(1);
  laneRef.current = lane;

  const statusRef = useRef(status);
  statusRef.current = status;

  const scheduleFlash = useCallback(() => {
    setPhase('WAIT');
    const delay = 1100 + Math.random() * 2100;
    const id = window.setTimeout(() => {
      if (statusRef.current === 'PLAYING') {
        goTimeRef.current = performance.now();
        setPhase('GO');
        sfx.click(ctx.soundEnabled);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [ctx.soundEnabled]);

  const reset = useCallback(
    (startImmediately = false) => {
      setScore(0);
      onScoreChange(0);
      setTrial(1);
      setLastMs(null);
      setPhase('WAIT');
      setRps({ round: 1, pWins: 0, aiWins: 0, lastMsg: 'Best of 5 Neon Showdown!' });
      setTapTime(10);
      setTaps(0);
      setTargetPos({ x: 50, y: 50 });
      setRangeTime(25);
      setNotes([]);
      setCombo(0);
      setLane(1);
      setGates([{ id: 1, safeLane: 0, y: 0 }]);

      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  // Trigger flash timer when playing reaction / quick-draw
  useEffect(() => {
    if ((gameSlug !== 'reaction-time' && gameSlug !== 'quick-draw') || status !== 'PLAYING' || phase !== 'WAIT') return;
    return scheduleFlash();
  }, [gameSlug, phase, scheduleFlash, status, trial]);

  // Speed Tap 10s & Target Range 25s timers
  useEffect(() => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    if (gameSlug === 'speed-tap' && taps > 0) {
      const id = window.setInterval(() => {
        setTapTime((prev) => {
          if (prev <= 1) {
            setStatus('WON');
            sfx.win(ctx.soundEnabled);
            ctx.onScoreEnd(taps * 10, true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
    if (gameSlug === 'target-shooting') {
      const id = window.setInterval(() => {
        setRangeTime((prev) => {
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
    }
  }, [ctx, gameSlug, score, status, taps]);

  // Rhythm Tap loop
  useEffect(() => {
    if (gameSlug !== 'rhythm-tap' || status !== 'PLAYING' || ctx.isPaused) return;
    const id = window.setInterval(() => {
      setNotes((prev) => {
        const moved = prev.map((n) => ({ ...n, y: n.y + 4.5 })).filter((n) => n.y <= 102);
        if (Math.random() < 0.19) {
          moved.push({ id: noteSeqRef.current++, lane: Math.floor(Math.random() * 4), y: 0 });
        }
        return moved;
      });
    }, 50);
    return () => clearInterval(id);
  }, [ctx.isPaused, gameSlug, status]);

  // Reflex Runner loop
  useEffect(() => {
    if (gameSlug !== 'reflex-runner' || status !== 'PLAYING' || ctx.isPaused) return;
    const id = window.setInterval(() => {
      setGates((prev) => {
        const next: Array<{ id: number; safeLane: number; y: number }> = [];
        let crashed = false;
        let scored = false;
        for (const g of prev) {
          const ny = g.y + 4.2;
          if (ny >= 78 && ny <= 90 && g.safeLane !== laneRef.current) {
            crashed = true;
          } else if (ny > 95) {
            scored = true;
            continue;
          }
          next.push({ ...g, y: ny });
        }
        if (crashed) {
          setStatus('GAME_OVER');
          sfx.gameOver(ctx.soundEnabled);
          ctx.onScoreEnd(score, false);
          return prev;
        }
        if (scored) {
          setScore((s) => {
            const ns = s + 50;
            onScoreChange(ns);
            return ns;
          });
          sfx.eat(ctx.soundEnabled);
        }
        if (next.length === 0 || next[next.length - 1].y > 46) {
          next.push({ id: noteSeqRef.current++, safeLane: Math.floor(Math.random() * 3), y: 0 });
        }
        return next;
      });
    }, 45);
    return () => clearInterval(id);
  }, [ctx, gameSlug, onScoreChange, score, status]);

  const hitRhythmLane = useCallback(
    (laneIdx: number) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      const idx = notes.findIndex((n) => n.lane === laneIdx && n.y >= 68 && n.y <= 98);
      if (idx >= 0) {
        setNotes((prev) => prev.filter((_, i) => i !== idx));
        setCombo((c) => c + 1);
        const ns = score + 50 + combo * 5;
        setScore(ns);
        onScoreChange(ns);
        sfx.eat(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, 10);
      } else {
        setCombo(0);
      }
    },
    [combo, ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled, notes, onScoreChange, score]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
      if (gameSlug === 'rhythm-tap') {
        const map: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
        const l = map[e.key.toLowerCase()];
        if (l !== undefined) hitRhythmLane(l);
      } else if (gameSlug === 'reflex-runner') {
        if (e.key === 'ArrowLeft' || e.key === 'a') setLane((l) => Math.max(0, l - 1));
        if (e.key === 'ArrowRight' || e.key === 'd') setLane((l) => Math.min(2, l + 1));
      } else if (gameSlug === 'speed-tap' && e.key === ' ') {
        e.preventDefault();
        setTaps((t) => {
          const nt = t + 1;
          setScore(nt * 10);
          onScoreChange(nt * 10);
          return nt;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx.isPaused, gameSlug, hitRhythmLane, onScoreChange]);

  const tapReaction = () => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    if (phase === 'WAIT') {
      setPhase('EARLY');
      triggerHaptic(ctx.hapticsEnabled, 30);
      return;
    }
    if (phase === 'EARLY') {
      setPhase('WAIT');
      return;
    }
    if (phase === 'GO') {
      const ms = Math.round(performance.now() - goTimeRef.current);
      setLastMs(ms);
      const pts = Math.max(20, 450 - ms);
      const ns = score + pts;
      setScore(ns);
      onScoreChange(ns);
      sfx.eat(ctx.soundEnabled);
      if (trial >= 5) {
        setStatus('WON');
        sfx.win(ctx.soundEnabled);
        ctx.onScoreEnd(ns, true);
      } else {
        setTrial((t) => t + 1);
        setPhase('WAIT');
      }
    }
  };

  const playRps = (choice: 'Rock' | 'Paper' | 'Scissors') => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    const opts: Array<'Rock' | 'Paper' | 'Scissors'> = ['Rock', 'Paper', 'Scissors'];
    const ai = opts[Math.floor(Math.random() * 3)];
    const win =
      (choice === 'Rock' && ai === 'Scissors') ||
      (choice === 'Paper' && ai === 'Rock') ||
      (choice === 'Scissors' && ai === 'Paper');
    const draw = choice === ai;

    let pw = rps.pWins + (win ? 1 : 0);
    let aw = rps.aiWins + (!win && !draw ? 1 : 0);
    const ns = pw * 150;
    setScore(ns);
    onScoreChange(ns);
    sfx.click(ctx.soundEnabled);

    if (pw >= 3 || aw >= 3) {
      setStatus(pw >= 3 ? 'WON' : 'GAME_OVER');
      if (pw >= 3) sfx.win(ctx.soundEnabled);
      else sfx.gameOver(ctx.soundEnabled);
      ctx.onScoreEnd(ns, pw >= 3);
      return;
    }
    setRps({
      round: rps.round + 1,
      pWins: pw,
      aiWins: aw,
      lastMsg: `You: ${choice} vs AI: ${ai} — ${draw ? 'Draw!' : win ? 'You Win Round!' : 'AI Takes Round!'}`,
    });
  };

  const titleMap: Record<string, string> = {
    'reaction-time': 'Millisecond Reaction Test',
    'rock-paper-scissors': 'Rock Paper Scissors Duel',
    'quick-draw': 'Showdown Quick Draw',
    'speed-tap': '10s Speed Tap Burst',
    'target-shooting': 'Bullseye Target Range',
    'rhythm-tap': '4-Lane Neon Rhythm Tap',
    'reflex-runner': 'Hyper Reflex Lane Dodger',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1 tabular-nums">
        <span>
          {gameSlug === 'reaction-time' || gameSlug === 'quick-draw'
            ? `Round ${trial}/5`
            : gameSlug === 'speed-tap'
            ? `${tapTime}s · ${taps} taps`
            : gameSlug === 'target-shooting'
            ? `${rangeTime}s left`
            : gameSlug === 'rhythm-tap'
            ? `Combo x${combo}`
            : 'Skill Arena'}
        </span>
        <span>Score: {score}</span>
      </div>

      <div className="relative w-full rounded-2xl border border-rose-500/35 bg-[#070B19] p-4 min-h-[360px] flex flex-col justify-center">
        {(gameSlug === 'reaction-time' || gameSlug === 'quick-draw') && (
          <button
            type="button"
            onClick={tapReaction}
            className={`w-full h-72 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-colors ${
              phase === 'GO'
                ? 'bg-emerald-500 border-white text-slate-950'
                : phase === 'EARLY'
                ? 'bg-amber-500 border-white text-slate-950'
                : 'bg-rose-950/60 border-rose-500/40 text-white'
            }`}
          >
            <span className="font-display text-3xl font-extrabold">
              {phase === 'GO' ? (gameSlug === 'quick-draw' ? 'FIRE!' : 'TAP NOW!') : phase === 'EARLY' ? 'TOO SOON! Tap to Retry' : 'Wait for Green...'}
            </span>
            {lastMs !== null && <span className="font-mono text-sm">Last reaction: {lastMs} ms</span>}
          </button>
        )}

        {gameSlug === 'rock-paper-scissors' && (
          <div className="space-y-5 text-center">
            <div className="font-mono text-lg font-bold text-white">You {rps.pWins} – {rps.aiWins} AI</div>
            <div className="text-xs text-cyan-300">{rps.lastMsg}</div>
            <div className="grid grid-cols-3 gap-2.5">
              {(['Rock', 'Paper', 'Scissors'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => playRps(c)}
                  className="min-h-[64px] rounded-xl bg-white/10 hover:bg-purple-500/30 border border-white/15 font-bold text-sm text-white"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameSlug === 'speed-tap' && (
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (status !== 'PLAYING' || ctx.isPaused) return;
                setTaps((t) => {
                  const nt = t + 1;
                  setScore(nt * 10);
                  onScoreChange(nt * 10);
                  return nt;
                });
                sfx.click(ctx.soundEnabled);
                triggerHaptic(ctx.hapticsEnabled, 8);
              }}
              className="w-48 h-48 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 shadow-[0_0_32px_rgba(244,63,94,0.45)] active:scale-95 text-white font-display text-2xl font-extrabold"
            >
              TAP FAST!
            </button>
            <div className="font-mono text-sm text-slate-300">Taps: {taps}</div>
          </div>
        )}

        {gameSlug === 'target-shooting' && (
          <div className="relative w-full h-72 rounded-xl bg-[#0D142B] border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                if (status !== 'PLAYING' || ctx.isPaused) return;
                const ns = score + 100;
                setScore(ns);
                onScoreChange(ns);
                sfx.eat(ctx.soundEnabled);
                setTargetPos({ x: 12 + Math.random() * 76, y: 12 + Math.random() * 76 });
              }}
              style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-rose-500 border-4 border-white flex items-center justify-center shadow-[0_0_18px_rgba(244,63,94,0.7)]"
              aria-label="Target Bullseye"
            >
              <span className="w-4 h-4 rounded-full bg-white" />
            </button>
          </div>
        )}

        {gameSlug === 'rhythm-tap' && (
          <div className="space-y-3">
            <div className="relative w-full h-64 rounded-xl bg-[#0D142B] border border-white/10 overflow-hidden grid grid-cols-4">
              {[0, 1, 2, 3].map((l) => (
                <div key={l} className="relative border-r last:border-r-0 border-white/10">
                  {notes
                    .filter((n) => n.lane === l)
                    .map((n) => (
                      <div
                        key={n.id}
                        style={{ top: `${n.y}%` }}
                        className="absolute left-1.5 right-1.5 h-4 rounded-full bg-cyan-400 shadow-[0_0_10px_#00E5FF]"
                      />
                    ))}
                </div>
              ))}
              <div className="absolute left-0 right-0 bottom-6 h-1 bg-purple-400/70" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['D', 'F', 'J', 'K'].map((lbl, idx) => (
                <button
                  key={lbl}
                  type="button"
                  onPointerDown={() => hitRhythmLane(idx)}
                  className="min-h-[52px] rounded-xl bg-purple-500/25 border border-purple-400/50 font-mono font-bold text-white"
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameSlug === 'reflex-runner' && (
          <div className="space-y-3">
            <div className="relative w-full h-64 rounded-xl bg-[#0D142B] border border-white/10 overflow-hidden grid grid-cols-3">
              {[0, 1, 2].map((l) => (
                <div key={l} className="relative border-r last:border-r-0 border-white/10">
                  {gates.map((g) =>
                    g.safeLane !== l ? (
                      <div
                        key={g.id}
                        style={{ top: `${g.y}%` }}
                        className="absolute left-2 right-2 h-4 rounded bg-rose-500 shadow-[0_0_10px_#F43F5E]"
                      />
                    ) : null
                  )}
                  {lane === l && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-cyan-400 shadow-[0_0_14px_#00E5FF]" />
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onPointerDown={() => setLane((l) => Math.max(0, l - 1))} className="min-h-[48px] rounded-xl bg-white/10 text-white font-bold text-xs">← Switch Left</button>
              <button type="button" onPointerDown={() => setLane((l) => Math.min(2, l + 1))} className="min-h-[48px] rounded-xl bg-white/10 text-white font-bold text-xs">Switch Right →</button>
            </div>
          </div>
        )}

        <GameOverlay
          status={status}
          ctx={ctx}
          title={titleMap[gameSlug] || 'Skill Challenge'}
          subtitle="Test pure reaction reflexes, precision timing, and rhythm speed."
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>
    </div>
  );
};

export default ReflexAndRhythmEngine;
