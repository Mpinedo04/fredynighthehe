"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  CONTINUITY_IDS,
  FNAF_MILESTONES,
  MICRO_TARGETS,
  SECRET_STORAGE_KEY,
  completeSecret,
  completedSecretCount,
  createSecretProgress,
  findContinuityClue,
  invertScrollDelta,
  mirrorScrollPosition,
  microtoneFromPoint,
  nextFnafMilestone,
  parseSecretProgress,
  registerScrollReversal,
  resolveFnafMilestone,
  type ContinuityId,
  type SecretId,
  type SecretProgressV1,
} from "./secret-system.mjs";
import { audioContext } from "./audio/engine";
import { ACHIEVEMENTS } from "./prank-system.mjs";
import { ACHIEVEMENT_TOTAL, resetAchievements, useAchievements } from "./pranks/Achievements";
import { announceMicroNote, drainPower, fireScare } from "./pranks/bus";
import { updateNight } from "./ui/nightStore";
import { showToast } from "./ui/Toasts";

type ActiveMode =
  | "spielberg"
  | "fnaf"
  | "fnaf-ending"
  | "micro"
  | "micro-finale"
  | "director"
  | null;

type SecretExtrasProps = {
  started: boolean;
  scrollDepth: number;
  soundOn: boolean;
  blocked: boolean;
  beaconVisible: boolean;
  onExclusiveChange: (exclusive: boolean) => void;
};

type MicroDot = {
  id: number;
  x: number;
  y: number;
  step: number;
  octave: number;
  frequency: number;
};

type MicroReadout = {
  step: number;
  octave: number;
  frequency: number;
};

type FnafEncounter = {
  milestone: number;
  image: string;
  name: string;
  host: HTMLElement | null;
};

const SECRET_LABELS: Record<SecretId, string> = {
  spielberg: "INVERSIÓN DE PROYECCIÓN",
  nightShift: "TURNO NOCTURNO",
  microtonal: "LABORATORIO 24 TET",
  continuity: "ERRORES DE CONTINUIDAD",
};

const CONTINUITY_CLUES: Record<
  ContinuityId,
  { selector: string; label: string; note: string; glyph: string }
> = {
  hero: {
    selector: '[data-secret-anchor="hero"]',
    label: "Claqueta con número de toma incorrecto",
    note: "TOMA 23. Alguien ha rodado una escena que todavía no existe.",
    glyph: "23",
  },
  project: {
    selector: '[data-secret-anchor="project"]',
    label: "Sombrero infiltrado en la producción",
    note: "Atrezzo no autorizado: un fedora ha entrado en continuidad.",
    glyph: "♠",
  },
  friends: {
    selector: '[data-secret-anchor="friends"]',
    label: "Ojos de animatrónico en la fotografía",
    note: "Dos miembros del reparto no aparecen en la hoja de llamada.",
    glyph: "••",
  },
  trailer: {
    selector: '[data-secret-anchor="trailer"]',
    label: "Cámara duplicada en el cartel del montaje",
    note: "La cámara B figura dos veces. El presupuesto solo pagó una.",
    glyph: "▣",
  },
};

const FNAF_ROSTER = [
  { image: "/animatronics/ursus-9.webp", name: "URSUS-9" },
  { image: "/animatronics/velvet-r.webp", name: "VELVET-R" },
  { image: "/animatronics/avis-3.webp", name: "AVIS-3" },
  { image: "/animatronics/vulpes-x.webp", name: "VULPES-X" },
] as const;

const SECRET_FRAME_SELECTOR = [
  ".hero-still",
  ".portrait-frame",
  ".project-focus",
  ".photo-placeholder",
  ".dossier-evidence figure",
  ".reference-card",
  ".testimonials article",
  ".trailer-poster",
].join(",");

const MICRO_EXCLUDED_SELECTOR =
  "a,button,input,textarea,select,iframe,video,audio,[role='dialog'],[data-hee-control]";

function reducedMotionEnabled() {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function SecretExtras({
  started,
  scrollDepth,
  soundOn,
  blocked,
  beaconVisible,
  onExclusiveChange,
}: SecretExtrasProps) {
  const [progress, setProgress] = useState<SecretProgressV1>(() => {
    if (typeof window === "undefined") return createSecretProgress();
    try {
      return parseSecretProgress(window.localStorage.getItem(SECRET_STORAGE_KEY));
    } catch {
      return createSecretProgress();
    }
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);
  const [spielbergProgress, setSpielbergProgress] = useState(0);
  const [fnafEncounter, setFnafEncounter] = useState<FnafEncounter | null>(null);
  const [fnafEnding, setFnafEnding] = useState<"six-am" | "scare" | null>(null);
  const [microUnlockClicks, setMicroUnlockClicks] = useState(0);
  const [microDots, setMicroDots] = useState<MicroDot[]>([]);
  const [microWaveform, setMicroWaveform] = useState<OscillatorType>("triangle");
  const [microTempo, setMicroTempo] = useState(112);
  const [microReadout, setMicroReadout] = useState<MicroReadout>({
    step: 0,
    octave: 2,
    frequency: 220,
  });
  const [directorCut, setDirectorCut] = useState(false);
  const [anchors, setAnchors] = useState<Partial<Record<ContinuityId, Element>>>({});

  const progressRef = useRef(progress);
  const activeModeRef = useRef<ActiveMode>(activeMode);
  const blockedRef = useRef(blocked);
  const soundOnRef = useRef(soundOn);
  const spielbergRafRef = useRef<number | null>(null);
  const inversionHeightRef = useRef(0);
  const inversionTouchYRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const lastScrollDirectionRef = useRef(0);
  const reversalHistoryRef = useRef<number[]>([]);
  const encounterTimerRef = useRef<number | null>(null);
  const runtimeTimersRef = useRef<Set<number>>(new Set());
  const encounterRef = useRef<FnafEncounter | null>(null);
  const scareAudioRef = useRef<HTMLAudioElement | null>(null);
  const microUnlockRef = useRef(0);
  const microIdRef = useRef(0);
  const microDotsRef = useRef<MicroDot[]>([]);
  const microReadoutRafRef = useRef<number | null>(null);
  const pendingMicroReadoutRef = useRef<MicroReadout | null>(null);
  const cancelRuntimeRef = useRef<() => void>(() => undefined);

  const completedCount = completedSecretCount(progress);
  const achievementState = useAchievements();
  const exclusive = activeMode !== null;

  const addTimer = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      runtimeTimersRef.current.delete(timer);
      callback();
    }, delay);
    runtimeTimersRef.current.add(timer);
    return timer;
  }, []);

  const clearRuntimeTimers = useCallback(() => {
    runtimeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    runtimeTimersRef.current.clear();
    if (encounterTimerRef.current !== null) {
      window.clearTimeout(encounterTimerRef.current);
      encounterTimerRef.current = null;
    }
  }, []);

  const getAudioContext = useCallback(() => {
    if (!soundOnRef.current || typeof window === "undefined") return null;
    return audioContext();
  }, []);

  const playProjectionEffect = useCallback(() => {
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(55, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 1.55);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 1.55);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 1.62);
  }, [getAudioContext]);

  const playMicroNote = useCallback(
    (frequency: number, clientX: number, duration = 0.48, volume = 0.075) => {
      const context = getAudioContext();
      if (!context) return;
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = microWaveform;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      const panner = context.createStereoPanner();
      panner.pan.value = Math.max(
        -1,
        Math.min(1, (clientX / window.innerWidth) * 2 - 1),
      );
      gain.connect(panner);
      panner.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    },
    [getAudioContext, microWaveform],
  );

  const playMicroSequence = useCallback(() => {
    const dots = microDotsRef.current;
    const context = getAudioContext();
    if (!context || dots.length === 0) return;
    const stepDuration = 60 / microTempo / 2;
    const now = context.currentTime + 0.04;
    dots.forEach((dot, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      const startsAt = now + index * stepDuration;
      oscillator.type = microWaveform;
      oscillator.frequency.value = dot.frequency;
      panner.pan.value = Math.max(-1, Math.min(1, (dot.x / window.innerWidth) * 2 - 1));
      gain.gain.setValueAtTime(0.0001, startsAt);
      gain.gain.exponentialRampToValueAtTime(0.055, startsAt + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + stepDuration * 0.82);
      oscillator.connect(gain);
      gain.connect(panner);
      panner.connect(context.destination);
      oscillator.start(startsAt);
      oscillator.stop(startsAt + stepDuration);
    });
  }, [getAudioContext, microTempo, microWaveform]);

  const playMicroFinale = useCallback(
    (dots: MicroDot[]) => {
      const context = getAudioContext();
      if (!context || dots.length === 0) return;
      const now = context.currentTime + 0.06;
      dots.filter((_, index) => index % 3 === 0).forEach((dot, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startsAt = now + index * 0.13;
        oscillator.type = index % 2 ? "sine" : "triangle";
        oscillator.frequency.value = dot.frequency;
        gain.gain.setValueAtTime(0.0001, startsAt);
        gain.gain.exponentialRampToValueAtTime(0.04, startsAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.42);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startsAt);
        oscillator.stop(startsAt + 0.45);
      });
    },
    [getAudioContext],
  );

  const restoreSpielbergInversion = useCallback(() => {
    if (spielbergRafRef.current !== null) {
      window.cancelAnimationFrame(spielbergRafRef.current);
      spielbergRafRef.current = null;
    }
    if (typeof document !== "undefined") {
      const experience = document.querySelector<HTMLElement>(".experience");
      if (experience?.classList.contains("spielberg-inverted")) {
        const documentHeight = Math.max(
          inversionHeightRef.current,
          document.documentElement.scrollHeight,
        );
        const restoredY = mirrorScrollPosition(
          window.scrollY,
          documentHeight,
          window.innerHeight,
        );
        experience.classList.remove("spielberg-inverted");
        document.documentElement.classList.remove("spielberg-inversion-active");
        window.scrollTo(0, restoredY);
      }
    }
    programmaticScrollRef.current = false;
  }, []);

  const finishSpielberg = useCallback(
    (completed: boolean) => {
      restoreSpielbergInversion();
      setSpielbergProgress(0);
      if (completed) {
        setProgress((current) => completeSecret(current, "spielberg"));
      }
      setActiveMode(null);
    },
    [restoreSpielbergInversion],
  );

  const clearEncounterHost = useCallback(() => {
    encounterRef.current?.host?.classList.remove("secret-host-frame");
  }, []);

  const cancelRuntime = useCallback(() => {
    clearRuntimeTimers();
    restoreSpielbergInversion();
    clearEncounterHost();
    scareAudioRef.current?.pause();
    scareAudioRef.current = null;
    document.body.classList.remove("secret-director-cut");
    setActiveMode(null);
    setSpielbergProgress(0);
    setFnafEncounter(null);
    setFnafEnding(null);
    setMicroDots([]);
    microDotsRef.current = [];
    setMicroUnlockClicks(0);
    microUnlockRef.current = 0;
    if (microReadoutRafRef.current !== null) {
      window.cancelAnimationFrame(microReadoutRafRef.current);
      microReadoutRafRef.current = null;
    }
    pendingMicroReadoutRef.current = null;
    setDirectorCut(false);
  }, [clearEncounterHost, clearRuntimeTimers, restoreSpielbergInversion]);

  const triggerSpielberg = useCallback(() => {
    if (
      activeModeRef.current ||
      blockedRef.current ||
      progressRef.current.completed.includes("spielberg")
    ) {
      return;
    }

    const experience = document.querySelector<HTMLElement>(".experience");
    if (!experience) return;

    setActiveMode("spielberg");
    reversalHistoryRef.current = [];
    programmaticScrollRef.current = true;
    playProjectionEffect();

    const reduced = reducedMotionEnabled();
    const startY = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const mirroredY = mirrorScrollPosition(
      startY,
      documentHeight,
      window.innerHeight,
    );
    const duration = reduced ? 8000 : 14000;
    const startedAt = performance.now();
    inversionHeightRef.current = documentHeight;
    experience.classList.add("spielberg-inverted");
    document.documentElement.classList.add("spielberg-inversion-active");
    window.scrollTo(0, mirroredY);

    const animate = (now: number) => {
      const normalized = Math.min(1, (now - startedAt) / duration);
      setSpielbergProgress(normalized);
      if (normalized < 1) {
        spielbergRafRef.current = window.requestAnimationFrame(animate);
      } else {
        finishSpielberg(true);
      }
    };
    spielbergRafRef.current = window.requestAnimationFrame(animate);
  }, [finishSpielberg, playProjectionEffect]);

  const resolveEncounter = useCallback(
    (caught: boolean) => {
      const current = encounterRef.current;
      if (!current) return;
      if (encounterTimerRef.current !== null) {
        window.clearTimeout(encounterTimerRef.current);
        encounterTimerRef.current = null;
      }
      current.host?.classList.remove("secret-host-frame");
      setProgress((previous) =>
        resolveFnafMilestone(previous, current.milestone, caught),
      );
      if (!caught) drainPower(10);
      showToast({
        key: "fnaf",
        kicker: "TURNO NOCTURNO · CCTV",
        title: caught
          ? `${current.name} INTERCEPTADO`
          : `${current.name} CAMBIÓ DE CÁMARA`,
        body: caught ? "Energía conservada. Buen reflejo." : "Energía −10%. La próxima vez, pulsa antes.",
        tone: caught ? "green" : "red",
        image: current.image,
        duration: 2400,
      });
      setFnafEncounter(null);
      setActiveMode(null);
    },
    [],
  );

  const chooseVisibleHost = useCallback((milestone: number) => {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(SECRET_FRAME_SELECTOR),
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.width >= 150 &&
        rect.height >= 100 &&
        rect.bottom > 90 &&
        rect.top < window.innerHeight - 60
      );
    });
    if (candidates.length === 0) return null;
    return candidates[(FNAF_MILESTONES.indexOf(milestone) * 3) % candidates.length];
  }, []);

  const startFnafEncounter = useCallback(
    (milestone: number) => {
      if (activeModeRef.current || blockedRef.current) return;
      const rosterIndex = FNAF_MILESTONES.indexOf(milestone) % FNAF_ROSTER.length;
      const mascot = FNAF_ROSTER[rosterIndex];
      const host = chooseVisibleHost(milestone);
      host?.classList.add("secret-host-frame");
      const nextEncounter = { milestone, ...mascot, host };
      encounterRef.current = nextEncounter;
      setFnafEncounter(nextEncounter);
      setActiveMode("fnaf");
      fireScare();
      encounterTimerRef.current = window.setTimeout(() => {
        resolveEncounter(false);
      }, 4000);
    },
    [chooseVisibleHost, resolveEncounter],
  );

  const finishFnafNight = useCallback(() => {
    scareAudioRef.current?.pause();
    scareAudioRef.current = null;
    setProgress((current) => completeSecret(current, "nightShift"));
    setFnafEnding(null);
    setActiveMode(null);
  }, []);

  const triggerFnafEnding = useCallback(() => {
    if (activeModeRef.current || blockedRef.current) return;
    const scare = progressRef.current.fnafMissed >= 3;
    setActiveMode("fnaf-ending");
    setFnafEnding(scare ? "scare" : "six-am");
    if (scare) fireScare();
    if (scare && soundOnRef.current) {
      const sample = new Audio("/audio/fnaf-jumpscare-scream.mp3");
      sample.volume = 0.28;
      sample.playbackRate = 0.9;
      scareAudioRef.current = sample;
      void sample.play().catch(() => undefined);
      addTimer(() => sample.pause(), 780);
    }
    addTimer(finishFnafNight, scare ? 2100 : 2800);
  }, [addTimer, finishFnafNight]);

  const startMicroLab = useCallback(() => {
    if (
      blockedRef.current ||
      activeModeRef.current
    ) {
      return;
    }
    setMicroDots([]);
    microDotsRef.current = [];
    setActiveMode("micro");
  }, []);

  const finishMicroLab = useCallback(() => {
    setProgress((current) => completeSecret(current, "microtonal"));
    setMicroDots([]);
    microDotsRef.current = [];
    setMicroUnlockClicks(0);
    microUnlockRef.current = 0;
    setActiveMode(null);
  }, []);

  const undoMicroNote = useCallback(() => {
    const next = microDotsRef.current.slice(0, -1);
    microDotsRef.current = next;
    setMicroDots(next);
  }, []);

  const clearMicroNotes = useCallback(() => {
    microDotsRef.current = [];
    setMicroDots([]);
  }, []);

  const finishDirectorCut = useCallback(() => {
    document.body.classList.remove("secret-director-cut");
    setDirectorCut(false);
    setActiveMode(null);
  }, []);

  const startDirectorCut = useCallback(() => {
    if (blockedRef.current || activeModeRef.current) return;
    setProgress((current) => completeSecret(current, "continuity"));
    setDirectorCut(true);
    setActiveMode("director");
    document.body.classList.add("secret-director-cut");
    addTimer(finishDirectorCut, 12000);
  }, [addTimer, finishDirectorCut]);

  const handleContinuityClue = useCallback(
    (clueId: ContinuityId) => {
      if (blockedRef.current || activeModeRef.current) return;
      const clue = CONTINUITY_CLUES[clueId];
      const next = findContinuityClue(progressRef.current, clueId);
      if (next.continuityFound.length === progressRef.current.continuityFound.length) {
        return;
      }
      setProgress(next);
      showToast({
        key: "continuity",
        kicker: `NOTA DE SCRIPT · CONTINUIDAD ${next.continuityFound.length}/4`,
        title: clue.label.toUpperCase(),
        body: clue.note,
        tone: "amber",
        duration: 3200,
      });
      if (next.continuityFound.length === CONTINUITY_IDS.length) {
        startDirectorCut();
      }
    },
    [startDirectorCut],
  );

  const resetSecrets = useCallback(() => {
    if (!resetArmed) {
      setResetArmed(true);
      addTimer(() => setResetArmed(false), 4500);
      return;
    }
    cancelRuntime();
    resetAchievements();
    const empty = createSecretProgress();
    setProgress(empty);
    setResetArmed(false);
    setMicroUnlockClicks(0);
    microUnlockRef.current = 0;
    reversalHistoryRef.current = [];
    try {
      window.localStorage.removeItem(SECRET_STORAGE_KEY);
    } catch {
      // Local storage can be disabled without disabling the extras.
    }
  }, [addTimer, cancelRuntime, resetArmed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SECRET_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // The games continue in memory when persistence is unavailable.
    }
  }, [progress]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // The topbar clock shows the night-shift objectives (no separate HUD).
  useEffect(() => {
    updateNight({
      caught: progress.fnafCaught.length,
      objectives: FNAF_MILESTONES.length,
      shiftActive: started && scrollDepth >= 25 && !progress.completed.includes("nightShift"),
    });
  }, [progress, scrollDepth, started]);

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    encounterRef.current = fnafEncounter;
  }, [fnafEncounter]);

  useEffect(() => {
    microDotsRef.current = microDots;
  }, [microDots]);

  useEffect(() => {
    cancelRuntimeRef.current = cancelRuntime;
  }, [cancelRuntime]);

  useEffect(() => {
    onExclusiveChange(exclusive);
  }, [exclusive, onExclusiveChange]);

  useEffect(() => () => onExclusiveChange(false), [onExclusiveChange]);

  useEffect(() => {
    if (!started) return;
    const findAnchors = () => {
      const next: Partial<Record<ContinuityId, Element>> = {};
      CONTINUITY_IDS.forEach((id) => {
        const element = document.querySelector(CONTINUITY_CLUES[id].selector);
        if (element) next[id] = element;
      });
      setAnchors(next);
    };
    findAnchors();
    window.addEventListener("resize", findAnchors);
    return () => window.removeEventListener("resize", findAnchors);
  }, [started]);

  useEffect(() => {
    if (!started || blocked || progress.completed.includes("spielberg")) return;
    lastScrollYRef.current = window.scrollY;
    const handleScroll = () => {
      if (programmaticScrollRef.current || activeModeRef.current || blockedRef.current) {
        lastScrollYRef.current = window.scrollY;
        return;
      }
      const nextY = window.scrollY;
      const delta = nextY - lastScrollYRef.current;
      if (Math.abs(delta) < 7) return;
      const direction = Math.sign(delta);
      if (
        lastScrollDirectionRef.current !== 0 &&
        direction !== lastScrollDirectionRef.current
      ) {
        const result = registerScrollReversal(
          reversalHistoryRef.current,
          performance.now(),
        );
        reversalHistoryRef.current = result.history;
        if (result.triggered) triggerSpielberg();
      }
      lastScrollDirectionRef.current = direction;
      lastScrollYRef.current = nextY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [blocked, progress.completed, started, triggerSpielberg]);

  useEffect(() => {
    if (activeMode !== "spielberg") return;

    const scrollInverted = (delta: number) => {
      window.scrollBy({ top: invertScrollDelta(delta), left: 0, behavior: "auto" });
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      scrollInverted(event.deltaY);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input,textarea,select,button,a") &&
        event.key !== "Escape"
      ) {
        return;
      }

      const keyDeltas: Record<string, number> = {
        ArrowDown: 90,
        ArrowUp: -90,
        PageDown: window.innerHeight * 0.82,
        PageUp: -window.innerHeight * 0.82,
      };
      if (event.key in keyDeltas) {
        event.preventDefault();
        scrollInverted(keyDeltas[event.key]);
      } else if (event.key === " ") {
        event.preventDefault();
        scrollInverted((event.shiftKey ? -1 : 1) * window.innerHeight * 0.82);
      } else if (event.key === "Home") {
        event.preventDefault();
        window.scrollTo(0, document.documentElement.scrollHeight);
      } else if (event.key === "End") {
        event.preventDefault();
        window.scrollTo(0, 0);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finishSpielberg(true);
      }
    };
    const handleTouchStart = (event: TouchEvent) => {
      inversionTouchYRef.current = event.touches[0]?.clientY ?? null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const nextY = event.touches[0]?.clientY;
      const previousY = inversionTouchYRef.current;
      if (nextY === undefined || previousY === null) return;
      event.preventDefault();
      scrollInverted(previousY - nextY);
      inversionTouchYRef.current = nextY;
    };
    const handleTouchEnd = () => {
      inversionTouchYRef.current = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      inversionTouchYRef.current = null;
    };
  }, [activeMode, finishSpielberg]);

  useEffect(() => {
    if (
      !started ||
      blocked ||
      activeMode ||
      progress.completed.includes("nightShift") ||
      scrollDepth < 25
    ) {
      return;
    }
    const milestone = nextFnafMilestone(scrollDepth, progress.fnafHandled);
    if (milestone !== null) startFnafEncounter(milestone);
  }, [activeMode, blocked, progress, scrollDepth, startFnafEncounter, started]);

  useEffect(() => {
    if (
      !started ||
      blocked ||
      activeMode ||
      scrollDepth < 95 ||
      progress.completed.includes("nightShift") ||
      progress.fnafHandled.length < FNAF_MILESTONES.length
    ) {
      return;
    }
    triggerFnafEnding();
  }, [activeMode, blocked, progress, scrollDepth, started, triggerFnafEnding]);

  const registerMicroUnlock = useCallback(() => {
    if (!started || blockedRef.current || activeModeRef.current) {
      return;
    }
    microUnlockRef.current = Math.min(3, microUnlockRef.current + 1);
    setMicroUnlockClicks(microUnlockRef.current);
    if (microUnlockRef.current >= 3) startMicroLab();
  }, [startMicroLab, started]);

  useEffect(() => {
    const handleUnlock = () => registerMicroUnlock();
    window.addEventListener("premiere22:micro-unlock", handleUnlock);
    return () => window.removeEventListener("premiere22:micro-unlock", handleUnlock);
  }, [registerMicroUnlock]);

  useEffect(() => {
    if (activeMode !== "micro") return;
    const updateReadout = (event: PointerEvent) => {
      pendingMicroReadoutRef.current = microtoneFromPoint(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );
      if (microReadoutRafRef.current !== null) return;
      microReadoutRafRef.current = window.requestAnimationFrame(() => {
        if (pendingMicroReadoutRef.current) {
          setMicroReadout(pendingMicroReadoutRef.current);
        }
        pendingMicroReadoutRef.current = null;
        microReadoutRafRef.current = null;
      });
    };
    const handlePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        target.closest(MICRO_EXCLUDED_SELECTOR) ||
        event.button !== 0
      ) {
        return;
      }
      const tone = microtoneFromPoint(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );
      setMicroReadout(tone);
      playMicroNote(tone.frequency, event.clientX);
      announceMicroNote(tone.step);
      if (microDotsRef.current.length >= 24) return;
      const next = [
        ...microDotsRef.current,
        {
          id: microIdRef.current++,
          x: event.clientX,
          y: event.clientY,
          ...tone,
        },
      ];
      microDotsRef.current = next;
      setMicroDots(next);
      if (next.length === 24) {
        activeModeRef.current = "micro-finale";
        setActiveMode("micro-finale");
        playMicroFinale(next);
        addTimer(finishMicroLab, 5600);
      }
    };
    document.addEventListener("pointermove", updateReadout, true);
    document.addEventListener("pointerdown", handlePointer, true);
    return () => {
      document.removeEventListener("pointermove", updateReadout, true);
      document.removeEventListener("pointerdown", handlePointer, true);
      if (microReadoutRafRef.current !== null) {
        window.cancelAnimationFrame(microReadoutRafRef.current);
        microReadoutRafRef.current = null;
      }
      pendingMicroReadoutRef.current = null;
    };
  }, [activeMode, addTimer, finishMicroLab, playMicroFinale, playMicroNote]);

  useEffect(() => {
    if (!blocked || !activeModeRef.current) return;
    cancelRuntime();
  }, [blocked, cancelRuntime]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) cancelRuntimeRef.current();
    };
    const handleBlur = () => cancelRuntimeRef.current();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      cancelRuntimeRef.current();
    };
  }, []);

  const fnafHour = progress.completed.includes("nightShift")
    ? 6
    : Math.min(5, progress.fnafHandled.length);

  const secretStatus = useMemo(
    () => ({
      spielberg: progress.completed.includes("spielberg") ? "COMPLETO" : "NO DETECTADO",
      nightShift: progress.completed.includes("nightShift")
        ? "6 AM · SUPERADO"
        : `${fnafHour === 0 ? "12" : fnafHour} AM · ${progress.fnafCaught.length}/${FNAF_MILESTONES.length}`,
      microtonal: progress.completed.includes("microtonal")
        ? "24/24 · COMPLETO"
        : `${microUnlockClicks}/3 · BLOQUEADO`,
      continuity: progress.completed.includes("continuity")
        ? "4/4 · DIRECTOR'S CUT"
        : `${progress.continuityFound.length}/4 · ENCONTRADOS`,
    }),
    [fnafHour, microUnlockClicks, progress],
  );

  const renderContinuityClue = (clueId: ContinuityId) => {
    const anchor = anchors[clueId];
    if (
      !anchor ||
      progress.continuityFound.includes(clueId) ||
      blocked ||
      activeMode
    ) {
      return null;
    }
    const clue = CONTINUITY_CLUES[clueId];
    return createPortal(
      <button
        type="button"
        className={`continuity-clue continuity-${clueId}`}
        onClick={() => handleContinuityClue(clueId)}
        aria-label={clue.label}
        data-hee-control
      >
        <span aria-hidden="true">{clue.glyph}</span>
        <small>ERROR</small>
      </button>,
      anchor,
    );
  };

  const renderFnafEncounter = () => {
    if (!fnafEncounter) return null;
    const target = (
      <button
        type="button"
        className={fnafEncounter.host ? "fnaf-secret-target" : "fnaf-secret-target fallback"}
        onClick={() => resolveEncounter(true)}
        aria-label={`Interceptar a ${fnafEncounter.name}`}
        data-hee-control
      >
        <img src={fnafEncounter.image} alt="" />
        <span>INTERCEPTAR</span>
        <i aria-hidden="true" />
      </button>
    );
    return fnafEncounter.host ? createPortal(target, fnafEncounter.host) : target;
  };

  if (!started) return null;

  return (
    <>
      {started && !blocked && activeMode === null && beaconVisible && (
        <button
          type="button"
          className={`micro-discovery-beacon ${progress.completed.includes("microtonal") ? "replay" : ""}`}
          onClick={registerMicroUnlock}
          aria-label={`Abrir laboratorio 24 TET. ${microUnlockClicks} de 3 pulsos realizados`}
          data-hee-control
        >
          <span>{progress.completed.includes("microtonal") ? "LAB COMPLETADO · REPETIR" : "LABORATORIO MICROTONAL"}</span>
          <strong>24 <b>TET</b></strong>
          <small>{microUnlockClicks === 0 ? "PULSA 3 VECES" : `${3 - microUnlockClicks} PULSO${3 - microUnlockClicks === 1 ? "" : "S"} MÁS`}</small>
          <i aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <b key={index} className={index < microUnlockClicks ? "active" : ""} />
            ))}
          </i>
        </button>
      )}

      <aside className={`secret-console ${panelOpen ? "open" : ""}`} data-hee-control>
        <button
          type="button"
          className="secret-console-tab"
          onClick={() => setPanelOpen((current) => !current)}
          aria-expanded={panelOpen}
          aria-controls="secret-console-panel"
        >
          <span>EXTRAS</span>
          <strong>{completedCount}/4</strong>
        </button>
        <div id="secret-console-panel" className="secret-console-panel">
          <header>
            <div>
              <small>ARCHIVOS FUERA DE GUIÓN</small>
              <strong>EXTRAS DE RAÚL</strong>
            </div>
            <span>{completedCount === 4 ? "MASTER COMPLETO" : "BUSCANDO SEÑALES"}</span>
          </header>
          <div className="secret-console-list">
            {(Object.keys(SECRET_LABELS) as SecretId[]).map((secretId, index) => (
              <div
                key={secretId}
                className={progress.completed.includes(secretId) ? "complete" : ""}
              >
                <span>0{index + 1}</span>
                <p>
                  <strong>{SECRET_LABELS[secretId]}</strong>
                  <small>{secretStatus[secretId]}</small>
                </p>
                <b>{progress.completed.includes(secretId) ? "✓" : "○"}</b>
              </div>
            ))}
          </div>
          <div className="secret-console-achievements">
            <header>
              <small>LOGROS · 22G CADA UNO</small>
              <strong>{achievementState.unlocked.length}/{ACHIEVEMENT_TOTAL}</strong>
            </header>
            <ul>
              {ACHIEVEMENTS.map((achievement) => {
                const done = achievementState.unlocked.includes(achievement.id);
                return (
                  <li key={achievement.id} className={done ? "complete" : ""}>
                    <b aria-hidden="true">{done ? "🏆" : "🔒"}</b>
                    <span>
                      <strong>{done ? achievement.title : "???"}</strong>
                      <small>{done ? achievement.detail : "Sigue buscando."}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <button type="button" className="secret-reset" onClick={resetSecrets}>
            {resetArmed ? "CONFIRMAR REINICIO" : "REINICIAR LOS 4 EXTRAS"}
            <span>{resetArmed ? "!" : "↺"}</span>
          </button>
        </div>
      </aside>

      {renderFnafEncounter()}

      {activeMode === "spielberg" && typeof document !== "undefined" && createPortal(
        <div className="spielberg-inversion" role="dialog" aria-modal="true" data-hee-control>
          <div className="spielberg-inversion-film" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
          </div>
          <div className="spielberg-cursor screen-up" aria-hidden="true">↓ SUBE</div>
          <div className="spielberg-cursor screen-down" aria-hidden="true">↑ BAJA</div>
          <div className="spielberg-inversion-copy">
            <small>PROTOCOLO DE PROYECCIÓN · SPIELBERG</small>
            <h2>LA PÁGINA<br />ESTÁ AL REVÉS.</h2>
            <p>SCROLL ABAJO = SUBIR · SCROLL ARRIBA = BAJAR</p>
            <div>
              <span>PROYECCIÓN · {String(Math.max(0, Math.ceil((1 - spielbergProgress) * 14))).padStart(2, "0")} S</span>
              <i><b style={{ width: `${spielbergProgress * 100}%` }} /></i>
            </div>
            <button type="button" onClick={() => finishSpielberg(true)}>
              RESTAURAR PROYECCIÓN <span>↻</span>
            </button>
          </div>
        </div>,
        document.body,
      )}

      {(activeMode === "micro" || activeMode === "micro-finale") && (
        <div
          className={`micro-cursor-lab ${activeMode === "micro-finale" ? "complete" : ""}`}
          role="application"
          aria-label="Laboratorio microtonal de cursor"
        >
          <header data-hee-control>
            <div>
              <small>ANGINE DE POITRINE · 24 TET</small>
              <strong>{activeMode === "micro-finale" ? "COMPOSICIÓN 22" : "PULSA CUALQUIER ESPACIO VACÍO"}</strong>
            </div>
            <div className="micro-live-readout" aria-live="polite">
              <span>PASO {String(microReadout.step + 1).padStart(2, "0")}</span>
              <strong>{microReadout.frequency.toFixed(2)} Hz</strong>
              <small>OCTAVA {microReadout.octave + 1} · {microReadout.step * 50}¢</small>
            </div>
            <span>{String(microDots.length).padStart(2, "0")}/24 NOTAS</span>
            {activeMode === "micro" && (
              <button type="button" onClick={() => cancelRuntime()}>
                CANCELAR ×
              </button>
            )}
          </header>
          {activeMode === "micro" && (
            <div className="micro-lab-controls" data-hee-control>
              <fieldset>
                <legend>TIMBRE</legend>
                {(["sine", "triangle", "square", "sawtooth"] as OscillatorType[]).map((waveform) => (
                  <button
                    type="button"
                    key={waveform}
                    className={microWaveform === waveform ? "active" : ""}
                    onClick={() => setMicroWaveform(waveform)}
                  >
                    {waveform === "sine" ? "SENO" : waveform === "triangle" ? "TRI" : waveform === "square" ? "CUAD" : "SIERRA"}
                  </button>
                ))}
              </fieldset>
              <fieldset>
                <legend>PULSO</legend>
                {[84, 112, 148].map((tempo) => (
                  <button
                    type="button"
                    key={tempo}
                    className={microTempo === tempo ? "active" : ""}
                    onClick={() => setMicroTempo(tempo)}
                  >
                    {tempo}
                  </button>
                ))}
              </fieldset>
              <button type="button" disabled={microDots.length === 0} onClick={playMicroSequence}>
                ▶ REPRODUCIR SECUENCIA
              </button>
              <button type="button" disabled={microDots.length === 0} onClick={undoMicroNote}>
                ↶ ÚLTIMA
              </button>
              <button type="button" disabled={microDots.length === 0} onClick={clearMicroNotes}>
                × LIMPIAR
              </button>
            </div>
          )}
          <div className="micro-lab-grid" aria-hidden="true" />
          <div className="micro-sonic-rings" aria-hidden="true"><i /><i /><i /><b>24</b></div>
          <div className="micro-octave-map" aria-hidden="true">
            <span>OCTAVA 3 · AGUDA</span>
            <span>OCTAVA 2 · MEDIA</span>
            <span>OCTAVA 1 · GRAVE</span>
          </div>
          <div className="micro-step-ruler" aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => <i key={index}>{index + 1}</i>)}
          </div>
          {microDots.map((dot, index) => {
            const target = MICRO_TARGETS[index] ?? [50, 50];
            return (
              <i
                className="micro-lab-dot"
                key={dot.id}
                style={
                  {
                    left: `${dot.x}px`,
                    top: `${dot.y}px`,
                    "--target-x": `${target[0]}vw`,
                    "--target-y": `${target[1]}vh`,
                    "--dot-delay": `${index * 18}ms`,
                    "--dot-size": `${0.7 + (dot.step % 5) * 0.13}rem`,
                    "--dot-hue": `${(dot.step * 15 + dot.octave * 38) % 360}`,
                  } as CSSProperties
                }
              >
                <span>{String(dot.step + 1).padStart(2, "0")}</span>
              </i>
            );
          })}
          {activeMode === "micro-finale" && (
            <div className="micro-final-masks" aria-hidden="true">
              <i><b /><b /></i>
              <strong>22</strong>
              <i><b /><b /></i>
            </div>
          )}
        </div>
      )}

      {fnafEnding && (
        <div
          className={`fnaf-secret-ending ${fnafEnding}`}
          role="dialog"
          aria-modal="true"
          data-hee-control
        >
          {fnafEnding === "six-am" ? (
            <div>
              <span>6 AM</span>
              <strong>TURNO SUPERADO</strong>
              <small>LAS CÁMARAS HAN DEJADO DE SEGUIRTE</small>
            </div>
          ) : (
            <div>
              <img src="/animatronics/velvet-r.webp" alt="Velvet-R aparece en la cámara" />
              <span>SEÑAL PERDIDA</span>
              <strong>TE HA VISTO.</strong>
            </div>
          )}
        </div>
      )}

      {CONTINUITY_IDS.map(renderContinuityClue)}

      {directorCut && (
        <div className="director-cut-overlay" role="dialog" aria-modal="true" data-hee-control>
          <div className="director-film-strip top" aria-hidden="true">
            {["imagenes-ocultas", "catarsis", "davinci", "que-caloreh"].map((image) => (
              <img key={image} src={`/youtube/${image}.webp`} alt="" />
            ))}
          </div>
          <div className="director-notes" aria-hidden="true">
            <span>CAM 02: Raúl vuelve a salir en plano</span>
            <span>SONIDO: demasiado perfecto, repetir</span>
            <span>MONTAJE: FINAL_FINAL_AHORA_SÍ_v22</span>
            <span>CONTINUIDAD: imposible, pero aprobado</span>
          </div>
          <div className="director-cut-copy">
            <small>LOS 4 ERRORES HAN SIDO LOCALIZADOS</small>
            <h2>DIRECTOR’S<br />CUT</h2>
            <p>
              Una versión con más notas, más tomas falsas y exactamente la cantidad
              correcta de caos creativo.
            </p>
            <button type="button" onClick={finishDirectorCut}>
              CERRAR CORTE DEL DIRECTOR <span>✂</span>
            </button>
          </div>
          <div className="director-film-strip bottom" aria-hidden="true">
            {["el-pan-ta-duro", "wtf-documental", "corazon-intacto", "imagenes-ocultas"].map((image) => (
              <img key={image} src={`/youtube/${image}.webp`} alt="" />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

declare global {
  interface WindowEventMap {
    "premiere22:micro-unlock": Event;
  }
}
