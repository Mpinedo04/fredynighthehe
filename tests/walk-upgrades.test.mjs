import assert from "node:assert/strict";
import test from "node:test";
import { createMaze, mazeDistances } from "../app/walk-exe/game-core.ts";
import { selectActivePoolLights } from "../app/walk-exe/light-pool.ts";
import {
  arrowForRelativeDegrees,
  computeObjectiveReading,
} from "../app/walk-exe/objective-tracker.ts";
import {
  adaptiveEnemySpeed,
  isFlashlightDazzle,
  stepDetectionMeter,
  visualDetectionRange,
} from "../app/walk-exe/perception.ts";
import { rateRun, resolveEndingKind, WALK_TAPES } from "../app/walk-exe/run-report.ts";
import {
  STUDIO_BIOME_ATMOSPHERE,
  STUDIO_BIOME_IDS,
  STUDIO_GRID_SIZE,
  buildStudioLayout,
} from "../app/walk-exe/studio-layout.ts";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  FINAL_TAKE,
  nextClapperTake,
} from "../app/prank-system.mjs";

test("corridor objective tracker guides to nearest tape first, then emergency exit", () => {
  const maze = createMaze(220722);
  const readingTape = computeObjectiveReading({
    maze,
    playerCell: 0,
    playerX: 0,
    playerZ: 0,
    playerYaw: 0,
    tapes: [
      { cell: 1, code: "P01", title: "EL PAN TA’ DURO", collected: false },
      { cell: 120, code: "P02", title: "WTF EL DOCUMENTAL", collected: false },
    ],
    tapesHeld: 0,
    requiredTapes: 3,
    exitCell: 288,
  });
  assert.equal(readingTape.kind, "tape");
  assert.equal(readingTape.code, "P01");
  assert.ok(readingTape.meters >= 1);

  const readingExit = computeObjectiveReading({
    maze,
    playerCell: 0,
    playerX: 0,
    playerZ: 0,
    playerYaw: 0,
    tapes: [
      { cell: 1, code: "P01", title: "EL PAN TA’ DURO", collected: true },
      { cell: 120, code: "P02", title: "WTF EL DOCUMENTAL", collected: false },
    ],
    tapesHeld: 3,
    requiredTapes: 3,
    exitCell: 288,
  });
  assert.equal(readingExit.kind, "exit");
  assert.equal(readingExit.code, "SALIDA");
  assert.equal(arrowForRelativeDegrees(0), "↑");
  assert.equal(arrowForRelativeDegrees(90), "→");
  assert.equal(arrowForRelativeDegrees(-90), "←");
  assert.equal(arrowForRelativeDegrees(180), "↓");
});

test("stealth perception rewards turning off flashlight and crouching, and dazzle stuns face-on", () => {
  const litStanding = visualDetectionRange(true, false, "estreno");
  const darkCrouch = visualDetectionRange(false, true, "estreno");
  assert.ok(litStanding > darkCrouch * 3);

  const hidden = stepDetectionMeter({
    current: 0,
    lineOfSight: true,
    distance: 10,
    flashlightOn: false,
    crouching: true,
    deltaSeconds: 0.2,
  });
  assert.equal(hidden.spotted, false);
  assert.equal(hidden.meter, 0);

  const pointBlank = stepDetectionMeter({
    current: 0,
    lineOfSight: true,
    distance: 2.5,
    flashlightOn: false,
    crouching: true,
    deltaSeconds: 0.05,
  });
  assert.equal(pointBlank.spotted, true);
  assert.equal(pointBlank.meter, 1);

  assert.equal(
    isFlashlightDazzle({
      playerX: 0,
      playerZ: 0,
      playerYaw: 0,
      enemyX: 0,
      enemyZ: -6,
      distance: 6,
      flashlightOn: true,
      lineOfSight: true,
    }),
    true,
  );
  assert.equal(
    isFlashlightDazzle({
      playerX: 0,
      playerZ: 0,
      playerYaw: Math.PI,
      enemyX: 0,
      enemyZ: -6,
      distance: 6,
      flashlightOn: true,
      lineOfSight: true,
    }),
    false,
  );

  assert.ok(adaptiveEnemySpeed(1.5, 4, "estreno") > adaptiveEnemySpeed(1.5, 0, "estreno"));
  assert.ok(adaptiveEnemySpeed(1.5, 2, "pesadilla") > adaptiveEnemySpeed(1.5, 2, "estreno"));
});

test("every achievement belongs to a known category and clapper montage lands on 22", () => {
  const catIds = new Set(ACHIEVEMENT_CATEGORIES.map((c) => c.id));
  for (const achievement of ACHIEVEMENTS) {
    assert.ok(catIds.has(achievement.category), `unknown category on ${achievement.id}`);
  }
  let take = 1;
  let steps = 0;
  while (take < FINAL_TAKE && steps < 20) {
    take = nextClapperTake(take);
    steps += 1;
  }
  assert.equal(take, FINAL_TAKE);
  assert.ok(steps <= 7, `expected snappy clapper sequence, got ${steps} steps`);
});

test("buildStudioLayout generates valid, reachable 13x13 studio wings, tapes, eggs and exit across 200 seeds", () => {
  for (let i = 0; i < 200; i += 1) {
    const seed = 220001 + i * 97;
    const maze = createMaze(seed, STUDIO_GRID_SIZE);
    const layout = buildStudioLayout(maze, seed, STUDIO_GRID_SIZE);
    const dist = mazeDistances(maze, layout.boothCell, STUDIO_GRID_SIZE);

    assert.equal(layout.size, 13);
    assert.equal(layout.boothCell, 0);
    assert.equal(layout.tapeCells.length, 5);
    assert.equal(layout.eggPlacements.length, 5);
    assert.equal(layout.echoCells.length, 4);
    assert.equal(layout.ventPairs.length, 2);
    assert.equal(layout.cctvCells.length, 6);

    const wingCells = [
      layout.wingCenters.neverland,
      layout.wingCenters.crypt,
      layout.wingCenters.acoustic,
      layout.wingCenters.fazbear,
      layout.wingCenters.archive,
    ];
    const uniqueKeyCells = new Set([
      layout.boothCell,
      layout.exitCell,
      layout.enemyStartCell,
      ...wingCells,
      ...layout.tapeCells,
    ]);
    assert.equal(
      uniqueKeyCells.size,
      13,
      `seed ${seed} had colliding booth/exit/enemy/wing/tape cells`,
    );

    for (const cell of uniqueKeyCells) {
      assert.ok(cell >= 0 && cell < STUDIO_GRID_SIZE * STUDIO_GRID_SIZE);
      assert.ok(dist[cell] >= 0, `cell ${cell} unreachable on seed ${seed}`);
    }

    for (const egg of layout.eggPlacements) {
      assert.equal(egg.cell, layout.wingCenters[egg.wing]);
    }

    // Verify full 13x13 Voronoi biome partitioning: every cell has a real biome (zero plain corridors)
    const biomeCounts = new Map(STUDIO_BIOME_IDS.map((b) => [b, 0]));
    for (const w of layout.cellWings) {
      assert.notEqual(w, "corridor", `seed ${seed} left unstyled corridor cells`);
      assert.ok(STUDIO_BIOME_ATMOSPHERE[w], `missing atmosphere palette for ${w}`);
      biomeCounts.set(w, (biomeCounts.get(w) ?? 0) + 1);
    }
    for (const biomeId of STUDIO_BIOME_IDS) {
      assert.ok((biomeCounts.get(biomeId) ?? 0) >= 1, `seed ${seed} missing biome ${biomeId}`);
    }
  }
});

test("light-pool caps active dynamic lights strictly at <= 3 and sorts by distance/priority", () => {
  const sources = Array.from({ length: 30 }, (_, index) => ({
    id: `light-${index}`,
    x: index * 2,
    y: 2,
    z: 0,
    color: 0xffaa44,
    intensity: 14,
    distance: 10,
    priority: 1,
    active: true,
  }));
  sources.push({
    id: "inactive-zero",
    x: 0,
    y: 2,
    z: 0,
    color: 0xffffff,
    intensity: 20,
    distance: 10,
    priority: 5,
    active: false,
  });
  sources.push({
    id: "vip-priority",
    x: 5,
    y: 2,
    z: 0,
    color: 0x35ff7a,
    intensity: 24,
    distance: 12,
    priority: 10,
    active: true,
  });

  const selected = selectActivePoolLights(sources, 0, 0, 3, 24);
  assert.equal(selected.length, 3);
  assert.ok(!selected.some((l) => l.id === "inactive-zero"));
  assert.equal(selected[0].id, "light-0");
  assert.equal(selected[1].id, "vip-priority");
  assert.equal(selected[2].id, "light-1");
});

test("turista mode disables detection and redAlert accelerates Subject M-22", () => {
  const touristStep = stepDetectionMeter({
    current: 0.7,
    lineOfSight: true,
    distance: 2.0,
    flashlightOn: true,
    crouching: false,
    deltaSeconds: 0.1,
    difficulty: "turista",
  });
  assert.equal(touristStep.meter, 0);
  assert.equal(touristStep.spotted, false);
  assert.ok(adaptiveEnemySpeed(1.8, 3, "turista") < adaptiveEnemySpeed(1.8, 0, "estreno"));
  assert.ok(
    adaptiveEnemySpeed(1.8, 3, "estreno", true) > adaptiveEnemySpeed(1.8, 3, "estreno", false),
  );
});

test("endings distinguish Survival Cut and Secret Director's Cut (S+ / S)", () => {
  assert.equal(
    resolveEndingKind({ escaped: true, tapes: 3, eggsFound: 1, ghostRelic: false }),
    "survival",
  );
  assert.equal(
    resolveEndingKind({ escaped: true, tapes: WALK_TAPES.length, eggsFound: 0 }),
    "collectors-cut",
  );
  assert.equal(
    resolveEndingKind({ escaped: true, tapes: 3, eggsFound: 3, ghostRelic: true }),
    "collectors-cut",
  );

  const sPlus = rateRun({
    escaped: true,
    tapes: WALK_TAPES.length,
    seconds: 185,
    eggsFound: 4,
    ghostRelic: true,
  });
  assert.equal(sPlus.grade, "S+");
  assert.equal(sPlus.ending, "collectors-cut");

  const ritual = rateRun({
    escaped: true,
    tapes: 3,
    seconds: 260,
    eggsFound: 3,
    ghostRelic: true,
  });
  assert.equal(ritual.grade, "S");
  assert.equal(ritual.ending, "collectors-cut");

  const survival = rateRun({
    escaped: true,
    tapes: 3,
    seconds: 190,
    eggsFound: 1,
    ghostRelic: false,
  });
  assert.equal(survival.grade, "A");
  assert.equal(survival.ending, "survival");
});
