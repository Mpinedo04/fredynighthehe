export type StudioWingId =
  | "booth"
  | "neverland"
  | "crypt"
  | "acoustic"
  | "fazbear"
  | "archive"
  | "corridor";

export type StudioBiomeId = Exclude<StudioWingId, "corridor">;

export const STUDIO_BIOME_IDS: readonly StudioBiomeId[] = [
  "booth",
  "neverland",
  "crypt",
  "acoustic",
  "fazbear",
  "archive",
];

export type BiomeAtmosphere = Readonly<{
  fogHex: number;
  fogDensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  lampHex: number;
}>;

export const STUDIO_BIOME_ATMOSPHERE: Readonly<Record<StudioBiomeId, BiomeAtmosphere>> = {
  booth: {
    fogHex: 0x050908,
    fogDensity: 0.044,
    hemiSkyHex: 0x869e94,
    hemiGroundHex: 0x0b0e0d,
    lampHex: 0xa2cdb2,
  },
  neverland: {
    fogHex: 0x040714,
    fogDensity: 0.044,
    hemiSkyHex: 0x7da4db,
    hemiGroundHex: 0x0b0e18,
    lampHex: 0x7ec0ff,
  },
  crypt: {
    fogHex: 0x0c0514,
    fogDensity: 0.052,
    hemiSkyHex: 0xa97bd6,
    hemiGroundHex: 0x13081a,
    lampHex: 0xc78aff,
  },
  acoustic: {
    fogHex: 0x0d0804,
    fogDensity: 0.046,
    hemiSkyHex: 0xcda168,
    hemiGroundHex: 0x140d07,
    lampHex: 0xffbe55,
  },
  fazbear: {
    fogHex: 0x060b07,
    fogDensity: 0.048,
    hemiSkyHex: 0x8cbf92,
    hemiGroundHex: 0x140c0a,
    lampHex: 0x8bffa8,
  },
  archive: {
    fogHex: 0x110406,
    fogDensity: 0.05,
    hemiSkyHex: 0xbd6c77,
    hemiGroundHex: 0x16080a,
    lampHex: 0xff576b,
  },
};

export type StudioEggId =
  | "neverland-vitrine"
  | "ghost-vinyl"
  | "acoustic-signal"
  | "fazbear-honk"
  | "hard-bread";

export type LayoutCell = {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
};

export type StudioWingInfo = Readonly<{
  id: StudioWingId;
  code: string;
  name: string;
  subtitle: string;
  accentHex: number;
  accentCss: string;
  lore: string;
}>;

export type StudioEggPlacement = Readonly<{
  id: StudioEggId;
  wing: StudioWingId;
  cell: number;
  title: string;
  actionPrompt: string;
  loreLog: string;
}>;

export type StudioLayout = Readonly<{
  size: number;
  boothCell: number;
  exitCell: number;
  enemyStartCell: number;
  wingCenters: Readonly<Record<Exclude<StudioWingId, "corridor">, number>>;
  cellWings: readonly StudioWingId[];
  tapeCells: readonly number[];
  eggPlacements: readonly StudioEggPlacement[];
  echoCells: readonly number[];
  ventPairs: readonly [number, number][];
  cctvCells: readonly number[];
}>;

export const STUDIO_GRID_SIZE = 13;

export const STUDIO_WINGS: Readonly<Record<StudioWingId, StudioWingInfo>> = {
  booth: {
    id: "booth",
    code: "ALA 00",
    name: "CABINA DE PROYECCIÓN 22",
    subtitle: "PUNTO DE INSERCIÓN · CARRETE VACÍO",
    accentHex: 0x94c2a3,
    accentCss: "#94c2a3",
    lore: "02:22 AM. El proyector gira sin película. Algo cortó el máster y lo escondió por los cinco platós.",
  },
  neverland: {
    id: "neverland",
    code: "ALA 01",
    name: "PLATÓ NEVERLAND",
    subtitle: "BALDOSAS ROTAS · VITRINA DEL GUANTE",
    accentHex: 0x5ca4ff,
    accentCss: "#5ca4ff",
    lore: "Foco cenital frío sobre baldosas agrietadas. Si oyes pasos hacia atrás, no mires al suelo.",
  },
  crypt: {
    id: "crypt",
    code: "ALA 02",
    name: "CRIPTA DEL CLERO · 1969",
    subtitle: "VIDRIERA GÓTICA · ALTAR DE GHOST",
    accentHex: 0xb76bff,
    accentCss: "#b76bff",
    lore: "Huele a cera quemada y vinilo antiguo. En la pared sangra una vidriera: «If you have Ghosts...»",
  },
  acoustic: {
    id: "acoustic",
    code: "ALA 03",
    name: "CÁMARA ACÚSTICA 24 TET",
    subtitle: "CONSOLA MICROTONAL · VASO DE AGUA",
    accentHex: 0xffb347,
    accentCss: "#ffb347",
    lore: "Cuartos de tono que no deberían existir. Cuando el agua de la consola tiembla, algo se acerca.",
  },
  fazbear: {
    id: "fazbear",
    code: "ALA 04",
    name: "OFICINA FAZBEAR",
    subtitle: "GENERADOR CCTV · PÓSTER CELEBRATE! 22",
    accentHex: 0x5eff8a,
    accentCss: "#5eff8a",
    lore: "Un ventilador oxidado, monitores muertos y veintidós marcas arañadas detrás del cartel.",
  },
  archive: {
    id: "archive",
    code: "ALA 05",
    name: "ARCHIVO MUERTO · CATERING",
    subtitle: "FINAL_FINAL_AHORA_SÍ · RELIQUIA P01",
    accentHex: 0xff475e,
    accentCss: "#ff475e",
    lore: "Estanterías de proyectos sin guardar bajo luz roja de cuarto oscuro. Hay algo petrificado en la bandeja.",
  },
  corridor: {
    id: "corridor",
    code: "PASILLO",
    name: "PASADIZOS DE SERVICIO",
    subtitle: "ESTUDIOS PLATÓ 22",
    accentHex: 0x7f948b,
    accentCss: "#8fa39a",
    lore: "Hormigón húmedo, cables sueltos y un eco imposible al doblar cada esquina.",
  },
};

const DIRS: ReadonlyArray<[keyof LayoutCell, number, number]> = [
  ["n", 0, -1],
  ["e", 1, 0],
  ["s", 0, 1],
  ["w", -1, 0],
];

function bfsDistances(maze: readonly LayoutCell[], start: number, size: number) {
  const distances = new Int16Array(maze.length);
  distances.fill(-1);
  if (!maze[start]) return distances;
  const queue = new Int32Array(maze.length);
  let read = 0;
  let write = 1;
  queue[0] = start;
  distances[start] = 0;
  while (read < write) {
    const current = queue[read++];
    const row = Math.floor(current / size);
    const col = current % size;
    for (const [dir, dx, dz] of DIRS) {
      if (!maze[current]?.[dir]) continue;
      const nr = row + dz;
      const nc = col + dx;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const next = nr * size + nc;
      if (distances[next] !== -1) continue;
      distances[next] = distances[current] + 1;
      queue[write++] = next;
    }
  }
  return distances;
}

function nearestFreeCell(
  targetRow: number,
  targetCol: number,
  size: number,
  distances: Int16Array,
  used: Set<number>,
  minDistFromStart = 2,
) {
  let best = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let cell = 0; cell < size * size; cell += 1) {
    if (used.has(cell) || distances[cell] < minDistFromStart) continue;
    const row = Math.floor(cell / size);
    const col = cell % size;
    const score = Math.hypot(row - targetRow, col - targetCol);
    if (score < bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  if (best === -1) {
    for (let cell = 0; cell < size * size; cell += 1) {
      if (!used.has(cell) && distances[cell] >= 0) return cell;
    }
    return 0;
  }
  return best;
}

/**
 * Deterministically assigns the 5 horror wings, 5 tapes, 5 interactive horror
 * easter eggs, 4 spectral echoes, 2 vent pairs, and 6 CCTV cameras on a compact
 * 13×13 studio maze so every run feels hand-crafted and never spawns duplicates.
 */
export function buildStudioLayout(
  maze: readonly LayoutCell[],
  seed: number,
  size = STUDIO_GRID_SIZE,
): StudioLayout {
  const boothCell = 0;
  const fromStart = bfsDistances(maze, boothCell, size);
  const used = new Set<number>([boothCell]);

  // Farthest cell is the emergency premiere blast door.
  let exitCell = boothCell;
  let maxDist = -1;
  for (let i = 0; i < fromStart.length; i += 1) {
    if (fromStart[i] > maxDist) {
      maxDist = fromStart[i];
      exitCell = i;
    }
  }
  used.add(exitCell);

  // Place the 5 iconic wings across distinct quadrants so exploration flows naturally.
  const mid = Math.floor(size / 2);
  const far = size - 2;
  const near = 2;
  const jitter = (offset: number) => (((seed >>> offset) & 3) - 1);

  const neverlandCell = nearestFreeCell(near + jitter(0), far - 1, size, fromStart, used, 4);
  used.add(neverlandCell);
  const cryptCell = nearestFreeCell(mid + jitter(2), near + 1, size, fromStart, used, 4);
  used.add(cryptCell);
  const acousticCell = nearestFreeCell(mid + jitter(4), mid + jitter(6), size, fromStart, used, 5);
  used.add(acousticCell);
  const fazbearCell = nearestFreeCell(far - 1, near + 2 + jitter(8), size, fromStart, used, 5);
  used.add(fazbearCell);
  const archiveCell = nearestFreeCell(mid + 2, far - 1, size, fromStart, used, 5);
  used.add(archiveCell);

  const wingCenters: Record<Exclude<StudioWingId, "corridor">, number> = {
    booth: boothCell,
    neverland: neverlandCell,
    crypt: cryptCell,
    acoustic: acousticCell,
    fazbear: fazbearCell,
    archive: archiveCell,
  };

  // Full 13×13 multi-source Voronoi biome partitioning: every single hallway
  // belongs to one of the 6 rich studio biomes (zero empty grey corridors!).
  const majorBiomes: Exclude<StudioBiomeId, "booth">[] = [
    "neverland",
    "crypt",
    "acoustic",
    "fazbear",
    "archive",
  ];
  const biomeDistMaps = majorBiomes.map((id) => ({
    id,
    center: wingCenters[id],
    cRow: Math.floor(wingCenters[id] / size),
    cCol: wingCenters[id] % size,
    dist: bfsDistances(maze, wingCenters[id], size),
  }));

  const cellWings: StudioBiomeId[] = Array.from({ length: size * size }, (_, cellIndex) => {
    // Keep the immediate starting vestibule (0..2 corridor steps) as Cabina 00
    if (fromStart[cellIndex] >= 0 && fromStart[cellIndex] <= 2) {
      return "booth";
    }
    const row = Math.floor(cellIndex / size);
    const col = cellIndex % size;
    let chosen: StudioBiomeId = "neverland";
    let bestSteps = Number.POSITIVE_INFINITY;
    let bestEuclid = Number.POSITIVE_INFINITY;
    for (const entry of biomeDistMaps) {
      const steps = entry.dist[cellIndex];
      if (steps < 0) continue;
      const euclid = Math.hypot(row - entry.cRow, col - entry.cCol);
      if (steps < bestSteps || (steps === bestSteps && euclid < bestEuclid)) {
        bestSteps = steps;
        bestEuclid = euclid;
        chosen = entry.id;
      }
    }
    return chosen;
  });

  // Guarantee every wing anchor strictly owns its own centerpiece cell
  for (const biomeId of STUDIO_BIOME_IDS) {
    cellWings[wingCenters[biomeId]] = biomeId;
  }

  // Place 1 of Raúl's 5 tapes right inside (or adjacent to) each of the 5 thematic wings!
  const pickNearWing = (center: number) => {
    const d = bfsDistances(maze, center, size);
    let best = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < d.length; i += 1) {
      if (d[i] >= 1 && d[i] <= 2 && !used.has(i) && fromStart[i] >= 3) {
        if (d[i] < bestDist) {
          bestDist = d[i];
          best = i;
        }
      }
    }
    if (best === -1) {
      best = nearestFreeCell(Math.floor(center / size), center % size, size, fromStart, used, 3);
    }
    used.add(best);
    return best;
  };

  // Tape 0 (El Pan Ta' Duro) -> Archive; Tape 1 (WTF) -> Neverland;
  // Tape 2 (Corazón Intacto) -> Acoustic; Tape 3 (Catarsis) -> Crypt; Tape 4 (Imágenes Ocultas) -> Fazbear
  const tapeCells = [
    pickNearWing(archiveCell),
    pickNearWing(neverlandCell),
    pickNearWing(acousticCell),
    pickNearWing(cryptCell),
    pickNearWing(fazbearCell),
  ];

  // Interactive Horror Easter Eggs live directly at each wing's centerpiece!
  const eggPlacements: StudioEggPlacement[] = [
    {
      id: "neverland-vitrine",
      wing: "neverland",
      cell: neverlandCell,
      title: "VITRINA DE NEVERLAND",
      actionPrompt: "E · INSPECCIONAR EL GUANTE DE CRISTAL",
      loreLog: "TOMA 19 · El guante dejó una huella en el cristal desde dentro. Un «hee-hee» reverbera en los conductos.",
    },
    {
      id: "ghost-vinyl",
      wing: "crypt",
      cell: cryptCell,
      title: "VINILO 7\" · MARY ON A CROSS (1969)",
      actionPrompt: "E · TOCAR EL ALTAR DEL CLERO (1969)",
      loreLog: "SEVEN INCHES · Un acorde de órgano gótico repele a Sujeto M-22. (+30% CCTV · +1 Eco · Bendición del Clero)",
    },
    {
      id: "acoustic-signal",
      wing: "acoustic",
      cell: acousticCell,
      title: "TRANSMISOR 24 TET · SPIELBERG",
      actionPrompt: "E · EMITIR SEÑAL MICROTONAL (ATRAE A M-22)",
      loreLog: "RE · MI · DO · DO · SOL en cuartos de tono. Algo en el edificio ha respondido y se dirige hacia la consola.",
    },
    {
      id: "fazbear-honk",
      wing: "fazbear",
      cell: fazbearCell,
      title: "PÓSTER «CELEBRATE! 22» · GENERADOR",
      actionPrompt: "E · PULSAR NARIZ DEL PÓSTER Y RECARGAR CCTV",
      loreLog: "HONK... Detrás del cartel hay 22 marcas arañadas en el cemento. Batería CCTV restaurada al 100%.",
    },
    {
      id: "hard-bread",
      wing: "archive",
      cell: archiveCell,
      title: "RELIQUIA P01 · EL PAN TA' DURO",
      actionPrompt: "E · RECOGER BARRA DE PAN PETRIFICADA",
      loreLog: "Pesa como un bloque de hormigón. Tu próximo lanzamiento [Q] será un impacto sísmico contra Sujeto M-22.",
    },
  ];

  // Enemy spawns deep inside the complex, far from the player's starting booth.
  const enemyStartCell = nearestFreeCell(far - 1, far - 1, size, fromStart, used, Math.max(6, Math.floor(maxDist * 0.55)));
  used.add(enemyStartCell);

  // 4 spectral echoes + 4 vent anchors (2 connected shortcuts) spread nicely.
  const echoCells: number[] = [];
  const echoTargets: Array<[number, number]> = [
    [3, 4],
    [4, far - 2],
    [far - 3, mid],
    [mid + 1, 3],
  ];
  for (const [r, c] of echoTargets) {
    const cell = nearestFreeCell(r, c, size, fromStart, used, 3);
    used.add(cell);
    echoCells.push(cell);
  }

  const ventTargets: Array<[number, number]> = [
    [2, mid],
    [far - 2, mid + 2],
    [mid, 2],
    [mid - 1, far - 2],
  ];
  const ventCells: number[] = [];
  for (const [r, c] of ventTargets) {
    const cell = nearestFreeCell(r, c, size, fromStart, used, 3);
    used.add(cell);
    ventCells.push(cell);
  }
  const ventPairs: [number, number][] = [
    [ventCells[0], ventCells[1]],
    [ventCells[2], ventCells[3]],
  ];

  // 6 CCTV cameras watch the 5 iconic wings + the emergency exit!
  const cctvCells = [
    neverlandCell,
    cryptCell,
    acousticCell,
    fazbearCell,
    archiveCell,
    exitCell,
  ];

  return {
    size,
    boothCell,
    exitCell,
    enemyStartCell,
    wingCenters,
    cellWings,
    tapeCells,
    eggPlacements,
    echoCells,
    ventPairs,
    cctvCells,
  };
}
