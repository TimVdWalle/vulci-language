// Phase 19

import { readFileSync } from "node:fs";
import {
  EnvironmentNameComparison,
  normalizeEnvironmentName,
  parseDotenv,
} from "./dotenv.js";

export type HostEnvironment = Readonly<Record<string, string | undefined>>;

export class ExecutionEnvironment {
  private readonly hostLayer = new Map<string, string>();
  private fileLayer = new Map<string, string>();

  constructor(
    hostEnvironment: HostEnvironment,
    private readonly envFilePath: string | null = null,
    private readonly comparison: EnvironmentNameComparison = platformEnvironmentNameComparison(),
  ) {
    for (const [name, value] of Object.entries(hostEnvironment)) {
      if (value === undefined) continue;
      this.hostLayer.set(this.normalize(name), value);
    }

    this.reload();
  }

  public get(name: string): string | undefined {
    const normalizedName = this.normalize(name);

    return (
      this.hostLayer.get(normalizedName) ?? this.fileLayer.get(normalizedName)
    );
  }

  public reload(): void {
    const nextFileLayer = this.readFileLayer();
    this.fileLayer = nextFileLayer;
  }

  private readFileLayer(): Map<string, string> {
    if (this.envFilePath === null) return new Map();

    let contents: Uint8Array;

    try {
      contents = readFileSync(this.envFilePath);
    } catch (error) {
      if (isMissingFileError(error)) return new Map();

      throw new Error(
        `E_ENV_FILE_READ: Unable to read environment file ` +
          `'${this.envFilePath}'.`,
      );
    }

    const entries = parseDotenv(contents, this.envFilePath, this.comparison);
    const layer = new Map<string, string>();

    for (const entry of entries) {
      layer.set(this.normalize(entry.name), entry.value);
    }

    return layer;
  }

  private normalize(name: string): string {
    return normalizeEnvironmentName(name, this.comparison);
  }
}

export function platformEnvironmentNameComparison(
  platform: NodeJS.Platform = process.platform,
): EnvironmentNameComparison {
  return platform === "win32" ? "case-insensitive" : "case-sensitive";
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
