// cli/commands/model/propose.ts
// Generates a models.yaml patch draft for accepted new model candidates.

import fs from "node:fs";
import path from "node:path";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import type { ProbeResult } from "./probe.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProbedSourceModel = {
  slug: string;
  probeResult: ProbeResult;
};

type ModelYamlEntry = {
  cli: string;
  cli_model: string;
  supports: {
    effort: unknown;
    apply_patch: boolean;
    task_budget: boolean;
    prompt_cache: boolean;
    computer_use: boolean;
    native_dispatch_from: string[];
    api_only: boolean;
  };
  auth_hint: string;
};

// ---------------------------------------------------------------------------
// Per-owner default templates
// ---------------------------------------------------------------------------

/**
 * Returns a conservative default ModelSpec template for a given owner/CLI.
 * Matches the patterns observed in RAW_REGISTRY in model-registry.ts.
 */
function buildDefaultTemplate(
  owner: string,
  cli: string,
  cliModel: string,
): ModelYamlEntry {
  switch (owner) {
    case "anthropic":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: { type: "cli-session", auto_default: "xhigh" }, // TODO verify
          apply_patch: false, // TODO verify
          task_budget: true, // TODO verify
          prompt_cache: true,
          computer_use: false, // TODO verify
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires Claude Pro or Max subscription", // TODO verify subscription tier
      };

    case "openai":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: {
            type: "granular",
            levels: ["none", "low", "medium", "high", "xhigh"],
          }, // TODO verify
          apply_patch: true, // TODO verify
          task_budget: false, // TODO verify
          prompt_cache: false, // TODO verify
          computer_use: false, // TODO verify
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires ChatGPT Plus or Pro subscription", // TODO verify subscription tier
      };

    case "google":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: { type: "thinking-budget", modes: ["none", "dynamic"] }, // TODO verify
          apply_patch: false, // TODO verify
          task_budget: false, // TODO verify
          prompt_cache: true,
          computer_use: false, // TODO verify
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires Google AI Pro subscription ($20/mo)", // TODO verify subscription tier
      };

    case "qwen":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: { type: "binary-thinking" }, // TODO verify
          apply_patch: false, // TODO verify
          task_budget: false, // TODO verify
          prompt_cache: false, // TODO verify
          computer_use: false, // TODO verify
          native_dispatch_from: [],
          api_only: false,
        },
        auth_hint:
          "Requires Qwen Code subscription or Bailian Coding Plan API key", // TODO verify
      };

    case "cursor":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: null,
          apply_patch: false, // TODO verify
          task_budget: false, // TODO verify
          prompt_cache: false, // TODO verify
          computer_use: false, // TODO verify
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires Cursor Pro or Pro Student subscription", // TODO verify subscription tier
      };

    default:
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: null,
          apply_patch: false, // TODO verify
          task_budget: false, // TODO verify
          prompt_cache: false, // TODO verify
          computer_use: false, // TODO verify
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires subscription or API key", // TODO verify
      };
  }
}

// ---------------------------------------------------------------------------
// YAML generation
// ---------------------------------------------------------------------------

/**
 * Generate a models.yaml patch for accepted probe results.
 * Returns the YAML text as a string.
 */
export function proposeMissingSlugs(
  probedNewModels: ProbedSourceModel[],
  proposedDate?: string,
): string {
  const dateStr = proposedDate ?? new Date().toISOString().slice(0, 10);
  const accepted = probedNewModels.filter(
    (m) => m.probeResult.status === "accepted",
  );

  if (accepted.length === 0) {
    return "# model:propose: no accepted candidates found — nothing to propose\n";
  }

  const entries: Record<string, unknown> = {};
  for (const { slug, probeResult } of accepted) {
    const slashIndex = slug.indexOf("/");
    const owner = slashIndex >= 0 ? slug.slice(0, slashIndex) : "";
    const cliModel = slashIndex >= 0 ? slug.slice(slashIndex + 1) : slug;
    const cli = probeResult.cli;

    const template = buildDefaultTemplate(owner, cli, cliModel);
    entries[slug] = template;
  }

  const yamlBody = yamlStringify(
    { models: entries },
    { indent: 2, lineWidth: 0 },
  );

  const header = `# auto-proposed by model:propose on ${dateStr}\n# Review and remove TODO comments before committing.\n`;
  return `${header}${yamlBody}`;
}

// ---------------------------------------------------------------------------
// File write helper
// ---------------------------------------------------------------------------

/**
 * Walk up from startDir looking for `.agents/config/models.yaml`.
 * Returns the path if found, or a default path under the first `.agents/config/` found.
 */
function resolveModelsYamlPath(startDir: string): string {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    const candidate = path.join(current, ".agents", "config", "models.yaml");
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  // Fall back: first `.agents/config` found upward
  current = path.resolve(startDir);
  while (current !== root) {
    const configDir = path.join(current, ".agents", "config");
    if (fs.existsSync(configDir)) {
      return path.join(configDir, "models.yaml");
    }
    current = path.dirname(current);
  }
  // Last resort: use cwd
  return path.join(startDir, ".agents", "config", "models.yaml");
}

/**
 * Append accepted model entries to `.agents/config/models.yaml`.
 * Skips duplicate slugs and emits a warning for each.
 *
 * @returns Array of slugs that were skipped (already exist in the file).
 */
export function writeProposalToFile(
  probedNewModels: ProbedSourceModel[],
  cwd?: string,
  proposedDate?: string,
): { written: string[]; skipped: string[] } {
  const dateStr = proposedDate ?? new Date().toISOString().slice(0, 10);
  const accepted = probedNewModels.filter(
    (m) => m.probeResult.status === "accepted",
  );

  const filePath = resolveModelsYamlPath(cwd ?? process.cwd());

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Parse existing content
  let existingDoc: Record<string, unknown> = {};
  let existingContent = "";
  if (fs.existsSync(filePath)) {
    existingContent = fs.readFileSync(filePath, "utf-8");
    try {
      const parsed = yamlParse(existingContent);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        existingDoc = parsed as Record<string, unknown>;
      }
    } catch {
      // If parse fails, we'll just append
    }
  }

  const existingModels =
    existingDoc.models &&
    typeof existingDoc.models === "object" &&
    !Array.isArray(existingDoc.models)
      ? (existingDoc.models as Record<string, unknown>)
      : {};

  const written: string[] = [];
  const skipped: string[] = [];
  const newEntries: string[] = [];

  for (const { slug, probeResult } of accepted) {
    if (Object.hasOwn(existingModels, slug)) {
      skipped.push(slug);
      continue;
    }

    const slashIndex = slug.indexOf("/");
    const owner = slashIndex >= 0 ? slug.slice(0, slashIndex) : "";
    const cliModel = slashIndex >= 0 ? slug.slice(slashIndex + 1) : slug;
    const cli = probeResult.cli;

    const template = buildDefaultTemplate(owner, cli, cliModel);
    const entryYaml = yamlStringify(
      { [slug]: template },
      { indent: 2, lineWidth: 0 },
    );
    newEntries.push(entryYaml);
    written.push(slug);
  }

  if (newEntries.length > 0) {
    const appendBlock = [
      `\n# auto-proposed by model:propose on ${dateStr}`,
      "# Review and remove TODO comments before committing.",
      ...newEntries,
    ].join("\n");

    if (!existingContent) {
      fs.writeFileSync(
        filePath,
        `# .agents/config/models.yaml — user model overrides\nmodels:${appendBlock}\n`,
        "utf-8",
      );
    } else {
      // Ensure file has models: key
      if (!existingContent.includes("models:")) {
        fs.appendFileSync(filePath, `\nmodels:${appendBlock}\n`, "utf-8");
      } else {
        fs.appendFileSync(filePath, `${appendBlock}\n`, "utf-8");
      }
    }
  }

  return { written, skipped };
}
