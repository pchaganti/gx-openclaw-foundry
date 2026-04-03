import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("fabricates bundle artifacts and writes host memory via foundry", () => {
  const outDir = mkdtempSync(path.join(os.tmpdir(), "foundry-fabricate-out-"));
  const home = mkdtempSync(path.join(os.tmpdir(), "foundry-fabricate-home-"));
  tmpDirs.push(outDir, home);
  mkdirSync(path.join(home, ".claude"), { recursive: true });
  mkdirSync(path.join(home, ".codex"), { recursive: true });
  writeFileSync(path.join(home, ".codex", "history.jsonl"), [
    JSON.stringify({ text: "build weekly investor update dashboard from csv and metrics using OPENAI_API_KEY=sk-live-secret-value and ~/.config/gcloud/application_default_credentials.json" }),
    JSON.stringify({ text: "build weekly investor update memo from metrics and csv with process.env.SLACK_BOT_TOKEN plus .env.local" }),
    JSON.stringify({ text: "build weekly investor update report using csv metrics for lewis@example.com from /Users/lekt9/.aws/credentials" }),
    "",
  ].join("\n"));

  const stdout = execFileSync(process.execPath, [
    "scripts/fabricate-bundle.mjs",
    "--preset", "presets/unbrowse-workflows.json",
    "--out", outDir,
    "--host", "claude",
    "--scope", "agent",
    "--cwd", home,
  ], {
    cwd: REPO_ROOT,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });

  const result = JSON.parse(stdout);
  const bundleDir = path.join(outDir, "unbrowse-workflows");
  const memory = readFileSync(path.join(home, ".claude", "CLAUDE.md"), "utf8");
  const bundle = JSON.parse(readFileSync(path.join(bundleDir, "bundle.json"), "utf8"));
  const candidateReport = JSON.parse(readFileSync(path.join(bundleDir, "candidate-skills.json"), "utf8"));
  const installedSkill = path.join(home, ".claude", "skills", candidateReport.candidates[0].slug, "SKILL.md");
  const installedPointers = path.join(home, ".claude", "skills", candidateReport.candidates[0].slug, "references", "runtime-pointers.md");
  const bundledPointers = path.join(bundleDir, "candidates", candidateReport.candidates[0].slug, "references", "runtime-pointers.md");

  assert.equal(result.bundle_id, "unbrowse-workflows");
  assert.equal(result.target_file, path.join(home, ".claude", "CLAUDE.md"));
  assert.equal(bundle.fabric.skill, "foundry");
  assert.match(memory, /call `foundry`/);
  assert.match(memory, /call `skill-surface-ship`/);
  assert.match(result.files.join("\n"), /candidate-skills\.json/);
  assert.equal(result.install_result.host, "claude");
  assert.match(readFileSync(installedSkill, "utf8"), /generated_by: foundry/);
  assert.match(readFileSync(installedPointers, "utf8"), /OPENAI_API_KEY/);
  assert.match(readFileSync(bundledPointers, "utf8"), /SLACK_BOT_TOKEN/);
  assert.doesNotMatch(readFileSync(installedSkill, "utf8"), /sk-live-secret-value|lewis@example\.com|\/Users\/lekt9/);
});
