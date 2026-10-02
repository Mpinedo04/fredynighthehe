"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { FNAF_MILESTONES } from "../secret-system.mjs";
import {
  VISIT_STORAGE_KEY,
  dayKey,
  isNewVisitDay,
  matchCloseEncounters,
  matchSecretWord,
} from "../prank-system.mjs";
import { playHeeVoice } from "../audio/engine";
import { showToast } from "../ui/Toasts";
import { playGlassBreak, playShipTones, playThud } from "./audio";
import {
  qaSpeed,
  readStorage,
  requestHeeBurst,
  requestLean,
  unlock,
  warnScare,
  writeStorage,
} from "./bus";

type HauntedExtrasProps = {
  started: boolean;
  blocked: boolean;
  scrollDepth: number;
  breadSlot: HTMLElement | null;
  onExclusiveChange: (exclusive: boolean) => void;
};

type Note = { title: string; body: string; image?: string; tone?: "red" | "blue" };
type ConfettiPiece = { id: number; left: number; delay: number; hue: number; spin: number; glyph: string };
type Crack = { x: number; y: number; id: number };

const IDLE_MS = 20_000;
const HEAT_MS = 35_000;
const FLASHLIGHT_RELIGHT_MS = 6_000;
const HAUNTED_PHOTOS = [0, 3];
const HAUNT_IMAGES = ["/animatronics/velvet-r.webp", "/animatronics/avis-3.webp"];

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function crackPaths(seed: number) {
  const paths: string[] = [];
  for (let ray = 0; ray < 11; ray += 1) {
    const angle = (ray / 11) * Math.PI * 2 + ((seed * (ray + 3)) % 7) * 0.07;
    let x = 0;
    let y = 0;
    let d = "M0 0";
    for (let segment = 1; segment <= 5; segment += 1) {
      const wobble = (((seed + ray * 13 + segment * 7) % 9) - 4) * 0.06;
      const length = 60 + segment * 38;
      x += Math.cos(angle + wobble) * length;
      y += Math.sin(angle + wobble) * length;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    paths.push(d);
  }
  return paths;
}

export default function HauntedExtras({
  started,
  blocked,
  scrollDepth,
  breadSlot,
  onExclusiveChange,
}: HauntedExtrasProps) {
  const [glass, setGlass] = useState<"idle" | "warning" | "splash">("idle");
  const [dark, setDark] = useState(false);
  const [eyes, setEyes] = useState<{ x: number; y: number } | null>(null);
  const [ship, setShip] = useState<number[] | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [freddyEyes, setFreddyEyes] = useState(false);
  const [breadHits, setBreadHits] = useState(0);
  const [breadShake, setBreadShake] = useState(0);
  const [crack, setCrack] = useState<Crack | null>(null);
  const [heat, setHeat] = useState<HTMLElement | null>(null);
  const [cooled, setCooled] = useState(false);

  const blockedRef = useRef(blocked);
  const flashlightRef = useRef<HTMLDivElement | null>(null);
  const eyesRef = useRef<{ x: number; y: number } | null>(null);
  const darkRef = useRef(false);
  const glassTimerRef = useRef<number | null>(null);
  const microNotesRef = useRef<Array<{ step: number; at: number }>>([]);
  const warnedMilestonesRef = useRef<Set<number>>(new Set());
  const heatedSectionsRef = useRef<Set<Element>>(new Set());
  const heatRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<Set<number>>(new Set());

  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  const showNote = useCallback((next: Note, duration = 3600) => {
    showToast({ title: next.title, body: next.body, image: next.image, tone: next.tone, duration });
  }, []);

  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      if (glassTimerRef.current !== null) window.clearTimeout(glassTimerRef.current);
    };
  }, []);

  useEffect(() => {
    onExclusiveChange(ship !== null);
  }, [onExclusiveChange, ship]);

  // ── The Jurassic Park glass of water ─────────────────────────────────────
  useEffect(() => {
    const shake = (kind: "warning" | "splash", duration: number) => {
      if (glassTimerRef.current !== null) window.clearTimeout(glassTimerRef.current);
      setGlass(kind);
      glassTimerRef.current = window.setTimeout(() => setGlass("idle"), duration);
    };
    const handleWarning = (event: WindowEventMap["premiere22:scare-warning"]) =>
      shake("warning", Math.max(700, event.detail.durationMs));
    const handleScare = () => shake("splash", 1400);
    window.addEventListener("premiere22:scare-warning", handleWarning);
    window.addEventListener("premiere22:scare", handleScare);
    return () => {
      window.removeEventListener("premiere22:scare-warning", handleWarning);
      window.removeEventListener("premiere22:scare", handleScare);
    };
  }, []);

  // The glass knows where the night-shift animatronics are waiting.
  useEffect(() => {
    if (!started || blocked) return;
    const upcoming = FNAF_MILESTONES.find(
      (milestone) =>
        scrollDepth >= milestone - 3 &&
        scrollDepth < milestone &&
        !warnedMilestonesRef.current.has(milestone),
    );
    if (upcoming === undefined) return;
    warnedMilestonesRef.current.add(upcoming);
    warnScare(1200);
  }, [blocked, scrollDepth, started]);

  // ── Idle flashlight ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    // 20 s the first time, then 40 s, 80 s… so reading the page stays possible.
    let idleMs = IDLE_MS / qaSpeed();
    let idleTimer = 0;
    let firstMoveAt = 0;

    const goDark = () => {
      if (blockedRef.current || document.hidden || darkRef.current) {
        idleTimer = window.setTimeout(goDark, idleMs);
        return;
      }
      darkRef.current = true;
      firstMoveAt = 0;
      idleMs *= 2;
      setDark(true);
      unlock("flashlight");
      const side = Math.random() > 0.5 ? 0.78 : 0.18;
      later(() => {
        if (!darkRef.current) return;
        const position = {
          x: window.innerWidth * (side + (Math.random() - 0.5) * 0.12),
          y: window.innerHeight * (0.3 + Math.random() * 0.4),
        };
        eyesRef.current = position;
        setEyes(position);
      }, 1500);
    };

    const paint = (x: number, y: number) => {
      const overlay = flashlightRef.current;
      if (!overlay) return;
      overlay.style.setProperty("--mx", `${x}px`);
      overlay.style.setProperty("--my", `${y}px`);
    };

    const activity = (event: Event) => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(goDark, idleMs);
      if (!darkRef.current) return;
      let x: number | null = null;
      let y: number | null = null;
      if (event instanceof PointerEvent || event instanceof MouseEvent) {
        x = event.clientX;
        y = event.clientY;
      } else if (event instanceof TouchEvent && event.touches[0]) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
      }
      if (x === null || y === null) return;
      paint(x, y);
      const watcher = eyesRef.current;
      if (watcher && Math.hypot(watcher.x - x, watcher.y - y) < 110) {
        eyesRef.current = null;
        setEyes(null);
      }
      const now = performance.now();
      if (firstMoveAt === 0) firstMoveAt = now;
      if (now - firstMoveAt > FLASHLIGHT_RELIGHT_MS) {
        darkRef.current = false;
        eyesRef.current = null;
        setDark(false);
        setEyes(null);
      }
    };

    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "touchmove", "scroll"];
    events.forEach((name) => window.addEventListener(name, activity, { passive: true }));
    idleTimer = window.setTimeout(goDark, idleMs);
    return () => {
      window.clearTimeout(idleTimer);
      events.forEach((name) => window.removeEventListener(name, activity));
    };
  }, [later, started]);

  // ── Photos that change when you look again ───────────────────────────────
  useEffect(() => {
    if (!started) return;
    const articles = Array.from(document.querySelectorAll<HTMLElement>(".testimonials article"));
    const targets = HAUNTED_PHOTOS.map((index) =>
      articles[index]?.querySelector<HTMLElement>(".avatar-placeholder"),
    ).filter((element): element is HTMLElement => Boolean(element));
    const state = new Map<Element, { phase: "unseen" | "seen" | "armed" | "done"; since: number; image: string }>();
    targets.forEach((target, index) =>
      state.set(target, { phase: "unseen", since: 0, image: HAUNT_IMAGES[index % HAUNT_IMAGES.length] }),
    );
    const ghosts: HTMLElement[] = [];

    const haunt = (target: HTMLElement, image: string) => {
      const ghost = document.createElement("img");
      ghost.src = image;
      ghost.alt = "";
      ghost.className = "haunt-ghost";
      ghost.setAttribute("data-hee-control", "");
      ghost.addEventListener("pointerenter", () => unlock("ghostPhoto"), { once: true });
      target.appendChild(ghost);
      ghosts.push(ghost);
      window.setTimeout(() => ghost.classList.add("gone"), 750);
      window.setTimeout(() => ghost.remove(), 1600);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        entries.forEach((entry) => {
          const record = state.get(entry.target);
          if (!record || record.phase === "done") return;
          if (entry.isIntersecting) {
            if (record.phase === "unseen") {
              record.phase = "seen";
              record.since = now;
            } else if (record.phase === "armed" && !blockedRef.current) {
              record.phase = "done";
              haunt(entry.target as HTMLElement, record.image);
            }
          } else if (record.phase === "seen") {
            record.phase = now - record.since >= 1500 ? "armed" : "unseen";
          }
        });
      },
      { threshold: 0.6 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      ghosts.forEach((ghost) => ghost.remove());
    };
  }, [started]);

  // ── Close Encounters of the Third Kind ───────────────────────────────────
  useEffect(() => {
    const handleNote = (event: WindowEventMap["premiere22:micro-note"]) => {
      const notes = [...microNotesRef.current, { step: event.detail.step, at: performance.now() }].slice(-5);
      microNotesRef.current = notes;
      if (!matchCloseEncounters(notes)) return;
      microNotesRef.current = [];
      const steps = notes.map((item) => item.step);
      later(() => {
        setShip(steps);
        playShipTones(steps);
        unlock("closeEncounters");
      }, 450);
      later(() => setShip(null), 9800);
    };
    window.addEventListener("premiere22:micro-note", handleNote);
    return () => window.removeEventListener("premiere22:micro-note", handleNote);
  }, [later]);

  // ── Smooth Criminal lean ─────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    let tiltSince = 0;
    let cooldownUntil = 0;
    let releaseTimer = 0;

    const lean = (direction: number, fromTilt: boolean) => {
      const experience = document.querySelector<HTMLElement>(".experience");
      if (!experience || reducedMotion()) return;
      const now = performance.now();
      if (now < cooldownUntil) return;
      cooldownUntil = now + 6000;
      experience.classList.remove("smooth-lean-left", "smooth-lean-right");
      // Lean from the feet: every section pivots around the same point, the
      // bottom of what Raúl is looking at, so the fixed HUD stays in place.
      const pivotY = window.scrollY + window.innerHeight;
      experience
        .querySelectorAll<HTMLElement>(":scope > section, :scope > footer")
        .forEach((part) => {
          const top = part.getBoundingClientRect().top + window.scrollY;
          part.style.setProperty("--lean-origin", `${pivotY - top}px`);
        });
      void experience.offsetWidth;
      experience.classList.add(direction < 0 ? "smooth-lean-left" : "smooth-lean-right");
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(() => {
        experience.classList.remove("smooth-lean-left", "smooth-lean-right");
      }, 3400);
      showNote({ title: "ANNIE, ARE YOU OK?", body: "Lean de Smooth Criminal · inclinado sin despegar los pies.", tone: "blue" });
      if (fromTilt) unlock("lean");
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      if (Math.abs(gamma) < 40) {
        tiltSince = 0;
        return;
      }
      const now = performance.now();
      if (tiltSince === 0) tiltSince = now;
      if (now - tiltSince >= 600) {
        tiltSince = 0;
        lean(Math.sign(gamma), true);
      }
    };
    const handleLean = (event: WindowEventMap["premiere22:lean"]) => lean(event.detail.direction, false);

    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("premiere22:lean", handleLean);
    return () => {
      window.clearTimeout(releaseTimer);
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("premiere22:lean", handleLean);
    };
  }, [showNote, started]);

  // ── Secret words ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    let buffer = "";
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1 ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest("input,textarea,select")))
      ) {
        return;
      }
      buffer = (buffer + event.key).slice(-12);
      const word = matchSecretWord(buffer);
      if (!word) return;
      buffer = "";
      if (word === "hehe") {
        requestHeeBurst(8);
        unlock("wordHehe");
      } else if (word === "annie") {
        requestLean(Math.random() > 0.5 ? 1 : -1);
        unlock("wordAnnie");
      } else if (word === "freddy") {
        [0, 260, 520].forEach((delay) => {
          later(() => void playHeeVoice(0.5, 0.7), delay);
        });
        setFreddyEyes(true);
        later(() => setFreddyEyes(false), 1900);
        unlock("wordFreddy");
      } else if (word === "22") {
        const pieces = Array.from({ length: 96 }, (_, index) => ({
          id: Date.now() + index,
          left: Math.random() * 100,
          delay: Math.random() * 0.7,
          hue: [0, 45, 205, 330, 140][index % 5] + Math.random() * 20,
          spin: Math.random() * 720 - 360,
          glyph: index % 9 === 0 ? "22" : "",
        }));
        setConfetti(pieces);
        later(() => setConfetti([]), 4200);
        unlock("word22");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [later, started]);

  // ── Welcome back ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    const today = dayKey(new Date());
    const last = readStorage(VISIT_STORAGE_KEY);
    writeStorage(VISIT_STORAGE_KEY, today);
    if (!isNewVisitDay(last, today)) return;
    later(() => {
      showNote(
        {
          title: "BIENVENIDO DE NUEVO, RAÚL",
          body: "Freddy te echaba de menos. No ha movido nada de sitio. Casi nada.",
          image: "/animatronics/ursus-9.webp",
        },
        6500,
      );
      unlock("welcomeBack");
    }, 2200);
  }, [later, showNote, started]);

  // ── Printing ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePrint = () => unlock("print");
    window.addEventListener("beforeprint", handlePrint);
    return () => window.removeEventListener("beforeprint", handlePrint);
  }, []);

  // ── El pan ta' duro ──────────────────────────────────────────────────────
  const hitBread = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const hits = breadHits + 1;
    setBreadShake((value) => value + 1);
    playThud(hits);
    if (hits < 5) {
      setBreadHits(hits);
      return;
    }
    setBreadHits(0);
    playGlassBreak();
    setCrack({ x: event.clientX, y: event.clientY, id: Date.now() });
    unlock("pan");
    later(() => setCrack(null), 4200);
  };

  // ── ¿Qué caloreh? ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    const heatMs = HEAT_MS / qaSpeed();
    let current: Element | null = null;
    let since = 0;
    const timer = window.setInterval(() => {
      if (document.hidden || blockedRef.current) {
        since = performance.now();
        return;
      }
      const viewport = window.innerHeight;
      const dominant = Array.from(document.querySelectorAll<HTMLElement>("main.experience > section"))
        .filter((section) => !section.classList.contains("cold-open"))
        .find((section) => {
          const rect = section.getBoundingClientRect();
          const visible = Math.min(rect.bottom, viewport) - Math.max(rect.top, 0);
          return visible / viewport >= 0.6;
        }) ?? null;
      const now = performance.now();
      if (dominant !== current) {
        current = dominant;
        since = now;
        if (heatRef.current && heatRef.current !== dominant) {
          heatRef.current.classList.remove("heat-haze");
          heatRef.current = null;
          setHeat(null);
        }
        return;
      }
      if (!dominant || heatedSectionsRef.current.has(dominant) || now - since < heatMs) return;
      heatedSectionsRef.current.add(dominant);
      dominant.classList.add("heat-haze");
      heatRef.current = dominant;
      setCooled(false);
      setHeat(dominant);
      showNote({ title: "¿QUÉ CALOREH?", body: "Llevas tanto rato aquí que se ha recalentado el plató.", image: "/youtube/que-caloreh.webp", tone: "red" }, 4200);
      unlock("calor");
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showNote, started]);

  const coolDown = () => {
    heat?.classList.remove("heat-haze");
    heatRef.current = null;
    setCooled(true);
    later(() => {
      setHeat(null);
      setCooled(false);
    }, 1500);
  };

  const printFreddy = (
    <div className="print-freddy" aria-hidden="true">
      <img src="/animatronics/ursus-9.webp" alt="" />
      <strong>FREDDY TE ESTÁ VIGILANDO</strong>
      <span>Las premieres no se imprimen, Raúl. Se viven.</span>
    </div>
  );

  if (!started) return printFreddy;

  return (
    <>
      {printFreddy}

      <svg className="heat-filter-defs" aria-hidden="true" focusable="false">
        <filter id="premiere-heat">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="22">
            <animate attributeName="baseFrequency" dur="3.2s" values="0.012 0.06;0.016 0.09;0.012 0.06" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="14" />
        </filter>
      </svg>

      <div className={`jurassic-glass ${glass}`} aria-hidden="true">
        <span className="jurassic-glass-water"><i /><i /></span>
        <small>OBJETS IN MIRROR</small>
      </div>

      {dark && (
        <div className="idle-flashlight" ref={flashlightRef} aria-hidden="true">
          {eyes && (
            <i className="idle-eyes" style={{ left: `${eyes.x}px`, top: `${eyes.y}px` }}>
              <b /><b />
            </i>
          )}
          <span>NO TE QUEDES QUIETO</span>
        </div>
      )}

      {ship && (
        <div className="close-encounters" role="dialog" aria-modal="true" aria-label="Encuentros en la tercera fase" data-hee-control>
          <div className="close-encounters-ship" aria-hidden="true">
            <span />
            <i>{ship.map((step, index) => <b key={index} style={{ "--light": index, "--hue": (step * 15) % 360 } as CSSProperties} />)}</i>
          </div>
          <div className="close-encounters-beam" aria-hidden="true" />
          <div className="close-encounters-copy">
            <small>RE · MI · DO · DO · SOL</small>
            <strong>CONTACTO ESTABLECIDO</strong>
            <p>La nave responde con tus mismas notas. Spielberg estaría orgulloso. O asustado.</p>
          </div>
        </div>
      )}

      {breadSlot &&
        createPortal(
          <button
            type="button"
            key={breadShake}
            className={`hard-bread hits-${breadHits} ${breadShake ? "shake" : ""}`}
            onClick={hitBread}
            aria-label="Un pan sospechosamente duro"
            data-hee-control
          >
            <span aria-hidden="true">🍞</span>
            {breadHits > 0 && <small>TOC ×{breadHits}</small>}
          </button>,
          breadSlot,
        )}

      {crack && (
        <div className="screen-crack" onClick={() => setCrack(null)} data-hee-control>
          <svg width="100%" height="100%" aria-hidden="true">
            <g transform={`translate(${crack.x} ${crack.y})`}>
              {crackPaths(crack.id % 97).map((d, index) => (
                <path key={index} d={d} />
              ))}
              <circle r="18" />
            </g>
          </svg>
          <strong>EL PAN TA&apos; DURO</strong>
          <small>Pantalla rota con una barra de pan · Toca para barrer los cristales</small>
        </div>
      )}

      {heat && (
        <button
          type="button"
          className={`heat-fan ${cooled ? "cooled" : ""}`}
          onClick={coolDown}
          data-hee-control
        >
          <i aria-hidden="true"><b /><b /><b /></i>
          <span>{cooled ? "PLATÓ REFRIGERADO" : "ENCENDER VENTILADOR"}</span>
        </button>
      )}

      {freddyEyes && (
        <div className="freddy-laugh" aria-hidden="true">
          <i /><i />
          <span>HAR HAR HAR</span>
        </div>
      )}

      {confetti.length > 0 && (
        <div className="confetti-22" aria-hidden="true">
          {confetti.map((piece) => (
            <i
              key={piece.id}
              style={
                {
                  left: `${piece.left}%`,
                  animationDelay: `${piece.delay}s`,
                  "--hue": piece.hue,
                  "--spin": `${piece.spin}deg`,
                } as CSSProperties
              }
            >
              {piece.glyph}
            </i>
          ))}
        </div>
      )}

    </>
  );
}
