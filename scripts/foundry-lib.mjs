import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const MARKER_BEGIN = "<!-- FOUNDRY_BUNDLE:BEGIN -->";
export const MARKER_END = "<!-- FOUNDRY_BUNDLE:END -->";
export const HOST_FILES = {
  codex: "AGENTS.md",
  claude: "CLAUDE.md",
  openclaw: "MEMORY.md",
};

const STOPWORDS = new Set([
  "about", "after", "agent", "align", "an", "and", "are", "around", "auto", "before", "between", "blockers",
  "build", "bundle", "call", "can", "change", "chat", "ci", "codex", "create", "current", "deploy", "docs",
  "for", "from", "get", "github", "have", "history", "host", "how", "into", "just", "keep", "local", "main",
  "make", "memory", "note", "now", "package", "publish", "release", "repo", "request", "route", "routing",
  "same", "share", "should", "skill", "skills", "surface", "sync", "that", "the", "their", "then", "this",
  "through", "turn", "update", "use", "user", "when", "with", "workflow", "workflows", "write",
]);

export function parseArgs(argv) {
  const flags = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return flags;
}

export function resolveHome() {
  return process.env.HOME || os.homedir();
}

export function resolveCodexHome() {
  return process.env.CODEX_HOME || path.join(resolveHome(), ".codex");
}

export function readPreset(presetPath) {
  if (!presetPath) throw new Error("--preset is required");
  return JSON.parse(readFileSync(path.resolve(presetPath), "utf8"));
}

export function validatePreset(preset) {
  const required = ["bundle_id", "title", "fabric", "repo", "bootstrap_skill", "skills", "routes", "share", "index"];
  for (const key of required) {
    if (!(key in preset)) throw new Error(`Missing preset field: ${key}`);
  }
  if (!preset.fabric?.repo || !preset.fabric?.skill) throw new Error("fabric.repo + fabric.skill required");
  if (!Array.isArray(preset.skills) || preset.skills.length === 0) throw new Error("skills[] required");
  if (!Array.isArray(preset.routes) || preset.routes.length === 0) throw new Error("routes[] required");
  if (!preset.share?.manifest_path) throw new Error("share.manifest_path required");
  if (!preset.index?.slug || !preset.index?.summary || !Array.isArray(preset.index.tags)) {
    throw new Error("index.slug, index.summary, index.tags[] required");
  }
  if (preset.history) {
    if (!Array.isArray(preset.history.sources) || !Array.isArray(preset.history.skills)) {
      throw new Error("history.sources[] and history.skills[] required when history exists");
    }
  }
  if (preset.dependency_graph && !Array.isArray(preset.dependency_graph.nodes)) {
    throw new Error("dependency_graph.nodes[] required when dependency_graph exists");
  }
  if (preset.tool_routing) {
    if (!Array.isArray(preset.tool_routing.sources)) {
      throw new Error("tool_routing.sources[] required when tool_routing exists");
    }
  }
  return preset;
}

export function fabricInstallCommand(preset) {
  return `npx skills add ${preset.fabric.repo} --skill ${preset.fabric.skill} --yes`;
}

export function bundleInstallCommands(preset) {
  return preset.skills.map((skill) => `npx skills add ${preset.repo} --skill ${skill} --yes`);
}

export function buildHostTargets() {
  return [
    { host: "codex", target_path: "./AGENTS.md", snippet_path: "hosts/codex/AGENTS.md" },
    { host: "claude", target_path: "./CLAUDE.md", snippet_path: "hosts/claude/CLAUDE.md" },
    { host: "openclaw", target_path: "./MEMORY.md", snippet_path: "hosts/openclaw/MEMORY.md" },
  ];
}

export function renderMemoryBlock(preset, host) {
  const lines = [
    MARKER_BEGIN,
    `## ${preset.title} (${host})`,
    "",
    "Install Foundry:",
    `- \`${fabricInstallCommand(preset)}\``,
    "",
    "Install bundled skills:",
    ...bundleInstallCommands(preset).map((command) => `- \`${command}\``),
    "",
    "Bundle entrypoint:",
    `- If the request is about mining chat history into skills, discovering candidate skills, fabricating a portable bundle, sharing it, indexing it, or writing host routing memory, call \`${preset.fabric.skill}\`.`,
    "",
    "Skill-call routing defaults:",
    ...preset.routes.map((route) => {
      const alternatives = Array.isArray(route.alternatives) && route.alternatives.length > 0
        ? ` If unavailable, use ${route.alternatives.map((skill) => `\`${skill}\``).join(" or ")}.`
        : "";
      return `- If ${route.when}, call \`${route.call}\`.${alternatives}`;
    }),
    "",
    `Use \`${preset.bootstrap_skill}\` first when available to confirm/install the right skill, then call \`${preset.fabric.skill}\` or the routed skill.`,
    MARKER_END,
    "",
  ];
  return lines.join("\n");
}

export function upsertManagedBlock(existing, block) {
  if (existing.includes(MARKER_BEGIN) && existing.includes(MARKER_END)) {
    return existing.replace(new RegExp(`${MARKER_BEGIN}[\\s\\S]*?${MARKER_END}\\n?`, "m"), block);
  }
  return `${existing.replace(/\s*$/, "")}${existing.trim().length > 0 ? "\n\n" : ""}${block}`;
}

export function targetFileFor(host, scope, cwd) {
  const home = resolveHome();
  const projectFiles = {
    codex: path.join(cwd, "AGENTS.md"),
    claude: path.join(cwd, "CLAUDE.md"),
    openclaw: path.join(cwd, "MEMORY.md"),
  };
  const agentFiles = {
    codex: path.join(home, ".codex", "AGENTS.md"),
    claude: path.join(home, ".claude", "CLAUDE.md"),
    openclaw: process.env.OPENCLAW_HOME ? path.join(process.env.OPENCLAW_HOME, "MEMORY.md") : null,
  };
  if (!(host in projectFiles)) throw new Error(`Unsupported host: ${host}`);
  if (scope === "project") return projectFiles[host];
  if (scope === "agent") {
    if (!agentFiles[host]) throw new Error(`No agent memory target for host: ${host}`);
    return agentFiles[host];
  }
  if (existsSync(projectFiles[host])) return projectFiles[host];
  if (agentFiles[host] && existsSync(agentFiles[host])) return agentFiles[host];
  return projectFiles[host];
}

export function buildBundleManifest(preset) {
  return {
    bundle_id: preset.bundle_id,
    title: preset.title,
    fabric: preset.fabric,
    repo: preset.repo,
    bootstrap_skill: preset.bootstrap_skill,
    skills: preset.skills,
    routes: preset.routes,
    dependency_graph: preset.dependency_graph,
    install_commands: {
      foundry: fabricInstallCommand(preset),
      bundle_skills: bundleInstallCommands(preset),
    },
    host_targets: buildHostTargets(),
    history: preset.history,
    share: preset.share,
    index: preset.index,
  };
}

export function buildShareManifest(preset) {
  return {
    bundle_id: preset.bundle_id,
    fabric: preset.fabric,
    transport: preset.share.transport,
    manifest_path: preset.share.manifest_path,
    repo: preset.repo,
    skills: preset.skills,
    dependency_graph: preset.dependency_graph,
    install_commands: {
      foundry: fabricInstallCommand(preset),
      bundle_skills: bundleInstallCommands(preset),
    },
    host_targets: buildHostTargets(),
  };
}

export function buildRegistryEntry(preset) {
  return {
    slug: preset.index.slug,
    title: preset.title,
    summary: preset.index.summary,
    tags: preset.index.tags,
    fabric: preset.fabric,
    repo: preset.repo,
    bundle_id: preset.bundle_id,
    bootstrap_skill: preset.bootstrap_skill,
    skills: preset.skills,
    routes: preset.routes,
    dependency_graph: preset.dependency_graph,
    history: preset.history,
  };
}

export function expandHome(inputPath) {
  if (!inputPath.startsWith("~/")) return inputPath;
  return path.join(resolveHome(), inputPath.slice(2));
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseHistoryFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return extractTexts(JSON.parse(line));
      } catch {
        return [];
      }
    })
    .map(normalizeText)
    .filter(Boolean);
}

function parseJsonlFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function extractTexts(parsed) {
  if (typeof parsed?.text === "string") return [parsed.text];
  if (typeof parsed?.thread_name === "string") return [parsed.thread_name];
  if (parsed?.type === "response_item" && parsed?.payload?.type === "message" && parsed?.payload?.role === "user") {
    const content = Array.isArray(parsed.payload.content) ? parsed.payload.content : [];
    return content
      .filter((item) => item?.type === "input_text" && typeof item?.text === "string")
      .map((item) => item.text);
  }
  return [];
}

export function loadHistoryTexts(preset) {
  const out = [];
  for (const source of preset.history?.sources ?? []) {
    const resolved = expandHome(source);
    if (!existsSync(resolved)) continue;
    if (statSync(resolved).isDirectory()) {
      for (const entry of readdirSync(resolved).filter((name) => name.endsWith(".jsonl"))) {
        out.push(...parseHistoryFile(path.join(resolved, entry)));
      }
      continue;
    }
    out.push(...parseHistoryFile(resolved));
  }
  return out;
}

export function scoreHistoryMatches(preset, texts) {
  return (preset.history?.skills ?? []).map((def) => {
    const matchers = def.matchers.map((matcher) => normalizeText(matcher));
    const evidence = texts.filter((text) => matchers.some((matcher) => text.includes(matcher))).slice(0, 8);
    return {
      skill: def.skill,
      min_hits: def.min_hits,
      hits: evidence.length,
      matched: evidence.length >= def.min_hits,
      evidence,
    };
  });
}

export function buildHistoryReport(preset) {
  if (!preset.history) return null;
  const texts = loadHistoryTexts(preset);
  return {
    bundle_id: preset.bundle_id,
    history_samples: texts.length,
    matches: scoreHistoryMatches(preset, texts),
  };
}

export function loadToolTraceSessions(preset) {
  const out = [];
  for (const source of preset.tool_routing?.sources ?? []) {
    const resolved = expandHome(source);
    if (!existsSync(resolved)) continue;
    if (statSync(resolved).isDirectory()) {
      for (const entry of readdirSync(resolved).filter((name) => name.endsWith(".jsonl"))) {
        out.push(...parseToolTraceFile(path.join(resolved, entry)));
      }
      continue;
    }
    out.push(...parseToolTraceFile(resolved));
  }
  return out;
}

function parseToolTraceFile(filePath) {
  return parseJsonlFile(filePath)
    .map(normalizeToolTraceRecord)
    .filter(Boolean);
}

function normalizeToolTraceRecord(record) {
  if (Array.isArray(record?.actions)) {
    const actions = record.actions
      .map((action, index) => normalizeToolAction(action, index))
      .filter(Boolean);
    if (actions.length === 0) return null;
    return {
      session_id: String(record.session_id || record.sessionId || `session-${Date.now()}`),
      goal: typeof record.goal === "string" ? record.goal : "",
      actions,
    };
  }
  if (record?.type === "tool_trace" && Array.isArray(record?.payload?.actions)) {
    const actions = record.payload.actions
      .map((action, index) => normalizeToolAction(action, index))
      .filter(Boolean);
    if (actions.length === 0) return null;
    return {
      session_id: String(record.payload.session_id || record.payload.sessionId || `session-${Date.now()}`),
      goal: typeof record.payload.goal === "string" ? record.payload.goal : "",
      actions,
    };
  }
  return null;
}

function normalizeToolAction(action, index) {
  if (!action) return null;
  const tool = action.tool || action.tool_name || action.name;
  if (typeof tool !== "string" || tool.trim().length === 0) return null;
  return {
    step: Number.isFinite(action.step) ? action.step : index,
    tool: tool.trim(),
    status: typeof action.status === "string" ? action.status : "success",
    domain: typeof action.domain === "string" ? action.domain : "",
  };
}

export function buildActionDag(sessions) {
  const nodeMap = new Map();
  const edgeMap = new Map();
  const goalMap = new Map();

  for (const session of sessions) {
    const actions = session.actions ?? [];
    const goal = typeof session.goal === "string" ? session.goal : "";
    if (actions.length > 0 && goal) {
      const firstTool = actions[0].tool;
      const key = `${goal}::${firstTool}`;
      goalMap.set(key, (goalMap.get(key) ?? 0) + 1);
    }
    for (let i = 0; i < actions.length; i += 1) {
      const action = actions[i];
      const node = nodeMap.get(action.tool) ?? {
        id: action.tool,
        count: 0,
        successes: 0,
        failures: 0,
        domains: new Set(),
      };
      node.count += 1;
      if (action.status === "success") node.successes += 1;
      else node.failures += 1;
      if (action.domain) node.domains.add(action.domain);
      nodeMap.set(action.tool, node);

      if (i === actions.length - 1) continue;
      const nextAction = actions[i + 1];
      const edgeKey = `${action.tool}=>${nextAction.tool}`;
      const edge = edgeMap.get(edgeKey) ?? {
        from: action.tool,
        to: nextAction.tool,
        count: 0,
        success_count: 0,
        failure_count: 0,
      };
      edge.count += 1;
      if (nextAction.status === "success") edge.success_count += 1;
      else edge.failure_count += 1;
      edgeMap.set(edgeKey, edge);
    }
  }

  return {
    nodes: Array.from(nodeMap.values()).map((node) => ({
      id: node.id,
      count: node.count,
      successes: node.successes,
      failures: node.failures,
      domains: Array.from(node.domains).sort(),
    })),
    edges: Array.from(edgeMap.values()).sort((a, b) => b.count - a.count),
    goal_starts: Array.from(goalMap.entries())
      .map(([key, count]) => {
        const [goal, first_tool] = key.split("::");
        return { goal, first_tool, count };
      })
      .sort((a, b) => b.count - a.count),
  };
}

export function buildNextActionDataset(sessions) {
  const examples = [];
  for (const session of sessions) {
    const actions = session.actions ?? [];
    for (let i = 0; i < actions.length; i += 1) {
      examples.push({
        session_id: session.session_id,
        goal: session.goal,
        current_path: actions.slice(0, i).map((action) => action.tool),
        next_action: actions[i].tool,
        next_status: actions[i].status,
      });
    }
  }
  return {
    examples,
    count: examples.length,
  };
}

export function buildToolRoutingReport(preset) {
  if (!preset.tool_routing) return null;
  const sessions = loadToolTraceSessions(preset);
  const dag = buildActionDag(sessions);
  const dataset = buildNextActionDataset(sessions);
  return {
    bundle_id: preset.bundle_id,
    session_count: sessions.length,
    node_count: dag.nodes.length,
    edge_count: dag.edges.length,
    action_dag: dag,
    next_action_dataset: dataset,
  };
}

function tokenize(text) {
  return Array.from(new Set(
    normalizeText(text)
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
  ));
}

function knownTokens(preset) {
  const tokens = new Set();
  for (const route of preset.routes ?? []) {
    for (const token of tokenize(route.when ?? "")) tokens.add(token);
  }
  for (const def of preset.history?.skills ?? []) {
    for (const matcher of def.matchers ?? []) {
      for (const token of tokenize(matcher)) tokens.add(token);
    }
  }
  return tokens;
}

function titleCase(value) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function renderCandidateSkill(candidate) {
  const triggerPhrases = candidate.tokens.map((token) => `- requests mention \`${token}\``);
  return `---
name: ${candidate.slug}
description: ${candidate.summary}
user-invocable: true
generated_by: foundry
candidate_skill: true
match_count: ${candidate.match_count}
---

# ${candidate.title}

Core job:

- ${candidate.summary}

Use this skill when:

- the same workflow keeps recurring in chat history
${triggerPhrases.join("\n")}
- the user wants the workflow packaged into a reusable skill or bundle

Do not use this skill for:

- one-off requests that do not repeat
- adjacent tasks that only share one token but not the workflow
- publishing or routing work with no need to define the workflow itself

Workflow:

1. Inspect the repeated request shape from the candidate evidence.
2. Reduce it to one core job.
3. Decide what belongs in \`SKILL.md\`, \`references/\`, and \`scripts/\`.
4. Generate the narrow skill surface and connect it to Foundry bundle routing if needed.

Load-bearing rules:

- one skill, one core job
- keep trigger language in the description
- move durable detail into references or scripts
- keep only the constraints that change behavior
`;
}

function normalizeInstallHost(host) {
  if (!host || host === "auto") {
    if (process.env.CODEX_HOME || existsSync(resolveCodexHome())) return "codex";
    if (existsSync(path.join(resolveHome(), ".claude"))) return "claude";
    return "codex";
  }
  if (host === "codex" || host === "claude" || host === "off") return host;
  throw new Error(`Unsupported install host: ${host}`);
}

function candidateInstallRootFor(host) {
  if (host === "codex") return path.join(resolveCodexHome(), "skills");
  if (host === "claude") return path.join(resolveHome(), ".claude", "skills");
  return null;
}

function isFoundryManagedSkill(text) {
  return /(^|\n)generated_by:\s*foundry\s*(\n|$)/.test(text);
}

export function installCandidateSkills(candidateReport, options = {}) {
  if (!candidateReport) {
    return {
      host: null,
      target_dir: null,
      installed: [],
      updated: [],
      skipped: [],
    };
  }

  const host = normalizeInstallHost(String(options.host || "auto"));
  if (host === "off") {
    return {
      host,
      target_dir: null,
      installed: [],
      updated: [],
      skipped: candidateReport.candidates.map((candidate) => ({
        skill: candidate.slug,
        reason: "install-disabled",
        path: null,
      })),
    };
  }

  const targetDir = candidateInstallRootFor(host);
  const installed = [];
  const updated = [];
  const skipped = [];

  for (const candidate of candidateReport.candidates) {
    const skillDir = path.join(targetDir, candidate.slug);
    const skillFile = path.join(skillDir, "SKILL.md");
    const nextText = renderCandidateSkill(candidate);

    mkdirSync(skillDir, { recursive: true });
    if (!existsSync(skillFile)) {
      writeText(skillFile, nextText);
      installed.push({ skill: candidate.slug, path: skillFile });
      continue;
    }

    const existing = readFileSync(skillFile, "utf8");
    if (existing === nextText || existing === `${nextText}\n`) {
      skipped.push({ skill: candidate.slug, reason: "unchanged", path: skillFile });
      continue;
    }
    if (!isFoundryManagedSkill(existing)) {
      skipped.push({ skill: candidate.slug, reason: "user-owned", path: skillFile });
      continue;
    }

    writeText(skillFile, nextText);
    updated.push({ skill: candidate.slug, path: skillFile });
  }

  return {
    host,
    target_dir: targetDir,
    installed,
    updated,
    skipped,
  };
}

export function discoverCandidateSkills(preset, texts, options = {}) {
  const threshold = Number(options.threshold ?? 3);
  const maxCandidates = Number(options.maxCandidates ?? 8);
  const known = knownTokens(preset);
  const pairMap = new Map();

  for (const text of texts) {
    const tokens = tokenize(text).slice(0, 6);
    if (tokens.length < 2) continue;
    const seen = new Set();
    for (let i = 0; i < tokens.length; i += 1) {
      for (let j = i + 1; j < tokens.length; j += 1) {
        const pair = [tokens[i], tokens[j]].sort();
        const key = pair.join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        const entry = pairMap.get(key) ?? { tokens: pair, count: 0, evidence: [] };
        entry.count += 1;
        if (entry.evidence.length < 6) entry.evidence.push(text);
        pairMap.set(key, entry);
      }
    }
  }

  const raw = Array.from(pairMap.values())
    .filter((entry) => entry.count >= threshold)
    .filter((entry) => entry.tokens.some((token) => !known.has(token)))
    .sort((a, b) => b.count - a.count);

  const candidates = [];
  const usedSlugs = new Set();
  for (const entry of raw) {
    const slug = entry.tokens.slice(0, 3).join("-");
    if (usedSlugs.has(slug)) continue;
    usedSlugs.add(slug);
    candidates.push({
      slug,
      title: titleCase(slug),
      summary: `Handle the recurring ${entry.tokens.join(" + ")} workflow as a reusable skill.`,
      tokens: entry.tokens,
      match_count: entry.count,
      evidence: entry.evidence,
    });
    if (candidates.length >= maxCandidates) break;
  }

  return {
    bundle_id: preset.bundle_id,
    generated_at: new Date().toISOString(),
    threshold,
    candidates,
  };
}

export function writeBundleArtifacts(preset, outRoot, options = {}) {
  const bundleDir = path.join(outRoot, preset.bundle_id);
  const historyReport = buildHistoryReport(preset);
  const texts = historyReport ? loadHistoryTexts(preset) : [];
  const candidateReport = historyReport ? discoverCandidateSkills(preset, texts, options) : null;
  const toolRoutingReport = buildToolRoutingReport(preset);
  const installResult = candidateReport && options.install !== false
    ? installCandidateSkills(candidateReport, { host: options.installHost })
    : null;

  writeJson(path.join(bundleDir, "bundle.json"), buildBundleManifest(preset));
  writeJson(path.join(bundleDir, "share.json"), buildShareManifest(preset));
  writeJson(path.join(bundleDir, "registry-entry.json"), buildRegistryEntry(preset));
  if (historyReport) writeJson(path.join(bundleDir, "history-report.json"), historyReport);
  if (toolRoutingReport) {
    writeJson(path.join(bundleDir, "tool-routing-report.json"), toolRoutingReport);
    writeJson(path.join(bundleDir, "action-dag.json"), toolRoutingReport.action_dag);
    writeJson(path.join(bundleDir, "next-action-dataset.json"), toolRoutingReport.next_action_dataset);
  }
  if (candidateReport) {
    writeJson(path.join(bundleDir, "candidate-skills.json"), candidateReport);
    for (const candidate of candidateReport.candidates) {
      writeText(path.join(bundleDir, "candidates", candidate.slug, "SKILL.md"), renderCandidateSkill(candidate));
    }
  }

  for (const target of buildHostTargets()) {
    writeText(path.join(bundleDir, target.snippet_path), renderMemoryBlock(preset, target.host));
  }

  return {
    bundle_id: preset.bundle_id,
    output_dir: bundleDir,
    files: [
      "bundle.json",
      "share.json",
      "registry-entry.json",
      ...(historyReport ? ["history-report.json"] : []),
      ...(toolRoutingReport ? ["tool-routing-report.json", "action-dag.json", "next-action-dataset.json"] : []),
      ...(candidateReport ? ["candidate-skills.json"] : []),
      ...buildHostTargets().map((target) => target.snippet_path),
    ],
    history_report: historyReport ? path.join(bundleDir, "history-report.json") : null,
    tool_routing_report: toolRoutingReport ? path.join(bundleDir, "tool-routing-report.json") : null,
    candidate_report: candidateReport ? path.join(bundleDir, "candidate-skills.json") : null,
    install_result: installResult,
  };
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function writeText(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`);
}
