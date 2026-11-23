"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ghostCandles, ghostEras, ghostTracks } from "../content";
import {
  playGhostCandle,
  playGhostRitualChord,
  startGhostOrganLoop,
} from "../pranks/audio";
import { unlock } from "../pranks/bus";
import { showToast } from "../ui/Toasts";

type GhostSectionProps = {
  onRitualComplete: () => void;
};

/**
 * Scene 07: Dedicated Gothic Cathedral section for Ghost (The Clergy).
 * Features a 1969 Seven Inches of Satanic Panic interactive spinning vinyl
 * with synthesized organ, official YouTube Ritual Jukebox (Mary On A Cross,
 * Live in Tampa, Square Hammer, Dance Macabre), 6 Papa Emeritus eras,
 * the 5-candle Ritual 22 easter egg, and the Square Hammer oath.
 */
function GhostSection({ onRitualComplete }: GhostSectionProps) {
  const [eraIndex, setEraIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [vinylSide, setVinylSide] = useState<"A" | "B">("B");
  const [spinning, setSpinning] = useState(false);
  const [litCandles, setLitCandles] = useState<number[]>([]);
  const [ritualActive, setRitualActive] = useState(false);
  const [oathSworn, setOathSworn] = useState(false);
  const stopOrganRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      stopOrganRef.current?.();
      stopOrganRef.current = null;
    },
    [],
  );

  const toggleVinyl = (nextSide?: "A" | "B") => {
    const targetSide = nextSide ?? vinylSide;
    if (nextSide) setVinylSide(nextSide);
    if (spinning && (!nextSide || nextSide === vinylSide)) {
      stopOrganRef.current?.();
      stopOrganRef.current = null;
      setSpinning(false);
      return;
    }
    stopOrganRef.current?.();
    stopOrganRef.current = startGhostOrganLoop(targetSide);
    setSpinning(true);
  };

  const lightCandle = (index: number) => {
    const candle = ghostCandles[index];
    playGhostCandle(candle.freq);
    if (litCandles.includes(index)) return;
    const next = [...litCandles, index];
    setLitCandles(next);
    if (next.length === ghostCandles.length) {
      setRitualActive(true);
      playGhostRitualChord();
      unlock("ghostRitual");
      onRitualComplete();
      showToast({
        key: "ghost-ritual-22",
        kicker: "THE CLERGY · SEVEN INCHES OF SATANIC PANIC (1969)",
        title: "MARY ON A CROSS · RITUAL 22 COMPLETADO",
        body: "Your beauty never ever scared me. Las cinco velas de la catedral brillan por tus 22 años, Raúl.",
        tone: "blue",
        duration: 6200,
      });
    }
  };

  const swearOath = () => {
    playGhostRitualChord();
    setOathSworn(true);
    unlock("squareHammer");
    showToast({
      key: "square-hammer-oath",
      kicker: "SQUARE HAMMER · JURAMENTO SELLADO",
      title: "ON THE SQUARE · ON THE LEVEL",
      body: "Bienvenido oficialmente al Clero, Raúl. Miembro honorífico n.º 22.",
      tone: "red",
      duration: 5000,
    });
  };

  const era = ghostEras[eraIndex];
  const track = ghostTracks[trackIndex];

  return (
    <section
      className={`ghost-cathedral section-pad ${ritualActive ? "ritual-lit" : ""} ${spinning ? "vinyl-live" : ""}`}
      id="ghost"
    >
      <div className="ghost-rose-window" aria-hidden="true">
        <i className="rose-ring outer" />
        <i className="rose-ring inner" />
        <span className="rose-cross" />
      </div>

      <div className="section-heading" data-reveal>
        <div>
          <p className="eyebrow ghost-eyebrow">
            <span className="scene-chip ghost-chip">ESC 07 · THE CLERGY</span> RITUAL 22 · GHOST
          </p>
          <h2>If you have Ghosts,<br />you have everything.</h2>
        </div>
        <p>
          Ópera rock, órgano de catedral, vinilos malditos de 1969 y el himno
          que nunca falta: <strong>Mary On A Cross</strong>. Enciende las cinco
          velas del altar o pincha el single de 7 pulgadas.
        </p>
      </div>

      {/* Main Cathedral Stage: 1969 Interactive Vinyl + Eras & Oath */}
      <div className="ghost-stage-grid">
        <article className="ghost-vinyl-deck" data-reveal="gate">
          <header className="ghost-deck-head">
            <span>SINGLE 7&quot; · 1969 · ARCHIVO DEL CLERO</span>
            <b>SEVEN INCHES OF SATANIC PANIC</b>
          </header>

          <div className="ghost-turntable">
            <div className={`ghost-disc ${spinning ? "spinning" : ""}`} aria-hidden="true">
              <div className="disc-grooves" />
              <div className="disc-label">
                <small>1969 · SIDE {vinylSide}</small>
                <strong>{vinylSide === "B" ? "MARY ON A CROSS" : "KISS THE GO-GOAT"}</strong>
                <em>PAPA NIHIL · 45 RPM</em>
              </div>
              <i className="disc-spindle" />
            </div>
            <div className={`ghost-tonearm ${spinning ? "dropped" : ""}`} aria-hidden="true" />
          </div>

          <div className="ghost-vinyl-controls" data-hee-control>
            <button
              type="button"
              className={`ghost-play-btn ${spinning ? "active" : ""}`}
              onClick={() => toggleVinyl()}
            >
              {spinning ? "■ LEVANTAR AGUJA" : "▶ PINCHAR ÓRGANO 1969"}
            </button>
            <div className="ghost-side-switch" role="group" aria-label="Elegir cara del vinilo">
              <button
                type="button"
                className={vinylSide === "A" ? "active" : ""}
                onClick={() => toggleVinyl("A")}
              >
                SIDE A · GO-GOAT
              </button>
              <button
                type="button"
                className={vinylSide === "B" ? "active" : ""}
                onClick={() => toggleVinyl("B")}
              >
                SIDE B · MARY ON A CROSS
              </button>
            </div>
          </div>

          <blockquote className="ghost-lyric-quote">
            “Your beauty never ever scared me — Mary on a, Mary on a cross.”
            <small>PISTA SECRETA: prueba a escribir <b>ghost</b> o <b>mary</b> en cualquier punto de la web.</small>
          </blockquote>
        </article>

        <div className="ghost-clergy-column">
          {/* 5 Ritual Candles Easter Egg */}
          <div className="ghost-altar" data-reveal>
            <div className="ghost-altar-head">
              <span>ALTAR DEL RITUAL 22 · EASTER EGG</span>
              <strong>
                {ritualActive
                  ? "✦ RITUAL COMPLETADO · ENCORE 1969"
                  : `ENCIENDE LAS 5 VELAS (${litCandles.length}/5)`}
              </strong>
            </div>
            <div className="ghost-candles" data-hee-control>
              {ghostCandles.map((candle, index) => {
                const isLit = litCandles.includes(index);
                return (
                  <button
                    key={candle.label}
                    type="button"
                    className={`ghost-candle ${isLit ? "lit" : ""}`}
                    onClick={() => lightCandle(index)}
                    aria-pressed={isLit}
                    aria-label={`Encender vela ${candle.label}: ${candle.note}`}
                  >
                    <i className="candle-flame" aria-hidden="true" />
                    <span className="candle-wax" aria-hidden="true" />
                    <b>{candle.label}</b>
                    <small>{isLit ? candle.note : "APAGADA"}</small>
                  </button>
                );
              })}
            </div>
            {ritualActive && (
              <p className="ghost-ritual-blessing" role="status">
                ✦ BENDICIÓN DE PAPA EMERITUS XXII · «NOTHING WRONG WITH THAT» · LOGRO DESBLOQUEADO ✦
              </p>
            )}
          </div>

          {/* Papa Emeritus Eras Selector */}
          <div className="ghost-eras" data-reveal>
            <div className="ghost-era-tabs" role="tablist" aria-label="Eras del Clero de Ghost">
              {ghostEras.map((item, index) => (
                <button
                  key={item.papa}
                  type="button"
                  role="tab"
                  aria-selected={eraIndex === index}
                  className={eraIndex === index ? "active" : ""}
                  onClick={() => setEraIndex(index)}
                >
                  <span>{item.year}</span>
                  <strong>{item.papa}</strong>
                </button>
              ))}
            </div>
            <div className="ghost-era-card" role="tabpanel" aria-live="polite">
              <small>{era.year} · {era.album}</small>
              <h3>{era.papa}</h3>
              <em>{era.anthem}</em>
              <p>{era.detail}</p>
            </div>
          </div>

          {/* Square Hammer Oath Easter Egg */}
          <div className={`ghost-oath ${oathSworn ? "sworn" : ""}`} data-hee-control data-reveal>
            <div>
              <span>JURAMENTO · SQUARE HAMMER</span>
              <strong>
                {oathSworn
                  ? "ON THE SQUARE · ON THE LEVEL · MIEMBRO N.º 22"
                  : "¿Estás en la escuadra? ¿Estás al nivel?"}
              </strong>
            </div>
            <button type="button" onClick={swearOath}>
              {oathSworn ? "✦ JURAMENTO SELLADO" : "JURAR ANTE EL CLERO ✦"}
            </button>
          </div>
        </div>
      </div>

      {/* Official Ghost Video Jukebox */}
      <div className="ghost-jukebox" data-reveal data-hee-control>
        <div className="ghost-video-frame">
          {videoLoaded ? (
            <iframe
              key={track.videoId}
              src={`https://www.youtube-nocookie.com/embed/${track.videoId}?rel=0&autoplay=1`}
              title={`Ghost — ${track.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="ghost-video-cover"
              onClick={() => {
                stopOrganRef.current?.();
                stopOrganRef.current = null;
                setSpinning(false);
                setVideoLoaded(true);
              }}
            >
              <span className="ghost-cover-kicker">{track.code}</span>
              <strong>{track.title}</strong>
              <small>{track.note}</small>
              <em>▶ REPRODUCIR RITUAL OFICIAL EN YOUTUBE</em>
            </button>
          )}
        </div>
        <div className="ghost-tracklist">
          <header>
            <span>JUKEBOX DEL CLERO · VÍDEOS OFICIALES</span>
            <strong>SETLIST DE CUMPLEAÑOS</strong>
          </header>
          {ghostTracks.map((item, index) => (
            <button
              key={item.videoId}
              type="button"
              className={trackIndex === index ? "active" : ""}
              onClick={() => {
                stopOrganRef.current?.();
                stopOrganRef.current = null;
                setSpinning(false);
                setTrackIndex(index);
                setVideoLoaded(true);
              }}
            >
              <span>0{index + 1}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </div>
              <em>{item.code}</em>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(GhostSection);
