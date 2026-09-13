/**
 * Migration 029: move per-project direct Serena launchers onto the shared bridge.
 *
 * Before cli v11 every vendor config oma wrote started its own
 * `serena start-mcp-server …` (or the older `uvx --from git+…/serena …`)
 * per session. v11 introduced `oma bridge`, one Serena daemon per project that
 * every session shares, but `syncProviderMcp` keeps an existing serena entry
 * untouched and migration 026 only repaired the user-global Codex config. A
 * project synced before v11 therefore kept paying one language-server stack
 * per session for good: five Codex sessions on one repo meant five Dart, five
 * TypeScript and five Terraform servers.
 *
 * Rewrite only oma's own direct launcher shapes inside the project's vendor
 * configs, in each vendor's native entry form, keeping every extra key the
 * entry carries (Codex `startup_timeout_sec`, Copilot `tools`, …). Entries the
 * user changed away from oma's shape, `serena.mode: stdio` projects, and
 * anything outside the project directory are left alone.
 */

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import type { CliVendor } from "../../types/index.js";
import { serenaTransportMode } from "../../utils/config.js";
import { isRecord } from "../../utils/type-guards.js";
import { browserMcpDocument } from "../../vendors/browser-mcp-document.js";
import {
  type BrowserMcpTarget,
  browserMcpTargets,
} from "../../vendors/browser-mcp-targets.js";
import { isBridgeSerenaEntry, serenaMcpEntry } from "../../vendors/serena.js";
import type { Migration } from "./index.js";
import { allowsVendor, type MigrationContext } from "./vendor-scope.js";

const PROJECT_VENDORS: readonly CliVendor[] = [
  "claude",
  "cursor",
  "codex",
  "qwen",
  "grok",
  "kiro",
  "kimi",
  "antigravity",
  "commandcode",
  "copilot",
  "opencode",
  "pi",
];

/** `command`/`args` of an entry, normalising opencode's single command array. */
function launcher(entry: unknown): string[] | undefined {
  if (!isRecord(entry)) return undefined;
  if (Array.isArray(entry.command))
    return entry.command.every((part) => typeof part === "string")
      ? (entry.command as string[])
      : undefined;
  if (typeof entry.command !== "string") return undefined;
  const args = Array.isArray(entry.args) ? entry.args : [];
  return args.every((arg) => typeof arg === "string")
    ? [entry.command, ...(args as string[])]
    : undefined;
}

/** True only for the direct, per-session launchers oma itself used to write. */
export function isDirectOmaSerenaLauncher(entry: unknown): boolean {
  const argv = launcher(entry);
  if (!argv || isBridgeSerenaEntry(entry as { args?: unknown })) return false;
  const [command = "", ...args] = argv;
  const binary = command.split("/").at(-1);
  if (binary === "serena")
    return args[0] === "start-mcp-server" && !args.includes("--transport");
  if (binary === "uvx")
    return (
      args[0] === "--from" &&
      /oraios\/serena/.test(args[1] ?? "") &&
      args[2] === "serena" &&
      args[3] === "start-mcp-server"
    );
  return false;
}

function bridgeContext(target: BrowserMcpTarget): string {
  const path = target.path;
  if (target.format === "toml" && path.includes(".codex")) return "codex";
  if (path.endsWith("mcp_config.json")) return "antigravity";
  if (path.endsWith(".mcp.json")) return "claude-code";
  return "ide";
}

function bridgeEntry(
  target: BrowserMcpTarget,
  current: Record<string, unknown>,
): Record<string, unknown> {
  const server = serenaMcpEntry(bridgeContext(target), "bridge");
  const { command: _command, args: _args, ...rest } = current;
  if (target.entry === "opencode") {
    return {
      ...rest,
      type: "local",
      command: [server.command, ...server.args],
      enabled: true,
    };
  }
  if (target.entry === "copilot")
    return { ...rest, type: "local", ...server, tools: rest.tools ?? ["*"] };
  if (target.entry === "stdio") return { ...rest, type: "stdio", ...server };
  return { ...rest, ...server };
}

export const migrateProjectSerenaBridge: Migration = {
  name: "029-project-serena-bridge",
  up(cwd: string, ctx?: MigrationContext): string[] {
    if (serenaTransportMode(cwd) === "stdio") return [];
    const root = resolve(cwd);
    const vendors = PROJECT_VENDORS.filter((vendor) =>
      allowsVendor(ctx, vendor),
    );
    const actions: string[] = [];
    const seen = new Set<string>();
    for (const target of browserMcpTargets(root, vendors, {})) {
      if (
        target.removeOnly ||
        seen.has(target.path) ||
        !existsSync(target.path) ||
        !resolve(target.path).startsWith(`${root}/`)
      )
        continue;
      seen.add(target.path);
      let doc: ReturnType<typeof browserMcpDocument>;
      try {
        doc = browserMcpDocument(target);
      } catch {
        continue; // malformed config is the user's to fix, not ours to guess at
      }
      const key = [...target.keys, "serena"];
      const current = doc.get(key);
      if (!isRecord(current) || !isDirectOmaSerenaLauncher(current)) continue;
      doc.set(key, bridgeEntry(target, current));
      const change = doc.result();
      if (!change) continue;
      mkdirSync(dirname(change.path), { recursive: true });
      // Rename onto the native path so a legacy symlink cannot mutate the SSOT template.
      const temporary = `${change.path}.${randomUUID()}.tmp`;
      try {
        writeFileSync(temporary, change.content, { mode: 0o600 });
        renameSync(temporary, change.path);
      } finally {
        rmSync(temporary, { force: true });
      }
      actions.push(
        `${change.path.slice(root.length + 1)} (per-session Serena → shared bridge)`,
      );
    }
    return actions;
  },
};
