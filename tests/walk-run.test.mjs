import assert from "node:assert/strict";
import test from "node:test";
import {
  MAZE_SIZE,
  chooseSpreadCells,
  chooseTapeCells,
  createMaze,
  farthestCell,
  mazeDistances,
} from "../app/walk-exe/game-core.ts";
import {
  TAPES_TO_EXIT,
  WALK_TAPES,
  fearLevel,
  formatTimecode,
  rateRun,
} from "../app/walk-exe/run-report.ts";

test("the five tapes land on distinct, reachable cells away from used ones", () => {
  for (const seed of [220722, 1, 98765, 424242]) {
    const maze = createMaze(seed);
    const exit = farthestCell(maze, 0);
    const spread = chooseSpreadCells(maze, seed, 14);
    const used = [0, exit, ...spread];
    const cells = chooseTapeCells(maze, seed, used, WALK_TAPES.length);
    const distances = mazeDistances(maze, 0, MAZE_SIZE);
    assert.equal(cells.length, WALK_TAPES.length);
    assert.equal(new Set(cells).size, cells.length);
    for (const cell of cells) {
      assert.ok(!used.includes(cell), `tape on a used cell (${cell})`);
      assert.ok(distances[cell] >= 3, "tape too close to the start");
    }
  }
});

test("three tapes open the exit and the director grades every take", () => {
  assert.equal(TAPES_TO_EXIT, 3);
  assert.equal(rateRun({ escaped: true, tapes: 5, seconds: 500 }).grade, "S");
  assert.equal(rateRun({ escaped: true, tapes: 3, seconds: 120 }).grade, "A");
  assert.equal(rateRun({ escaped: true, tapes: 3, seconds: 400 }).grade, "B");
  assert.equal(rateRun({ escaped: false, tapes: 4, seconds: 60 }).grade, "C");
  assert.equal(rateRun({ escaped: false, tapes: 0, seconds: 60 }).grade, "D");
});

test("camcorder timecode and fear level stay bounded", () => {
  assert.equal(formatTimecode(0), "00:00:00:00");
  assert.equal(formatTimecode(1000), "00:00:01:00");
  assert.equal(formatTimecode(61_500), "00:01:01:12");
  assert.equal(formatTimecode(-5), "00:00:00:00");
  assert.equal(fearLevel(48), 0);
  assert.equal(fearLevel(400), 1);
  assert.ok(fearLevel(120) > 0.4 && fearLevel(120) < 0.6);
});
