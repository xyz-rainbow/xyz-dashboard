import { Howl, Howler } from 'howler';

type OutputChannel = 'stereo' | 'left' | 'right' | 'mono';

let soundEnabled = true;
let soundVolume = 65;
let outputChannel: OutputChannel = 'stereo';
let tapVariantIndex = 0;
let initialized = false;

let tapHowls: Howl[] = [];
let successHowl: Howl | null = null;
let errorHowl: Howl | null = null;
let openHowl: Howl | null = null;
let closeHowl: Howl | null = null;
let dragHowl: Howl | null = null;
let fallbackCtx: AudioContext | null = null;

function clampVolume(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function pcm16ToWavBase64(
  samples: Float32Array,
  sampleRate: number
): string {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function synthTone(
  frequencies: number[],
  durationSec: number,
  sampleRate = 44100
): Float32Array {
  const count = Math.max(1, Math.floor(durationSec * sampleRate));
  const out = new Float32Array(count);
  const attack = Math.max(1, Math.floor(0.01 * sampleRate));
  const release = Math.max(1, Math.floor(0.04 * sampleRate));
  const sustainStart = Math.max(attack, count - release);

  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > sustainStart) env = 1 - (i - sustainStart) / release;
    const harmonic = frequencies.reduce((acc, f, idx) => {
      const amp = idx === 0 ? 1 : 0.6;
      return acc + Math.sin(2 * Math.PI * f * t) * amp;
    }, 0);
    out[i] = (harmonic / frequencies.length) * env * 0.85;
  }
  return out;
}

function ensureInitialized(): void {
  if (initialized) return;

  const tapVariants = [
    [110],
    [130.81, 110],
    [164.81],
    [110, 164.81],
    [146.83],
    [98, 130.81],
  ];

  tapHowls = tapVariants.map((freqs) => {
    const src = pcm16ToWavBase64(synthTone(freqs, 0.11), 44100);
    return new Howl({
      src: [src],
      format: ['wav'],
      preload: true,
      html5: false,
      volume: 1,
    });
  });

  const successSrc = pcm16ToWavBase64(
    synthTone([329.63, 493.88, 392, 587.33], 0.22),
    44100
  );
  successHowl = new Howl({
    src: [successSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
  });

  const errorSrc = pcm16ToWavBase64(synthTone([87.31, 73.42], 0.24), 44100);
  errorHowl = new Howl({
    src: [errorSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
  });

  const openSrc = pcm16ToWavBase64(synthTone([261.63, 392, 523.25], 0.18), 44100);
  openHowl = new Howl({
    src: [openSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
  });

  const closeSrc = pcm16ToWavBase64(synthTone([220, 164.81, 130.81], 0.2), 44100);
  closeHowl = new Howl({
    src: [closeSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
  });

  const dragSrc = pcm16ToWavBase64(synthTone([196], 0.06), 44100);
  dragHowl = new Howl({
    src: [dragSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
  });

  initialized = true;
}

function panForChannel(channel: OutputChannel): number {
  if (channel === 'left') return -1;
  if (channel === 'right') return 1;
  return 0;
}

function getFallbackContext(): AudioContext | null {
  if (fallbackCtx) return fallbackCtx;
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  fallbackCtx = new AC();
  return fallbackCtx;
}

async function fallbackBeep(freq = 220, duration = 0.1): Promise<void> {
  if (!soundEnabled || soundVolume <= 0) return;
  const ctx = getFallbackContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner();
  pan.pan.value = panForChannel(outputChannel);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.01, clampVolume(soundVolume) / 180),
    now + 0.01
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.frequency.value = freq;
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(pan);
  pan.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

async function playHowl(sound: Howl | null): Promise<boolean> {
  if (!soundEnabled || soundVolume <= 0 || !sound) return false;
  ensureInitialized();
  Howler.volume(clampVolume(soundVolume) / 100);
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    await Howler.ctx.resume();
  }
  try {
    const id = sound.play();
    if (typeof id === 'number') {
      sound.stereo(panForChannel(outputChannel), id);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function setSfxSettings(enabled: boolean, volume: number): void {
  soundEnabled = enabled;
  soundVolume = clampVolume(volume);
  Howler.volume(soundEnabled ? soundVolume / 100 : 0);
}

export function setSfxOutputChannel(channel: OutputChannel): void {
  outputChannel = channel;
}

export async function warmupAudio(): Promise<void> {
  ensureInitialized();
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    await Howler.ctx.resume();
  }
}

export async function playTapSfx(): Promise<void> {
  ensureInitialized();
  const sound = tapHowls[tapVariantIndex % tapHowls.length] ?? null;
  tapVariantIndex += 1;
  const played = await playHowl(sound);
  if (!played) await fallbackBeep(196, 0.08);
}

export async function playErrorSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(errorHowl);
  if (!played) {
    await fallbackBeep(130, 0.1);
    await fallbackBeep(110, 0.1);
  }
}

export async function playSuccessSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(successHowl);
  if (!played) {
    await fallbackBeep(330, 0.08);
    await fallbackBeep(440, 0.08);
  }
}

export async function playOpenSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(openHowl);
  if (!played) await fallbackBeep(392, 0.07);
}

export async function playCloseSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(closeHowl);
  if (!played) await fallbackBeep(174, 0.09);
}

export async function playDragSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(dragHowl);
  if (!played) await fallbackBeep(220, 0.04);
}
