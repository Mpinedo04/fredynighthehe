"use client";

import { type ComponentType, useEffect, useState } from "react";
import "./walk.css";
import "./walk-upgrade.css";

function LoadingScreen({ failed = false }: { failed?: boolean }) {
  return (
    <main className="walk-game walk-loading" aria-live="polite">
      <div className="walk-loading-grid" aria-hidden="true" />
      <div>
        <span>{failed ? "ERROR DE INICIALIZACIÓN" : "INICIALIZANDO MOTOR 3D"}</span>
        <strong>M00NW4LK.EXE</strong>
        <i />
        <small>
          {failed
            ? "EL MOTOR NO HA RESPONDIDO · RECARGA LA RUTA"
            : "GENERANDO PASADIZOS · CONECTANDO CCTV"}
        </small>
        {failed && (
          <button type="button" onClick={() => window.location.reload()}>
            REINTENTAR INICIALIZACIÓN
          </button>
        )}
      </div>
    </main>
  );
}

export default function WalkExePage() {
  const [WalkGame, setWalkGame] = useState<ComponentType | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    import("./WalkGame")
      .then((gameModule) => {
        if (active) setWalkGame(() => gameModule.default);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!WalkGame) return <LoadingScreen failed={loadFailed} />;
  return <WalkGame />;
}
