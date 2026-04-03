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
    JSON.stringify({ text: "build weekly investor update dashboard from csv and metrics using OPENAI_API_KEY=sk-live-secret-value and ~/.config/gcloud/application_default_credentials.json" }),
    JSON.stringify({ text: "build weekly investor update memo from metrics and csv with process.env.SLACK_BOT_TOKEN plus .env.local" }),
    JSON.stringify({ text: "build weekly investor update report using csv metrics for lewis@example.com from /Users/lekt9/.aws/credentials" }),
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
  const runtimePointers = path.join(home, ".codex", "skills", result.candidates[0].slug, "references", "runtime-pointers.md");
  const evidence = written.candidates[0].evidence.join("\n");

  assert.equal(result.bundle_id, "unbrowse-workflows");
  assert.ok(result.candidates.length >= 1);
  assert.deepEqual(written.candidates, result.candidates);
  assert.match(result.candidates[0].summary, /recurring/i);
  assert.equal(result.install_result.host, "codex");
  assert.match(readFileSync(installedSkill, "utf8"), /generated_by: foundry/);
  assert.match(readFileSync(runtimePointers, "utf8"), /OPENAI_API_KEY/);
  assert.match(readFileSync(runtimePointers, "utf8"), /SLACK_BOT_TOKEN/);
  assert.match(readFileSync(runtimePointers, "utf8"), /\.env\.local/);
  assert.match(readFileSync(runtimePointers, "utf8"), /~\/\.aws\/credentials/);
  assert.doesNotMatch(readFileSync(installedSkill, "utf8"), /OPENAI_API_KEY|SLACK_BOT_TOKEN|sk-live-secret-value|lewis@example\.com|\/Users\/lekt9/);
  assert.doesNotMatch(evidence, /sk-live-secret-value|lewis@example\.com|\/Users\/lekt9/);
});

test("scopes candidate discovery to the preset workflow family instead of global history noise", () => {
  const home = mkdtempSync(path.join(os.tmpdir(), "foundry-discover-scope-home-"));
  const outDir = mkdtempSync(path.join(os.tmpdir(), "foundry-discover-scope-out-"));
  const presetDir = mkdtempSync(path.join(os.tmpdir(), "foundry-discover-scope-preset-"));
  const outFile = path.join(outDir, "candidate-skills.json");
  const presetFile = path.join(presetDir, "fundraising-preset.json");
  tmpDirs.push(home, outDir, presetDir);

  mkdirSync(path.join(home, ".codex"), { recursive: true });
  writeFileSync(path.join(home, ".codex", "history.jsonl"), [
    JSON.stringify({ text: "[SUGGESTION MODE: Suggest what the user might naturally type next into Claude Code.]" }),
    JSON.stringify({ text: "[SUGGESTION MODE: Suggest what the user might naturally type next into Claude Code.]" }),
    JSON.stringify({ text: "draft investor followup email for warm vc allocation update after partner meeting" }),
    JSON.stringify({ text: "write investor followup note for warm vc allocation deadline and round update" }),
    JSON.stringify({ text: "prepare investor followup blurb for warm vc allocation deadline thread" }),
    "",
  ].join("\n"));

  writeFileSync(presetFile, `${JSON.stringify({
    bundle_id: "fundraising-test",
    title: "Fundraising Test",
    fabric: {
      repo: "https://github.com/unbrowse-ai/foundry",
      skill: "foundry",
    },
    bootstrap_skill: "find-skills",
    skills: [
      { name: "investor-outreach", source_path: "~/.agents/skills/investor-outreach/SKILL.md" },
    ],
    routes: [
      {
        when: "the request is about investor followup emails and warm vc outreach",
        call: "investor-outreach",
      },
    ],
    history: {
      sources: ["~/.codex/history.jsonl"],
      skills: [
        {
          skill: "investor-outreach",
          min_hits: 2,
          matchers: ["investor followup", "warm vc"],
        },
      ],
    },
    share: {
      transport: "files",
      manifest_path: "/.well-known/skill-bundles/fundraising-test/share.json",
    },
    index: {
      slug: "fundraising-test",
      summary: "test preset",
      tags: ["test"],
    },
  }, null, 2)}\n`);

  const stdout = execFileSync(process.execPath, [
    "scripts/discover-skill-candidates.mjs",
    "--preset", presetFile,
    "--out", outFile,
    "--threshold", "2",
  ], {
    cwd: REPO_ROOT,
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });

  const result = JSON.parse(stdout);
  const candidateText = JSON.stringify(result.candidates).toLowerCase();

  assert.equal(result.bundle_id, "fundraising-test");
  assert.ok(Array.isArray(result.candidates));
  assert.doesNotMatch(candidateText, /suggestion mode|naturally type|conversation summary/);
});
