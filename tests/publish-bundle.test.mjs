import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tmpDirs = [];
const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test.afterEach(() => {
  while (tmpDirs.length > 0) {
    rmSync(tmpDirs.pop(), { recursive: true, force: true });
  }
});

test("publishes bundle artifacts and copies share manifest into a public root", () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), "foundry-publish-out-"));
  const publicRoot = mkdtempSync(path.join(os.tmpdir(), "foundry-publish-public-"));
  const home = mkdtempSync(path.join(os.tmpdir(), "foundry-publish-home-"));
  tmpDirs.push(outDir, publicRoot, home);

  const stdout = execFileSync(process.execPath, [
    "scripts/publish-bundle.mjs",
    "--preset", "presets/unbrowse-workflows.json",
    "--out", outDir,
    "--public-root", publicRoot,
    "--site-url", "https://www.unbrowse.ai",
    "--no-install",
  ], {
    cwd: REPO_ROOT,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });

  const result = JSON.parse(stdout);
  const publicManifest = path.join(publicRoot, ".well-known", "skill-bundles", "unbrowse-workflows", "share.json");
  const copiedShare = JSON.parse(readFileSync(publicManifest, "utf8"));
  const bundleShare = JSON.parse(readFileSync(path.join(outDir, "unbrowse-workflows", "share.json"), "utf8"));

  assert.equal(result.bundle_id, "unbrowse-workflows");
  assert.equal(result.public_manifest_path, publicManifest);
  assert.equal(result.public_url, "https://www.unbrowse.ai/.well-known/skill-bundles/unbrowse-workflows/share.json");
  assert.deepEqual(copiedShare, bundleShare);
});
