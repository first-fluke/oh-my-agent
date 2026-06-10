import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  AGENTS_STATE_ARCHIVE_DIR,
  AGENTS_STATE_DIR,
  agentsPathFromRoot,
} from "../../constants/paths.js";
import { isGitRepo, isPathGitIgnored } from "../../io/gitignore.js";
import { indexPath, sessionsDir } from "../../state/events.js";
import { isRecord } from "../../utils/type-guards.js";
import type {
  HookOrderDoctorCheck,
  StateDoctorCheck,
  StateIndexDoctorCheck,
  StateSessionDoctorCheck,
} from "./types.js";

const EXPECTED_PROMPT_HOOKS = [
  "keyword-detector",
  "state-boundary",
  "skill-injector",
] as const;

const HOOK_SETTINGS: Array<{
  vendor: string;
  path: string;
  promptEvents: string[];
}> = [
  {
    vendor: "claude",
    path: ".claude/settings.json",
    promptEvents: ["UserPromptSubmit"],
  },
  {
    vendor: "codex",
    path: ".codex/hooks.json",
    promptEvents: ["UserPromptSubmit"],
  },
  {
    vendor: "cursor",
    path: ".cursor/hooks.json",
    promptEvents: ["UserPromptSubmit", "beforeSubmitPrompt"],
  },
  {
    vendor: "gemini",
    path: ".gemini/settings.json",
    promptEvents: ["BeforeAgent"],
  },
  // antigravity is checked separately (collectAntigravityHookOrder): it is
  // HOME-only and loads a named-map hooks.json, not settings.json event arrays.
  {
    vendor: "grok",
    path: ".grok/hooks/oma-hooks.json",
    promptEvents: ["UserPromptSubmit"],
  },
  {
    vendor: "kiro",
    path: ".kiro/settings/cli.json",
    promptEvents: ["userPromptSubmit"],
  },
  {
    vendor: "qwen",
    path: ".qwen/settings.json",
    promptEvents: ["UserPromptSubmit"],
  },
];

function parseJsonFile(
  path: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf-8")) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function hookName(entry: unknown): string | null {
  if (!isRecord(entry)) return null;
  const rawName = entry.name;
  if (typeof rawName === "string") return rawName;
  const command = entry.command;
  if (typeof command !== "string") return null;
  const match = command.match(/([a-z-]+)\.(?:ts|js|sh)\b/);
  return match?.[1] ?? null;
}

function eventOrder(settings: unknown, eventName: string): string[] {
  if (!isRecord(settings)) return [];
  const hooksRoot = settings.hooks;
  if (!isRecord(hooksRoot)) return [];
  const eventEntries = hooksRoot[eventName];
  if (!Array.isArray(eventEntries)) return [];

  const ordered: string[] = [];
  for (const eventEntry of eventEntries) {
    if (!isRecord(eventEntry)) continue;
    const hooks = eventEntry.hooks;
    if (!Array.isArray(hooks)) continue;
    for (const hook of hooks) {
      const name = hookName(hook);
      if (name) ordered.push(name);
    }
  }
  return ordered;
}

function hasExpectedOrder(order: string[]): boolean {
  let cursor = 0;
  for (const name of order) {
    if (name === EXPECTED_PROMPT_HOOKS[cursor]) cursor += 1;
    if (cursor === EXPECTED_PROMPT_HOOKS.length) return true;
  }
  return false;
}

function agentMemoryOrder(
  order: string[],
): HookOrderDoctorCheck["agentMemory"] {
  const memoryIndex = order.findIndex((name) => name.includes("agentmemory"));
  if (memoryIndex === -1) return "absent";
  const skillIndex = order.indexOf("skill-injector");
  return skillIndex !== -1 && memoryIndex > skillIndex
    ? "after-skill-injector"
    : "before-skill-injector";
}

/**
 * agy's hooks.json is a named map (`{ "hooks": { "<name>": { event, ... } } }`)
 * rather than the settings.json event-keyed arrays the other vendors use, so it
 * needs its own order extractor. Tolerates `event` (string) or `events` (array).
 */
function namedHookOrder(parsed: unknown, eventName: string): string[] {
  if (!isRecord(parsed)) return [];
  const hooksRoot = parsed.hooks;
  if (!isRecord(hooksRoot)) return [];
  const ordered: string[] = [];
  for (const [name, spec] of Object.entries(hooksRoot)) {
    if (!isRecord(spec)) continue;
    const events = Array.isArray(spec.events) ? spec.events : [];
    if (spec.event === eventName || events.includes(eventName)) {
      ordered.push(name);
    }
  }
  return ordered;
}

/**
 * antigravity (agy) loads hooks from `~/.gemini/antigravity-cli/hooks.json`.
 * BEST-EFFORT: agy strips `defaultHooksPath` from settings.json and headless
 * runs never fired hooks, so this only confirms the file is well-formed and
 * ordered — not that agy actually loads/executes it.
 */
function collectAntigravityHookOrder(): HookOrderDoctorCheck {
  const vendor = "antigravity";
  const hooksJsonPath = join(homedir(), ".gemini/antigravity-cli/hooks.json");
  if (!existsSync(hooksJsonPath)) {
    return {
      vendor,
      settingsPath: hooksJsonPath,
      configured: false,
      parseOk: true,
      order: [],
      ok: true,
      agentMemory: "absent",
    };
  }
  const parsed = parseJsonFile(hooksJsonPath);
  if (!parsed.ok) {
    return {
      vendor,
      settingsPath: hooksJsonPath,
      configured: true,
      parseOk: false,
      order: [],
      ok: false,
      agentMemory: "absent",
      error: parsed.error,
    };
  }
  const order = namedHookOrder(parsed.value, "PreInvocation");
  if (order.length === 0) {
    return {
      vendor,
      settingsPath: hooksJsonPath,
      configured: false,
      parseOk: true,
      order: [],
      ok: true,
      agentMemory: "absent",
      error: "prompt hook event not found",
    };
  }
  const memory = agentMemoryOrder(order);
  return {
    vendor,
    settingsPath: hooksJsonPath,
    configured: true,
    parseOk: true,
    promptEvent: "PreInvocation",
    order,
    ok: hasExpectedOrder(order) && memory !== "before-skill-injector",
    agentMemory: memory,
  };
}

function collectHookOrder(projectDir: string): HookOrderDoctorCheck[] {
  const checks: HookOrderDoctorCheck[] = HOOK_SETTINGS.map((spec) => {
    const settingsPath = join(projectDir, ...spec.path.split("/"));
    if (!existsSync(settingsPath)) {
      return {
        vendor: spec.vendor,
        settingsPath,
        configured: false,
        parseOk: true,
        order: [],
        ok: true,
        agentMemory: "absent",
      };
    }

    const parsed = parseJsonFile(settingsPath);
    if (!parsed.ok) {
      return {
        vendor: spec.vendor,
        settingsPath,
        configured: true,
        parseOk: false,
        order: [],
        ok: false,
        agentMemory: "absent",
        error: parsed.error,
      };
    }

    for (const promptEvent of spec.promptEvents) {
      const order = eventOrder(parsed.value, promptEvent);
      if (order.length === 0) continue;
      const memory = agentMemoryOrder(order);
      return {
        vendor: spec.vendor,
        settingsPath,
        configured: true,
        parseOk: true,
        promptEvent,
        order,
        ok: hasExpectedOrder(order) && memory !== "before-skill-injector",
        agentMemory: memory,
      };
    }

    return {
      vendor: spec.vendor,
      settingsPath,
      configured: false,
      parseOk: true,
      order: [],
      ok: true,
      agentMemory: "absent",
      error: "prompt hook event not found",
    };
  });

  checks.push(collectAntigravityHookOrder());
  return checks;
}

function collectIndex(projectDir: string): StateIndexDoctorCheck {
  const path = indexPath(projectDir);
  if (!existsSync(path)) {
    return {
      path,
      exists: false,
      parseOk: true,
      active: {},
      missingActive: [],
    };
  }
  const parsed = parseJsonFile(path);
  if (!parsed.ok) {
    return {
      path,
      exists: true,
      parseOk: false,
      active: {},
      missingActive: [],
      error: parsed.error,
    };
  }
  const rawActive = isRecord(parsed.value) ? parsed.value.active : undefined;
  const active = isRecord(rawActive)
    ? Object.fromEntries(
        Object.entries(rawActive).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : {};
  const missingActive = Object.entries(active)
    .filter(([, sid]) => !existsSync(join(sessionsDir(projectDir), sid)))
    .map(([category, sid]) => ({ category, sid }));
  return { path, exists: true, parseOk: true, active, missingActive };
}

function countInvalidEventLines(path: string): number {
  if (!existsSync(path)) return 0;
  let invalid = 0;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (
        !isRecord(parsed) ||
        typeof parsed.sid !== "string" ||
        typeof parsed.kind !== "string" ||
        typeof parsed.eventId !== "string" ||
        typeof parsed.ts !== "string"
      ) {
        invalid += 1;
      }
    } catch {
      invalid += 1;
    }
  }
  return invalid;
}

function collectSessions(projectDir: string): StateSessionDoctorCheck[] {
  const root = sessionsDir(projectDir);
  if (!existsSync(root)) return [];
  const sessions: StateSessionDoctorCheck[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sessionPath = join(root, entry.name);
    const metaFile = join(sessionPath, "meta.json");
    const metaOk = !existsSync(metaFile) || parseJsonFile(metaFile).ok;
    sessions.push({
      sid: entry.name,
      metaOk,
      invalidEventLines: countInvalidEventLines(
        join(sessionPath, "events.jsonl"),
      ),
    });
  }
  return sessions;
}

function countArchiveSessions(projectDir: string): number {
  const root = agentsPathFromRoot(projectDir, AGENTS_STATE_ARCHIVE_DIR);
  if (!existsSync(root)) return 0;
  let total = 0;
  for (const bucket of readdirSync(root, { withFileTypes: true })) {
    if (!bucket.isDirectory()) continue;
    const bucketPath = join(root, bucket.name);
    total += readdirSync(bucketPath, { withFileTypes: true }).filter((entry) =>
      entry.isDirectory(),
    ).length;
  }
  return total;
}

export function collectStateDoctorCheck(projectDir: string): StateDoctorCheck {
  const rootPath = agentsPathFromRoot(projectDir, AGENTS_STATE_DIR);
  const rootExists = existsSync(rootPath);
  const gitignoreSkipped = !isGitRepo(projectDir);
  const gitignored = gitignoreSkipped
    ? false
    : isPathGitIgnored(rootPath, projectDir);
  const index = collectIndex(projectDir);
  const sessions = collectSessions(projectDir);
  const archiveSessions = countArchiveSessions(projectDir);
  const hookOrder = collectHookOrder(projectDir);

  const issues: string[] = [];
  if (rootExists && !gitignoreSkipped && !gitignored) {
    issues.push(".agents/state/ is not gitignored");
  }
  if (!index.parseOk) issues.push("state index is corrupt");
  for (const active of index.missingActive) {
    issues.push(
      `active state session missing: ${active.category}=${active.sid}`,
    );
  }
  for (const session of sessions) {
    if (!session.metaOk) issues.push(`state meta is corrupt: ${session.sid}`);
    if (session.invalidEventLines > 0) {
      issues.push(
        `state events contain ${session.invalidEventLines} invalid line(s): ${session.sid}`,
      );
    }
  }
  for (const check of hookOrder) {
    if (!check.configured) continue;
    if (!check.parseOk) {
      issues.push(`hook settings are corrupt: ${check.vendor}`);
    } else if (!check.ok) {
      issues.push(`hook order invalid: ${check.vendor}`);
    }
  }

  return {
    rootPath,
    rootExists,
    gitignored,
    gitignoreSkipped,
    index,
    sessions,
    archiveSessions,
    issues,
    hookOrder,
  };
}
