import React, { useCallback, useEffect, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const ConnectFourNimDotsEngine: React.FC<{ ctx: GameControlContext; onScoreChange: (s: number) => void; gameSlug?: string }> = ({
  ctx,
  onScoreChange,
  gameSlug = 'connect-four',
}) => {
  const [vsAI, setVsAI] = useState(true);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'WON' | 'GAME_OVER'>('PLAYING');

  // Connect Four (6 rows x 7 cols)
  const [c4, setC4] = useState<number[][]>(() => Array.from({ length: 6 }, () => Array(7).fill(0)));

  // Nim Heaps
  const [heaps, setHeaps] = useState<number[]>([1, 3, 5, 7]);

  // Dots and Boxes (3x3 boxes => 4x3 horizontal & 3x4 vertical)
  const [hLines, setHLines] = useState<number[][]>(() => Array.from({ length: 4 }, () => Array(3).fill(0)));
  const [vLines, setVLines] = useState<number[][]>(() => Array.from({ length: 3 }, () => Array(4).fill(0)));
  const [boxes, setBoxes] = useState<number[][]>(() => Array.from({ length: 3 }, () => Array(3).fill(0)));

  const reset = useCallback(() => {
    setC4(Array.from({ length: 6 }, () => Array(7).fill(0)));
    setHeaps([1, 3, 5, 7]);
    setHLines(Array.from({ length: 4 }, () => Array(3).fill(0)));
    setVLines(Array.from({ length: 3 }, () => Array(4).fill(0)));
    setBoxes(Array.from({ length: 3 }, () => Array(3).fill(0)));
    setTurn(1);
    setScore(0);
    onScoreChange(0);
    setStatus('PLAYING');
  }, [onScoreChange]);

  useEffect(() => {
    if (ctx.restartKey > 0) reset();
  }, [ctx.restartKey, reset]);

  const checkC4Win = (g: number[][], player: number) => {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        if (g[r][c] !== player) continue;
        if (c + 3 < 7 && g[r][c + 1] === player && g[r][c + 2] === player && g[r][c + 3] === player) return true;
        if (r + 3 < 6 && g[r + 1][c] === player && g[r + 2][c] === player && g[r + 3][c] === player) return true;
        if (r + 3 < 6 && c + 3 < 7 && g[r + 1][c + 1] === player && g[r + 2][c + 2] === player && g[r + 3][c + 3] === player) return true;
        if (r - 3 >= 0 && c + 3 < 7 && g[r - 1][c + 1] === player && g[r - 2][c + 2] === player && g[r - 3][c + 3] === player) return true;
      }
    }
    return false;
  };

  const dropC4 = useCallback(
    (col: number, player: 1 | 2) => {
      if (status !== 'PLAYING' || ctx.isPaused) return false;
      let targetR = -1;
      for (let r = 5; r >= 0; r--) {
        if (c4[r][col] === 0) {
          targetR = r;
          break;
        }
      }
      if (targetR === -1) return false;
      const ng = c4.map((row) => [...row]);
      ng[targetR][col] = player;
      setC4(ng);
      const nextScore = score + (player === 1 ? 20 : 0);
      setScore(nextScore);
      onScoreChange(nextScore);
      sfx.merge(ctx.soundEnabled);
      triggerHaptic(ctx.hapticsEnabled, 10);

      if (checkC4Win(ng, player)) {
        const won = player === 1;
        setStatus(won ? 'WON' : 'GAME_OVER');
        if (won) sfx.win(ctx.soundEnabled);
        else sfx.gameOver(ctx.soundEnabled);
        ctx.onScoreEnd(nextScore + (won ? 300 : 0), won);
      } else if (ng[0].every((x) => x !== 0)) {
        setStatus('GAME_OVER');
        ctx.onScoreEnd(nextScore, false);
      } else {
        setTurn(player === 1 ? 2 : 1);
      }
      return true;
    },
    [c4, ctx, onScoreChange, score, status]
  );

  // Dots & Boxes Edge
  const claimEdge = useCallback(
    (kind: 'h' | 'v', r: number, c: number, side: 1 | 2) => {
      if (status !== 'PLAYING' || ctx.isPaused) return;
      const nh = hLines.map((row) => [...row]);
      const nv = vLines.map((row) => [...row]);
      if (kind === 'h') {
        if (nh[r][c] !== 0) return;
        nh[r][c] = side;
      } else {
        if (nv[r][c] !== 0) return;
        nv[r][c] = side;
      }
      const nb = boxes.map((row) => [...row]);
      let gained = 0;
      for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
          if (nb[br][bc] === 0 && nh[br][bc] && nh[br + 1][bc] && nv[br][bc] && nv[br][bc + 1]) {
            nb[br][bc] = side;
            gained += 1;
          }
        }
      }
      setHLines(nh);
      setVLines(nv);
      setBoxes(nb);
      const nextScore = score + (side === 1 ? gained * 60 + 5 : 0);
      setScore(nextScore);
      onScoreChange(nextScore);
      sfx.click(ctx.soundEnabled);

      if (nb.flat().every((x) => x !== 0)) {
        const p1 = nb.flat().filter((x) => x === 1).length;
        const p2 = nb.flat().filter((x) => x === 2).length;
        const won = p1 >= p2;
        setStatus(won ? 'WON' : 'GAME_OVER');
        ctx.onScoreEnd(nextScore + (won ? 200 : 0), won);
      } else if (gained === 0) {
        setTurn(side === 1 ? 2 : 1);
      }
    },
    [boxes, ctx, hLines, onScoreChange, score, status, vLines]
  );

  // Nim removal
  const takeNim = useCallback(
    (rowIdx: number, count: number, side: 1 | 2) => {
      if (status !== 'PLAYING' || ctx.isPaused || heaps[rowIdx] < count) return;
      const nh = [...heaps];
      nh[rowIdx] -= count;
      setHeaps(nh);
      const nextScore = score + (side === 1 ? count * 20 : 0);
      setScore(nextScore);
      onScoreChange(nextScore);
      sfx.click(ctx.soundEnabled);
      if (nh.every((x) => x === 0)) {
        const won = side === 1;
        setStatus(won ? 'WON' : 'GAME_OVER');
        if (won) sfx.win(ctx.soundEnabled);
        else sfx.gameOver(ctx.soundEnabled);
        ctx.onScoreEnd(nextScore + (won ? 300 : 0), won);
      } else {
        setTurn(side === 1 ? 2 : 1);
      }
    },
    [ctx, heaps, onScoreChange, score, status]
  );

  // AI Turn
  useEffect(() => {
    if (!vsAI || turn !== 2 || status !== 'PLAYING' || ctx.isPaused) return;
    const t = setTimeout(() => {
      if (gameSlug === 'connect-four') {
        const openCols = [0, 1, 2, 3, 4, 5, 6].filter((c) => c4[0][c] === 0);
        // Check winning or blocking move
        for (const testSide of [2, 1]) {
          for (const col of openCols) {
            const ng = c4.map((r) => [...r]);
            for (let r = 5; r >= 0; r--) {
              if (ng[r][col] === 0) {
                ng[r][col] = testSide;
                break;
              }
            }
            if (checkC4Win(ng, testSide)) {
              dropC4(col, 2);
              return;
            }
          }
        }
        const preferred = [3, 2, 4, 1, 5, 0, 6].filter((c) => openCols.includes(c));
        if (preferred.length > 0) dropC4(preferred[Math.floor(Math.random() * Math.min(3, preferred.length))], 2);
      } else if (gameSlug === 'nim-game') {
        const xor = heaps.reduce((a, b) => a ^ b, 0);
        for (let i = 0; i < heaps.length; i++) {
          const target = heaps[i] ^ xor;
          if (xor !== 0 && target < heaps[i]) {
            takeNim(i, heaps[i] - target, 2);
            return;
          }
        }
        const idx = heaps.findIndex((h) => h > 0);
        if (idx >= 0) takeNim(idx, 1, 2);
      } else {
        const openH: Array<[number, number]> = [];
        const openV: Array<[number, number]> = [];
        hLines.forEach((row, r) => row.forEach((v, c) => !v && openH.push([r, c])));
        vLines.forEach((row, r) => row.forEach((v, c) => !v && openV.push([r, c])));
        if (openH.length) claimEdge('h', openH[0][0], openH[0][1], 2);
        else if (openV.length) claimEdge('v', openV[0][0], openV[0][1], 2);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [c4, claimEdge, ctx.isPaused, dropC4, gameSlug, hLines, heaps, status, takeNim, turn, vLines, vsAI]);

  if (gameSlug === 'nim-game') {
    return (
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <div className="text-xs font-mono text-cyan-300 font-bold">
          {turn === 1 ? 'Your Turn: Tap any row stone to remove from that stone rightwards' : 'AI Turn...'}
        </div>
        <div className="relative w-full p-5 rounded-2xl bg-[#0D132B] border border-teal-500/40 space-y-4">
          {heaps.map((count, rIdx) => (
            <div key={rIdx} className="flex items-center justify-center gap-2 min-h-[44px]">
              {count === 0 ? (
                <span className="text-xs text-slate-600 font-mono">Row Empty</span>
              ) : (
                Array.from({ length: count }).map((_, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => (!vsAI || turn === 1) && takeNim(rIdx, count - sIdx, turn)}
                    className="w-9 h-9 rounded-full bg-teal-400 hover:bg-cyan-300 border-2 border-white/60 shadow-[0_0_12px_rgba(20,184,166,0.5)] transition-transform hover:scale-110"
                    title={`Take ${count - sIdx} stone(s)`}
                  />
                ))
              )}
            </div>
          ))}
          <GameOverlay status={status} ctx={ctx} title="Nim Strategy Stones" subtitle="Take 1+ stones from a single row. Claim the last stone to win!" score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
        </div>
      </div>
    );
  }

  if (gameSlug === 'dots-and-boxes') {
    const p1 = boxes.flat().filter((x) => x === 1).length;
    const p2 = boxes.flat().filter((x) => x === 2).length;
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        <div className="w-full flex justify-between text-xs font-mono">
          <span className="text-cyan-300">You: {p1} · Rival: {p2}</span>
          <button type="button" onClick={() => { setVsAI(!vsAI); reset(); }} className="px-3 py-1 rounded-lg bg-white/10 text-white">
            {vsAI ? 'Mode: vs AI' : 'Mode: 2 Players'}
          </button>
        </div>
        <div className="relative w-full p-6 rounded-2xl bg-[#0D132B] border border-purple-500/40 flex flex-col items-center">
          {[0, 1, 2, 3].map((r) => (
            <React.Fragment key={r}>
              <div className="flex items-center">
                {[0, 1, 2].map((c) => (
                  <React.Fragment key={c}>
                    <span className="w-3.5 h-3.5 rounded-full bg-white" />
                    <button
                      type="button"
                      onClick={() => (!vsAI || turn === 1) && claimEdge('h', r, c, turn)}
                      className={`w-16 h-3.5 rounded-full mx-1 ${
                        hLines[r][c] === 1 ? 'bg-cyan-400' : hLines[r][c] === 2 ? 'bg-rose-500' : 'bg-white/15 hover:bg-white/35'
                      }`}
                    />
                  </React.Fragment>
                ))}
                <span className="w-3.5 h-3.5 rounded-full bg-white" />
              </div>
              {r < 3 && (
                <div className="flex items-center my-1">
                  {[0, 1, 2, 3].map((c) => (
                    <React.Fragment key={c}>
                      <button
                        type="button"
                        onClick={() => (!vsAI || turn === 1) && claimEdge('v', r, c, turn)}
                        className={`w-3.5 h-16 rounded-full ${
                          vLines[r][c] === 1 ? 'bg-cyan-400' : vLines[r][c] === 2 ? 'bg-rose-500' : 'bg-white/15 hover:bg-white/35'
                        }`}
                      />
                      {c < 3 && (
                        <div
                          className={`w-16 h-16 mx-1 rounded-lg flex items-center justify-center font-bold text-lg ${
                            boxes[r][c] === 1 ? 'bg-cyan-500/30 text-cyan-200' : boxes[r][c] === 2 ? 'bg-rose-500/30 text-rose-200' : ''
                          }`}
                        >
                          {boxes[r][c] === 1 ? 'P1' : boxes[r][c] === 2 ? 'P2' : ''}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
          <GameOverlay status={status} ctx={ctx} title="Dots and Boxes Pro" subtitle="Complete the 4th wall of a box to claim it and move again!" score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono">
        <span className="text-cyan-300 font-bold">{turn === 1 ? 'Your Turn (Cyan)' : vsAI ? 'AI Thinking...' : 'Player 2 (Amber)'}</span>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => { setVsAI(true); reset(); }} className={`px-3 py-1 rounded-lg border ${vsAI ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/15'}`}>vs AI</button>
          <button type="button" onClick={() => { setVsAI(false); reset(); }} className={`px-3 py-1 rounded-lg border ${!vsAI ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/15'}`}>2P</button>
        </div>
      </div>
      <div className="relative w-full p-3 rounded-2xl bg-[#0D1A3D] border border-blue-500/45">
        <div className="grid grid-cols-7 gap-2">
          {c4.map((row, r) =>
            row.map((cell, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => (!vsAI || turn === 1) && dropC4(c, turn)}
                className="aspect-square rounded-full bg-[#070B19] border border-white/15 flex items-center justify-center hover:border-cyan-400/50"
              >
                {cell !== 0 && (
                  <span
                    className={`w-[82%] h-[82%] rounded-full ${
                      cell === 1 ? 'bg-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.65)]' : 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.65)]'
                    }`}
                  />
                )}
              </button>
            ))
          )}
        </div>
        <GameOverlay status={status} ctx={ctx} title="Connect Four Drop" subtitle="Tap any column to drop your glowing disc and link 4 in a row." score={score} gameSlug={gameSlug} onStart={reset} onRestart={reset} />
      </div>
    </div>
  );
};

export default ConnectFourNimDotsEngine;
