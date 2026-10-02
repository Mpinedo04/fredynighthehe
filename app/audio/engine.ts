/**
 * PREMIERE 22 · MOTOR DE AUDIO
 * One AudioContext for the whole premiere with three buses:
 *   music → the original funk-noir soundtrack (ducked under videos)
 *   sfx   → pranks, microtones, clapper, chimes…
 *   hee   → Michael's hee-hee, decoded once and replayed as buffer voices
 * Browsers cap the number of AudioContexts, so nothing else should create one.
 */

type Buses = {
  context: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  hee: GainNode;
};

const HEE_URL = "/audio/michael-jackson-hee-hee.mp3";
const MAX_HEE_VOICES = 48;

let buses: Buses | null = null;
let musicVolume = 1;
let ducked = false;

export function audioContext(): AudioContext | null {
  return ensureBuses()?.context ?? null;
}

function ensureBuses(): Buses | null {
  if (typeof window === "undefined") return null;
  if (buses && buses.context.state !== "closed") {
    void buses.context.resume().catch(() => undefined);
    return buses;
  }
  try {
    const context = new AudioContext();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.ratio.value = 3;
    const master = context.createGain();
    const music = context.createGain();
    const sfx = context.createGain();
    const hee = context.createGain();
    music.connect(master);
    sfx.connect(master);
    hee.connect(master);
    master.connect(compressor);
    compressor.connect(context.destination);
    buses = { context, master, music, sfx, hee };
    applyMusicGain(0);
    void context.resume().catch(() => undefined);
    return buses;
  } catch {
    return null;
  }
}

/** Call inside a click/tap so the context starts unlocked on every browser. */
export function unlockAudio() {
  const current = ensureBuses();
  void preloadHee();
  return current !== null;
}

export function sfxBus(): AudioNode | null {
  return ensureBuses()?.sfx ?? null;
}

// ── Music volume & ducking ─────────────────────────────────────────────────
function applyMusicGain(rampSeconds = 0.35) {
  if (!buses) return;
  const { context, music } = buses;
  const target = Math.max(0.0001, musicVolume * (ducked ? 0.18 : 1));
  music.gain.cancelScheduledValues(context.currentTime);
  music.gain.setValueAtTime(Math.max(0.0001, music.gain.value), context.currentTime);
  if (rampSeconds <= 0) music.gain.setValueAtTime(target, context.currentTime);
  else music.gain.exponentialRampToValueAtTime(target, context.currentTime + rampSeconds);
}

export function setMusicVolume(volume: number) {
  musicVolume = Math.max(0, Math.min(1, volume));
  applyMusicGain(0.12);
}

export function getMusicVolume() {
  return musicVolume;
}

/** Lower the soundtrack while a video or the montage is playing. */
export function duckMusic(on: boolean) {
  if (ducked === on) return;
  ducked = on;
  applyMusicGain();
}

// ── Hee-hee voices ─────────────────────────────────────────────────────────
let heeBuffer: Promise<AudioBuffer | null> | null = null;
const heeVoices = new Set<AudioScheduledSourceNode | HTMLAudioElement>();

export function preloadHee() {
  const current = ensureBuses();
  if (!current) return Promise.resolve(null);
  if (!heeBuffer) {
    heeBuffer = fetch(HEE_URL)
      .then((response) => response.arrayBuffer())
      .then((data) => current.context.decodeAudioData(data))
      .catch(() => null);
  }
  return heeBuffer;
}

/**
 * Plays one hee-hee. playbackRate on a buffer source changes pitch as well as
 * speed, which is exactly the chipmunk effect deep in the page. Resolves to
 * true when the voice really started.
 */
export async function playHeeVoice(rate: number, volume: number): Promise<boolean> {
  if (heeVoices.size >= MAX_HEE_VOICES) return false;
  const current = ensureBuses();
  const buffer = await preloadHee();
  if (!current || !buffer || current.context.state !== "running") {
    return playHeeFallback(rate, volume);
  }
  const source = current.context.createBufferSource();
  const gain = current.context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(current.hee);
  heeVoices.add(source);
  source.addEventListener("ended", () => {
    heeVoices.delete(source);
    gain.disconnect();
  }, { once: true });
  source.start();
  return true;
}

function playHeeFallback(rate: number, volume: number) {
  const sample = new Audio(HEE_URL);
  const media = sample as HTMLAudioElement & {
    preservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
  };
  media.preservesPitch = false;
  media.webkitPreservesPitch = false;
  sample.volume = Math.min(1, volume);
  sample.playbackRate = rate;
  heeVoices.add(sample);
  const release = () => heeVoices.delete(sample);
  sample.addEventListener("ended", release, { once: true });
  sample.addEventListener("error", release, { once: true });
  return sample.play().then(
    () => true,
    () => {
      release();
      return false;
    },
  );
}

export function stopAllHee() {
  heeVoices.forEach((voice) => {
    if (voice instanceof HTMLAudioElement) {
      voice.pause();
    } else {
      try {
        voice.stop();
      } catch {
        // Already finished.
      }
    }
  });
  heeVoices.clear();
}

// ── Simple tones ───────────────────────────────────────────────────────────
export function playTone(
  frequency: number,
  {
    type = "sine",
    duration = 0.7,
    volume = 0.12,
    pan = 0,
    delay = 0,
  }: {
    type?: OscillatorType;
    duration?: number;
    volume?: number;
    pan?: number;
    delay?: number;
  } = {},
) {
  const current = ensureBuses();
  if (!current) return;
  const { context } = current;
  const startsAt = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(panner);
  panner.connect(current.sfx);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.03);
  oscillator.addEventListener("ended", () => panner.disconnect(), { once: true });
}

/** The 1 kHz beep of a film leader countdown. */
export function playLeaderBeep(final = false) {
  playTone(final ? 1320 : 1000, { type: "sine", duration: final ? 0.45 : 0.16, volume: 0.09 });
}

// ── Soundtrack ─────────────────────────────────────────────────────────────
let soundtrack: { timer: number; output: GainNode; sources: Set<AudioScheduledSourceNode> } | null = null;

export function isSoundtrackPlaying() {
  return soundtrack !== null;
}

export function stopSoundtrack() {
  const current = buses;
  const track = soundtrack;
  if (!current || !track) return;
  soundtrack = null;
  window.clearInterval(track.timer);
  const { context } = current;
  track.output.gain.setValueAtTime(track.output.gain.value, context.currentTime);
  track.output.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.25);
  window.setTimeout(() => {
    track.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source has already finished.
      }
    });
    track.output.disconnect();
  }, 300);
}

/**
 * Original 16-step funk-noir cue: 118 BPM, syncopated bass, dry backbeat,
 * muted guitar and brass. It evokes the era without reproducing the melody or
 * master recording of a copyrighted song.
 */
export function startSoundtrack() {
  const current = ensureBuses();
  if (!current || soundtrack) return;
  const { context } = current;
  applyMusicGain(0.2);
  const output = context.createGain();
  output.gain.setValueAtTime(0.0001, context.currentTime);
  output.gain.exponentialRampToValueAtTime(0.075, context.currentTime + 0.18);
  output.connect(current.music);

  const sources = new Set<AudioScheduledSourceNode>();
  const remember = <T extends AudioScheduledSourceNode>(source: T) => {
    sources.add(source);
    source.addEventListener("ended", () => sources.delete(source), { once: true });
    return source;
  };

  const noiseBuffer = context.createBuffer(1, Math.round(context.sampleRate * 0.18), context.sampleRate);
  const noise = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noise.length; index += 1) noise[index] = Math.random() * 2 - 1;

  const envelope = (value: number, time: number, release: number) => {
    const gain = context.createGain();
    gain.gain.setValueAtTime(value, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + release);
    gain.connect(output);
    return gain;
  };

  const kick = (time: number) => {
    const osc = remember(context.createOscillator());
    osc.type = "sine";
    osc.frequency.setValueAtTime(118, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    osc.connect(envelope(0.72, time, 0.19));
    osc.start(time);
    osc.stop(time + 0.2);
  };

  const noiseHit = (time: number, type: BiquadFilterType, frequency: number, value: number, release: number, q = 0.7) => {
    const source = remember(context.createBufferSource());
    const filter = context.createBiquadFilter();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    source.connect(filter);
    filter.connect(envelope(value, time, release));
    source.start(time);
    source.stop(time + release + 0.01);
  };

  const snare = (time: number) => {
    noiseHit(time, "highpass", 1450, 0.24, 0.11);
    noiseHit(time + 0.012, "bandpass", 2300, 0.11, 0.085, 0.65);
  };

  const hat = (time: number, open: boolean, accent: number) =>
    noiseHit(time, "highpass", open ? 6100 : 7600, (open ? 0.095 : 0.045) * accent, open ? 0.16 : 0.028);

  const bass = (time: number, frequency: number, duration: number) => {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(430, time);
    filter.frequency.exponentialRampToValueAtTime(170, time + duration);
    filter.Q.value = 3.4;
    filter.connect(envelope(0.2, time, duration));
    const body = remember(context.createOscillator());
    const edge = remember(context.createOscillator());
    const edgeGain = context.createGain();
    body.type = "triangle";
    edge.type = "sawtooth";
    body.frequency.setValueAtTime(frequency, time);
    edge.frequency.setValueAtTime(frequency * 2, time);
    edge.detune.value = -7;
    edgeGain.gain.value = 0.24;
    body.connect(filter);
    edge.connect(edgeGain);
    edgeGain.connect(filter);
    [body, edge].forEach((osc) => {
      osc.start(time);
      osc.stop(time + duration + 0.018);
    });
  };

  const voice = (time: number, frequency: number, type: OscillatorType, value: number, release: number, filterFrequency: number) => {
    const osc = remember(context.createOscillator());
    const filter = context.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = frequency;
    filter.type = "bandpass";
    filter.frequency.value = filterFrequency;
    filter.Q.value = 1.25;
    osc.connect(filter);
    filter.connect(envelope(value, time, release));
    osc.start(time);
    osc.stop(time + release + 0.01);
  };

  const guitarChank = (time: number, root: number) =>
    [1, 1.5, 2].forEach((ratio, index) =>
      voice(time, root * ratio, index === 0 ? "sawtooth" : "square", index === 0 ? 0.025 : 0.013, 0.052, 1250),
    );

  const brassHit = (time: number) =>
    [146.83, 174.61, 220].forEach((frequency, index) =>
      voice(time, frequency, "sawtooth", 0.025 - index * 0.004, 0.14, 900),
    );

  const kickSteps = new Set([0, 3, 6, 8, 11, 14]);
  const snareSteps = new Set([4, 12]);
  const openHatSteps = new Set([7, 15]);
  const bassNotes: Record<number, number> = { 0: 55, 2: 55, 5: 65.41, 7: 61.74, 8: 55, 11: 73.42, 13: 65.41, 15: 51.91 };
  const guitarSteps = new Set([1, 3, 6, 9, 11, 14]);
  const brassSteps = new Set([6, 15]);
  const secondsPerStep = 60 / 118 / 4;
  let step = 0;
  let nextStepAt = context.currentTime + 0.06;

  const schedule = () => {
    while (nextStepAt < context.currentTime + 0.12) {
      if (kickSteps.has(step)) kick(nextStepAt);
      if (snareSteps.has(step)) snare(nextStepAt);
      hat(nextStepAt, openHatSteps.has(step), step % 4 === 0 ? 1.22 : 0.78);
      const bassFrequency = bassNotes[step];
      if (bassFrequency) bass(nextStepAt, bassFrequency, step === 7 || step === 15 ? 0.16 : 0.095);
      if (guitarSteps.has(step)) guitarChank(nextStepAt + secondsPerStep * 0.08, step < 8 ? 220 : 196);
      if (brassSteps.has(step)) brassHit(nextStepAt);
      if (step % 4 === 0) window.dispatchEvent(new CustomEvent("premiere22:beat", { detail: { step } }));
      step = (step + 1) % 16;
      nextStepAt += secondsPerStep;
    }
  };

  schedule();
  soundtrack = { timer: window.setInterval(schedule, 25), output, sources };
}
