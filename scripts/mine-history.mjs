#!/usr/bin/env node

import { buildHistoryReport, parseArgs, readPreset, validatePreset } from "./foundry-lib.mjs";

function main() {
  const flags = parseArgs(process.argv);
  const preset = validatePreset(readPreset(flags.preset));
  process.stdout.write(JSON.stringify(buildHistoryReport(preset), null, 2) + "\n");
}

main();
