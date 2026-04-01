/**
 *  __   __  ________
 *  \ \ / / |___  __/
 *   \ V /      / /   
 *    > <      / /    
 *   / ^ \    / /___  
 *  /_/ \_\  /______/ 
 * 
 * Motor de Síntesis de Audio y SFX - XYZ Dashboard
 * #xyz-rainbow #xyz-rainbowtechnology #rainbowtechnology.xyz
 */

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
let tapFallbackSrcs: string[] = [];
let successFallbackSrc = '';
let errorFallbackSrc = '';
let openFallbackSrc = '';
let closeFallbackSrc = '';
let dragFallbackSrc = '';

function clampVolume(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Convierte un buffer de muestras de audio (Float32Array) a un formato WAV codificado en Base64
 */
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

/**
 * Sintetiza un tono mediante la generación de formas de onda sinusoidales a distintas frecuencias y amplitudes
 */
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

/**
 * Inicializa todos los sintetizadores Howler cargando los sonidos generados en tiempo real
 */
function ensureInitialized(): void {
  if (initialized) return;

  // Diferentes combinaciones de frecuencias para generar variantes de "toque" (tap)
  const tapVariants = [
    [110],
    [130.81, 110],
    [164.81],
    [110, 164.81],
    [146.83],
    [98, 130.81],
  ];

  tapHowls = tapVariants.map((freqs, index) => {
    const src = pcm16ToWavBase64(synthTone(freqs, 0.11), 44100);
    tapFallbackSrcs[index] = src;
    return new Howl({
      src: [src],
      format: ['wav'],
      preload: true,
      html5: false,
      volume: 1,
      pool: 10,
    });
  });

  const successSrc = pcm16ToWavBase64(
    synthTone([329.63, 493.88, 392, 587.33], 0.22),
    44100
  );
  successFallbackSrc = successSrc;
  successHowl = new Howl({
    src: [successSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
    pool: 8,
  });

  const errorSrc = pcm16ToWavBase64(synthTone([87.31, 73.42], 0.24), 44100);
  errorFallbackSrc = errorSrc;
  errorHowl = new Howl({
    src: [errorSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
    pool: 8,
  });

  const openSrc = pcm16ToWavBase64(synthTone([261.63, 392, 523.25], 0.18), 44100);
  openFallbackSrc = openSrc;
  openHowl = new Howl({
    src: [openSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
    pool: 8,
  });

  const closeSrc = pcm16ToWavBase64(synthTone([220, 164.81, 130.81], 0.2), 44100);
  closeFallbackSrc = closeSrc;
  closeHowl = new Howl({
    src: [closeSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
    pool: 8,
  });

  const dragSrc = pcm16ToWavBase64(synthTone([196], 0.06), 44100);
  dragFallbackSrc = dragSrc;
  dragHowl = new Howl({
    src: [dragSrc],
    format: ['wav'],
    preload: true,
    html5: false,
    volume: 1,
    pool: 8,
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

/**
 * Método alternativo puro para emitir un pitido desde el contexto de audio local si Howler falla.
 */
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
  const maybeStereo = 'createStereoPanner' in ctx
    ? (ctx as AudioContext & { createStereoPanner: () => StereoPannerNode }).createStereoPanner()
    : null;
  if (maybeStereo) {
    maybeStereo.pan.value = panForChannel(outputChannel);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.01, clampVolume(soundVolume) / 180),
    now + 0.01
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.frequency.value = freq;
  osc.type = 'sine';
  osc.connect(gain);
  if (maybeStereo) {
    gain.connect(maybeStereo);
    maybeStereo.connect(ctx.destination);
  } else {
    gain.connect(ctx.destination);
  }
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/**
 * Método alternativo si el principal de Howler es expulsado de la memoria temporalmente.
 */
async function playHtmlFallback(src: string): Promise<boolean> {
  if (!src || !soundEnabled || soundVolume <= 0) return false;
  try {
    const audio = new Audio(src);
    audio.volume = clampVolume(soundVolume) / 100;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

async function playHowl(sound: Howl | null): Promise<boolean> {
  if (!soundEnabled || soundVolume <= 0 || !sound) return false;
  ensureInitialized();
  Howler.volume(clampVolume(soundVolume) / 100);
  try {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      await Howler.ctx.resume();
    }
    if (sound.state() === 'unloaded') {
      sound.load();
    }
    sound.seek(0);
    const id = sound.play();
    if (typeof id === 'number') {
      try {
        sound.stereo(panForChannel(outputChannel), id);
      } catch {
        // Ignorar errores de APIS estéreo en construcciones webkit específicas (ej. Linux WebKit)
      }
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
  const idx = tapVariantIndex % tapHowls.length;
  const sound = tapHowls[idx] ?? null;
  tapVariantIndex += 1;
  const played = await playHowl(sound);
  if (!played) {
    const htmlOk = await playHtmlFallback(tapFallbackSrcs[idx] ?? '');
    if (!htmlOk) await fallbackBeep(196, 0.08);
  }
}

export async function playErrorSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(errorHowl);
  if (!played) {
    const htmlOk = await playHtmlFallback(errorFallbackSrc);
    if (!htmlOk) {
      await fallbackBeep(130, 0.1);
      await fallbackBeep(110, 0.1);
    }
  }
}

export async function playSuccessSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(successHowl);
  if (!played) {
    const htmlOk = await playHtmlFallback(successFallbackSrc);
    if (!htmlOk) {
      await fallbackBeep(330, 0.08);
      await fallbackBeep(440, 0.08);
    }
  }
}

export async function playOpenSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(openHowl);
  if (!played) {
    const htmlOk = await playHtmlFallback(openFallbackSrc);
    if (!htmlOk) await fallbackBeep(392, 0.07);
  }
}

export async function playCloseSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(closeHowl);
  if (!played) {
    const htmlOk = await playHtmlFallback(closeFallbackSrc);
    if (!htmlOk) await fallbackBeep(174, 0.09);
  }
}

export async function playDragSfx(): Promise<void> {
  ensureInitialized();
  const played = await playHowl(dragHowl);
  if (!played) {
    const htmlOk = await playHtmlFallback(dragFallbackSrc);
    if (!htmlOk) await fallbackBeep(220, 0.04);
  }
}
