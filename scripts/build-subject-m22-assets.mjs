import path from "node:path";
import { spawnSync } from "node:child_process";

const outputDirectoryArgument = process.argv.find((argument) =>
  argument.startsWith("--out-dir="),
);
const outputDirectory = path.resolve(
  outputDirectoryArgument?.slice("--out-dir=".length) || "public/models",
);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("python", [
  "scripts/generate-subject-materials.py",
  "--source",
  "design/subject-m22-face-source.png",
  "--out-dir",
  path.join(outputDirectory, "subject-m22-materials"),
]);
run(process.execPath, [
  "scripts/build-subject-m22.mjs",
  `--out-dir=${outputDirectory}`,
]);
