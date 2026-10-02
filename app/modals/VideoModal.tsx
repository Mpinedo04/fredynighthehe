"use client";

import { useRef } from "react";
import { projects } from "../content";
import { useModal } from "../ui/useModal";

type VideoModalProps = {
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

/** The screening room: YouTube player with previous / next tape. */
export default function VideoModal({ index, onClose, onNavigate }: VideoModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModal(index !== null, onClose, dialogRef);
  if (index === null) return null;
  const project = projects[index];
  const previous = (index - 1 + projects.length) % projects.length;
  const next = (index + 1) % projects.length;

  return (
    <div
      className="youtube-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Reproduciendo ${project.title}`}
      ref={dialogRef}
      tabIndex={-1}
    >
      <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar vídeo" data-autofocus>
        CERRAR SALA ×
      </button>
      <div className="youtube-player">
        <iframe
          key={project.videoId}
          src={`https://www.youtube-nocookie.com/embed/${project.videoId}?autoplay=1&rel=0`}
          title={project.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="player-caption">
        <span>{project.code} · {project.year}</span>
        <strong>{project.title}</strong>
        <div className="player-nav">
          <button type="button" onClick={() => onNavigate(previous)} aria-label={`Anterior: ${projects[previous].title}`}>
            ← {projects[previous].title}
          </button>
          <button type="button" onClick={() => onNavigate(next)} aria-label={`Siguiente: ${projects[next].title}`}>
            {projects[next].title} →
          </button>
        </div>
        <a href={`https://www.youtube.com/watch?v=${project.videoId}`} target="_blank" rel="noreferrer">
          VER EN YOUTUBE ↗
        </a>
      </div>
    </div>
  );
}
