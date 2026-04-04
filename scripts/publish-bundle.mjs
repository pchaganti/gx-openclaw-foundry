#!/usr/bin/env node

import path from "node:path";
import {
  buildPublicShareUrl,
  parseArgs,
  readPreset,
  validatePreset,
  writeBundleArtifacts,
  writePublicShareManifest,
} from "./foundry-lib.mjs";

async function main() {
  const flags = parseArgs(process.argv);
  const preset = validatePreset(readPreset(flags.preset));
  const outRoot = path.resolve(String(flags.out || "dist"));
  const threshold = Number(flags.threshold || 3);
  const install = flags.install !== false && !flags["no-install"];
  const installHost = String(flags["install-host"] || "auto");
  const publicRoot = flags["public-root"]
    ? path.resolve(String(flags["public-root"]))
    : process.env.FOUNDRY_PUBLIC_ROOT
      ? path.resolve(process.env.FOUNDRY_PUBLIC_ROOT)
      : "";

  if (!publicRoot) {
    throw new Error("--public-root or FOUNDRY_PUBLIC_ROOT is required");
  }

  const buildResult = writeBundleArtifacts(preset, outRoot, {
    threshold,
    install,
    installHost,
  });

  const publicManifestPath = writePublicShareManifest(preset, publicRoot);
  const publicUrl = buildPublicShareUrl(preset, flags["site-url"]);

  process.stdout.write(JSON.stringify({
    ...buildResult,
    public_manifest_path: publicManifestPath,
    public_url: publicUrl,
  }, null, 2) + "\n");
}

await main();
