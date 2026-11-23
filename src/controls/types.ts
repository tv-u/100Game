export type InputModality = 'touch' | 'keyboard' | 'mouse' | 'gamepad';

export type LogicalAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'primary'
  | 'secondary'
  | 'hold'
  | 'undo'
  | 'flag'
  | 'notes'
  | 'erase'
  | 'pause'
  | 'restart';

export type Handedness = 'right' | 'left';
export type MobileControlStyle = 'dpad' | 'joystick';
export type ButtonSizePreset = 'compact' | 'standard' | 'large';

export interface ControlSettings {
  handedness: Handedness;
  mobileControlStyle: MobileControlStyle;
  buttonSize: ButtonSizePreset;
  buttonOpacity: number; // 0.35 to 1.0
  highContrast: boolean;
  reducedMotion: boolean;
  showVirtualButtonsOnBreakout: boolean;
  keyBindings: Record<LogicalAction, string[]>;
  gamepadBindings: Record<LogicalAction, number[]>;
}

export const ACTION_LABELS: Record<LogicalAction, string> = {
  up: 'Move / Navigate Up',
  down: 'Move / Navigate Down',
  left: 'Move / Navigate Left',
  right: 'Move / Navigate Right',
  primary: 'Primary Action (Flap / Drop / Select)',
  secondary: 'Secondary Action (Rotate / Confirm)',
  hold: 'Hold Piece (Tetris)',
  undo: 'Undo Move',
  flag: 'Flag Tile (Minesweeper)',
  notes: 'Toggle Notes (Sudoku)',
  erase: 'Erase Cell (Sudoku)',
  pause: 'Pause / Resume',
  restart: 'Quick Restart',
};

export const GAMEPAD_BUTTON_NAMES: Record<number, string> = {
  0: 'A / Cross',
  1: 'B / Circle',
  2: 'X / Square',
  3: 'Y / Triangle',
  4: 'LB / L1',
  5: 'RB / R1',
  6: 'LT / L2',
  7: 'RT / R2',
  8: 'Back / Select',
  9: 'Start / Options',
  12: 'D-Pad Up',
  13: 'D-Pad Down',
  14: 'D-Pad Left',
  15: 'D-Pad Right',
};

export const DEFAULT_KEY_BINDINGS: Record<LogicalAction, string[]> = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  primary: ['Space', 'Enter'],
  secondary: ['KeyE', 'ShiftRight'],
  hold: ['KeyC', 'ShiftLeft'],
  undo: ['KeyZ', 'KeyU'],
  flag: ['KeyF'],
  notes: ['KeyN'],
  erase: ['Backspace', 'Delete'],
  pause: ['KeyP', 'Escape'],
  restart: ['KeyR'],
};

export const DEFAULT_GAMEPAD_BINDINGS: Record<LogicalAction, number[]> = {
  up: [12],
  down: [13],
  left: [14],
  right: [15],
  primary: [0],
  secondary: [1, 3],
  hold: [2, 4],
  undo: [3],
  flag: [2],
  notes: [3],
  erase: [1],
  pause: [9],
  restart: [8],
};

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  handedness: 'right',
  mobileControlStyle: 'dpad',
  buttonSize: 'standard',
  buttonOpacity: 0.9,
  highContrast: false,
  reducedMotion: false,
  showVirtualButtonsOnBreakout: true,
  keyBindings: DEFAULT_KEY_BINDINGS,
  gamepadBindings: DEFAULT_GAMEPAD_BINDINGS,
};

export function getTouchButtonPx(size: ButtonSizePreset): number {
  if (size === 'compact') return 44;
  if (size === 'large') return 58;
  return 50; // standard >= 48px
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code === 'Space') return 'Space';
  return code;
}
