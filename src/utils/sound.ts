let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(
  enabled: boolean,
  frequency: number,
  duration = 0.08,
  type: OscillatorType = 'sine',
  volume = 0.08
): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context errors on restricted browsers
  }
}

export const sfx = {
  click: (on: boolean) => playTone(on, 520, 0.04, 'triangle', 0.05),
  eat: (on: boolean) => playTone(on, 660, 0.09, 'sine', 0.08),
  merge: (on: boolean) => playTone(on, 480, 0.08, 'triangle', 0.07),
  bounce: (on: boolean) => playTone(on, 360, 0.05, 'square', 0.04),
  clear: (on: boolean) => {
    playTone(on, 523.25, 0.09, 'triangle', 0.08);
    setTimeout(() => playTone(on, 783.99, 0.14, 'triangle', 0.08), 60);
  },
  win: (on: boolean) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => playTone(on, freq, 0.14, 'triangle', 0.08), i * 80);
    });
  },
  gameOver: (on: boolean) => {
    playTone(on, 240, 0.15, 'sawtooth', 0.06);
    setTimeout(() => playTone(on, 160, 0.24, 'sawtooth', 0.06), 130);
  },
};

export function triggerHaptic(enabled: boolean, ms: number | number[] = 14): void {
  if (!enabled || typeof navigator === 'undefined') return;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore unsupported vibration APIs
  }
}
