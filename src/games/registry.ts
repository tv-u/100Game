import type React from 'react';
import { lazy } from 'react';
import type { GameControlContext } from '../components/GameShell';

export type PlayableGameProps = {
  ctx: GameControlContext;
  onScoreChange: (score: number) => void;
  gameSlug?: string;
};

export type LazyGameComponent = React.LazyExoticComponent<React.ComponentType<PlayableGameProps>>;

const SnakeLazy = lazy(() => import('./SnakeGame')) as LazyGameComponent;
const Game2048Lazy = lazy(() => import('./Game2048')) as LazyGameComponent;
const TetrisLazy = lazy(() => import('./TetrisGame')) as LazyGameComponent;
const FlappyLazy = lazy(() => import('./FlappyGame')) as LazyGameComponent;
const TicTacToeLazy = lazy(() => import('./TicTacToeGame')) as LazyGameComponent;
const MemoryLazy = lazy(() => import('./MemoryGame')) as LazyGameComponent;
const MinesweeperLazy = lazy(() => import('./MinesweeperGame')) as LazyGameComponent;
const BreakoutLazy = lazy(() => import('./BreakoutGame')) as LazyGameComponent;
const SudokuLazy = lazy(() => import('./SudokuGame')) as LazyGameComponent;
const FifteenPuzzleLazy = lazy(() => import('./FifteenPuzzleGame')) as LazyGameComponent;

const RunnerLazy = lazy(() => import('./arcade/RunnerEngine')) as LazyGameComponent;
const ShooterLazy = lazy(() => import('./arcade/ShooterEngine')) as LazyGameComponent;
const VerticalActionLazy = lazy(() => import('./arcade/VerticalActionEngine')) as LazyGameComponent;
const BrickCrusherLazy = lazy(() => import('./arcade/BrickCrusherGame')) as LazyGameComponent;
const StickmanFighterLazy = lazy(() => import('./arcade/StickmanFighterGame')) as LazyGameComponent;

const BlockBlastLazy = lazy(() => import('./puzzle/BlockBlastGame')) as LazyGameComponent;
const BubbleShooterLazy = lazy(() => import('./puzzle/BubbleShooterGame')) as LazyGameComponent;
const Match3Lazy = lazy(() => import('./puzzle/Match3Game')) as LazyGameComponent;
const MahjongLazy = lazy(() => import('./puzzle/MahjongGame')) as LazyGameComponent;
const LogicGridLazy = lazy(() => import('./puzzle/LogicGridPuzzleEngine')) as LazyGameComponent;
const WordPuzzleLazy = lazy(() => import('./puzzle/WordPuzzleEngine')) as LazyGameComponent;
const SortPuzzleLazy = lazy(() => import('./puzzle/SortPuzzleEngine')) as LazyGameComponent;

const CheckersReversiLazy = lazy(() => import('./board/CheckersReversiEngine')) as LazyGameComponent;
const ChessLazy = lazy(() => import('./board/ChessGame')) as LazyGameComponent;
const ClassicTableBoardLazy = lazy(() => import('./board/ClassicTableBoardEngine')) as LazyGameComponent;
const ConnectFourNimDotsLazy = lazy(() => import('./board/ConnectFourNimDotsEngine')) as LazyGameComponent;

const RacingLazy = lazy(() => import('./sports/RacingEngine')) as LazyGameComponent;
const SportsPhysicsLazy = lazy(() => import('./sports/SportsPhysicsEngine')) as LazyGameComponent;

const FruitMergeLazy = lazy(() => import('./casual/FruitMergeGame')) as LazyGameComponent;
const FallingSandLazy = lazy(() => import('./casual/FallingSandGame')) as LazyGameComponent;
const PhysicsCasualLazy = lazy(() => import('./casual/PhysicsCasualEngine')) as LazyGameComponent;

const TowerDefenseLazy = lazy(() => import('./strategy/TowerDefenseGame')) as LazyGameComponent;
const BuilderTycoonLazy = lazy(() => import('./strategy/BuilderTycoonEngine')) as LazyGameComponent;
const TacticalSimLazy = lazy(() => import('./strategy/TacticalSimEngine')) as LazyGameComponent;

const WordActionLazy = lazy(() => import('./word/WordActionEngine')) as LazyGameComponent;
const QuizMathLazy = lazy(() => import('./word/QuizMathEngine')) as LazyGameComponent;

const AdventureGridLazy = lazy(() => import('./adventure/AdventureGridEngine')) as LazyGameComponent;
const AdventurePhysicsLazy = lazy(() => import('./adventure/AdventurePhysicsEngine')) as LazyGameComponent;

const ReflexAndRhythmLazy = lazy(() => import('./skill/ReflexAndRhythmEngine')) as LazyGameComponent;
const MultiplayerArenaLazy = lazy(() => import('./skill/MultiplayerArenaEngine')) as LazyGameComponent;

export const GAME_COMPONENT_MAP: Record<string, LazyGameComponent> = {
  // 01–10 Core Classics
  snake: SnakeLazy,
  '2048': Game2048Lazy,
  tetris: TetrisLazy,
  'flappy-bird': FlappyLazy,
  'tic-tac-toe': TicTacToeLazy,
  'memory-match': MemoryLazy,
  minesweeper: MinesweeperLazy,
  breakout: BreakoutLazy,
  sudoku: SudokuLazy,
  '15-puzzle': FifteenPuzzleLazy,

  // 11–20 Arcade & Action
  'endless-runner': RunnerLazy,
  'ninja-jump': RunnerLazy,
  'space-shooter': ShooterLazy,
  'asteroid-blaster': ShooterLazy,
  'tank-battle': ShooterLazy,
  'zombie-survival': ShooterLazy,
  'doodle-jump': VerticalActionLazy,
  'helicopter-rescue': VerticalActionLazy,
  'brick-crusher': BrickCrusherLazy,
  'stickman-fighter': StickmanFighterLazy,

  // 21–30 Puzzle
  'block-blast': BlockBlastLazy,
  'bubble-shooter': BubbleShooterLazy,
  'match-3': Match3Lazy,
  'mahjong-solitaire': MahjongLazy,
  'jigsaw-puzzle': LogicGridLazy,
  nonogram: LogicGridLazy,
  'lights-out': LogicGridLazy,
  'word-search': WordPuzzleLazy,
  'crossword-puzzle': WordPuzzleLazy,
  'color-sort': SortPuzzleLazy,

  // 31–40 Board Games
  checkers: CheckersReversiLazy,
  reversi: CheckersReversiLazy,
  chess: ChessLazy,
  ludo: ClassicTableBoardLazy,
  battleship: ClassicTableBoardLazy,
  mancala: ClassicTableBoardLazy,
  'chinese-checkers': ClassicTableBoardLazy,
  'connect-four': ConnectFourNimDotsLazy,
  'dots-and-boxes': ConnectFourNimDotsLazy,
  'nim-game': ConnectFourNimDotsLazy,

  // 41–50 Racing & Sports
  '2d-car-racing': RacingLazy,
  'traffic-racer': RacingLazy,
  'drift-challenge': RacingLazy,
  'bike-racing': RacingLazy,
  'mini-golf': SportsPhysicsLazy,
  'basketball-shots': SportsPhysicsLazy,
  'penalty-shootout': SportsPhysicsLazy,
  'table-tennis': SportsPhysicsLazy,
  bowling: SportsPhysicsLazy,
  'pool-billiards': SportsPhysicsLazy,

  // 51–60 Casual
  'fruit-merge': FruitMergeLazy,
  'falling-sand': FallingSandLazy,
  'bubble-pop': PhysicsCasualLazy,
  'rope-cut': PhysicsCasualLazy,
  'physics-drop': PhysicsCasualLazy,
  'paper-plane': PhysicsCasualLazy,
  'stack-tower': PhysicsCasualLazy,
  'helix-jump': PhysicsCasualLazy,
  'ball-sort': SortPuzzleLazy,
  'water-sort': SortPuzzleLazy,

  // 61–70 Strategy
  'tower-defense': TowerDefenseLazy,
  'idle-clicker': BuilderTycoonLazy,
  'cookie-factory': BuilderTycoonLazy,
  'farm-builder': BuilderTycoonLazy,
  'city-builder': BuilderTycoonLazy,
  'resource-manager': BuilderTycoonLazy,
  'dungeon-crawler': TacticalSimLazy,
  'turn-based-battle': TacticalSimLazy,
  'tower-builder': TacticalSimLazy,
  'traffic-management': TacticalSimLazy,

  // 71–80 Word & Educational
  'word-guess': WordActionLazy,
  hangman: WordActionLazy,
  'anagram-challenge': WordActionLazy,
  'typing-speed': WordActionLazy,
  'memory-numbers': WordActionLazy,
  'math-challenge': QuizMathLazy,
  'mental-arithmetic': QuizMathLazy,
  'spelling-challenge': QuizMathLazy,
  'geography-quiz': QuizMathLazy,
  'general-knowledge': QuizMathLazy,

  // 81–90 Adventure
  'maze-escape': AdventureGridLazy,
  'dungeon-escape': AdventureGridLazy,
  'treasure-hunt': AdventureGridLazy,
  'escape-room': AdventureGridLazy,
  'laser-reflection': AdventureGridLazy,
  'portal-puzzle': AdventureGridLazy,
  'pixel-platformer': AdventurePhysicsLazy,
  'gravity-switch': AdventurePhysicsLazy,
  'hook-swing': AdventurePhysicsLazy,
  'bridge-builder': AdventurePhysicsLazy,

  // 91–100 Skill & Competitive
  'reaction-time': ReflexAndRhythmLazy,
  'rock-paper-scissors': ReflexAndRhythmLazy,
  'quick-draw': ReflexAndRhythmLazy,
  'speed-tap': ReflexAndRhythmLazy,
  'target-shooting': ReflexAndRhythmLazy,
  'rhythm-tap': ReflexAndRhythmLazy,
  'reflex-runner': ReflexAndRhythmLazy,
  'air-hockey': MultiplayerArenaLazy,
  'tic-tac-toe-ultimate': MultiplayerArenaLazy,
  'four-player-pong': MultiplayerArenaLazy,
};

export const REGISTERED_GAME_SLUGS = Object.keys(GAME_COMPONENT_MAP);
