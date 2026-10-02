import { memo, type CSSProperties } from "react";
import { credits } from "../content";

/** Scene 02: the one-person crew and every credit he takes. */
function Portrait() {
  return (
    <section className="portrait-section" id="reparto">
      <div className="section-number">02</div>
      <div className="portrait-frame" data-reveal="gate">
        <img
          className="portrait-photo"
          src="/archive/portrait-set.webp"
          alt="Raúl junto a una cámara durante un rodaje"
          loading="lazy"
          decoding="async"
        />
        <div className="camera-reticle" aria-hidden="true">
          <span>REC</span>
          <b>RAÚL</b>
          <small>FOTOGRAMA REAL · EN RODAJE</small>
        </div>
      </div>
      <div className="portrait-copy" data-reveal>
        <p className="eyebrow red">
          <span className="scene-chip">ESC 02</span> PERSONAJE PRINCIPAL / CREADOR / AMIGO
        </p>
        <h2>Una sola persona.<br />Demasiados créditos.</h2>
        <p>
          Raúl es de esas personas que no se limitan a imaginar una idea.
          Necesita grabarla, iluminarla, sonorizarla, editarla y,
          probablemente, aparecer también delante de la cámara.
        </p>
        <p>
          Es técnico y artista. Perfeccionista y humorista. Creativo,
          sentimental, gracioso y capaz de dejarse la piel en aquello que le
          importa.
        </p>
      </div>
      <div className="credit-roll" aria-label="Créditos de Raúl">
        {credits.map((credit, index) => (
          <div key={credit.name} data-reveal="row" style={{ "--i": index } as CSSProperties}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <img src={credit.image} alt={credit.alt} loading="lazy" decoding="async" />
            <b>{credit.name}</b>
            <em>{credit.detail}</em>
            <i aria-hidden="true" />
            <small>RAÚL GARCÍA</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(Portrait);
