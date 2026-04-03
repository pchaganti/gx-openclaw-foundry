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

test("discovers recurring candidate skills from history and writes report", () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "foundry-discover-home-"));
  const outFile = path.join(mkdtempSync(path.join(os.tmpdir(), "foundry-discover-out-")), "candidate-skills.json");
  tmpDirs.push(home, path.dirname(outFile));
  mkdirSync(path.join(home, ".codex"), { recursive: true });
  writeFileSync(path.join(home, ".codex", "history.jsonl"), [
    JSON.stringify({ text: "build weekly investor update dashboard from csv and metrics" }),
    JSON.stringify({ text: "build weekly investor update memo from metrics and csv" }),
    JSON.stringify({ text: "build weekly investor update report using csv metrics" }),
    "",
  ].join("\n"));

  const stdout = execFileSync(process.execPath, [
    "scripts/discover-skill-candidates.mjs",
    "--preset", "presets/unbrowse-workflows.json",
    "--out", outFile,
    "--threshold", "2",
  ], {
    cwd: REPO_ROOT,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });

  const result = JSON.parse(stdout);
  const written = JSON.parse(readFileSync(outFile, "utf8"));
  const installedSkill = path.join(home, ".codex", "skills", result.candidates[0].slug, "SKILL.md");

  assert.equal(result.bundle_id, "unbrowse-workflows");
  assert.ok(result.candidates.length >= 1);
  assert.deepEqual(written.candidates, result.candidates);
  assert.match(result.candidates[0].summary, /recurring/i);
  assert.equal(result.install_result.host, "codex");
  assert.match(readFileSync(installedSkill, "utf8"), /generated_by: foundry/);
});
