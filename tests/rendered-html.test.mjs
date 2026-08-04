import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  completeSecret,
  createSecretProgress,
  findContinuityClue,
  microtoneFromPoint,
  nextFnafMilestone,
  parseSecretProgress,
  registerScrollReversal,
  resolveFnafMilestone,
} from "../app/secret-system.mjs";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Premiere 22 home route", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Premiere 22/i);
  assert.match(html, /Ra(?:ú|Ãº)l Garc(?:í|Ã­)a/i);
  assert.match(html, /Angine de Poitrine/i);
  assert.match(html, /Live on KEXP/i);
  assert.match(html, /Material recuperado/i);
  assert.match(html, /producci(?:ó|Ã³)n real/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);
});

test("interactive montage defines the inset index used by every cut label", async () => {
  const pageSource = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    pageSource,
    /cutImages\.map\(\(image,\s*index\)\s*=>[\s\S]*?String\.fromCharCode\(65\s*\+\s*index\)/,
  );
});

test("secret progress is versioned, sanitized and reset-safe", () => {
  assert.deepEqual(parseSecretProgress("not-json"), createSecretProgress());
  const corrupted = parseSecretProgress(
    JSON.stringify({
      version: 1,
      completed: ["nolan", "unknown", "nolan"],
      continuityFound: ["hero", "wrong"],
      fnafHandled: [28, 999],
      fnafCaught: [28, 42],
      fnafMissed: 99,
    }),
  );
  assert.deepEqual(corrupted.completed, ["nolan"]);
  assert.deepEqual(corrupted.continuityFound, ["hero"]);
  assert.deepEqual(corrupted.fnafHandled, [28]);
  assert.deepEqual(corrupted.fnafCaught, [28]);
  assert.equal(corrupted.fnafMissed, 1);
});

test("Nolan inversion requires three reversals inside the time window", () => {
  let state = registerScrollReversal([], 1000);
  assert.equal(state.triggered, false);
  state = registerScrollReversal(state.history, 1650);
  assert.equal(state.triggered, false);
  state = registerScrollReversal(state.history, 2200);
  assert.equal(state.triggered, true);
  state = registerScrollReversal(state.history, 5000);
  assert.equal(state.triggered, false);
});

test("FNAF milestones are unique and distinguish catches from misses", () => {
  let progress = createSecretProgress();
  assert.equal(nextFnafMilestone(27, progress.fnafHandled), null);
  assert.equal(nextFnafMilestone(72, progress.fnafHandled), 28);
  progress = resolveFnafMilestone(progress, 28, true);
  progress = resolveFnafMilestone(progress, 42, false);
  progress = resolveFnafMilestone(progress, 42, false);
  assert.deepEqual(progress.fnafHandled, [28, 42]);
  assert.deepEqual(progress.fnafCaught, [28]);
  assert.equal(progress.fnafMissed, 1);
  assert.equal(nextFnafMilestone(72, progress.fnafHandled), 56);
});

test("microtonal cursor maps the viewport to 24 bounded steps and three octaves", () => {
  assert.deepEqual(microtoneFromPoint(0, 0, 2400, 900).step, 0);
  assert.equal(microtoneFromPoint(2399, 899, 2400, 900).step, 23);
  assert.equal(microtoneFromPoint(1200, 0, 2400, 900).octave, 2);
  assert.equal(microtoneFromPoint(1200, 450, 2400, 900).octave, 1);
  assert.equal(microtoneFromPoint(1200, 899, 2400, 900).octave, 0);
});

test("continuity clues count once and unlock the fourth secret", () => {
  let progress = createSecretProgress();
  for (const clue of ["hero", "project", "friends", "trailer"]) {
    progress = findContinuityClue(progress, clue);
    progress = findContinuityClue(progress, clue);
  }
  assert.equal(progress.continuityFound.length, 4);
  assert.ok(progress.completed.includes("continuity"));
  progress = completeSecret(progress, "continuity");
  assert.equal(progress.completed.filter((id) => id === "continuity").length, 1);
});

test("server-renders the M00NW4LK.EXE route and loading shell", async () => {
  const response = await render("/walk-exe");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /M00NW4LK\.EXE/i);
  assert.match(html, /INICIALIZANDO MOTOR 3D/i);
  assert.match(html, /walk-loading/i);
  assert.match(html, /walk-exe/i);
});

test("production bundle never exposes local font paths", async () => {
  const serverBundle = await readFile(
    new URL("../dist/server/index.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(serverBundle, /(?:file:\/\/\/)?[A-Z]:[\\/].*?\.woff2/i);
  assert.doesNotMatch(serverBundle, /\.vinext[\\/]fonts/i);
});
