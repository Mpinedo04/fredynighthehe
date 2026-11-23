"use client";

import { memo, useEffect, useRef, type KeyboardEvent } from "react";
import { worlds, type WorldId } from "../content";
import FnafWorld from "./worlds/FnafWorld";
import MicroWorld from "./worlds/MicroWorld";
import MjWorld from "./worlds/MjWorld";
import SpielbergWorld from "./worlds/SpielbergWorld";

type ReferenceRoomProps = {
  activeWorld: WorldId;
  visitedWorlds: WorldId[];
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
  visitedWorlds,
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

  const activeIndex = WORLD_IDS.indexOf(activeWorld);
  const prevWorld = activeIndex > 0 ? worlds[activeIndex - 1] : null;
  const nextWorld = activeIndex < worlds.length - 1 ? worlds[activeIndex + 1] : null;

  return (
    <section className={`reference-room section-pad world-${activeWorld}`} id="referentes" ref={sectionRef}>
      <div className="section-heading" data-reveal>
        <div>
          <p className="eyebrow">
            <span className="scene-chip">ESC 06 · ACTO II</span> EL MULTIVERSO DE RAÚL · {visitedWorlds.length}/{worlds.length} EXPLORADOS
          </p>
          <h2>Cuatro obsesiones.<br />Cuatro mundos.</h2>
        </div>
        <p>
          Cada pestaña cambia por completo las reglas, el sonido y la estética.
          Recorre los cuatro mundos con las pestañas o con el botón inferior — y
          justo debajo te espera la catedral de <strong>Ghost</strong>.
        </p>
      </div>

      <div className="world-tabs" role="tablist" aria-label="Elige un mundo" onKeyDown={handleKey} data-reveal>
        {worlds.map((world, index) => {
          const visited = visitedWorlds.includes(world.id);
          return (
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
              className={`world-tab world-tab-${world.id} ${activeWorld === world.id ? "active" : ""} ${visited ? "visited" : ""}`}
              onClick={() => select(world.id)}
            >
              {world.image && <img src={world.image} alt="" loading="lazy" decoding="async" />}
              <span className="world-tab-number">
                {world.number} {visited ? "· ✓" : ""}
              </span>
              <strong>{world.title}</strong>
              <small>{world.subtitle}</small>
              <i aria-hidden="true" />
            </button>
          );
        })}
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

      <div className="world-stepper" data-hee-control>
        {prevWorld ? (
          <button type="button" onClick={() => select(prevWorld.id)}>
            ← MUNDO ANTERIOR · {prevWorld.title}
          </button>
        ) : (
          <span className="world-stepper-meta">MUNDO {activeIndex + 1} DE {worlds.length}</span>
        )}
        {nextWorld ? (
          <button type="button" className="next" onClick={() => select(nextWorld.id)}>
            SIGUIENTE MUNDO · {nextWorld.title} →
          </button>
        ) : (
          <a href="#ghost" className="next">
            CONTINUAR A LA CATEDRAL DE GHOST ↓
          </a>
        )}
      </div>
    </section>
  );
}

export default memo(ReferenceRoom);
