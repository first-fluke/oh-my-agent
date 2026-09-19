/**
 * `@AGENTS.md` import guard for a user-owned `CLAUDE.md`.
 *
 * Claude Code (>= 2.1.277) reads `AGENTS.md` natively, but only when no
 * `CLAUDE.md` exists in the working directory or above it. When both exist it
 * reads `CLAUDE.md` alone — unless that file imports `AGENTS.md`. oma never
 * writes an OMA block into `CLAUDE.md`; the single import line below is the
 * only thing it adds, so the file stays user-owned while AGENTS.md still
 * reaches Claude Code.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteFileSync } from "../utils/safe-write.js";

export const AGENTS_MD_IMPORT_LINE = "@AGENTS.md";

/** Matches `@AGENTS.md` / `@./AGENTS.md` on its own line (Claude Code import). */
const IMPORT_PATTERN = /^\s*@(?:\.\/)?AGENTS\.md\s*$/m;

/** True when `content` already imports AGENTS.md. */
export function hasAgentsMdImport(content: string): boolean {
  return IMPORT_PATTERN.test(content);
}

/** Append the import to `content`, preserving everything already there. */
export function appendAgentsMdImport(content: string): string {
  const base = content.trimEnd();
  return base.length === 0
    ? `${AGENTS_MD_IMPORT_LINE}\n`
    : `${base}\n\n${AGENTS_MD_IMPORT_LINE}\n`;
}

/**
 * Whether `./CLAUDE.md` exists and would shadow `AGENTS.md`: present, but
 * without an `@AGENTS.md` import. Missing file → false (AGENTS.md is read).
 */
export function claudeMdShadowsAgentsMd(targetDir: string): boolean {
  const path = join(targetDir, "CLAUDE.md");
  if (!existsSync(path)) return false;
  try {
    return !hasAgentsMdImport(readFileSync(path, "utf-8"));
  } catch {
    return false;
  }
}

/**
 * Ensure an existing `./CLAUDE.md` imports AGENTS.md. Never creates the file.
 * Returns true when the import line was appended.
 */
export function ensureAgentsMdImport(targetDir: string): boolean {
  const path = join(targetDir, "CLAUDE.md");
  if (!existsSync(path)) return false;
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return false;
  }
  if (hasAgentsMdImport(content)) return false;
  atomicWriteFileSync(path, appendAgentsMdImport(content));
  return true;
}
