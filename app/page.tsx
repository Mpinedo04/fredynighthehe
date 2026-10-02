"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SecretExtras from "./SecretExtras";
import {
  duckMusic,
  playHeeVoice,
  startSoundtrack,
  stopAllHee,
  stopSoundtrack,
} from "./audio/engine";
import { heeDelayForDepth, heeMultiplierForDepth, type WorldId } from "./content";
import HeeHud from "./hud/HeeHud";
import Topbar from "./hud/Topbar";
import MoonwalkChase from "./modals/MoonwalkChase";
import RecoveredModal from "./modals/RecoveredModal";
import TrailerModal from "./modals/TrailerModal";
import VideoModal from "./modals/VideoModal";
import {
  FINAL_TAKE,
  HEE_COUNT_STORAGE_KEY,
  heePlaybackRate,
  parseHeeCount,
  takeReason,
} from "./prank-system.mjs";
import Achievements, { ACHIEVEMENT_TOTAL, useAchievements } from "./pranks/Achievements";
import DirectorMic from "./pranks/DirectorMic";
import EndCredits from "./pranks/EndCredits";
import HauntedExtras from "./pranks/HauntedExtras";
import NightSystem from "./pranks/NightSystem";
import { playBirthday, playClapperSnap, startThrillerCue } from "./pranks/audio";
import {
  announceHeeCount,
  readStorage,
  unlock,
  writeStorage,
} from "./pranks/bus";
import Behind from "./sections/Behind";
import ColdOpen from "./sections/ColdOpen";
import Dossier from "./sections/Dossier";
import Filmography from "./sections/Filmography";
import Finale from "./sections/Finale";
import Friends from "./sections/Friends";
import Hero from "./sections/Hero";
import Portrait from "./sections/Portrait";
import ReferenceRoom from "./sections/ReferenceRoom";
import SiteFooter from "./sections/SiteFooter";
import TrailerTeaser from "./sections/TrailerTeaser";
import ToastStack from "./ui/Toasts";
import { useRevealAll } from "./ui/useReveal";

/**
 * PREMIERE 22 · orchestrator. Sections live in app/sections, texts in
 * app/content.ts, audio in app/audio/engine.ts. This file only owns the state
 * that several parts of the premiere share (hee-hee, modals, finale, modes).
 */
export default function Home() {
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [scrollBand, setScrollBand] = useState(0);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [materialRead, setMaterialRead] = useState(false);
  const [chaseOpen, setChaseOpen] = useState(false);
  const [activeWorld, setActiveWorld] = useState<WorldId>("mj");
  const [referenceInView, setReferenceInView] = useState(false);
  const [heeReady, setHeeReady] = useState(false);
  const [heeMuted, setHeeMuted] = useState(false);
  const [muteAttempts, setMuteAttempts] = useState(0);
  const [directorOpen, setDirectorOpen] = useState(false);
  const [brokenPresses, setBrokenPresses] = useState(0);
  const [silenceBanner, setSilenceBanner] = useState<string | null>(null);
  const [thrillerOn, setThrillerOn] = useState(false);
  const [clapped, setClapped] = useState(false);
  const [take, setTake] = useState(1);
  const [takeCallout, setTakeCallout] = useState<{ take: number; reason: string } | null>(null);
  const [birthdayNote, setBirthdayNote] = useState<{ index: number; detune: number } | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditsStats, setCreditsStats] = useState({ total: 0, session: 0 });
  const [secretExclusive, setSecretExclusive] = useState(false);
  const [nightExclusive, setNightExclusive] = useState(false);
  const [hauntedExclusive, setHauntedExclusive] = useState(false);
  const [nightSlot, setNightSlot] = useState<HTMLElement | null>(null);
  const [breadSlot, setBreadSlot] = useState<HTMLElement | null>(null);
  const achievements = useAchievements();

  const modalOpen = activeVideo !== null || trailerOpen || recovered || chaseOpen;
  const prankExclusive = nightExclusive || hauntedExclusive || creditsOpen;
  // The hee-hee also rests while a video or the montage is playing.
  const heePaused = secretExclusive || prankExclusive || activeVideo !== null || trailerOpen;

  const scrollDepthRef = useRef(0);
  const heeTotalRef = useRef(0);
  const heeSessionRef = useRef(0);
  const heeBurstTimersRef = useRef<Set<number>>(new Set());
  const thrillerStopRef = useRef<(() => void) | null>(null);
  const thrillerTimerRef = useRef<number | null>(null);
  const thrillerPlayedRef = useRef(false);
  const ghostHeeTimerRef = useRef<number | null>(null);
  const birthdayStopRef = useRef<(() => void) | null>(null);
  const takeCalloutTimerRef = useRef<number | null>(null);
  const cursorLightRef = useRef<HTMLDivElement | null>(null);

  useRevealAll(started);

  // ── Hee-hee engine ──────────────────────────────────────────────────────
  const countHee = useCallback(() => {
    heeTotalRef.current += 1;
    heeSessionRef.current += 1;
    writeStorage(HEE_COUNT_STORAGE_KEY, String(heeTotalRef.current));
    announceHeeCount(heeTotalRef.current, heeSessionRef.current);
    if (heeTotalRef.current >= 100) unlock("hee100");
  }, []);

  const spawnHee = useCallback(
    (index: number, depth: number, volume: number) => {
      // Deeper in the page Michael sings higher, until he becomes a chipmunk.
      void playHeeVoice(heePlaybackRate(depth, index), volume).then((played) => {
        if (played) countHee();
      });
    },
    [countHee],
  );

  const playHeeLayers = useCallback(
    (multiplier: number, depth: number, baseVolume: number) => {
      const stagger = Math.max(28, Math.round(105 - depth * 70));
      const volume = Math.min(0.9, baseVolume * (multiplier >= 4 ? 0.82 : 1));
      Array.from({ length: multiplier }, (_, index) => {
        if (index === 0) {
          spawnHee(index, depth, volume);
          return;
        }
        const timer = window.setTimeout(() => {
          heeBurstTimersRef.current.delete(timer);
          spawnHee(index, depth, volume);
        }, index * stagger);
        heeBurstTimersRef.current.add(timer);
      });
    },
    [spawnHee],
  );

  const stopHeeNow = useCallback(() => {
    heeBurstTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    heeBurstTimersRef.current.clear();
    stopAllHee();
  }, []);

  const playHee = useCallback(() => {
    if (heeMuted || heePaused || typeof window === "undefined") return;
    const depth = scrollDepthRef.current;
    const multiplier = heeMultiplierForDepth(depth);
    if (multiplier >= 8) unlock("chipmunk");
    playHeeLayers(multiplier, depth, Math.min(0.18 + depth * 0.72, 0.9));
  }, [heeMuted, heePaused, playHeeLayers]);

  /** The actor who did not hear "¡corten!": one tiny hee-hee after the silence. */
  const playGhostHee = useCallback(() => {
    void playHeeVoice(0.92, 0.06).then((played) => {
      if (played) countHee();
    });
  }, [countHee]);

  useEffect(() => {
    heeTotalRef.current = parseHeeCount(readStorage(HEE_COUNT_STORAGE_KEY));
    const handleBurst = (event: WindowEventMap["premiere22:hee-burst"]) => {
      setHeeReady(true);
      playHeeLayers(event.detail.layers, Math.max(0.6, scrollDepthRef.current), 0.6);
    };
    window.addEventListener("premiere22:hee-burst", handleBurst);
    return () => window.removeEventListener("premiere22:hee-burst", handleBurst);
  }, [playHeeLayers]);

  useEffect(() => {
    if (heePaused) stopHeeNow();
  }, [heePaused, stopHeeNow]);

  useEffect(() => {
    const timers = heeBurstTimersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      stopAllHee();
      stopSoundtrack();
      thrillerStopRef.current?.();
      birthdayStopRef.current?.();
      [thrillerTimerRef, ghostHeeTimerRef, takeCalloutTimerRef].forEach((ref) => {
        if (ref.current !== null) window.clearTimeout(ref.current);
      });
    };
  }, []);

  useEffect(() => {
    const updateScrollDepth = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const depth = available > 0 ? Math.min(window.scrollY / available, 1) : 0;
      scrollDepthRef.current = depth;
      setScrollDepth(Math.round(depth * 100));
      setScrollBand(Math.min(20, Math.floor(depth * 20)));
    };
    updateScrollDepth();
    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    window.addEventListener("resize", updateScrollDepth);
    return () => {
      window.removeEventListener("scroll", updateScrollDepth);
      window.removeEventListener("resize", updateScrollDepth);
    };
  }, []);

  // Every click outside the hee controls is a hee-hee.
  useEffect(() => {
    const handleEveryClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-hee-control]")) return;
      setHeeReady(true);
      playHee();
    };
    document.addEventListener("click", handleEveryClick, true);
    return () => document.removeEventListener("click", handleEveryClick, true);
  }, [playHee]);

  useEffect(() => {
    if (!heeReady || heeMuted || heePaused || scrollBand < 3) return;
    const timer = window.setInterval(playHee, heeDelayForDepth(scrollBand / 20));
    return () => window.clearInterval(timer);
  }, [heeReady, heeMuted, heePaused, playHee, scrollBand]);

  // ── Soundtrack, ducking and the cursor light ─────────────────────────────
  const toggleSound = useCallback(() => {
    if (soundOn) {
      stopSoundtrack();
      setSoundOn(false);
    } else {
      startSoundtrack();
      setSoundOn(true);
    }
  }, [soundOn]);

  useEffect(() => {
    duckMusic(activeVideo !== null || trailerOpen);
  }, [activeVideo, trailerOpen]);

  useEffect(() => {
    const light = cursorLightRef.current;
    if (!light || window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const handleMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        light.style.setProperty("--cx", `${x}px`);
        light.style.setProperty("--cy", `${y}px`);
      });
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const begin = useCallback(() => {
    if (!soundOn) {
      startSoundtrack();
      setSoundOn(true);
    }
    setStarted(true);
    window.setTimeout(() => {
      document.getElementById("premiere")?.scrollIntoView({ behavior: "smooth" });
    }, 350);
  }, [soundOn]);

  // ── Modals and worlds ───────────────────────────────────────────────────
  const closeVideo = useCallback(() => setActiveVideo(null), []);
  const openTrailer = useCallback(() => setTrailerOpen(true), []);
  const closeTrailer = useCallback(() => setTrailerOpen(false), []);
  const openRecovered = useCallback(() => setRecovered(true), []);
  const closeRecovered = useCallback(() => setRecovered(false), []);
  const completeRecovered = useCallback(() => setMaterialRead(true), []);
  const openChase = useCallback(() => setChaseOpen(true), []);
  const closeChase = useCallback(() => setChaseOpen(false), []);

  const goToRecovered = useCallback(() => {
    setTrailerOpen(false);
    setActiveWorld("fnaf");
    window.setTimeout(() => {
      document.getElementById("material-recuperado")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 160);
  }, []);

  // ── ¡CORTEN! and the silence that never lasts ─────────────────────────────
  const stopThriller = useCallback(() => {
    thrillerStopRef.current?.();
    thrillerStopRef.current = null;
    setThrillerOn(false);
  }, []);

  const silenceHee = useCallback(
    (banner: string | null = null) => {
      stopHeeNow();
      setHeeMuted(true);
      setSilenceBanner(banner);
      // "¿Querías silencio?" The first silence only lasts ten seconds.
      if (!thrillerPlayedRef.current && thrillerTimerRef.current === null) {
        thrillerTimerRef.current = window.setTimeout(() => {
          thrillerTimerRef.current = null;
          thrillerPlayedRef.current = true;
          thrillerStopRef.current = startThrillerCue();
          setThrillerOn(true);
          unlock("thriller");
        }, 10_000);
      }
    },
    [stopHeeNow],
  );

  const handleDirectorCut = useCallback(() => {
    silenceHee("TOMA BUENA. SE IMPRIME.");
    unlock("director");
    if (ghostHeeTimerRef.current !== null) window.clearTimeout(ghostHeeTimerRef.current);
    ghostHeeTimerRef.current = window.setTimeout(() => {
      ghostHeeTimerRef.current = null;
      playGhostHee();
    }, 3000);
  }, [playGhostHee, silenceHee]);

  const handleDirectorAction = useCallback(() => {
    [thrillerTimerRef, ghostHeeTimerRef].forEach((ref) => {
      if (ref.current !== null) {
        window.clearTimeout(ref.current);
        ref.current = null;
      }
    });
    stopThriller();
    setSilenceBanner(null);
    setHeeMuted(false);
  }, [stopThriller]);

  const handleDirectorCoward = useCallback(
    (message: string) => {
      setDirectorOpen(false);
      silenceHee(message.toUpperCase());
      unlock("coward");
    },
    [silenceHee],
  );

  const handleMuteAttempt = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      silenceHee();
      return;
    }
    playHee();
    if (muteAttempts >= 5) {
      // The sixth press was a lie too: a director does not press buttons.
      setDirectorOpen(true);
      setBrokenPresses((count) => count + 1);
      return;
    }
    if (muteAttempts + 1 === 5) unlock("mute5");
    setMuteAttempts(muteAttempts + 1);
  }, [muteAttempts, playHee, silenceHee]);

  const silenceFromKeyboard = useCallback(() => silenceHee(), [silenceHee]);

  // ── Finale: Toma 22, birthday song and credits ──────────────────────────
  const startBirthday = useCallback(() => {
    birthdayStopRef.current?.();
    birthdayStopRef.current = playBirthday((index, detune) =>
      setBirthdayNote(index < 0 ? null : { index, detune }),
    );
  }, []);

  const handleClapper = useCallback(() => {
    if (clapped) return;
    playClapperSnap();
    if (takeCalloutTimerRef.current !== null) window.clearTimeout(takeCalloutTimerRef.current);
    const reason = takeReason(take);
    if (reason) {
      setTakeCallout({ take, reason });
      setTake(take + 1);
    } else {
      setTakeCallout({ take: FINAL_TAKE, reason: "¡CORTEN! TOMA BUENA" });
      setClapped(true);
      unlock("take22");
      window.setTimeout(startBirthday, 1400);
    }
    takeCalloutTimerRef.current = window.setTimeout(() => setTakeCallout(null), 2200);
  }, [clapped, startBirthday, take]);

  const openCredits = useCallback(() => {
    birthdayStopRef.current?.();
    birthdayStopRef.current = null;
    setCreditsStats({ total: heeTotalRef.current, session: heeSessionRef.current });
    setCreditsOpen(true);
  }, []);

  const closeCredits = useCallback(() => setCreditsOpen(false), []);

  const otherBlocked = activeVideo !== null || trailerOpen || recovered || chaseOpen || creditsOpen;

  return (
    <main className={started ? "experience started" : "experience"}>
      <div className="grain" aria-hidden="true" />
      <div className="cursor-light" aria-hidden="true" ref={cursorLightRef} />

      <Topbar
        soundOn={soundOn}
        scrollDepth={scrollDepth}
        onToggleSound={toggleSound}
        nightSlotRef={setNightSlot}
      />

      <ColdOpen onBegin={begin} />
      <Hero />
      <Portrait />
      <Filmography onPlay={setActiveVideo} breadSlotRef={setBreadSlot} />
      <Behind />
      <Dossier />
      <ReferenceRoom
        activeWorld={activeWorld}
        onWorldChange={setActiveWorld}
        onInViewChange={setReferenceInView}
        materialRead={materialRead}
        onOpenRecovered={openRecovered}
        onMoonwalk={openChase}
      />
      <Friends />
      <TrailerTeaser onOpen={openTrailer} />
      <Finale
        clapped={clapped}
        take={take}
        takeCallout={takeCallout}
        birthdayNote={birthdayNote}
        onClap={handleClapper}
        onBirthday={startBirthday}
        onCredits={openCredits}
      />
      <SiteFooter />

      <SecretExtras
        started={started}
        scrollDepth={scrollDepth}
        soundOn={soundOn}
        blocked={modalOpen || prankExclusive}
        beaconVisible={activeWorld === "micro" && referenceInView}
        onExclusiveChange={setSecretExclusive}
      />

      <NightSystem
        started={started}
        slot={nightSlot}
        blocked={otherBlocked || hauntedExclusive || secretExclusive}
        onExclusiveChange={setNightExclusive}
      />

      <HauntedExtras
        started={started}
        scrollDepth={scrollDepth}
        breadSlot={breadSlot}
        blocked={otherBlocked || nightExclusive || secretExclusive}
        onExclusiveChange={setHauntedExclusive}
      />

      <Achievements />
      <ToastStack />

      <DirectorMic
        open={directorOpen}
        heeMuted={heeMuted}
        onCut={handleDirectorCut}
        onAction={handleDirectorAction}
        onCoward={handleDirectorCoward}
      />

      <EndCredits
        open={creditsOpen}
        onClose={closeCredits}
        takes={clapped ? FINAL_TAKE : take}
        muteAttempts={muteAttempts + brokenPresses}
        heeTotal={creditsStats.total}
        heeSession={creditsStats.session}
        achievements={achievements.unlocked.length}
        achievementTotal={ACHIEVEMENT_TOTAL}
      />

      <HeeHud
        visible={heeReady && scrollDepth >= 50 && !heeMuted && !heePaused}
        scrollDepth={scrollDepth}
        muteAttempts={muteAttempts}
        directorOpen={directorOpen}
        heeMuted={heeMuted}
        silenceBanner={silenceBanner}
        thrillerOn={thrillerOn}
        onAttempt={handleMuteAttempt}
        onSilence={silenceFromKeyboard}
        onStopThriller={stopThriller}
      />

      <VideoModal index={activeVideo} onClose={closeVideo} onNavigate={setActiveVideo} />
      {trailerOpen && <TrailerModal open onClose={closeTrailer} onGoToRecovered={goToRecovered} />}
      {recovered && <RecoveredModal open onClose={closeRecovered} onComplete={completeRecovered} />}
      {chaseOpen && <MoonwalkChase open onClose={closeChase} />}
    </main>
  );
}
