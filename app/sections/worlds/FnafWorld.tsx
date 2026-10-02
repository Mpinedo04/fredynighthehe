"use client";

import { memo, useEffect, useRef, useState } from "react";
import { animatronicArchive, cameraFeeds } from "../../content";
import { fireScare, warnScare } from "../../pranks/bus";
import { useNight } from "../../ui/nightStore";

type FnafWorldProps = {
  materialRead: boolean;
  onOpenRecovered: () => void;
};

/** World 03: the security office. The CCTV console shows the real night power. */
function FnafWorld({ materialRead, onOpenRecovered }: FnafWorldProps) {
  const [cameraFeed, setCameraFeed] = useState(0);
  const [screamActive, setScreamActive] = useState<number | null>(null);
  const night = useNight();
  const sampleRef = useRef<HTMLAudioElement | null>(null);
  const introRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const feed = cameraFeeds[cameraFeed];
  const power = Math.ceil(night.power);

  useEffect(
    () => () => {
      sampleRef.current?.pause();
      introRef.current?.pause();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const playJumpscare = (index: number) => {
    sampleRef.current?.pause();
    introRef.current?.pause();
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const profile = animatronicArchive[index];
    const sample = new Audio(profile.audio);
    sample.preload = "auto";
    sample.volume = 0.42;
    sampleRef.current = sample;
    setScreamActive(index);
    // The glass trembles at the same time: it warns, but it is useless.
    warnScare(700);
    fireScare();

    const release = () => {
      setScreamActive((current) => (current === index ? null : current));
      if (sampleRef.current === sample) sampleRef.current = null;
    };
    sample.addEventListener("ended", release, { once: true });

    const playPrimary = () => {
      timerRef.current = null;
      if (profile.name === "MANGLE") {
        introRef.current?.pause();
        introRef.current = null;
      }
      void sample.play().catch(release);
    };

    if ("intro" in profile) {
      const intro = new Audio(profile.intro);
      intro.volume = profile.name === "MANGLE" ? 0.34 : 0.26;
      introRef.current = intro;
      void intro.play().catch(() => undefined);
      timerRef.current = window.setTimeout(playPrimary, profile.introDelayMs);
      return;
    }
    playPrimary();
  };

  return (
    <article className="idol-card fnaf-world">
      <div className="idol-label">
        <span>REFERENTE 03</span>
        <strong>TURNO DE NOCHE · {night.clock}</strong>
      </div>
      <div className="security-office">
        <div className={`security-monitor feed-${cameraFeed}`}>
          <div className="monitor-noise" aria-hidden="true" />
          <div className="camera-lens-data" aria-hidden="true">
            <span>ISO 12800</span>
            <span>IR AUTO</span>
            <span>3.6 MM</span>
          </div>
          <div className="monitor-topline">
            <span>● REC</span>
            <strong>{feed.camera} · {feed.room}</strong>
            <span>{night.clock}</span>
          </div>
          <div className="camera-room" aria-hidden="true">
            <div className="room-ceiling"><i /><i /><i /></div>
            <div className="room-backwall">
              <span className="room-poster poster-one">CELEBRATE!</span>
              <span className="room-poster poster-two">22</span>
              <i className="room-pipe pipe-one" />
              <i className="room-pipe pipe-two" />
              <b className="room-door">EMPLOYEES ONLY</b>
            </div>
            <div className="party-table table-one"><i /><i /><i /></div>
            <div className="party-table table-two"><i /><i /><i /></div>
            <div className="office-desk">
              <i className="desk-fan" />
              <i className="desk-monitor" />
              <i className="desk-cup" />
            </div>
            <div className="vent-grille">
              {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
            </div>
            <div className="stage-curtain curtain-left" />
            <div className="stage-curtain curtain-right" />
            <div className="party-pennants">
              {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
            </div>
            <div className="service-lockers"><i /><i /><i /></div>
            <div className="floor-cable" />
            <span className="room-sign">CELEBRATE · STAY IN YOUR SEAT</span>
          </div>
          <div className="animatronic-silhouette" aria-hidden="true">
            <i className="ear left" /><i className="ear right" />
            <i className="head" /><i className="eye left" /><i className="eye right" />
            <i className="jaw" />
            <i className="torso" /><i className="arm left" /><i className="arm right" />
            <i className="hand left" /><i className="hand right" />
          </div>
          <div className="camera-evidence-strip">
            <span>{feed.evidence}</span>
            <b>RIESGO · {feed.threat}</b>
          </div>
          <p>{feed.description}</p>
        </div>
        <div className="camera-console">
          <div className="camera-map">
            <span className="map-you">YOU</span>
            <i className="map-wire wire-one" />
            <i className="map-wire wire-two" />
            {cameraFeeds.map((item, index) => (
              <button
                type="button"
                key={item.camera}
                className={cameraFeed === index ? "active" : ""}
                onClick={() => setCameraFeed(index)}
                aria-pressed={cameraFeed === index}
              >
                <span>{item.camera}</span>
                <small>{item.room}</small>
              </button>
            ))}
          </div>
          <div className={`power-readout ${power <= 20 ? "low" : ""}`}>
            <span>ENERGÍA REAL</span>
            <div><i style={{ width: `${night.power}%` }} /></div>
            <b>{power}%</b>
            <small>CADA CÁMARA GASTA 1%</small>
          </div>
        </div>
      </div>
      <div className="scream-archive">
        <div className="scream-heading">
          <div>
            <span>ARCHIVO DE GRITOS</span>
            <strong>ANIMATRÓNICOS PRINCIPALES</strong>
          </div>
          <small>VOLUMEN DE SEGURIDAD · 42%</small>
        </div>
        <div className="scream-grid">
          {animatronicArchive.map((profile, index) => (
            <button
              type="button"
              key={profile.name}
              className={screamActive === index ? "active" : ""}
              onClick={() => playJumpscare(index)}
              aria-label={`Reproducir sonido auténtico de ${profile.name}`}
            >
              <span className="scream-face" aria-hidden="true">
                <i /><i /><b>{profile.name.slice(0, 1)}</b>
              </span>
              <span>
                <small>{profile.code}</small>
                <strong>{profile.name}</strong>
                <em className="scream-source">{profile.source}</em>
              </span>
              <em>{screamActive === index ? "SONANDO" : "▶ GRITO"}</em>
            </button>
          ))}
        </div>
      </div>
      <div className="idol-copy fnaf-copy">
        <p className="eyebrow red">FIVE NIGHTS AT FREDDY’S / HORROR</p>
        <h3>NO MIRES<br />LA PUERTA.</h3>
        <p>
          Cámaras, estática, diseño sonoro, pistas escondidas y el tipo de
          tensión que convierte un pasillo vacío en una historia entera.
        </p>
        <button
          id="material-recuperado"
          className="material-card-primary"
          type="button"
          onClick={onOpenRecovered}
        >
          <small>PASO 01 · OBLIGATORIO</small>
          LEER TARJETA “MATERIAL RECUPERADO”
          <span>↗</span>
        </button>
        {materialRead ? (
          <a className="fnaf-game-link unlocked" href="/walk-exe">
            <small>PASO 02 · ACCESO AUTORIZADO</small>
            ENTRAR AL PASADIZO M00NW4LK.EXE <span>→</span>
          </a>
        ) : (
          <button className="fnaf-game-locked" type="button" disabled>
            <small>PASO 02 · BLOQUEADO</small>
            LEE PRIMERO EL MATERIAL RECUPERADO <span>⌁</span>
          </button>
        )}
      </div>
    </article>
  );
}

export default memo(FnafWorld);
