<p align="center">
  <img src="assets/logo.png" alt="Foundry" width="120" />
</p>

# Foundry

**The forge that forges itself.**

Canonical repo: [unbrowse-ai/foundry](https://github.com/unbrowse-ai/foundry)

Foundry turns repeated workflows into reusable skill bundles. Point it at your local session history and it will:

1. scan for recurring workflow shapes across all sessions
2. emit candidate skills backed by hard evidence (session counts, tool frequencies, co-occurrence patterns)
3. fabricate bundle/share/index/memory artifacts from one preset

Discovered candidate skills auto-install into the local host skill dir by default:
- Codex: `$CODEX_HOME/skills` or `~/.codex/skills`
- Claude: `~/.claude/skills`
- Each mined skill now gets `references/runtime-pointers.md` with sanitized env-var names and secret/config locations only; values, emails, and user-specific paths stay out of `SKILL.md`.

It also preps the local Phase 2 routing layer:
- ingest tool trace sessions
- build an explicit action DAG
- emit next-action training examples from real tool sequences

## Quickstart

```bash
npm run discover
npm run mine-history
npm run prepare-router
npm run fabricate
```

Publish the public share manifest in the same pass:

```bash
node scripts/publish-bundle.mjs \
  --preset presets/unbrowse-workflows.json \
  --out dist \
  --public-root ../unbrowse/frontend/public \
  --site-url https://www.unbrowse.ai
```

Watch for new recurring workflows:

```bash
npm run discover:watch
```

Skip local auto-install:

```bash
node scripts/discover-skill-candidates.mjs --preset presets/unbrowse-workflows.json --no-install
```

Write host memory in the same pass:

```bash
node scripts/fabricate-bundle.mjs \
  --preset presets/unbrowse-workflows.json \
  --out dist \
  --host claude \
  --scope agent
```

## Real-World Example: Unbrowse Workflow Mining

We ran Foundry against the [Unbrowse](https://github.com/unbrowse-ai/unbrowse) monorepo -- **319 sessions, 16,000+ tool calls, 200 commits** -- and it surfaced 6 candidate skills that the team was executing by hand dozens of times per sprint.

### What Foundry found

```
Sessions analyzed:  319
Tool calls mined:   16,000+
Commits scanned:    200
Existing skills:    5 (already codified)
Candidates found:   6 (recurring but not yet automated)
```

### The 6 candidate skills

#### 1. `unbrowse-dev-loop` -- Kill, Rebuild, Test (P0)

The single most repeated workflow across the entire history: kill stale processes, rebuild from source, test resolve/execute, check output shape.

```
Evidence:
  Sessions:       21 (highest intensity cluster)
  Avg tool calls: 117 per session
  pkill calls:    435 total across all sessions
  resolve calls:  105 total
  execute calls:  55 total
  Signature:      pkill -> sleep 2 -> bun src/cli.ts resolve -> validate
```

Foundry detected that `pkill -9 -f 'unbrowse|kuri'` followed by `bun src/cli.ts resolve` appeared 47+ times in a canonical sequence. The stale-server problem was the #1 source of false negatives.

<details>
<summary>Generated SKILL.md</summary>

```yaml
---
name: unbrowse-dev-loop
description: Kill stale processes, rebuild, test resolve/execute against a URL, report pass/fail.
user-invocable: true
---
```

Workflow:
1. Kill stale processes: `pkill -9 -f 'unbrowse|kuri'; sleep 2`
2. Run resolve: `bun src/cli.ts resolve "<intent>" --url "<url>"`
3. Validate output (HTTP response, JSON structure, no `[object Object]`, endpoints non-empty)
4. If resolve passed: `bun src/cli.ts execute <endpoint_id>`
5. Report: PASS with key metrics or FAIL with error excerpt

Load-bearing rules:
- Always kill before testing -- stale servers are the #1 false-negative source
- Never skip the sleep after pkill -- kuri needs 2s to release ports
- If resolve returns 0 endpoints, that's a FAIL even if no error was thrown

</details>

---

#### 2. `unbrowse-investor-pipeline` -- Fundraise Pipeline Loop (P1)

Checks SAFE status, scans investor comms across Gmail and Telegram, flags stale threads, drafts follow-ups per cadence rules.

```
Evidence:
  Sessions:         14
  Avg tool calls:   60 per session
  telegram-query:   4 invocations
  gws-gmail-send:   3 invocations
  granola (notes):  2 invocations
  Memory reads:     Heavy (investor contacts, SAFE status, fundraise state)
```

Foundry found that every fundraise session started with the same 7-step memory read sequence (load contacts, check BoldSign, scan Gmail, query Telegram, cross-reference, draft, update). The cadence rules were encoded in memory but executed manually every time.

<details>
<summary>Generated SKILL.md</summary>

```yaml
---
name: unbrowse-investor-pipeline
description: Check SAFE status, scan investor comms across Gmail and Telegram, flag stale threads, draft follow-ups.
user-invocable: true
---
```

Workflow:
1. Load state from memory (fundraise status, investor contacts, comp plan)
2. Poll BoldSign API for SAFE envelope changes
3. Scan Gmail for investor replies (last 48h)
4. Query Telegram for DM activity from key investor chat IDs
5. Cross-reference: flag silent >5d, unsigned SAFEs >3d, owed responses
6. Draft follow-up messages per cadence rules
7. Update memory with new signals

</details>

---

#### 3. `unbrowse-traction-watchdog` -- Metrics Dashboard (P1)

Polls traction and stats APIs, compares against sprint targets, computes deltas, flags at-risk metrics.

```
Evidence:
  Sessions:       27 (pure context-lookup cluster)
  Avg tool calls: 43 per session
  Pattern:        60%+ muonry reads, <20% Bash
  API endpoints:  2 (traction + stats/summary)
  Sprint targets: Tracked in memory, compared manually every session
```

27 sessions were almost entirely context-gathering: read memory, curl API, mental math, report to user. The same two API endpoints were called in the same order every time.

<details>
<summary>Generated SKILL.md</summary>

```yaml
---
name: unbrowse-traction-watchdog
description: Poll traction and stats APIs, compare against sprint targets, compute deltas, flag at-risk metrics.
user-invocable: true
---
```

Workflow:
1. Fetch `https://launch.unbrowse.ai/api/traction`
2. Fetch `https://beta-api.unbrowse.ai/v1/stats/summary`
3. Load sprint targets from memory
4. Compute deltas: current vs baseline, current vs target, daily run rate
5. Flag: declining metrics, targets at risk (<50% toward goal), blockers (zero growth >2 days)
6. Format dashboard table with status indicators
7. Update memory with snapshot + timestamp

</details>

---

#### 4. `unbrowse-issue-swarm` -- Parallel Issue Clearing (P1)

Fetches issues, triages by area, spawns parallel devswarm/codex agents, collects PRs, batch merges.

```
Evidence:
  Sessions:       25
  Avg tool calls: 28 per session
  devswarm calls: get_issue(99), run_swarm(67), run_task(50), merge_pr(31), create_branch(25)
  Git branches:   15+ codex/ prefixed branches
  Batch merges:   "Codex/merge last 5h branches (#286)" style commits
```

The devswarm MCP server does the heavy lifting, but the orchestration layer (which issues, what order, merge strategy) was re-decided every session. Foundry captured the triage-spawn-collect-merge pattern.

<details>
<summary>Generated SKILL.md</summary>

```yaml
---
name: unbrowse-issue-swarm
description: Fetch P0/P1 issues, triage by area, spawn parallel agents, collect PRs, batch merge.
user-invocable: true
---
```

Workflow:
1. Fetch open P0/P1 issues from GitHub
2. Triage by area: kuri, orchestrator, backend, auth, runtime
3. Spawn parallel devswarm agents per issue (or codex worktree)
4. Collect PRs, run CI checks
5. Batch merge passing PRs
6. Close linked issues on merge

</details>

---

#### 5. `unbrowse-content-loop` -- Content Pipeline (P2)

Checks content queue, optimizes drafts for platform, schedules via Typefully, tracks engagement.

```
Evidence:
  Sessions:         14
  Avg tool calls:   60 per session
  typefully skill:  3 invocations
  x-virality skill: 2 invocations
  Content messages: 207 across all sessions
  docs: commits:    20 in last 100 commits
```

<details>
<summary>Generated SKILL.md</summary>

```yaml
---
name: unbrowse-content-loop
description: Check content queue, optimize drafts for platform, schedule via Typefully, track engagement.
user-invocable: true
---
```

Workflow:
1. Check `.content-queue/` for new drafts
2. Pick highest-priority unposted draft
3. Optimize for target platform (X thread vs tweet vs LinkedIn vs HN)
4. Schedule via Typefully (never x-cli)
5. After publish: check engagement metrics
6. Update Linear issue status

</details>

---

#### 6. `unbrowse-eval-close` -- Eval-to-Issue Closer (P2)

Runs eval harness, judges results, links artifacts to GitHub/Linear issues, auto-closes passing ones.

```
Evidence:
  Sessions:       17
  Avg tool calls: 85 per session
  Eval harnesses: 7 distinct modes (codex, product-success, stress, autonomous, auth, campaign, regression)
  Eval files:     47 in evals/ directory
  Gap:            Results written to JSON artifacts but never linked back to issues
```

The eval infrastructure is deep (7 harnesses, 47 files), but the last-mile step -- judging a result and closing the issue -- was always manual.

<details>
<summary>Generated SKILL.md</summary>

```yaml
---
name: unbrowse-eval-close
description: Run eval harness, judge results, auto-close passing issues, create regression tickets for failures.
user-invocable: true
---
```

Workflow:
1. Run eval: `bun run eval:codex --intent "<intent>" --url "<url>"`
2. Read artifact: `evals/codex-harness-last-run.json`
3. Judge each case: PASS / PARTIAL / FAIL
4. For PASS: close GitHub issue + update Linear
5. For FAIL: create regression issue with artifact excerpt
6. Update eval tracking

</details>

---

### Cross-cutting patterns Foundry detected

**Tool co-occurrence bigrams** (consecutive tool pairs across 16K+ calls):

| Count | Sequence | Meaning |
|------:|----------|---------|
| 6,898 | Bash -> Bash | Long shell chains (build-test-fix) |
| 1,653 | read -> read | Deep context gathering |
| 694 | search -> search | Exploration sweeps |
| 449 | read -> edit | Read-then-modify (the default working mode) |
| 413 | search -> read | Find-then-inspect |

**The 7 workflow clusters** (by session count):

| Cluster | Sessions | Avg Calls | Dominant Pattern |
|---------|----------|-----------|-----------------|
| Code-with-Context | 74 | 78 | read -> edit -> bash interleave |
| Build-Test-Fix | 21 | 117 | bash chains, pkill-rebuild-test |
| Package-Publish | 27 | 141 | git push, npm pack, sync-skill |
| Memory-Research | 27 | 43 | pure context reads, no execution |
| Issue-Triage | 25 | 28 | devswarm orchestration |
| Linear-Planning | 12 | 75 | Linear API + memory |
| Fundraise-Ops | 14 | 60 | telegram + gmail + memory |

### What was already codified (Foundry skipped these)

- **Release flow** -- fully automated via `release-it` + CI (8 releases in 200 commits)
- **Skill sync** -- `bash scripts/sync-skill.sh` handles monorepo-to-public-repo sync
- **Smart pre-commit** -- file-pattern-aware test gating in `scripts/precommit.sh`
- **Kuri packaging** -- `scripts/check-packaged-kuri.sh` validates the Zig binary ships correctly

Foundry only surfaces what's repeated AND not yet automated.
Pin the install target explicitly:

```bash
node scripts/fabricate-bundle.mjs \
  --preset presets/unbrowse-workflows.json \
  --out dist \
  --install-host codex
```
## Outputs

Foundry writes:
- `dist/unbrowse-workflows/history-report.json`
- `dist/unbrowse-workflows/candidate-skills.json`
- `dist/unbrowse-workflows/candidates/<slug>/SKILL.md`
- `dist/unbrowse-workflows/tool-routing-report.json`
- `dist/unbrowse-workflows/action-dag.json`
- `dist/unbrowse-workflows/next-action-dataset.json`
- `dist/unbrowse-workflows/bundle.json`
- `dist/unbrowse-workflows/share.json`
- `dist/unbrowse-workflows/registry-entry.json`
- `dist/unbrowse-workflows/hosts/<host>/<file>`

Foundry also installs discovered candidate skills into the active local host by default.

Host targets:
- Codex: `AGENTS.md`
- Claude: `CLAUDE.md`
- OpenClaw: `MEMORY.md`

## Main Files

- `skills/foundry/SKILL.md` -- installable skill contract
- `presets/unbrowse-workflows.json` -- source-of-truth bundle preset
- `scripts/discover-skill-candidates.mjs` -- periodic candidate discovery
- `scripts/mine-history.mjs` -- inspect known history matches
- `scripts/prepare-tool-routing.mjs` -- build explicit action-DAG and next-action prep artifacts from tool traces
- `scripts/fabricate-bundle.mjs` -- one-pass bundle/share/index/memory generation
- `scripts/publish-bundle.mjs` -- fabricate bundle artifacts and copy public `share.json` into a site root
- `scripts/foundry-lib.mjs` -- shared derivation logic
- `tests/` -- regression coverage

## Preset Model

The preset carries:
- bundle id and title
- entry skill
- child skills
- dependency graph
- routes
- history matchers
- tool trace sources for DAG/training prep
- share metadata
- registry metadata

Everything else is derived from that one file.

## Default Bundle

Current default bundle:
- `foundry`
- `history-skill-miner`
- `docs-release-sync`
- `skill-surface-ship`
- `main-actions-triage`

Routing rule:
- call `foundry` for discovery, fabrication, sharing, indexing, and memory routing
- call the narrower child skill when the request is clearly about that child workflow

## Install

Repo install:

```bash
npx skills add https://github.com/unbrowse-ai/foundry --skill foundry --yes
```

## Verify

```bash
npm test
HOME=$(mktemp -d) node scripts/fabricate-bundle.mjs --preset presets/unbrowse-workflows.json --out dist --threshold 2
```

## Routing Prep

This repo supports the local non-ML prep path from the routing-layer paper:

1. collect tool traces
2. build an explicit action DAG
3. build next-action examples from real sessions
4. use the DAG as reachability constraints before any trained router exists

Accepted tool trace shape:

```json
{
  "session_id": "sess-1",
  "goal": "deploy to staging",
  "actions": [
    { "tool": "git_status", "status": "success", "domain": "git" },
    { "tool": "build", "status": "success", "domain": "ci" },
    { "tool": "deploy_staging", "status": "success", "domain": "deploy" }
  ]
}
```
