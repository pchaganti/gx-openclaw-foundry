#!/usr/bin/env node

import path from "node:path";
import { discoverCandidateSkills, loadHistoryTexts, parseArgs, readPreset, validatePreset } from "./foundry-lib.mjs";

function runOnce(preset, threshold) {
  const texts = loadHistoryTexts(preset);
  return discoverCandidateSkills(preset, texts, { threshold });
}

async function main() {
  const flags = parseArgs(process.argv);
  const preset = validatePreset(readPreset(flags.preset));
  const watch = !!flags.watch;
  const intervalMs = Number(flags.interval || 3_600_000);
  const threshold = Number(flags.threshold || 3);
  const outPath = flags.out ? path.resolve(String(flags.out)) : "";

  const run = async () => {
    const result = runOnce(preset, threshold);
    if (outPath) {
      const { mkdir, writeFile } = await import("node:fs/promises");
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`);
    }
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  };

  await run();
  if (!watch) return;
  setInterval(() => {
    run().catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    });
  }, intervalMs);
}

await main();
