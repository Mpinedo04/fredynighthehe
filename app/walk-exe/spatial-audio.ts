export type SpatialAudioBus =
  | "ambience"
  | "music"
  | "sfx"
  | "heartbeat"
  | "jumpscare";

export type SpatialAudioLevels = Record<SpatialAudioBus | "master", number>;

export type AudioVector3 = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type ListenerPose = Readonly<{
  position: AudioVector3;
  forward: AudioVector3;
  up?: AudioVector3;
}>;

export type SpatialEmitterOptions = Readonly<{
  bus?: SpatialAudioBus;
  gain?: number;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  coneInnerAngle?: number;
  coneOuterAngle?: number;
  coneOuterGain?: number;
}>;

export type EmitterUpdate = Readonly<{
  position?: AudioVector3;
  orientation?: AudioVector3;
  gain?: number;
  occlusion?: number;
}>;

export type SpatialAudioQaCounters = Readonly<{
  contextState: AudioContextState | "uninitialized" | "destroyed";
  contextsCreated: number;
  nodesCreated: number;
  activeNodes: number;
  emitters: number;
  activeOneShots: number;
  activePersistentSources: number;
  nodesCreatedByType: Readonly<Record<string, number>>;
  mascotWarningsPlayed: number;
  mascotScreamsPlayed: number;
  mascotScreamsFailed: number;
  lastMascotVariant: number | null;
}>;

export type SpatialAudioOptions = Readonly<{
  levels?: Partial<SpatialAudioLevels>;
  seed?: number;
}>;

type SpatialEmitter = {
  bus: SpatialAudioBus;
  panner: PannerNode;
  occlusionFilter: BiquadFilterNode;
  output: GainNode;
  dryGain: number;
  occlusion: number;
};

type ProceduralBuffers = {
  mechanicalStep: AudioBuffer;
  metalImpact: AudioBuffer;
  fan: AudioBuffer;
  industrialBed: AudioBuffer;
  tensionBed: AudioBuffer;
  cctvStatic: AudioBuffer;
  heartbeat: AudioBuffer;
  jumpscares: AudioBuffer[];
};

type PersistentSource = {
  source: AudioBufferSourceNode;
  emitterId: string;
};

const DEFAULT_LEVELS: SpatialAudioLevels = {
  master: 0.82,
  ambience: 0.72,
  music: 0.34,
  sfx: 0.82,
  heartbeat: 0.86,
  jumpscare: 0.68,
};

const DEFAULT_UP: AudioVector3 = { x: 0, y: 1, z: 0 };
const SILENCE = 0.0001;
const MASCOT_SCREAM_PROFILES = [
  { primaryRate: 0.82, layerRate: 0.57, warningRate: 0.68 },
  { primaryRate: 1.08, layerRate: 1.42, warningRate: 1.24 },
  { primaryRate: 0.98, layerRate: 1.27, warningRate: 1.12 },
  { primaryRate: 0.92, layerRate: 1.18, warningRate: 0.84 },
] as const;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(vector: AudioVector3, fallback: AudioVector3): AudioVector3 {
  const x = finite(vector.x);
  const y = finite(vector.y);
  const z = finite(vector.z);
  const length = Math.hypot(x, y, z);
  if (length < 0.00001) return fallback;
  return { x: x / length, y: y / length, z: z / length };
}

function createMonoBuffer(
  context: BaseAudioContext,
  duration: number,
  fill: (sample: number, time: number, sampleRate: number) => number,
) {
  const frameCount = Math.max(1, Math.ceil(duration * context.sampleRate));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let sample = 0; sample < frameCount; sample += 1) {
    channel[sample] = clamp(fill(sample, sample / context.sampleRate, context.sampleRate), -1, 1);
  }
  return buffer;
}

function buildProceduralBuffers(context: BaseAudioContext, seed: number): ProceduralBuffers {
  const stepRandom = seededRandom(seed ^ 0x51e7);
  const impactRandom = seededRandom(seed ^ 0x1a9ac7);
  const fanRandom = seededRandom(seed ^ 0xfa47);
  const staticRandom = seededRandom(seed ^ 0xc7c7);
  const bedRandom = seededRandom(seed ^ 0xbedd);
  const screamRandom = seededRandom(seed ^ 0x5c2ea);

  const mechanicalStep = createMonoBuffer(context, 0.24, (_sample, time) => {
    const attack = clamp(time / 0.006);
    const decay = Math.exp(-time * 22);
    const ring = Math.sin(Math.PI * 2 * (112 * time - 58 * time * time));
    const plate = Math.sin(Math.PI * 2 * 463 * time) * Math.exp(-time * 34);
    const grit = (stepRandom() * 2 - 1) * Math.exp(-time * 48);
    return attack * (ring * 0.5 + plate * 0.24 + grit * 0.28) * decay;
  });

  const metalImpact = createMonoBuffer(context, 0.72, (_sample, time) => {
    const attack = clamp(time / 0.003);
    const body = Math.exp(-time * 7.2);
    const highDecay = Math.exp(-time * 32);
    const resonances =
      Math.sin(Math.PI * 2 * 173 * time) * 0.42 +
      Math.sin(Math.PI * 2 * 311 * time) * 0.24 +
      Math.sin(Math.PI * 2 * 677 * time) * 0.11;
    const strike = (impactRandom() * 2 - 1) * highDecay * 0.46;
    return attack * (resonances * body + strike);
  });

  const fan = createMonoBuffer(context, 2.4, (_sample, time) => {
    const blade = 0.58 + Math.sin(Math.PI * 2 * 7.3 * time) * 0.18;
    const bearing =
      Math.sin(Math.PI * 2 * 93 * time) * 0.08 +
      Math.sin(Math.PI * 2 * 139 * time) * 0.035;
    const noise = (fanRandom() * 2 - 1) * 0.19;
    return (noise + bearing) * blade;
  });

  const industrialBed = createMonoBuffer(context, 4.8, (_sample, time) => {
    const mains =
      Math.sin(Math.PI * 2 * 49.8 * time) * 0.12 +
      Math.sin(Math.PI * 2 * 99.6 * time) * 0.045;
    const air = (bedRandom() * 2 - 1) * 0.11;
    const pressure = 0.58 + Math.sin(Math.PI * 2 * 0.19 * time) * 0.16;
    return (mains + air) * pressure;
  });

  const tensionBed = createMonoBuffer(context, 8, (_sample, time) => {
    const rise = 0.5 + Math.sin(Math.PI * 2 * 0.067 * time) * 0.5;
    const first = Math.sin(Math.PI * 2 * (41 + rise * 4.5) * time);
    const second = Math.sin(Math.PI * 2 * (61.7 - rise * 2.2) * time);
    const pulse = 0.72 + Math.sin(Math.PI * 2 * 0.23 * time) * 0.18;
    return (first * 0.16 + second * 0.08) * pulse;
  });

  let previousStatic = 0;
  const cctvStatic = createMonoBuffer(context, 2, (_sample, time) => {
    const white = staticRandom() * 2 - 1;
    previousStatic = previousStatic * 0.82 + white * 0.18;
    const scanPulse = Math.sin(Math.PI * 2 * 59.8 * time) * 0.08;
    return white * 0.24 + previousStatic * 0.34 + scanPulse;
  });

  const heartbeat = createMonoBuffer(context, 0.34, (_sample, time) => {
    const thump = (start: number, frequency: number, decay: number) => {
      const local = time - start;
      if (local < 0) return 0;
      const attack = clamp(local / 0.008);
      return (
        Math.sin(Math.PI * 2 * (frequency * local - 18 * local * local)) *
        attack *
        Math.exp(-local * decay)
      );
    };
    return thump(0, 58, 25) * 0.82 + thump(0.135, 46, 30) * 0.52;
  });

  const ursusScream = createMonoBuffer(context, 1.08, (_sample, time) => {
    const attack = clamp(time / 0.008);
    const release = Math.exp(-Math.max(0, time - 0.28) * 3.15);
    const throatPitch = 118 - time * 43;
    const throat =
      Math.sin(Math.PI * 2 * throatPitch * time + Math.sin(time * 47) * 1.9) *
      0.42;
    const jawPulse = Math.max(0, Math.sin(time * 112)) * 0.22;
    const jaw =
      (screamRandom() * 2 - 1) *
      (0.18 + jawPulse) *
      Math.exp(-Math.max(0, time - 0.48) * 2.4);
    const cabinet = Math.sin(Math.PI * 2 * 54 * time) * 0.32;
    return (throat + jaw + cabinet) * attack * release;
  });

  const velvetScream = createMonoBuffer(context, 0.94, (_sample, time) => {
    const attack = clamp(time / 0.003);
    const release = Math.exp(-Math.max(0, time - 0.2) * 4.2);
    const pitch = 2640 * Math.exp(-time * 1.62) + 210;
    const servo =
      Math.sin(Math.PI * 2 * pitch * time + Math.sin(time * 173) * 4.1) * 0.31 +
      Math.sin(Math.PI * 2 * pitch * 0.483 * time) * 0.21;
    const teethGate = Math.sin(time * 198) > 0.2 ? 1 : 0.22;
    const teeth = (screamRandom() * 2 - 1) * teethGate * 0.28;
    return (servo + teeth) * attack * release;
  });

  const avisScream = createMonoBuffer(context, 1.04, (_sample, time) => {
    const attack = clamp(time / 0.006);
    const release = Math.exp(-Math.max(0, time - 0.24) * 3.55);
    const speakerTremolo = 0.56 + Math.sin(Math.PI * 2 * 23 * time) * 0.44;
    const carrier = 960 + Math.sin(time * 28) * 240 + Math.sin(time * 71) * 90;
    const choir =
      Math.sin(Math.PI * 2 * carrier * time + Math.sin(time * 61) * 3.3) * 0.3 +
      Math.sin(Math.PI * 2 * carrier * 1.51 * time) * 0.13;
    const blownSpeaker =
      Math.tanh((screamRandom() * 2 - 1) * 2.8) *
      (0.16 + speakerTremolo * 0.18);
    return (choir * speakerTremolo + blownSpeaker) * attack * release;
  });

  const vulpesScream = createMonoBuffer(context, 0.98, (_sample, time) => {
    const attack = clamp(time / 0.004);
    const release = Math.exp(-Math.max(0, time - 0.22) * 3.9);
    const howlPitch = 640 + Math.sin(time * 18) * 170 - time * 260;
    const howl =
      Math.sin(Math.PI * 2 * howlPitch * time + Math.sin(time * 83) * 2.4) *
      0.32;
    const motorGate = 0.35 + Math.max(0, Math.sin(time * 156)) * 0.65;
    const motor =
      (screamRandom() * 2 - 1) * motorGate * 0.31 +
      Math.sin(Math.PI * 2 * (174 + time * 64) * time) * 0.18;
    return (howl + motor) * attack * release;
  });

  return {
    mechanicalStep,
    metalImpact,
    fan,
    industrialBed,
    tensionBed,
    cctvStatic,
    heartbeat,
    jumpscares: [ursusScream, velvetScream, avisScream, vulpesScream],
  };
}

/**
 * Web Audio engine for M00NW4LK.EXE.
 *
 * Construction is side-effect free. Call unlock() synchronously from a click,
 * pointer or keyboard handler; no context or sound is created before that gesture.
 * Listener/emitter update methods only change AudioParams and never create nodes.
 */
export class SpatialAudioEngine {
  private readonly levels: SpatialAudioLevels;
  private readonly seed: number;
  private readonly random: () => number;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private readonly buses = new Map<SpatialAudioBus, GainNode>();
  private readonly emitters = new Map<string, SpatialEmitter>();
  private readonly persistentSources = new Map<string, PersistentSource>();
  private readonly scheduledSources = new Set<AudioScheduledSourceNode>();
  private readonly trackedNodes = new Map<AudioNode, string>();
  private buffers: ProceduralBuffers | null = null;
  private destroyed = false;
  private contextsCreated = 0;
  private nodesCreated = 0;
  private activeOneShots = 0;
  private readonly nodesCreatedByType: Record<string, number> = {};
  private mascotWarningsPlayed = 0;
  private mascotScreamsPlayed = 0;
  private mascotScreamsFailed = 0;
  private lastMascotVariant: number | null = null;

  constructor(options: SpatialAudioOptions = {}) {
    this.levels = { ...DEFAULT_LEVELS };
    for (const [name, level] of Object.entries(options.levels ?? {})) {
      if (name in this.levels && level !== undefined) {
        this.levels[name as keyof SpatialAudioLevels] = clamp(level);
      }
    }
    this.seed = Math.floor(options.seed ?? 220722);
    this.random = seededRandom(this.seed ^ 0xa0d10);
  }

  get isUnlocked() {
    return this.context !== null && this.context.state !== "closed";
  }

  get audioContext() {
    return this.context;
  }

  /**
   * Must be invoked from a user gesture. It is intentionally the only method
   * that creates an AudioContext, which keeps autoplay policy explicit.
   */
  async unlock() {
    if (this.destroyed) {
      throw new Error("SpatialAudioEngine has already been cleaned up.");
    }
    if (!this.context) this.initializeContext();
    const context = this.context;
    if (!context || context.state === "closed") return false;
    if (context.state !== "running") await context.resume();
    return context.state === "running";
  }

  async pause() {
    const context = this.context;
    if (!context || context.state !== "running") return false;
    await context.suspend();
    return true;
  }

  /**
   * Resumes an already unlocked context. It never creates a new context, so the
   * caller remains responsible for invoking it from an allowed browser event.
   */
  async resume() {
    const context = this.context;
    if (!context || context.state === "closed") return false;
    if (context.state !== "running") await context.resume();
    return context.state === "running";
  }

  setLevels(levels: Partial<SpatialAudioLevels>) {
    for (const [name, rawLevel] of Object.entries(levels)) {
      if (!(name in this.levels) || rawLevel === undefined) continue;
      const busName = name as keyof SpatialAudioLevels;
      const level = clamp(rawLevel);
      this.levels[busName] = level;
      this.setLevelParam(busName, level);
    }
  }

  setBusLevel(bus: keyof SpatialAudioLevels, level: number) {
    this.setLevels({ [bus]: level });
  }

  /**
   * Returns the input node for custom procedural sources. It is null before
   * unlock(); external callers own and must clean up any nodes they connect.
   */
  getBusInput(bus: SpatialAudioBus) {
    return this.buses.get(bus) ?? null;
  }

  setListener(pose: ListenerPose, transitionSeconds = 0.025) {
    const context = this.context;
    if (!context || context.state === "closed") return;
    const now = context.currentTime;
    const listener = context.listener;
    const forward = normalize(pose.forward, { x: 0, y: 0, z: -1 });
    const up = normalize(pose.up ?? DEFAULT_UP, DEFAULT_UP);
    const position = pose.position;

    this.smoothParam(listener.positionX, finite(position.x), now, transitionSeconds);
    this.smoothParam(listener.positionY, finite(position.y), now, transitionSeconds);
    this.smoothParam(listener.positionZ, finite(position.z), now, transitionSeconds);
    this.smoothParam(listener.forwardX, forward.x, now, transitionSeconds);
    this.smoothParam(listener.forwardY, forward.y, now, transitionSeconds);
    this.smoothParam(listener.forwardZ, forward.z, now, transitionSeconds);
    this.smoothParam(listener.upX, up.x, now, transitionSeconds);
    this.smoothParam(listener.upY, up.y, now, transitionSeconds);
    this.smoothParam(listener.upZ, up.z, now, transitionSeconds);
  }

  ensureEmitter(id: string, options: SpatialEmitterOptions = {}) {
    const context = this.requireContext();
    const existing = this.emitters.get(id);
    if (existing) {
      if (options.bus && options.bus !== existing.bus) {
        existing.output.disconnect();
        existing.output.connect(this.requireBus(options.bus));
        existing.bus = options.bus;
      }
      if (options.gain !== undefined) {
        existing.dryGain = clamp(options.gain, 0, 4);
        this.applyEmitterGain(existing);
      }
      return id;
    }

    const panner = this.trackNode(context.createPanner(), "PannerNode");
    const occlusionFilter = this.trackNode(
      context.createBiquadFilter(),
      "BiquadFilterNode",
    );
    const output = this.trackNode(context.createGain(), "GainNode");
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = Math.max(0.1, options.refDistance ?? 1.6);
    panner.maxDistance = Math.max(panner.refDistance, options.maxDistance ?? 42);
    panner.rolloffFactor = Math.max(0, options.rolloffFactor ?? 1.35);
    panner.coneInnerAngle = clamp(options.coneInnerAngle ?? 250, 0, 360);
    panner.coneOuterAngle = clamp(options.coneOuterAngle ?? 330, 0, 360);
    panner.coneOuterGain = clamp(options.coneOuterGain ?? 0.42);
    occlusionFilter.type = "lowpass";
    occlusionFilter.frequency.value = 18000;
    occlusionFilter.Q.value = 0.7;
    output.gain.value = clamp(options.gain ?? 1, 0, 4);
    panner.connect(occlusionFilter);
    occlusionFilter.connect(output);
    const bus = options.bus ?? "sfx";
    output.connect(this.requireBus(bus));
    this.emitters.set(id, {
      bus,
      panner,
      occlusionFilter,
      output,
      dryGain: clamp(options.gain ?? 1, 0, 4),
      occlusion: 0,
    });
    return id;
  }

  updateEmitter(id: string, update: EmitterUpdate, transitionSeconds = 0.035) {
    const context = this.context;
    const emitter = this.emitters.get(id);
    if (!context || !emitter || context.state === "closed") return false;
    const now = context.currentTime;

    if (update.position) {
      const { positionX, positionY, positionZ } = emitter.panner;
      this.smoothParam(positionX, finite(update.position.x), now, transitionSeconds);
      this.smoothParam(positionY, finite(update.position.y), now, transitionSeconds);
      this.smoothParam(positionZ, finite(update.position.z), now, transitionSeconds);
    }
    if (update.orientation) {
      const orientation = normalize(update.orientation, { x: 0, y: 0, z: -1 });
      this.smoothParam(emitter.panner.orientationX, orientation.x, now, transitionSeconds);
      this.smoothParam(emitter.panner.orientationY, orientation.y, now, transitionSeconds);
      this.smoothParam(emitter.panner.orientationZ, orientation.z, now, transitionSeconds);
    }
    if (update.gain !== undefined) {
      emitter.dryGain = clamp(update.gain, 0, 4);
    }
    if (update.occlusion !== undefined) {
      emitter.occlusion = clamp(update.occlusion);
      const cutoff = 18000 * Math.pow(680 / 18000, emitter.occlusion);
      this.smoothParam(
        emitter.occlusionFilter.frequency,
        cutoff,
        now,
        Math.max(transitionSeconds, 0.06),
      );
    }
    if (update.gain !== undefined || update.occlusion !== undefined) {
      this.applyEmitterGain(emitter, transitionSeconds);
    }
    return true;
  }

  removeEmitter(id: string) {
    this.stopFan(id);
    const emitter = this.emitters.get(id);
    if (!emitter) return false;
    emitter.panner.disconnect();
    emitter.occlusionFilter.disconnect();
    emitter.output.disconnect();
    this.releaseNode(emitter.panner);
    this.releaseNode(emitter.occlusionFilter);
    this.releaseNode(emitter.output);
    this.emitters.delete(id);
    return true;
  }

  playMechanicalStep(
    emitterId: string,
    options: Readonly<{ gain?: number; playbackRate?: number }> = {},
  ) {
    const emitter = this.requireEmitter(emitterId, { bus: "sfx" });
    return this.playBuffer(this.requireBuffers().mechanicalStep, emitter.panner, {
      gain: options.gain ?? 0.68,
      playbackRate: options.playbackRate ?? 0.92 + this.random() * 0.16,
    });
  }

  /** Decodes an external sample (e.g. Subject M's hee-hee) in this context. */
  async loadSample(url: string) {
    const context = this.requireContext();
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    return context.decodeAudioData(data);
  }

  /** Plays a decoded sample from a positioned emitter (HRTF, distance, occlusion). */
  playSampleAt(
    emitterId: string,
    buffer: AudioBuffer,
    options: Readonly<{ gain?: number; playbackRate?: number }> = {},
  ) {
    if (this.context?.state !== "running") return false;
    const emitter = this.requireEmitter(emitterId, { bus: "sfx" });
    return this.playBuffer(buffer, emitter.panner, {
      gain: options.gain ?? 1,
      playbackRate: options.playbackRate ?? 1,
    });
  }

  /** A short two-note chime on the SFX bus (tape recovered, exit unlocked). */
  playChime(kind: "tape" | "unlock" | "locked" = "tape") {
    const context = this.context;
    const bus = this.buses.get("sfx");
    if (!context || !bus || context.state !== "running") return false;
    const notes =
      kind === "unlock" ? [392, 523.25, 783.99] : kind === "locked" ? [196, 155.56] : [659.25, 987.77];
    notes.forEach((frequency, index) => {
      const at = context.currentTime + index * 0.11;
      const oscillator = this.trackNode(context.createOscillator(), "OscillatorNode");
      const gain = this.trackNode(context.createGain(), "GainNode");
      oscillator.type = kind === "locked" ? "square" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(SILENCE, at);
      gain.gain.exponentialRampToValueAtTime(kind === "locked" ? 0.08 : 0.16, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(SILENCE, at + 0.45);
      oscillator.connect(gain);
      gain.connect(bus);
      oscillator.start(at);
      oscillator.stop(at + 0.5);
      oscillator.addEventListener("ended", () => {
        gain.disconnect();
        this.releaseNode(oscillator);
        this.releaseNode(gain);
      }, { once: true });
    });
    return true;
  }

  playPlayerStep(gain = 0.18) {
    const bus = this.buses.get("sfx");
    if (!bus || this.context?.state !== "running") return false;
    return this.playBuffer(this.requireBuffers().mechanicalStep, bus, {
      gain: clamp(gain, 0, 1),
      playbackRate: 1.08 + this.random() * 0.12,
    });
  }

  playMetalImpact(
    emitterId: string,
    options: Readonly<{ gain?: number; playbackRate?: number }> = {},
  ) {
    const emitter = this.requireEmitter(emitterId, { bus: "sfx" });
    return this.playBuffer(this.requireBuffers().metalImpact, emitter.panner, {
      gain: options.gain ?? 0.72,
      playbackRate: options.playbackRate ?? 0.88 + this.random() * 0.2,
    });
  }

  startFan(
    emitterId: string,
    position: AudioVector3,
    options: Readonly<{ gain?: number; playbackRate?: number; occlusion?: number }> = {},
  ) {
    if (this.persistentSources.has(emitterId)) return false;
    const context = this.requireContext();
    const emitter = this.requireEmitter(emitterId, {
      bus: "ambience",
      gain: options.gain ?? 0.72,
      refDistance: 1.8,
      maxDistance: 28,
      rolloffFactor: 1.55,
    });
    this.updateEmitter(emitterId, {
      position,
      gain: options.gain ?? 0.72,
      occlusion: options.occlusion ?? 0,
    });
    const source = this.trackNode(context.createBufferSource(), "AudioBufferSourceNode");
    source.buffer = this.requireBuffers().fan;
    source.loop = true;
    source.playbackRate.value = clamp(options.playbackRate ?? 1, 0.45, 2);
    source.connect(emitter.panner);
    this.scheduledSources.add(source);
    this.persistentSources.set(emitterId, { source, emitterId });
    source.addEventListener(
      "ended",
      () => {
        const active = this.persistentSources.get(emitterId);
        if (active?.source === source) this.persistentSources.delete(emitterId);
        this.scheduledSources.delete(source);
        source.disconnect();
        this.releaseNode(source);
      },
      { once: true },
    );
    source.start();
    return true;
  }

  startBeds() {
    const ambience = this.buses.get("ambience");
    const music = this.buses.get("music");
    if (!ambience || !music || this.context?.state !== "running") return false;
    this.startPersistentBuffer(
      "__industrial-bed",
      this.requireBuffers().industrialBed,
      ambience,
      0.34,
      1,
    );
    this.startPersistentBuffer(
      "__tension-bed",
      this.requireBuffers().tensionBed,
      music,
      0.42,
      1,
    );
    return true;
  }

  stopFan(emitterId: string) {
    const persistent = this.persistentSources.get(emitterId);
    if (!persistent) return false;
    this.persistentSources.delete(emitterId);
    try {
      persistent.source.stop();
    } catch {
      // It may already have ended between the lookup and stop().
    }
    return true;
  }

  playCctvStatic(
    options: Readonly<{ duration?: number; gain?: number; playbackRate?: number }> = {},
  ) {
    const context = this.context;
    const bus = this.buses.get("sfx");
    if (!context || !bus || context.state !== "running") return false;
    const duration = clamp(options.duration ?? 0.36, 0.04, 1.8);
    const offset =
      this.random() *
      Math.max(0, this.requireBuffers().cctvStatic.duration - duration);
    return this.playBuffer(this.requireBuffers().cctvStatic, bus, {
      gain: options.gain ?? 0.18,
      playbackRate: options.playbackRate ?? 0.94 + this.random() * 0.12,
      duration,
      offset,
    });
  }

  playHeartbeat(strength = 1) {
    const bus = this.buses.get("heartbeat");
    if (!bus || this.context?.state !== "running") return false;
    return this.playBuffer(this.requireBuffers().heartbeat, bus, {
      gain: clamp(strength, 0, 2) * 0.72,
      playbackRate: 1,
    });
  }

  playJumpscare(strength = 1, variant = 0) {
    return this.playMascotScream(variant, strength);
  }

  playMascotWarning(variant = 0) {
    const bus = this.buses.get("jumpscare");
    const context = this.context;
    this.lastMascotVariant = Math.trunc(variant);
    if (!bus || context?.state !== "running") return false;
    const jumpscares = this.requireBuffers().jumpscares;
    const normalizedVariant =
      ((Math.trunc(variant) % jumpscares.length) + jumpscares.length) %
      jumpscares.length;
    const selected = jumpscares[normalizedVariant];
    const profile = MASCOT_SCREAM_PROFILES[normalizedVariant];
    const played = this.playBuffer(selected, bus, {
      gain: 0.34,
      playbackRate: profile.warningRate,
      duration: Math.min(0.2, selected.duration),
      offset: Math.min(
        selected.duration * 0.18,
        Math.max(0, selected.duration - 0.2),
      ),
    });
    if (played) this.mascotWarningsPlayed += 1;
    return played;
  }

  playMascotScream(variant = 0, strength = 1) {
    const bus = this.buses.get("jumpscare");
    const context = this.context;
    this.lastMascotVariant = Math.trunc(variant);
    if (!bus || context?.state !== "running") {
      this.mascotScreamsFailed += 1;
      return false;
    }
    const jumpscares = this.requireBuffers().jumpscares;
    const normalizedVariant =
      ((Math.trunc(variant) % jumpscares.length) + jumpscares.length) %
      jumpscares.length;
    const selected = jumpscares[normalizedVariant];
    const profile = MASCOT_SCREAM_PROFILES[normalizedVariant];
    const scaledStrength = clamp(strength, 0, 1.5);
    const primary = this.playBuffer(selected, bus, {
      gain: scaledStrength * 1.08,
      playbackRate: profile.primaryRate,
    });
    const mechanicalLayer = this.playBuffer(selected, bus, {
      gain: scaledStrength * 0.38,
      playbackRate: profile.layerRate,
    });
    const played = primary || mechanicalLayer;
    if (played) this.mascotScreamsPlayed += 1;
    else this.mascotScreamsFailed += 1;
    return played;
  }

  getQaCounters(): SpatialAudioQaCounters {
    const contextState = this.destroyed
      ? "destroyed"
      : this.context?.state ?? "uninitialized";
    return {
      contextState,
      contextsCreated: this.contextsCreated,
      nodesCreated: this.nodesCreated,
      activeNodes: this.trackedNodes.size,
      emitters: this.emitters.size,
      activeOneShots: this.activeOneShots,
      activePersistentSources: this.persistentSources.size,
      nodesCreatedByType: { ...this.nodesCreatedByType },
      mascotWarningsPlayed: this.mascotWarningsPlayed,
      mascotScreamsPlayed: this.mascotScreamsPlayed,
      mascotScreamsFailed: this.mascotScreamsFailed,
      lastMascotVariant: this.lastMascotVariant,
    };
  }

  async cleanup() {
    if (this.destroyed) return;
    this.destroyed = true;

    for (const source of this.scheduledSources) {
      try {
        source.stop();
      } catch {
        // A source can finish naturally while cleanup is running.
      }
      source.disconnect();
    }
    this.scheduledSources.clear();
    this.persistentSources.clear();
    this.activeOneShots = 0;

    for (const emitterId of [...this.emitters.keys()]) {
      this.removeEmitter(emitterId);
    }
    for (const bus of this.buses.values()) bus.disconnect();
    this.buses.clear();
    this.master?.disconnect();
    this.compressor?.disconnect();
    this.master = null;
    this.compressor = null;
    this.buffers = null;

    for (const node of this.trackedNodes.keys()) {
      node.disconnect();
    }
    this.trackedNodes.clear();

    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") await context.close();
  }

  private initializeContext() {
    const audioGlobal = globalThis as typeof globalThis & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor =
      audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error("Web Audio is not available in this browser.");
    }

    const context = new AudioContextConstructor({ latencyHint: "interactive" });
    this.context = context;
    this.contextsCreated += 1;

    const master = this.trackNode(context.createGain(), "GainNode");
    const compressor = this.trackNode(
      context.createDynamicsCompressor(),
      "DynamicsCompressorNode",
    );
    master.gain.value = this.levels.master;
    compressor.threshold.value = -17;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.16;
    master.connect(compressor);
    compressor.connect(context.destination);
    this.master = master;
    this.compressor = compressor;

    const busNames: SpatialAudioBus[] = [
      "ambience",
      "music",
      "sfx",
      "heartbeat",
      "jumpscare",
    ];
    for (const busName of busNames) {
      const bus = this.trackNode(context.createGain(), "GainNode");
      bus.gain.value = this.levels[busName];
      bus.connect(master);
      this.buses.set(busName, bus);
    }
    this.buffers = buildProceduralBuffers(context, this.seed);
  }

  private requireContext() {
    const context = this.context;
    if (!context || context.state === "closed") {
      throw new Error("Call SpatialAudioEngine.unlock() from a user gesture first.");
    }
    return context;
  }

  private requireBus(bus: SpatialAudioBus) {
    const input = this.buses.get(bus);
    if (!input) {
      throw new Error("Audio buses are unavailable before unlock().");
    }
    return input;
  }

  private requireEmitter(id: string, options: SpatialEmitterOptions) {
    if (!this.emitters.has(id)) this.ensureEmitter(id, options);
    const emitter = this.emitters.get(id);
    if (!emitter) throw new Error(`Unable to create spatial emitter "${id}".`);
    return emitter;
  }

  private requireBuffers() {
    if (!this.buffers) {
      throw new Error("Procedural audio buffers are unavailable before unlock().");
    }
    return this.buffers;
  }

  private setLevelParam(bus: keyof SpatialAudioLevels, level: number) {
    const context = this.context;
    if (!context || context.state === "closed") return;
    const node = bus === "master" ? this.master : this.buses.get(bus);
    if (!node) return;
    this.smoothParam(node.gain, level, context.currentTime, 0.045);
  }

  private applyEmitterGain(emitter: SpatialEmitter, transitionSeconds = 0.06) {
    const context = this.context;
    if (!context || context.state === "closed") return;
    const occlusionGain = 1 - emitter.occlusion * 0.58;
    this.smoothParam(
      emitter.output.gain,
      emitter.dryGain * occlusionGain,
      context.currentTime,
      transitionSeconds,
    );
  }

  private smoothParam(
    parameter: AudioParam,
    value: number,
    now: number,
    transitionSeconds: number,
  ) {
    parameter.cancelScheduledValues(now);
    if (transitionSeconds <= 0) {
      parameter.setValueAtTime(value, now);
    } else {
      parameter.setTargetAtTime(value, now, Math.max(0.001, transitionSeconds));
    }
  }

  private playBuffer(
    buffer: AudioBuffer,
    destination: AudioNode,
    options: Readonly<{
      gain: number;
      playbackRate: number;
      duration?: number;
      offset?: number;
    }>,
  ) {
    const context = this.context;
    if (!context || context.state !== "running") return false;
    const source = this.trackNode(context.createBufferSource(), "AudioBufferSourceNode");
    const gain = this.trackNode(context.createGain(), "GainNode");
    const now = context.currentTime;
    source.buffer = buffer;
    source.playbackRate.value = clamp(options.playbackRate, 0.25, 4);
    gain.gain.setValueAtTime(SILENCE, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(SILENCE, clamp(options.gain, 0, 4)),
      now + 0.006,
    );
    const audibleDuration =
      options.duration ?? buffer.duration / source.playbackRate.value;
    gain.gain.exponentialRampToValueAtTime(
      SILENCE,
      now + Math.max(0.012, audibleDuration),
    );
    source.connect(gain);
    gain.connect(destination);
    this.scheduledSources.add(source);
    this.activeOneShots += 1;
    source.addEventListener(
      "ended",
      () => {
        this.scheduledSources.delete(source);
        source.disconnect();
        gain.disconnect();
        this.releaseNode(source);
        this.releaseNode(gain);
        this.activeOneShots = Math.max(0, this.activeOneShots - 1);
      },
      { once: true },
    );
    if (options.duration !== undefined) {
      source.start(now, options.offset ?? 0, options.duration);
    } else {
      source.start(now, options.offset ?? 0);
    }
    return true;
  }

  private startPersistentBuffer(
    id: string,
    buffer: AudioBuffer,
    destination: AudioNode,
    gainValue: number,
    playbackRate: number,
  ) {
    if (this.persistentSources.has(id)) return false;
    const context = this.requireContext();
    const source = this.trackNode(
      context.createBufferSource(),
      "AudioBufferSourceNode",
    );
    const gain = this.trackNode(context.createGain(), "GainNode");
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = clamp(playbackRate, 0.25, 4);
    gain.gain.value = clamp(gainValue, 0, 4);
    source.connect(gain);
    gain.connect(destination);
    this.scheduledSources.add(source);
    this.persistentSources.set(id, { source, emitterId: id });
    source.addEventListener(
      "ended",
      () => {
        const active = this.persistentSources.get(id);
        if (active?.source === source) this.persistentSources.delete(id);
        this.scheduledSources.delete(source);
        source.disconnect();
        gain.disconnect();
        this.releaseNode(source);
        this.releaseNode(gain);
      },
      { once: true },
    );
    source.start();
    return true;
  }

  private trackNode<T extends AudioNode>(node: T, type: string) {
    this.nodesCreated += 1;
    this.nodesCreatedByType[type] = (this.nodesCreatedByType[type] ?? 0) + 1;
    this.trackedNodes.set(node, type);
    return node;
  }

  private releaseNode(node: AudioNode) {
    this.trackedNodes.delete(node);
  }
}
