import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameControlContext } from '../../components/GameShell';
import { useControls } from '../../controls/ControlContext';
import { sfx, triggerHaptic } from '../../utils/sound';
import { GameOverlay } from '../shared/GameOverlay';

const W = 380;
const H = 440;

function checkSmallWin(cells: Array<string | null>): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
  }
  return null;
}

export const MultiplayerArenaEngine: React.FC<{
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
}> = ({ ctx, onScoreChange, gameSlug = 'air-hockey' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reportModality } = useControls();

  const [status, setStatus] = useState<'READY' | 'PLAYING' | 'GAME_OVER' | 'WON'>('READY');
  const [score, setScore] = useState(0);
  const [twoPlayer, setTwoPlayer] = useState(false);

  // Ultimate 9x9 Tic Tac Toe state
  const [ultBoards, setUltBoards] = useState<Array<Array<string | null>>>(() =>
    Array.from({ length: 9 }, () => Array(9).fill(null))
  );
  const [ultWinners, setUltWinners] = useState<Array<string | null>>(Array(9).fill(null));
  const [activeBoard, setActiveBoard] = useState<number | null>(null);
  const [turn, setTurn] = useState<'X' | 'O'>('X');

  const statusRef = useRef(status);
  statusRef.current = status;
  const endedRef = useRef(false);
  const scoreRef = useRef(0);

  // Air Hockey / Quad Pong simulation ref
  const simRef = useRef({
    p1x: W / 2,
    p1y: H - 68,
    p2x: W / 2,
    p2y: 68,
    p1Score: 0,
    p2Score: 0,
    puckX: W / 2,
    puckY: H / 2,
    puckVx: 170,
    puckVy: 205,
    // Quad Pong shields (Bottom, Top, Left, Right)
    shields: [5, 5, 5, 5],
    quadPaddles: [W / 2, W / 2, H / 2, H / 2],
  });

  const reset = useCallback(
    (startImmediately = false) => {
      scoreRef.current = 0;
      endedRef.current = false;
      setScore(0);
      onScoreChange(0);

      simRef.current = {
        p1x: W / 2,
        p1y: H - 68,
        p2x: W / 2,
        p2y: 68,
        p1Score: 0,
        p2Score: 0,
        puckX: W / 2,
        puckY: H / 2,
        puckVx: 175,
        puckVy: 205,
        shields: [5, 5, 5, 5],
        quadPaddles: [W / 2, W / 2, H / 2, H / 2],
      };

      setUltBoards(Array.from({ length: 9 }, () => Array(9).fill(null)));
      setUltWinners(Array(9).fill(null));
      setActiveBoard(null);
      setTurn('X');

      const next = startImmediately ? 'PLAYING' : 'READY';
      statusRef.current = next;
      setStatus(next);
    },
    [onScoreChange]
  );

  useEffect(() => {
    reset(false);
  }, [ctx.restartKey, gameSlug, reset]);

  const finish = useCallback(
    (won: boolean) => {
      statusRef.current = won ? 'WON' : 'GAME_OVER';
      setStatus(won ? 'WON' : 'GAME_OVER');
      if (won) sfx.win(ctx.soundEnabled);
      else sfx.gameOver(ctx.soundEnabled);
      if (!endedRef.current) {
        endedRef.current = true;
        ctx.onScoreEnd(scoreRef.current, won);
      }
    },
    [ctx]
  );

  // Canvas loop for Air Hockey & 4-Player Quad Pong
  useEffect(() => {
    if (gameSlug === 'tic-tac-toe-ultimate') return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const s = simRef.current;

      if (statusRef.current === 'PLAYING' && !ctx.isPaused) {
        if (gameSlug === 'air-hockey') {
          if (!twoPlayer) {
            const targetX = s.puckY < H / 2 ? s.puckX : W / 2;
            s.p2x += (targetX - s.p2x) * 4.5 * dt;
            s.p2y += ((s.puckY < H / 2 ? Math.min(180, s.puckY) : 68) - s.p2y) * 3.5 * dt;
          }

          s.puckX += s.puckVx * dt;
          s.puckY += s.puckVy * dt;
          s.puckVx *= Math.pow(0.996, dt * 60);
          s.puckVy *= Math.pow(0.996, dt * 60);

          if (s.puckX < 20 || s.puckX > W - 20) {
            s.puckVx *= -1;
            s.puckX = Math.max(20, Math.min(W - 20, s.puckX));
            sfx.bounce(ctx.soundEnabled);
          }

          // Top/Bottom goals (center 140px wide)
          const inGoalX = Math.abs(s.puckX - W / 2) < 70;
          if (s.puckY < 16) {
            if (inGoalX) {
              s.p1Score += 1;
              scoreRef.current += 100;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.clear(ctx.soundEnabled);
              s.puckX = W / 2;
              s.puckY = H / 2;
              s.puckVx = (Math.random() - 0.5) * 200;
              s.puckVy = 175;
              if (s.p1Score >= 7) finish(true);
            } else {
              s.puckVy *= -1;
              s.puckY = 18;
            }
          } else if (s.puckY > H - 16) {
            if (inGoalX) {
              s.p2Score += 1;
              sfx.gameOver(ctx.soundEnabled);
              s.puckX = W / 2;
              s.puckY = H / 2;
              s.puckVx = (Math.random() - 0.5) * 200;
              s.puckVy = -175;
              if (s.p2Score >= 7) finish(false);
            } else {
              s.puckVy *= -1;
              s.puckY = H - 18;
            }
          }

          // Striker collisions
          for (const [sx, sy] of [
            [s.p1x, s.p1y],
            [s.p2x, s.p2y],
          ]) {
            const dx = s.puckX - sx;
            const dy = s.puckY - sy;
            const d = Math.hypot(dx, dy);
            if (d < 36 && d > 0) {
              const nx = dx / d;
              const ny = dy / d;
              s.puckX = sx + nx * 37;
              s.puckY = sy + ny * 37;
              s.puckVx = nx * 360;
              s.puckVy = ny * 360;
              sfx.bounce(ctx.soundEnabled);
              triggerHaptic(ctx.hapticsEnabled, 10);
            }
          }
        } else if (gameSlug === 'four-player-pong') {
          s.puckX += s.puckVx * dt;
          s.puckY += s.puckVy * dt;
          // AI move Top, Left, Right paddles
          s.quadPaddles[1] += (s.puckX - s.quadPaddles[1]) * 4.5 * dt;
          s.quadPaddles[2] += (s.puckY - s.quadPaddles[2]) * 4.5 * dt;
          s.quadPaddles[3] += (s.puckY - s.quadPaddles[3]) * 4.5 * dt;

          // Check 4 walls
          if (s.puckY > H - 24 && s.puckVy > 0) {
            if (Math.abs(s.puckX - s.quadPaddles[0]) < 46) {
              s.puckVy *= -1.04;
              scoreRef.current += 25;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              sfx.bounce(ctx.soundEnabled);
            } else {
              s.shields[0] -= 1;
              s.puckX = W / 2;
              s.puckY = H / 2;
              if (s.shields[0] <= 0) finish(false);
            }
          } else if (s.puckY < 24 && s.puckVy < 0) {
            if (Math.abs(s.puckX - s.quadPaddles[1]) < 44) {
              s.puckVy *= -1;
              sfx.bounce(ctx.soundEnabled);
            } else {
              s.shields[1] -= 1;
              scoreRef.current += 50;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              s.puckX = W / 2;
              s.puckY = H / 2;
            }
          } else if (s.puckX < 24 && s.puckVx < 0) {
            if (Math.abs(s.puckY - s.quadPaddles[2]) < 44) {
              s.puckVx *= -1;
              sfx.bounce(ctx.soundEnabled);
            } else {
              s.shields[2] -= 1;
              scoreRef.current += 50;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              s.puckX = W / 2;
              s.puckY = H / 2;
            }
          } else if (s.puckX > W - 24 && s.puckVx > 0) {
            if (Math.abs(s.puckY - s.quadPaddles[3]) < 44) {
              s.puckVx *= -1;
              sfx.bounce(ctx.soundEnabled);
            } else {
              s.shields[3] -= 1;
              scoreRef.current += 50;
              setScore(scoreRef.current);
              onScoreChange(scoreRef.current);
              s.puckX = W / 2;
              s.puckY = H / 2;
            }
          }

          if (s.shields[1] <= 0 && s.shields[2] <= 0 && s.shields[3] <= 0) {
            finish(true);
          }
        }
      }

      const c = canvasRef.current?.getContext('2d');
      if (c) {
        c.fillStyle = '#070B19';
        c.fillRect(0, 0, W, H);

        if (gameSlug === 'air-hockey') {
          c.strokeStyle = 'rgba(0,229,255,0.3)';
          c.lineWidth = 3;
          c.strokeRect(8, 8, W - 16, H - 16);
          c.beginPath();
          c.moveTo(8, H / 2);
          c.lineTo(W - 8, H / 2);
          c.stroke();
          c.beginPath();
          c.arc(W / 2, H / 2, 46, 0, Math.PI * 2);
          c.stroke();
          // Goals
          c.fillStyle = '#00E5FF';
          c.fillRect(W / 2 - 70, 4, 140, 8);
          c.fillStyle = '#F43F5E';
          c.fillRect(W / 2 - 70, H - 12, 140, 8);
          // Strikers
          c.fillStyle = '#F43F5E';
          c.beginPath();
          c.arc(s.p2x, s.p2y, 22, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#00E5FF';
          c.beginPath();
          c.arc(s.p1x, s.p1y, 22, 0, Math.PI * 2);
          c.fill();
        } else {
          // Quad Pong paddles
          c.fillStyle = '#00E5FF';
          c.fillRect(s.quadPaddles[0] - 42, H - 20, 84, 10);
          c.fillStyle = '#EF4444';
          c.fillRect(s.quadPaddles[1] - 40, 10, 80, 10);
          c.fillStyle = '#A855F7';
          c.fillRect(10, s.quadPaddles[2] - 40, 10, 80);
          c.fillStyle = '#10B981';
          c.fillRect(W - 20, s.quadPaddles[3] - 40, 10, 80);
        }

        // Puck / Ball
        c.fillStyle = '#FFFFFF';
        c.beginPath();
        c.arc(s.puckX, s.puckY, 13, 0, Math.PI * 2);
        c.fill();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, finish, gameSlug, onScoreChange, twoPlayer]);

  // Ultimate Tic Tac Toe Move
  const playUltCell = (bIdx: number, cIdx: number) => {
    if (status !== 'PLAYING' || ctx.isPaused) return;
    if (ultWinners[bIdx] || ultBoards[bIdx][cIdx]) return;
    if (activeBoard !== null && !ultWinners[activeBoard] && activeBoard !== bIdx) return;

    const nextBoards = ultBoards.map((b, i) => (i === bIdx ? b.map((cell, j) => (j === cIdx ? turn : cell)) : b));
    const nextWinners = nextBoards.map((b, i) => ultWinners[i] || checkSmallWin(b));
    setUltBoards(nextBoards);
    setUltWinners(nextWinners);
    sfx.click(ctx.soundEnabled);

    const macroWin = checkSmallWin(nextWinners);
    if (macroWin) {
      const won = macroWin === 'X';
      const ns = won ? 500 : 100;
      setScore(ns);
      onScoreChange(ns);
      finish(won);
      return;
    }

    const nextActive = nextWinners[cIdx] || nextBoards[cIdx].every(Boolean) ? null : cIdx;
    setActiveBoard(nextActive);

    if (!twoPlayer && turn === 'X') {
      // Quick tactical AI move for O
      window.setTimeout(() => {
        const candidates: Array<[number, number]> = [];
        for (let b = 0; b < 9; b++) {
          if (nextWinners[b]) continue;
          if (nextActive !== null && nextActive !== b) continue;
          for (let c = 0; c < 9; c++) {
            if (!nextBoards[b][c]) candidates.push([b, c]);
          }
        }
        if (candidates.length === 0) return;
        const [ab, ac] = candidates[Math.floor(Math.random() * candidates.length)];
        const aiBoards = nextBoards.map((b, i) => (i === ab ? b.map((cell, j) => (j === ac ? 'O' : cell)) : b));
        const aiWinners = aiBoards.map((b, i) => nextWinners[i] || checkSmallWin(b));
        setUltBoards(aiBoards);
        setUltWinners(aiWinners);
        setActiveBoard(aiWinners[ac] || aiBoards[ac].every(Boolean) ? null : ac);
        setTurn('X');
        const mw = checkSmallWin(aiWinners);
        if (mw) finish(mw === 'X');
      }, 280);
    } else {
      setTurn(turn === 'X' ? 'O' : 'X');
    }
  };

  const titleMap: Record<string, string> = {
    'air-hockey': 'Air Hockey 2P Arena',
    'tic-tac-toe-ultimate': 'Ultimate 9x9 Tic Tac Toe',
    'four-player-pong': '4-Corner Quad Pong',
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between text-xs font-mono text-slate-300 px-1">
        <button
          type="button"
          onClick={() => setTwoPlayer((v) => !v)}
          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-bold text-white"
        >
          Mode: {twoPlayer ? '2P Local' : '1P vs AI'}
        </button>
        <span>
          {gameSlug === 'air-hockey'
            ? `You ${simRef.current.p1Score} – ${simRef.current.p2Score} Rival`
            : `Score: ${score}`}
        </span>
      </div>

      {gameSlug === 'tic-tac-toe-ultimate' ? (
        <div className="relative w-full aspect-square rounded-2xl border border-indigo-500/35 bg-[#070B19] p-3 grid grid-cols-3 gap-2">
          {ultBoards.map((board, bIdx) => {
            const isTarget = activeBoard === null || activeBoard === bIdx;
            const winMark = ultWinners[bIdx];
            return (
              <div
                key={bIdx}
                className={`relative rounded-xl border p-1 grid grid-cols-3 gap-0.5 ${
                  winMark
                    ? 'border-emerald-400/50 bg-emerald-500/15'
                    : isTarget
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-white/10 bg-white/5 opacity-60'
                }`}
              >
                {board.map((cell, cIdx) => (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => playUltCell(bIdx, cIdx)}
                    className="aspect-square rounded bg-[#0D142B] text-xs font-bold text-white flex items-center justify-center"
                  >
                    <span className={cell === 'X' ? 'text-cyan-400' : 'text-rose-400'}>{cell}</span>
                  </button>
                ))}
                {winMark && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#070B19]/75 font-display text-3xl font-extrabold text-cyan-300">
                    {winMark}
                  </div>
                )}
              </div>
            );
          })}
          <GameOverlay
            status={status}
            ctx={ctx}
            title="Ultimate 9x9 Tic Tac Toe"
            subtitle="Each move sends your rival to the corresponding macro-board. Win 3 boards in a row!"
            score={score}
            gameSlug="tic-tac-toe-ultimate"
            onStart={() => reset(true)}
            onRestart={() => reset(true)}
          />
        </div>
      ) : (
        <div
          className="relative w-full aspect-[38/44] rounded-2xl overflow-hidden border border-cyan-500/35 bg-[#070B19] game-surface-lock"
          onPointerMove={(e) => {
            if (statusRef.current !== 'PLAYING' || ctx.isPaused) return;
            reportModality(e.pointerType === 'mouse' ? 'mouse' : 'touch');
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const py = ((e.clientY - rect.top) / rect.height) * H;
            if (gameSlug === 'air-hockey') {
              if (py > H / 2) {
                simRef.current.p1x = Math.max(30, Math.min(W - 30, px));
                simRef.current.p1y = Math.max(H / 2 + 24, Math.min(H - 30, py));
              } else if (twoPlayer) {
                simRef.current.p2x = Math.max(30, Math.min(W - 30, px));
                simRef.current.p2y = Math.max(30, Math.min(H / 2 - 24, py));
              }
            } else {
              simRef.current.quadPaddles[0] = Math.max(46, Math.min(W - 46, px));
            }
          }}
        >
          <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />
          <GameOverlay
            status={status}
            ctx={ctx}
            title={titleMap[gameSlug] || 'Arena Match'}
            subtitle="Drag your striker cleanly inside your half to score goals or guard your goal line."
            score={score}
            gameSlug={gameSlug}
            onStart={() => reset(true)}
            onRestart={() => reset(true)}
          />
        </div>
      )}
    </div>
  );
};

export default MultiplayerArenaEngine;
