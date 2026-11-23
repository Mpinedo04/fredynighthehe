"use client";

import { memo } from "react";
import { premiereActs } from "../content";

type PremiereMapProps = {
  visitedWorlds: number;
  ghostLit: boolean;
  materialRead: boolean;
  clapped: boolean;
  unlockedAchievements: number;
  achievementTotal: number;
  onOpenExtras: () => void;
};

/**
 * The Premiere Program ("Programa de Mano"): sits right below the Hero so Raúl
 * immediately sees the 4 Acts, the Ghost ritual, the 3D games and the finale
 * without ever feeling lost.
 */
function PremiereMap({
  visitedWorlds,
  ghostLit,
  materialRead,
  clapped,
  unlockedAchievements,
  achievementTotal,
  onOpenExtras,
}: PremiereMapProps) {
  const actStatus = (id: string) => {
    if (id === "reparto") return "VÍDEOS · FOTOS · EXPEDIENTE";
    if (id === "referentes") {
      return `${visitedWorlds}/4 MUNDOS · ${ghostLit ? "RITUAL GHOST ✓" : "GHOST ACTIVO"}`;
    }
    if (id === "juegos") {
      return materialRead ? "M00NW4LK.EXE LISTO ✓" : "2 JUEGOS 3D + CORTE 22";
    }
    return clapped ? "ESCENA 22 COMPLETADA ✓" : "CLAQUETA · REGALO FINAL";
  };

  return (
    <section className="premiere-program section-pad" aria-label="Programa de la Premiere">
      <div className="program-header" data-reveal>
        <div>
          <p className="eyebrow red">
            <span className="scene-chip">PROGRAMA DE MANO</span> GUÍA DE LA PREMIERE
          </p>
          <h2>Cuatro actos.<br />Cero pérdida.</h2>
        </div>
        <div className="program-aside">
          <p>
            Todo está ordenado como una película de estreno: sigue bajando en orden o
            salta directo a cualquier acto. <strong>Activa el sonido</strong> arriba cuando
            quieras... bajo tu propia responsabilidad.
          </p>
          <button
            type="button"
            className="program-extras-btn"
            onClick={onOpenExtras}
            data-hee-control
          >
            <span>🗺️ CUADERNO DEL DIRECTOR · LOGROS</span>
            <b>{unlockedAchievements}/{achievementTotal}</b>
          </button>
        </div>
      </div>

      <nav className="program-grid" aria-label="Actos de la premiere">
        {premiereActs.map((act, index) => (
          <a
            key={act.id}
            href={act.href}
            className={`program-card act-${index + 1}`}
            data-reveal="row"
          >
            <div className="program-card-top">
              <span>{act.number}</span>
              <small>{act.tag}</small>
            </div>
            <strong>{act.title}</strong>
            <p>{act.subtitle}</p>
            <footer>
              <em>{actStatus(act.id)}</em>
              <b aria-hidden="true">→</b>
            </footer>
          </a>
        ))}
      </nav>
    </section>
  );
}

export default memo(PremiereMap);
