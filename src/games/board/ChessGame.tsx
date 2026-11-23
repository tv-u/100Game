import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

type Side = 'w' | 'b';
type Kind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
interface Piece {
  side: Side;
  kind: Kind;
}
type Board = (Piece | null)[][];

const GLYPH: Record<Side, Record<Kind, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

const VAL: Record<Kind, number> = { K: 20000, Q: 900, R: 500, B: 330, N: 320, P: 100 };

const initBoard = (): Board => {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back: Kind[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { side: 'b', kind: back[c] };
    b[1][c] = { side: 'b', kind: 'P' };
    b[6][c] = { side: 'w', kind: 'P' };
    b[7][c] = { side: 'w', kind: back[c] };
  }
  return b;
};

const pseudoMoves = (b: Board, r: number, c: number): Array<[number, number]> => {
  const p = b[r][c];
  if (!p) return [];
  const res: Array<[number, number]> = [];
  const inB = (rr: number, cc: number) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
  const pushRay = (dr: number, dc: number) => {
    let nr = r + dr;
    let nc = c + dc;
    while (inB(nr, nc)) {
      const target = b[nr][nc];
      if (!target) res.push([nr, nc]);
      else {
        if (target.side !== p.side) res.push([nr, nc]);
        break;
      }
      nr += dr;
      nc += dc;
    }
  };

  if (p.kind === 'P') {
    const dir = p.side === 'w' ? -1 : 1;
    const startR = p.side === 'w' ? 6 : 1;
    if (inB(r + dir, c) && !b[r + dir][c]) {
      res.push([r + dir, c]);
      if (r === startR && !b[r + dir * 2][c]) res.push([r + dir * 2, c]);
    }
    for (const dc of [-1, 1]) {
      if (inB(r + dir, c + dc) && b[r + dir][c + dc]?.side && b[r + dir][c + dc]!.side !== p.side) {
        res.push([r + dir, c + dc]);
      }
    }
  } else if (p.kind === 'N') {
    [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (inB(nr, nc) && b[nr][nc]?.side !== p.side) res.push([nr, nc]);
    });
  } else if (p.kind === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inB(nr, nc) && b[nr][nc]?.side !== p.side) res.push([nr, nc]);
      }
    }
  } else {
    if (p.kind === 'R' || p.kind === 'Q') {
      pushRay(1, 0);
      pushRay(-1, 0);
      pushRay(0, 1);
      pushRay(0, -1);
    }
    if (p.kind === 'B' || p.kind === 'Q') {
      pushRay(1, 1);
      pushRay(1, -1);
      pushRay(-1, 1);
      pushRay(-1, -1);
    }
  }
  return res;
};

const applyMove = (b: Board, fr: number, fc: number, tr: number, tc: number): Board => {
  const nb = b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  const moving = nb[fr][fc]!;
  nb[fr][fc] = null;
  if (moving.kind === 'P' && (tr === 0 || tr === 7)) {
    moving.kind = 'Q';
  }
  nb[tr][tc] = moving;
  return nb;
};

const isInCheck = (b: Board, side: Side): boolean => {
  let kr = -1;
  let kc = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (b[r][c]?.side === side && b[r][c]?.kind === 'K') {
        kr = r;
        kc = c;
      }
    }
  }
  if (kr === -1) return true;
  const opp: Side = side === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (b[r][c]?.side === opp) {
        if (pseudoMoves(b, r, c).some(([mr, mc]) => mr === kr && mc === kc)) return true;
      }
    }
  }
  return false;
};

const legalMovesForSquare = (b: Board, r: number, c: number): Array<[number, number]> => {
  const p = b[r][c];
  if (!p) return [];
  return pseudoMoves(b, r, c).filter(([tr, tc]) => !isInCheck(applyMove(b, r, c, tr, tc), p.side));
};

const evalBoard = (b: Board) => {
  let sum = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) continue;
      const centerBonus = (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? 18 : 0;
      sum += (p.side === 'b' ? 1 : -1) * (VAL[p.kind] + centerBonus);
    }
  }
  return sum;
};

const allLegalMoves = (b: Board, side: Side) => {
  const out: Array<{ fr: number; fc: number; tr: number; tc: number }> = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (b[r][c]?.side === side) {
        for (const [tr, tc] of legalMovesForSquare(b, r, c)) {
          out.push({ fr: r, fc: c, tr, tc });
        }
      }
    }
  }
  return out;
};

const ChessGame: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'chess',
}) => {
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [turn, setTurn] = useState<Side>('w');
  const [vsAI, setVsAI] = useState(true);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('PLAYING');
  const [note, setNote] = useState('White to move');

  const reset = useCallback(() => {
    setBoard(initBoard());
    setTurn('w');
    setSelected(null);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
    setNote('White to move');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const finishMove = useCallback(
    (nb: Board, nextSide: Side, capturedPts: number) => {
      const nextScore = score + capturedPts;
      setScore(nextScore);
      onScoreChange(nextScore);
      setBoard(nb);
      setTurn(nextSide);
      setSelected(null);

      const oppMoves = allLegalMoves(nb, nextSide);
      const inChk = isInCheck(nb, nextSide);
      if (oppMoves.length === 0) {
        if (inChk) {
          const won = nextSide === 'b';
          setStatus(won ? 'WON' : 'GAME_OVER');
          setNote(won ? 'Checkmate! You Win!' : 'Checkmate! Black Wins');
          const finalSc = won ? nextScore + 500 : nextScore;
          setScore(finalSc);
          onScoreChange(finalSc);
          if (won) sfx.win(ctx.soundEnabled);
          else sfx.gameOver(ctx.soundEnabled);
          ctx.onScoreEnd(finalSc, won);
        } else {
          setStatus('GAME_OVER');
          setNote('Stalemate Draw');
          ctx.onScoreEnd(nextScore, false);
        }
      } else {
        setNote(`${nextSide === 'w' ? 'White' : 'Black'} to move${inChk ? ' (Check!)' : ''}`);
      }
    },
    [ctx, onScoreChange, score]
  );

  // AI turn (Black)
  useEffect(() => {
    if (!vsAI || turn !== 'b' || status !== 'PLAYING' || ctx.isPaused) return;
    const timer = setTimeout(() => {
      const moves = allLegalMoves(board, 'b');
      if (moves.length === 0) return;
      let bestMove = moves[0];
      let bestEval = -Infinity;
      for (const m of moves) {
        const nb = applyMove(board, m.fr, m.fc, m.tr, m.tc);
        // 1-ply + opponent best capture response
        const replies = allLegalMoves(nb, 'w');
        let worstReply = evalBoard(nb);
        if (replies.length === 0 && isInCheck(nb, 'w')) {
          worstReply = 99999;
        } else {
          worstReply = Infinity;
          for (const rep of replies.slice(0, 18)) {
            const val = evalBoard(applyMove(nb, rep.fr, rep.fc, rep.tr, rep.tc));
            if (val < worstReply) worstReply = val;
          }
        }
        const jitter = Math.random() * 6;
        if (worstReply + jitter > bestEval) {
          bestEval = worstReply + jitter;
          bestMove = m;
        }
      }
      const cap = board[bestMove.tr][bestMove.tc];
      const nb = applyMove(board, bestMove.fr, bestMove.fc, bestMove.tr, bestMove.tc);
      sfx.click(ctx.soundEnabled);
      finishMove(nb, 'w', cap ? 0 : 0);
    }, 280);
    return () => clearTimeout(timer);
  }, [board, ctx.isPaused, ctx.soundEnabled, finishMove, status, turn, vsAI]);

  const legalTargets = selected ? legalMovesForSquare(board, selected[0], selected[1]) : [];

  const handleCellClick = (r: number, c: number) => {
    if (ctx.isPaused || status !== 'PLAYING') return;
    if (vsAI && turn === 'b') return;

    if (selected) {
      const isTarget = legalTargets.some(([tr, tc]) => tr === r && tc === c);
      if (isTarget) {
        const cap = board[r][c];
        const nb = applyMove(board, selected[0], selected[1], r, c);
        sfx.merge(ctx.soundEnabled);
        triggerHaptic(ctx.hapticsEnabled, 10);
        finishMove(nb, turn === 'w' ? 'b' : 'w', cap ? Math.round(VAL[cap.kind] / 10) : 5);
        return;
      }
    }

    const p = board[r][c];
    if (p && p.side === turn) {
      setSelected([r, c]);
      sfx.click(ctx.soundEnabled);
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-cyan-300">{note}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setVsAI(true);
              reset();
            }}
            className={`px-3 py-1.5 rounded-lg border font-semibold ${vsAI ? 'bg-violet-600 border-violet-400 text-white' : 'bg-white/5 border-white/15 text-slate-300'}`}
          >
            vs AI
          </button>
          <button
            type="button"
            onClick={() => {
              setVsAI(false);
              reset();
            }}
            className={`px-3 py-1.5 rounded-lg border font-semibold ${!vsAI ? 'bg-violet-600 border-violet-400 text-white' : 'bg-white/5 border-white/15 text-slate-300'}`}
          >
            2 Players
          </button>
        </div>
      </div>

      <div className="relative w-full aspect-square p-2 rounded-2xl bg-[#0D132B] border border-purple-500/45">
        <div className="grid grid-cols-8 w-full h-full rounded-xl overflow-hidden border border-white/15">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const dark = (r + c) % 2 === 1;
              const isSel = selected?.[0] === r && selected?.[1] === c;
              const isLegal = legalTargets.some(([tr, tc]) => tr === r && tc === c);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className={`relative flex items-center justify-center text-2xl sm:text-3xl select-none transition-colors ${
                    isSel
                      ? 'bg-cyan-500/45'
                      : dark
                      ? 'bg-[#1B254B]'
                      : 'bg-[#2C3A6E]'
                  }`}
                >
                  {piece && (
                    <span className={piece.side === 'w' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]' : 'text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]'}>
                      {GLYPH[piece.side][piece.kind]}
                    </span>
                  )}
                  {isLegal && (
                    <span
                      className={`absolute rounded-full pointer-events-none ${
                        piece ? 'inset-1 border-2 border-cyan-400' : 'w-3 h-3 bg-cyan-400/80'
                      }`}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
        <GameOverlay
          status={status}
          ctx={ctx}
          title="Chess vs AI"
          subtitle="Tap any piece to inspect legal moves and checkmate your opponent."
          score={score}
          gameSlug={gameSlug}
          mode={vsAI ? 'vs AI' : '2P Local'}
          onStart={reset}
          onRestart={reset}
        />
      </div>
    </div>
  );
};

export default ChessGame;
