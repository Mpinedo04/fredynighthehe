/** Raúl's five lost tapes: recover three to power the emergency exit. */
export const WALK_TAPES = [
  {
    code: "P01",
    title: "EL PAN TA’ DURO",
    color: 0xff5a3d,
    thumbnail: "/youtube/el-pan-ta-duro.webp",
    lore: "En el segundo 02:22 de la grabación original se oye una segunda respiración detrás del móvil.",
  },
  {
    code: "P02",
    title: "WTF EL DOCUMENTAL",
    color: 0x3d8bff,
    thumbnail: "/youtube/wtf-documental.webp",
    lore: "Uno de los entrevistados del metraje fue borrado de los créditos, pero su sombra sigue en el pasillo.",
  },
  {
    code: "P03",
    title: "CORAZÓN INTACTO",
    color: 0xb86bff,
    thumbnail: "/youtube/corazon-intacto.webp",
    lore: "El pulso que se escucha en la pista de sonido está sincronizado exactamente con tu corazón.",
  },
  {
    code: "P04",
    title: "CATARSIS",
    color: 0xffb13d,
    thumbnail: "/youtube/catarsis.webp",
    lore: "Al revisar el timeline en DaVinci apareció un fotograma de un sombrero negro que Raúl nunca rodó.",
  },
  {
    code: "48H",
    title: "IMÁGENES OCULTAS",
    color: 0xff3d6e,
    thumbnail: "/youtube/imagenes-ocultas.webp",
    lore: "Todas las cámaras del edificio estuvieron grabando hacia la misma puerta durante las últimas 48 horas.",
  },
] as const;

export const TAPES_TO_EXIT = 3;
export const WALK_BEST_KEY = "premiere22.walk-best.v1";

export type EndingKind = "survival" | "collectors-cut";

export type RunGrade = Readonly<{
  grade: string;
  title: string;
  line: string;
  ending: EndingKind;
}>;

/** Determines whether Raúl unlocked the True Secret Horror Ending ("Director's Cut · Edición Coleccionista"). */
export function resolveEndingKind(run: Readonly<{
  escaped: boolean;
  tapes: number;
  eggsFound?: number;
  ghostRelic?: boolean;
}>): EndingKind {
  if (!run.escaped) return "survival";
  if (run.tapes >= WALK_TAPES.length) return "collectors-cut";
  if (run.ghostRelic && (run.eggsFound ?? 0) >= 3) return "collectors-cut";
  return "survival";
}

/** The director's verdict on the take. */
export function rateRun(
  run: Readonly<{
    escaped: boolean;
    tapes: number;
    seconds: number;
    eggsFound?: number;
    ghostRelic?: boolean;
  }>,
): RunGrade {
  const ending = resolveEndingKind(run);
  if (run.escaped && run.tapes >= WALK_TAPES.length && (run.eggsFound ?? 0) >= 3) {
    return {
      grade: "S+",
      title: "DIRECTOR’S CUT · ARCHIVO 22",
      line: "Las cinco cintas, los secretos del plató y la salida bajo Alerta Roja. El archivo te pertenece.",
      ending: "collectors-cut",
    };
  }
  if (run.escaped && run.tapes >= WALK_TAPES.length) {
    return {
      grade: "S",
      title: "DIRECTOR’S CUT",
      line: "Las cinco cintas y la puerta. Esto se estrena tal cual.",
      ending: "collectors-cut",
    };
  }
  if (run.escaped && ending === "collectors-cut") {
    return {
      grade: "S",
      title: "RITUAL DEL ARCHIVO 22",
      line: "Escapaste con la bendición del Clero y los secretos del estudio intactos.",
      ending: "collectors-cut",
    };
  }
  if (run.escaped && run.seconds < 240) {
    return {
      grade: "A",
      title: "TOMA BUENA",
      line: "Rápido, limpio y sin mirar atrás. Se imprime.",
      ending: "survival",
    };
  }
  if (run.escaped) {
    return {
      grade: "B",
      title: "SE IMPRIME",
      line: "Has salido. El montaje ya disimulará el resto.",
      ending: "survival",
    };
  }
  if (run.tapes >= TAPES_TO_EXIT) {
    return {
      grade: "C",
      title: "CASI",
      line: "Tenías las cintas en la mano. Faltó la puerta.",
      ending: "survival",
    };
  }
  return {
    grade: "D",
    title: "OTRA",
    line: "Toma falsa. Sujeto M pide repetir desde el principio.",
    ending: "survival",
  };
}

/** HH:MM:SS:FF at 24 fps, like a camcorder timecode. */
export function formatTimecode(ms: number) {
  const totalFrames = Math.max(0, Math.floor((ms / 1000) * 24));
  const frames = totalFrames % 24;
  const totalSeconds = Math.floor(totalFrames / 24);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return [hours, minutes, seconds, frames].map((value) => String(value).padStart(2, "0")).join(":");
}

/** 0 at a resting pulse, 1 when Subject M is breathing on your neck. */
export function fearLevel(bpm: number) {
  return Math.max(0, Math.min(1, (bpm - 62) / 108));
}
