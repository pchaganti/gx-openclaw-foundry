#!/usr/bin/env node

import path from "node:path";
import { loadHistoryTexts, parseArgs, readPreset, validatePreset } from "./foundry-lib.mjs";
import { discoverCandidateSkills, installCandidateSkills } from "./foundry-candidates.mjs";

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
  const install = flags.install !== false && !flags["no-install"];
  const installHost = String(flags["install-host"] || "auto");

  const run = async () => {
    const result = runOnce(preset, threshold);
    const installResult = install ? installCandidateSkills(result, { host: installHost }) : null;
    const payload = {
      ...result,
      install_result: installResult,
    };
    if (outPath) {
      const { mkdir, writeFile } = await import("node:fs/promises");
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
    }
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
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
