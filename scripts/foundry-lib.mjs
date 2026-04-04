import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  compactSourceText,
  discoverCandidateSkills,
  installCandidateSkills,
  normalizeText,
  sanitizeEvidenceText,
  writeCandidateSkillScaffold,
} from "./foundry-candidates.mjs";

export const MARKER_BEGIN = "<!-- FOUNDRY_BUNDLE:BEGIN -->";
export const MARKER_END = "<!-- FOUNDRY_BUNDLE:END -->";
export const HOST_FILES = {
  codex: "AGENTS.md",
  claude: "CLAUDE.md",
  openclaw: "MEMORY.md",
};

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
  const required = ["bundle_id", "title", "fabric", "bootstrap_skill", "skills", "routes", "share", "index"];
  for (const key of required) {
    if (!(key in preset)) throw new Error(`Missing preset field: ${key}`);
  }
  if (!preset.fabric?.repo || !preset.fabric?.skill) throw new Error("fabric.repo + fabric.skill required");
  if (!Array.isArray(preset.skills) || preset.skills.length === 0) throw new Error("skills[] required");
  for (const skill of preset.skills) {
    if (typeof skill === "string") continue;
    if (!skill || typeof skill !== "object") {
      throw new Error("skills[] entries must be strings or objects");
    }
    const name = skill.name || skill.skill;
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("object skills[] entries require name");
    }
  }
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

function defaultSkillInstallCommand(repo, skillName) {
  return repo ? `npx skills add ${repo} --skill ${skillName} --yes` : "";
}

export function normalizeSkillEntry(skill, preset) {
  if (typeof skill === "string") {
    return {
      name: skill,
      repo: preset.repo || "",
      source_path: "",
      install_command: defaultSkillInstallCommand(preset.repo || "", skill),
    };
  }

  const name = String(skill.name || skill.skill || "").trim();
  const repo = String(skill.repo || preset.repo || "").trim();
  const source_path = String(skill.source_path || "").trim();
  const install_command = typeof skill.install === "string"
    ? skill.install.trim()
    : defaultSkillInstallCommand(repo, name);

  return {
    name,
    repo,
    source_path,
    install_command,
  };
}

export function presetSkillEntries(preset) {
  return (preset.skills ?? []).map((skill) => normalizeSkillEntry(skill, preset));
}

export function presetSkillNames(preset) {
  return presetSkillEntries(preset).map((skill) => skill.name);
}

export function fabricInstallCommand(preset) {
  return `npx skills add ${preset.fabric.repo} --skill ${preset.fabric.skill} --yes`;
}

export function bundleInstallCommands(preset) {
  return presetSkillEntries(preset)
    .map((skill) => skill.install_command)
    .filter(Boolean);
}

export function buildHostTargets() {
  return [
    { host: "codex", target_path: "./AGENTS.md", snippet_path: "hosts/codex/AGENTS.md" },
    { host: "claude", target_path: "./CLAUDE.md", snippet_path: "hosts/claude/CLAUDE.md" },
    { host: "openclaw", target_path: "./MEMORY.md", snippet_path: "hosts/openclaw/MEMORY.md" },
  ];
}

export function renderMemoryBlock(preset, host) {
  const installLines = presetSkillEntries(preset).map((skill) => {
    if (skill.install_command) return `- \`${skill.install_command}\``;
    if (skill.source_path) return `- \`${skill.name}\` — source: \`${skill.source_path}\``;
    return `- \`${skill.name}\` — install command not declared`;
  });
  const lines = [
    MARKER_BEGIN,
    `## ${preset.title} (${host})`,
    "",
    "Install Foundry:",
    `- \`${fabricInstallCommand(preset)}\``,
    "",
    "Install bundled skills:",
    ...installLines,
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
  const skillEntries = presetSkillEntries(preset);
  return {
    bundle_id: preset.bundle_id,
    title: preset.title,
    fabric: preset.fabric,
    repo: preset.repo || "",
    bootstrap_skill: preset.bootstrap_skill,
    skills: skillEntries.map((skill) => skill.name),
    skill_sources: skillEntries,
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
  const skillEntries = presetSkillEntries(preset);
  return {
    bundle_id: preset.bundle_id,
    fabric: preset.fabric,
    transport: preset.share.transport,
    manifest_path: preset.share.manifest_path,
    repo: preset.repo || "",
    skills: skillEntries.map((skill) => skill.name),
    skill_sources: skillEntries,
    dependency_graph: preset.dependency_graph,
    install_commands: {
      foundry: fabricInstallCommand(preset),
      bundle_skills: bundleInstallCommands(preset),
    },
    host_targets: buildHostTargets(),
  };
}

export function normalizeSiteUrl(siteUrl) {
  return String(siteUrl || process.env.FOUNDRY_SITE_URL || "https://www.unbrowse.ai")
    .trim()
    .replace(/\/+$/, "");
}

export function publicManifestPathFor(preset, publicRoot) {
  if (!publicRoot) throw new Error("publicRoot is required");
  if (!preset.share?.manifest_path) throw new Error("share.manifest_path required");
  return path.resolve(publicRoot, String(preset.share.manifest_path).replace(/^\/+/, ""));
}

export function writePublicShareManifest(preset, publicRoot) {
  const target = publicManifestPathFor(preset, publicRoot);
  writeJson(target, buildShareManifest(preset));
  return target;
}

export function buildPublicShareUrl(preset, siteUrl) {
  if (!preset.share?.manifest_path) throw new Error("share.manifest_path required");
  return `${normalizeSiteUrl(siteUrl)}${preset.share.manifest_path}`;
}

export function buildRegistryEntry(preset) {
  const skillEntries = presetSkillEntries(preset);
  return {
    slug: preset.index.slug,
    title: preset.title,
    summary: preset.index.summary,
    tags: preset.index.tags,
    fabric: preset.fabric,
    repo: preset.repo || "",
    bundle_id: preset.bundle_id,
    bootstrap_skill: preset.bootstrap_skill,
    skills: skillEntries.map((skill) => skill.name),
    skill_sources: skillEntries,
    routes: preset.routes,
    dependency_graph: preset.dependency_graph,
    history: preset.history,
  };
}

export function expandHome(inputPath) {
  if (!inputPath.startsWith("~/")) return inputPath;
  return path.join(resolveHome(), inputPath.slice(2));
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
    .map(compactSourceText)
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
  if (parsed?.isMeta) return [];
  if (parsed?.type === "user" && parsed?.message?.role === "user") {
    const content = parsed.message.content;
    if (typeof content === "string") return [content];
    if (Array.isArray(content)) {
      return content
        .filter((item) => item?.type === "text" && typeof item?.text === "string")
        .map((item) => item.text);
    }
  }
  return [];
}

function collectJsonlFiles(inputPath) {
  if (!existsSync(inputPath)) return [];
  const stat = statSync(inputPath);
  if (stat.isFile()) return [inputPath];
  if (!stat.isDirectory()) return [];

  const out = [];
  for (const entry of readdirSync(inputPath)) {
    const entryPath = path.join(inputPath, entry);
    try {
      const entryStat = statSync(entryPath);
      if (entryStat.isDirectory()) {
        out.push(...collectJsonlFiles(entryPath));
        continue;
      }
      if (entryStat.isFile() && entry.endsWith(".jsonl")) out.push(entryPath);
    } catch {
      // skip broken entries
    }
  }
  return out;
}

export function loadHistoryTexts(preset) {
  const out = [];
  for (const source of preset.history?.sources ?? []) {
    const resolved = expandHome(source);
    if (!existsSync(resolved)) continue;
    try {
      for (const filePath of collectJsonlFiles(resolved)) {
        try {
          out.push(...parseHistoryFile(filePath));
        } catch {
          // skip unreadable files
        }
      }
    } catch {
      // skip unreadable sources
    }
  }
  return out;
}

export function scoreHistoryMatches(preset, texts) {
  return (preset.history?.skills ?? []).map((def) => {
    const matchers = def.matchers.map((matcher) => normalizeText(matcher));
    const evidence = texts
      .filter((text) => matchers.some((matcher) => normalizeText(text).includes(matcher)))
      .slice(0, 8)
      .map(sanitizeEvidenceText);
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
    for (const filePath of collectJsonlFiles(resolved)) {
      out.push(...parseToolTraceFile(filePath));
    }
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
      writeCandidateSkillScaffold(path.join(bundleDir, "candidates", candidate.slug), candidate);
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
