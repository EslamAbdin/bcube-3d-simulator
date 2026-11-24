/* =========================================================================
   Procedural Web Audio API Tactile Synth (zero external audio files)
   Safely handles browser autoplay unlock and SSR/headless environments.
   ========================================================================= */

let sharedCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedCtx) {
    try {
      sharedCtx = new AudioCtx();
    } catch {
      return null;
    }
  }

  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {
      // Ignore autoplay lock errors before user interaction
    });
  }
  return sharedCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.03);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

/** Crisp mechanical snap for Slide Switch ON/OFF transitions. */
export function playSlideClick(isOn: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Bandpass-filtered mechanical noise click (~14ms)
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOn ? 2300 : 1700, now);
    filter.Q.setValueAtTime(2.4, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.11, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

    src.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.015);

    // Subtle body resonance transient
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isOn ? 920 : 700, now);
    osc.frequency.exponentialRampToValueAtTime(isOn ? 300 : 220, now + 0.022);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.09, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.024);
  } catch {
    // Ignore transient Web Audio errors in headless environments
  }
}

/** Soft tactile dome-switch pop for Pushbutton press, release, or latch toggle. */
export function playButtonSnap(pressed: boolean, isLatchToggle = false): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = isLatchToggle ? 'sine' : 'triangle';

    if (isLatchToggle) {
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.setValueAtTime(880, now + 0.018);
    } else if (pressed) {
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(230, now + 0.022);
    } else {
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.018);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isLatchToggle ? 0.042 : 0.022));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isLatchToggle ? 0.045 : 0.025));
  } catch {
    // Ignore transient Web Audio errors
  }
}
