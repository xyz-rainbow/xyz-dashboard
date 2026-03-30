import * as Tone from 'tone';

let started = false;
let tapSynth: Tone.Synth | null = null;
let errorSynth: Tone.DuoSynth | null = null;
let successSynth: Tone.PolySynth | null = null;
let ambienceVerb: Tone.Reverb | null = null;
let gainNode: Tone.Gain | null = null;
let soundEnabled = true;
let soundVolume = 65;

function clampVolume(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function applyAudioMix(): void {
  if (!gainNode) return;
  const volume = soundEnabled ? clampVolume(soundVolume) / 100 : 0;
  gainNode.gain.rampTo(volume, 0.05);
}

export function setSfxSettings(enabled: boolean, volume: number): void {
  soundEnabled = enabled;
  soundVolume = clampVolume(volume);
  applyAudioMix();
}

async function ensureAudioReady(): Promise<void> {
  if (!started) {
    await Tone.start();
    started = true;
  }

  if (!ambienceVerb) {
    ambienceVerb = new Tone.Reverb({
      decay: 1.6,
      preDelay: 0.01,
      wet: 0.2,
    });
  }

  if (!gainNode) {
    gainNode = new Tone.Gain(0).toDestination();
  }

  if (ambienceVerb && gainNode) {
    ambienceVerb.disconnect();
    ambienceVerb.connect(gainNode);
    applyAudioMix();
  }

  if (!tapSynth) {
    tapSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.004,
        decay: 0.12,
        sustain: 0.0,
        release: 0.08,
      },
      volume: -16,
    }).connect(ambienceVerb);
  }

  if (!errorSynth) {
    errorSynth = new Tone.DuoSynth({
      harmonicity: 1.25,
      voice0: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.18 },
      },
      voice1: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.24, sustain: 0.0, release: 0.2 },
      },
      vibratoAmount: 0.06,
      vibratoRate: 4.5,
      volume: -8,
    }).connect(ambienceVerb);
    errorSynth.voice0.volume.value = -14;
    errorSynth.voice1.volume.value = -16;
  }

  if (!successSynth) {
    successSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.008,
        decay: 0.16,
        sustain: 0.0,
        release: 0.22,
      },
      volume: -18,
    }).connect(ambienceVerb);
  }
}

export async function playTapSfx(): Promise<void> {
  await ensureAudioReady();
  tapSynth?.triggerAttackRelease('A2', '16n');
}

export async function playErrorSfx(): Promise<void> {
  await ensureAudioReady();
  errorSynth?.triggerAttackRelease('F2', '8n');
  tapSynth?.triggerAttackRelease('D2', '16n', Tone.now() + 0.08);
}

export async function playSuccessSfx(): Promise<void> {
  await ensureAudioReady();
  const now = Tone.now();
  successSynth?.triggerAttackRelease(['E4', 'B4'], '16n', now);
  successSynth?.triggerAttackRelease(['G4', 'D5'], '16n', now + 0.11);
}
