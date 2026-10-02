import { audioContext } from "../audio/engine";
import { birthdayMelody } from "../prank-system.mjs";

/** Pranks share the premiere's single AudioContext (see app/audio/engine.ts). */
export function prankAudioContext() {
  return audioContext();
}

function noiseBuffer(context: AudioContext, seconds: number) {
  const buffer = context.createBuffer(
    1,
    Math.max(1, Math.round(context.sampleRate * seconds)),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function tone(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  startsAt: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.03);
  return oscillator;
}

function noiseHit(
  context: AudioContext,
  startsAt: number,
  duration: number,
  volume: number,
  filterType: BiquadFilterType,
  frequency: number,
  q = 0.8,
) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = noiseBuffer(context, duration + 0.05);
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  gain.gain.setValueAtTime(volume, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(startsAt);
  source.stop(startsAt + duration + 0.05);
}

/** A loaf so hard that it sounds like a brick on a table. */
export function playThud(strength = 1) {
  const context = prankAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const body = context.createOscillator();
  const gain = context.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(190 + strength * 30, now);
  body.frequency.exponentialRampToValueAtTime(58, now + 0.14);
  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  body.connect(gain);
  gain.connect(context.destination);
  body.start(now);
  body.stop(now + 0.22);
  noiseHit(context, now, 0.05, 0.35, "bandpass", 1800, 1.4);
}

export function playGlassBreak() {
  const context = prankAudioContext();
  if (!context) return;
  const now = context.currentTime;
  noiseHit(context, now, 0.5, 0.5, "highpass", 3200, 0.7);
  noiseHit(context, now + 0.04, 0.9, 0.22, "bandpass", 6200, 3);
  [2630, 3910, 5270, 4480, 6120].forEach((frequency, index) => {
    tone(context, context.destination, frequency, now + 0.03 + index * 0.045, 0.6, 0.05, "triangle");
  });
}

export function playClapperSnap() {
  const context = prankAudioContext();
  if (!context) return;
  const now = context.currentTime;
  noiseHit(context, now, 0.08, 0.7, "bandpass", 2400, 1.1);
  tone(context, context.destination, 320, now, 0.07, 0.25, "square");
}

export function playAchievementDing() {
  const context = prankAudioContext();
  if (!context) return;
  const now = context.currentTime;
  tone(context, context.destination, 880, now, 0.5, 0.08, "sine");
  tone(context, context.destination, 1318.5, now + 0.12, 0.8, 0.07, "sine");
  tone(context, context.destination, 1760, now + 0.12, 0.6, 0.02, "triangle");
}

/** Six slow bell strikes and a little crowd of kids: you made it to 6 AM. */
export function playSixAmChimes() {
  const context = prankAudioContext();
  if (!context) return;
  const now = context.currentTime + 0.05;
  for (let strike = 0; strike < 6; strike += 1) {
    const at = now + strike * 0.95;
    [1, 2.76, 5.4].forEach((ratio, partial) => {
      tone(context, context.destination, 392 * ratio, at, 2.4 - partial * 0.6, 0.12 / (partial + 1), "sine");
    });
  }
  noiseHit(context, now + 5.9, 1.6, 0.08, "bandpass", 1400, 0.5);
}

/** Organ-like tones for the mothership, echoing the five notes Raúl played. */
export function playShipTones(steps: number[]) {
  const context = prankAudioContext();
  if (!context) return;
  const now = context.currentTime + 0.1;
  steps.forEach((step, index) => {
    const frequency = 220 * 2 ** (step / 24);
    const at = now + index * 0.62;
    tone(context, context.destination, frequency, at, 0.9, 0.09, "sawtooth");
    tone(context, context.destination, frequency / 2, at, 0.9, 0.08, "triangle");
  });
  const rumble = tone(context, context.destination, 36, now, 4.5, 0.09, "sine");
  rumble.frequency.linearRampToValueAtTime(48, now + 4.5);
}

/** Happy Birthday in 24-TET, intentionally out of tune. Returns a stop function. */
export function playBirthday(onNote?: (index: number, detune: number) => void) {
  const context = prankAudioContext();
  if (!context) return () => undefined;
  const melody = birthdayMelody();
  const beat = 0.42;
  const master = context.createGain();
  master.gain.value = 1;
  master.connect(context.destination);
  const timers: number[] = [];
  let at = context.currentTime + 0.12;
  melody.forEach((note, index) => {
    const duration = note.beats * beat;
    tone(context, master, note.frequency, at, duration * 0.92, 0.1, "triangle");
    tone(context, master, note.frequency * 2, at, duration * 0.5, 0.025, "sine");
    const delay = (at - context.currentTime) * 1000;
    timers.push(window.setTimeout(() => onNote?.(index, note.detune), delay));
    at += duration;
  });
  timers.push(
    window.setTimeout(() => onNote?.(-1, 0), (at - context.currentTime) * 1000 + 200),
  );
  return () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    master.gain.setValueAtTime(master.gain.value, context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.15);
    onNote?.(-1, 0);
  };
}

/**
 * "Thriller mode": if public/audio/thriller.mp3 exists it is used; otherwise an
 * original spooky funk cue is synthesized (no copyrighted melody). Returns stop.
 */
export function startThrillerCue(volume = 0.22) {
  let stopped = false;
  let stopSynth: (() => void) | null = null;
  const file = new Audio("/audio/thriller.mp3");
  file.loop = true;
  file.volume = volume;

  const fallback = () => {
    if (stopped || stopSynth) return;
    stopSynth = synthSpookyFunk(volume);
  };
  file.addEventListener("error", fallback, { once: true });
  void file.play().catch(fallback);

  return () => {
    stopped = true;
    file.pause();
    stopSynth?.();
  };
}

function synthSpookyFunk(volume: number) {
  const context = prankAudioContext();
  if (!context) return () => undefined;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(volume * 0.6, context.currentTime + 1.2);
  master.connect(context.destination);

  const E2 = 82.41;
  const bassline: Record<number, number> = {
    0: E2, 3: E2, 4: 98, 6: 110, 8: E2, 10: 146.83, 11: 123.47, 14: 116.54,
  };
  const secondsPerStep = 60 / 112 / 4;
  let step = 0;
  let bar = 0;
  let nextAt = context.currentTime + 0.1;

  const schedule = () => {
    while (nextAt < context.currentTime + 0.15) {
      const bass = bassline[step];
      if (bass) {
        tone(context, master, bass, nextAt, 0.16, 0.32, "sawtooth");
        tone(context, master, bass / 2, nextAt, 0.18, 0.3, "sine");
      }
      if (step === 0 || step === 8) noiseHit(context, nextAt, 0.12, 0.12 * volume, "lowpass", 160);
      if (step === 4 || step === 12) noiseHit(context, nextAt, 0.22, 0.25 * volume, "bandpass", 1900, 0.6);
      if (step % 2 === 0) noiseHit(context, nextAt, 0.03, 0.06 * volume, "highpass", 8000);
      if (step === 0) {
        [164.81, 196, 246.94].forEach((frequency) => {
          const pad = tone(context, master, frequency, nextAt, secondsPerStep * 15, 0.035, "square");
          pad.detune.setValueAtTime(-12, nextAt);
          pad.detune.linearRampToValueAtTime(12, nextAt + secondsPerStep * 15);
        });
        if (bar % 4 === 3) {
          const howl = tone(context, master, 380, nextAt, 2.6, 0.04, "sine");
          howl.frequency.linearRampToValueAtTime(820, nextAt + 1.3);
          howl.frequency.linearRampToValueAtTime(300, nextAt + 2.6);
        }
        bar += 1;
      }
      step = (step + 1) % 16;
      nextAt += secondsPerStep;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 30);
  return () => {
    window.clearInterval(timer);
    master.gain.setValueAtTime(master.gain.value, context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4);
    window.setTimeout(() => master.disconnect(), 500);
  };
}

/** Pitch-changing playback for HTML audio samples (preservesPitch defaults to true). */
export function unlockPitch(sample: HTMLAudioElement) {
  const media = sample as HTMLAudioElement & {
    preservesPitch?: boolean;
    mozPreservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
  };
  media.preservesPitch = false;
  media.mozPreservesPitch = false;
  media.webkitPreservesPitch = false;
  return sample;
}
