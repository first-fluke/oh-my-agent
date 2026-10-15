import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import { parseDocument } from "yaml";
import { storeSecret } from "../../io/vault.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import {
  loadConfigLayers,
  planPreferenceWrite,
} from "../../utils/config-layers.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { HonchoConfigSchema } from "../../utils/providers.js";

interface KeyOptions {
  kind?: string;
  profile?: string;
  keyEnv?: string;
  fromEnv?: string;
  dryRun?: boolean;
  json?: boolean;
  projectDir?: string;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}

function rejectSymlink(path: string): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    throw new Error(`Refusing to write credentials through a symlink: ${path}`);
  }
}

function writePrivate(path: string, text: string): void {
  rejectSymlink(path);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, text, { mode: 0o600, flag: "wx" });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

async function readKey(options: KeyOptions): Promise<string> {
  let value: string | undefined;
  if (options.fromEnv) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(options.fromEnv)) {
      throw new Error("--from-env must name an environment variable");
    }
    value = (options.env ?? process.env)[options.fromEnv];
    if (!value)
      throw new Error(`Set ${options.fromEnv} before configuring the key`);
  } else {
    if (options.json || !process.stdin.isTTY) {
      throw new Error("Use --from-env <name> without an interactive terminal");
    }
    const answer = await p.password({
      message: "API key (input hidden)",
      mask: "*",
    });
    if (p.isCancel(answer)) throw new Error("Credential setup cancelled");
    value = answer;
  }
  if (!value?.trim() || /[\r\n\0]/.test(value)) {
    throw new Error("API key must be a non-empty single line");
  }
  return value.trim();
}

/** Only prints locations and references; never returns the credential. */
export async function configureHonchoKey(options: KeyOptions = {}) {
  const kind = options.kind ?? "connection";
  if (kind === "connection") {
    const root = resolveProjectRoot(options.projectDir);
    const cue = join(root, ".agents", "oma-config.cue");
    // CUE outranks oma-config.yaml: read the effective Honcho settings and let
    // planPreferenceWrite pick the layer where the reference takes effect.
    const shared = existsSync(cue)
      ? cue
      : join(root, ".agents", "oma-config.yaml");
    if (!existsSync(shared))
      throw new Error(
        "Create .agents/oma-config.yaml or .agents/oma-config.cue first",
      );
    const readYaml = (path: string) => {
      rejectSymlink(path);
      const document = parseDocument(
        existsSync(path) ? readFileSync(path, "utf-8") : "",
      );
      if (document.errors.length)
        throw new Error("Cannot update invalid OMA YAML");
      const parsed = document.toJS() ?? {};
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("OMA config must be a YAML mapping");
      }
      return { document, parsed };
    };
    const config = HonchoConfigSchema.parse(
      (shared === cue
        ? loadConfigLayers(root, process.env, { searchParents: false }).config
            .honcho
        : readYaml(shared).parsed.honcho) ?? {},
    );
    const identity = [
      shared,
      config.base_url ?? "https://api.honcho.dev",
      config.workspace_id ?? "",
    ].join("\n");
    const name =
      config.api_key_vault ??
      `honcho-${createHash("sha256").update(identity).digest("hex").slice(0, 24)}`;
    const plan = planPreferenceWrite(root, [
      [["honcho", "api_key_vault"], name],
    ]);
    // Nothing to write when the effective config already holds the reference.
    const path = plan.entries.length ? plan.path : shared;
    const document = plan.entries.length ? readYaml(path).document : null;
    for (const [keys, value] of plan.entries) document?.setIn(keys, value);
    const result = {
      kind,
      storage: "os-keychain",
      name,
      configPath: path,
      dryRun: !!options.dryRun,
    };
    if (options.dryRun) return result;
    const value = await readKey(options);
    await storeSecret(name, value);
    if (document) writePrivate(path, document.toString());
    return result;
  }
  if (kind !== "embedding")
    throw new Error("--kind must be connection or embedding");
  const profile = options.profile ?? "oma";
  if (!/^[a-z][a-z0-9_-]{0,62}$/.test(profile))
    throw new Error("Invalid Honcho profile name");
  // These keys are recognized by honcho start's provider-key preflight as well.
  const keyEnv = options.keyEnv ?? "LLM_OPENAI_API_KEY";
  if (!["LLM_OPENAI_API_KEY", "LLM_GEMINI_API_KEY"].includes(keyEnv)) {
    throw new Error(
      "--key-env must be LLM_OPENAI_API_KEY or LLM_GEMINI_API_KEY",
    );
  }
  const home = options.homeDir ?? homedir();
  const override = (options.env ?? process.env).HONCHO_CONFIG_DIR;
  const configRoot = resolve(
    override === "~"
      ? home
      : override?.startsWith("~/")
        ? join(home, override.slice(2))
        : override || join(home, ".honcho"),
  );
  const insideProject = relative(
    resolveProjectRoot(options.projectDir),
    configRoot,
  );
  if (
    !insideProject ||
    (!insideProject.startsWith("..") && !isAbsolute(insideProject))
  ) {
    throw new Error(
      "Honcho credential profiles must be outside the project directory",
    );
  }
  const directory = join(configRoot, "profiles", profile);
  for (const path of [configRoot, join(configRoot, "profiles"), directory]) {
    rejectSymlink(path);
  }
  const path = join(directory, ".env");
  rejectSymlink(path);
  const previous = existsSync(path) ? readFileSync(path, "utf-8") : "";
  const result = {
    kind,
    storage: "honcho-profile",
    profile,
    keyEnv,
    envPath: path,
    inferenceEnabled: false,
    dryRun: !!options.dryRun,
  };
  if (options.dryRun) return result;
  const value = await readKey(options);
  if (/[\\']/.test(value)) {
    throw new Error(
      "Embedding API keys containing backslashes or single quotes are unsupported by the Honcho dotenv reader",
    );
  }
  const values: Record<string, string> = {
    [keyEnv]: value,
    EMBEDDING_MODEL_CONFIG__OVERRIDES__API_KEY_ENV: keyEnv,
    DERIVER_ENABLED: "false",
    SUMMARY_ENABLED: "false",
    PEER_CARD_ENABLED: "false",
    DREAM_ENABLED: "false",
    EMBED_MESSAGES: "true",
  };
  const kept = previous
    .split(/\r?\n/)
    .filter((line) => {
      const match = line.match(
        /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/,
      );
      return !match?.[1] || !(match[1] in values);
    })
    .join("\n")
    .trimEnd();
  // Single quotes preserve $ and # in both Honcho CLI and Compose dotenv readers.
  const lines = Object.entries(values).map(
    ([name, text]) =>
      `${name}='${text.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`,
  );
  writePrivate(path, `${kept ? `${kept}\n` : ""}${lines.join("\n")}\n`);
  return result;
}

export function registerHonchoKeys(program: Command): void {
  addOutputOptions(
    program
      .command("memory:keys")
      .description("Configure Honcho connection or local embedding credentials")
      .option("--kind <kind>", "connection or embedding", "connection")
      .option(
        "--profile <name>",
        "Local Honcho profile for embedding keys",
        "oma",
      )
      .option(
        "--key-env <name>",
        "Existing embedding provider key variable",
        "LLM_OPENAI_API_KEY",
      )
      .option(
        "--from-env <name>",
        "Read the key from this variable instead of prompting",
      )
      .option(
        "--dry-run",
        "Preview destinations without reading or writing keys",
      ),
  ).action(
    runAction(
      async (options) => {
        const json = resolveJsonMode(options);
        const result = await configureHonchoKey({ ...options, json });
        if (json) console.log(JSON.stringify(result, null, 2));
        else if ("configPath" in result) {
          console.log(
            `${result.dryRun ? "Would store" : "Stored"} Honcho connection key in the OS keychain (${result.name}).`,
          );
          console.log(`Configuration reference: ${result.configPath}`);
        } else {
          console.log(
            `${result.dryRun ? "Would store" : "Stored"} embedding key in ${result.envPath} (owner-only permissions).`,
          );
          console.log(
            "Automatic inference is disabled; message embeddings remain enabled.",
          );
          console.log(
            "Restart this Honcho profile to apply changes. Its embedding model and endpoint configuration are preserved.",
          );
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
