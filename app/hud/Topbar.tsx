"use client";

import { memo, useEffect, useState } from "react";
import { getMusicVolume, setMusicVolume } from "../audio/engine";
import { scenes } from "../content";

type TopbarProps = {
  soundOn: boolean;
  scrollDepth: number;
  onToggleSound: () => void;
  nightSlotRef: (element: HTMLElement | null) => void;
};

const NAV = [
  { href: "#filmografia", label: "Filmografía" },
  { href: "#expediente", label: "Expediente" },
  { href: "#referentes", label: "Referentes" },
  { href: "#final", label: "Escena final" },
];

/** Topbar: brand, active-scene nav, night clock slot, soundtrack and the film-strip progress. */
function Topbar({ soundOn, scrollDepth, onToggleSound, nightSlotRef }: TopbarProps) {
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
    if (target === "final") return active === "final" || active === "escena-22";
    if (target === "referentes") return active === "referentes";
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
          <a key={item.href} href={item.href} className={navActive(item.href) ? "active" : ""}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="topbar-night-slot" ref={nightSlotRef} />
      <div className={`sound-control ${soundOn ? "on" : ""}`}>
        <button className="sound-button" type="button" onClick={onToggleSound} aria-pressed={soundOn}>
          <span className={soundOn ? "sound-dot live" : "sound-dot"} />
          BANDA SONORA {soundOn ? "ON" : "OFF"}
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
