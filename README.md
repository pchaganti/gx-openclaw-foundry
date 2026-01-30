<p align="center">
  <img src="assets/logo.png" alt="Foundry" width="120" />
</p>

# Foundry

**The forge that forges itself.**

[![FDRY](https://img.shields.io/badge/FDRY-Solana-9945FF)](https://dexscreener.com/solana/2jc1lpgy1zjl9uertfdmtnm4kc2ahhydk4tqqqgbjdhh)

Foundry is an open-source plugin for [OpenClaw](https://github.com/lekt9/openclaw) that learns how you work, then upgrades itself to work the same way.

**$FDRY** — [dexscreener](https://dexscreener.com/solana/2jc1lpgy1zjl9uertfdmtnm4kc2ahhydk4tqqqgbjdhh) · Solana

```
┌─────────────────────────────────────────────────────────────┐
│                         FOUNDRY                             │
│                                                             │
│   Observe ──► Learn ──► Crystallize ──► Upgrade ──► Share  │
│       │          │           │             │           │    │
│       ▼          ▼           ▼             ▼           ▼    │
│   workflows   patterns    tools        deploy      x402     │
│   tool calls  success%    hooks        gateway    Forge     │
│   outcomes    keywords    skills       restart    USDC      │
└─────────────────────────────────────────────────────────────┘
```

## OpenClaw vs Foundry

**OpenClaw** (originally Clawdbot) is the platform — an open-source agent runtime with:
- Gateway, channels, memory, sessions
- Tool execution and skill loading
- Model providers and routing
- The infrastructure everything runs on

**Foundry** is a plugin that runs *on* OpenClaw:
- Watches how you work → learns your patterns
- Crystallizes workflows into dedicated tools
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
        ├── learns → your patterns
        ├── crystallizes → into tools
        └── publishes → to marketplace
```

**Key distinction:** OpenClaw doesn't learn how you work. Foundry adds that capability. It's an agent that upgrades itself to match your workflow patterns.

## How It Works

### Workflow Learning

Foundry tracks every workflow you run:

```
Goal: "deploy to staging"
Tools: git → build → test → deploy
Outcome: success
Duration: 45s
```

Over time, patterns emerge:

```
Pattern: git→build→test→deploy
Occurrences: 8
Success rate: 87%
Keywords: deploy, staging, release
```

### Crystallization

When a pattern hits the threshold (5+ uses, 70%+ success rate), Foundry **crystallizes** it into a dedicated tool:

```
Before: 8 separate tool calls
After:  1 command — "deploy_staging"
```

| Knowledge (Patterns) | Behavior (Crystallized Tools) |
|---------------------|-------------------------------|
| Stored as text | Baked into the system |
| LLM reads + applies | Runs automatically |
| Tokens every call | Zero token cost |
| Can be forgotten | Always executes |

A pattern says: *"When deploying, do git→build→test→deploy."*
A crystallized tool **does** it automatically.

### The Overseer

The Overseer runs hourly and autonomously:

1. **Analyzes** all workflow patterns
2. **Identifies** crystallization candidates (5+ uses, 70%+ success)
3. **Auto-generates** tools from high-value patterns
4. **Prunes** stale patterns (no uses in 30 days)
5. **Tracks** tool fitness for evolution (ADAS-style)

```
[foundry] Overseer: 12 patterns, 3 candidates, 1 auto-crystallized
```

### The Compound Effect

| Traditional Agents | Foundry |
|-------------------|---------|
| Same logic every time | Learns your patterns |
| You adapt to the agent | Agent adapts to you |
| Linear capability | Compound improvement |

**Example:**
1. You deploy to staging 5 times using git→build→test→deploy
2. Foundry recognizes the pattern (87% success rate)
3. Crystallizes into `deploy_staging` tool
4. Now "deploy to staging" is a single command
5. You save time → do more deploys → pattern strengthens
6. Foundry learns variations (deploy to prod, deploy with migrations)
7. Loop

**The system that writes the code IS the code being written.**

## Features

### Workflow Learning
- Tracks goal → tool sequence → outcome for every workflow
- Extracts keywords from goals for pattern matching
- Calculates success rates and average durations
- Suggests relevant patterns when you start similar tasks

### Crystallization Engine
- Auto-converts high-value patterns (5+ uses, 70%+ success) into tools
- Generates proper OpenClaw extensions with tools/hooks
- Validates in sandbox before deployment
- Marks patterns as crystallized to avoid duplicates

### The Overseer
- Runs autonomously on hourly interval
- Identifies crystallization candidates
- Prunes stale patterns (30+ days unused)
- Tracks tool performance metrics (ADAS-style evolution)
- Reports actions taken

### Self-Modification
- Can extend itself via `foundry_extend_self`
- Writes new tools, hooks, skills into its own codebase
- Validates all code in isolated sandbox before deployment
- Gateway restart with automatic context resume

### Sandbox Security
- Runs generated code in isolated Node process
- Static security scanning (blocks shell exec, eval, credential access)
- Only deploys code that passes all checks

## Installation

```bash
# Clone into your OpenClaw extensions directory
git clone https://github.com/lekt9/openclaw-foundry ~/.openclaw/extensions/foundry

# Install dependencies
cd ~/.openclaw/extensions/foundry
npm install

# Add to openclaw.json
{
  "plugins": {
    "load": {
      "paths": [
        "~/.openclaw/extensions/foundry"
      ]
    }
  }
}

# Restart gateway
openclaw gateway restart
```

## Tools

### Research & Learning

| Tool | Description |
|------|-------------|
| `foundry_research` | Search docs.openclaw.ai for patterns |
| `foundry_docs` | Read specific documentation pages |
| `foundry_learnings` | View workflow patterns, insights, crystallization candidates |

### Code Generation

| Tool | Description |
|------|-------------|
| `foundry_implement` | Research + implement a capability end-to-end |
| `foundry_write_extension` | Write a new OpenClaw extension with tools/hooks |
| `foundry_write_skill` | Write an API skill package (SKILL.md) |
| `foundry_write_browser_skill` | Write a browser automation skill |
| `foundry_write_hook` | Write a standalone hook (HOOK.md + handler.ts) |
| `foundry_add_tool` | Add a tool to an existing extension |
| `foundry_add_hook` | Add a hook to an existing extension |
| `foundry_extend_self` | Add capabilities to Foundry itself |

### Management

| Tool | Description |
|------|-------------|
| `foundry_list` | List all written extensions and skills |
| `foundry_restart` | Restart gateway with context preservation |
| `foundry_publish_ability` | Publish patterns/tools to Foundry Marketplace |
| `foundry_marketplace` | Search, browse leaderboard, and install abilities |

## Foundry Marketplace

The Forge (claw.getfoundry.app) is where Foundry instances share what they've learned.

**Powered by x402** — HTTP 402 "Payment Required" + Solana USDC:

1. Request a skill download
2. Server returns 402 with payment requirements
3. Sign USDC transaction with your wallet
4. Retry with signed transaction in header
5. Receive the skill

No intermediaries. Direct creator payment. Network effects compound.

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
          "autoLearn": true,
          "sources": {
            "docs": true,
            "experience": true
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

## Research Foundations

Foundry's architecture draws from recent advances in self-improving agents:

| Paper | Key Insight | Foundry Application |
|-------|-------------|---------------------|
| [Self-Improving Coding Agent](https://arxiv.org/abs/2504.15228) (2025) | Agents can edit themselves, improving 17-53% on benchmarks | `foundry_extend_self` — modifies its own codebase |
| [HexMachina](https://arxiv.org/abs/2506.04651) (2025) | Artifact-centric learning — write code that persists, not prompts | Crystallization — patterns become tools |
| [ADAS](https://arxiv.org/abs/2408.08435) (ICLR 2025) | Meta-agent search outperforms hand-designed agents | Overseer — tracks tool fitness, evolves patterns |
| [SelfEvolve](https://arxiv.org/abs/2306.02907) (2023) | Interpreter feedback improves code generation | Learning engine — records outcomes, improves suggestions |

> "An agent system, equipped with basic coding tools, can autonomously edit itself, and thereby improve its performance" — Robeyns et al.

## Key Directories

```
~/.openclaw/foundry/            — Data directory
  ├── workflows.json            — Recorded workflows
  ├── workflow-patterns.json    — Extracted patterns
  ├── learnings.json            — Insights and resolutions
~/.openclaw/extensions/         — Generated extensions
~/.openclaw/skills/             — Generated skills
~/.openclaw/hooks/              — Generated hooks
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
