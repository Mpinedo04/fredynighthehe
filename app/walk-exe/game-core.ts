export const MAZE_SIZE = 17;
export const CELL_SIZE = 4.2;
export const WALL_HEIGHT = 3.8;
export const PLAYER_HEIGHT = 1.58;
export const CROUCH_HEIGHT = 0.92;
export const PLAYER_RADIUS = 0.34;
export const WALL_THICKNESS = 0.22;

export type Direction = "n" | "e" | "s" | "w";

export type MazeCell = {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
};

export type FacilityZone =
  | "corridor"
  | "security"
  | "electrical"
  | "archive"
  | "maintenance"
  | "junction";

export type EnemyState =
  | "patrol"
  | "listen"
  | "investigate"
  | "search"
  | "chase"
  | "lure"
  | "vent-watch"
  | "ambush"
  | "recover";

export type NoiseKind =
  | "crouch-step"
  | "walk-step"
  | "sprint-step"
  | "vent-rattle"
  | "metal-impact"
  | "exit-alarm";

export type AcousticEvent = Readonly<{
  kind: NoiseKind;
  cell: number;
  emittedAt: number;
  loudness: number;
  maxDistanceCells: number;
  memoryMs: number;
}>;

export type AcousticCandidate = AcousticEvent &
  Readonly<{
    routeDistanceCells: number;
  }>;

export type AcousticPerception = Readonly<{
  event: AcousticEvent;
  routeDistanceCells: number;
  ageMs: number;
  confidence: number;
  audibleDistanceCells: number;
}>;

export const ACOUSTIC_PROFILES: Readonly<
  Record<
    NoiseKind,
    Readonly<{
      loudness: number;
      maxDistanceCells: number;
      memoryMs: number;
    }>
  >
> = {
  "crouch-step": {
    loudness: 0.12,
    maxDistanceCells: 2.4,
    memoryMs: 650,
  },
  "walk-step": {
    loudness: 0.48,
    maxDistanceCells: 8.5,
    memoryMs: 1900,
  },
  "sprint-step": {
    loudness: 1,
    maxDistanceCells: 20,
    memoryMs: 4600,
  },
  "vent-rattle": {
    loudness: 0.88,
    maxDistanceCells: 16,
    memoryMs: 3900,
  },
  "metal-impact": {
    loudness: 1.08,
    maxDistanceCells: 19,
    memoryMs: 5200,
  },
  "exit-alarm": {
    loudness: 1.25,
    maxDistanceCells: 25,
    memoryMs: 6200,
  },
};

export function createAcousticEvent(
  kind: NoiseKind,
  cell: number,
  emittedAt: number,
): AcousticEvent {
  const profile = ACOUSTIC_PROFILES[kind];
  return {
    kind,
    cell: Math.max(0, Math.trunc(cell)),
    emittedAt,
    ...profile,
  };
}

export function pruneAcousticEvents(
  events: readonly AcousticEvent[],
  now: number,
  maximumEvents = 24,
) {
  return events
    .filter(
      (event) =>
        Number.isFinite(event.emittedAt) &&
        now >= event.emittedAt &&
        now - event.emittedAt <= event.memoryMs,
    )
    .slice(-Math.max(1, Math.trunc(maximumEvents)));
}

export function selectAcousticTarget(
  candidates: readonly AcousticCandidate[],
  now: number,
): AcousticPerception | null {
  let best: AcousticPerception | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const ageMs = Math.max(0, now - candidate.emittedAt);
    if (ageMs > candidate.memoryMs) continue;
    const freshness = 1 - ageMs / Math.max(1, candidate.memoryMs);
    const audibleDistanceCells =
      candidate.maxDistanceCells * (0.58 + freshness * 0.42);
    if (
      candidate.routeDistanceCells < 0 ||
      candidate.routeDistanceCells > audibleDistanceCells
    ) {
      continue;
    }
    const reach =
      1 -
      candidate.routeDistanceCells / Math.max(0.001, audibleDistanceCells);
    const confidence = Math.min(
      1,
      Math.max(
        0,
        candidate.loudness * 0.52 + freshness * 0.27 + reach * 0.31,
      ),
    );
    const score =
      candidate.loudness * 1.45 + freshness * 0.72 + reach * 0.58;
    if (score <= bestScore) continue;
    bestScore = score;
    best = {
      event: {
        kind: candidate.kind,
        cell: candidate.cell,
        emittedAt: candidate.emittedAt,
        loudness: candidate.loudness,
        maxDistanceCells: candidate.maxDistanceCells,
        memoryMs: candidate.memoryMs,
      },
      routeDistanceCells: candidate.routeDistanceCells,
      ageMs,
      confidence,
      audibleDistanceCells,
    };
  }

  return best;
}

export function extrapolateAcousticTrailCell(
  cells: readonly MazeCell[],
  previousCell: number,
  currentCell: number,
  size = MAZE_SIZE,
) {
  const delta = currentCell - previousCell;
  const direction =
    delta === -size
      ? "n"
      : delta === 1 && Math.floor(previousCell / size) === Math.floor(currentCell / size)
        ? "e"
        : delta === size
          ? "s"
          : delta === -1 &&
              Math.floor(previousCell / size) === Math.floor(currentCell / size)
            ? "w"
            : null;
  if (!direction || !cells[currentCell]?.[direction]) return currentCell;
  const candidate = currentCell + delta;
  return candidate >= 0 && candidate < cells.length ? candidate : currentCell;
}

export type EnemyStimulus = {
  distanceCells: number;
  hasLure: boolean;
  heardNoise: boolean;
  noiseAgeMs: number;
  noiseDistanceCells?: number;
  noiseConfidence?: number;
  playerInVent: boolean;
  lastSeenAgeMs: number;
  cctvExposureMs: number;
  cctvSignalDistanceCells?: number;
  lineOfSight: boolean;
  currentState?: EnemyState;
};

export type MazeValidation = {
  valid: boolean;
  reachable: number;
  reciprocal: boolean;
  bounded: boolean;
  startHasExit: boolean;
  issues: string[];
};

export type GridPosition = {
  x: number;
  z: number;
};

export type GridMovement = GridPosition & {
  moved: number;
};

export const directions: Array<
  [Direction, number, number, Direction]
> = [
  ["n", 0, -1, "s"],
  ["e", 1, 0, "w"],
  ["s", 0, 1, "n"],
  ["w", -1, 0, "e"],
];

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMaze(seed: number, size = MAZE_SIZE) {
  const random = seededRandom(seed);
  const cells: MazeCell[] = Array.from({ length: size * size }, () => ({
    n: false,
    e: false,
    s: false,
    w: false,
  }));
  const visited = new Set<number>([0]);
  const stack = [0];

  while (stack.length) {
    const current = stack[stack.length - 1];
    const row = Math.floor(current / size);
    const column = current % size;
    const options = directions
      .map(([direction, dx, dz, opposite]) => ({
        direction,
        opposite,
        column: column + dx,
        row: row + dz,
      }))
      .filter(
        (option) =>
          option.column >= 0 &&
          option.column < size &&
          option.row >= 0 &&
          option.row < size &&
          !visited.has(option.row * size + option.column),
      );

    if (!options.length) {
      stack.pop();
      continue;
    }

    const next = options[Math.floor(random() * options.length)];
    const nextIndex = next.row * size + next.column;
    cells[current][next.direction] = true;
    cells[nextIndex][next.opposite] = true;
    visited.add(nextIndex);
    stack.push(nextIndex);
  }

  // Deliberate graph loops create escape routes and prevent a perfect-tree maze.
  for (let index = 0; index < size * 2; index += 1) {
    const row = 1 + Math.floor(random() * (size - 2));
    const column = 1 + Math.floor(random() * (size - 2));
    const cellIndex = row * size + column;
    if (random() > 0.5) {
      cells[cellIndex].e = true;
      cells[cellIndex + 1].w = true;
    } else {
      cells[cellIndex].s = true;
      cells[cellIndex + size].n = true;
    }
  }

  return cells;
}

export function cellCenter2D(
  index: number,
  size = MAZE_SIZE,
  cellSize = CELL_SIZE,
) {
  const row = Math.floor(index / size);
  const column = index % size;
  const half = (size * cellSize) / 2;
  return {
    x: -half + cellSize / 2 + column * cellSize,
    z: -half + cellSize / 2 + row * cellSize,
  };
}

export function positionCell2D(
  x: number,
  z: number,
  size = MAZE_SIZE,
  cellSize = CELL_SIZE,
) {
  const half = (size * cellSize) / 2;
  const column = Math.max(
    0,
    Math.min(size - 1, Math.floor((x + half) / cellSize)),
  );
  const row = Math.max(
    0,
    Math.min(size - 1, Math.floor((z + half) / cellSize)),
  );
  return row * size + column;
}

export function openingDirection(cell: MazeCell) {
  if (cell.s) return { x: 0, z: 1, yaw: Math.PI };
  if (cell.e) return { x: 1, z: 0, yaw: -Math.PI / 2 };
  if (cell.n) return { x: 0, z: -1, yaw: 0 };
  if (cell.w) return { x: -1, z: 0, yaw: Math.PI / 2 };
  return { x: 0, z: 1, yaw: Math.PI };
}

export function mazePath(
  cells: MazeCell[],
  start: number,
  target: number,
  size = MAZE_SIZE,
) {
  if (start === target) return [start];
  const queue = [start];
  let cursorIndex = 0;
  const previous = new Map<number, number>();
  const visited = new Set<number>([start]);

  while (cursorIndex < queue.length) {
    const current = queue[cursorIndex];
    cursorIndex += 1;
    const row = Math.floor(current / size);
    const column = current % size;
    for (const [direction, dx, dz] of directions) {
      if (!cells[current]?.[direction]) continue;
      const nextRow = row + dz;
      const nextColumn = column + dx;
      if (
        nextRow < 0 ||
        nextRow >= size ||
        nextColumn < 0 ||
        nextColumn >= size
      ) {
        continue;
      }
      const next = nextRow * size + nextColumn;
      if (visited.has(next)) continue;
      visited.add(next);
      previous.set(next, current);
      if (next === target) {
        const path = [target];
        let cursor = target;
        while (cursor !== start) {
          cursor = previous.get(cursor)!;
          path.unshift(cursor);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [start];
}

export function mazeDistances(
  cells: MazeCell[],
  start: number,
  size = MAZE_SIZE,
) {
  const distances = new Int16Array(cells.length);
  distances.fill(-1);
  if (!cells[start]) return distances;
  const queue = new Int32Array(cells.length);
  let read = 0;
  let write = 1;
  queue[0] = start;
  distances[start] = 0;

  while (read < write) {
    const current = queue[read];
    read += 1;
    const row = Math.floor(current / size);
    const column = current % size;
    for (const [direction, dx, dz] of directions) {
      if (!cells[current]?.[direction]) continue;
      const nextRow = row + dz;
      const nextColumn = column + dx;
      if (
        nextRow < 0 ||
        nextRow >= size ||
        nextColumn < 0 ||
        nextColumn >= size
      ) {
        continue;
      }
      const next = nextRow * size + nextColumn;
      if (distances[next] !== -1) continue;
      distances[next] = distances[current] + 1;
      queue[write] = next;
      write += 1;
    }
  }

  return distances;
}

export function farthestCell(
  cells: MazeCell[],
  start: number,
  size = MAZE_SIZE,
) {
  const distances = mazeDistances(cells, start, size);
  let farthest = start;
  let longest = -1;
  distances.forEach((length, index) => {
    if (length > longest) {
      farthest = index;
      longest = length;
    }
  });
  return farthest;
}

export function chooseSpreadCells(
  cells: MazeCell[],
  seed: number,
  count: number,
  size = MAZE_SIZE,
) {
  const random = seededRandom(seed * 41 + 22);
  const distances = mazeDistances(cells, 0, size);
  const candidates = cells
    .map((_, index) => index)
    .filter((index) => distances[index] > size / 2);
  const chosen: number[] = [];
  while (candidates.length && chosen.length < count) {
    const candidateIndex = Math.floor(random() * candidates.length);
    chosen.push(candidates.splice(candidateIndex, 1)[0]);
  }
  return chosen;
}

export function uniqueReachableCells(
  cells: MazeCell[],
  preferred: number[],
  count: number,
  excluded: number[] = [],
  size = MAZE_SIZE,
) {
  const distances = mazeDistances(cells, 0, size);
  const blocked = new Set(excluded);
  const result: number[] = [];
  const append = (cell: number) => {
    if (
      result.length >= count ||
      blocked.has(cell) ||
      result.includes(cell) ||
      distances[cell] < 0
    ) {
      return;
    }
    result.push(cell);
  };
  preferred.forEach(append);
  Array.from(distances)
    .map((distance, index) => ({ distance, index }))
    .sort((first, second) => second.distance - first.distance)
    .forEach(({ index }) => append(index));
  return result;
}

export function createZoneMap(
  cells: MazeCell[],
  seed: number,
  size = MAZE_SIZE,
) {
  const zones: FacilityZone[] = Array.from(
    { length: cells.length },
    () => "corridor",
  );
  const special = chooseSpreadCells(cells, seed + 807, 10, size);
  const zoneCycle: FacilityZone[] = [
    "security",
    "electrical",
    "archive",
    "maintenance",
    "junction",
  ];
  special.forEach((cell, index) => {
    zones[cell] = zoneCycle[index % zoneCycle.length];
  });
  cells.forEach((cell, index) => {
    const openings = directions.filter(([direction]) => cell[direction]).length;
    if (openings >= 3 && zones[index] === "corridor") {
      zones[index] = "junction";
    }
  });
  return zones;
}

export function corridorLineOfSight(
  cells: MazeCell[],
  start: number,
  target: number,
  size = MAZE_SIZE,
) {
  if (start === target) return true;
  const startRow = Math.floor(start / size);
  const startColumn = start % size;
  const targetRow = Math.floor(target / size);
  const targetColumn = target % size;

  if (startRow === targetRow) {
    const step = targetColumn > startColumn ? 1 : -1;
    const direction: Direction = step > 0 ? "e" : "w";
    let column = startColumn;
    while (column !== targetColumn) {
      const current = startRow * size + column;
      if (!cells[current]?.[direction]) return false;
      column += step;
    }
    return true;
  }

  if (startColumn === targetColumn) {
    const step = targetRow > startRow ? 1 : -1;
    const direction: Direction = step > 0 ? "s" : "n";
    let row = startRow;
    while (row !== targetRow) {
      const current = row * size + startColumn;
      if (!cells[current]?.[direction]) return false;
      row += step;
    }
    return true;
  }

  return false;
}

export function resolveGridMovement(
  cells: MazeCell[],
  position: GridPosition,
  delta: GridPosition,
  size = MAZE_SIZE,
  cellSize = CELL_SIZE,
  radius = PLAYER_RADIUS,
  wallThickness = WALL_THICKNESS,
): GridMovement {
  const corridorLimit = cellSize / 2 - radius - wallThickness / 2;
  const worldLimit = (size * cellSize) / 2 - radius - wallThickness / 2;
  let x = position.x;
  let z = position.z;

  if (delta.x) {
    const cellIndex = positionCell2D(x, z, size, cellSize);
    const cell = cells[cellIndex];
    const center = cellCenter2D(cellIndex, size, cellSize);
    let next = x + delta.x;
    if (!cell?.e) next = Math.min(next, center.x + corridorLimit);
    if (!cell?.w) next = Math.max(next, center.x - corridorLimit);
    x = Math.max(-worldLimit, Math.min(worldLimit, next));
  }

  if (delta.z) {
    const cellIndex = positionCell2D(x, z, size, cellSize);
    const cell = cells[cellIndex];
    const center = cellCenter2D(cellIndex, size, cellSize);
    let next = z + delta.z;
    if (!cell?.s) next = Math.min(next, center.z + corridorLimit);
    if (!cell?.n) next = Math.max(next, center.z - corridorLimit);
    z = Math.max(-worldLimit, Math.min(worldLimit, next));
  }

  return {
    x,
    z,
    moved: Math.hypot(x - position.x, z - position.z),
  };
}

export function validateMaze(
  cells: MazeCell[],
  size = MAZE_SIZE,
): MazeValidation {
  const issues: string[] = [];
  let reciprocal = true;
  let bounded = true;

  if (cells.length !== size * size) {
    issues.push(`expected ${size * size} cells, received ${cells.length}`);
  }

  cells.forEach((cell, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    directions.forEach(([direction, dx, dz, opposite]) => {
      if (!cell[direction]) return;
      const nextRow = row + dz;
      const nextColumn = column + dx;
      if (
        nextRow < 0 ||
        nextRow >= size ||
        nextColumn < 0 ||
        nextColumn >= size
      ) {
        bounded = false;
        return;
      }
      const next = nextRow * size + nextColumn;
      if (!cells[next]?.[opposite]) reciprocal = false;
    });
  });

  const reachable = Array.from(mazeDistances(cells, 0, size)).filter(
    (distance) => distance >= 0,
  ).length;
  const startHasExit = directions.some(([direction]) => cells[0]?.[direction]);
  if (!reciprocal) issues.push("non-reciprocal passage detected");
  if (!bounded) issues.push("passage leaves maze bounds");
  if (!startHasExit) issues.push("start cell has no opening");
  if (reachable !== cells.length) {
    issues.push(`${cells.length - reachable} unreachable cells`);
  }

  return {
    valid:
      cells.length === size * size &&
      reciprocal &&
      bounded &&
      startHasExit &&
      reachable === cells.length,
    reachable,
    reciprocal,
    bounded,
    startHasExit,
    issues,
  };
}

export function decideEnemyState(stimulus: EnemyStimulus): EnemyState {
  if (stimulus.hasLure) return "lure";
  if (stimulus.playerInVent && stimulus.distanceCells <= 5) {
    return stimulus.distanceCells <= 2 ? "ambush" : "vent-watch";
  }
  if (stimulus.lineOfSight) return "chase";
  if (
    stimulus.currentState === "chase" &&
    stimulus.lastSeenAgeMs < 3200
  ) {
    return "chase";
  }
  if (stimulus.heardNoise && stimulus.noiseAgeMs < 2200) {
    const noiseDistance =
      stimulus.noiseDistanceCells ?? stimulus.distanceCells;
    const confidence = stimulus.noiseConfidence ?? 0.5;
    const preciseRange = confidence >= 0.68 ? 15 : 7;
    return noiseDistance <= preciseRange ? "investigate" : "listen";
  }
  if (
    (stimulus.currentState === "investigate" ||
      stimulus.currentState === "listen") &&
    stimulus.noiseAgeMs < 5200
  ) {
    return "search";
  }
  if (
    stimulus.cctvExposureMs > 6000 &&
    (stimulus.cctvSignalDistanceCells ?? stimulus.distanceCells) <= 9
  ) {
    return "investigate";
  }
  if (stimulus.lastSeenAgeMs < 4500) return "search";
  if (stimulus.noiseAgeMs < 8200) return "recover";
  if (stimulus.lastSeenAgeMs < 9000) return "recover";
  return "patrol";
}
