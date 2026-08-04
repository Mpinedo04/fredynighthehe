import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = process.cwd();

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: workspace,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      [result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n") || `${command} exited with ${result.status}`,
    );
  }
}

async function collectHashes(directory, rootDirectory = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const hashes = new Map();
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectHashes(entryPath, rootDirectory);
      nested.forEach((hash, name) => hashes.set(name, hash));
      continue;
    }
    const bytes = await readFile(entryPath);
    hashes.set(
      path.relative(rootDirectory, entryPath).replaceAll(path.sep, "/"),
      createHash("sha256").update(bytes).digest("hex"),
    );
  }
  return hashes;
}

async function buildInto(directory) {
  run("node", [
    "scripts/build-subject-m22-assets.mjs",
    `--out-dir=${directory}`,
  ]);
  return collectHashes(directory);
}

const firstDirectory = await mkdtemp(path.join(os.tmpdir(), "subject-m22-a-"));
const secondDirectory = await mkdtemp(path.join(os.tmpdir(), "subject-m22-b-"));

try {
  const [first, second] = await Promise.all([
    buildInto(firstDirectory),
    buildInto(secondDirectory),
  ]);
  if (first.size !== second.size) {
    throw new Error(`build output count changed: ${first.size} != ${second.size}`);
  }
  for (const [name, hash] of first) {
    if (second.get(name) !== hash) {
      throw new Error(`non-deterministic output: ${name}`);
    }
  }
  console.log(
    JSON.stringify({ deterministic: true, files: first.size }, null, 2),
  );
} finally {
  await Promise.all([
    rm(firstDirectory, { recursive: true, force: true }),
    rm(secondDirectory, { recursive: true, force: true }),
  ]);
}
