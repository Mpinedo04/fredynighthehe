import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decideCctvEncounter } from "../app/walk-exe/scare-roster.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MASCOTS = ["ursus-9", "velvet-r", "avis-3", "vulpes-x"];

test("CCTV encounters stay occasional, respect cooldown and cannot disappear forever", () => {
  const safeOpening = decideCctvEncounter(
    220722,
    0,
    1,
    99,
    Number.POSITIVE_INFINITY,
  );
  assert.equal(safeOpening.trigger, false);

  let quietVisits = 0;
  const decisions = [];
  for (let visit = 2; visit <= 8; visit += 1) {
    const decision = decideCctvEncounter(
      220722,
      visit % 6,
      visit,
      quietVisits,
      Number.POSITIVE_INFINITY,
    );
    decisions.push(decision.trigger);
    if (decision.trigger) break;
    quietVisits += 1;
  }
  assert.ok(decisions.includes(false), "the camera network should include empty feeds");
  assert.equal(
    decisions.at(-1),
    true,
    "a fifth quiet camera must force an encounter",
  );

  const cooldown = decideCctvEncounter(220722, 2, 9, 99, 7_499, true);
  assert.equal(cooldown.trigger, false);
  const afterCooldown = decideCctvEncounter(220722, 2, 10, 4, 7_500);
  assert.equal(afterCooldown.trigger, true);
});

test("the corrupt mascot network ships four distinct high-resolution faces", async () => {
  for (const mascot of MASCOTS) {
    const assetPath = path.join(ROOT, "public", "animatronics", `${mascot}.webp`);
    const [metadata, header] = await Promise.all([
      stat(assetPath),
      readFile(assetPath).then((buffer) => buffer.subarray(0, 12)),
    ]);

    assert.ok(metadata.size > 70_000, `${mascot} texture is unexpectedly small`);
    assert.equal(header.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(header.subarray(8, 12).toString("ascii"), "WEBP");
  }
});

test("every mascot is wired to CCTV, a named scream and the caught sequence", async () => {
  const [roster, audio, game] = await Promise.all([
    readFile(path.join(ROOT, "app", "walk-exe", "scare-roster.ts"), "utf8"),
    readFile(path.join(ROOT, "app", "walk-exe", "spatial-audio.ts"), "utf8"),
    readFile(path.join(ROOT, "app", "walk-exe", "WalkGame.tsx"), "utf8"),
  ]);

  for (const mascot of MASCOTS) {
    assert.match(roster, new RegExp(`id: "${mascot}"`));
    assert.match(roster, new RegExp(`/animatronics/${mascot}\\.webp`));
  }

  assert.match(audio, /jumpscares:\s*\[ursusScream,\s*velvetScream,\s*avisScream,\s*vulpesScream\]/);
  assert.match(audio, /playJumpscare\(strength = 1, variant = 0\)/);
  assert.match(audio, /playMascotWarning\(variant = 0\)/);
  assert.match(audio, /playMascotScream\(variant = 0, strength = 1\)/);
  assert.match(audio, /mascotScreamsPlayed/);
  assert.match(game, /playMascotScream\(mascot\.screamVariant, 1\.18\)/);
  assert.match(game, /playMascotWarning\(mascot\.screamVariant\)/);
  assert.match(game, /Oír scream de \$\{mascot\.name\}/);
  assert.match(game, /mascotForCatch/);
  assert.match(game, /className="mascot-jumpscare-face"/);
  assert.match(game, /className=\{`cctv-intruder/);
});
