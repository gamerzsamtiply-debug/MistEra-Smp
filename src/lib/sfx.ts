// Soft, short interface sounds made with the Web Audio API (no audio files to download).
// Quiet on purpose: every sound is a gentle sine/triangle tone, well under 0.1 s - 0.4 s, at low volume.
let ctx: AudioContext | null = null;
const KEY = 'mistera-sfx';

export const sfxEnabled = (): boolean => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
export const setSfxEnabled = (on: boolean): void => { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ } };

function audio(): AudioContext | null {
  if (!sfxEnabled()) return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** One soft note: fades in/out quickly so it never clicks. */
function note(freq: number, start: number, dur: number, vol = 0.045, type: OscillatorType = 'sine', glideTo?: number) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** Navigation / generic tap. */
  tap: () => note(520, 0, 0.09, 0.035, 'sine', 700),
  /** Soft "pop" for likes and toggles. */
  pop: () => { note(420, 0, 0.12, 0.05, 'sine', 820); },
  /** Page change whoosh. */
  page: () => note(300, 0, 0.16, 0.025, 'triangle', 560),
  /** Something was saved / sent. */
  success: () => { note(660, 0, 0.14, 0.04); note(880, 0.09, 0.2, 0.04); },
  /** Account created / welcome. */
  welcome: () => { note(523, 0, 0.16, 0.04); note(659, 0.1, 0.16, 0.04); note(784, 0.2, 0.28, 0.04); },
  /** Something went wrong (gentle, not harsh). */
  error: () => { note(330, 0, 0.14, 0.035, 'triangle'); note(262, 0.1, 0.2, 0.035, 'triangle'); },
  /** Password strength 0..3 (Weak, Medium, Strong, Extreme): the pitch climbs with strength. */
  strength: (level: number) => {
    const base = [262, 330, 392, 523][Math.max(0, Math.min(3, level))];
    note(base, 0, 0.12, 0.04, 'sine', base * 1.25);
    if (level === 3) note(base * 1.5, 0.1, 0.22, 0.035);
  },
  /** One tick while typing a password character. */
  key: () => note(740, 0, 0.035, 0.012, 'sine'),
};
