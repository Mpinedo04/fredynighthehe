import { memo, type CSSProperties } from "react";
import { friendTestimonials } from "../content";

/**
 * Scene 07: the cast sheet. Texts live in app/content.ts → friendTestimonials;
 * a friend marked `pending` shows a "take pending" slate instead of filler.
 */
function Friends() {
  const ready = friendTestimonials.filter((friend) => !friend.pending).length;

  return (
    <section className="friends section-pad" id="amigos">
      <div className="friends-heading" data-reveal>
        <p className="eyebrow red">
          <span className="scene-chip dark">ESC 07</span> TESTIMONIOS DEL REPARTO
        </p>
        <h2>Gente que volvería<br />para la segunda temporada.</h2>
        <p className="friends-callsheet">
          HOJA DE LLAMADA · {friendTestimonials.length} PERSONAS CONVOCADAS ·{" "}
          {ready === friendTestimonials.length ? "TODAS LAS TOMAS GRABADAS" : `${ready}/${friendTestimonials.length} TOMAS GRABADAS`}
        </p>
      </div>
      <div className="testimonials">
        {friendTestimonials.map((friend, index) => (
          <article
            key={friend.number}
            className={friend.pending ? "is-pending" : ""}
            data-secret-anchor={friend.number === "03" ? "friends" : undefined}
            data-reveal="row"
            style={{ "--i": index } as CSSProperties}
          >
            <div className="avatar-placeholder">
              <img src={friend.image} alt={friend.alt} loading="lazy" decoding="async" />
              <span>{friend.number}</span>
            </div>
            <div>
              <p>{friend.role}</p>
              {friend.pending ? (
                <div className="take-pending" aria-label="Frase pendiente de grabar">
                  <span className="take-pending-clapper" aria-hidden="true"><i /><i /><i /><i /></span>
                  <strong>TOMA PENDIENTE</strong>
                  <small>FRASE POR GRABAR · ESTE AMIGO TODAVÍA ESTÁ ENSAYANDO</small>
                </div>
              ) : (
                <blockquote>“{friend.quote}”</blockquote>
              )}
              <span>{friend.pending ? "CAST PENDIENTE" : friend.name}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default memo(Friends);
