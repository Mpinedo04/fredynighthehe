export type TrackerMazeCell = {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
};

export type ObjectiveKind = "tape" | "exit" | "bonus-tape";

export type ObjectiveReading = Readonly<{
  kind: ObjectiveKind;
  targetCell: number;
  label: string;
  code: string;
  routeCells: number;
  meters: number;
  signalStrength: "lejana" | "media" | "fuerte" | "muy-cerca" | "aqui";
  arrow: string;
  relativeDegrees: number;
  nextStepCell: number;
}>;

export type TapeCandidate = Readonly<{
  cell: number;
  code: string;
  title: string;
  collected: boolean;
}>;

const DEFAULT_MAZE_SIZE = 17;
const DEFAULT_CELL_SIZE = 4.2;
const DIRECTION_ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"] as const;
const DIRS: ReadonlyArray<[keyof TrackerMazeCell, number, number]> = [
  ["n", 0, -1],
  ["e", 1, 0],
  ["s", 0, 1],
  ["w", -1, 0],
];

function bfsTree(cells: readonly TrackerMazeCell[], start: number, size: number) {
  const distances = new Int16Array(cells.length);
  const previous = new Int32Array(cells.length);
  distances.fill(-1);
  previous.fill(-1);
  if (!cells[start]) return { distances, previous };

  const queue = new Int32Array(cells.length);
  let read = 0;
  let write = 1;
  queue[0] = start;
  distances[start] = 0;

  while (read < write) {
    const current = queue[read++];
    const row = Math.floor(current / size);
    const col = current % size;
    for (const [dir, dx, dz] of DIRS) {
      if (!cells[current]?.[dir]) continue;
      const nr = row + dz;
      const nc = col + dx;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const next = nr * size + nc;
      if (distances[next] !== -1) continue;
      distances[next] = distances[current] + 1;
      previous[next] = current;
      queue[write++] = next;
    }
  }
  return { distances, previous };
}

function reconstructPath(previous: Int32Array, start: number, target: number) {
  if (start === target) return [start];
  if (previous[target] === -1) return [start];
  const path = [target];
  let cursor = target;
  while (cursor !== start && cursor !== -1) {
    cursor = previous[cursor];
    if (cursor !== -1) path.unshift(cursor);
  }
  return path;
}

function cellCenter(index: number, size: number, cellSize: number) {
  const row = Math.floor(index / size);
  const col = index % size;
  const half = (size * cellSize) / 2;
  return {
    x: -half + cellSize / 2 + col * cellSize,
    z: -half + cellSize / 2 + row * cellSize,
  };
}

function normalizeDegrees(angle: number) {
  let degrees = angle % 360;
  if (degrees > 180) degrees -= 360;
  if (degrees <= -180) degrees += 360;
  return degrees;
}

export function arrowForRelativeDegrees(relativeDegrees: number) {
  const normalized = ((normalizeDegrees(relativeDegrees) % 360) + 360) % 360;
  const sector = Math.round(normalized / 45) % 8;
  return DIRECTION_ARROWS[sector];
}

export function signalForRouteCells(routeCells: number): ObjectiveReading["signalStrength"] {
  if (routeCells <= 1) return "aqui";
  if (routeCells <= 3) return "muy-cerca";
  if (routeCells <= 7) return "fuerte";
  if (routeCells <= 13) return "media";
  return "lejana";
}

/**
 * Computes the player's corridor-guided directional beacon to either the
 * nearest uncollected tape (until exit is powered) or the emergency exit.
 */
export function computeObjectiveReading(input: {
  maze: readonly TrackerMazeCell[];
  playerCell: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  tapes: readonly TapeCandidate[];
  tapesHeld: number;
  requiredTapes: number;
  exitCell: number;
  size?: number;
  cellSize?: number;
}): ObjectiveReading {
  const size = input.size ?? DEFAULT_MAZE_SIZE;
  const cellSize = input.cellSize ?? DEFAULT_CELL_SIZE;
  const { distances, previous } = bfsTree(input.maze, input.playerCell, size);
  const remaining = input.tapes.filter((tape) => !tape.collected);

  let kind: ObjectiveKind = "exit";
  let targetCell = input.exitCell;
  let label = "PUERTA DE EMERGENCIA";
  let code = "SALIDA";

  if (input.tapesHeld < input.requiredTapes && remaining.length > 0) {
    let best = remaining[0];
    let bestDist = distances[best.cell] >= 0 ? distances[best.cell] : Number.POSITIVE_INFINITY;
    for (const candidate of remaining) {
      const dist = distances[candidate.cell] >= 0 ? distances[candidate.cell] : Number.POSITIVE_INFINITY;
      if (dist < bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
    kind = "tape";
    targetCell = best.cell;
    label = best.title;
    code = best.code;
  }

  const route = reconstructPath(previous, input.playerCell, targetCell);
  const routeCells = Math.max(0, route.length - 1);
  // Look up to 2 corridor steps ahead so the arrow cleanly points down the next turn.
  const nextStepCell = route[Math.min(2, route.length - 1)] ?? targetCell;
  const waypoint = cellCenter(nextStepCell, size, cellSize);

  const dx = waypoint.x - input.playerX;
  const dz = waypoint.z - input.playerZ;
  // Player forward vector in Three.js YXZ is (-sin(yaw), -cos(yaw)).
  const forwardX = -Math.sin(input.playerYaw);
  const forwardZ = -Math.cos(input.playerYaw);
  // Right vector in world XZ is (cos(yaw), -sin(yaw)).
  const rightX = Math.cos(input.playerYaw);
  const rightZ = -Math.sin(input.playerYaw);

  let relativeDegrees = 0;
  if (Math.hypot(dx, dz) > 0.15) {
    const forwardDot = dx * forwardX + dz * forwardZ;
    const rightDot = dx * rightX + dz * rightZ;
    relativeDegrees = Math.round((Math.atan2(rightDot, forwardDot) * 180) / Math.PI);
  }

  return {
    kind,
    targetCell,
    label,
    code,
    routeCells,
    meters: Math.max(1, Math.round(routeCells * cellSize)),
    signalStrength: signalForRouteCells(routeCells),
    arrow: arrowForRelativeDegrees(relativeDegrees),
    relativeDegrees,
    nextStepCell,
  };
}
