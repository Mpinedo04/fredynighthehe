"use client";

import { useEffect, useRef, useState } from "react";
import { fireScare, unlock, warnScare } from "../pranks/bus";
import { useModal } from "../ui/useModal";

type MoonwalkChaseProps = {
  open: boolean;
  onClose: () => void;
};

const PHASES = [
  "MOVIMIENTO DETECTADO",
  "SUJETO APROXIMÁNDOSE EN MOONWALK",
  "SOMBRERO RETIRADO · ERROR CERVICAL",
  "CABEZA DESACOPLADA · CORRE",
  "NO MIRES ATRÁS",
];

/**
 * The M00NW4LK passage on the home page (not the 3D game): an animatronic
 * performer moonwalks down a corridor until its head comes off.
 */
export default function MoonwalkChase({ open, onClose }: MoonwalkChaseProps) {
  const [phase, setPhase] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModal(open, onClose, dialogRef);

  useEffect(() => {
    if (!open) return;
    let scream: HTMLAudioElement | null = null;
    const timers = [
      window.setTimeout(() => setPhase(1), 700),
      window.setTimeout(() => setPhase(2), 3300),
      window.setTimeout(() => setPhase(3), 5000),
      window.setTimeout(() => warnScare(1000), 5900),
      window.setTimeout(() => {
        setPhase(4);
        fireScare();
        unlock("moonwalk");
        scream = new Audio("/audio/fnaf-jumpscare-scream.mp3");
        scream.volume = 0.5;
        scream.playbackRate = 0.72;
        void scream.play().catch(() => undefined);
      }, 6900),
    ];
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      scream?.pause();
      setPhase(0);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`moonwalk-chase phase-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label="Pasadizo animatrónico M00NW4LK"
      ref={dialogRef}
      tabIndex={-1}
      data-hee-control
    >
      <div className="chase-corridor" aria-hidden="true">
        <div className="corridor-ceiling" />
        <div className="corridor-floor" />
        <div className="corridor-door door-one">CAM 01</div>
        <div className="corridor-door door-two">CAM 02</div>
        <div className="corridor-door door-three">CAM 03</div>
        <i className="corridor-light light-one" />
        <i className="corridor-light light-two" />
        <i className="corridor-light light-three" />
      </div>
      <div className="chase-hud">
        <span>● REC · PASADIZO 22</span>
        <strong>{PHASES[phase]}</strong>
        <span>FASE 0{phase + 1}/05</span>
      </div>
      <div className="hybrid-performer" aria-hidden="true">
        <span className="hybrid-hat" />
        <span className="hybrid-head">
          <i className="hybrid-eye left" />
          <i className="hybrid-eye right" />
          <i className="hybrid-jaw" />
        </span>
        <span className="hybrid-neck" />
        <span className="hybrid-torso"><i /><i /><i /></span>
        <span className="hybrid-arm arm-left"><i className="white-glove" /></span>
        <span className="hybrid-arm arm-right" />
        <span className="hybrid-leg leg-left" />
        <span className="hybrid-leg leg-right" />
      </div>
      <div className="detached-hybrid-head" aria-hidden="true">
        <i className="head-ear left" />
        <i className="head-ear right" />
        <span>
          <i className="eye left" /><i className="eye right" />
          <b>22</b>
        </span>
        <i className="head-jaw" />
      </div>
      <div className="chase-jumpscare" aria-hidden="true">
        <span>22</span>
      </div>
      <div className="chase-instruction">
        <small>M00NW4LK.EXE</small>
        <p>
          {phase < 4 ? "El protocolo no recomienda quedarse quieto." : "Te ha encontrado. Feliz escena 22."}
        </p>
      </div>
      <button type="button" className="chase-close" onClick={onClose} data-autofocus>
        {phase < 4 ? "ABORTAR PASADIZO ×" : "SALIR CON VIDA →"}
      </button>
    </div>
  );
}
