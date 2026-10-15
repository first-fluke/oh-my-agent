import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { isMap, parseDocument } from "yaml";
import { createSearchProviderRegistry } from "../../platform/search-providers.js";
import {
  loadConfigLayers,
  type PreferenceEntry,
  planPreferenceWrite,
} from "../../utils/config-layers.js";
import {
  type HonchoConfig,
  HonchoConfigSchema,
  type ProvidersConfig,
  ProvidersSchema,
} from "../../utils/providers.js";

export type ProviderInstallOptions = {
  webSearch?: string;
  codeIntelligence?: "serena" | "gortex";
  semanticMemory?: "agentmemory" | "honcho" | "none";
  honchoUrl?: string;
  honchoWorkspace?: string;
};

export type ProviderSelection = {
  providers: Required<
    Pick<ProvidersConfig, "code_intelligence" | "semantic_memory" | "web">
  >;
  honcho?: HonchoConfig;
};

/** What the provider readers (loadProviders) resolve an unset choice to. */
const PROVIDER_DEFAULTS: ProviderSelection["providers"] = {
  web: "native",
  code_intelligence: "serena",
  semantic_memory: "agentmemory",
};

function readMapping(value: unknown): unknown {
  if (value == null) return {};
  if (!isMap(value))
    throw new Error("Expected provider settings to be a mapping.");
  return value.toJSON();
}

/**
 * A saved top-level section. YAML projects read it from the document being
 * edited; a project with oma-config.cue reads the effective config instead,
 * since CUE outranks YAML and a CUE-only project has no YAML file at all.
 */
function readSaved(
  root: string,
  doc: ReturnType<typeof parseDocument>,
  key: "providers" | "honcho",
): unknown {
  if (!existsSync(join(root, ".agents", "oma-config.cue")))
    return readMapping(doc.get(key, true));
  try {
    const { config } = loadConfigLayers(root, process.env, {
      searchParents: false,
    });
    return config[key] ?? {};
  } catch {
    // CUE that cannot be evaluated yet (no `cue` binary until install ensures
    // it) must not abort a reinstall; fall back to the YAML document, if any.
    return readMapping(doc.get(key, true));
  }
}

function readPreferences(
  root: string,
  path = join(root, ".agents", "oma-config.yaml"),
) {
  const doc = parseDocument(existsSync(path) ? readFileSync(path, "utf8") : "");
  if (doc.errors.length || (doc.contents != null && !isMap(doc.contents)))
    throw new Error(`Invalid configuration in ${path}`);
  return { path, doc };
}

/** Resolve explicit choices before prompting; reinstall retains saved providers. */
export async function promptProviders(
  root: string,
  nonInteractive: boolean,
  cleanup: () => void,
  options: ProviderInstallOptions = {},
): Promise<ProviderSelection> {
  const { doc } = readPreferences(root);
  const existing = ProvidersSchema.parse(readSaved(root, doc, "providers"));
  const explicit = ProvidersSchema.parse({
    web: options.webSearch,
    code_intelligence: options.codeIntelligence,
    semantic_memory: options.semanticMemory,
  });
  const chosen: ProviderSelection = {
    providers: {
      web: explicit.web ?? existing.web ?? PROVIDER_DEFAULTS.web,
      code_intelligence:
        explicit.code_intelligence ??
        existing.code_intelligence ??
        PROVIDER_DEFAULTS.code_intelligence,
      semantic_memory:
        explicit.semantic_memory ??
        existing.semantic_memory ??
        PROVIDER_DEFAULTS.semantic_memory,
    },
  };
  const searchRegistry = createSearchProviderRegistry();
  if (explicit.web) searchRegistry.resolve(explicit.web, "web");
  const uncancel = <T>(value: T | symbol): T => {
    if (p.isCancel(value)) {
      cleanup();
      p.cancel("Cancelled.");
      process.exit(0);
    }
    return value as T;
  };
  if (!nonInteractive && !explicit.code_intelligence) {
    chosen.providers.code_intelligence = uncancel(
      await p.select({
        message: "Code intelligence provider?",
        initialValue: chosen.providers.code_intelligence,
        options: [
          {
            value: "serena" as const,
            label: "Serena",
            hint: "default — language server code navigation",
          },
          {
            value: "gortex" as const,
            label: "Gortex",
            hint: "experimental — requires a separately installed Gortex",
          },
        ],
      }),
    );
  }
  if (!nonInteractive && !explicit.semantic_memory) {
    chosen.providers.semantic_memory = uncancel(
      await p.select({
        message: "Semantic memory provider?",
        initialValue: chosen.providers.semantic_memory,
        options: [
          {
            value: "agentmemory" as const,
            label: "Agent Memory",
            hint: "default — shared memory installed and started automatically",
          },
          {
            value: "honcho" as const,
            label: "Honcho",
            hint: "experimental — requires a running Honcho server",
          },
          {
            value: "none" as const,
            label: "None",
            hint: "keep only local workflow evidence",
          },
        ],
      }),
    );
  }
  if (!nonInteractive && !explicit.web) {
    const choices = searchRegistry.list("web").map((provider) => ({
      value: provider.id,
      label: provider.label,
      hint:
        provider.id === "native"
          ? "default — use the agent's native search"
          : "requires an API key",
    }));
    if (!choices.some((choice) => choice.value === chosen.providers.web))
      choices.push({
        value: chosen.providers.web,
        label: chosen.providers.web,
        hint: "saved provider — not registered",
      });
    chosen.providers.web = uncancel(
      await p.select({
        message: "Web search provider?",
        initialValue: chosen.providers.web,
        options: choices,
      }),
    );
  }
  if (chosen.providers.semantic_memory === "honcho") {
    const saved = HonchoConfigSchema.parse(readSaved(root, doc, "honcho"));
    let base_url =
      options.honchoUrl ?? saved.base_url ?? "http://127.0.0.1:8000";
    let workspace_id = options.honchoWorkspace ?? saved.workspace_id ?? "oma";
    if (!nonInteractive && !options.honchoUrl) {
      base_url = uncancel(
        await p.text({
          message: "Honcho server URL?",
          initialValue: base_url,
          validate: (value) =>
            HonchoConfigSchema.shape.base_url.safeParse(value).success
              ? undefined
              : "Enter a valid URL.",
        }),
      );
    }
    if (!nonInteractive && !options.honchoWorkspace) {
      workspace_id = uncancel(
        await p.text({
          message: "Honcho workspace ID?",
          initialValue: workspace_id,
          validate: (value) =>
            value &&
            HonchoConfigSchema.shape.workspace_id.safeParse(value).success
              ? undefined
              : "Use 1–128 letters, digits, underscores or hyphens.",
        }),
      );
    }
    chosen.honcho = HonchoConfigSchema.parse({
      ...saved,
      base_url,
      workspace_id,
      recall_mode: saved.recall_mode ?? "messages",
    });
  } else if (
    options.honchoUrl !== undefined ||
    options.honchoWorkspace !== undefined
  ) {
    throw new Error(
      "Honcho connection options require --semantic-memory honcho.",
    );
  }
  return chosen;
}

/**
 * Persist before link() projects MCP, instructions and hook routing. A project
 * with oma-config.cue gets the choices that CUE does not already hold in the
 * local overlay, since CUE outranks oma-config.yaml (see planPreferenceWrite).
 */
export function saveProviders(
  root: string,
  selection: ProviderSelection,
): void {
  const entries: PreferenceEntry[] = [
    ...Object.entries(selection.providers).map(
      ([key, value]): PreferenceEntry => [
        ["providers", key],
        value,
        PROVIDER_DEFAULTS[key as keyof typeof PROVIDER_DEFAULTS],
      ],
    ),
    ...Object.entries(selection.honcho ?? {}).map(
      ([key, value]): PreferenceEntry => [["honcho", key], value],
    ),
  ];
  const plan = planPreferenceWrite(root, entries);
  if (plan.warning) p.log.warn(plan.warning);
  if (!plan.entries.length) return;
  const { path, doc } = readPreferences(root, plan.path);
  ProvidersSchema.parse(readMapping(doc.get("providers", true)));
  for (const [keys, value] of plan.entries) doc.setIn(keys, value);
  writeFileSync(path, doc.toString());
  if (plan.notice) p.log.info(plan.notice);
}

export function reportProviderSetup(selection: ProviderSelection): void {
  if (selection.providers.web === "brave")
    p.log.info(
      'Brave Search selected. Set BRAVE_SEARCH_API_KEY or run `oma vault store brave-search` for hidden key input. Test with `oma search web "your query"`; `oma doctor` checks credential availability without making a search request.',
    );
  if (selection.providers.code_intelligence === "gortex")
    p.log.info(
      "Gortex selected. Install the latest Gortex separately and choose repositories to track; then run `oma doctor`. Serena setup was skipped.",
    );
  if (selection.providers.semantic_memory === "honcho")
    p.log.info(
      "Honcho selected. Start your Honcho server separately. For local embedding credentials run `oma memory keys --kind embedding`; for server authentication run `oma memory keys --kind connection`. Run `oma memory status` to check access. New connections use message recall without inferred representations.",
    );
}
