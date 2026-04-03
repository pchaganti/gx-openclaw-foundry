<p align="center">
  <img src="assets/logo.png" alt="Foundry" width="120" />
</p>

# Foundry

**The forge that forges itself.**

Canonical repo: [unbrowse-ai/foundry](https://github.com/unbrowse-ai/foundry)

Foundry is a repo for turning repeated workflows into reusable skill bundles.

It does three things:
1. scan local history for recurring workflow shapes
2. emit candidate skills with evidence
3. fabricate bundle/share/index/memory artifacts from one preset

It also now preps the local Phase 2 routing layer:
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

Watch for new recurring workflows:

```bash
npm run discover:watch
```

Write host memory in the same pass:

```bash
node scripts/fabricate-bundle.mjs \
  --preset presets/unbrowse-workflows.json \
  --out dist \
  --host claude \
  --scope agent
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

Host targets:
- Codex: `AGENTS.md`
- Claude: `CLAUDE.md`
- OpenClaw: `MEMORY.md`

## Main Files

- `skills/foundry/SKILL.md` — installable skill contract
- `presets/unbrowse-workflows.json` — source-of-truth bundle preset
- `scripts/discover-skill-candidates.mjs` — periodic candidate discovery
- `scripts/mine-history.mjs` — inspect known history matches
- `scripts/prepare-tool-routing.mjs` — build explicit action-DAG and next-action prep artifacts from tool traces
- `scripts/fabricate-bundle.mjs` — one-pass bundle/share/index/memory generation
- `scripts/foundry-lib.mjs` — shared derivation logic
- `tests/` — regression coverage

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

This repo now supports the local non-ML prep path from your routing-layer paper:

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
