"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { playHeeVoice, playTone } from "../audio/engine";
import {
  chaseStage,
  chaseThreatRate,
  registerChaseStep,
  type ChaseSide,
  type ChaseStage,
} from "../prank-system.mjs";
import { playThud } from "../pranks/audio";
import { fireScare, readStorage, unlock, warnScare, writeStorage } from "../pranks/bus";
import { useModal } from "../ui/useModal";
import type { ChaseFrame, ChaseScene } from "./chase/ChaseScene";

type MoonwalkChaseProps = {
  open: boolean;
  onClose: () => void;
};

type Status = "intro" | "run" | "won" | "caught";
type SceneState = "loading" | "model" | "fallback";

const BEST_KEY = "premiere22.moonwalk-best.v1";
const CORRIDOR_METERS = 22;

/** Film subtitles for each stage of the chase. */
const SUBTITLES: Record<ChaseStage, string> = {
  approach: "Está de espaldas. Pero viene hacia ti.",
  hat: "Se ha quitado el sombrero.",
  head: "La cabeza… está girando.",
  detached: "Ya no le hace falta mirar hacia atrás.",
};

const TAUNTS = [
  { at: 0.22, rate: 1, text: "HEE-HEE" },
  { at: 0.5, rate: 1.35, text: "HEE-HEE!" },
  { at: 0.78, rate: 1.9, text: "HI-HI-HI" },
];

function timecode(seconds: number) {
  const frames = Math.floor((seconds % 1) * 24);
  const whole = Math.floor(seconds);
  return `00:00:${String(whole).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
}

/**
 * El pasadizo M00NW4LK (portada). A real-time 3D corridor (ChaseScene) with
 * the game's Subject M-22 moonwalking after you; you escape moonwalking too,
 * alternating ← → towards the exit behind you.
 */
export default function MoonwalkChase({ open, onClose }: MoonwalkChaseProps) {
  const [status, setStatus] = useState<Status>("intro");
  const [sceneState, setSceneState] = useState<SceneState>("loading");
  const [countdown, setCountdown] = useState(3);
  const [stage, setStage] = useState<ChaseStage>("approach");
  const [stumble, setStumble] = useState(0);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [result, setResult] = useState<{ seconds: number; best: number | null; record: boolean } | null>(null);
  const [lastSide, setLastSide] = useState<ChaseSide | null>(null);
  const [round, setRound] = useState(0);
  const [metersLeft, setMetersLeft] = useState(CORRIDOR_METERS);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timecodeRef = useRef<HTMLSpanElement | null>(null);
  const sceneRef = useRef<ChaseScene | null>(null);
  const frameRef = useRef<ChaseFrame>({ run: 0, threat: 0, stage: "approach", status: "intro" });
  const progressRef = useRef(0);
  const threatRef = useRef(0);
  const lastSideRef = useRef<ChaseSide | null>(null);
  const lastStepAtRef = useRef(0);
  const statusRef = useRef<Status>("intro");
  const startedAtRef = useRef(0);
  const tauntsRef = useRef(0);
  const screamRef = useRef<HTMLAudioElement | null>(null);
  useModal(open, onClose, dialogRef);

  const syncFrame = useCallback(() => {
    frameRef.current = {
      run: progressRef.current / 100,
      threat: threatRef.current,
      stage: chaseStage(threatRef.current),
      status: statusRef.current,
    };
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.style.setProperty("--run", (progressRef.current / 100).toFixed(4));
    dialog.style.setProperty("--threat", threatRef.current.toFixed(4));
  }, []);

  // Mount the 3D corridor (three.js is only downloaded when the passage opens).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    void import("./chase/ChaseScene")
      .then(({ ChaseScene: Scene }) => {
        if (cancelled) return;
        try {
          sceneRef.current = new Scene(canvas, () => frameRef.current, (modelLoaded) => {
            if (!cancelled) setSceneState(modelLoaded ? "model" : "fallback");
          });
        } catch {
          setSceneState("fallback");
        }
      })
      .catch(() => {
        if (!cancelled) setSceneState("fallback");
      });
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [open]);

  const finish = useCallback((outcome: "won" | "caught") => {
    if (statusRef.current !== "run") return;
    statusRef.current = outcome;
    setStatus(outcome);
    const seconds = (performance.now() - startedAtRef.current) / 1000;
    if (outcome === "won") {
      const previous = Number.parseFloat(readStorage(BEST_KEY) ?? "");
      const best = Number.isFinite(previous) ? previous : null;
      const record = best === null || seconds < best;
      if (record) writeStorage(BEST_KEY, seconds.toFixed(2));
      setResult({ seconds, best: record ? seconds : best, record });
      unlock("moonwalk");
      playTone(196, { type: "square", duration: 0.5, volume: 0.08 });
      playTone(392, { type: "triangle", duration: 0.9, volume: 0.08, delay: 0.12 });
      return;
    }
    setResult({ seconds, best: null, record: false });
    fireScare();
    const scream = new Audio("/audio/fnaf-jumpscare-scream.mp3");
    scream.volume = 0.55;
    scream.playbackRate = 0.72;
    screamRef.current = scream;
    void scream.play().catch(() => undefined);
  }, []);

  // Reset and run the countdown once the corridor is on screen.
  useEffect(() => {
    if (!open || sceneState === "loading") return;
    progressRef.current = 0;
    threatRef.current = 0;
    lastSideRef.current = null;
    lastStepAtRef.current = 0;
    tauntsRef.current = 0;
    statusRef.current = "intro";
    syncFrame();
    const timers = [
      window.setTimeout(() => setCountdown(2), 900),
      window.setTimeout(() => setCountdown(1), 1800),
      window.setTimeout(() => {
        statusRef.current = "run";
        startedAtRef.current = performance.now();
        syncFrame();
        setStatus("run");
      }, 2700),
    ];
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      screamRef.current?.pause();
    };
  }, [open, round, sceneState, syncFrame]);

  // The chase loop.
  useEffect(() => {
    if (!open || status !== "run") return;
    let frame = 0;
    let last = performance.now();
    let warned = false;
    let nextBeat = 0;
    const loop = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      const elapsed = (now - startedAtRef.current) / 1000;
      threatRef.current = Math.min(1, threatRef.current + chaseThreatRate(elapsed) * delta);
      const threat = threatRef.current;
      setStage((current) => {
        const next = chaseStage(threat);
        return next === current ? current : next;
      });
      if (timecodeRef.current) timecodeRef.current.textContent = timecode(elapsed);
      const pending = TAUNTS[tauntsRef.current];
      if (pending && threat >= pending.at) {
        tauntsRef.current += 1;
        void playHeeVoice(pending.rate, 0.55);
        setTaunt(pending.text);
        window.setTimeout(() => setTaunt(null), 1000);
      }
      if (now >= nextBeat) {
        playTone(52 + threat * 18, { type: "sine", duration: 0.14, volume: 0.12 + threat * 0.1 });
        nextBeat = now + 760 - threat * 480;
      }
      if (!warned && threat > 0.9) {
        warned = true;
        warnScare(900);
      }
      syncFrame();
      if (threat >= 1) {
        finish("caught");
        syncFrame();
        return;
      }
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [finish, open, status, syncFrame]);

  const step = useCallback(
    (side: ChaseSide) => {
      if (statusRef.current !== "run") return;
      const now = performance.now();
      const outcome = registerChaseStep(lastSideRef.current, side, lastStepAtRef.current, now);
      lastSideRef.current = side;
      lastStepAtRef.current = now;
      setLastSide(side);
      if (outcome.stumble) {
        setStumble((value) => value + 1);
        playThud(0.4);
        return;
      }
      progressRef.current = Math.min(100, progressRef.current + outcome.gain);
      setMetersLeft(Math.max(0, Math.round(CORRIDOR_METERS * (1 - progressRef.current / 100))));
      playTone(outcome.rhythm ? 150 : 120, { type: "triangle", duration: 0.07, volume: 0.07 });
      syncFrame();
      if (progressRef.current >= 100) {
        finish("won");
        syncFrame();
      }
    },
    [finish, syncFrame],
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        step("left");
      } else if (key === "arrowright" || key === "d") {
        event.preventDefault();
        step("right");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, step]);

  if (!open) return null;

  const restart = () => {
    sceneRef.current?.reset();
    setResult(null);
    setStage("approach");
    setCountdown(3);
    setLastSide(null);
    setMetersLeft(CORRIDOR_METERS);
    setStatus("intro");
    setRound((value) => value + 1);
  };

  const nextSide: ChaseSide = lastSide === "left" ? "right" : "left";
  const stageClass = status === "caught" ? "stage-caught" : `stage-${stage}`;

  return (
    <div
      className={`moonwalk-chase interactive scene-${sceneState} status-${status} ${stageClass}`}
      role="dialog"
      aria-modal="true"
      aria-label="Pasadizo animatrónico M00NW4LK"
      ref={dialogRef}
      tabIndex={-1}
      style={{ "--run": 0, "--threat": 0 } as CSSProperties}
      data-hee-control
    >
      <canvas ref={canvasRef} className="chase-canvas" aria-hidden="true" />

      {/* CSS corridor: only shown if WebGL or the model are unavailable. */}
      <div className="chase-fallback" aria-hidden="true">
        <div className="chase-corridor">
          <div className="corridor-ceiling" />
          <div className="corridor-floor" />
          <div className="corridor-door door-one">CAM 01</div>
          <div className="corridor-door door-two">CAM 02</div>
          <div className="corridor-door door-three">CAM 03</div>
          <i className="corridor-light light-one" />
          <i className="corridor-light light-two" />
          <i className="corridor-light light-three" />
        </div>
        <div className="hybrid-performer">
          <span className="hybrid-hat" />
          <span className="hybrid-head">
            <i className="hybrid-eye left" />
            <i className="hybrid-eye right" />
            <i className="hybrid-jaw" />
          </span>
          <span className="hybrid-neck" />
          <span className="hybrid-torso"><i /><i /><i /></span>
          <span className="hybrid-arm arm-left"><i className="white-glove" /></span>
          <span className="hybrid-arm arm-right" />
          <span className="hybrid-leg leg-left" />
          <span className="hybrid-leg leg-right" />
        </div>
      </div>

      <div className="chase-grade" aria-hidden="true" />
      <div className="chase-letterbox top" aria-hidden="true" />
      <div className="chase-letterbox bottom" aria-hidden="true" />

      <header className="chase-hud">
        <div className="chase-rec">
          <i />
          <span>REC</span>
          <span ref={timecodeRef}>00:00:00:00</span>
        </div>
        <div className="chase-title">
          <small>PASADIZO 22 · CÁMARA DE MANO</small>
          <strong>M00NW4LK</strong>
        </div>
        <button type="button" className="chase-close" onClick={onClose}>
          {status === "won" ? "SALIR CON VIDA →" : "ABORTAR ×"}
        </button>
      </header>

      {sceneState === "loading" && (
        <div className="chase-loading" role="status">
          <i />
          <span>ENCENDIENDO LOS FLUORESCENTES…</span>
        </div>
      )}

      {status === "intro" && sceneState !== "loading" && (
        <div className="chase-countdown" aria-live="assertive">
          <b key={countdown}>{countdown}</b>
          <strong>HUYE TAMBIÉN EN MOONWALK</strong>
          <p>
            Alterna <kbd>←</kbd> <kbd>→</kbd> (o <kbd>A</kbd> <kbd>D</kbd>) para retroceder
            hasta la salida sin darle la espalda.
          </p>
        </div>
      )}

      {status === "run" && (
        <p className="chase-subtitle" key={stage}>
          {SUBTITLES[stage]}
        </p>
      )}

      {taunt && (
        <div className="chase-taunt" key={taunt} aria-hidden="true">
          {taunt}
        </div>
      )}
      {stumble > 0 && status === "run" && (
        <div className="chase-stumble" key={stumble} aria-hidden="true">
          ¡TROPIEZO! · ALTERNA LOS PIES
        </div>
      )}

      {status === "caught" && <div className="chase-jumpscare-flash" aria-hidden="true" />}

      {status === "run" && (
        <div className="chase-controls">
          <button
            type="button"
            className={`chase-pad left ${nextSide === "left" ? "next" : ""}`}
            onPointerDown={(event) => {
              event.preventDefault();
              step("left");
            }}
            aria-label="Paso izquierdo"
          >
            <kbd>←</kbd>
            <small>PIE IZQ.</small>
          </button>

          <div className="chase-map" aria-hidden="true">
            <div className="chase-map-track">
              <i className="chase-map-threat" />
              <i className="chase-map-you" />
              <b className="chase-map-exit">SALIDA</b>
            </div>
            <div className="chase-map-legend">
              <span>SUJETO M</span>
              <strong>{metersLeft} M HASTA LA PUERTA</strong>
              <span>TÚ</span>
            </div>
          </div>

          <button
            type="button"
            className={`chase-pad right ${nextSide === "right" ? "next" : ""}`}
            onPointerDown={(event) => {
              event.preventDefault();
              step("right");
            }}
            aria-label="Paso derecho"
          >
            <kbd>→</kbd>
            <small>PIE DER.</small>
          </button>
        </div>
      )}

      {(status === "won" || status === "caught") && result && (
        <div className={`chase-result ${status}`} role="status">
          <div className="chase-result-slate" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </div>
          <div className="chase-result-body">
            <small>{status === "won" ? "PUERTA DE EMERGENCIA SELLADA" : "ERROR_CERVICAL_180"}</small>
            <h2>
              {status === "won" ? (
                <>HAS ESCAPADO<br /><strong>EN MOONWALK.</strong></>
              ) : (
                <>TE HA<br /><strong>ALCANZADO.</strong></>
              )}
            </h2>
            <dl>
              <div><dt>TOMA</dt><dd>{String(round + 1).padStart(2, "0")}</dd></div>
              <div><dt>TIEMPO</dt><dd>{result.seconds.toFixed(2)} s</dd></div>
              <div>
                <dt>{status === "won" ? (result.record ? "RÉCORD" : "MEJOR") : "DISTANCIA"}</dt>
                <dd>
                  {status === "won"
                    ? result.record
                      ? "¡NUEVO!"
                      : `${result.best?.toFixed(2)} s`
                    : `${CORRIDOR_METERS - metersLeft} / ${CORRIDOR_METERS} m`}
                </dd>
              </div>
            </dl>
            <p>
              {status === "won"
                ? "Retirada coreografiada. Michael estaría orgulloso; Sujeto M, no tanto."
                : "Te quedaste mirando el sombrero demasiado tiempo. Feliz escena 22."}
            </p>
            <div className="chase-result-actions">
              <button type="button" onClick={restart} data-autofocus>
                {status === "won" ? "OTRA TOMA" : "REPETIR TOMA"}
              </button>
              <a href="/walk-exe">ENTRAR EN M00NW4LK.EXE →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
