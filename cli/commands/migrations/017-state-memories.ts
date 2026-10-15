/**
 * Migration 017: Move oma coordination artifacts out of Serena's memory dir.
 *
 * The coordination memory store moved from `.serena/memories/` (Serena MCP's
 * memory dir, which doubled as the cross-agent bus) to the oma-owned
 * `.agents/state/memories/`. This migration relocates the ephemeral
 * coordination artifacts the CLI reads — progress/session files,
 * task-board, orchestrator session, session-cost and findings records — so
 * the canonical-first resolver in `io/memory.ts` finds them.
 *
 * Serena's own knowledge memories (onboarding notes such as code_style.md,
 * project_purpose.md) and curated subdirectories (decisions/, designs/,
 * plans/, …) are deliberately left in `.serena/memories/` — they belong to
 * Serena's read_memory/write_memory tools, not the coordination bus.
 *
 * Idempotent: only moves files that match the coordination patterns and do
 * not already exist at the destination; a no-op when `.serena/memories/` is
 * absent or holds no matching files.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  CANONICAL_MEMORIES_REL,
  LEGACY_MEMORIES_REL,
} from "../../io/memory.js";
import type { Migration } from "./index.js";

// Coordination artifacts the CLI reads from the memory store. Keep in sync
// with the readers in io/memory.ts, io/session-cost.ts, io/findings-cache.ts
// and the gc patterns in commands/memory/gc.ts.
const COORDINATION_PATTERNS = [
  /^progress-.*\.md$/,
  // Result reports belong to 032-artifact-layout. Moving them here would
  // invalidate legacy path bindings before that migration can protect them.
  /^session-.*\.md$/, // session-cost-*, session-{workflow}-{sid} mirrors
  /^findings-.*\.md$/,
  /^orchestrator-session.*\.md$/,
  /^task-board.*\.md$/, // task-board.md + session-suffixed variants
];

/**
 * Retarget `.agents/mcp.json → memoryConfig` when it still carries the old
 * Serena default. The basePath override is honored by resolveMemoryBasePath
 * (artifact-verifier) and by agents following memory-protocol.md, so leaving
 * `.serena/memories` there would point them at the legacy dir after the file
 * move below. Custom (non-default) configs are left untouched.
 */
function retargetMcpMemoryConfig(cwd: string): string[] {
  const mcpPath = join(cwd, ".agents", "mcp.json");
  if (!existsSync(mcpPath)) return [];

  let raw: string;
  let parsed: { memoryConfig?: Record<string, unknown> };
  try {
    raw = readFileSync(mcpPath, "utf-8");
    parsed = JSON.parse(raw) as { memoryConfig?: Record<string, unknown> };
  } catch {
    return []; // unreadable/malformed — leave for the user
  }

  const config = parsed.memoryConfig;
  if (config?.basePath !== ".serena/memories") return [];

  parsed.memoryConfig = {
    ...config,
    provider: "file",
    basePath: CANONICAL_MEMORIES_REL.split("\\").join("/"),
    tools: { read: "Read", write: "Write", edit: "Edit" },
  };

  try {
    const indent = raw.includes("\t") ? "\t" : 2;
    writeFileSync(mcpPath, `${JSON.stringify(parsed, null, indent)}\n`);
    return [
      ".agents/mcp.json memoryConfig → file provider at .agents/state/memories",
    ];
  } catch {
    return [];
  }
}

export const migrateStateMemories: Migration = {
  name: "017-state-memories",
  up(cwd: string): string[] {
    const actions: string[] = [];
    actions.push(...retargetMcpMemoryConfig(cwd));
    const legacyDir = join(cwd, LEGACY_MEMORIES_REL);
    if (!existsSync(legacyDir)) return actions;

    let entries: string[];
    try {
      entries = readdirSync(legacyDir);
    } catch {
      return actions;
    }

    const toMove = entries.filter((name) => {
      if (!COORDINATION_PATTERNS.some((re) => re.test(name))) return false;
      try {
        return statSync(join(legacyDir, name)).isFile();
      } catch {
        return false;
      }
    });
    if (toMove.length === 0) return actions;

    const canonicalDir = join(cwd, CANONICAL_MEMORIES_REL);
    mkdirSync(canonicalDir, { recursive: true });

    for (const name of toMove) {
      const dest = join(canonicalDir, name);
      if (existsSync(dest)) continue; // already migrated — keep the newer copy
      try {
        renameSync(join(legacyDir, name), dest);
        actions.push(
          `moved ${LEGACY_MEMORIES_REL}/${name} → ${CANONICAL_MEMORIES_REL}/`,
        );
      } catch {
        // Cross-device or permission failure — leave the file where the
        // legacy-fallback resolver still finds it.
      }
    }

    return actions;
  },
};
