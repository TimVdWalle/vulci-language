// Phase 15B

export type CliAction = "help" | "run" | "version";

export interface CliArguments {
  action: CliAction;
  entryPath: string | null;
  noColor: boolean;
  showAst: boolean;
  showTokens: boolean;
}

export class CliArgumentError extends Error {}

export function parseCliArguments(arguments_: string[]): CliArguments {
  let action: CliAction = "run";
  let entryPath: string | null = null;
  let noColor = false;
  let showAst = false;
  let showTokens = false;

  for (const argument of arguments_) {
    switch (argument) {
      case "--help":
      case "-h":
        action = selectAction(action, "help");
        break;
      case "--version":
      case "-v":
        action = selectAction(action, "version");
        break;
      case "--tokens":
        showTokens = true;
        break;
      case "--ast":
        showAst = true;
        break;
      case "--no-color":
        noColor = true;
        break;
      default:
        if (argument.startsWith("-")) {
          throw new CliArgumentError(`Unknown option '${argument}'.`);
        }

        if (entryPath !== null) {
          throw new CliArgumentError(
            `Only one entry path is allowed; received '${entryPath}' and '${argument}'.`,
          );
        }

        entryPath = argument;
    }
  }

  if (action === "run" && entryPath === null) {
    throw new CliArgumentError("Missing entry path.");
  }

  return { action, entryPath, noColor, showAst, showTokens };
}

function selectAction(
  current: CliAction,
  requested: Exclude<CliAction, "run">,
) {
  if (current !== "run" && current !== requested) {
    throw new CliArgumentError("Help and version options cannot be combined.");
  }

  return requested;
}
