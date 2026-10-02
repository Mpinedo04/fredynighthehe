import { memo } from "react";

type TrailerTeaserProps = {
  onOpen: () => void;
};

/** Scene 08: the poster that opens the interactive montage. */
function TrailerTeaser({ onOpen }: TrailerTeaserProps) {
  return (
    <section className="trailer-section section-pad" id="escena-22">
      <div className="trailer-poster" data-secret-anchor="trailer" data-reveal="gate">
        <img
          className="trailer-photo"
          src="/archive/trailer-shoot.webp"
          alt="Equipo rodando una escena en una cocina"
          loading="lazy"
          decoding="async"
        />
        <div className="trailer-topline">
          <span>
            <span className="scene-chip">ESC 08</span> PUENTE DE MONTAJE · NO ES UN VÍDEO VACÍO
          </span>
          <span>00:22 · INTERACTIVO</span>
        </div>
        <div className="trailer-title">
          <small>DEL ARCHIVO REAL AL EXPEDIENTE IMPOSIBLE</small>
          <h2>CORTE<br /><strong>22</strong></h2>
          <button type="button" onClick={onOpen}>
            <span aria-hidden="true">✂</span>
            ABRIR MONTAJE INTERACTIVO
          </button>
        </div>
        <div className="trailer-caption">
          <p>
            Esta pieza ya no finge ser un “tráiler oficial” pendiente. Es el
            corte que conecta las producciones, los referentes y el archivo
            de terror que debe leerse antes de entrar en M00NW4LK.EXE.
          </p>
        </div>
      </div>
    </section>
  );
}

export default memo(TrailerTeaser);
