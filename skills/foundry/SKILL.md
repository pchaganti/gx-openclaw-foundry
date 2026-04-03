---
name: foundry
description: Discover repeated workflows from local history, scaffold candidate skills, and fabricate portable skill bundles with share, index, and host-memory artifacts.
user-invocable: true
---

# Foundry

Core job:

- turn repeated workflow patterns into a portable skill bundle from one preset

Use this skill when:

- local chat history should be mined for recurring workflows
- repeated workflows should become candidate skills
- a bundle should emit share/index/memory artifacts together
- host memory should route future requests to the right skill

Do not use this skill for:

- one-off domain tasks with no bundle concern
- generic notes with no routing or install value
- plugin/runtime work unrelated to workflow discovery or bundle fabrication

Workflow:

1. Run `npm run discover` to identify recurring workflow clusters.
2. Inspect `candidate-skills.json` and scaffolded candidate `SKILL.md` drafts.
3. Run `npm run fabricate` to emit bundle/share/index artifacts.
4. If needed, rerun `scripts/fabricate-bundle.mjs` with `--host` and `--scope` to write host memory.

Load-bearing rules:

- one preset is the source of truth
- one entry skill owns the bundle-level job
- candidate skill discovery must be evidence-backed
- bundle, share, registry, and memory outputs stay derived from the same preset
- memory must say which skill to call, not just what to install

Install:

```bash
npx skills add https://github.com/unbrowse-ai/foundry --skill foundry --yes
```
