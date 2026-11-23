export type GameCategoryId = 'arcade' | 'puzzle' | 'strategy' | 'memory' | 'classic';

export interface GameCatalogItem {
  slug: string;
  id: string;
  title: string;
  category: GameCategoryId;
  shortDescription: string;
  fullDescription: string;
  isPopular: boolean;
  isNew: boolean;
  isTrending: boolean;
  estimatedMinutes: string;
  controlsType: string;
  accentHex: string;
  accentGradient: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  howToPlay: string[];
  desktopControls: string[];
  mobileControls: string[];
}

export const GAME_CATEGORIES: Array<{
  id: GameCategoryId;
  name: string;
  description: string;
  bannerPath: string;
}> = [
  {
    id: 'arcade',
    name: 'Arcade Action',
    description: 'Fast-paced reflex challenges built for smooth 60fps canvas play on touch and keyboard.',
    bannerPath: '/src/assets/images/category_arcade_action_1795426212420.jpg',
  },
  {
    id: 'puzzle',
    name: 'Logic & Puzzles',
    description: 'Brain-teasing number merges, spatial sliders, and deduction grids playable offline.',
    bannerPath: '/src/assets/images/category_puzzle_logic_1795426211989.jpg',
  },
  {
    id: 'strategy',
    name: 'Strategy & Board',
    description: 'Tactical matchups against intelligent algorithms or local two-player sessions.',
    bannerPath: '/src/assets/images/category_strategy_board_1795426212978.jpg',
  },
  {
    id: 'memory',
    name: 'Memory & Focus',
    description: 'Pattern recall and visual speed drills with scalable board sizes.',
    bannerPath: '/src/assets/images/category_puzzle_logic_1795426211989.jpg',
  },
  {
    id: 'classic',
    name: 'Timeless Classics',
    description: 'Enduring retro mechanics re-engineered with responsive controls and clean visuals.',
    bannerPath: '/src/assets/images/category_arcade_action_1795426212420.jpg',
  },
];

export const GAMES_CATALOG: GameCatalogItem[] = [
  {
    slug: 'snake',
    id: 'snake',
    title: 'Snake Arcade',
    category: 'arcade',
    shortDescription: 'Guide the glowing serpent, collect energy orbs, and outgrow the grid without crashing.',
    fullDescription:
      'A precision-tuned HTML5 Snake game with smooth tick interpolation, progressive speed levels, swipe gestures, on-screen mobile D-pad support, and local high-score tracking.',
    isPopular: true,
    isNew: false,
    isTrending: true,
    estimatedMinutes: '2–5 min',
    controlsType: 'Swipe / Arrows',
    accentHex: '#10B981',
    accentGradient: 'from-emerald-500 to-teal-600',
    seoTitle: 'Play Snake Game Online Free – No Download | GOO GAME PLAY',
    seoDescription:
      'Play the classic Snake arcade game online for free in your browser. Smooth touch swipe and keyboard controls, high scores, and instant mobile play.',
    keywords: ['Play Snake game online for free', 'HTML5 Snake game', 'Mobile Snake browser game'],
    howToPlay: [
      'Steer the snake toward the glowing energy food to grow longer and score points.',
      'Each orb collected increases your score and gently accelerates movement speed.',
      'Avoid hitting the outer arena walls or colliding with your own tail.',
    ],
    desktopControls: ['Arrow Keys or WASD to steer', 'Space or P to pause/resume', 'R to restart'],
    mobileControls: ['Swipe in any direction on the board', 'Use optional on-screen D-pad buttons'],
  },
  {
    slug: '2048',
    id: '2048',
    title: '2048 Neon Merge',
    category: 'puzzle',
    shortDescription: 'Slide and merge matching numbered tiles on a 4x4 grid to reach the 2048 tile.',
    fullDescription:
      'Combine identical tiles in strategic directions without locking the board. Features undo history, smooth animations, swipe gestures, and continue-after-2048 endless mode.',
    isPopular: true,
    isNew: false,
    isTrending: true,
    estimatedMinutes: '3–8 min',
    controlsType: 'Swipe / Arrows',
    accentHex: '#7C3AED',
    accentGradient: 'from-violet-600 to-indigo-600',
    seoTitle: 'Play 2048 Puzzle Game Online in Browser | GOO GAME PLAY',
    seoDescription:
      'Play 2048 puzzle online free with swipe controls, undo support, and instant mobile performance. No app install required.',
    keywords: ['Play 2048 puzzle game in browser', '2048 mobile online', 'Number merge puzzle game'],
    howToPlay: [
      'Slide all tiles across the 4x4 board in one of four directions.',
      'When two tiles with the same number collide, they merge into a single tile of double value.',
      'Reach the 2048 tile to win, or keep playing to chase your personal high score.',
    ],
    desktopControls: ['Arrow Keys or WASD to slide tiles', 'Z or U to undo last move'],
    mobileControls: ['Swipe up, down, left, or right anywhere on the board', 'Tap Undo button to step back'],
  },
  {
    slug: 'tetris',
    id: 'tetris',
    title: 'Tetris Block Stacker',
    category: 'classic',
    shortDescription: 'Rotate falling geometric tetrominoes, clear horizontal lines, and survive rising speeds.',
    fullDescription:
      'Built with a fair 7-bag piece randomizer, ghost piece landing preview, hard drop, wall-kick rotation, level progression, and responsive touch arcade controls.',
    isPopular: true,
    isNew: false,
    isTrending: true,
    estimatedMinutes: '3–10 min',
    controlsType: 'Tap / Keys',
    accentHex: '#3B82F6',
    accentGradient: 'from-blue-500 to-cyan-600',
    seoTitle: 'Play Tetris Block Stacker Online Free | GOO GAME PLAY',
    seoDescription:
      'Stack falling blocks and clear lines in this responsive HTML5 Tetris-style browser game. Built for both mobile touch controls and desktop keyboards.',
    keywords: ['Free browser Tetris game', 'Block puzzle online', 'Mobile falling block game'],
    howToPlay: [
      'Move and rotate falling tetromino shapes to fit neatly into the bottom rows.',
      'Complete full horizontal rows with no gaps to clear lines and earn combo points.',
      'Clear 10 lines per level to advance speed; prevent the stack from reaching the top.',
    ],
    desktopControls: [
      'Left/Right Arrows or A/D to move · Up or E to rotate',
      'Down soft drop · Space hard drop · C or Shift to Hold piece',
    ],
    mobileControls: [
      'Multi-touch Move, Soft Drop, Hold, Rotate & Hard Drop buttons',
      'Tap board to rotate · Swipe Up to Hold · Swipe Down to Drop',
    ],
  },
  {
    slug: 'flappy-bird',
    id: 'flappy-bird',
    title: 'Sky Hopper',
    category: 'arcade',
    shortDescription: 'Time every tap to glide through illuminated sky gates without clipping a barrier.',
    fullDescription:
      'Original physics-driven arcade flyer using delta-time gravity simulation, crisp geometric visuals, instant zero-latency tap input, and personal best tracking.',
    isPopular: true,
    isNew: true,
    isTrending: true,
    estimatedMinutes: '1–3 min',
    controlsType: 'Tap / Space',
    accentHex: '#06B6D4',
    accentGradient: 'from-cyan-500 to-blue-600',
    seoTitle: 'Play Sky Hopper Arcade Flyer Online Free | GOO GAME PLAY',
    seoDescription:
      'Tap to fly through endless obstacles in Sky Hopper, a fast Flappy-style HTML5 arcade game playable instantly on Android, iPhone, and desktop.',
    keywords: ['Flappy bird style browser game', 'Tap arcade game online', 'One-tap mobile browser game'],
    howToPlay: [
      'Tap the screen or press Space to give your glider an upward boost.',
      'Gravity pulls you down continuously—time rhythmic taps to stay centered.',
      'Pass safely between each pair of vertical barriers to score points.',
    ],
    desktopControls: ['Space, Up Arrow, or Left Click to flap', 'P to pause'],
    mobileControls: ['Tap anywhere inside the flight arena to flap'],
  },
  {
    slug: 'tic-tac-toe',
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe Pro',
    category: 'strategy',
    shortDescription: 'Challenge an unbeatable Minimax AI or play pass-and-play matches with a friend.',
    fullDescription:
      'Classic 3x3 strategy with three selectable AI tiers (Casual, Tactical, and Unbeatable Minimax), local two-player mode, winning line highlights, and session tally.',
    isPopular: false,
    isNew: false,
    isTrending: false,
    estimatedMinutes: '1–2 min',
    controlsType: 'Tap / Click',
    accentHex: '#8B5CF6',
    accentGradient: 'from-purple-500 to-violet-700',
    seoTitle: 'Play Tic Tac Toe Online Free vs AI or 2 Player | GOO GAME PLAY',
    seoDescription:
      'Play Tic Tac Toe online against a real Minimax AI with 3 difficulty modes or challenge a friend locally in 2-player mode.',
    keywords: ['Play Tic Tac Toe online', 'Tic Tac Toe vs AI', '2 player browser board game'],
    howToPlay: [
      'Choose 1-Player vs AI (Easy, Medium, or Hard) or 2-Player Local mode.',
      'Take turns placing X and O marks inside the 3x3 grid.',
      'Align three marks horizontally, vertically, or diagonally to win the round.',
    ],
    desktopControls: ['Click any open grid cell', 'Number keys 1–9 also place marks'],
    mobileControls: ['Tap any open square to place your mark'],
  },
  {
    slug: 'memory-match',
    id: 'memory-match',
    title: 'Memory Matrix',
    category: 'memory',
    shortDescription: 'Flip luminous symbol cards, memorize positions, and clear the deck in minimal moves.',
    fullDescription:
      'A crisp visual recall game featuring Fisher-Yates shuffling, three grid difficulties (4x3, 4x4, and 6x4), move efficiency counters, and stopwatch timing.',
    isPopular: false,
    isNew: true,
    isTrending: false,
    estimatedMinutes: '2–4 min',
    controlsType: 'Tap / Click',
    accentHex: '#EC4899',
    accentGradient: 'from-pink-500 to-rose-600',
    seoTitle: 'Play Memory Card Match Game Online Free | GOO GAME PLAY',
    seoDescription:
      'Train your focus with Memory Matrix, a free online card matching puzzle with Easy, Medium, and Hard grids for mobile and PC.',
    keywords: ['Memory card match game online', 'Brain training browser game', 'Free card flip puzzle'],
    howToPlay: [
      'Tap two face-down cards to reveal their geometric emblems.',
      'Matching pairs remain revealed; mismatched cards flip back after a brief glance.',
      'Match every pair on the board using as few moves and seconds as possible.',
    ],
    desktopControls: ['Click cards to flip', 'Arrow keys / WASD + Space or Enter for keyboard & gamepad play'],
    mobileControls: ['Tap any covered card to reveal it'],
  },
  {
    slug: 'minesweeper',
    id: 'minesweeper',
    title: 'Mine Sweeper',
    category: 'strategy',
    shortDescription: 'Deduce hidden mine coordinates from numeric clues and flag every hazard safely.',
    fullDescription:
      'Authentic logic minesweeper with guaranteed safe first click, recursive flood-fill clearing, mobile Flag Mode toggle, right-click flagging, and three grid presets.',
    isPopular: true,
    isNew: false,
    isTrending: false,
    estimatedMinutes: '3–10 min',
    controlsType: 'Tap / Right-Click',
    accentHex: '#F59E0B',
    accentGradient: 'from-amber-500 to-orange-600',
    seoTitle: 'Play Minesweeper Online Free – Mobile & Desktop | GOO GAME PLAY',
    seoDescription:
      'Solve classic Minesweeper logic boards online with safe first clicks, flag toggle for touchscreens, and Beginner, Intermediate, and Expert levels.',
    keywords: ['Play Minesweeper online free', 'Mobile Minesweeper HTML5', 'Logic puzzle browser game'],
    howToPlay: [
      'Tap any tile to start—your very first click is always guaranteed safe.',
      'Numbers show how many mines touch that square across its 8 neighbors.',
      'Switch to Flag Mode (or right-click) to mark suspected mines and clear all safe tiles to win.',
    ],
    desktopControls: [
      'Left-click to reveal · Right-click to flag',
      'Arrow keys / WASD + Space to reveal · F or Gamepad X to flag',
    ],
    mobileControls: [
      'Tap to reveal · Long-press (420ms) on a tile to toggle Flag',
      'Or use the Dig / Flag Mode button for one-tap flagging',
    ],
  },
  {
    slug: 'breakout',
    id: 'breakout',
    title: 'Brick Breaker',
    category: 'arcade',
    shortDescription: 'Deflect the energy ball with your paddle and shatter multi-layered brick walls.',
    fullDescription:
      'Responsive HTML5 Breakout arcade featuring angle-accurate paddle rebounds, multi-hit armored bricks across progressive levels, combo scoring, and smooth touch drag.',
    isPopular: false,
    isNew: true,
    isTrending: true,
    estimatedMinutes: '2–6 min',
    controlsType: 'Drag / Arrows',
    accentHex: '#6366F1',
    accentGradient: 'from-indigo-500 to-blue-700',
    seoTitle: 'Play Brick Breaker Breakout Game Online Free | GOO GAME PLAY',
    seoDescription:
      'Bounce the ball and smash multi-level brick formations in this free HTML5 Breakout arcade game. Smooth mouse, keyboard, and touch drag controls.',
    keywords: ['Breakout game online free', 'Brick breaker browser game', 'Classic arcade paddle game'],
    howToPlay: [
      'Slide your paddle left and right to keep the ball in play.',
      'Hit bricks to shatter them—armored bricks require multiple hits in higher levels.',
      'Clear every brick on screen to advance to the next level before losing all 3 lives.',
    ],
    desktopControls: [
      'Mouse drag/pointer or Left/Right Arrows / A & D',
      'Space to launch · Gamepad analog stick supported',
    ],
    mobileControls: [
      'Drag finger horizontally anywhere across the playfield to steer paddle',
      'Optional Left/Right virtual directional buttons below board',
    ],
  },
  {
    slug: 'sudoku',
    id: 'sudoku',
    title: 'Sudoku Master',
    category: 'puzzle',
    shortDescription: 'Fill every row, column, and 3x3 box with digits 1–9 using logic and pencil notes.',
    fullDescription:
      'Generates fresh valid Sudoku boards across Easy, Medium, and Hard difficulties with real-time conflict checking, pencil notes mode, undo, and smart cell highlighting.',
    isPopular: true,
    isNew: false,
    isTrending: false,
    estimatedMinutes: '5–15 min',
    controlsType: 'Tap / Number Keys',
    accentHex: '#0EA5E9',
    accentGradient: 'from-sky-500 to-indigo-600',
    seoTitle: 'Play Sudoku Online Free – Easy, Medium & Hard | GOO GAME PLAY',
    seoDescription:
      'Play freshly generated Sudoku puzzles online in your browser with pencil notes, error checking, undo, and three difficulty modes.',
    keywords: ['Play Sudoku online free', 'Mobile Sudoku no download', 'Sudoku puzzle with notes'],
    howToPlay: [
      'Select an empty cell and choose a digit from 1 to 9.',
      'Every row, column, and 3x3 sub-grid must contain digits 1–9 without repetition.',
      'Use Notes Mode to jot down candidate numbers before committing your final digit.',
    ],
    desktopControls: [
      'Arrow keys / WASD or click to select cell · Press 1–9',
      'Backspace/Delete to erase · N for Notes mode',
    ],
    mobileControls: ['Tap a cell, then tap digits 1–9 on the touch number pad', 'Tap Notes or Erase below board'],
  },
  {
    slug: '15-puzzle',
    id: '15-puzzle',
    title: '15 Slide Puzzle',
    category: 'classic',
    shortDescription: 'Slide numbered tiles into ascending order 1 through 15 using the single open slot.',
    fullDescription:
      'Mathematically verified solvable 4x4 sliding puzzle generator with multi-tile row/column sliding, swipe & arrow-key support, move counter, and completion timer.',
    isPopular: false,
    isNew: false,
    isTrending: false,
    estimatedMinutes: '2–5 min',
    controlsType: 'Tap / Arrows',
    accentHex: '#14B8A6',
    accentGradient: 'from-teal-500 to-emerald-600',
    seoTitle: 'Play 15 Puzzle Sliding Game Online Free | GOO GAME PLAY',
    seoDescription:
      'Play the classic 15 Slide Puzzle online with guaranteed solvable boards, timer, and move counter on mobile and desktop.',
    keywords: ['15 puzzle online free', 'Sliding number puzzle game', 'Classic 4x4 tile puzzle'],
    howToPlay: [
      'Tap or slide any tile adjacent to the empty space to move it.',
      'You can also tap any tile in the same row or column as the empty slot to shift multiple tiles.',
      'Arrange tiles sequentially from 1 to 15 with the empty slot at the bottom-right corner.',
    ],
    desktopControls: ['Click tiles or use Arrow Keys to slide', 'R to shuffle a fresh solvable board'],
    mobileControls: ['Tap a tile or swipe toward the empty slot'],
  },
];

export function getGameBySlug(slug: string | undefined): GameCatalogItem | undefined {
  return GAMES_CATALOG.find((g) => g.slug === slug);
}
