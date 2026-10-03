import fs from "node:fs";
import path from "node:path";
import type { EffortLevel } from "../../platform/model-registry.js";
import { readTomlForMerge } from "../../utils/merge-read.js";
import {
  type CodexSettings,
  serializeCodexConfig,
  setCodexReasoningEffort,
} from "../../vendors/codex/settings.js";

/**
 * Write plan.effort to the project-local .codex/config.toml.
 * Idempotent: no-op when effort already matches or no effort is set.
 * Silently skips on I/O errors (non-fatal). A config.toml that does not parse
 * is never rewritten — that would replace the user's Codex settings with a
 * file holding only the effort key.
 */
export function persistCodexEffortToToml(
  cwd: string,
  effort: EffortLevel,
): void {
  const codexConfigPath = path.join(cwd, ".codex", "config.toml");
  try {
    const read = readTomlForMerge(codexConfigPath);
    if (read.status === "invalid") {
      console.warn(
        `[runtime-dispatch] ${codexConfigPath} does not parse (${read.reason}) — effort '${effort}' not persisted; the file was left unchanged`,
      );
      return;
    }
    const current: CodexSettings = read.status === "ok" ? read.value : {};
    if (current.model_reasoning_effort === effort) return;
    const next = setCodexReasoningEffort(current, effort);
    fs.mkdirSync(path.dirname(codexConfigPath), { recursive: true });
    fs.writeFileSync(codexConfigPath, `${serializeCodexConfig(next)}\n`);
  } catch {
    console.warn(
      `[runtime-dispatch] Failed to write .codex/config.toml — effort '${effort}' not persisted`,
    );
  }
}
