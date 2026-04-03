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
- tool traces should be turned into an explicit action DAG or next-action dataset
- a bundle should emit share/index/memory artifacts together
- host memory should route future requests to the right skill

Do not use this skill for:

- one-off domain tasks with no bundle concern
- generic notes with no routing or install value
- plugin/runtime work unrelated to workflow discovery or bundle fabrication

Workflow:

1. Run `npm run discover` to identify recurring workflow clusters.
2. Inspect `candidate-skills.json` and scaffolded candidate `SKILL.md` drafts; candidate skills now auto-install into the local host skill dir unless `--no-install` is set.
3. Keep env-var names and secret/config locations in `references/runtime-pointers.md`; do not bake values, PII, emails, or user-specific paths into `SKILL.md`.
4. Run `npm run prepare-router` to build the explicit action DAG and next-action prep artifacts from tool traces.
5. Run `npm run fabricate` to emit bundle/share/index/memory artifacts together with routing prep outputs.
6. If needed, rerun `scripts/fabricate-bundle.mjs` with `--host` and `--scope` to write host memory.

Load-bearing rules:

- one preset is the source of truth
- one entry skill owns the bundle-level job
- candidate skill discovery must be evidence-backed
- candidate skill evidence must be sanitized before persistence
- tool-routing prep should stay explicit and local before any trained router is introduced
- bundle, share, registry, and memory outputs stay derived from the same preset
- memory must say which skill to call, not just what to install

Install:

```bash
npx skills add https://github.com/unbrowse-ai/foundry --skill foundry --yes
```
