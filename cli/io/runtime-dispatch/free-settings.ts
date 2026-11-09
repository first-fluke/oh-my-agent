import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type ParseError, parse } from "jsonc-parser";
import {
  FreeProviderError,
  type LlmProvider,
} from "../../utils/free-provider.js";
import { isRecord } from "../../utils/type-guards.js";

interface FreeSettingsRequest {
  vendor: string;
  provider: LlmProvider;
  env: NodeJS.ProcessEnv;
  workspace?: string;
}

/** Refuse native settings that would override the child-only proxy route/key. */
export function assertFreeSettings({
  vendor,
  provider,
  env,
  workspace = process.cwd(),
}: FreeSettingsRequest): void {
  if (vendor === "codex") return; // The complete provider table is a CLI override.
  const files = new Set<string>();
  const home = env.HOME ?? homedir();
  if (vendor === "claude") {
    files.add(
      join(env.CLAUDE_CONFIG_DIR ?? join(home, ".claude"), "settings.json"),
    );
    files.add(
      process.platform === "darwin"
        ? "/Library/Application Support/ClaudeCode/managed-settings.json"
        : "/etc/claude-code/managed-settings.json",
    );
  } else {
    files.add(join(home, ".qwen", "settings.json"));
    files.add(
      env.QWEN_CODE_SYSTEM_SETTINGS_PATH ??
        (process.platform === "darwin"
          ? "/Library/Application Support/QwenCode/settings.json"
          : "/etc/qwen-code/settings.json"),
    );
    if (env.QWEN_CODE_SYSTEM_DEFAULTS_PATH)
      files.add(env.QWEN_CODE_SYSTEM_DEFAULTS_PATH);
  }
  let dir = resolve(workspace);
  while (true) {
    files.add(join(dir, `.${vendor}`, "settings.json"));
    if (vendor === "claude")
      files.add(join(dir, ".claude", "settings.local.json"));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const file of files) {
    if (!existsSync(file)) continue;
    const errors: ParseError[] = [];
    let settings: unknown;
    try {
      settings = parse(readFileSync(file, "utf8"), errors);
    } catch {
      throw new FreeProviderError(
        `Cannot inspect ${vendor} settings at ${file}.`,
      );
    }
    if (errors.length || !isRecord(settings))
      throw new FreeProviderError(
        `Invalid ${vendor} settings at ${file}; cannot verify the ${provider.name} route.`,
      );
    if (isRecord(settings.env)) {
      const names =
        vendor === "claude"
          ? [
              "ANTHROPIC_BASE_URL",
              "ANTHROPIC_API_KEY",
              "ANTHROPIC_AUTH_TOKEN",
              "CLAUDE_CODE_OAUTH_TOKEN",
              "CLAUDE_CODE_USE_BEDROCK",
              "CLAUDE_CODE_USE_VERTEX",
              "CLAUDE_CODE_USE_FOUNDRY",
              "CLAUDE_CODE_USE_MANTLE",
            ]
          : ["OPENAI_BASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL"];
      for (const name of names) {
        if (settings.env[name] && settings.env[name] !== env[name]) {
          throw new FreeProviderError(
            `${file} sets ${name}, overriding the ${provider.name} route. Remove the conflicting setting or use --vendor codex.`,
          );
        }
      }
    }
    if (vendor === "qwen" && isRecord(settings.modelProviders)) {
      const entries = settings.modelProviders.openai;
      if (
        Array.isArray(entries) &&
        entries.some(
          (entry: unknown) => isRecord(entry) && entry.id === provider.model,
        )
      ) {
        throw new FreeProviderError(
          `${file} defines the selected model in modelProviders, which overrides Qwen CLI/env credentials. Remove that conflicting entry or use --vendor codex.`,
        );
      }
    }
  }
}
