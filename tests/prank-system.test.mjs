import assert from "node:assert/strict";
import test from "node:test";
import {
  ACHIEVEMENTS,
  CLOSE_ENCOUNTERS_STEPS,
  FINAL_TAKE,
  birthdayMelody,
  createAchievementState,
  dayKey,
  detectClap,
  heePlaybackRate,
  isNewVisitDay,
  isRealNight,
  matchCloseEncounters,
  matchDirectorCommand,
  matchSecretWord,
  nextPower,
  nightClock,
  parseAchievementState,
  parseHeeCount,
  takeReason,
  unlockAchievement,
} from "../app/prank-system.mjs";

test("the hee-hee climbs from natural pitch to chipmunk at the bottom", () => {
  assert.equal(heePlaybackRate(0, 2), 0.96);
  assert.ok(heePlaybackRate(0.5, 2) > 1.3);
  assert.equal(heePlaybackRate(1, 2), 2.1);
  assert.ok(heePlaybackRate(1) > heePlaybackRate(0.9));
  assert.equal(heePlaybackRate(-4), heePlaybackRate(0));
  assert.equal(heePlaybackRate(7), heePlaybackRate(1));
});

test("the clapper demands exactly twenty-one false takes", () => {
  assert.equal(FINAL_TAKE, 22);
  assert.equal(takeReason(1), "FUERA DE FOCO");
  assert.equal(takeReason(5), "FREDDY HA SALIDO EN PLANO");
  assert.ok(takeReason(21));
  assert.equal(takeReason(22), null);
  assert.equal(takeReason(0), null);
});

test("the night clock runs from 12 AM to 6 AM and power drains to zero", () => {
  assert.deepEqual(nightClock(0), { hour: 0, label: "12 AM", survived: false });
  assert.equal(nightClock(250_000).label, "2 AM");
  assert.deepEqual(nightClock(9_999_999), { hour: 6, label: "6 AM", survived: true });
  assert.equal(nextPower(100, 54_000, 540_000), 90);
  assert.equal(nextPower(5, 0, 540_000, 10), 0);
  assert.equal(nextPower(100, -50), 100);
});

test("real night and returning visits are detected from local dates", () => {
  assert.equal(isRealNight(new Date(2026, 9, 3, 2, 14)), true);
  assert.equal(isRealNight(new Date(2026, 9, 3, 6, 0)), false);
  assert.equal(dayKey(new Date(2026, 0, 5, 12)), "2026-01-05");
  assert.equal(isNewVisitDay(null, "2026-10-03"), false);
  assert.equal(isNewVisitDay("2026-10-03", "2026-10-03"), false);
  assert.equal(isNewVisitDay("2026-10-02", "2026-10-03"), true);
});

test("secret words match the end of the typed buffer", () => {
  assert.equal(matchSecretWord("xxHeHe"), "hehe");
  assert.equal(matchSecretWord("hola annie"), "annie");
  assert.equal(matchSecretWord("freddy"), "freddy");
  assert.equal(matchSecretWord("toma 22"), "22");
  assert.equal(matchSecretWord("hehe "), null);
});

test("Close Encounters accepts the five notes with quarter-tone slack", () => {
  const exact = CLOSE_ENCOUNTERS_STEPS.map((step, index) => ({ step, at: index * 500 }));
  assert.equal(matchCloseEncounters(exact), true);
  const sloppy = [11, 13, 6, 7, 44].map((step, index) => ({ step, at: index * 500 }));
  assert.equal(matchCloseEncounters(sloppy), true);
  const slow = CLOSE_ENCOUNTERS_STEPS.map((step, index) => ({ step, at: index * 3000 }));
  assert.equal(matchCloseEncounters(slow), false);
  const wrong = [10, 14, 6, 8, 20].map((step, index) => ({ step, at: index * 500 }));
  assert.equal(matchCloseEncounters(wrong), false);
  assert.equal(matchCloseEncounters(exact.slice(1)), false);
});

test("director commands understand corten and acción, last one wins", () => {
  assert.equal(matchDirectorCommand("¡CORTEN!"), "cut");
  assert.equal(matchDirectorCommand("corta ya"), "cut");
  assert.equal(matchDirectorCommand("Acción"), "action");
  assert.equal(matchDirectorCommand("corten... no, acción"), "action");
  assert.equal(matchDirectorCommand("hola cortina"), null);
});

test("claps need a sharp loud transient and a refractory gap", () => {
  const clap = { peak: 0.8, rms: 0.2, floor: 0.02, sinceLastMs: 2000 };
  assert.equal(detectClap(clap), true);
  assert.equal(detectClap({ ...clap, sinceLastMs: 300 }), false);
  assert.equal(detectClap({ ...clap, peak: 0.3 }), false);
  assert.equal(detectClap({ ...clap, floor: 0.1 }), false);
});

test("the 24 TET birthday song has 25 notes and some are out of tune", () => {
  const melody = birthdayMelody();
  assert.equal(melody.length, 25);
  assert.ok(melody.some((note) => note.detune !== 0));
  assert.equal(melody[0].frequency, 392);
  assert.ok(melody.every((note) => note.beats > 0 && note.frequency > 200));
});

test("achievements are versioned, unique and sanitized", () => {
  assert.equal(new Set(ACHIEVEMENTS.map((item) => item.id)).size, ACHIEVEMENTS.length);
  assert.deepEqual(parseAchievementState("nope"), createAchievementState());
  const parsed = parseAchievementState(
    JSON.stringify({ version: 1, unlocked: ["pan", "pan", "fake"] }),
  );
  assert.deepEqual(parsed.unlocked, ["pan"]);
  const first = unlockAchievement(parsed, "take22");
  assert.equal(first.isNew, true);
  const again = unlockAchievement(first.state, "take22");
  assert.equal(again.isNew, false);
  assert.deepEqual(again.state.unlocked, ["pan", "take22"]);
  assert.equal(parseHeeCount("347"), 347);
  assert.equal(parseHeeCount("-3"), 0);
  assert.equal(parseHeeCount(null), 0);
});

test("the computer keyboard plays all 24 microtonal steps", async () => {
  const { MICRO_KEYS, microKeyStep } = await import("../app/prank-system.mjs");
  assert.equal(MICRO_KEYS.length, 24);
  assert.equal(new Set(MICRO_KEYS).size, 24);
  assert.equal(microKeyStep("1"), 0);
  assert.equal(microKeyStep("Q"), 10);
  assert.equal(microKeyStep("f"), 23);
  assert.equal(microKeyStep("z"), -1);
  assert.equal(microKeyStep("Enter"), -1);
});

test("every scene in the topbar film strip has a section with that id", async () => {
  const { readFile, readdir } = await import("node:fs/promises");
  const content = await readFile(new URL("../app/content.ts", import.meta.url), "utf8");
  const block = content.slice(content.indexOf("export const scenes"), content.indexOf("] as const;", content.indexOf("export const scenes")));
  const ids = [...block.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 9);
  const dir = new URL("../app/sections/", import.meta.url);
  const sources = await Promise.all(
    (await readdir(dir)).filter((file) => file.endsWith(".tsx")).map((file) => readFile(new URL(file, dir), "utf8")),
  );
  const all = sources.join("\n");
  for (const id of ids) {
    assert.match(all, new RegExp(`id="${id}"`), `missing section #${id}`);
  }
});
