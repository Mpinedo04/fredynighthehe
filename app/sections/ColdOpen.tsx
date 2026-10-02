"use client";

import { useEffect, useRef, useState } from "react";
import { playLeaderBeep, unlockAudio } from "../audio/engine";
import { readStorage, requestMotionPermission, writeStorage } from "../pranks/bus";

const SEEN_KEY = "premiere22.intro-seen.v1";

type ColdOpenProps = {
  onBegin: () => void;
};

/**
 * The cold open. Pressing play unlocks audio inside the click, then a real
 * film-leader countdown (3 · 2 · 1 with the 1 kHz beep) rolls before the
 * premiere starts. Any click during the countdown skips it.
 */
export default function ColdOpen({ onBegin }: ColdOpenProps) {
  const [count, setCount] = useState<number | null>(null);
  const [returning, setReturning] = useState(false);
  const timersRef = useRef<number[]>([]);
  const doneRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReturning(readStorage(SEEN_KEY) === "1"), 0);
    const timers = timersRef.current;
    return () => {
      window.clearTimeout(timer);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    writeStorage(SEEN_KEY, "1");
    setCount(null);
    onBegin();
  };

  const start = (skip: boolean) => {
    unlockAudio();
    requestMotionPermission();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skip || reduced) {
      finish();
      return;
    }
    setCount(3);
    playLeaderBeep();
    [2, 1].forEach((value, index) => {
      timersRef.current.push(
        window.setTimeout(() => {
          setCount(value);
          playLeaderBeep();
        }, (index + 1) * 720),
      );
    });
    timersRef.current.push(
      window.setTimeout(() => {
        playLeaderBeep(true);
        finish();
      }, 3 * 720),
    );
  };

  return (
    <section className="cold-open" aria-label="Introducción cinematográfica">
      <div className="leader-count" aria-hidden="true">22</div>
      <div className="opening-lines">
        <p>TODA HISTORIA TIENE UN COMIENZO</p>
        <p>TODA PRODUCCIÓN TIENE UNA PRIMERA TOMA</p>
        <p>PERO ALGUNAS PERSONAS NECESITAN 22 ESCENAS</p>
        <p>PARA EMPEZAR SU VERDADERA PELÍCULA</p>
      </div>
      <button className="start-button" type="button" onClick={() => start(false)}>
        <span>COMENZAR PROYECCIÓN</span>
        <span aria-hidden="true">▶</span>
      </button>
      {returning ? (
        <button className="opening-skip" type="button" onClick={() => start(true)}>
          YA LA HE VISTO · SALTAR INTRO ↷
        </button>
      ) : (
        <p className="opening-hint">El sonido es opcional. La emoción, no.</p>
      )}

      {count !== null && (
        <button
          type="button"
          className="leader-countdown"
          onClick={finish}
          aria-label="Saltar cuenta atrás"
        >
          <span className="leader-sweep" key={count} aria-hidden="true" />
          <span className="leader-cross" aria-hidden="true" />
          <span className="leader-rings" aria-hidden="true"><i /><i /></span>
          <b key={`n${count}`}>{count}</b>
          <small>PULSA PARA SALTAR</small>
        </button>
      )}
    </section>
  );
}
