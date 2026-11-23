import React from 'react';

export const GameArtwork: React.FC<{ slug: string; className?: string }> = ({ slug, className = '' }) => {
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
          <g stroke="#10B981" strokeOpacity="0.12" strokeWidth="1">
            {[40, 80, 120, 160, 200, 240, 280].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="200" />
            ))}
            {[40, 80, 120, 160].map((y) => (
              <line key={y} x1="0" y1={y} x2="320" y2={y} />
            ))}
          </g>
          <path
            d="M60 140 H140 V100 H200 V60 H220"
            fill="none"
            stroke="#10B981"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
          <rect x="76" y="16" width="168" height="168" rx="14" fill="#1C1838" stroke="#7C3AED" strokeOpacity="0.3" />
          {[
            { x: 88, y: 28, c: '#312E81', t: '128', tc: '#E0E7FF' },
            { x: 164, y: 28, c: '#4F46E5', t: '512', tc: '#FFFFFF' },
            { x: 88, y: 104, c: '#6D28D9', t: '1024', tc: '#FFFFFF' },
            { x: 164, y: 104, c: '#7C3AED', t: '2048', tc: '#FFFFFF' },
          ].map((tile, i) => (
            <g key={i}>
              <rect x={tile.x} y={tile.y} width="68" height="68" rx="10" fill={tile.c} />
              <text
                x={tile.x + 34}
                y={tile.y + 42}
                textAnchor="middle"
                fill={tile.tc}
                fontFamily="Outfit, sans-serif"
                fontWeight="700"
                fontSize={tile.t.length > 3 ? '20' : '22'}
              >
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
          <rect x="92" y="12" width="136" height="176" rx="8" fill="#111C38" stroke="#3B82F6" strokeOpacity="0.35" />
          {/* T-piece */}
          <g fill="#8B5CF6">
            <rect x="136" y="34" width="22" height="22" rx="4" />
            <rect x="114" y="56" width="22" height="22" rx="4" />
            <rect x="136" y="56" width="22" height="22" rx="4" />
            <rect x="158" y="56" width="22" height="22" rx="4" />
          </g>
          {/* Bottom stacked blocks */}
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
          <defs>
            <linearGradient id="sky-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#08203E" />
              <stop offset="100%" stopColor="#132A4A" />
            </linearGradient>
          </defs>
          <rect width="320" height="200" fill="url(#sky-bg)" />
          <rect x="180" y="0" width="38" height="62" rx="4" fill="#06B6D4" fillOpacity="0.85" />
          <rect x="180" y="132" width="38" height="68" rx="4" fill="#06B6D4" fillOpacity="0.85" />
          <rect x="256" y="0" width="38" height="90" rx="4" fill="#3B82F6" fillOpacity="0.7" />
          <rect x="256" y="156" width="38" height="44" rx="4" fill="#3B82F6" fillOpacity="0.7" />
          {/* Original Cyber Glider */}
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
          <g stroke="#4C1D95" strokeWidth="4" strokeLinecap="round">
            <line x1="130" y1="24" x2="130" y2="176" />
            <line x1="190" y1="24" x2="190" y2="176" />
            <line x1="82" y1="74" x2="238" y2="74" />
            <line x1="82" y1="126" x2="238" y2="126" />
          </g>
          {/* X marks */}
          <g stroke="#A78BFA" strokeWidth="6" strokeLinecap="round">
            <line x1="94" y1="36" x2="118" y2="60" />
            <line x1="118" y1="36" x2="94" y2="60" />
            <line x1="148" y1="88" x2="172" y2="112" />
            <line x1="172" y1="88" x2="148" y2="112" />
            <line x1="202" y1="140" x2="226" y2="164" />
            <line x1="226" y1="140" x2="202" y2="164" />
          </g>
          {/* O marks */}
          <circle cx="214" cy="48" r="13" fill="none" stroke="#38BDF8" strokeWidth="6" />
          <circle cx="106" cy="152" r="13" fill="none" stroke="#38BDF8" strokeWidth="6" />
          <line x1="88" y1="30" x2="232" y2="170" stroke="#C4B5FD" strokeWidth="3" strokeDasharray="6 6" />
        </svg>
      );
    case 'memory-match':
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#1F0F24" />
          {[
            { x: 68, y: 26, open: true, color: '#EC4899' },
            { x: 134, y: 26, open: false, color: '#334155' },
            { x: 200, y: 26, open: false, color: '#334155' },
            { x: 68, y: 106, open: false, color: '#334155' },
            { x: 134, y: 106, open: true, color: '#EC4899' },
            { x: 200, y: 106, open: false, color: '#334155' },
          ].map((c, i) => (
            <g key={i}>
              <rect
                x={c.x}
                y={c.y}
                width="54"
                height="68"
                rx="10"
                fill={c.open ? '#3B1239' : '#1E2438'}
                stroke={c.open ? '#EC4899' : '#475569'}
                strokeWidth="2"
              />
              {c.open ? (
                <polygon
                  points={`${c.x + 27},${c.y + 18} ${c.x + 41},${c.y + 34} ${c.x + 27},${c.y + 50} ${c.x + 13},${c.y + 34}`}
                  fill="#F472B6"
                />
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
                  <rect
                    x={x}
                    y={y}
                    width="34"
                    height="34"
                    rx="6"
                    fill={revealed ? '#1E293B' : '#334155'}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  {revealed && (
                    <text
                      x={x + 17}
                      y={y + 23}
                      textAnchor="middle"
                      fill={col === 1 ? '#38BDF8' : '#34D399'}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="700"
                      fontSize="16"
                    >
                      {col === 2 || (row === 1 && col === 1) ? '2' : '1'}
                    </text>
                  )}
                  {flagged && (
                    <path
                      d={`M${x + 12} ${y + 26} V${y + 9} L${x + 24} ${y + 14} L${x + 12} ${y + 19}`}
                      fill="#F59E0B"
                      stroke="#F59E0B"
                      strokeWidth="2"
                    />
                  )}
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
          {[
            { y: 26, c: '#F43F5E' },
            { y: 48, c: '#F59E0B' },
            { y: 70, c: '#3B82F6' },
          ].map((row, ri) =>
            [0, 1, 2, 3, 4].map((ci) =>
              ri === 2 && ci === 2 ? null : (
                <rect key={`${ri}-${ci}`} x={38 + ci * 50} y={row.y} width="44" height="14" rx="4" fill={row.c} />
              )
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
          <rect x="80" y="20" width="160" height="160" rx="8" fill="#13233A" stroke="#0EA5E9" strokeOpacity="0.5" strokeWidth="2" />
          <line x1="133" y1="20" x2="133" y2="180" stroke="#0EA5E9" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="186" y1="20" x2="186" y2="180" stroke="#0EA5E9" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="80" y1="73" x2="240" y2="73" stroke="#0EA5E9" strokeOpacity="0.45" strokeWidth="2" />
          <line x1="80" y1="126" x2="240" y2="126" stroke="#0EA5E9" strokeOpacity="0.45" strokeWidth="2" />
          <rect x="135" y="75" width="49" height="49" fill="#0EA5E9" fillOpacity="0.2" />
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
    default:
      return (
        <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} aria-hidden="true">
          <rect width="320" height="200" fill="#0A1D1D" />
          <rect x="86" y="20" width="148" height="148" rx="12" fill="#112A2A" stroke="#14B8A6" strokeOpacity="0.4" />
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
  }
};
