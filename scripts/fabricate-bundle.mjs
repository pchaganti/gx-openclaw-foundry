#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  parseArgs,
  readPreset,
  renderMemoryBlock,
  targetFileFor,
  upsertManagedBlock,
  validatePreset,
  writeBundleArtifacts,
} from "./foundry-lib.mjs";

function runOnce(preset, outRoot, host, scope, cwd, threshold) {
  const buildResult = writeBundleArtifacts(preset, outRoot, { threshold });

  let targetFile = null;
  if (host) {
    targetFile = targetFileFor(host, scope, cwd);
    const existing = existsSync(targetFile) ? readFileSync(targetFile, "utf8") : "";
    const updated = upsertManagedBlock(existing, renderMemoryBlock(preset, host));
    mkdirSync(path.dirname(targetFile), { recursive: true });
    writeFileSync(targetFile, updated);
  }

  return {
    ...buildResult,
    target_file: targetFile,
  };
}

async function main() {
  const flags = parseArgs(process.argv);
  const preset = validatePreset(readPreset(flags.preset));
  const outRoot = path.resolve(String(flags.out || "dist"));
  const cwd = path.resolve(String(flags.cwd || process.cwd()));
  const host = flags.host ? String(flags.host) : "";
  const scope = String(flags.scope || "auto");
  const watch = !!flags.watch;
  const intervalMs = Number(flags.interval || 3_600_000);
  const threshold = Number(flags.threshold || 3);

  const run = () => {
    const result = runOnce(preset, outRoot, host, scope, cwd, threshold);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  };

  run();
  if (!watch) return;
  setInterval(run, intervalMs);
}

await main();
