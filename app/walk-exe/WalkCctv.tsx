"use client";

import { memo, type CSSProperties, type RefObject } from "react";
import { TAPES_TO_EXIT } from "./run-report";
import type { ScareMascot } from "./scare-roster";

export type MapDot = {
  code: string;
  color: string;
  left: number;
  top: number;
  collected: boolean;
};

export type WingMapLabel = {
  id: string;
  short: string;
  color: string;
  left: number;
  top: number;
  done: boolean;
};

type WalkCctvProps = {
  cctvFeedRef: RefObject<HTMLDivElement | null>;
  cameraNames: readonly string[];
  cctvIndex: number;
  signalLost: boolean;
  motionDetected: boolean;
  cctvEncounter: ScareMascot | null;
  cctvEncounterPhase: "idle" | "presence" | "scream";
  power: number;
  tapesHeld: number;
  mapSegments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  mapPlayer: { left: number; top: number };
  cameraMapPositions: Array<{ left: number; top: number }>;
  tapeMapMarkers: MapDot[];
  wingMapLabels: WingMapLabel[];
  exitMapMarker: { left: number; top: number } | null;
  onPrimeAudio: () => void;
  onChooseCamera: (index: number, timestamp: number) => void;
  onClose: () => void;
};

function WalkCctv({
  cctvFeedRef,
  cameraNames,
  cctvIndex,
  signalLost,
  motionDetected,
  cctvEncounter,
  cctvEncounterPhase,
  power,
  tapesHeld,
  mapSegments,
  mapPlayer,
  cameraMapPositions,
  tapeMapMarkers,
  wingMapLabels,
  exitMapMarker,
  onPrimeAudio,
  onChooseCamera,
  onClose,
}: WalkCctvProps) {
  return (
    <section className="cctv-tablet" aria-label="Red de cámaras de Plató 22">
      <div className="tablet-shell">
        <div
          ref={cctvFeedRef}
          className={`cctv-feed${signalLost ? " signal-lost" : ""}`}
        >
          <div className="cctv-scan" />
          {!signalLost && cctvEncounter && (
            <div
              className={`cctv-intruder encounter-${cctvEncounterPhase}${
                cctvEncounterPhase === "scream" ? " detected" : ""
              }`}
              style={{ backgroundImage: `url(${cctvEncounter.image})` }}
              aria-hidden="true"
            >
              <span>{cctvEncounter.cameraCode}</span>
              <strong>{cctvEncounter.name}</strong>
              <small>{cctvEncounter.role}</small>
              <em>AUDIO · {cctvEncounter.signal}</em>
            </div>
          )}
          {signalLost && (
            <div className="cctv-signal-loss">
              <strong>SIGNAL LOST</strong>
              <span>RENEGOCIANDO ENLACE...</span>
            </div>
          )}
          <div className="cctv-feed-top">
            <span>● LIVE</span>
            <strong>{cameraNames[cctvIndex]}</strong>
            <span>02:22 AM</span>
          </div>
          <div className="cctv-warning">
            <span>SEÑAL DE MOVIMIENTO</span>
            <b>
              {signalLost
                ? "SIN SEÑAL"
                : cctvEncounterPhase === "scream"
                  ? "¡BAJA EL MONITOR!"
                  : cctvEncounter
                    ? "PRESENCIA PARÁSITA"
                    : motionDetected
                      ? "SUJETO M DETECTADO"
                      : "SIN ACTIVIDAD"}
            </b>
          </div>
        </div>

        <div className="cctv-panel">
          <div className="cctv-map">
            <svg
              className="map-schematic"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {mapSegments.map((segment, index) => (
                <line
                  key={`${segment.x1}-${segment.y1}-${index}`}
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                />
              ))}
            </svg>
            <span
              className="map-office"
              style={{ left: `${mapPlayer.left}%`, top: `${mapPlayer.top}%` }}
            >
              YOU
            </span>
            {wingMapLabels.map((wing) => (
              <span
                key={wing.id}
                className={`map-wing-tag ${wing.done ? "done" : ""}`}
                style={
                  {
                    left: `${wing.left}%`,
                    top: `${wing.top}%`,
                    "--wing-color": wing.color,
                  } as CSSProperties
                }
                title={wing.short}
              >
                {wing.done ? "✓" : "✦"}
              </span>
            ))}
            {tapeMapMarkers.map(
              (marker) =>
                !marker.collected && (
                  <span
                    key={marker.code}
                    className="map-tape-dot"
                    title={`Cinta ${marker.code}`}
                    style={
                      {
                        left: `${marker.left}%`,
                        top: `${marker.top}%`,
                        "--tape": marker.color,
                      } as CSSProperties
                    }
                  >
                    ◆
                  </span>
                ),
            )}
            {exitMapMarker && (
              <span
                className={`map-exit-dot ${tapesHeld >= TAPES_TO_EXIT ? "unlocked" : ""}`}
                title={
                  tapesHeld >= TAPES_TO_EXIT
                    ? "Puerta de Estreno ABIERTA"
                    : "Puerta bloqueada (requiere 3 cintas)"
                }
                style={{ left: `${exitMapMarker.left}%`, top: `${exitMapMarker.top}%` }}
              >
                {tapesHeld >= TAPES_TO_EXIT ? "SALIDA" : "🔒"}
              </span>
            )}
            {cameraNames.map((name, index) => (
              <button
                key={name}
                type="button"
                className={cctvIndex === index ? "active" : ""}
                onPointerDown={onPrimeAudio}
                onClick={(event) => onChooseCamera(index, event.timeStamp)}
                style={{
                  left: `${cameraMapPositions[index]?.left ?? 12}%`,
                  top: `${cameraMapPositions[index]?.top ?? 12}%`,
                }}
              >
                C{index + 1}
              </button>
            ))}
          </div>

          <div className="cctv-map-legend" aria-hidden="true">
            <span><b>YOU</b> TÚ</span>
            <span><i className="leg-tape">◆</i> CINTAS</span>
            <span><i className="leg-relic">✦</i> ALAS/SECRETOS</span>
            <span><i className="leg-exit">■</i> SALIDA</span>
          </div>

          <div className="cctv-power">
            <span>ENERGÍA DE RED</span>
            <div>
              <i style={{ width: `${power}%` }} />
            </div>
            <strong>{power}%</strong>
          </div>

          <button className="tablet-close" type="button" onClick={onClose}>
            BAJAR MONITOR · TAB
          </button>
        </div>
      </div>
    </section>
  );
}

export default memo(WalkCctv);
