"use client";

import { memo, type CSSProperties } from "react";
import Link from "next/link";
import { WALK_TAPES, type RunGrade } from "./run-report";
import type { StudioEggId } from "./studio-layout";

export type EndingRunStats = {
  escaped: boolean;
  seconds: number;
  meters: number;
  tapes: number[];
  eggsFound: StudioEggId[];
  echoesUsed: number;
  objectsThrown: number;
  dazzles: number;
  closeCalls: number;
  peakBpm: number;
  autopsyTip: string;
  grade: RunGrade;
  best: number | null;
  record: boolean;
};

type WalkEndingProps = {
  phase: "caught" | "escaped";
  message: string;
  stats: EndingRunStats | null;
  onQuickRetry: () => void;
  onNewMaze: () => void;
};

const EGG_CATALOG: ReadonlyArray<{ id: StudioEggId; label: string; wing: string }> = [
  { id: "neverland-vitrine", label: "Guante de Neverland (Toma 19)", wing: "MJ" },
  { id: "ghost-vinyl", label: "Vinilo 7\" Mary On A Cross (1969)", wing: "GHOST" },
  { id: "acoustic-signal", label: "Señal 24 TET · Encuentros", wing: "SPIELBERG / 24 TET" },
  { id: "fazbear-honk", label: "Póster CELEBRATE! 22 (HONK)", wing: "FNAF" },
  { id: "hard-bread", label: "Reliquia P01 · Pan Sísmico", wing: "EL PAN TA' DURO" },
];

const tapeColor = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

function WalkEnding({ phase, message, stats, onQuickRetry, onNewMaze }: WalkEndingProps) {
  const isCollectors = phase === "escaped" && stats?.grade.ending === "collectors-cut";
  const minutes = stats ? Math.floor(stats.seconds / 60) : 0;
  const seconds = stats ? Math.floor(stats.seconds % 60) : 0;

  return (
    <section
      className={`game-overlay result ${phase} ${isCollectors ? "collectors-cut" : ""}`}
    >
      <span className="result-code">
        {phase === "caught"
          ? "ERROR_CERVICAL_180 · SEÑAL CORTADA"
          : isCollectors
            ? "★ FINAL SECRETO · DIRECTOR’S CUT · ARCHIVO 22 ★"
            : "COMPUERTA SELLADA · CORTE DE SUPERVIVENCIA"}
      </span>

      <h2>
        {phase === "caught" ? (
          <>
            TE HA<br />ENCONTRADO.
          </>
        ) : isCollectors ? (
          <>
            EL ARCHIVO 22<br />
            <strong>ES TUYO.</strong>
          </>
        ) : (
          <>
            HAS SALIDO.<br />
            <strong>PERO SIGUE DETRÁS.</strong>
          </>
        )}
      </h2>

      <p className="ending-epilogue">
        {phase === "caught"
          ? message
          : isCollectors
            ? "Proyección restaurada · Toma Maestra 22/22. Recuperaste las cintas y los secretos que el estudio intentó enterrar. Sujeto M-22 se detuvo en el umbral y bajó el sombrero: no te perseguía para destruir la película, sino para asegurarse de que nunca dejaras de rodar. Feliz cumpleaños 22, director."
            : "La compuerta de acero se cerró a centímetros de su máscara de porcelana. Un último «hee-hee» amortiguado resonó al otro lado. La cinta está a salvo, Raúl... pero la energía del plató solo aguanta hasta las 06:00 AM."}
      </p>

      {phase === "caught" && stats?.autopsyTip && (
        <div className="autopsy-tip" role="note">
          <span>INFORME FORENSE · POR QUÉ TE ENCONTRÓ</span>
          <strong>{stats.autopsyTip}</strong>
        </div>
      )}

      {stats && (
        <div className={`run-report grade-${stats.grade.grade.replace("+", "plus")}`}>
          <div className="run-grade" aria-label={`Nota ${stats.grade.grade}`}>
            <b>{stats.grade.grade}</b>
            <span>{stats.grade.title}</span>
          </div>
          <p className="run-line">{stats.grade.line}</p>
          <dl className="run-stats">
            <div>
              <dt>TIEMPO</dt>
              <dd>
                {minutes}:{String(seconds).padStart(2, "0")}
              </dd>
            </div>
            <div>
              <dt>CINTAS</dt>
              <dd>
                {stats.tapes.length}/{WALK_TAPES.length}
              </dd>
            </div>
            <div>
              <dt>SECRETOS</dt>
              <dd>{stats.eggsFound.length}/5</dd>
            </div>
            <div>
              <dt>DESLUMBRES</dt>
              <dd>{stats.dazzles}</dd>
            </div>
            <div>
              <dt>SUSTOS ESQUIVADOS</dt>
              <dd>{stats.closeCalls}</dd>
            </div>
            <div>
              <dt>PULSO MÁX.</dt>
              <dd>{stats.peakBpm} BPM</dd>
            </div>
          </dl>

          {stats.escaped && stats.best !== null && (
            <p className="run-best">
              {stats.record ? "★ ¡NUEVO RÉCORD PERSONAL!" : "MEJOR TIEMPO"} ·{" "}
              {Math.floor(stats.best / 60)}:
              {String(Math.floor(stats.best % 60)).padStart(2, "0")}
            </p>
          )}

          <div className="run-tapes" aria-label="Cintas recuperadas">
            {WALK_TAPES.map((tape, index) => (
              <span
                key={tape.code}
                className={stats.tapes.includes(index) ? "got" : ""}
                style={{ "--tape": tapeColor(tape.color) } as CSSProperties}
                title={tape.title}
              >
                {tape.code} · {tape.title}
              </span>
            ))}
          </div>

          <div className="run-eggs" aria-label="Secretos y easter eggs del plató">
            <small>ARCHIVO DE EASTER EGGS DEL PLATÓ ({stats.eggsFound.length}/5)</small>
            <ul>
              {EGG_CATALOG.map((egg) => {
                const found = stats.eggsFound.includes(egg.id);
                return (
                  <li key={egg.id} className={found ? "found" : ""}>
                    <b>{found ? "✦" : "○"}</b>
                    <span>{egg.wing}</span>
                    <em>{found ? egg.label : "Sin descubrir"}</em>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="ending-actions">
        {phase === "caught" && (
          <button type="button" className="btn-quick-retry" onClick={onQuickRetry}>
            ⚡ REINTENTO RÁPIDO (MISMO PLATÓ)
          </button>
        )}
        <button type="button" onClick={onNewMaze}>
          {phase === "escaped" ? "GENERAR OTRO PLATÓ 13×13" : "GENERAR OTRO PLATÓ"}
        </button>
        <Link href={phase === "escaped" ? "/#final" : "/#juegos"} className="ending-home-link">
          {phase === "escaped"
            ? "CONTINUAR AL FINAL DE PREMIERE 22 →"
            : "VOLVER A LA PREMIERE"}
        </Link>
      </div>
    </section>
  );
}

export default memo(WalkEnding);
