import assert from "node:assert/strict";
import test from "node:test";
import {
  CELL_SIZE,
  MAZE_SIZE,
  PLAYER_RADIUS,
  WALL_THICKNESS,
  chooseSpreadCells,
  corridorLineOfSight,
  createAcousticEvent,
  createMaze,
  decideEnemyState,
  extrapolateAcousticTrailCell,
  farthestCell,
  mazeDistances,
  mazePath,
  openingDirection,
  selectAcousticTarget,
  resolveGridMovement,
  uniqueReachableCells,
  validateMaze,
} from "../app/walk-exe/game-core.ts";

test("1,000 procedural seeds are deterministic, bounded and connected", () => {
  for (let seed = 0; seed < 1000; seed += 1) {
    const first = createMaze(seed);
    const second = createMaze(seed);
    assert.deepEqual(first, second, `seed ${seed} is not deterministic`);

    const validation = validateMaze(first);
    assert.equal(
      validation.valid,
      true,
      `seed ${seed}: ${validation.issues.join(", ")}`,
    );
    assert.equal(validation.reachable, MAZE_SIZE * MAZE_SIZE);

    const exit = farthestCell(first, 0);
    assert.notEqual(exit, 0, `seed ${seed} exit equals start`);
    assert.ok(mazePath(first, 0, exit).length > MAZE_SIZE);

    const opening = openingDirection(first[0]);
    assert.ok(opening.x !== 0 || opening.z !== 0);
    const landmarks = uniqueReachableCells(
      first,
      [0, exit, ...chooseSpreadCells(first, seed, 14)],
      6,
    );
    assert.equal(landmarks.length, 6);
    assert.equal(new Set(landmarks).size, landmarks.length);
    const distances = mazeDistances(first, 0);
    landmarks.forEach((cell) => assert.ok(distances[cell] >= 0));
  }
});

test("grid controller produces continuous held movement and preserves taps", () => {
  const size = 8;
  const cells = Array.from({ length: size * size }, (_, index) => ({
    n: false,
    e: index % size < size - 1,
    s: false,
    w: index % size > 0,
  }));
  const half = (size * CELL_SIZE) / 2;
  const corridorZ = -half + CELL_SIZE / 2 + 4 * CELL_SIZE;
  let position = { x: -half + CELL_SIZE / 2, z: corridorZ };

  for (let tick = 0; tick < 600; tick += 1) {
    position = resolveGridMovement(
      cells,
      position,
      { x: 2.75 / 60, z: 0 },
      size,
    );
  }
  assert.ok(
    Math.abs(position.x - (-half + CELL_SIZE / 2 + 27.5)) < 0.03,
    `held W equivalent moved to ${position.x}`,
  );

  const tapStart = { x: -half + CELL_SIZE / 2, z: corridorZ };
  const tap = resolveGridMovement(
    cells,
    tapStart,
    { x: 2.75 / 60, z: 0 },
    size,
  );
  assert.ok(tap.moved > 0.04);
});

test("fixed 60 Hz movement is identical under 30, 60 and 144 Hz rendering", () => {
  const size = 16;
  const cells = Array.from({ length: size * size }, (_, index) => ({
    n: false,
    e: index % size < size - 1,
    s: false,
    w: index % size > 0,
  }));
  const half = (size * CELL_SIZE) / 2;
  const start = {
    x: -half + CELL_SIZE / 2,
    z: -half + CELL_SIZE / 2 + 8 * CELL_SIZE,
  };
  const simulate = (renderHz, speed) => {
    let position = { ...start };
    let accumulator = 0;
    const frameDelta = 1 / renderHz;
    for (let frame = 0; frame < renderHz * 10; frame += 1) {
      accumulator += frameDelta;
      while (accumulator + 1e-9 >= 1 / 60) {
        position = resolveGridMovement(
          cells,
          position,
          { x: speed / 60, z: 0 },
          size,
        );
        accumulator -= 1 / 60;
      }
    }
    return position.x;
  };
  const walking = [30, 60, 144].map((hz) => simulate(hz, 2.75));
  const sprinting = [30, 60, 144].map((hz) => simulate(hz, 4.35));
  walking.forEach((value) => assert.ok(Math.abs(value - walking[0]) < 1e-6));
  sprinting.forEach((value) =>
    assert.ok(Math.abs(value - sprinting[0]) < 1e-6),
  );
  assert.ok(Math.abs(walking[0] - (start.x + 27.5)) < 0.03);
  assert.ok(Math.abs(sprinting[0] - (start.x + 43.5)) < 0.03);
});

test("grid controller blocks closed walls and world boundaries", () => {
  const closed = [{ n: false, e: false, s: false, w: false }];
  const start = { x: 0, z: 0 };
  const moved = resolveGridMovement(
    closed,
    start,
    { x: 100, z: -100 },
    1,
  );
  const expectedLimit =
    CELL_SIZE / 2 - PLAYER_RADIUS - WALL_THICKNESS / 2;
  assert.ok(Math.abs(moved.x - expectedLimit) < 0.0001);
  assert.ok(Math.abs(moved.z + expectedLimit) < 0.0001);
});

test("corridor line of sight requires a straight reciprocal route", () => {
  const cells = createMaze(220722);
  assert.equal(corridorLineOfSight(cells, 0, 0), true);
  const direct = mazePath(cells, 0, farthestCell(cells, 0))[1];
  assert.equal(corridorLineOfSight(cells, 0, direct), true);
  const diagonal = MAZE_SIZE + 1;
  assert.equal(corridorLineOfSight(cells, 0, diagonal), false);
});

test("enemy state machine responds to sight, sound, vents, lures and CCTV", () => {
  const base = {
    distanceCells: 12,
    hasLure: false,
    heardNoise: false,
    noiseAgeMs: 99999,
    playerInVent: false,
    lastSeenAgeMs: 99999,
    cctvExposureMs: 0,
    lineOfSight: false,
  };
  assert.equal(decideEnemyState(base), "patrol");
  assert.equal(decideEnemyState({ ...base, hasLure: true }), "lure");
  assert.equal(
    decideEnemyState({ ...base, lineOfSight: true }),
    "chase",
  );
  assert.equal(
    decideEnemyState({
      ...base,
      playerInVent: true,
      distanceCells: 4,
    }),
    "vent-watch",
  );
  assert.equal(
    decideEnemyState({
      ...base,
      playerInVent: true,
      distanceCells: 2,
    }),
    "ambush",
  );
  assert.equal(
    decideEnemyState({
      ...base,
      heardNoise: true,
      noiseAgeMs: 400,
      distanceCells: 6,
    }),
    "investigate",
  );
  assert.equal(
    decideEnemyState({
      ...base,
      heardNoise: true,
      noiseAgeMs: 400,
      distanceCells: 10,
    }),
    "listen",
  );
  assert.equal(
    decideEnemyState({
      ...base,
      cctvExposureMs: 7000,
      distanceCells: 8,
    }),
    "investigate",
  );
  assert.equal(
    decideEnemyState({ ...base, lastSeenAgeMs: 2000 }),
    "search",
  );
  assert.equal(
    decideEnemyState({ ...base, lastSeenAgeMs: 6000 }),
    "recover",
  );
  assert.equal(
    decideEnemyState({
      ...base,
      currentState: "chase",
      lastSeenAgeMs: 2400,
    }),
    "chase",
  );
  assert.equal(
    decideEnemyState({
      ...base,
      heardNoise: true,
      noiseAgeMs: 350,
      noiseDistanceCells: 14,
      noiseConfidence: 0.92,
    }),
    "investigate",
  );
  assert.equal(
    decideEnemyState({
      ...base,
      heardNoise: true,
      noiseAgeMs: 350,
      noiseDistanceCells: 14,
      noiseConfidence: 0.3,
    }),
    "listen",
  );
});

test("sprinting is audible across the maze while crouching remains local", () => {
  const now = 10_000;
  const sprint = createAcousticEvent("sprint-step", 22, now - 180);
  const walk = createAcousticEvent("walk-step", 22, now - 180);
  const crouch = createAcousticEvent("crouch-step", 22, now - 180);

  assert.equal(
    selectAcousticTarget(
      [{ ...sprint, routeDistanceCells: 15 }],
      now,
    )?.event.kind,
    "sprint-step",
  );
  assert.equal(
    selectAcousticTarget([{ ...walk, routeDistanceCells: 15 }], now),
    null,
  );
  assert.equal(
    selectAcousticTarget([{ ...crouch, routeDistanceCells: 4 }], now),
    null,
  );
  assert.equal(
    selectAcousticTarget(
      [{ ...sprint, routeDistanceCells: 8 }],
      now + sprint.memoryMs + 1,
    ),
    null,
  );
});

test("the hearing model prioritizes loud footfalls and predicts a straight sprint", () => {
  const now = 20_000;
  const sprint = createAcousticEvent("sprint-step", 12, now - 220);
  const crouch = createAcousticEvent("crouch-step", 4, now - 40);
  const perception = selectAcousticTarget(
    [
      { ...crouch, routeDistanceCells: 1 },
      { ...sprint, routeDistanceCells: 10 },
    ],
    now,
  );
  assert.equal(perception?.event.kind, "sprint-step");

  const maze = createMaze(220722);
  let prediction = null;
  for (let previous = 0; previous < maze.length && prediction === null; previous += 1) {
    const candidates = [
      ["n", previous - MAZE_SIZE],
      ["e", previous + 1],
      ["s", previous + MAZE_SIZE],
      ["w", previous - 1],
    ];
    for (const [direction, current] of candidates) {
      if (!maze[previous]?.[direction] || !maze[current]?.[direction]) continue;
      const expected =
        current + (current - previous);
      if (expected < 0 || expected >= maze.length) continue;
      prediction = { previous, current, expected };
      break;
    }
  }
  assert.ok(prediction, "expected at least one straight two-cell passage");
  assert.equal(
    extrapolateAcousticTrailCell(
      maze,
      prediction.previous,
      prediction.current,
    ),
    prediction.expected,
  );
});
