"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  POWER_FULL_DRAIN_MS,
  isRealNight,
  nextPower,
  nightClock,
} from "../prank-system.mjs";
import { playSixAmChimes } from "./audio";
import { fireScare, qaSpeed, unlock, warnScare } from "./bus";
import { updateNight, useNight } from "../ui/nightStore";
import { showToast } from "../ui/Toasts";

type NightSystemProps = {
  started: boolean;
  blocked: boolean;
  slot: HTMLElement | null;
  onExclusiveChange: (exclusive: boolean) => void;
};

type BlackoutStage = "dark" | "eyes" | "silence" | "scare" | "restored";

const EYES_FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='#050505'/><ellipse cx='20' cy='32' rx='9' ry='6' fill='#ff1b1b'/><ellipse cx='44' cy='32' rx='9' ry='6' fill='#ff1b1b'/><circle cx='20' cy='32' r='2.6' fill='#fff'/><circle cx='44' cy='32' r='2.6' fill='#fff'/></svg>",
  );

const TAB_TITLE = "📹 CAM 04 · MOVIMIENTO";
const TAB_ABSENCE_MS = 30_000;

/**
 * A real FNAF night on top of the premiere: a 12 AM → 6 AM clock, power that
 * drains while Raúl stays, the classic blackout with the music box, and a
 * security camera that watches the tab while he is away.
 */
export default function NightSystem({
  started,
  blocked,
  slot,
  onExclusiveChange,
}: NightSystemProps) {
  const [elapsed, setElapsed] = useState(0);
  const [power, setPower] = useState(100);
  const [blackout, setBlackout] = useState<BlackoutStage | null>(null);
  const [sixAm, setSixAm] = useState(false);
  const [survived, setSurvived] = useState(false);
  const [tabScare, setTabScare] = useState<"warning" | "scare" | "message" | null>(null);
  const extraDrainRef = useRef(0);
  const blockedRef = useRef(blocked);
  const busyRef = useRef(false);
  const timersRef = useRef<Set<number>>(new Set());
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
  }, []);

  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      musicRef.current?.pause();
      document.documentElement.classList.remove("real-night");
    };
  }, []);

  useEffect(() => {
    onExclusiveChange(blackout !== null || sixAm || tabScare !== null);
  }, [blackout, onExclusiveChange, sixAm, tabScare]);

  // The clock and the battery only run while the tab is visible.
  useEffect(() => {
    if (!started || survived) return;
    const speed = qaSpeed();
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - last) * speed;
      last = now;
      if (document.hidden || busyRef.current) return;
      setElapsed((value) => value + delta);
      const extra = extraDrainRef.current;
      extraDrainRef.current = 0;
      setPower((value) => nextPower(value, delta, POWER_FULL_DRAIN_MS, extra));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, survived]);

  useEffect(() => {
    const handleDrain = (event: WindowEventMap["premiere22:power-drain"]) => {
      extraDrainRef.current += event.detail.amount;
    };
    const handleCameraClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(".camera-map button")) {
        extraDrainRef.current += 1;
      }
    };
    window.addEventListener("premiere22:power-drain", handleDrain);
    document.addEventListener("click", handleCameraClick, true);
    return () => {
      window.removeEventListener("premiere22:power-drain", handleDrain);
      document.removeEventListener("click", handleCameraClick, true);
    };
  }, []);

  // Blackout at 0% power, as soon as no other scene is on screen.
  useEffect(() => {
    if (!started || survived || power > 0 || blocked || busyRef.current) return;
    busyRef.current = true;
    setBlackout("dark");
    const musicMs = 8000 + Math.round(Math.random() * 6000);
    later(() => {
      setBlackout("eyes");
      const music = new Audio("/audio/fnaf-authentic/puppet-music-box.ogg");
      music.loop = true;
      music.volume = 0.55;
      musicRef.current = music;
      void music.play().catch(() => undefined);
    }, 1400);
    later(() => warnScare(1100), 1400 + musicMs - 900);
    later(() => {
      musicRef.current?.pause();
      musicRef.current = null;
      setBlackout("silence");
    }, 1400 + musicMs);
    later(() => {
      setBlackout("scare");
      fireScare();
      const scream = new Audio("/audio/fnaf-authentic/freddy.ogg");
      scream.volume = 0.62;
      void scream.play().catch(() => undefined);
    }, 1400 + musicMs + 1100);
    later(() => {
      setBlackout("restored");
      setPower(100);
      unlock("blackout");
    }, 1400 + musicMs + 2700);
    later(() => {
      setBlackout(null);
      busyRef.current = false;
    }, 1400 + musicMs + 5200);
  }, [blocked, later, power, started, survived]);

  // 6 AM: chimes, YOU SURVIVED, and the night stops.
  const clock = nightClock(elapsed);
  const night = useNight();

  useEffect(() => {
    updateNight({ power, clock: clock.label, survived });
  }, [clock.label, power, survived]);
  useEffect(() => {
    if (!started || survived || !clock.survived || blocked || busyRef.current) return;
    busyRef.current = true;
    setSurvived(true);
    setSixAm(true);
    playSixAmChimes();
    unlock("sixAm");
    later(() => {
      setSixAm(false);
      busyRef.current = false;
    }, 6400);
  }, [blocked, clock.survived, later, started, survived]);

  // Opening the premiere between 00:00 and 06:00 for real.
  useEffect(() => {
    if (!started) return;
    const now = new Date();
    if (!isRealNight(now)) return;
    document.documentElement.classList.add("real-night");
    const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    later(
      () =>
        showToast({
          key: "real-night",
          kicker: "RELOJ REAL · TURNO DE MADRUGADA",
          title: `SON LAS ${time} DE VERDAD`,
          body: "Raúl, vete a dormir. La premiere seguirá aquí mañana.",
          tone: "blue",
          duration: 6500,
        }),
      2500,
    );
    unlock("realNight");
  }, [later, started]);

  // The tab is watched while Raúl is away.
  useEffect(() => {
    if (!started) return;
    let hiddenAt = 0;
    let savedTitle = document.title;
    let savedIcon: string | null = null;
    const icon = () => document.querySelector<HTMLLinkElement>("link[rel~='icon']");

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        savedTitle = document.title;
        const link = icon();
        savedIcon = link?.href ?? null;
        document.title = TAB_TITLE;
        if (link) link.href = EYES_FAVICON;
        return;
      }
      document.title = savedTitle;
      const link = icon();
      if (link && savedIcon) link.href = savedIcon;
      const away = Date.now() - hiddenAt;
      if (hiddenAt === 0 || away < TAB_ABSENCE_MS / qaSpeed()) return;
      if (blockedRef.current || busyRef.current) return;
      busyRef.current = true;
      setTabScare("warning");
      warnScare(1000);
      later(() => {
        setTabScare("scare");
        fireScare();
        const scream = new Audio("/audio/fnaf-authentic/foxy.ogg");
        scream.volume = 0.6;
        void scream.play().catch(() => undefined);
      }, 1000);
      later(() => setTabScare("message"), 2600);
      later(() => {
        setTabScare(null);
        busyRef.current = false;
        unlock("tabWatch");
      }, 5200);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (document.title === TAB_TITLE) document.title = savedTitle;
    };
  }, [later, started]);

  if (!started) return null;

  const roundedPower = Math.ceil(power);
  const hud = (
    <div
      className={`night-clock ${roundedPower <= 20 ? "low" : ""} ${survived ? "survived" : ""}`}
      aria-label={`Turno de noche: ${clock.label}, energía ${roundedPower}%`}
      data-hee-control
    >
      <strong>{clock.label}</strong>
      <span>
        <small>ENERGÍA</small>
        <i><b style={{ width: `${power}%` }} /></i>
        <em>{roundedPower}%</em>
      </span>
      {night.shiftActive && (
        <span className="night-objectives" title="Animatrónicos interceptados en el turno nocturno">
          🎯 {night.caught}/{night.objectives}
        </span>
      )}
    </div>
  );

  return (
    <>
      {slot ? createPortal(hud, slot) : null}

      {blackout && (
        <div className={`blackout-overlay stage-${blackout}`} role="dialog" aria-modal="true" aria-label="Apagón" data-hee-control>
          {blackout === "dark" && <p>SIN ENERGÍA · LAS PUERTAS SE ABREN</p>}
          {blackout === "eyes" && (
            <div className="blackout-eyes" aria-hidden="true">
              <i /><i />
            </div>
          )}
          {blackout === "scare" && (
            <img className="blackout-scare" src="/animatronics/ursus-9.webp" alt="" />
          )}
          {blackout === "restored" && (
            <div className="blackout-restored">
              <small>GENERADOR DE EMERGENCIA</small>
              <strong>ENERGÍA RESTABLECIDA</strong>
              <span>100% · NO VUELVAS A GASTARLA EN CÁMARAS</span>
            </div>
          )}
        </div>
      )}

      {sixAm && (
        <div className="fnaf-secret-ending six-am night-six-am" role="dialog" aria-modal="true" data-hee-control>
          <div>
            <span>6 AM</span>
            <strong>YOU SURVIVED</strong>
            <small>TURNO COMPLETO · LA PREMIERE SIGUE ABIERTA</small>
          </div>
        </div>
      )}

      {tabScare && (
        <div className={`tab-scare stage-${tabScare}`} role="dialog" aria-modal="true" data-hee-control>
          {tabScare === "scare" && <img src="/animatronics/vulpes-x.webp" alt="" />}
          {tabScare === "message" && (
            <div>
              <small>CAM 04 · REGISTRO DE AUSENCIA</small>
              <strong>TE FUISTE DEL TURNO.</strong>
              <span>ALGUIEN HA OCUPADO TU SILLA MIENTRAS TANTO.</span>
            </div>
          )}
        </div>
      )}

    </>
  );
}
