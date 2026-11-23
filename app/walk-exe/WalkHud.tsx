"use client";

import { memo, type CSSProperties } from "react";
import type { EnemyState } from "./game-core";
import type { ObjectiveReading } from "./objective-tracker";
import type { WalkDifficulty } from "./perception";
import { TAPES_TO_EXIT, WALK_TAPES } from "./run-report";
import { STUDIO_WINGS, type StudioEggId, type StudioWingId } from "./studio-layout";

export type HudSnapshot = {
  bpm: number;
  distance: number;
  traveled: number;
  sector: string;
  wing: StudioWingId;
  enemyMode: EnemyState;
  echoes: number;
  tapes: number[];
  eggsFound: StudioEggId[];
  hardBreadArmed: boolean;
  ghostBlessed: boolean;
  redAlert: boolean;
  detectionPct: number;
  stealthState: "hidden" | "dim" | "lit";
  dazzled: boolean;
  objective: ObjectiveReading | null;
  interactPrompt: string | null;
  loreBanner: { kicker: string; text: string } | null;
  prompt: string;
  difficulty: WalkDifficulty;
};

type WalkHudProps = {
  hud: HudSnapshot;
  pointerHelp: boolean;
  tabletOpen: boolean;
  onRequestControl: () => void;
};

const enemyStateLabels: Record<EnemyState, string> = {
  patrol: "PATRULLA",
  listen: "ESCUCHANDO",
  investigate: "INVESTIGANDO",
  search: "BUSCANDO",
  chase: "PERSECUCIÓN",
  lure: "DISTRAÍDO",
  "vent-watch": "VIGILANDO CONDUCTO",
  ambush: "EMBOSCADA",
  recover: "REPELIDO",
};

const tapeColor = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

function WalkHud({ hud, pointerHelp, tabletOpen, onRequestControl }: WalkHudProps) {
  const wingInfo = STUDIO_WINGS[hud.wing];

  return (
    <>
      <section className="walk-hud" aria-label="Estado de la partida">
        <div className="hud-block heartbeat-block">
          <span>PROXIMIDAD {hud.difficulty === "turista" ? "· TURISTA" : ""}</span>
          <strong>
            {hud.bpm}
            <small>BPM</small>
          </strong>
          <div className="heart-line">
            {Array.from({ length: 15 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        </div>

        <div
          className="hud-block wing-block"
          style={{ "--wing-accent": wingInfo.accentCss } as CSSProperties}
        >
          <span>{wingInfo.code} · {hud.sector}</span>
          <strong>{wingInfo.name}</strong>
          <small>IA · {enemyStateLabels[hud.enemyMode]} (~{hud.distance} m)</small>
          <small>SECRETOS · {hud.eggsFound.length}/5</small>
        </div>

        <div className="hud-block echo-block">
          <span>RECURSOS TÁCTICOS</span>
          <strong>
            {String(hud.echoes).padStart(2, "0")}
            <small>ECOS</small>
          </strong>
          <small>G · SEÑUELO · Q · {hud.hardBreadArmed ? "🥖 PAN SÍSMICO" : "PIEZA"}</small>
        </div>

        <div className={`hud-block tapes-block ${hud.tapes.length >= TAPES_TO_EXIT ? "unlocked" : ""}`}>
          <span>CINTAS DE RAÚL</span>
          <strong>
            {hud.tapes.length}
            <small>/{WALK_TAPES.length}</small>
          </strong>
          <div className="tape-slots" aria-hidden="true">
            {WALK_TAPES.map((tape, index) => (
              <i
                key={tape.code}
                className={hud.tapes.includes(index) ? "got" : ""}
                style={{ "--tape": tapeColor(tape.color) } as CSSProperties}
              />
            ))}
          </div>
          <small>
            {hud.tapes.length >= WALK_TAPES.length
              ? "5/5 · DIRECTOR’S CUT"
              : hud.tapes.length >= TAPES_TO_EXIT
                ? "SALIDA ABIERTA · ESCAPA"
                : `FALTAN ${TAPES_TO_EXIT - hud.tapes.length} PARA SALIDA`}
          </small>
        </div>
      </section>

      {hud.redAlert && !tabletOpen && (
        <div className="red-alert-banner" role="alert">
          <i aria-hidden="true" />
          <span>FASE 2 · ALERTA ROJA · PUERTA DE ESTRENO ABIERTA · ¡CORRE A LA SALIDA!</span>
        </div>
      )}

      {hud.loreBanner && !tabletOpen && (
        <div className="lore-transmission" role="status">
          <small>{hud.loreBanner.kicker}</small>
          <p>{hud.loreBanner.text}</p>
        </div>
      )}

      <div className="crosshair" aria-hidden="true">
        <i />
        <i />
      </div>

      {hud.interactPrompt && !tabletOpen && (
        <div className="interact-callout" role="status">
          {hud.interactPrompt}
        </div>
      )}

      <aside className={`objective-card ${hud.objective?.kind === "exit" ? "exit-ready" : ""}`}>
        <div className="objective-head">
          <span>{hud.redAlert ? "FASE 2 · HUIDA FINAL" : "FASE 1 · RECUPERACIÓN"}</span>
          <span className={`stealth-pill stealth-${hud.stealthState}`}>
            {hud.difficulty === "turista"
              ? "◎ MODO TURISTA"
              : hud.dazzled
                ? "⚡ M-22 PARALIZADO"
                : hud.stealthState === "hidden"
                  ? "● OCULTO EN SOMBRA"
                  : hud.stealthState === "dim"
                    ? "◐ PERFIL BAJO"
                    : "☀ VISIBLE (LINTERNA ON)"}
          </span>
        </div>
        <strong>
          {hud.tapes.length < TAPES_TO_EXIT
            ? `RECUPERA ${TAPES_TO_EXIT} CINTAS DE RAÚL (${hud.tapes.length}/${TAPES_TO_EXIT})`
            : hud.tapes.length < WALK_TAPES.length
              ? "PUERTA CON ENERGÍA · ESCAPA O VE A POR LAS 5"
              : "5/5 CINTAS · ESCAPA PARA EL DIRECTOR’S CUT"}
        </strong>
        {hud.objective && (
          <div className={`signal-beacon strength-${hud.objective.signalStrength}`}>
            <b className="signal-arrow" aria-hidden="true">
              {hud.objective.arrow}
            </b>
            <div>
              <small>
                {hud.objective.kind === "exit"
                  ? "SEÑAL PUERTA DE ESTRENO"
                  : `RASTREADOR VHS · ${hud.objective.code}`}
              </small>
              <strong>{hud.objective.label}</strong>
            </div>
            <span className="signal-dist">~{hud.objective.meters} m</span>
          </div>
        )}
        {hud.detectionPct > 4 && hud.difficulty !== "turista" && (
          <div
            className="detection-bar"
            role="status"
            aria-label={`Nivel de detección ${hud.detectionPct}%`}
          >
            <span>DETECCIÓN VISUAL</span>
            <div>
              <i style={{ width: `${hud.detectionPct}%` }} />
            </div>
            <b>{hud.detectionPct}%</b>
          </div>
        )}
        {hud.ghostBlessed && (
          <small className="relic-badge">
            ✦ BENDICIÓN DEL CLERO (1969) · MARY ON A CROSS ACTIVA
          </small>
        )}
        <p>{hud.prompt}</p>
      </aside>

      <div className="controls-hint">
        <span><b>WASD</b> MOVER</span>
        <span><b>SHIFT</b> CORRER (RUIDO)</span>
        <span><b>CTRL</b> AGACHARSE</span>
        <span><b>E</b> INTERACTUAR</span>
        <span><b>F</b> LINTERNA / CEGAR</span>
        <span><b>G</b> ECO SEÑUELO</span>
        <span><b>Q</b> {hud.hardBreadArmed ? "LANZAR PAN" : "LANZAR PIEZA"}</span>
        <span><b>TAB</b> MAPA CCTV</span>
      </div>

      {pointerHelp && !tabletOpen && (
        <button className="pointer-help" type="button" onClick={onRequestControl}>
          <span>CONTROL ALTERNATIVO ACTIVO</span>
          CLIC PARA CAPTURAR RATÓN · O ARRASTRA PARA MIRAR
        </button>
      )}
    </>
  );
}

export default memo(WalkHud);
