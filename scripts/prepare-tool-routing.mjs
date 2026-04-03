#!/usr/bin/env node

import path from "node:path";
import { buildToolRoutingReport, parseArgs, readPreset, validatePreset } from "./foundry-lib.mjs";

async function main() {
  const flags = parseArgs(process.argv);
  const preset = validatePreset(readPreset(flags.preset));
  const report = buildToolRoutingReport(preset);

  if (!report) {
    throw new Error("preset.tool_routing is required for prepare-tool-routing");
  }

  const outPath = flags.out ? path.resolve(String(flags.out)) : "";
  if (outPath) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

await main();
