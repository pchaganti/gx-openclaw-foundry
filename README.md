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

## Quickstart

```bash
npm run discover
npm run mine-history
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
