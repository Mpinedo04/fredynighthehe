"use client";

import { memo, useEffect, useRef, type KeyboardEvent } from "react";
import { worlds, type WorldId } from "../content";
import FnafWorld from "./worlds/FnafWorld";
import MicroWorld from "./worlds/MicroWorld";
import MjWorld from "./worlds/MjWorld";
import SpielbergWorld from "./worlds/SpielbergWorld";

type ReferenceRoomProps = {
  activeWorld: WorldId;
  onWorldChange: (world: WorldId) => void;
  onInViewChange: (inView: boolean) => void;
  materialRead: boolean;
  onOpenRecovered: () => void;
  onMoonwalk: () => void;
};

const WORLD_IDS = worlds.map((world) => world.id);

/**
 * Scene 06: four obsessions, four worlds, one projector. Every world stays in
 * the server HTML; only the active one is visible, and the URL remembers it
 * (#referentes-mj, #referentes-fnaf…).
 */
function ReferenceRoom({
  activeWorld,
  onWorldChange,
  onInViewChange,
  materialRead,
  onOpenRecovered,
  onMoonwalk,
}: ReferenceRoomProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const changeRef = useRef(onWorldChange);
  useEffect(() => {
    changeRef.current = onWorldChange;
  }, [onWorldChange]);

  // Deep links such as /#referentes-fnaf open the right world.
  useEffect(() => {
    const fromHash = () => {
      const match = window.location.hash.match(/^#referentes-(\w+)$/);
      const id = match?.[1] as WorldId | undefined;
      if (id && WORLD_IDS.includes(id)) changeRef.current(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => onInViewChange(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [onInViewChange]);

  const select = (id: WorldId, focus = false) => {
    onWorldChange(id);
    if (window.location.hash !== `#referentes-${id}`) {
      window.history.replaceState(null, "", `#referentes-${id}`);
    }
    if (focus) tabsRef.current[WORLD_IDS.indexOf(id)]?.focus();
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = WORLD_IDS.indexOf(activeWorld);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      select(WORLD_IDS[(index + 1) % WORLD_IDS.length], true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      select(WORLD_IDS[(index - 1 + WORLD_IDS.length) % WORLD_IDS.length], true);
    }
  };

  return (
    <section className={`reference-room section-pad world-${activeWorld}`} id="referentes" ref={sectionRef}>
      <div className="section-heading" data-reveal>
        <div>
          <p className="eyebrow">
            <span className="scene-chip">ESC 06</span> EL MULTIVERSO DE RAÚL
          </p>
          <h2>Cuatro obsesiones.<br />Cuatro mundos.</h2>
        </div>
        <p>
          Aquí no hay tarjetas genéricas: cada referente cambia las reglas,
          la estética y hasta la forma de interactuar. Elige un mundo para
          meterte dentro.
        </p>
      </div>

      <div className="world-tabs" role="tablist" aria-label="Elige un mundo" onKeyDown={handleKey} data-reveal>
        {worlds.map((world, index) => (
          <button
            type="button"
            role="tab"
            key={world.id}
            id={`world-tab-${world.id}`}
            aria-selected={activeWorld === world.id}
            aria-controls={`world-panel-${world.id}`}
            tabIndex={activeWorld === world.id ? 0 : -1}
            ref={(element) => {
              tabsRef.current[index] = element;
            }}
            className={`world-tab world-tab-${world.id} ${activeWorld === world.id ? "active" : ""}`}
            onClick={() => select(world.id)}
          >
            {world.image && <img src={world.image} alt="" loading="lazy" decoding="async" />}
            <span className="world-tab-number">{world.number}</span>
            <strong>{world.title}</strong>
            <small>{world.subtitle}</small>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="idol-worlds is-tabbed">
        {worlds.map((world) => (
          <div
            key={world.id}
            id={`world-panel-${world.id}`}
            role="tabpanel"
            aria-labelledby={`world-tab-${world.id}`}
            className={`world-panel ${activeWorld === world.id ? "active" : ""}`}
            hidden={activeWorld !== world.id}
          >
            {world.id === "mj" && <MjWorld onMoonwalk={onMoonwalk} />}
            {world.id === "spielberg" && <SpielbergWorld />}
            {world.id === "fnaf" && (
              <FnafWorld materialRead={materialRead} onOpenRecovered={onOpenRecovered} />
            )}
            {world.id === "micro" && <MicroWorld active={activeWorld === "micro"} />}
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(ReferenceRoom);
