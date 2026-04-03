import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const STOPWORDS = new Set([
  "about", "after", "agent", "align", "an", "and", "are", "around", "auto", "before", "between", "blockers",
  "build", "bundle", "call", "can", "change", "chat", "ci", "codex", "create", "current", "deploy", "docs",
  "error", "file", "files", "for", "from", "get", "github", "have", "history", "host", "how", "into", "just",
  "keep", "local", "main", "make", "memory", "note", "now", "package", "path", "publish", "release", "repo",
  "request", "route", "routing", "same", "share", "should", "skill", "skills", "source", "surface", "sync",
  "that", "the", "their", "then", "this", "through", "turn", "update", "use", "user", "users", "when", "with",
  "workflow", "workflows", "write",
]);

const SECRET_VALUE_PATTERNS = [
  /\b(sk-[A-Za-z0-9_-]{12,})\b/g,
  /\b(ghp_[A-Za-z0-9]{20,})\b/g,
  /\b(github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
  /\b(AKIA[0-9A-Z]{16})\b/g,
  /\b(ya29\.[A-Za-z0-9._-]{20,})\b/g,
];

function resolveHome() {
  return process.env.HOME || os.homedir();
}

function resolveCodexHome() {
  return process.env.CODEX_HOME || path.join(resolveHome(), ".codex");
}

export function compactSourceText(text) {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeText(text) {
  return compactSourceText(text).toLowerCase();
}

function sanitizeUserPaths(text) {
  return text
    .replace(/\/Users\/[^/\s"']+/g, "~")
    .replace(/\/home\/[^/\s"']+/g, "~");
}

function redactEmails(text) {
  return text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "<redacted-email>");
}

function redactHandles(text) {
  return text.replace(/(^|[\s(])@[A-Za-z0-9_.-]+/g, "$1<redacted-handle>");
}

function redactIps(text) {
  return text.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "<redacted-ip>");
}

function redactSecretAssignments(text) {
  return text.replace(/\b([A-Z][A-Z0-9_]{2,})\s*=\s*([^\s"'`]+)/g, (full, name) => {
    if (!looksLikeEnvName(name)) return full;
    return `${name}=<redacted-secret>`;
  });
}

function redactSecretValues(text) {
  return SECRET_VALUE_PATTERNS.reduce((out, pattern) => out.replace(pattern, "<redacted-secret>"), text);
}

export function sanitizeEvidenceText(text) {
  return redactSecretValues(
    redactSecretAssignments(
      redactIps(
        redactHandles(
          redactEmails(sanitizeUserPaths(compactSourceText(text))),
        ),
      ),
    ),
  );
}

function stripDiscoveryNoise(text) {
  return sanitizeEvidenceText(text)
    .replace(/(?:~|\/)[^\s"'`]+/g, " ")
    .replace(/\b[a-z0-9._-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|py|sh|swift|rb|go|rs|java|kt)\b/gi, " ");
}

function tokenize(text) {
  return Array.from(new Set(
    normalizeText(stripDiscoveryNoise(text))
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
  ));
}

function titleCase(value) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function isInstructionDump(text) {
  const normalized = normalizeText(text);
  return normalized.includes("agents.md instructions")
    || normalized.includes("<instructions>")
    || normalized.includes("<environment_context>")
    || normalized.includes("<turn_aborted>")
    || normalized.includes("any running unified exec processes were terminated")
    || normalized.includes("### available skills")
    || normalized.includes("### how to use skills")
    || normalized.includes("--- project-doc ---");
}

function buildEvidenceSnippet(text, focusTokens) {
  const sanitized = sanitizeEvidenceText(text);
  const words = sanitized.split(" ").filter(Boolean);
  if (words.length <= 36) return sanitized;

  const focus = new Set(focusTokens);
  const index = words.findIndex((word) => {
    const normalizedWord = word.toLowerCase().replace(/[^a-z0-9]+/g, "");
    return Array.from(focus).some((token) => normalizedWord.includes(token));
  });
  const start = Math.max(0, (index >= 0 ? index : 0) - 10);
  const end = Math.min(words.length, start + 28);
  const snippet = words.slice(start, end).join(" ");
  return `${start > 0 ? "… " : ""}${snippet}${end < words.length ? " …" : ""}`;
}

function looksLikeEnvName(name) {
  return /^[A-Z][A-Z0-9_]{2,}$/.test(name) && (name.includes("_") || /(?:KEY|TOKEN|SECRET|PASSWORD|PASS|URL|HOST|PORT|API|MODEL|REGION|PROFILE|USER|USERNAME|EMAIL|ID|PATH)$/.test(name));
}

function extractEnvVarNames(texts) {
  const out = new Set();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]{2,})/g,
    /\$\{([A-Z][A-Z0-9_]{2,})\}/g,
    /\$([A-Z][A-Z0-9_]{2,})\b/g,
    /\b([A-Z][A-Z0-9_]{2,})\s*=/g,
  ];

  for (const text of texts) {
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const name = match[1];
        if (looksLikeEnvName(name)) out.add(name);
      }
    }
  }

  return Array.from(out).sort();
}

function addMatches(set, text, pattern) {
  for (const match of text.matchAll(pattern)) {
    set.add(match[0]);
  }
}

function extractSecretPointers(texts) {
  const out = new Set();

  for (const rawText of texts) {
    const text = sanitizeEvidenceText(rawText);
    addMatches(out, text, /\B\.env(?:\.[A-Za-z0-9_-]+)?\b/g);
    addMatches(out, text, /op:\/\/[^\s"'`]+/g);
    addMatches(out, text, /vault:\/\/[^\s"'`]+/g);
    addMatches(out, text, /~\/[^\s"'`]*(?:credentials|credential|secret|secrets|token|tokens|key|keys|\.npmrc|\.pypirc|\.netrc)[^\s"'`]*/gi);

    if (/1password/i.test(text)) out.add("1Password item");
    if (/keychain/i.test(text)) out.add("macOS Keychain");
    if (/secrets manager/i.test(text)) out.add("Secrets Manager entry");
    if (/doppler/i.test(text)) out.add("Doppler secret");
  }

  return Array.from(out).sort();
}

function buildRuntimePointers(evidence) {
  return {
    env_vars: extractEnvVarNames(evidence),
    secret_pointers: extractSecretPointers(evidence),
  };
}

function renderRuntimePointerReference(candidate) {
  const envVars = candidate.runtime_pointers.env_vars;
  const secretPointers = candidate.runtime_pointers.secret_pointers;
  const envLines = envVars.length > 0 ? envVars.map((name) => `- \`${name}\``) : ["- none detected in mined evidence"];
  const secretLines = secretPointers.length > 0 ? secretPointers.map((entry) => `- \`${entry}\``) : ["- none detected in mined evidence"];

  return `# Runtime Pointers

Derived from sanitized mined workflow evidence. Preserve names and locations; never bake values, PII, or live secrets into the skill.

## Environment Variables

${envLines.join("\n")}

## Secret Or Config Pointers

${secretLines.join("\n")}

## Rules

- read values from existing local env files, secret stores, or credential files at runtime
- do not commit secret values, access tokens, cookies, emails, or user-specific absolute paths
- if a value is missing, ask for the source, not the secret itself
`;
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

Read when:

- runtime inputs, auth, env vars, or local secret sources matter: \`references/runtime-pointers.md\`

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
2. Load \`references/runtime-pointers.md\` if env vars, auth, or secret-backed config might matter.
3. Reduce the workflow to one core job.
4. Decide what belongs in \`SKILL.md\`, \`references/\`, and \`scripts/\`.
5. Generate the narrow skill surface and connect it to Foundry bundle routing if needed.

Load-bearing rules:

- one skill, one core job
- keep trigger language in the description
- keep env names and secret locations in pointer files only
- never bake PII, token values, emails, cookies, or user-specific paths into \`SKILL.md\`
- move durable detail into references or scripts
- keep only the constraints that change behavior
`;
}

export function writeCandidateSkillScaffold(baseDir, candidate) {
  writeText(path.join(baseDir, "SKILL.md"), renderCandidateSkill(candidate));
  writeText(path.join(baseDir, "references", "runtime-pointers.md"), renderRuntimePointerReference(candidate));
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

    mkdirSync(skillDir, { recursive: true });
    if (!existsSync(skillFile)) {
      writeCandidateSkillScaffold(skillDir, candidate);
      installed.push({ skill: candidate.slug, path: skillFile });
      continue;
    }

    const existing = readFileSync(skillFile, "utf8");
    if (!isFoundryManagedSkill(existing)) {
      skipped.push({ skill: candidate.slug, reason: "user-owned", path: skillFile });
      continue;
    }

    const nextSkillText = renderCandidateSkill(candidate);
    const existingPointers = existsSync(path.join(skillDir, "references", "runtime-pointers.md"))
      ? readFileSync(path.join(skillDir, "references", "runtime-pointers.md"), "utf8")
      : "";
    const nextPointersText = renderRuntimePointerReference(candidate);

    if (existing === nextSkillText || existing === `${nextSkillText}\n`) {
      if (existingPointers === nextPointersText || existingPointers === `${nextPointersText}\n`) {
        skipped.push({ skill: candidate.slug, reason: "unchanged", path: skillFile });
        continue;
      }
    }

    writeCandidateSkillScaffold(skillDir, candidate);
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
    if (isInstructionDump(text)) continue;
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
        if (entry.evidence.length < 6) entry.evidence.push(compactSourceText(text));
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
      evidence: entry.evidence.map((text) => buildEvidenceSnippet(text, entry.tokens)),
      runtime_pointers: buildRuntimePointers(entry.evidence),
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

function writeText(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`);
}
