import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

type Disk = 0 | 1 | 2; // 0 empty, 1 player, 2 AI/P2

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const initReversi = (): Disk[][] => {
  const b: Disk[][] = Array.from({ length: 8 }, () => Array(8).fill(0));
  b[3][3] = 2;
  b[3][4] = 1;
  b[4][3] = 1;
  b[4][4] = 2;
  return b;
};

const getReversiFlips = (b: Disk[][], r: number, c: number, side: 1 | 2): Array<[number, number]> => {
  if (b[r][c] !== 0) return [];
  const opp: Disk = side === 1 ? 2 : 1;
  const flips: Array<[number, number]> = [];
  for (const [dr, dc] of DIRS) {
    const line: Array<[number, number]> = [];
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === opp) {
      line.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
    if (line.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === side) {
      flips.push(...line);
    }
  }
  return flips;
};

interface ChkPiece {
  side: 1 | 2;
  king: boolean;
}

const initCheckers = (): (ChkPiece | null)[][] => {
  const b: (ChkPiece | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { side: 2, king: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = { side: 1, king: false };
    }
  }
  return b;
};

const checkersMoves = (b: (ChkPiece | null)[][], side: 1 | 2) => {
  const captures: Array<{ fr: number; fc: number; tr: number; tc: number; mr: number; mc: number }> = [];
  const steps: Array<{ fr: number; fc: number; tr: number; tc: number }> = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p.side !== side) continue;
      const dirs = p.king ? [-1, 1] : side === 1 ? [-1] : [1];
      for (const dr of dirs) {
        for (const dc of [-1, 1]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!b[nr][nc]) steps.push({ fr: r, fc: c, tr: nr, tc: nc });
            else if (b[nr][nc]!.side !== side) {
              const jr = r + dr * 2;
              const jc = c + dc * 2;
              if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !b[jr][jc]) {
                captures.push({ fr: r, fc: c, tr: jr, tc: jc, mr: nr, mc: nc });
              }
            }
          }
        }
      }
    }
  }
  return { captures, steps };
};

const CheckersReversiEngine: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'checkers',
}) => {
  const isReversi = gameSlug === 'reversi';
  const [vsAI, setVsAI] = useState(true);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'WON' | 'GAME_OVER'>('PLAYING');

  const [revBoard, setRevBoard] = useState<Disk[][]>(() => initReversi());
  const [chkBoard, setChkBoard] = useState<(ChkPiece | null)[][]>(() => initCheckers());
  const [chkSel, setChkSel] = useState<[number, number] | null>(null);

  const reset = useCallback(() => {
    setRevBoard(initReversi());
    setChkBoard(initCheckers());
    setChkSel(null);
    setTurn(1);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  // Reversi Move
  const playReversi = useCallback(
    (r: number, c: number, side: 1 | 2) => {
      const flips = getReversiFlips(revBoard, r, c, side);
      if (flips.length === 0) return false;
      const nb = revBoard.map((row) => [...row]);
      nb[r][c] = side;
      flips.forEach(([fr, fc]) => (nb[fr][fc] = side));
      setRevBoard(nb);
      const p1 = nb.flat().filter((x) => x === 1).length;
      const p2 = nb.flat().filter((x) => x === 2).length;
      const sc = p1 * 15;
      setScore(sc);
      onScoreChange(sc);
      sfx.merge(ctx.soundEnabled);

      const opp: 1 | 2 = side === 1 ? 2 : 1;
      const oppHas = nb.some((row, rr) => row.some((_, cc) => getReversiFlips(nb, rr, cc, opp).length > 0));
      const selfHas = nb.some((row, rr) => row.some((_, cc) => getReversiFlips(nb, rr, cc, side).length > 0));
      if (!oppHas && !selfHas) {
        const won = p1 >= p2;
        setStatus(won ? 'WON' : 'GAME_OVER');
        ctx.onScoreEnd(sc + (won ? 200 : 0), won);
      } else {
        setTurn(oppHas ? opp : side);
      }
      return true;
    },
    [ctx, onScoreChange, revBoard]
  );

  // Checkers Move
  const applyCheckersMove = useCallback(
    (fr: number, fc: number, tr: number, tc: number, mr?: number, mc?: number) => {
      const nb = chkBoard.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
      const moving = nb[fr][fc]!;
      nb[fr][fc] = null;
      if (mr !== undefined && mc !== undefined) nb[mr][mc] = null;
      if ((moving.side === 1 && tr === 0) || (moving.side === 2 && tr === 7)) moving.king = true;
      nb[tr][tc] = moving;
      setChkBoard(nb);
      setChkSel(null);
      const nextScore = score + (mr !== undefined ? 60 : 10);
      setScore(nextScore);
      onScoreChange(nextScore);
      sfx.click(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 10);

      const opp: 1 | 2 = turn === 1 ? 2 : 1;
      const oppMoves = checkersMoves(nb, opp);
      if (oppMoves.captures.length === 0 && oppMoves.steps.length === 0) {
        const won = turn === 1;
        setStatus(won ? 'WON' : 'GAME_OVER');
        if (won) sfx.win(ctx.soundEnabled);
        ctx.onScoreEnd(nextScore + (won ? 300 : 0), won);
      } else {
        setTurn(opp);
      }
    },
    [chkBoard, ctx, onScoreChange, score, turn]
  );

  // AI Turn
  useEffect(() => {
    if (!vsAI || turn !== 2 || status !== 'PLAYING' || ctx.isPaused) return;
    const t = setTimeout(() => {
      if (isReversi) {
        const valid: Array<{ r: number; c: number; count: number }> = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const fl = getReversiFlips(revBoard, r, c, 2);
            if (fl.length > 0) {
              const corner = (r === 0 || r === 7) && (c === 0 || c === 7) ? 20 : 0;
              valid.push({ r, c, count: fl.length + corner });
            }
          }
        }
        if (valid.length > 0) {
          valid.sort((a, b) => b.count - a.count);
          playReversi(valid[0].r, valid[0].c, 2);
        }
      } else {
        const { captures, steps } = checkersMoves(chkBoard, 2);
        if (captures.length > 0) {
          const pick = captures[Math.floor(Math.random() * captures.length)];
          applyCheckersMove(pick.fr, pick.fc, pick.tr, pick.tc, pick.mr, pick.mc);
        } else if (steps.length > 0) {
          const pick = steps[Math.floor(Math.random() * steps.length)];
          applyCheckersMove(pick.fr, pick.fc, pick.tr, pick.tc);
        }
      }
    }, 320);
    return () => clearTimeout(t);
  }, [applyCheckersMove, chkBoard, ctx.isPaused, isReversi, playReversi, revBoard, status, turn, vsAI]);

  if (isReversi) {
    const p1 = revBoard.flat().filter((x) => x === 1).length;
    const p2 = revBoard.flat().filter((x) => x === 2).length;
    return (
      <div className="w-full max-w-md flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between text-xs font-mono">
          <span className="text-emerald-300 font-bold">Cyan: {p1} · Rival: {p2}</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => { setVsAI(true); reset(); }} className={`px-3 py-1 rounded-lg border ${vsAI ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 border-white/15'}`}>vs AI</button>
            <button type="button" onClick={() => { setVsAI(false); reset(); }} className={`px-3 py-1 rounded-lg border ${!vsAI ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 border-white/15'}`}>2P</button>
          </div>
        </div>
        <div className="relative w-full aspect-square p-2 rounded-2xl bg-[#0D132B] border border-emerald-500/40">
          <div className="grid grid-cols-8 gap-1 w-full h-full">
            {revBoard.map((row, r) =>
              row.map((val, c) => {
                const valid = (!vsAI || turn === 1) && getReversiFlips(revBoard, r, c, turn).length > 0;
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => (!vsAI || turn === 1) && playReversi(r, c, turn)}
                    className={`rounded-md border flex items-center justify-center ${
                      valid ? 'border-cyan-400/60 bg-cyan-500/15' : 'border-white/10 bg-[#132238]'
                    }`}
                  >
                    {val !== 0 ? (
                      <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-inner ${val === 1 ? 'bg-cyan-400' : 'bg-rose-500'}`} />
                    ) : valid ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400/70" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          <GameOverlay status={status} ctx={ctx} title="Reversi Flip Strategy" subtitle="Bracket opponent discs to flip them to your color." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
        </div>
      </div>
    );
  }

  const { captures, steps } = checkersMoves(chkBoard, turn);
  const mustCapture = captures.length > 0;
  const availableForSel = chkSel
    ? (mustCapture ? captures : steps).filter((m) => m.fr === chkSel[0] && m.fc === chkSel[1])
    : [];

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono">
        <span className="text-cyan-300 font-bold">{turn === 1 ? 'Your Turn (Cyan)' : vsAI ? 'AI Thinking...' : 'Player 2 (Rose)'}</span>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => { setVsAI(true); reset(); }} className={`px-3 py-1 rounded-lg border ${vsAI ? 'bg-rose-600 border-rose-400 text-white' : 'bg-white/5 border-white/15'}`}>vs AI</button>
          <button type="button" onClick={() => { setVsAI(false); reset(); }} className={`px-3 py-1 rounded-lg border ${!vsAI ? 'bg-rose-600 border-rose-400 text-white' : 'bg-white/5 border-white/15'}`}>2P</button>
        </div>
      </div>
      <div className="relative w-full aspect-square p-2 rounded-2xl bg-[#0D132B] border border-rose-500/40">
        <div className="grid grid-cols-8 w-full h-full rounded-xl overflow-hidden border border-white/15">
          {chkBoard.map((row, r) =>
            row.map((piece, c) => {
              const dark = (r + c) % 2 === 1;
              const isSel = chkSel?.[0] === r && chkSel?.[1] === c;
              const moveTarget = availableForSel.find((m) => m.tr === r && m.tc === c);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => {
                    if (ctx.isPaused || status !== 'PLAYING' || (vsAI && turn === 2)) return;
                    if (moveTarget) {
                      const cap = moveTarget as { mr?: number; mc?: number };
                      applyCheckersMove(moveTarget.fr, moveTarget.fc, moveTarget.tr, moveTarget.tc, cap.mr, cap.mc);
                      return;
                    }
                    if (piece && piece.side === turn) {
                      setChkSel([r, c]);
                      sfx.click(ctx.soundEnabled);
                    }
                  }}
                  className={`flex items-center justify-center relative ${
                    isSel ? 'bg-cyan-500/40' : dark ? 'bg-[#17213F]' : 'bg-[#29355D]'
                  }`}
                >
                  {piece && (
                    <span
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        piece.side === 1 ? 'bg-cyan-400 border-white text-slate-950' : 'bg-rose-500 border-amber-200 text-white'
                      }`}
                    >
                      {piece.king ? '♛' : ''}
                    </span>
                  )}
                  {moveTarget && <span className="w-3.5 h-3.5 rounded-full bg-emerald-400/85" />}
                </button>
              );
            })
          )}
        </div>
        <GameOverlay status={status} ctx={ctx} title="Checkers Tactical" subtitle="Jump diagonally to capture pieces and crown Kings." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
      </div>
    </div>
  );
};

export default CheckersReversiEngine;
