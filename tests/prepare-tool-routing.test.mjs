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

test("prepares explicit action dag and next-action dataset from tool traces", () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "foundry-router-home-"));
  const outFile = path.join(mkdtempSync(path.join(os.tmpdir(), "foundry-router-out-")), "tool-routing-report.json");
  tmpDirs.push(home, path.dirname(outFile));
  mkdirSync(path.join(home, ".codex"), { recursive: true });
  writeFileSync(path.join(home, ".codex", "tool-traces.jsonl"), [
    JSON.stringify({
      session_id: "sess-1",
      goal: "deploy to staging",
      actions: [
        { tool: "git_status", status: "success", domain: "git" },
        { tool: "build", status: "success", domain: "ci" },
        { tool: "deploy_staging", status: "success", domain: "deploy" },
      ],
    }),
    JSON.stringify({
      session_id: "sess-2",
      goal: "deploy to staging",
      actions: [
        { tool: "git_status", status: "success", domain: "git" },
        { tool: "build", status: "success", domain: "ci" },
        { tool: "deploy_staging", status: "failure", domain: "deploy" },
      ],
    }),
    "",
  ].join("\n"));

  const stdout = execFileSync(process.execPath, [
    "scripts/prepare-tool-routing.mjs",
    "--preset", "presets/unbrowse-workflows.json",
    "--out", outFile,
  ], {
    cwd: REPO_ROOT,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });

  const result = JSON.parse(stdout);
  const written = JSON.parse(readFileSync(outFile, "utf8"));

  assert.equal(result.session_count, 2);
  assert.equal(result.node_count, 3);
  assert.equal(result.edge_count, 2);
  assert.equal(result.action_dag.edges[0].count, 2);
  assert.equal(result.next_action_dataset.count, 6);
  assert.deepEqual(written.action_dag, result.action_dag);
});
