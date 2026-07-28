"use client";

import dynamic from "next/dynamic";
import "./walk.css";

const WalkGame = dynamic(() => import("./WalkGame"), {
  ssr: false,
  loading: () => (
    <main className="walk-game walk-loading" aria-live="polite">
      <div className="walk-loading-grid" aria-hidden="true" />
      <div>
        <span>INICIALIZANDO MOTOR 3D</span>
        <strong>M00NW4LK.EXE</strong>
        <i />
        <small>GENERANDO PASADIZOS · CONECTANDO CCTV</small>
      </div>
    </main>
  ),
});

export default function WalkExePage() {
  return <WalkGame />;
}
