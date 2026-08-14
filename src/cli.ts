// Phase 15B

import { runCli } from "./cli-runner.js";

void runCli(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode;
});
