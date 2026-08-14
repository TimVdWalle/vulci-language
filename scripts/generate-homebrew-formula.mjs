// Phase 15B

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [tapDirectory, repository, version, armChecksumPath, x64ChecksumPath] =
  process.argv.slice(2);

if (
  tapDirectory === undefined ||
  repository === undefined ||
  version === undefined ||
  armChecksumPath === undefined ||
  x64ChecksumPath === undefined
) {
  throw new Error(
    "Usage: generate-homebrew-formula <tap-directory> <repository> " +
      "<version> <arm64-checksum> <x64-checksum>",
  );
}

const armChecksum = await readChecksum(armChecksumPath);
const x64Checksum = await readChecksum(x64ChecksumPath);
const formulaDirectory = path.join(tapDirectory, "Formula");
const formulaPath = path.join(formulaDirectory, "vulci.rb");
const releaseBase = `https://github.com/${repository}/releases/download/v${version}`;

const formula = `# Phase: Phase 15B CLI, distribution, and quality hardening
class Vulci < Formula
  desc "Reference interpreter for the Vulci programming language"
  homepage "https://github.com/${repository}"
  version "${version}"

  depends_on :macos

  on_arm do
    url "${releaseBase}/vulci-${version}-macos-arm64"
    sha256 "${armChecksum}"
  end

  on_intel do
    url "${releaseBase}/vulci-${version}-macos-x64"
    sha256 "${x64Checksum}"
  end

  def install
    architecture = Hardware::CPU.arm? ? "arm64" : "x64"
    bin.install "vulci-#{version}-macos-#{architecture}" => "vulci"
    chmod 0755, bin/"vulci"
  end

  test do
    assert_equal "Vulci #{version}", shell_output("#{bin}/vulci --version").strip
  end
end
`;

await mkdir(formulaDirectory, { recursive: true });
await writeFile(formulaPath, formula, "utf8");
console.log(formulaPath);

async function readChecksum(checksumPath) {
  const checksum = (await readFile(checksumPath, "utf8"))
    .trim()
    .split(/\s+/)[0];

  if (!/^[a-f\d]{64}$/.test(checksum ?? "")) {
    throw new Error(`Invalid SHA-256 checksum in '${checksumPath}'.`);
  }

  return checksum;
}
