import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MASCOTS = ["ursus-9", "velvet-r", "avis-3", "vulpes-x"];

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
  assert.match(game, /mascotForCatch/);
  assert.match(game, /className="mascot-jumpscare-face"/);
  assert.match(game, /className=\{`cctv-intruder/);
});
