"use client";

import { memo, useState, type CSSProperties } from "react";
import { dossier, dossierRedactions } from "../content";
import { unlock } from "../pranks/bus";

/** Scene 05: the classified file. Black bars can be declassified. */
function Dossier() {
  const [declassified, setDeclassified] = useState<number[]>([]);

  return (
    <section className="dossier section-pad" id="expediente">
      <div className="file-tab">CONFIDENCIAL · RG-22</div>
      <div className="dossier-header" data-reveal>
        <div>
          <p>
            <span className="scene-chip dark">ESC 05</span> MINISTERIO DE IDEAS IMPOSIBLES
          </p>
          <h2>EL EXPEDIENTE<br />DE RAÚL</h2>
        </div>
        <div className="stamp" data-reveal="stamp">CLASIFICADO</div>
      </div>
      <div className="dossier-evidence" aria-label="Pruebas visuales del expediente">
        {[
          ["/archive/dossier-camera.webp", "Raúl trabajando con una cámara sobre un rig", "PRUEBA A", "OPERADOR EN PLATÓ"],
          ["/archive/dossier-studio.webp", "Raúl en una mesa de trabajo audiovisual", "PRUEBA B", "CABINA RAAULINHOO"],
          ["/archive/dossier-location.webp", "Raúl durante un rodaje en exteriores", "PRUEBA C", "LOCALIZACIÓN EXTERIOR"],
        ].map(([src, alt, tag, caption], index) => (
          <figure key={tag} data-reveal="drop" style={{ "--i": index } as CSSProperties}>
            <img src={src} alt={alt} loading="lazy" decoding="async" />
            <figcaption><span>{tag}</span> {caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="dossier-grid">
        <dl className="identity-file" data-reveal>
          <div><dt>SUJETO</dt><dd>Raúl García</dd></div>
          <div><dt>EDAD</dt><dd>22</dd></div>
          <div><dt>ALIAS</dt><dd>Raaulinhoo</dd></div>
          <div><dt>CLASIFICACIÓN</dt><dd>Creatividad audiovisual incontrolable</dd></div>
          <div><dt>HABILIDADES</dt><dd>Sonido, luz, cámara, edición y ocurrencias inesperadas</dd></div>
          <div><dt>DEBILIDADES</dt><dd>Michael Jackson, cine, terror y animatrónicos</dd></div>
          <div><dt>ESTADO ACTUAL</dt><dd><span className="status-pulse" /> Rodando la siguiente escena</dd></div>
        </dl>
        <div className="meters" data-reveal="meters">
          {dossier.map(([label, value]) => (
            <div className="meter" key={label}>
              <div><span>{label}</span><b>{value}</b></div>
              <div className="meter-track">
                <i style={{ width: value }} />
              </div>
            </div>
          ))}
          <div className="not-found">
            <span>PROYECTOS TERMINADOS A LA PRIMERA</span>
            <b>INFORMACIÓN NO ENCONTRADA</b>
          </div>
          <div className="not-found">
            <span>ARCHIVOS “FINAL_FINAL_AHORA_SÍ”</span>
            <b>DEMASIADOS</b>
          </div>
        </div>
      </div>
      <div className="dossier-redactions" data-reveal>
        <header>
          <span>ANEXO R · INFORMACIÓN CENSURADA</span>
          <small>PULSA LAS BARRAS NEGRAS PARA DESCLASIFICAR</small>
        </header>
        <ul>
          {dossierRedactions.map((item, index) => {
            const open = declassified.includes(index);
            return (
              <li key={item.label}>
                <span>{item.label}</span>
                <button
                  type="button"
                  className={open ? "redacted open" : "redacted"}
                  onClick={() => {
                    if (open) return;
                    const next = [...declassified, index];
                    setDeclassified(next);
                    if (next.length === dossierRedactions.length) unlock("declassified");
                  }}
                  aria-label={open ? item.secret : `Desclasificar: ${item.label}`}
                  aria-pressed={open}
                >
                  <b aria-hidden={!open}>{item.secret}</b>
                </button>
              </li>
            );
          })}
        </ul>
        {declassified.length === dossierRedactions.length && (
          <p className="dossier-leak">ANEXO COMPLETO FILTRADO · ESTE EXPEDIENTE SE AUTODESTRUIRÁ CUANDO CUMPLA 23</p>
        )}
      </div>
    </section>
  );
}

export default memo(Dossier);
