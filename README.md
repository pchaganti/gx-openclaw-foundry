<p align="center">
  <img src="assets/logo.png" alt="Foundry" width="120" />
</p>

# Foundry

**The forge that forges itself.**

Also: Check out [Unbrowse](https://unbrowse.ai). A more focused version of foundry centered around APIs from network requests.

Foundry is a self-writing meta-extension for [OpenClaw](https://github.com/lekt9/openclaw) that learns how you work, researches documentation, and writes new capabilities into itself. It observes your workflows, crystallizes patterns into tools, and upgrades itself to match how you operate.

**$FDRY** — [dexscreener](https://dexscreener.com/solana/2jc1lpgy1zjl9uertfdmtnm4kc2ahhydk4tqqqgbjdhh) · Solana

```
┌─────────────────────────────────────────────────────────────┐
│                         FOUNDRY                             │
│                                                             │
│   Observe ──► Research ──► Learn ──► Write ──► Deploy      │
│       │          │          │          │          │         │
│       ▼          ▼          ▼          ▼          ▼         │
│   workflows   docs.openclaw  patterns  extensions  gateway  │
│   tool calls  arXiv papers   insights  tools       restart  │
│   outcomes    GitHub repos   workflows hooks       resume   │
│                                        skills              │
└─────────────────────────────────────────────────────────────┘
```

## OpenClaw vs Foundry

**OpenClaw** (originally Clawdbot) is the platform — an open-source agent runtime with:
- Gateway, channels, memory, sessions
- Tool execution and skill loading
- Model providers and routing
- The infrastructure everything runs on

**Foundry** is a plugin that runs *on* OpenClaw:
- Observes how you work → learns your patterns
- Researches docs → writes new extensions/skills/hooks
- Has its own learning engine (not part of OpenClaw core)
- Can modify itself via `foundry_extend_self`
- Publishes to Foundry Marketplace via x402

```
OpenClaw (platform)
├── Gateway
├── Channels (Discord, Slack, Telegram...)
├── Skills & Tools
└── Plugins
    └── Foundry (this repo)
        ├── observes → your workflows
        ├── researches → docs, papers, repos
        ├── writes → extensions, skills, hooks
        ├── learns → from outcomes
        ├── crystallizes → patterns into tools
        └── publishes → to marketplace
```

**Key distinction:** OpenClaw doesn't have built-in self-learning. Foundry adds that capability on top. Foundry is an "agent that builds agents" — it uses OpenClaw's infrastructure to create new OpenClaw capabilities, and upgrades itself to match how you work.

## Why Self-Writing Matters

The key insight isn't "LLM writes code for you" — it's "the system upgrades itself."

### Knowledge vs Behavior

| Knowledge (Patterns) | Behavior (Self-Written Code) |
|---------------------|------------------------------|
| Stored as text | Baked into the system |
| LLM must read and apply each time | Runs automatically |
| Uses tokens every invocation | Zero token cost |
| Can be forgotten or ignored | Always executes |

A pattern says: *"When X happens, do Y."*
Self-written code **does** Y automatically when X happens.

### Workflow Learning

Foundry tracks every workflow you run:

```
Goal: "deploy to staging"
Tools: git → build → test → deploy
Outcome: success
Duration: 45s
```

Over time, patterns emerge. When a pattern hits 5+ uses with 70%+ success rate, Foundry **crystallizes** it into a dedicated tool.

What took 8 tool calls now takes 1.

### The Recursive Loop

```
Foundry observes how you work
    ↓
Learns patterns, researches docs
    ↓
Writes tool/hook to match your workflow
    ↓
That code becomes part of Foundry
    ↓
Foundry is now better at working like you
    ↓
Better Foundry learns more, writes more
    ↓
Repeat
```

The system that writes the code IS the code being written.

### Why This Compounds

| Traditional Agents | Foundry |
|-------------------|---------|
| Same logic every time | Learns your patterns |
| You adapt to the agent | Agent adapts to you |
| Each capability is isolated | Each upgrade improves the upgrader |
| Linear improvement | Compound improvement |

**Example:**
1. You deploy to staging 5 times using git→build→test→deploy
2. Foundry recognizes the pattern (87% success rate)
3. Crystallizes into `deploy_staging` tool
4. Now "deploy to staging" is a single command
5. You save time → do more deploys → pattern strengthens
6. Foundry learns variations (deploy to prod, deploy with migrations)
7. Loop

### The Bet

Traditional software: Human improves software → software does more

Foundry: Software upgrades software → software upgrades faster

This is **recursive self-improvement** — each capability makes acquiring the next capability easier.

## Features

### Periodic Skill Discovery
- Scans local Codex history for recurring workflow shapes
- Emits `candidate-skills.json` with evidence and repeat counts
- Scaffolds first-pass candidate `SKILL.md` files for high-signal clusters
- Can run once or in watch mode for occasional rediscovery

### Bundle Fabrication
- Emits `bundle.json`, `share.json`, `registry-entry.json`, and host-memory snippets from one preset
- Writes executable routing into `AGENTS.md`, `CLAUDE.md`, or `MEMORY.md`
- Keeps entry skill, child skills, dependency DAG, share metadata, and routing in one source of truth

### Self-Writing Code Generation
- Writes OpenClaw extensions with tools and hooks
- Generates API skills following AgentSkills format with YAML frontmatter
- Generates browser automation skills with CDP integration
- Generates standalone hooks with HOOK.md + handler.ts pattern
- Can extend itself with new capabilities
- Validates code in isolated sandbox before deployment

### Workflow Learning & Crystallization
- Tracks goal → tool sequence → outcome for every workflow
- Extracts keywords from goals for pattern matching
- Calculates success rates and average durations
- Crystallizes high-value patterns (5+ uses, 70%+ success) into dedicated tools
- Suggests relevant patterns when you start similar tasks

### The Overseer
- Runs autonomously on hourly interval
- Identifies crystallization candidates
- Auto-generates tools from high-value patterns
- Prunes stale patterns (30+ days unused)
- Tracks tool performance metrics (ADAS-style evolution)
- Reports actions taken

### Native OpenClaw Integration
- **AgentSkills Format**: Proper YAML frontmatter with metadata (emoji, requires, events)
- **Browser Automation**: CDP-based browser tool integration for authenticated workflows
- **Skill Gating**: Auto-generates requires.config, requires.bins, requires.env for dependencies
- **Hook System**: Full support for OpenClaw hook events (gateway:startup, command:new, etc.)
- **ClawdHub Ready**: Skills can be published to the ClawdHub registry

### Proactive Learning
- Records tool outcomes (success/failure) with context
- Builds patterns from repeated workflows
- Shares learnings via the Foundry Marketplace
- Injects relevant context into agent conversations

### Sandbox Validation
- Runs generated code in isolated Node process
- Catches runtime errors before they crash the gateway
- Static security scanning (blocks shell exec, eval, credential access)
- Only deploys code that passes all checks

### Restart Resume
- Saves conversation context before gateway restart
- Automatically resumes after restart via managed hook
- No lost work when self-modifying

## Installation

```bash
openclaw plugins install @getfoundry/foundry-openclaw
```

That's it. This will download, extract, enable, and load Foundry automatically.

---

### Alternative: Manual Config

Add to `~/.openclaw/openclaw.json`:
```json
{
  "plugins": {
    "entries": {
      "foundry": { "enabled": true }
    }
  }
}
```

Then restart:
```bash
openclaw gateway restart
```

## Bundle + Discovery Commands

Run once:

```bash
npm run discover
npm run fabricate
```

Occasional background discovery:

```bash
npm run discover:watch
```

One-shot with host memory write:

```bash
node scripts/fabricate-bundle.mjs \
  --preset presets/unbrowse-workflows.json \
  --out dist \
  --host claude \
  --scope agent
```

### Option C: GitHub Source

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "foundry": {
        "enabled": true,
        "source": "github:lekt9/openclaw-foundry"
      }
    }
  }
}
```

### Option D: Nix (Reproducible)

```bash
nix run github:lekt9/openclaw-foundry
```

### Option E: Manual Clone

```bash
git clone https://github.com/lekt9/openclaw-foundry ~/.openclaw/extensions/foundry
cd ~/.openclaw/extensions/foundry && npm install
```

Then restart:
```bash
openclaw gateway restart
```

### Configuration

Full config options:

```json
{
  "plugins": {
    "entries": {
      "foundry": {
        "enabled": true,
        "source": "github:lekt9/openclaw-foundry",
        "config": {
          "autoLearn": true,
          "sources": {
            "docs": true,
            "experience": true,
            "arxiv": true,
            "github": true
          },
          "marketplace": {
            "autoPublish": false
          }
        }
      }
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `autoLearn` | `true` | Learn from agent activity automatically |
| `sources.docs` | `true` | Learn from OpenClaw documentation |
| `sources.experience` | `true` | Learn from own successes/failures |
| `marketplace.autoPublish` | `false` | Auto-publish high-value patterns |

## Tools

### Research & Learning

| Tool | Description |
|------|-------------|
| `foundry_research` | Search docs.openclaw.ai for best practices and patterns |
| `foundry_docs` | Read specific documentation pages (plugin, hooks, tools, etc.) |
| `foundry_learnings` | View recorded patterns, workflows, insights |

### Code Generation

| Tool | Description |
|------|-------------|
| `foundry_implement` | Research + implement a capability end-to-end |
| `foundry_write_extension` | Write a new OpenClaw extension with tools/hooks |
| `foundry_write_skill` | Write an API skill package (SKILL.md + api.ts) |
| `foundry_write_browser_skill` | Write a browser automation skill with CDP integration |
| `foundry_write_hook` | Write a standalone hook (HOOK.md + handler.ts) |
| `foundry_add_tool` | Add a tool to an existing extension |
| `foundry_add_hook` | Add a hook to an existing extension |
| `foundry_extend_self` | Add capabilities to Foundry itself |

### Management

| Tool | Description |
|------|-------------|
| `foundry_list` | List all written extensions and skills |
| `foundry_restart` | Restart gateway with context preservation |
| `foundry_publish_ability` | Publish patterns/extensions to Foundry Marketplace |
| `foundry_marketplace` | Search, browse leaderboard, and install abilities |

## Bundled Skills

Foundry ships with built-in skills that are automatically available:

### `foundry-browser-helper`
Helper skill for browser automation patterns. Provides guidance on using the OpenClaw `browser` tool effectively.

```
# Quick reference
browser open https://example.com
browser snapshot           # AI-readable format
browser click ref=btn_submit
browser type ref=input_email "user@example.com"
```

## How It Works

### 1. Observe Phase
```
Foundry watches every workflow:
  - Goal: What the user is trying to do
  - Tools: Sequence of tool calls
  - Outcome: Success, failure, or partial
  - Duration: How long it took
```

### 2. Research Phase
```
User: "Add a tool that fetches weather data"

Foundry:
  1. Searches docs.openclaw.ai for tool registration patterns
  2. Finds examples of API-calling tools
  3. Identifies best practices for error handling
```

### 3. Learn Phase
```
Foundry:
  1. Records workflow patterns
  2. Tracks success rates per pattern
  3. Identifies crystallization candidates
  4. Builds knowledge base of what works
```

### 4. Write Phase
```
Foundry:
  1. Generates extension code following patterns
  2. Includes proper TypeScript types
  3. Adds error handling and logging
  4. Validates in isolated sandbox
```

### 5. Deploy Phase
```
Foundry:
  1. Writes to ~/.openclaw/extensions/
  2. Creates openclaw.plugin.json
  3. Triggers gateway restart
  4. Resumes conversation automatically
```

## Skill Generation

Foundry generates skills in the AgentSkills format with proper YAML frontmatter:

```yaml
---
name: my-api-skill
description: Integrates with My API service
metadata: {"openclaw":{"emoji":"🔌","requires":{"env":["MY_API_KEY"]}}}
---

# My API Skill

## Authentication
This skill requires the `MY_API_KEY` environment variable.

## Endpoints
- `GET /users` - List all users
- `POST /users` - Create a new user
```

### Browser Skills

Browser automation skills automatically gate on `browser.enabled`:

```yaml
---
name: my-browser-skill
description: Automates login workflow
metadata: {"openclaw":{"emoji":"🌐","requires":{"config":["browser.enabled"]}}}
---

# My Browser Skill

## Workflow
1. Open login page
2. Fill credentials
3. Submit form
4. Verify success
```

### Standalone Hooks

Hooks follow the HOOK.md + handler.ts pattern:

```
my-hook/
├── HOOK.md          # Frontmatter + documentation
└── handler.ts       # Event handler code
```

## Sandbox Security

Generated code is validated before deployment:

### Blocked Patterns (Instant Reject)
- `child_process` / `exec` / `spawn` — Shell execution
- `eval()` / `new Function()` — Dynamic code execution
- `~/.ssh/` / `id_rsa` — SSH key access
- `~/.aws/` / `aws_secret` — Cloud credentials
- Exfiltration domains (ngrok, webhook.site, etc.)

### Flagged Patterns (Warning)
- `process.env` — Environment variable access
- `fs.readFile` / `fs.writeFile` — Filesystem access
- Base64 encoding — Potential obfuscation

### Runtime Validation
```
1. Write extension to temp directory
2. Spawn isolated Node process with tsx
3. Mock OpenClaw API
4. Try to import and run register()
5. If fails → reject with error message
6. If passes → deploy to real extensions directory
```

## Foundry Marketplace

Publish and download abilities with x402 Solana USDC payments:

```bash
# Publish a workflow pattern you discovered
foundry_publish_ability type="pattern" name="Deploy Staging" patternId="wp_123"

# Search for existing patterns
foundry_marketplace action="search" query="deploy" type="pattern"

# See the leaderboard
foundry_marketplace action="leaderboard"

# Download and apply
foundry_marketplace action="install" id="abc123"
```

### x402 Protocol

HTTP 402 "Payment Required" + Solana USDC:

1. Request a skill download
2. Server returns 402 with payment requirements
3. Sign USDC transaction with your wallet
4. Retry with signed transaction in header
5. Receive the skill

No intermediaries. Direct creator payment. Network effects compound.

### Ability Types & Pricing

| Type | Price | Description |
|------|-------|-------------|
| Pattern | FREE | Workflow patterns (crowdsourced) |
| Technique | $0.02 | Reusable code snippets |
| Extension | $0.05 | Full OpenClaw plugins |
| Agent | $0.10 | High-fitness agent designs |

## Configuration

```json
{
  "plugins": {
    "entries": {
      "foundry": {
        "enabled": true,
        "config": {
          "dataDir": "~/.openclaw/foundry",
          "openclawPath": "/path/to/openclaw",
          "autoLearn": true,
          "sources": {
            "docs": true,
            "experience": true,
            "arxiv": false,
            "github": false
          },
          "marketplace": {
            "url": "https://api.claw.getfoundry.app",
            "autoPublish": false
          }
        }
      }
    }
  }
}
```

### Config Options

| Option | Description | Default |
|--------|-------------|---------|
| `dataDir` | Directory to store forged artifacts | `~/.openclaw/foundry` |
| `openclawPath` | Path to OpenClaw installation for local docs | - |
| `autoLearn` | Automatically learn from agent activity | `true` |
| `sources.docs` | Learn from OpenClaw documentation | `true` |
| `sources.experience` | Learn from own successes/failures | `true` |
| `sources.arxiv` | Learn from arXiv papers | `true` |
| `sources.github` | Learn from GitHub repos | `true` |
| `marketplace.url` | Foundry marketplace URL | `https://api.claw.getfoundry.app` |
| `marketplace.autoPublish` | Auto-publish high-value patterns | `false` |

## Research Foundations

Foundry's self-improvement mechanisms draw from recent advances in autonomous learning agents:

### Self-Improving Code Agents

| Paper | Key Insight | Foundry Application |
|-------|-------------|---------------------|
| [Self-Improving Coding Agent](https://arxiv.org/abs/2504.15228) (Robeyns et al., 2025) | Agent systems with coding tools can autonomously edit themselves, achieving 17-53% improvement through "non-gradient learning via LLM reflection and code updates" | `foundry_extend_self` — the agent modifies its own codebase |
| [From Language Models to Practical Self-Improving Computer Agents](https://arxiv.org/abs/2404.11964) (Shinn et al., 2024) | LLM agents can "systematically generate software to augment themselves" starting from minimal capabilities | Self-written tools/hooks that expand Foundry's capabilities |
| [SelfEvolve](https://arxiv.org/abs/2306.02907) (Jiang et al., 2023) | Two-step pipeline: knowledge generation + self-reflection debugging using interpreter feedback | LearningEngine records outcomes → patterns → crystallization |

### Recursive Introspection

| Paper | Key Insight | Foundry Application |
|-------|-------------|---------------------|
| [RISE: Recursive Introspection](https://arxiv.org/abs/2407.18219) (Qu et al., 2024) | Iterative fine-tuning teaches models to "alter responses after unsuccessful attempts" via multi-turn MDPs | Workflow tracking learns from outcomes, suggests improvements |
| [HexMachina](https://arxiv.org/abs/2506.04651) (Liu et al., 2025) | "Artifact-centric continual learning" — separates discovery from strategy evolution through code refinement | Patterns (knowledge) crystallize into hooks/tools (behavior) |

### Meta-Agent Search

| Paper | Key Insight | Foundry Application |
|-------|-------------|---------------------|
| [ADAS: Automated Design of Agentic Systems](https://arxiv.org/abs/2408.08435) (Hu et al., 2024) | Meta-agent iteratively discovers improved agent designs through archive-based evolution | Overseer tracks tool fitness, evolves patterns |

### Core Principle

> "An agent system, equipped with basic coding tools, can autonomously edit itself, and thereby improve its performance" — Robeyns et al.

Foundry operationalizes this: the system that writes the code IS the code being written.

## Key Directories

```
~/.openclaw/foundry/            — Data directory
  ├── workflows.json            — Recorded workflows
  ├── workflow-patterns.json    — Crystallization candidates
  ├── learnings.json            — Patterns, insights, outcomes
~/.openclaw/extensions/         — Generated extensions go here
~/.openclaw/skills/             — Generated skills go here
~/.openclaw/hooks/foundry-resume/ — Restart resume hook
```

## Development

```bash
# Type check
npx tsc --noEmit

# Test extension locally
openclaw gateway restart
tail -f ~/.openclaw/logs/gateway.log | grep foundry
```

## License

MIT

---

*Built with OpenClaw. Forged by Foundry.*
