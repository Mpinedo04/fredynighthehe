import assert from "node:assert/strict";
import test from "node:test";
import { createMaze } from "../app/walk-exe/game-core.ts";
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
