import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const StickmanFighterGame: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'stickman-fighter',
}) => {
  const { subscribeAction } = useControls();
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER'>('READY');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [pHp, setPHp] = useState(100);
  const [eHp, setEHp] = useState(100);
  const [pX, setPX] = useState(28);
  const [eX, setEX] = useState(72);
  const [pAction, setPAction] = useState<'idle' | 'punch' | 'kick' | 'block'>('idle');
  const [eAction, setEAction] = useState<'idle' | 'windup' | 'strike'>('idle');

  const statusRef = useRef(status);
  statusRef.current = status;
  const pXRef = useRef(28);
  const eXRef = useRef(72);
  const pHpRef = useRef(100);
  const eHpRef = useRef(100);
  const scoreRef = useRef(0);
  const blockRef = useRef(false);
  const endedRef = useRef(false);

  const reset = useCallback(
    (autoStart = false) => {
      pXRef.current = 28;
      eXRef.current = 72;
      pHpRef.current = 100;
      eHpRef.current = 100;
      scoreRef.current = 0;
      endedRef.current = false;
      setPX(28);
      setEX(72);
      setPHp(100);
      setEHp(100);
      setRound(1);
      setScore(0);
      onScoreChange(0);
      const next = autoStart ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    if (ctx.restartKey > 0) reset(false);
  }, [ctx.restartKey, reset]);

  const movePlayer = useCallback((dx: number) => {
    if (ctx.isPaused || statusRef.current !== 'PLAYING') return;
    pXRef.current = Math.max(10, Math.min(eXRef.current - 12, pXRef.current + dx));
    setPX(pXRef.current);
  }, [ctx.isPaused]);

  const strike = useCallback(
    (kind: 'punch' | 'kick') => {
      if (ctx.isPaused || statusRef.current !== 'PLAYING') return;
      blockRef.current = false;
      setPAction(kind);
      setTimeout(() => setPAction('idle'), 180);
      const dist = Math.abs(eXRef.current - pXRef.current);
      if (dist <= (kind === 'kick' ? 24 : 18)) {
        const dmg = kind === 'kick' ? 22 : 14;
        eHpRef.current = Math.max(0, eHpRef.current - dmg);
        setEHp(eHpRef.current);
        scoreRef.current += dmg * 5;
        setScore(scoreRef.current);
        onScoreChange(scoreRef.current);
        sfx.bounce(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, 14);
        if (eHpRef.current <= 0) {
          scoreRef.current += 150;
          setScore(scoreRef.current);
          onScoreChange(scoreRef.current);
          sfx.win(ctx.soundEnabled);
          setRound((r) => r + 1);
          eHpRef.current = 100;
          pHpRef.current = Math.min(100, pHpRef.current + 30);
          setEHp(100);
          setPHp(pHpRef.current);
          eXRef.current = 76;
          setEX(76);
        }
      } else {
        sfx.click(ctx.soundEnabled);
      }
    },
    [ctx.hapticsEnabled, ctx.isPaused, ctx.soundEnabled, onScoreChange]
  );

  useEffect(() => {
    return subscribeAction((act) => {
      if (act === 'left') movePlayer(-7);
      else if (act === 'right') movePlayer(7);
      else if (act === 'primary') strike('punch');
      else if (act === 'secondary') strike('kick');
      else if (act === 'down') {
        blockRef.current = true;
        setPAction('block');
        setTimeout(() => {
          blockRef.current = false;
          setPAction('idle');
        }, 420);
      }
    });
  }, [movePlayer, strike, subscribeAction]);

  // Rival AI tick
  useEffect(() => {
    const id = setInterval(() => {
      if (ctx.isPaused || statusRef.current !== 'PLAYING') return;
      const dist = eXRef.current - pXRef.current;
      if (dist > 17) {
        eXRef.current -= 4;
        setEX(eXRef.current);
      } else if (Math.random() < 0.42) {
        setEAction('windup');
        setTimeout(() => {
          if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
          setEAction('strike');
          setTimeout(() => setEAction('idle'), 180);
          if (Math.abs(eXRef.current - pXRef.current) <= 19) {
            const dmg = blockRef.current ? 4 : 15;
            pHpRef.current = Math.max(0, pHpRef.current - dmg);
            setPHp(pHpRef.current);
            if (pHpRef.current <= 0) {
              statusRef.current = 'GAME_OVER';
              setStatus('GAME_OVER');
              sfx.gameOver(ctx.soundEnabled);
              if (!endedRef.current) {
                endedRef.current = true;
                ctx.onScoreEnd(scoreRef.current, false);
              }
            }
          }
        }, 320);
      }
    }, 360);
    return () => clearInterval(id);
  }, [ctx]);

  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-4">
      <div className="w-full grid grid-cols-3 items-center gap-3 text-xs font-mono">
        <div>
          <div className="text-cyan-300 font-bold mb-1">YOU ({pHp}%)</div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${pHp}%` }} />
          </div>
        </div>
        <div className="text-center font-bold text-slate-200">ROUND {round}</div>
        <div>
          <div className="text-rose-300 font-bold mb-1 text-right">RIVAL ({eHp}%)</div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-rose-500 transition-all ml-auto" style={{ width: `${eHp}%` }} />
          </div>
        </div>
      </div>

      <div className="relative w-full h-64 rounded-2xl border border-rose-500/35 bg-[#090E23] overflow-hidden">
        {/* Neon Dojo Floor */}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-[#111936] border-t border-cyan-500/40" />

        {/* Player Stickman */}
        <svg
          viewBox="0 0 80 120"
          className="absolute bottom-10 w-20 h-28 -translate-x-1/2 transition-all duration-75"
          style={{ left: `${pX}%` }}
        >
          <circle cx="40" cy="20" r="12" fill="none" stroke="#00E5FF" strokeWidth="4" />
          <line x1="40" y1="32" x2="40" y2="75" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1="45" x2={pAction === 'punch' ? 76 : pAction === 'block' ? 52 : 58} y2={pAction === 'block' ? 32 : 50} stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1="75" x2="26" y2="110" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1="75" x2={pAction === 'kick' ? 76 : 54} y2={pAction === 'kick' ? 68 : 110} stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
        </svg>

        {/* Enemy Stickman */}
        <svg
          viewBox="0 0 80 120"
          className="absolute bottom-10 w-20 h-28 -translate-x-1/2 transition-all duration-100"
          style={{ left: `${eX}%` }}
        >
          <circle cx="40" cy="20" r="12" fill="none" stroke={eAction === 'windup' ? '#FBBF24' : '#F43F5E'} strokeWidth="4" />
          <line x1="40" y1="32" x2="40" y2="75" stroke="#F43F5E" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1="45" x2={eAction === 'strike' ? 6 : 22} y2="50" stroke="#F43F5E" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1="75" x2="26" y2="110" stroke="#F43F5E" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1="75" x2="54" y2="110" stroke="#F43F5E" strokeWidth="4" strokeLinecap="round" />
        </svg>

        <GameOverlay
          status={status}
          ctx={ctx}
          title="Stickman Arena Fighter"
          subtitle="Close distance, land Punch & Kick combos, and Block when the rival glows amber!"
          score={score}
          gameSlug={gameSlug}
          onStart={() => reset(true)}
          onRestart={() => reset(true)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => movePlayer(-8)} className="min-h-[48px] px-5 rounded-xl bg-white/5 border border-white/15 font-bold text-sm text-white">
          ← Left
        </button>
        <button type="button" onClick={() => movePlayer(8)} className="min-h-[48px] px-5 rounded-xl bg-white/5 border border-white/15 font-bold text-sm text-white">
          Right →
        </button>
        <button type="button" onClick={() => strike('punch')} className="min-h-[48px] px-5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 font-bold text-sm text-cyan-200">
          Punch
        </button>
        <button type="button" onClick={() => strike('kick')} className="min-h-[48px] px-5 rounded-xl bg-purple-500/20 border border-purple-400/50 font-bold text-sm text-purple-200">
          Kick
        </button>
        <button
          type="button"
          onClick={() => {
            blockRef.current = true;
            setPAction('block');
            setTimeout(() => {
              blockRef.current = false;
              setPAction('idle');
            }, 450);
          }}
          className="min-h-[48px] px-5 rounded-xl bg-amber-500/20 border border-amber-400/50 font-bold text-sm text-amber-200"
        >
          Block
        </button>
      </div>
    </div>
  );
};

export default StickmanFighterGame;
