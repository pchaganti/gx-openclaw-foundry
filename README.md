<p align="center">
  <img src="assets/logo.png" alt="Foundry" width="120" />
</p>

# Foundry

**The forge that forges itself.**

Canonical repo: [unbrowse-ai/foundry](https://github.com/unbrowse-ai/foundry)

Foundry is a self-writing meta-extension for [OpenClaw](https://github.com/lekt9/openclaw). It learns from repeated workflows, discovers candidate skills from local history, fabricates portable skill bundles, and writes executable routing into host memory so the right skill gets called later.

Also: check out [Unbrowse](https://unbrowse.ai). It is the more API-native, network-request-focused branch of the same idea.

## Core Idea

Foundry has three loops:

1. Observe how you actually work
2. Detect repeated workflow shapes worth promoting into skills
3. Fabricate bundle/share/index/memory artifacts from one preset

That means Foundry can:
- scan local Codex history for recurring request clusters
- emit candidate skill ideas with evidence and repeat counts
- scaffold first-pass `SKILL.md` files for those candidates
- build `bundle.json`, `share.json`, `registry-entry.json`, and host-memory snippets together
- route the resulting bundle through `AGENTS.md`, `CLAUDE.md`, or `MEMORY.md`

## Quickstart

Install the OpenClaw plugin:

```bash
openclaw plugins install @getfoundry/foundry-openclaw
```

Run discovery once:

```bash
npm run discover
```

Fabricate the bundle:

```bash
npm run fabricate
```

Run occasional rediscovery:

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

## What Gets Generated

Main outputs:
- `dist/unbrowse-workflows/history-report.json`
- `dist/unbrowse-workflows/candidate-skills.json`
- `dist/unbrowse-workflows/candidates/<slug>/SKILL.md`
- `dist/unbrowse-workflows/bundle.json`
- `dist/unbrowse-workflows/share.json`
- `dist/unbrowse-workflows/registry-entry.json`
- `dist/unbrowse-workflows/hosts/<host>/<file>`

Host files:
- Codex: `AGENTS.md`
- Claude: `CLAUDE.md`
- OpenClaw: `MEMORY.md`

## Main Commands

```bash
npm run discover
npm run discover:watch
npm run mine-history
npm run fabricate
npm test
```

Script entrypoints:
- `scripts/discover-skill-candidates.mjs` — periodic candidate-skill discovery
- `scripts/mine-history.mjs` — inspect history matches against known bundle skills
- `scripts/fabricate-bundle.mjs` — one-pass bundle/share/index/memory generation
- `scripts/foundry-lib.mjs` — shared derivation logic for history, DAG, install commands, and host-memory rendering

## Preset Model

The preset is the source of truth. See [presets/unbrowse-workflows.json](/Users/lekt9/Projects/openclaw-foundry/presets/unbrowse-workflows.json).

It carries:
- bundle id and title
- Foundry entry skill
- child skills to install
- dependency graph
- routing rules
- history matchers
- share metadata
- registry metadata

Foundry derives everything else from that one file.

## Current Bundle Surface

Current default bundle:
- `foundry` — umbrella entry skill
- `history-skill-miner`
- `docs-release-sync`
- `skill-surface-ship`
- `main-actions-triage`

Host memory routing says:
- call `foundry` for discovery, fabrication, sharing, indexing, and routing work
- call the narrower child skill when the request is clearly about that child workflow

## OpenClaw Plugin

This repo still ships the OpenClaw plugin package:
- npm package: `@getfoundry/foundry-openclaw`
- skill metadata: [skills/foundry/SKILL.md](/Users/lekt9/Projects/openclaw-foundry/skills/foundry/SKILL.md)
- plugin manifests: [openclaw.plugin.json](/Users/lekt9/Projects/openclaw-foundry/openclaw.plugin.json), [clawdbot.plugin.json](/Users/lekt9/Projects/openclaw-foundry/clawdbot.plugin.json)

Alternative install paths:

```json
{
  "plugins": {
    "entries": {
      "foundry": {
        "enabled": true,
        "source": "github:unbrowse-ai/foundry"
      }
    }
  }
}
```

```bash
nix run github:unbrowse-ai/foundry
git clone https://github.com/unbrowse-ai/foundry ~/.openclaw/extensions/foundry
```

## Repo Layout

- `skills/foundry/` — installable skill contract
- `presets/` — bundle source-of-truth JSON
- `scripts/` — discovery + fabrication entrypoints
- `tests/` — regression coverage for discovery/fabrication flow
- `src/`, `index.ts` — legacy/self-writing OpenClaw plugin runtime
- `server/` — older web/marketplace surface

## Status

The active new surface is the Foundry discovery/fabrication flow.

Some older plugin/runtime/marketplace code is still in the repo. The side branch `codex/prune-foundry-surface` is where the harder cleanup can happen without disturbing `main`.

## Verify

```bash
npm test
HOME=$(mktemp -d) node scripts/fabricate-bundle.mjs --preset presets/unbrowse-workflows.json --out dist --threshold 2
```
