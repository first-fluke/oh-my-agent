/**
 * 033 — fold the scattered provider and fallback keys of `.agents/oma-config`
 * into the two places that now own them, and drop keys nothing reads.
 *
 *   free:                 → providers.free (model → default_model)
 *   brave: / exa: / honcho: → providers.brave / .exa / .honcho
 *   default_cli:          → agents.default.cli
 *   diagram.archify.{managed,channel,check_interval_min}  removed (ignored
 *   market.{managed,channel,check_interval_min}            since the skills-CLI
 *                                                          installs)
 *
 * The runtime still reads every legacy spelling, so this only tidies the
 * user's file. Edits go through the YAML document model so comments and the
 * order of untouched keys survive; a file is rewritten only when something
 * changed. Both the shared and the local YAML file are handled; CUE files are
 * left alone (the runtime reads their legacy keys too).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMap, parseDocument } from "yaml";
import type { Migration } from "./index.js";

const CONFIG_FILES = [
  ".agents/oma-config.yaml",
  ".agents/oma-config.local.yaml",
];
const CREDENTIAL_SECTIONS = ["brave", "exa", "honcho"] as const;
const DEAD_KEYS: Array<{ path: string[]; keys: string[] }> = [
  {
    path: ["diagram", "archify"],
    keys: ["managed", "channel", "check_interval_min"],
  },
  { path: ["market"], keys: ["managed", "channel", "check_interval_min"] },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pure rewrite of one YAML text; `actions` is empty when nothing changed. */
export function consolidateConfigKeys(yamlText: string): {
  text: string;
  actions: string[];
} {
  const doc = parseDocument(yamlText);
  if (!isMap(doc.contents)) return { text: yamlText, actions: [] };
  const actions: string[] = [];

  // free: → providers.free
  if (doc.has("free")) {
    if (!doc.hasIn(["providers", "free"])) {
      const free = doc.toJS().free;
      if (isRecord(free)) {
        const entry: Record<string, unknown> = {};
        if (typeof free.base_url === "string") entry.base_url = free.base_url;
        if (typeof free.api_key_env === "string")
          entry.api_key_env = free.api_key_env;
        if (typeof free.model === "string") entry.default_model = free.model;
        doc.setIn(["providers", "free"], entry);
        actions.push("moved free: → providers.free (model → default_model)");
      } else {
        actions.push("removed empty free: block");
      }
    } else {
      actions.push("removed free: (providers.free wins)");
    }
    doc.delete("free");
  }

  // brave: / exa: / honcho: → providers.<name>
  for (const name of CREDENTIAL_SECTIONS) {
    if (!doc.has(name)) continue;
    if (!doc.hasIn(["providers", name])) {
      doc.setIn(["providers", name], doc.get(name));
      actions.push(`moved ${name}: → providers.${name}`);
    } else {
      actions.push(`removed ${name}: (providers.${name} wins)`);
    }
    doc.delete(name);
  }

  // default_cli → agents.default.cli
  if (doc.has("default_cli")) {
    const value = doc.get("default_cli");
    if (!doc.hasIn(["agents", "default", "cli"]) && typeof value === "string") {
      doc.setIn(["agents", "default", "cli"], value);
      actions.push("moved default_cli: → agents.default.cli");
    } else {
      actions.push("removed default_cli: (agents.default.cli wins)");
    }
    doc.delete("default_cli");
  }

  // Keys the skills-CLI installs made meaningless.
  for (const { path, keys } of DEAD_KEYS) {
    for (const key of keys) {
      if (doc.hasIn([...path, key])) {
        doc.deleteIn([...path, key]);
        actions.push(`removed ${[...path, key].join(".")} (ignored)`);
      }
    }
  }

  return { text: actions.length ? doc.toString() : yamlText, actions };
}

export const migrateConsolidateConfigKeys: Migration = {
  name: "033-consolidate-config-keys",
  requiresReconcile: false,
  up(cwd: string): string[] {
    const actions: string[] = [];
    for (const rel of CONFIG_FILES) {
      const path = join(cwd, ...rel.split("/"));
      if (!existsSync(path)) continue;
      let text: string;
      try {
        text = readFileSync(path, "utf-8");
      } catch {
        actions.push(`kept ${rel} — unreadable`);
        continue;
      }
      let result: ReturnType<typeof consolidateConfigKeys>;
      try {
        result = consolidateConfigKeys(text);
      } catch (error) {
        actions.push(
          `kept ${rel} — ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      if (result.actions.length === 0) continue;
      try {
        writeFileSync(path, result.text);
      } catch {
        actions.push(`kept ${rel} — not writable`);
        continue;
      }
      actions.push(...result.actions.map((action) => `${rel}: ${action}`));
    }
    return actions;
  },
};
