// Phase 15B

import { execFile } from "node:child_process";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const execute = promisify(execFile);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

if (platform() !== "darwin") {
  throw new Error("Standalone executable builds currently require macOS.");
}

const nodeMajorVersion = Number(process.versions.node.split(".")[0]);

if (nodeMajorVersion !== 22) {
  throw new Error(
    `Standalone executable builds require Node.js 22; received ${process.versions.node}.`,
  );
}

const architecture = architectureName(arch());
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);
const buildDirectory = path.join(projectRoot, ".build", "sea", architecture);
const artifactDirectory = path.join(projectRoot, "artifacts");
const bundlePath = path.join(buildDirectory, "vulci.cjs");
const blobPath = path.join(buildDirectory, "vulci.blob");
const executableName = `vulci-${packageJson.version}-macos-${architecture}`;
const executablePath = path.join(artifactDirectory, executableName);
const configPath = path.join(buildDirectory, "sea-config.json");

await mkdir(buildDirectory, { recursive: true });
await mkdir(artifactDirectory, { recursive: true });

await build({
  banner: { js: "// Phase 15B" },
  bundle: true,
  entryPoints: [path.join(projectRoot, "src", "cli.ts")],
  format: "cjs",
  outfile: bundlePath,
  platform: "node",
  sourcemap: false,
  target: "node22",
});

await writeFile(
  configPath,
  `${JSON.stringify(
    {
      main: bundlePath,
      output: blobPath,
      disableExperimentalSEAWarning: true,
      execArgvExtension: "none",
      useCodeCache: false,
      useSnapshot: false,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

await execute(process.execPath, ["--experimental-sea-config", configPath], {
  cwd: projectRoot,
});
await copyFile(process.execPath, executablePath);
await execute("codesign", ["--remove-signature", executablePath]);
await execute(process.execPath, [
  path.join(projectRoot, "node_modules", "postject", "dist", "cli.js"),
  executablePath,
  "NODE_SEA_BLOB",
  blobPath,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  "--macho-segment-name",
  "NODE_SEA",
]);
await execute("codesign", ["--force", "--sign", "-", executablePath]);
await chmod(executablePath, 0o755);

console.log(path.relative(projectRoot, executablePath));

function architectureName(value) {
  if (value === "arm64") return "arm64";
  if (value === "x64") return "x64";
  throw new Error(`Unsupported macOS architecture '${value}'.`);
}
