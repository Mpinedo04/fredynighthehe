import assert from "node:assert/strict";
import test from "node:test";
import {
  capsuleVelocityFromInput,
  createCapsuleCollisionWorld,
  createCapsuleState,
  stepCapsuleController,
} from "../app/walk-exe/capsule-controller.ts";

const FIXED_DELTA = 1 / 60;

function createOpenMaze(size) {
  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    return {
      n: row > 0,
      e: column < size - 1,
      s: row < size - 1,
      w: column > 0,
    };
  });
}

function createClosedMaze(size) {
  return Array.from({ length: size * size }, () => ({
    n: false,
    e: false,
    s: false,
    w: false,
  }));
}

function centerOf(size, column, row, cellSize = 4.2) {
  const half = (size * cellSize) / 2;
  return {
    x: -half + cellSize / 2 + column * cellSize,
    z: -half + cellSize / 2 + row * cellSize,
  };
}

function simulate(world, initial, ticks, input) {
  let state = initial;
  let lastResult;
  for (let tick = 0; tick < ticks; tick += 1) {
    lastResult = stepCapsuleController(world, state, {
      deltaSeconds: FIXED_DELTA,
      ...input,
    });
    state = lastResult.state;
  }
  return { state, lastResult };
}

test("held W advances continuously for ten fixed-step seconds", () => {
  const size = 12;
  const world = createCapsuleCollisionWorld(createOpenMaze(size), { size });
  const initial = createCapsuleState(world, centerOf(size, 2, 6));
  const velocity = capsuleVelocityFromInput({
    forward: 1,
    strafe: 0,
    yaw: -Math.PI / 2,
    speed: 2.75,
  });
  const { state } = simulate(world, initial, 600, {
    velocity,
    crouch: false,
  });

  assert.ok(
    Math.abs(state.position.x - (initial.position.x + 27.5)) < 1e-8,
  );
  assert.ok(Math.abs(state.position.z - initial.position.z) < 1e-8);
});

test("normalized diagonal movement has no speed boost", () => {
  const size = 8;
  const world = createCapsuleCollisionWorld(createOpenMaze(size), { size });
  const initial = createCapsuleState(world, centerOf(size, 3, 3));
  const speed = 2.75;
  const velocity = capsuleVelocityFromInput({
    forward: 1,
    strafe: 1,
    yaw: 0,
    speed,
  });
  const { state } = simulate(world, initial, 120, {
    velocity,
    crouch: false,
  });
  const displacement = Math.hypot(
    state.position.x - initial.position.x,
    state.position.z - initial.position.z,
  );

  assert.ok(Math.abs(displacement - speed * 2) < 1e-8);
  assert.ok(
    Math.abs(
      Math.abs(state.position.x - initial.position.x) -
        Math.abs(state.position.z - initial.position.z),
    ) < 1e-8,
  );
});

test("continuous sweep cannot tunnel through a wall and settles at corners", () => {
  const world = createCapsuleCollisionWorld(createClosedMaze(1), { size: 1 });
  const initial = createCapsuleState(world, { x: 0, z: 0 });
  const impact = stepCapsuleController(world, initial, {
    velocity: { x: 800, z: 800 },
    deltaSeconds: FIXED_DELTA,
    crouch: false,
  });
  const limit =
    world.cellSize / 2 - world.wallThickness / 2 - world.radius;

  assert.equal(impact.collided, true);
  assert.ok(impact.collisionNormals.length >= 2);
  assert.ok(Math.abs(impact.state.position.x - limit) < 0.001);
  assert.ok(Math.abs(impact.state.position.z - limit) < 0.001);

  const settled = simulate(world, impact.state, 600, {
    velocity: { x: 5, z: 5 },
    crouch: false,
  }).state;
  assert.ok(Number.isFinite(settled.position.x));
  assert.ok(Number.isFinite(settled.position.z));
  assert.ok(Math.abs(settled.position.x - impact.state.position.x) < 0.001);
  assert.ok(Math.abs(settled.position.z - impact.state.position.z) < 0.001);
});

test("capsule slides along a closed wall instead of sticking", () => {
  const size = 3;
  const cells = createOpenMaze(size);
  // Seal the boundary between the center and eastern cell.
  cells[4].e = false;
  cells[5].w = false;
  const world = createCapsuleCollisionWorld(cells, { size });
  const initial = createCapsuleState(world, centerOf(size, 1, 1));
  const result = stepCapsuleController(world, initial, {
    velocity: { x: 20, z: -4 },
    deltaSeconds: 0.25,
    crouch: false,
  });

  const center = centerOf(size, 1, 1);
  const eastLimit =
    center.x +
    world.cellSize / 2 -
    world.wallThickness / 2 -
    world.radius;
  assert.equal(result.collided, true);
  assert.ok(result.state.position.x <= eastLimit + 0.001);
  assert.ok(result.state.position.z < initial.position.z - 0.9);
});

test("crouch changes capsule and eye height and blocks standing under clearance", () => {
  const size = 3;
  const lowCenter = centerOf(size, 1, 1);
  const world = createCapsuleCollisionWorld(createOpenMaze(size), {
    size,
    standingHeight: 1.82,
    crouchingHeight: 1.08,
    standingEyeHeight: 1.58,
    crouchingEyeHeight: 0.92,
    heightLimits: [
      {
        minX: lowCenter.x - 1,
        maxX: lowCenter.x + 1,
        minZ: lowCenter.z - 1,
        maxZ: lowCenter.z + 1,
        maxHeight: 1.08,
      },
    ],
  });
  const initial = createCapsuleState(world, lowCenter, true);
  const blocked = simulate(world, initial, 120, {
    velocity: { x: 0, z: 0 },
    crouch: false,
  }).lastResult;

  assert.equal(blocked.blockedStanding, true);
  assert.equal(blocked.state.crouching, true);
  assert.ok(Math.abs(blocked.state.height - world.crouchingHeight) < 1e-8);
  assert.ok(Math.abs(blocked.eyeHeight - world.crouchingEyeHeight) < 1e-8);

  const outside = createCapsuleState(world, centerOf(size, 0, 0), true);
  const standing = simulate(world, outside, 120, {
    velocity: { x: 0, z: 0 },
    crouch: false,
  }).lastResult;
  assert.equal(standing.blockedStanding, false);
  assert.equal(standing.state.crouching, false);
  assert.ok(Math.abs(standing.state.height - world.standingHeight) < 1e-8);
  assert.ok(Math.abs(standing.eyeHeight - world.standingEyeHeight) < 1e-8);
});

test("authoritative world bounds prevent leaving malformed open edges", () => {
  const size = 3;
  const malformed = Array.from({ length: size * size }, () => ({
    n: true,
    e: true,
    s: true,
    w: true,
  }));
  const world = createCapsuleCollisionWorld(malformed, { size });
  const directions = [
    { x: 500, z: 0 },
    { x: -500, z: 0 },
    { x: 0, z: 500 },
    { x: 0, z: -500 },
  ];

  for (const velocity of directions) {
    const initial = createCapsuleState(world, { x: 0, z: 0 });
    const result = stepCapsuleController(world, initial, {
      velocity,
      deltaSeconds: 1,
      crouch: false,
    });
    assert.ok(result.state.position.x >= world.bounds.minX - 1e-8);
    assert.ok(result.state.position.x <= world.bounds.maxX + 1e-8);
    assert.ok(result.state.position.z >= world.bounds.minZ - 1e-8);
    assert.ok(result.state.position.z <= world.bounds.maxZ + 1e-8);
    assert.equal(result.collided, true);
  }
});
