"use client";

import { memo, type CSSProperties } from "react";
import type { WalkDifficulty } from "./perception";
import { TAPES_TO_EXIT, WALK_TAPES } from "./run-report";
import { SCARE_ROSTER, type ScareMascot } from "./scare-roster";

export type QualityProfile = "low" | "medium" | "high" | "ultra";
export type AudioLevels = {
  master: number;
  ambience: number;
  music: number;
  sfx: number;
  heartbeat: number;
  jumpscare: number;
};

type WalkBriefingProps = {
  bootLines: readonly string[];
  bootStep: number;
  difficulty: WalkDifficulty;
  quality: QualityProfile;
  audioLevels: AudioLevels;
  message: string;
  sceneReady: boolean;
  onDifficulty: (mode: WalkDifficulty) => void;
  onQuality: (profile: QualityProfile) => void;
  onAudioLevel: (key: keyof AudioLevels, value: number) => void;
  onPreviewMascot: (mascot: ScareMascot) => void;
  onBegin: () => void;
};

const tapeColor = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

function WalkBriefing({
  bootLines,
  bootStep,
  difficulty,
  quality,
  audioLevels,
  message,
  sceneReady,
  onDifficulty,
  onQuality,
  onAudioLevel,
  onPreviewMascot,
  onBegin,
}: WalkBriefingProps) {
  return (
    <section className={`game-overlay briefing boot-${bootStep >= bootLines.length ? "done" : "running"}`}>
      <pre className="boot-terminal" aria-hidden="true">
        {bootLines.slice(0, bootStep).join("\n")}
        {bootStep < bootLines.length && <i className="boot-caret" />}
      </pre>

      <div className="briefing-kicker">
        <span>HORROR ANALÓGICO 3D · COMPLEJO 13×13 · 5 ALAS TEMÁTICAS</span>
        <span>{sceneReady ? "● MOTOR 3D COMPILADO" : "◌ COMPILANDO SHADERS…"}</span>
      </div>

      <h1>M00N<strong>W4LK.EXE</strong></h1>
      <p>
        02:22 AM en los <b>Estudios Plató 22</b>. El máster de tu estreno ha sido
        despedazado en <b>5 cintas</b> escondidas por cinco alas malditas.
        Recupera al menos <b>{TAPES_TO_EXIT} cintas</b> para desbloquear la Puerta de
        Estreno y sobrevive a la <b>Alerta Roja</b> mientras <b>SUJETO M-22</b>{" "}
        camina hacia atrás en la oscuridad.
      </p>

      <div className="briefing-grid">
        <div>
          <span>01 · MISIÓN EN 3 FASES</span>
          <strong>3 CINTAS → ALERTA ROJA → ESCAPE</strong>
          <small>Sigue el rastreador VHS y el mapa CCTV [TAB]. Las 5 cintas o 3 secretos + Ghost abren el Final Secreto.</small>
        </div>
        <div>
          <span>02 · SIGILO PURO</span>
          <strong>OSCURIDAD Y DESLUMBRAMIENTO</strong>
          <small>[CTRL] + [F] apagada te oculta en sombras. Enfocar [F] directo a su cara lo paraliza 2 s.</small>
        </div>
        <div>
          <span>03 · 5 ALAS Y SECRETOS</span>
          <strong>NEVERLAND · GHOST · 24 TET · FAZBEAR · PAN</strong>
          <small>Cada ala guarda un artefacto interactivo [E] que altera la partida y desbloquea lore real.</small>
        </div>
      </div>

      <div className="briefing-tapes" aria-label="Las cinco cintas de Raúl">
        <span className="briefing-roster-title">
          OBJETIVO · RECUPERA {TAPES_TO_EXIT} DE LAS {WALK_TAPES.length} CINTAS PARA ACTIVAR LA PUERTA DE ESTRENO
        </span>
        <div>
          {WALK_TAPES.map((tape) => (
            <figure key={tape.code} style={{ "--tape": tapeColor(tape.color) } as CSSProperties}>
              <img src={tape.thumbnail} alt="" loading="lazy" />
              <figcaption>
                <small>{tape.code}</small>
                {tape.title}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="briefing-cta-row">
        <button type="button" className="briefing-start-primary" onClick={onBegin}>
          ▶ ENTRAR EN PLATÓ 22 <span>WASD →</span>
        </button>
        <div className="difficulty-picker three-modes" role="group" aria-label="Modo de juego">
          <button
            type="button"
            className={difficulty === "estreno" ? "active" : ""}
            onClick={() => onDifficulty("estreno")}
          >
            ESTRENO <small>TERROR EQUILIBRADO</small>
          </button>
          <button
            type="button"
            className={difficulty === "pesadilla" ? "active" : ""}
            onClick={() => onDifficulty("pesadilla")}
          >
            PESADILLA <small>IA LETAL</small>
          </button>
          <button
            type="button"
            className={difficulty === "turista" ? "active" : ""}
            onClick={() => onDifficulty("turista")}
          >
            TURISTA <small>EXPLORAR SIN MUERTE</small>
          </button>
        </div>
      </div>

      <details className="briefing-advanced">
        <summary>⚙ OPCIONES AVANZADAS · PERFIL GRÁFICO, AUDIO Y SCREAMS</summary>
        <div className="briefing-roster" aria-label="Archivo de animatrónicos">
          <span className="briefing-roster-title">
            RED MASCOTA CORRUPTA · 4 SCREAMS PROCEDURALES
          </span>
          <div>
            {SCARE_ROSTER.map((mascot) => (
              <article key={mascot.id}>
                <i
                  className="briefing-mascot-image"
                  style={{ backgroundImage: `url(${mascot.image})` }}
                  aria-hidden="true"
                />
                <span>
                  <strong>{mascot.name}</strong>
                  <small>{mascot.role}</small>
                </span>
                <button
                  type="button"
                  onClick={() => onPreviewMascot(mascot)}
                  aria-label={`Oír scream de ${mascot.name}`}
                >
                  ▶ OÍR
                </button>
              </article>
            ))}
          </div>
        </div>
        <div className="quality-picker" aria-label="Calidad gráfica">
          <span>PERFIL GRÁFICO (RECOMENDADO: MEDIO PARA 60 FPS)</span>
          <div>
            {(["low", "medium", "high", "ultra"] as const).map((profile) => (
              <button
                key={profile}
                type="button"
                className={quality === profile ? "active" : ""}
                onClick={() => onQuality(profile)}
              >
                {profile === "low"
                  ? "BAJO"
                  : profile === "medium"
                    ? "MEDIO"
                    : profile === "high"
                      ? "ALTO"
                      : "ULTRA"}
              </button>
            ))}
          </div>
        </div>
        <div className="audio-mixer" aria-label="Mezclador de audio">
          {(
            [
              ["master", "GENERAL"],
              ["ambience", "AMBIENTE"],
              ["music", "MÚSICA"],
              ["sfx", "EFECTOS"],
              ["heartbeat", "LATIDO"],
              ["jumpscare", "JUMPSCARE"],
            ] as Array<[keyof AudioLevels, string]>
          ).map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioLevels[key]}
                onChange={(event) => onAudioLevel(key, Number(event.target.value))}
              />
            </label>
          ))}
        </div>
      </details>

      <small className="fiction-note">
        Horror analógico creado para los 22 años de Raúl · Auriculares muy recomendados
      </small>
      <p className="system-message">{message}</p>
    </section>
  );
}

export default memo(WalkBriefing);
