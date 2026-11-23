import React from 'react';
import { getGameBySlug } from '../data/games';

export const GameArtwork: React.FC<{ slug: string; className?: string }> = ({ slug, className = '' }) => {
  const game = getGameBySlug(slug);
  const accent = game?.accentHex || '#8B5CF6';
  const gradId = `bg-${slug.replace(/[^a-z0-9]/gi, '')}`;

  // Custom hand-crafted SVGs for the original 10 flagship classics
  switch (slug) {
    case 'snake':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <defs>
            <linearGradient id="snk-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#071B18" />
              <stop offset="100%" stopColor="#0B1220" />
            </linearGradient>
          </defs>
          <rect width="320" height="200" fill="url(#snk-bg)" />
          <g stroke="#10B981" strokeOpacity="0.14" strokeWidth="1">
            {[40, 80, 120, 160, 200, 240, 280].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="200" />
            ))}
            {[40, 80, 120, 160].map((y) => (
              <line key={y} x1="0" y1={y} x2="320" y2={y} />
            ))}
          </g>
          <path d="M60 140 H140 V100 H200 V60 H220" fill="none" stroke="#10B981" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="222" cy="55" r="3" fill="#06281E" />
          <circle cx="222" cy="65" r="3" fill="#06281E" />
          <circle cx="264" cy="120" r="11" fill="#F43F5E" />
          <circle cx="264" cy="120" r="17" fill="#F43F5E" fillOpacity="0.22" />
        </svg>
      );
    case '2048':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#110E24" />
          <rect x="76" y="16" width="168" height="168" rx="14" fill="#1C1838" stroke="#7C3AED" strokeOpacity="0.4" />
          {[
            { x: 88, y: 28, c: '#312E81', t: '128', tc: '#E0E7FF' },
            { x: 164, y: 28, c: '#4F46E5', t: '512', tc: '#FFFFFF' },
            { x: 88, y: 104, c: '#6D28D9', t: '1024', tc: '#FFFFFF' },
            { x: 164, y: 104, c: '#7C3AED', t: '2048', tc: '#FFFFFF' },
          ].map((tile, i) => (
            <g key={i}>
              <rect x={tile.x} y={tile.y} width="68" height="68" rx="10" fill={tile.c} />
              <text x={tile.x + 34} y={tile.y + 42} textAnchor="middle" fill={tile.tc} fontFamily="Outfit, sans-serif" fontWeight="700" fontSize={tile.t.length > 3 ? '20' : '22'}>
                {tile.t}
              </text>
            </g>
          ))}
        </svg>
      );
    case 'tetris':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#0B1328" />
          <rect x="92" y="12" width="136" height="176" rx="8" fill="#111C38" stroke="#3B82F6" strokeOpacity="0.4" />
          <g fill="#8B5CF6">
            <rect x="136" y="34" width="22" height="22" rx="4" />
            <rect x="114" y="56" width="22" height="22" rx="4" />
            <rect x="136" y="56" width="22" height="22" rx="4" />
            <rect x="158" y="56" width="22" height="22" rx="4" />
          </g>
          <g>
            <rect x="100" y="160" width="22" height="22" rx="4" fill="#3B82F6" />
            <rect x="122" y="160" width="22" height="22" rx="4" fill="#3B82F6" />
            <rect x="144" y="160" width="22" height="22" rx="4" fill="#06B6D4" />
            <rect x="166" y="160" width="22" height="22" rx="4" fill="#06B6D4" />
            <rect x="188" y="160" width="22" height="22" rx="4" fill="#F59E0B" />
            <rect x="188" y="138" width="22" height="22" rx="4" fill="#F59E0B" />
            <rect x="100" y="138" width="22" height="22" rx="4" fill="#10B981" />
            <rect x="122" y="138" width="22" height="22" rx="4" fill="#10B981" />
          </g>
        </svg>
      );
    case 'flappy-bird':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#08203E" />
          <rect x="180" y="0" width="38" height="62" rx="4" fill="#06B6D4" fillOpacity="0.9" />
          <rect x="180" y="132" width="38" height="68" rx="4" fill="#06B6D4" fillOpacity="0.9" />
          <rect x="256" y="0" width="38" height="90" rx="4" fill="#3B82F6" fillOpacity="0.75" />
          <rect x="256" y="156" width="38" height="44" rx="4" fill="#3B82F6" fillOpacity="0.75" />
          <ellipse cx="104" cy="98" rx="20" ry="15" fill="#F59E0B" />
          <polygon points="122,94 136,100 122,106" fill="#F97316" />
          <ellipse cx="98" cy="100" rx="10" ry="6" fill="#FEF3C7" />
          <circle cx="112" cy="93" r="3.5" fill="#0F172A" />
        </svg>
      );
    case 'tic-tac-toe':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#141026" />
          <g stroke="#6D28D9" strokeWidth="4" strokeLinecap="round">
            <line x1="130" y1="24" x2="130" y2="176" />
            <line x1="190" y1="24" x2="190" y2="176" />
            <line x1="82" y1="74" x2="238" y2="74" />
            <line x1="82" y1="126" x2="238" y2="126" />
          </g>
          <g stroke="#A78BFA" strokeWidth="6" strokeLinecap="round">
            <line x1="94" y1="36" x2="118" y2="60" />
            <line x1="118" y1="36" x2="94" y2="60" />
            <line x1="148" y1="88" x2="172" y2="112" />
            <line x1="172" y1="88" x2="148" y2="112" />
            <line x1="202" y1="140" x2="226" y2="164" />
            <line x1="226" y1="140" x2="202" y2="164" />
          </g>
          <circle cx="214" cy="48" r="13" fill="none" stroke="#38BDF8" strokeWidth="6" />
          <circle cx="106" cy="152" r="13" fill="none" stroke="#38BDF8" strokeWidth="6" />
        </svg>
      );
    case 'memory-match':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#1F0F24" />
          {[
            { x: 68, y: 26, open: true },
            { x: 134, y: 26, open: false },
            { x: 200, y: 26, open: false },
            { x: 68, y: 106, open: false },
            { x: 134, y: 106, open: true },
            { x: 200, y: 106, open: false },
          ].map((c, i) => (
            <g key={i}>
              <rect x={c.x} y={c.y} width="54" height="68" rx="10" fill={c.open ? '#3B1239' : '#1E2438'} stroke={c.open ? '#EC4899' : '#475569'} strokeWidth="2" />
              {c.open ? (
                <polygon points={`${c.x + 27},${c.y + 18} ${c.x + 41},${c.y + 34} ${c.x + 27},${c.y + 50} ${c.x + 13},${c.y + 34}`} fill="#F472B6" />
              ) : (
                <circle cx={c.x + 27} cy={c.y + 34} r="7" fill="#475569" />
              )}
            </g>
          ))}
        </svg>
      );
    case 'minesweeper':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#16141F" />
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3, 4].map((col) => {
              const x = 66 + col * 38;
              const y = 26 + row * 38;
              const revealed = (row === 0 && col < 3) || (row === 1 && col < 2);
              const flagged = row === 1 && col === 2;
              return (
                <g key={`${row}-${col}`}>
                  <rect x={x} y={y} width="34" height="34" rx="6" fill={revealed ? '#1E293B' : '#334155'} stroke="#475569" strokeWidth="1" />
                  {revealed && (
                    <text x={x + 17} y={y + 23} textAnchor="middle" fill={col === 1 ? '#38BDF8' : '#34D399'} fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="16">
                      {col === 2 || (row === 1 && col === 1) ? '2' : '1'}
                    </text>
                  )}
                  {flagged && <path d={`M${x + 12} ${y + 26} V${y + 9} L${x + 24} ${y + 14} L${x + 12} ${y + 19}`} fill="#F59E0B" stroke="#F59E0B" strokeWidth="2" />}
                </g>
              );
            })
          )}
        </svg>
      );
    case 'breakout':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#0B1026" />
          {[{ y: 26, c: '#F43F5E' }, { y: 48, c: '#F59E0B' }, { y: 70, c: '#3B82F6' }].map((row, ri) =>
            [0, 1, 2, 3, 4].map((ci) =>
              ri === 2 && ci === 2 ? null : <rect key={`${ri}-${ci}`} x={38 + ci * 50} y={row.y} width="44" height="14" rx="4" fill={row.c} />
            )
          )}
          <circle cx="176" cy="118" r="8" fill="#FFFFFF" />
          <line x1="154" y1="158" x2="174" y2="124" stroke="#60A5FA" strokeWidth="2" strokeDasharray="4 4" />
          <rect x="114" y="164" width="92" height="12" rx="6" fill="#6366F1" />
        </svg>
      );
    case 'sudoku':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#0C1726" />
          <rect x="80" y="20" width="160" height="160" rx="8" fill="#13233A" stroke="#0EA5E9" strokeOpacity="0.6" strokeWidth="2" />
          <line x1="133" y1="20" x2="133" y2="180" stroke="#0EA5E9" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="186" y1="20" x2="186" y2="180" stroke="#0EA5E9" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="80" y1="73" x2="240" y2="73" stroke="#0EA5E9" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="80" y1="126" x2="240" y2="126" stroke="#0EA5E9" strokeOpacity="0.45" strokeWidth="2" />
          <rect x="135" y="75" width="49" height="49" fill="#0EA5E9" fillOpacity="0.24" />
          {[
            { x: 106, y: 54, n: '5', c: '#E2E8F0' },
            { x: 160, y: 54, n: '3', c: '#38BDF8' },
            { x: 213, y: 54, n: '7', c: '#E2E8F0' },
            { x: 160, y: 108, n: '9', c: '#38BDF8' },
            { x: 106, y: 160, n: '4', c: '#E2E8F0' },
            { x: 213, y: 160, n: '8', c: '#38BDF8' },
          ].map((d, i) => (
            <text key={i} x={d.x} y={d.y} textAnchor="middle" fill={d.c} fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="22">
              {d.n}
            </text>
          ))}
        </svg>
      );
    case '15-puzzle':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#0A1D1D" />
          <rect x="86" y="20" width="148" height="148" rx="12" fill="#112A2A" stroke="#14B8A6" strokeOpacity="0.5" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const x = 96 + col * 44;
            const y = 30 + row * 44;
            return (
              <g key={n}>
                <rect x={x} y={y} width="40" height="40" rx="8" fill={n % 2 === 0 ? '#0D9488' : '#14B8A6'} />
                <text x={x + 20} y={y + 27} textAnchor="middle" fill="#FFFFFF" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="18">
                  {n}
                </text>
              </g>
            );
          })}
        </svg>
      );
    default:
      break;
  }

  // Deterministic, distinct neon genre & slug artwork for Games 11–100
  const seed = (game?.number || slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 97;
  const rot = (seed * 37) % 360;
  const motif = renderMotif(slug, game?.category || 'arcade', accent, seed);

  return (
    <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#090F24" />
          <stop offset="55%" stopColor="#121A3A" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.34" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${gradId})`} />
      {/* Subtle diagonal tech mesh */}
      <g stroke={accent} strokeOpacity="0.12" strokeWidth="1">
        {[40, 80, 120, 160, 200, 240, 280].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="200" />
        ))}
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" y1={y} x2="320" y2={y} />
        ))}
      </g>
      {/* Ambient orbital glow */}
      <circle cx={70 + (seed % 180)} cy={45 + (seed % 90)} r="74" fill={accent} fillOpacity="0.15" />
      <circle cx="268" cy="160" r="46" fill="#00E5FF" fillOpacity="0.08" transform={`rotate(${rot} 160 100)`} />
      {motif}
    </svg>
  );
};

function renderMotif(slug: string, category: string, accent: string, seed: number): React.ReactNode {
  // Bespoke high-impact vector illustrations per game archetype
  if (slug === 'chess' || slug === 'checkers' || slug === 'reversi') {
    return (
      <g>
        <rect x="86" y="26" width="148" height="148" rx="10" fill="#0D142B" stroke={accent} strokeWidth="2" strokeOpacity="0.65" />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={94 + c * 33}
              y={34 + r * 33}
              width="33"
              height="33"
              fill={(r + c) % 2 === 0 ? '#1E293B' : '#0F172A'}
            />
          ))
        )}
        {slug === 'chess' ? (
          <g fill={accent}>
            <path d="M160 54 L145 72 L152 84 L142 126 H178 L168 84 L175 72 Z" fill="#FFFFFF" />
            <rect x="136" y="128" width="48" height="12" rx="4" fill={accent} />
            <circle cx="160" cy="48" r="7" fill="#00E5FF" />
          </g>
        ) : (
          <g>
            <circle cx="127" cy="83" r="12" fill="#F43F5E" stroke="#FFF" strokeWidth="2" />
            <circle cx="193" cy="116" r="12" fill="#00E5FF" stroke="#FFF" strokeWidth="2" />
            <circle cx="160" cy="116" r="12" fill={accent} />
          </g>
        )}
      </g>
    );
  }

  if (slug === 'ludo' || slug === 'connect-four' || slug === 'mancala' || slug === 'battleship' || slug === 'dots-and-boxes' || slug === 'nim-game' || slug === 'chinese-checkers') {
    return (
      <g>
        {slug === 'connect-four' ? (
          <g>
            <rect x="76" y="28" width="168" height="144" rx="12" fill="#1D4ED8" stroke="#60A5FA" strokeWidth="2" />
            {[0, 1, 2, 3, 4].map((c) =>
              [0, 1, 2, 3].map((r) => (
                <circle
                  key={`${c}-${r}`}
                  cx={98 + c * 31}
                  cy={52 + r * 32}
                  r="11"
                  fill={r === 3 && c < 4 ? '#F43F5E' : r === 2 && c > 1 ? '#FBBF24' : '#090F24'}
                />
              ))
            )}
          </g>
        ) : (
          <g>
            <rect x="88" y="28" width="144" height="144" rx="16" fill="#111C3D" stroke={accent} strokeWidth="2" />
            <rect x="100" y="40" width="44" height="44" rx="8" fill="#EF4444" fillOpacity="0.85" />
            <rect x="176" y="40" width="44" height="44" rx="8" fill="#10B981" fillOpacity="0.85" />
            <rect x="100" y="116" width="44" height="44" rx="8" fill="#3B82F6" fillOpacity="0.85" />
            <rect x="176" y="116" width="44" height="44" rx="8" fill="#F59E0B" fillOpacity="0.85" />
            <polygon points="160,82 178,100 160,118 142,100" fill="#FFFFFF" />
          </g>
        )}
      </g>
    );
  }

  if (slug === 'bubble-shooter' || slug === 'bubble-pop' || slug === 'fruit-merge' || slug === 'match-3') {
    const colors = ['#00E5FF', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6'];
    return (
      <g>
        {Array.from({ length: 12 }).map((_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const cx = 100 + col * 40 + (row % 2 === 1 ? 18 : 0);
          const cy = 44 + row * 34;
          const clr = colors[(i + seed) % colors.length];
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={slug === 'fruit-merge' ? 14 + (i % 3) * 4 : 15} fill={clr} fillOpacity="0.88" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.5" />
              <circle cx={cx - 5} cy={cy - 5} r="4" fill="#FFFFFF" fillOpacity="0.55" />
            </g>
          );
        })}
        <line x1="160" y1="184" x2="188" y2="122" stroke="#00E5FF" strokeWidth="2.5" strokeDasharray="5 4" />
        <circle cx="160" cy="176" r="13" fill="#EC4899" stroke="#FFF" strokeWidth="2" />
      </g>
    );
  }

  if (slug === 'block-blast' || slug === 'mahjong-solitaire' || slug === 'nonogram' || slug === 'lights-out' || slug === 'jigsaw-puzzle') {
    return (
      <g>
        <rect x="86" y="26" width="148" height="148" rx="12" fill="#0F1733" stroke={accent} strokeWidth="2" strokeOpacity="0.7" />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => {
            const on = (r + c + seed) % 3 !== 0;
            return (
              <rect
                key={`${r}-${c}`}
                x={98 + c * 32}
                y={38 + r * 32}
                width="28"
                height="28"
                rx="6"
                fill={on ? accent : '#1E293B'}
                fillOpacity={on ? 0.9 : 0.7}
                stroke={on ? '#FFFFFF' : '#334155'}
                strokeOpacity="0.35"
              />
            );
          })
        )}
      </g>
    );
  }

  if (slug === 'color-sort' || slug === 'ball-sort' || slug === 'water-sort') {
    const palette = ['#00E5FF', '#EC4899', '#F59E0B', '#10B981'];
    return (
      <g>
        {[0, 1, 2, 3].map((tIdx) => {
          const x = 76 + tIdx * 48;
          return (
            <g key={tIdx}>
              <rect x={x} y="36" width="28" height="130" rx="14" fill="#0D142B" stroke="#94A3B8" strokeWidth="2" />
              {[0, 1, 2].map((layer) => (
                <rect
                  key={layer}
                  x={x + 4}
                  y={128 - layer * 28}
                  width="20"
                  height="24"
                  rx="6"
                  fill={palette[(tIdx + layer + seed) % palette.length]}
                />
              ))}
            </g>
          );
        })}
      </g>
    );
  }

  if (slug === 'tower-defense') {
    return (
      <g>
        <path d="M24 140 H110 V54 H210 V140 H296" fill="none" stroke="#1E3A8A" strokeWidth="28" strokeLinejoin="round" />
        <path d="M24 140 H110 V54 H210 V140 H296" fill="none" stroke="#00E5FF" strokeWidth="3" strokeDasharray="8 6" strokeLinejoin="round" />
        <circle cx="158" cy="100" r="18" fill="#3B82F6" stroke="#93C5FD" strokeWidth="3" />
        <line x1="158" y1="100" x2="188" y2="56" stroke="#00E5FF" strokeWidth="3.5" />
        <circle cx="72" cy="88" r="15" fill="#9D4EDD" stroke="#E9D5FF" strokeWidth="2" />
        <circle cx="192" cy="54" r="9" fill="#F43F5E" />
        <circle cx="246" cy="140" r="9" fill="#F43F5E" />
      </g>
    );
  }

  if (category === 'racing-sports') {
    if (slug === 'basketball-shots' || slug === 'penalty-shootout' || slug === 'mini-golf' || slug === 'bowling' || slug === 'pool-billiards' || slug === 'table-tennis') {
      return (
        <g>
          <rect x="52" y="28" width="216" height="144" rx="16" fill="#0B1F22" stroke={accent} strokeWidth="2.5" />
          <circle cx="160" cy="100" r="36" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="6 4" />
          <circle cx="160" cy="100" r="18" fill={accent} stroke="#FFF" strokeWidth="2" />
          <circle cx="106" cy="70" r="10" fill="#F59E0B" />
          <circle cx="216" cy="130" r="10" fill="#00E5FF" />
        </g>
      );
    }
    return (
      <g>
        <rect x="78" y="0" width="164" height="200" fill="#0F172A" />
        <line x1="82" y1="0" x2="82" y2="200" stroke={accent} strokeWidth="4" />
        <line x1="238" y1="0" x2="238" y2="200" stroke={accent} strokeWidth="4" />
        <line x1="160" y1="10" x2="160" y2="190" stroke="#94A3B8" strokeWidth="4" strokeDasharray="18 14" />
        <rect x="114" y="106" width="32" height="58" rx="8" fill="#00E5FF" stroke="#FFF" strokeWidth="2" />
        <rect x="174" y="34" width="32" height="54" rx="8" fill="#F43F5E" />
      </g>
    );
  }

  if (category === 'word-edu' || slug === 'word-search' || slug === 'crossword-puzzle') {
    const letters = ['G', 'O', 'O', '1', '0', '0'];
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={68 + i * 64} y="38" width="54" height="54" rx="10" fill={i === 1 ? accent : '#1E293B'} stroke={accent} strokeWidth="2" />
            <text x={95 + i * 64} y="74" textAnchor="middle" fill="#FFFFFF" fontFamily="Outfit, sans-serif" fontWeight="800" fontSize="26">
              {letters[(i + seed) % letters.length]}
            </text>
          </g>
        ))}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={68 + i * 64} y="104" width="54" height="54" rx="10" fill={i === 2 ? '#10B981' : '#16203C'} stroke="#38BDF8" strokeWidth="2" />
            <text x={95 + i * 64} y="140" textAnchor="middle" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="22">
              {letters[(i + 3) % letters.length]}
            </text>
          </g>
        ))}
      </g>
    );
  }

  if (category === 'adventure') {
    return (
      <g>
        <rect x="70" y="24" width="180" height="152" rx="12" fill="#0B132B" stroke={accent} strokeWidth="2" />
        <path d="M90 50 H170 V96 H120 V148 H230" fill="none" stroke="#00E5FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="90" cy="50" r="10" fill="#F59E0B" />
        <circle cx="230" cy="148" r="12" fill="#10B981" stroke="#FFF" strokeWidth="2" />
        <polygon points="206,52 222,68 206,84 190,68" fill="#F43F5E" />
      </g>
    );
  }

  if (category === 'skill') {
    return (
      <g>
        <circle cx="160" cy="100" r="64" fill="none" stroke={accent} strokeWidth="4" strokeOpacity="0.4" />
        <circle cx="160" cy="100" r="42" fill="none" stroke="#00E5FF" strokeWidth="4" />
        <circle cx="160" cy="100" r="18" fill="#F43F5E" />
        <line x1="80" y1="100" x2="240" y2="100" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1.5" />
        <line x1="160" y1="20" x2="160" y2="180" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1.5" />
      </g>
    );
  }

  if (category === 'strategy') {
    return (
      <g>
        <rect x="76" y="34" width="168" height="132" rx="14" fill="#101935" stroke={accent} strokeWidth="2" />
        <rect x="96" y="98" width="28" height="50" rx="4" fill="#3B82F6" />
        <rect x="134" y="72" width="28" height="76" rx="4" fill="#00E5FF" />
        <rect x="172" y="54" width="28" height="94" rx="4" fill={accent} />
        <circle cx="218" cy="56" r="14" fill="#F59E0B" />
      </g>
    );
  }

  if (category === 'casual') {
    return (
      <g>
        <rect x="92" y="138" width="136" height="22" rx="6" fill="#4C1D95" />
        <rect x="106" y="110" width="108" height="22" rx="6" fill="#7C3AED" />
        <rect x="120" y="82" width="80" height="22" rx="6" fill="#EC4899" />
        <rect x="134" y="54" width="52" height="22" rx="6" fill="#00E5FF" />
      </g>
    );
  }

  // Default Arcade & Action vector motif (spaceship / runner / blaster)
  return (
    <g>
      <line x1="30" y1="162" x2="290" y2="162" stroke={accent} strokeWidth="3" />
      <polygon points="160,40 202,126 160,108 118,126" fill={accent} stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="160" cy="84" r="10" fill="#090F24" stroke="#00E5FF" strokeWidth="2" />
      <circle cx="80" cy="64" r="7" fill="#F43F5E" />
      <circle cx="242" cy="78" r="9" fill="#F59E0B" />
    </g>
  );
}
