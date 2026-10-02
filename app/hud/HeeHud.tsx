"use client";

import { memo } from "react";
import { heeButtonLabels, heeDelayForDepth, heeMultiplierForDepth } from "../content";

type HeeHudProps = {
  visible: boolean;
  scrollDepth: number;
  muteAttempts: number;
  directorOpen: boolean;
  heeMuted: boolean;
  silenceBanner: string | null;
  thrillerOn: boolean;
  onAttempt: () => void;
  onSilence: () => void;
  onStopThriller: () => void;
};

/** Everything the hee-hee puts on screen: chaos words, the evasive panel, banners. */
function HeeHud({
  visible,
  scrollDepth,
  muteAttempts,
  directorOpen,
  heeMuted,
  silenceBanner,
  thrillerOn,
  onAttempt,
  onSilence,
  onStopThriller,
}: HeeHudProps) {
  const multiplier = heeMultiplierForDepth(scrollDepth / 100);

  return (
    <>
      {visible && (
        <div className={`hee-chaos-visual chaos-x${multiplier}`} aria-hidden="true">
          {Array.from({ length: multiplier }, (_, index) => (
            <span key={index} style={{ animationDelay: `${index * -0.11}s` }}>
              {index % 2 ? "HI-HI" : "HEE-HEE"}
            </span>
          ))}
        </div>
      )}

      {visible && (
        <aside
          className={`hee-control-panel evade-${muteAttempts} ${directorOpen ? "director-broken" : ""}`}
          data-hee-control
          aria-live="polite"
        >
          <div className="hee-alert-line">
            <span className="hee-alert-dot" />
            <small>CLIP REAL · SATURACIÓN VOCAL</small>
            <b>{String(muteAttempts).padStart(2, "0")}/05</b>
          </div>
          <div className="hee-control-copy">
            <span aria-hidden="true">HEE</span>
            <div>
              <strong>HEE-HEE EN REACCIÓN EN CADENA</strong>
              <p>La frecuencia ya ha superado el límite anterior. Ahora también se multiplica.</p>
            </div>
          </div>
          <div className="hee-readouts">
            <div>
              <span>PROFUNDIDAD</span>
              <b>{scrollDepth}%</b>
            </div>
            <div>
              <span>VOLUMEN</span>
              <b>{Math.min(90, Math.round(18 + scrollDepth * 0.72))}%</b>
            </div>
            <div>
              <span>FRECUENCIA</span>
              <b>{(1000 / heeDelayForDepth(scrollDepth / 100)).toFixed(1)}/s</b>
            </div>
            <div>
              <span>MULTIPLICADOR</span>
              <b>×{multiplier}</b>
            </div>
          </div>
          <div className="hee-intensity-track" aria-hidden="true">
            <i style={{ width: `${scrollDepth}%` }} />
          </div>
          <button
            type="button"
            onClick={onAttempt}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onSilence();
              }
            }}
            aria-label={
              muteAttempts < 5
                ? `Intentar silenciar el hee-hee. Intento ${muteAttempts + 1} de 6`
                : "Silenciar definitivamente el hee-hee"
            }
          >
            {directorOpen ? "UN DIRECTOR NO PULSA BOTONES" : heeButtonLabels[muteAttempts]}
            <span aria-hidden="true">{muteAttempts < 5 ? "↗" : "■"}</span>
          </button>
          <p className="hee-footnote">
            {directorOpen
              ? "El botón se ha partido en dos. Prueba a gritar."
              : muteAttempts < 5
                ? "El botón presenta una resistencia coreográfica inesperada."
                : "Ya se ha cansado. Ahora sí puedes atraparlo."}
          </p>
        </aside>
      )}

      {heeMuted && !thrillerOn && (
        <div className="hee-silenced" role="status" data-hee-control>
          <span>■</span>
          {silenceBanner ?? "HEE-HEE SILENCIADO · MISCHIEF MANAGED"}
        </div>
      )}

      {thrillerOn && (
        <div className="thriller-notice" role="status" data-hee-control>
          <span className="thriller-notice-eq" aria-hidden="true"><i /><i /><i /><i /></span>
          <div>
            <small>¿QUERÍAS SILENCIO?</small>
            <strong>Silencio concedido. Banda sonora alternativa activada.</strong>
          </div>
          <button type="button" onClick={onStopThriller}>APAGAR ×</button>
        </div>
      )}
    </>
  );
}

export default memo(HeeHud);
