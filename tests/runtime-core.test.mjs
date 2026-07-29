import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceVentTraversal,
  drainCctvBattery,
  sequenceProgress,
} from "../app/walk-exe/runtime-core.ts";

test("vent traversal only advances while W/S input is held and can reverse", () => {
  let distance = 0;
  for (let tick = 0; tick < 300; tick += 1) {
    distance = advanceVentTraversal(distance, 20, 1, 1 / 60).distance;
  }
  assert.ok(Math.abs(distance - 8.6) < 1e-8);

  const idle = advanceVentTraversal(distance, 20, 0, 5);
  assert.equal(idle.distance, distance);
  assert.equal(idle.moved, 0);

  for (let tick = 0; tick < 120; tick += 1) {
    distance = advanceVentTraversal(distance, 20, -1, 1 / 60).distance;
  }
  assert.ok(Math.abs(distance - 5.16) < 1e-8);
});

test("vent traversal clamps both exits and reports terminal direction", () => {
  const destination = advanceVentTraversal(9.8, 10, 1, 1);
  assert.equal(destination.distance, 10);
  assert.equal(destination.atDestination, true);
  assert.equal(destination.progress, 1);

  const source = advanceVentTraversal(0.2, 10, -1, 1);
  assert.equal(source.distance, 0);
  assert.equal(source.atSource, true);
});

test("CCTV battery drains only while open and clamps exactly at zero", () => {
  assert.deepEqual(drainCctvBattery(96, false, 120), {
    power: 96,
    depleted: false,
  });
  assert.deepEqual(drainCctvBattery(96, true, 95), {
    power: 1,
    depleted: false,
  });
  assert.deepEqual(drainCctvBattery(1, true, 1), {
    power: 0,
    depleted: true,
  });
  assert.deepEqual(drainCctvBattery(0, true, 10), {
    power: 0,
    depleted: true,
  });
});

test("timed sequences are bounded, monotonic and complete exactly once", () => {
  const before = sequenceProgress(900, 1000, 800);
  const middle = sequenceProgress(1400, 1000, 800);
  const end = sequenceProgress(1800, 1000, 800);
  const after = sequenceProgress(9000, 1000, 800);

  assert.deepEqual(before, { progress: 0, smooth: 0, done: false });
  assert.equal(middle.progress, 0.5);
  assert.equal(middle.smooth, 0.5);
  assert.deepEqual(end, { progress: 1, smooth: 1, done: true });
  assert.deepEqual(after, end);
});
