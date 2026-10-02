"use client";

import { useEffect, useRef, useState } from "react";
import { unlock } from "./bus";

type EndCreditsProps = {
  open: boolean;
  onClose: () => void;
  takes: number;
  muteAttempts: number;
  heeTotal: number;
  heeSession: number;
  achievements: number;
  achievementTotal: number;
};

const BASE_SPEED = 64;
const MIN_SPEED = 7;

export default function EndCredits({
  open,
  onClose,
  takes,
  muteAttempts,
  heeTotal,
  heeSession,
  achievements,
  achievementTotal,
}: EndCreditsProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const diplomaRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef(BASE_SPEED);
  const [warning, setWarning] = useState("");
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [slowdown, setSlowdown] = useState(1);

  const credits: Array<[string, string]> = [
    ["DIRECCIÓN, GUION, CÁMARA, SONIDO, LUZ, MONTAJE Y COLOR", "RAÚL GARCÍA"],
    ["PROTAGONISTA", "RAÚL GARCÍA (OTRA VEZ)"],
    ["CATERING", "FREDDY FAZBEAR'S PIZZA"],
    ["SONIDO", "UN HEE-HEE QUE NADIE PUDO SILENCIAR"],
    ["ASISTENTE DE VESTUARIO", "EL GUANTE IZQUIERDO DE MJ"],
    ["COREOGRAFÍA", "MOONWALK HACIA ATRÁS, COMO EL MONTAJE"],
    ["AFINACIÓN", "ANGINE DE POITRINE · NINGUNA NOTA EN SU SITIO"],
    ["EFECTOS ESPECIALES", "STEVEN SPIELBERG (NO HA CONFIRMADO)"],
    ["SEGURIDAD NOCTURNA", "RAÚL · DE 12 AM A 6 AM"],
    ["PANADERÍA", "EL PAN TA' DURO S.L."],
    ["CLIMATIZACIÓN", "¿QUÉ CALOREH? · VENTILADOR DE OFICINA"],
    ["SUPERVISIÓN DE CONTINUIDAD", "UN FEDORA INFILTRADO"],
    ["COORDINACIÓN DE ANIMATRÓNICOS", "URSUS-9, VELVET-R, AVIS-3, VULPES-X"],
    ["ARCHIVO DE PROYECTO", "FINAL_FINAL_AHORA_SÍ_v22.drp"],
    ["TOMAS NECESARIAS PARA CERRAR LA CLAQUETA", String(takes)],
    ["INTENTOS DE SILENCIAR A MICHAEL", String(muteAttempts)],
    ["HEE-HEES SUFRIDOS EN ESTA SESIÓN", String(heeSession)],
    ["LOGROS DESBLOQUEADOS", `${achievements} / ${achievementTotal}`],
    ["NINGÚN ANIMATRÓNICO FUE DAÑADO", "SALVO EL QUE PERDIÓ LA CABEZA"],
    ["AGRADECIMIENTOS", "A TODA LA GENTE QUE VOLVERÍA PARA LA SEGUNDA TEMPORADA"],
  ];

  useEffect(() => {
    if (!open) return;
    const track = trackRef.current;
    const diploma = diplomaRef.current;
    if (!track || !diploma) return;
    let offset = -window.innerHeight * 0.92;
    let last = performance.now();
    let lastPaint = last;
    let raf = 0;
    let warningTimer = 0;
    let done = false;
    speedRef.current = BASE_SPEED;

    const resist = () => {
      if (done) return;
      speedRef.current = Math.max(MIN_SPEED, speedRef.current * 0.6);
      setSlowdown(speedRef.current / BASE_SPEED);
      setWarning(
        speedRef.current <= MIN_SPEED + 0.5
          ? "CUANTO MÁS LO INTENTAS, MÁS DESPACIO VAN"
          : "LOS CRÉDITOS NO SE PUEDEN SALTAR",
      );
      window.clearTimeout(warningTimer);
      warningTimer = window.setTimeout(() => setWarning(""), 1700);
    };

    const frame = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      speedRef.current = Math.min(BASE_SPEED, speedRef.current + delta * 3.2);
      offset += speedRef.current * delta;
      if (now - lastPaint > 400) {
        lastPaint = now;
        setSlowdown(speedRef.current / BASE_SPEED);
      }
      const stopAt =
        diploma.offsetTop + diploma.offsetHeight / 2 - window.innerHeight / 2;
      if (offset >= stopAt) {
        offset = stopAt;
        done = true;
        setFinished(true);
        unlock("credits");
      }
      track.style.transform = `translate3d(0, ${-offset}px, 0)`;
      if (!done) raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      resist();
    };
    const handleTouch = (event: TouchEvent) => {
      event.preventDefault();
      resist();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLeaving(true);
        window.setTimeout(onClose, 1300);
        return;
      }
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "End", "Home"].includes(event.key)) {
        event.preventDefault();
        resist();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchmove", handleTouch, { passive: false });
    window.addEventListener("keydown", handleKey);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(warningTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("keydown", handleKey);
      setFinished(false);
      setLeaving(false);
      setWarning("");
      setSlowdown(1);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="end-credits" role="dialog" aria-modal="true" aria-label="Créditos finales" data-hee-control>
      <div className="end-credits-track" ref={trackRef}>
        <p className="end-credits-kicker">UNA PRODUCCIÓN DE TODA SU GENTE</p>
        <h2>PREMIERE 22</h2>
        <p className="end-credits-kicker">LA HISTORIA CONTINÚA</p>
        <dl>
          {credits.map(([role, name]) => (
            <div key={role}>
              <dt>{role}</dt>
              <dd>{name}</dd>
            </div>
          ))}
        </dl>
        <div className="hee-diploma" ref={diplomaRef}>
          <small>LA REAL ACADEMIA DEL HEE-HEE · NEVERLAND</small>
          <span>DIPLOMA</span>
          <p>Por la presente se certifica que</p>
          <strong>RAÚL GARCÍA</strong>
          <p>ha sobrevivido a</p>
          <b>{heeTotal.toLocaleString("es-ES")} HEE-HEES</b>
          <p>y se le concede el título de</p>
          <em>DOCTOR HONORIS CAUSA EN HEE-HEE</em>
          <div className="hee-diploma-seal" aria-hidden="true">22</div>
          <div className="hee-diploma-signatures">
            <span>FIRMADO: M. J.</span>
            <span>SELLO: F. FAZBEAR</span>
          </div>
        </div>
      </div>
      <div className="end-credits-hud">
        <span>VELOCIDAD DE CRÉDITOS · {Math.round(slowdown * 100)}%</span>
        {warning && <strong>{warning}</strong>}
      </div>
      {leaving && <div className="end-credits-leaving">VALE, PERO QUE CONSTE.</div>}
      {finished && (
        <button type="button" className="end-credits-close" onClick={onClose}>
          FIN · VOLVER A LA PREMIERE →
        </button>
      )}
    </div>
  );
}
