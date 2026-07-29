export type CapsuleVector2 = {
  x: number;
  z: number;
};

export type CapsuleMazeCell = {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
};

export type CapsuleHeightLimit = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxHeight: number;
};

export type CapsuleControllerOptions = {
  size?: number;
  cellSize?: number;
  wallThickness?: number;
  radius?: number;
  standingHeight?: number;
  crouchingHeight?: number;
  standingEyeHeight?: number;
  crouchingEyeHeight?: number;
  heightChangeSpeed?: number;
  collisionIterations?: number;
  skinWidth?: number;
  heightLimits?: readonly CapsuleHeightLimit[];
};

export type CapsuleWall = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type CapsuleCollisionWorld = {
  size: number;
  cellSize: number;
  wallThickness: number;
  radius: number;
  standingHeight: number;
  crouchingHeight: number;
  standingEyeHeight: number;
  crouchingEyeHeight: number;
  heightChangeSpeed: number;
  collisionIterations: number;
  skinWidth: number;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  walls: readonly CapsuleWall[];
  expandedWalls: readonly CapsuleWall[];
  heightLimits: readonly CapsuleHeightLimit[];
};

export type CapsuleState = {
  position: CapsuleVector2;
  height: number;
  crouching: boolean;
};

export type CapsuleStepInput = {
  velocity: CapsuleVector2;
  deltaSeconds: number;
  crouch: boolean;
};

export type CapsuleStepResult = {
  state: CapsuleState;
  eyeHeight: number;
  moved: number;
  attempted: number;
  collided: boolean;
  collisionNormals: readonly CapsuleVector2[];
  blockedStanding: boolean;
};

export type CapsuleLocalMovement = {
  forward: number;
  strafe: number;
  yaw: number;
  speed: number;
};

const DEFAULT_CELL_SIZE = 4.2;
const DEFAULT_WALL_THICKNESS = 0.22;
const DEFAULT_RADIUS = 0.34;
const DEFAULT_STANDING_HEIGHT = 1.82;
const DEFAULT_CROUCHING_HEIGHT = 1.08;
const DEFAULT_STANDING_EYE_HEIGHT = 1.58;
const DEFAULT_CROUCHING_EYE_HEIGHT = 0.92;
const DEFAULT_HEIGHT_CHANGE_SPEED = 3.7;
const DEFAULT_COLLISION_ITERATIONS = 6;
const DEFAULT_SKIN_WIDTH = 0.0001;
const EPSILON = 1e-9;

function finitePositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number`);
  }
  return value;
}

function finiteCoordinate(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function addWall(
  walls: CapsuleWall[],
  wallKeys: Set<string>,
  key: string,
  wall: CapsuleWall,
) {
  if (wallKeys.has(key)) return;
  wallKeys.add(key);
  walls.push(wall);
}

/**
 * Compiles the maze grid into immutable collision data. Passage openings are
 * accepted only when both adjacent cells agree, while the four external edges
 * are always sealed independently of malformed maze data.
 */
export function createCapsuleCollisionWorld(
  cells: readonly CapsuleMazeCell[],
  options: CapsuleControllerOptions = {},
): CapsuleCollisionWorld {
  const inferredSize = Math.sqrt(cells.length);
  const size = options.size ?? inferredSize;
  if (!Number.isInteger(size) || size <= 0 || size * size !== cells.length) {
    throw new RangeError(
      `size must describe the square maze (${cells.length} cells received)`,
    );
  }

  const cellSize = finitePositive(
    options.cellSize ?? DEFAULT_CELL_SIZE,
    "cellSize",
  );
  const wallThickness = finitePositive(
    options.wallThickness ?? DEFAULT_WALL_THICKNESS,
    "wallThickness",
  );
  const radius = finitePositive(options.radius ?? DEFAULT_RADIUS, "radius");
  const standingHeight = finitePositive(
    options.standingHeight ?? DEFAULT_STANDING_HEIGHT,
    "standingHeight",
  );
  const crouchingHeight = finitePositive(
    options.crouchingHeight ?? DEFAULT_CROUCHING_HEIGHT,
    "crouchingHeight",
  );
  const standingEyeHeight = finitePositive(
    options.standingEyeHeight ?? DEFAULT_STANDING_EYE_HEIGHT,
    "standingEyeHeight",
  );
  const crouchingEyeHeight = finitePositive(
    options.crouchingEyeHeight ?? DEFAULT_CROUCHING_EYE_HEIGHT,
    "crouchingEyeHeight",
  );
  const heightChangeSpeed = finitePositive(
    options.heightChangeSpeed ?? DEFAULT_HEIGHT_CHANGE_SPEED,
    "heightChangeSpeed",
  );
  const collisionIterations =
    options.collisionIterations ?? DEFAULT_COLLISION_ITERATIONS;
  const skinWidth = finitePositive(
    options.skinWidth ?? DEFAULT_SKIN_WIDTH,
    "skinWidth",
  );

  if (
    !Number.isInteger(collisionIterations) ||
    collisionIterations < 2 ||
    collisionIterations > 16
  ) {
    throw new RangeError("collisionIterations must be an integer from 2 to 16");
  }
  if (crouchingHeight >= standingHeight) {
    throw new RangeError("crouchingHeight must be lower than standingHeight");
  }
  if (
    crouchingEyeHeight > crouchingHeight ||
    standingEyeHeight > standingHeight
  ) {
    throw new RangeError("eye heights cannot exceed their capsule heights");
  }
  if (radius * 2 + wallThickness >= cellSize) {
    throw new RangeError("capsule diameter must leave a traversable corridor");
  }

  const half = (size * cellSize) / 2;
  const halfWall = wallThickness / 2;
  const segmentHalfLength = cellSize / 2 + halfWall;
  const walls: CapsuleWall[] = [];
  const wallKeys = new Set<string>();

  const verticalWall = (gridX: number, row: number) => {
    const x = -half + gridX * cellSize;
    const z = -half + cellSize / 2 + row * cellSize;
    addWall(walls, wallKeys, `v:${gridX}:${row}`, {
      minX: x - halfWall,
      maxX: x + halfWall,
      minZ: z - segmentHalfLength,
      maxZ: z + segmentHalfLength,
    });
  };
  const horizontalWall = (column: number, gridZ: number) => {
    const x = -half + cellSize / 2 + column * cellSize;
    const z = -half + gridZ * cellSize;
    addWall(walls, wallKeys, `h:${column}:${gridZ}`, {
      minX: x - segmentHalfLength,
      maxX: x + segmentHalfLength,
      minZ: z - halfWall,
      maxZ: z + halfWall,
    });
  };

  // The outer shell is authoritative even if boundary flags are malformed.
  for (let index = 0; index < size; index += 1) {
    verticalWall(0, index);
    verticalWall(size, index);
    horizontalWall(index, 0);
    horizontalWall(index, size);
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const index = row * size + column;
      const cell = cells[index];
      const east = column + 1 < size ? cells[index + 1] : undefined;
      const south = row + 1 < size ? cells[index + size] : undefined;

      if (column + 1 < size && (!cell?.e || !east?.w)) {
        verticalWall(column + 1, row);
      }
      if (row + 1 < size && (!cell?.s || !south?.n)) {
        horizontalWall(column, row + 1);
      }
    }
  }

  const expandedWalls = walls.map((wall) => ({
    minX: wall.minX - radius,
    maxX: wall.maxX + radius,
    minZ: wall.minZ - radius,
    maxZ: wall.maxZ + radius,
  }));
  const inset = halfWall + radius;
  const heightLimits = (options.heightLimits ?? []).map((limit) => {
    if (
      !Number.isFinite(limit.minX) ||
      !Number.isFinite(limit.maxX) ||
      !Number.isFinite(limit.minZ) ||
      !Number.isFinite(limit.maxZ) ||
      limit.minX >= limit.maxX ||
      limit.minZ >= limit.maxZ
    ) {
      throw new RangeError("height limit bounds must be finite and ordered");
    }
    finitePositive(limit.maxHeight, "heightLimits.maxHeight");
    if (limit.maxHeight + EPSILON < crouchingHeight) {
      throw new RangeError(
        "height limit cannot be lower than the crouching capsule",
      );
    }
    return { ...limit };
  });

  return {
    size,
    cellSize,
    wallThickness,
    radius,
    standingHeight,
    crouchingHeight,
    standingEyeHeight,
    crouchingEyeHeight,
    heightChangeSpeed,
    collisionIterations,
    skinWidth,
    bounds: {
      minX: -half + inset,
      maxX: half - inset,
      minZ: -half + inset,
      maxZ: half - inset,
    },
    walls,
    expandedWalls,
    heightLimits,
  };
}

function pointInsideWall(
  x: number,
  z: number,
  wall: CapsuleWall,
) {
  return (
    x > wall.minX + EPSILON &&
    x < wall.maxX - EPSILON &&
    z > wall.minZ + EPSILON &&
    z < wall.maxZ - EPSILON
  );
}

function clampToBounds(
  world: CapsuleCollisionWorld,
  position: CapsuleVector2,
) {
  return {
    x: Math.max(world.bounds.minX, Math.min(world.bounds.maxX, position.x)),
    z: Math.max(world.bounds.minZ, Math.min(world.bounds.maxZ, position.z)),
  };
}

function depenetrate(
  world: CapsuleCollisionWorld,
  position: CapsuleVector2,
) {
  const resolved = clampToBounds(world, position);

  for (
    let iteration = 0;
    iteration < world.collisionIterations;
    iteration += 1
  ) {
    let correction:
      | { distance: number; x: number; z: number }
      | undefined;

    for (const wall of world.expandedWalls) {
      if (!pointInsideWall(resolved.x, resolved.z, wall)) continue;
      const candidates = [
        {
          distance: resolved.x - wall.minX,
          x: wall.minX - resolved.x - world.skinWidth,
          z: 0,
        },
        {
          distance: wall.maxX - resolved.x,
          x: wall.maxX - resolved.x + world.skinWidth,
          z: 0,
        },
        {
          distance: resolved.z - wall.minZ,
          x: 0,
          z: wall.minZ - resolved.z - world.skinWidth,
        },
        {
          distance: wall.maxZ - resolved.z,
          x: 0,
          z: wall.maxZ - resolved.z + world.skinWidth,
        },
      ];
      for (const candidate of candidates) {
        if (!correction || candidate.distance < correction.distance) {
          correction = candidate;
        }
      }
    }

    if (!correction) break;
    resolved.x += correction.x;
    resolved.z += correction.z;
    const clamped = clampToBounds(world, resolved);
    resolved.x = clamped.x;
    resolved.z = clamped.z;
  }

  return resolved;
}

type SweepHit = {
  time: number;
  normal: CapsuleVector2;
};

function sweepPointAgainstWall(
  start: CapsuleVector2,
  delta: CapsuleVector2,
  wall: CapsuleWall,
): SweepHit | undefined {
  let nearTime = Number.NEGATIVE_INFINITY;
  let farTime = Number.POSITIVE_INFINITY;
  let normal = { x: 0, z: 0 };

  const axis = (
    origin: number,
    movement: number,
    minimum: number,
    maximum: number,
    minimumNormal: CapsuleVector2,
    maximumNormal: CapsuleVector2,
  ) => {
    if (Math.abs(movement) <= EPSILON) {
      return origin >= minimum && origin <= maximum;
    }
    const first = (minimum - origin) / movement;
    const second = (maximum - origin) / movement;
    const axisNear = Math.min(first, second);
    const axisFar = Math.max(first, second);
    const axisNormal = first < second ? minimumNormal : maximumNormal;
    if (axisNear > nearTime) {
      nearTime = axisNear;
      normal = axisNormal;
    }
    farTime = Math.min(farTime, axisFar);
    return nearTime <= farTime;
  };

  if (
    !axis(
      start.x,
      delta.x,
      wall.minX,
      wall.maxX,
      { x: -1, z: 0 },
      { x: 1, z: 0 },
    ) ||
    !axis(
      start.z,
      delta.z,
      wall.minZ,
      wall.maxZ,
      { x: 0, z: -1 },
      { x: 0, z: 1 },
    )
  ) {
    return undefined;
  }
  if (farTime < 0 || nearTime > 1 || nearTime < -EPSILON) return undefined;

  const time = Math.max(0, nearTime);
  const movingIntoSurface =
    delta.x * normal.x + delta.z * normal.z < -EPSILON;
  if (time <= EPSILON && !movingIntoSurface) return undefined;
  return { time, normal };
}

function sweepAndSlide(
  world: CapsuleCollisionWorld,
  start: CapsuleVector2,
  desiredDelta: CapsuleVector2,
) {
  const position = depenetrate(world, start);
  let remaining = { ...desiredDelta };
  const collisionNormals: CapsuleVector2[] = [];

  for (
    let iteration = 0;
    iteration < world.collisionIterations;
    iteration += 1
  ) {
    if (Math.hypot(remaining.x, remaining.z) <= EPSILON) break;
    let nearest: SweepHit | undefined;
    for (const wall of world.expandedWalls) {
      const hit = sweepPointAgainstWall(position, remaining, wall);
      if (!hit || (nearest && hit.time >= nearest.time)) continue;
      nearest = hit;
    }

    if (!nearest) {
      position.x += remaining.x;
      position.z += remaining.z;
      remaining = { x: 0, z: 0 };
      break;
    }

    position.x += remaining.x * nearest.time;
    position.z += remaining.z * nearest.time;
    position.x += nearest.normal.x * world.skinWidth;
    position.z += nearest.normal.z * world.skinWidth;
    collisionNormals.push(nearest.normal);

    const remainingScale = Math.max(0, 1 - nearest.time);
    remaining.x *= remainingScale;
    remaining.z *= remainingScale;
    const inward =
      remaining.x * nearest.normal.x + remaining.z * nearest.normal.z;
    if (inward < 0) {
      remaining.x -= nearest.normal.x * inward;
      remaining.z -= nearest.normal.z * inward;
    }
  }

  const bounded = clampToBounds(world, depenetrate(world, position));
  return { position: bounded, collisionNormals };
}

function capsuleOverlapsRegion(
  position: CapsuleVector2,
  radius: number,
  region: CapsuleHeightLimit,
) {
  const closestX = Math.max(
    region.minX,
    Math.min(region.maxX, position.x),
  );
  const closestZ = Math.max(
    region.minZ,
    Math.min(region.maxZ, position.z),
  );
  return (
    (position.x - closestX) ** 2 + (position.z - closestZ) ** 2 <
    radius ** 2
  );
}

function heightLimitAt(
  world: CapsuleCollisionWorld,
  position: CapsuleVector2,
) {
  let limit = world.standingHeight;
  for (const region of world.heightLimits) {
    if (capsuleOverlapsRegion(position, world.radius, region)) {
      limit = Math.min(limit, region.maxHeight);
    }
  }
  return limit;
}

function moveToward(current: number, target: number, maximumDelta: number) {
  if (current < target) return Math.min(target, current + maximumDelta);
  return Math.max(target, current - maximumDelta);
}

function eyeHeightForCapsule(
  world: CapsuleCollisionWorld,
  height: number,
) {
  const range = world.standingHeight - world.crouchingHeight;
  const progress =
    range <= EPSILON
      ? 1
      : Math.max(
          0,
          Math.min(1, (height - world.crouchingHeight) / range),
        );
  return (
    world.crouchingEyeHeight +
    (world.standingEyeHeight - world.crouchingEyeHeight) * progress
  );
}

export function createCapsuleState(
  world: CapsuleCollisionWorld,
  position: CapsuleVector2,
  crouching = false,
): CapsuleState {
  const resolved = depenetrate(world, {
    x: finiteCoordinate(position.x),
    z: finiteCoordinate(position.z),
  });
  const clearance = heightLimitAt(world, resolved);
  const height = Math.min(
    crouching ? world.crouchingHeight : world.standingHeight,
    clearance,
  );
  return {
    position: resolved,
    height,
    crouching:
      crouching || height < world.standingHeight - world.skinWidth,
  };
}

/**
 * Advances one fixed simulation step without mutating the input state/world.
 * Velocity is expressed in metres per second and deltaSeconds is normally
 * 1 / 60. The sweep remains continuous for larger displacements as well.
 */
export function stepCapsuleController(
  world: CapsuleCollisionWorld,
  state: CapsuleState,
  input: CapsuleStepInput,
): CapsuleStepResult {
  const deltaSeconds = Math.max(
    0,
    Number.isFinite(input.deltaSeconds) ? input.deltaSeconds : 0,
  );
  const velocity = {
    x: finiteCoordinate(input.velocity.x),
    z: finiteCoordinate(input.velocity.z),
  };
  const desiredDelta = {
    x: velocity.x * deltaSeconds,
    z: velocity.z * deltaSeconds,
  };
  const start = {
    x: finiteCoordinate(state.position.x),
    z: finiteCoordinate(state.position.z),
  };
  const movement = sweepAndSlide(world, start, desiredDelta);
  const clearance = heightLimitAt(world, movement.position);
  const blockedStanding =
    !input.crouch &&
    clearance < world.standingHeight - world.skinWidth;
  const desiredHeight = input.crouch
    ? world.crouchingHeight
    : Math.min(world.standingHeight, clearance);
  const currentHeight = Math.max(
    world.crouchingHeight,
    Math.min(world.standingHeight, finiteCoordinate(state.height)),
  );
  const height = moveToward(
    currentHeight,
    desiredHeight,
    world.heightChangeSpeed * deltaSeconds,
  );
  const crouching =
    input.crouch ||
    blockedStanding ||
    height < world.standingHeight - world.skinWidth;

  return {
    state: {
      position: movement.position,
      height,
      crouching,
    },
    eyeHeight: eyeHeightForCapsule(world, height),
    moved: Math.hypot(
      movement.position.x - start.x,
      movement.position.z - start.z,
    ),
    attempted: Math.hypot(desiredDelta.x, desiredDelta.z),
    collided: movement.collisionNormals.length > 0,
    collisionNormals: movement.collisionNormals,
    blockedStanding,
  };
}

/**
 * Converts normalized WASD-style input to world velocity using the same yaw
 * convention as WalkGame: yaw 0 looks towards negative Z.
 */
export function capsuleVelocityFromInput(
  movement: CapsuleLocalMovement,
): CapsuleVector2 {
  const forward = finiteCoordinate(movement.forward);
  const strafe = finiteCoordinate(movement.strafe);
  const inputLength = Math.hypot(forward, strafe);
  if (inputLength <= EPSILON) return { x: 0, z: 0 };
  const scale =
    finiteCoordinate(movement.speed) / Math.max(1, inputLength);
  const normalizedForward = forward * scale;
  const normalizedStrafe = strafe * scale;
  const yaw = finiteCoordinate(movement.yaw);
  return {
    x:
      -Math.sin(yaw) * normalizedForward +
      Math.cos(yaw) * normalizedStrafe,
    z:
      -Math.cos(yaw) * normalizedForward -
      Math.sin(yaw) * normalizedStrafe,
  };
}
