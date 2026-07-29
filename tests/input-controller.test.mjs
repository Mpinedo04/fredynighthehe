import assert from "node:assert/strict";
import test from "node:test";
import {
  WalkInputController,
  walkInputActionForCode,
} from "../app/walk-exe/input-controller.ts";
import { advanceVentTraversal } from "../app/walk-exe/runtime-core.ts";

const FIXED_MS = 1000 / 60;

function integratedAxis(slices, axis) {
  return slices.reduce(
    (total, slice) => total + slice[axis] * slice.durationSeconds,
    0,
  );
}

test("held W is continuous for ten seconds and stops on release", () => {
  const input = new WalkInputController();
  input.press("forward", "keyboard:KeyW", 0);
  let forwardSeconds = 0;

  for (let tick = 0; tick < 600; tick += 1) {
    const start = tick * FIXED_MS;
    forwardSeconds += integratedAxis(
      input.consumeWindow(start, start + FIXED_MS),
      "forward",
    );
  }
  assert.ok(Math.abs(forwardSeconds - 10) < 1e-9);

  input.release("forward", "keyboard:KeyW", 10_000);
  for (let tick = 600; tick < 720; tick += 1) {
    const start = tick * FIXED_MS;
    const slices = input.consumeWindow(start, start + FIXED_MS);
    assert.equal(integratedAxis(slices, "forward"), 0);
    assert.equal(input.getSnapshot().sampled.forward, 0);
  }
});

test("3–10 ms taps preserve only their real duration without a release tail", () => {
  for (const tapDuration of [3, 10]) {
    const input = new WalkInputController();
    input.press("forward", "keyboard:KeyW", 5);
    input.release("forward", "keyboard:KeyW", 5 + tapDuration);
    const first = input.consumeWindow(0, FIXED_MS);
    assert.ok(
      Math.abs(integratedAxis(first, "forward") - tapDuration / 1000) < 1e-9,
    );

    for (let tick = 1; tick <= 120; tick += 1) {
      const start = tick * FIXED_MS;
      assert.equal(
        integratedAxis(
          input.consumeWindow(start, start + FIXED_MS),
          "forward",
        ),
        0,
      );
    }
  }
});

test("opposing directions cancel while diagonals retain both normalized axes", () => {
  const input = new WalkInputController();
  input.press("forward", "keyboard:KeyW", 0);
  input.press("backward", "keyboard:KeyS", 0);
  input.press("left", "keyboard:KeyA", 0);
  input.press("right", "keyboard:KeyD", 0);
  input.consumeWindow(0, FIXED_MS);
  assert.equal(input.getSnapshot().sampled.forward, 0);
  assert.equal(input.getSnapshot().sampled.strafe, 0);

  input.release("backward", "keyboard:KeyS", FIXED_MS);
  input.release("left", "keyboard:KeyA", FIXED_MS);
  input.consumeWindow(FIXED_MS, FIXED_MS * 2);
  assert.equal(input.getSnapshot().sampled.forward, 1);
  assert.equal(input.getSnapshot().sampled.strafe, 1);
});

test("keyboard and touch sources cannot release each other", () => {
  const input = new WalkInputController();
  input.press("forward", "keyboard:KeyW", 0);
  input.press("forward", "touch:41", 1);
  input.release("forward", "touch:41", 2);
  input.consumeWindow(0, FIXED_MS);
  assert.equal(input.getSnapshot().sampled.forward, 1);

  input.release("forward", "keyboard:KeyW", FIXED_MS);
  input.consumeWindow(FIXED_MS, FIXED_MS * 2);
  assert.equal(input.getSnapshot().sampled.forward, 0);
});

test("repeated presses are idempotent and reset clears every source", () => {
  const input = new WalkInputController();
  assert.equal(input.press("forward", "keyboard:KeyW", 0), true);
  assert.equal(input.press("forward", "keyboard:KeyW", 4), false);
  input.press("sprint", "keyboard:ShiftLeft", 5);
  input.press("crouch", "touch:12", 6);
  assert.equal(input.getSnapshot().pendingTransitions, 3);

  input.reset(8);
  input.consumeWindow(0, FIXED_MS);
  const snapshot = input.getSnapshot();
  assert.equal(snapshot.sampled.forward, 0);
  assert.equal(snapshot.sampled.sprint, false);
  assert.equal(snapshot.sampled.crouch, false);
  assert.deepEqual(snapshot.activeSources, []);
});

test("code aliases map to shared actions", () => {
  assert.equal(walkInputActionForCode("KeyW"), "forward");
  assert.equal(walkInputActionForCode("ArrowUp"), "forward");
  assert.equal(walkInputActionForCode("ShiftRight"), "sprint");
  assert.equal(walkInputActionForCode("ControlLeft"), "crouch");
  assert.equal(walkInputActionForCode("Tab"), null);
});

test("input integration is identical under 30, 60 and 144 Hz rendering", () => {
  const simulate = (renderHz) => {
    const input = new WalkInputController();
    input.press("forward", "keyboard:KeyW", 0);
    input.press("right", "keyboard:KeyD", 1250);
    input.release("right", "keyboard:KeyD", 2750);
    input.release("forward", "keyboard:KeyW", 5000);

    let accumulator = 0;
    let simulationMs = 0;
    let forwardSeconds = 0;
    let strafeSeconds = 0;
    const frameSeconds = 1 / renderHz;
    for (let frame = 0; frame < renderHz * 6; frame += 1) {
      accumulator += frameSeconds;
      while (accumulator + 1e-10 >= 1 / 60) {
        const slices = input.consumeWindow(
          simulationMs,
          simulationMs + FIXED_MS,
        );
        forwardSeconds += integratedAxis(slices, "forward");
        strafeSeconds += integratedAxis(slices, "strafe");
        simulationMs += FIXED_MS;
        accumulator -= 1 / 60;
      }
    }
    return { forwardSeconds, strafeSeconds };
  };

  const results = [30, 60, 144].map(simulate);
  for (const result of results) {
    assert.ok(Math.abs(result.forwardSeconds - 5) < 1e-8);
    assert.ok(Math.abs(result.strafeSeconds - 1.5) < 1e-8);
  }
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
});

test("vent traversal consumes input duration and remains still after keyup", () => {
  const input = new WalkInputController();
  input.press("forward", "keyboard:KeyW", 10);
  input.release("forward", "keyboard:KeyW", 110);
  let distance = 0;

  const first = input.consumeWindow(0, 200);
  for (const slice of first) {
    distance = advanceVentTraversal(
      distance,
      8,
      slice.forward,
      slice.durationSeconds,
    ).distance;
  }
  assert.ok(Math.abs(distance - 0.172) < 1e-9);

  for (let tick = 0; tick < 120; tick += 1) {
    const start = 200 + tick * FIXED_MS;
    for (const slice of input.consumeWindow(start, start + FIXED_MS)) {
      distance = advanceVentTraversal(
        distance,
        8,
        slice.forward,
        slice.durationSeconds,
      ).distance;
    }
  }
  assert.ok(Math.abs(distance - 0.172) < 1e-9);
});
