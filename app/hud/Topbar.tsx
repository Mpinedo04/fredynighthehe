"use client";

import { memo, useEffect, useState } from "react";
import { getMusicVolume, setMusicVolume } from "../audio/engine";
import { scenes } from "../content";

type TopbarProps = {
  soundOn: boolean;
  scrollDepth: number;
  onToggleSound: () => void;
  nightSlotRef: (element: HTMLElement | null) => void;
  extrasOpen: boolean;
  onToggleExtras: () => void;
  achievementCount: number;
  achievementTotal: number;
};

const NAV = [
  { href: "#reparto", label: "Director" },
  { href: "#referentes", label: "Multiverso" },
  { href: "#ghost", label: "Ghost" },
  { href: "#juegos", label: "Juegos", highlight: true },
  { href: "#final", label: "Final" },
] as const;

/** Topbar: brand, 4-act + Ghost nav, night clock, unified Extras trigger, soundtrack and scene strip. */
function Topbar({
  soundOn,
  scrollDepth,
  onToggleSound,
  nightSlotRef,
  extrasOpen,
  onToggleExtras,
  achievementCount,
  achievementTotal,
}: TopbarProps) {
  const [active, setActive] = useState<string>("premiere");
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setVolume(getMusicVolume()), 0);
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visible.set(entry.target.id, entry.intersectionRatio));
        let best = "";
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        });
        if (best) setActive(best);
      },
      { threshold: [0, 0.15, 0.35, 0.6] },
    );
    scenes.forEach((scene) => {
      const element = document.getElementById(scene.id);
      if (element) observer.observe(element);
    });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const activeIndex = scenes.findIndex((scene) => scene.id === active);
  const navActive = (href: string) => {
    const target = href.slice(1);
    if (target === "reparto") {
      return ["reparto", "filmografia", "detras", "expediente"].includes(active);
    }
    if (target === "juegos") return active === "juegos" || active === "escena-22";
    return active === target;
  };

  return (
    <header className="topbar">
      <a className="brand" href="#premiere" aria-label="Ir al inicio">
        <span className="brand-mark">22</span>
        <span>
          PREMIERE
          <small>LA HISTORIA CONTINÚA</small>
        </span>
      </a>
      <nav aria-label="Navegación principal">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`${navActive(item.href) ? "active" : ""} ${"highlight" in item && item.highlight ? "nav-games" : ""}`}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="topbar-tools" data-hee-control>
        <div className="topbar-night-slot" ref={nightSlotRef} />
        <button
          type="button"
          className={`topbar-extras-btn ${extrasOpen ? "open" : ""}`}
          onClick={onToggleExtras}
          aria-expanded={extrasOpen}
          aria-controls="secret-console-panel"
          title="Abrir Cuaderno del Director: mapa, secretos y logros"
        >
          <span>EXTRAS</span>
          <b>🏆 {achievementCount}/{achievementTotal}</b>
        </button>
        <div className={`sound-control ${soundOn ? "on" : ""}`}>
          <button className="sound-button" type="button" onClick={onToggleSound} aria-pressed={soundOn}>
            <span className={soundOn ? "sound-dot live" : "sound-dot"} />
            BANDA {soundOn ? "ON" : "OFF"}
          </button>
          <label className="sound-volume">
            <span className="sr-only">Volumen de la banda sonora</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(event) => {
                const next = Number(event.target.value) / 100;
                setVolume(next);
                setMusicVolume(next);
              }}
              disabled={!soundOn}
            />
          </label>
        </div>
      </div>
      <div className="scene-strip" aria-hidden="true">
        <i className="scene-strip-fill" style={{ transform: `scaleX(${scrollDepth / 100})` }} />
        {scenes.map((scene, index) => (
          <a
            key={scene.id}
            href={`#${scene.id}`}
            tabIndex={-1}
            className={index === activeIndex ? "active" : index < activeIndex ? "past" : ""}
            title={`Escena ${scene.number} · ${scene.label}`}
          >
            <span>{scene.number}</span>
            <b>{scene.label}</b>
          </a>
        ))}
      </div>
    </header>
  );
}

export default memo(Topbar);
