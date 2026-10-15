// cli/commands/model/propose.ts
// Generates an oma-config `models:` patch draft for accepted new model
// candidates.
//
// The patch targets the inline `models:` block of `.agents/oma-config.yaml`,
// the only user-model source the registry reads (design 024).
// `.agents/config/models.yaml` — the old target — is gone: `oma uninstall`
// removes `.agents/config/` wholesale, so slugs written there were never
// durable.

import fs from "node:fs";
import path from "node:path";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import { appendSectionEntries } from "../../platform/agent-config/config-merge.js";
import { OMA_CONFIG_RELATIVE_PATH } from "../../platform/agent-config/skill-sections.js";
import {
  loadConfigLayers,
  planPreferenceWrite,
} from "../../utils/config-layers.js";
import { findFileUpwards } from "../../utils/fs-utils.js";
import { isRecord } from "../../utils/type-guards.js";
import type { ProbeResult } from "./probe.js";

const CUE_CONFIG_RELATIVE_PATH = path.join(".agents", "oma-config.cue");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProbedSourceModel = {
  slug: string;
  probeResult: ProbeResult;
};

/** Result of a `--write` run against `.agents/oma-config.yaml`. */
export type ProposalWriteResult = {
  /** Slugs appended to the `models:` block. */
  written: string[];
  /** Slugs the `models:` block already declares. */
  skipped: string[];
  /** The oma-config that was written, or null when none was found. */
  configPath: string | null;
  /** Set when nothing could be written for a reason other than duplicates. */
  error?: string;
};

type ProposedModelEntry = {
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
 *
 * NOTE: Capability flags (effort, apply_patch, task_budget, prompt_cache,
 * computer_use) and auth_hint strings are conservative defaults inferred from
 * vendor norms — they have not been individually verified per model. The
 * proposed YAML's banner instructs users to verify before committing.
 */
function buildDefaultTemplate(
  owner: string,
  cli: string,
  cliModel: string,
): ProposedModelEntry {
  switch (owner) {
    case "anthropic":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: { type: "cli-session", auto_default: "xhigh" },
          apply_patch: false,
          task_budget: true,
          prompt_cache: true,
          computer_use: false,
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires Claude Pro or Max subscription",
      };

    case "openai":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: {
            type: "granular",
            levels: ["none", "low", "medium", "high", "xhigh"],
          },
          apply_patch: true,
          task_budget: false,
          prompt_cache: false,
          computer_use: false,
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires ChatGPT Plus or Pro subscription",
      };

    case "google":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: { type: "thinking-budget", modes: ["none", "dynamic"] },
          apply_patch: false,
          task_budget: false,
          prompt_cache: true,
          computer_use: false,
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires Google AI Pro subscription ($20/mo)",
      };

    case "qwen":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: { type: "binary-thinking" },
          apply_patch: false,
          task_budget: false,
          prompt_cache: false,
          computer_use: false,
          native_dispatch_from: [],
          api_only: false,
        },
        auth_hint:
          "Requires Qwen Code subscription or Bailian Coding Plan API key",
      };

    case "cursor":
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: null,
          apply_patch: false,
          task_budget: false,
          prompt_cache: false,
          computer_use: false,
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires Cursor Pro or Pro Student subscription",
      };

    default:
      return {
        cli,
        cli_model: cliModel,
        supports: {
          effort: null,
          apply_patch: false,
          task_budget: false,
          prompt_cache: false,
          computer_use: false,
          native_dispatch_from: [cli],
          api_only: false,
        },
        auth_hint: "Requires subscription or API key",
      };
  }
}

// ---------------------------------------------------------------------------
// YAML generation
// ---------------------------------------------------------------------------

/**
 * Generate an oma-config `models:` patch for accepted probe results.
 * Returns the YAML text as a string, ready to paste into
 * `.agents/oma-config.yaml`; when the project at `cwd` keeps its shared config
 * in `oma-config.cue` only, the header names that file and the local overlay.
 */
export function proposeMissingSlugs(
  probedNewModels: ProbedSourceModel[],
  proposedDate?: string,
  cwd?: string,
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

  const target = findProposalConfig(cwd ?? process.cwd()).cuePath
    ? "# This project's shared config is .agents/oma-config.cue, which outranks oma-config.yaml:\n# add these under its `models:` field (as CUE) to share them, or paste this YAML into\n# .agents/oma-config.local.yaml (local, gitignored) — `oma model propose --write` does that.\n"
    : "# Add to .agents/oma-config.yaml — merge under its `models:` block if you already have one.\n";
  const header = `# auto-proposed by model:propose on ${dateStr}\n${target}# Capability flags (effort, apply_patch, task_budget, prompt_cache, computer_use)\n# and auth_hint are conservative defaults — verify against vendor docs before committing.\n`;
  return `${header}${yamlBody}`;
}

// ---------------------------------------------------------------------------
// File write helper
// ---------------------------------------------------------------------------

/**
 * Slugs the user has already registered.
 *
 * The effective merged `models` (an oma-config.cue beside the YAML, the local
 * overlay and global defaults included), plus the YAML's own block when the
 * layers cannot be loaded. `.agents/config/models.yaml` is not read by the
 * registry, so a slug surviving there resolves nowhere and is worth proposing
 * rather than skipping.
 */
function readRegisteredSlugs(configPath: string): Set<string> {
  const slugs = new Set<string>();
  try {
    const models = loadConfigLayers(
      path.dirname(path.dirname(configPath)),
      process.env,
      { searchParents: false },
    ).config.models;
    if (isRecord(models))
      for (const slug of Object.keys(models)) slugs.add(slug);
  } catch {
    // CUE that cannot be evaluated: the YAML block below still counts.
  }

  let parsed: unknown;
  try {
    parsed = yamlParse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return slugs;
  }
  const models = isRecord(parsed) ? parsed.models : undefined;
  if (isRecord(models)) for (const slug of Object.keys(models)) slugs.add(slug);

  return slugs;
}

/**
 * The nearest project config. `cuePath` is set when it is CUE-only
 * (oma-config.cue without oma-config.yaml at the same root); the loader reads
 * the nearest `.agents/` only, so a CUE-only project nested under a YAML one is
 * still CUE-only.
 */
function findProposalConfig(startDir: string): {
  configPath: string | null;
  cuePath: string | null;
} {
  const configPath = findFileUpwards(startDir, OMA_CONFIG_RELATIVE_PATH);
  const cuePath = findFileUpwards(startDir, CUE_CONFIG_RELATIVE_PATH);
  const cueOnly =
    cuePath &&
    (!configPath ||
      path
        .dirname(path.dirname(cuePath))
        .startsWith(`${path.dirname(path.dirname(configPath))}${path.sep}`));
  return cueOnly
    ? { configPath: null, cuePath }
    : { configPath: configPath ?? null, cuePath: null };
}

/**
 * Append accepted model entries to the `models:` block of
 * `.agents/oma-config.yaml`, creating the block when the user has none.
 *
 * Writes go through {@link appendSectionEntries}, the append-only merge
 * migration 022 uses, so no key the user already wrote is ever rewritten.
 * Slugs already present in the `models:` block are reported as skipped.
 */
export function writeProposalToFile(
  probedNewModels: ProbedSourceModel[],
  cwd?: string,
  proposedDate?: string,
): ProposalWriteResult {
  const dateStr = proposedDate ?? new Date().toISOString().slice(0, 10);
  const startDir = cwd ?? process.cwd();
  const accepted = probedNewModels.filter(
    (m) => m.probeResult.status === "accepted",
  );

  const { configPath, cuePath } = findProposalConfig(startDir);
  if (cuePath) return writeProposalBesideCue(accepted, cuePath, dateStr);
  if (!configPath) {
    return {
      written: [],
      skipped: [],
      configPath: null,
      error:
        "no .agents/oma-config.yaml or .agents/oma-config.cue found — run `oma install` before writing proposals",
    };
  }

  let userRaw: string;
  try {
    userRaw = fs.readFileSync(configPath, "utf-8");
  } catch {
    return {
      written: [],
      skipped: [],
      configPath,
      error: `${configPath} is unreadable`,
    };
  }

  const registered = readRegisteredSlugs(configPath);
  const entries: Record<string, unknown> = {};
  const written: string[] = [];
  const skipped: string[] = [];

  for (const { slug, probeResult } of accepted) {
    if (registered.has(slug)) {
      skipped.push(slug);
      continue;
    }
    const slashIndex = slug.indexOf("/");
    const owner = slashIndex >= 0 ? slug.slice(0, slashIndex) : "";
    const cliModel = slashIndex >= 0 ? slug.slice(slashIndex + 1) : slug;

    entries[slug] = buildDefaultTemplate(owner, probeResult.cli, cliModel);
    written.push(slug);
  }

  if (written.length === 0) return { written, skipped, configPath };

  const { content, addedKeys } = appendSectionEntries(
    userRaw,
    "models",
    entries,
    `auto-proposed by model:propose on ${dateStr} — capability flags and auth_hint are conservative defaults, verify against vendor docs`,
  );
  if (addedKeys.length === 0) {
    return {
      written: [],
      skipped,
      configPath,
      error: `could not merge into the \`models:\` block of ${configPath} — add the entries manually with \`oma model propose\` (no --write)`,
    };
  }

  try {
    fs.writeFileSync(configPath, content, "utf-8");
  } catch {
    return {
      written: [],
      skipped,
      configPath,
      error: `${configPath} is not writable`,
    };
  }

  return { written, skipped, configPath };
}

/**
 * `--write` for a CUE-only project (oma-config.cue, no oma-config.yaml).
 *
 * The registry reads `models` from the merged config layers, and CUE outranks
 * oma-config.yaml, so a new slug goes to the gitignored local YAML overlay
 * through {@link planPreferenceWrite} (records merge across layers, so it adds
 * to the CUE `models` rather than replacing them). Slugs the effective config
 * already declares are skipped. Rewriting CUE as text is not attempted.
 */
function writeProposalBesideCue(
  accepted: ProbedSourceModel[],
  cuePath: string,
  dateStr: string,
): ProposalWriteResult {
  const root = path.dirname(path.dirname(cuePath));
  let registered: Set<string> = new Set();
  try {
    const models = loadConfigLayers(root, process.env, {
      searchParents: false,
    }).config.models;
    if (isRecord(models)) registered = new Set(Object.keys(models));
  } catch {
    // CUE that cannot be evaluated yet: planPreferenceWrite decides below.
  }
  const entries: Record<string, unknown> = {};
  const written: string[] = [];
  const skipped: string[] = [];
  for (const { slug, probeResult } of accepted) {
    if (registered.has(slug)) {
      skipped.push(slug);
      continue;
    }
    const slashIndex = slug.indexOf("/");
    const owner = slashIndex >= 0 ? slug.slice(0, slashIndex) : "";
    const cliModel = slashIndex >= 0 ? slug.slice(slashIndex + 1) : slug;
    entries[slug] = buildDefaultTemplate(owner, probeResult.cli, cliModel);
    written.push(slug);
  }
  if (written.length === 0) return { written, skipped, configPath: null };

  let plan: ReturnType<typeof planPreferenceWrite>;
  try {
    plan = planPreferenceWrite(
      root,
      written.map((slug) => [["models", slug], entries[slug]]),
    );
  } catch (error) {
    return {
      written: [],
      skipped,
      configPath: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  if (plan.warning)
    return { written: [], skipped, configPath: null, error: plan.warning };
  if (!plan.entries.length) return { written: [], skipped, configPath: null };

  let raw = "";
  try {
    if (fs.existsSync(plan.path)) raw = fs.readFileSync(plan.path, "utf-8");
  } catch {
    return {
      written: [],
      skipped,
      configPath: plan.path,
      error: `${plan.path} is unreadable`,
    };
  }
  const { content, addedKeys } = appendSectionEntries(
    raw,
    "models",
    Object.fromEntries(plan.entries.map(([keys, value]) => [keys[1], value])),
    `auto-proposed by model:propose on ${dateStr} — capability flags and auth_hint are conservative defaults, verify against vendor docs. oma-config.cue outranks oma-config.yaml, so this local, gitignored overlay holds them`,
  );
  if (addedKeys.length === 0) {
    return {
      written: [],
      skipped,
      configPath: plan.path,
      error: `could not merge into the \`models:\` block of ${plan.path} — add the entries manually with \`oma model propose\` (no --write)`,
    };
  }
  try {
    fs.writeFileSync(plan.path, content, "utf-8");
  } catch {
    return {
      written: [],
      skipped,
      configPath: plan.path,
      error: `${plan.path} is not writable`,
    };
  }
  return { written: addedKeys, skipped, configPath: plan.path };
}
