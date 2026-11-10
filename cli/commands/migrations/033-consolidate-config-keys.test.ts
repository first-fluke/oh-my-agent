import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  consolidateConfigKeys,
  migrateConsolidateConfigKeys,
} from "./033-consolidate-config-keys.js";
import { runMigrationsWithStatus } from "./index.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const LEGACY = `# oh-my-agent — project config
language: en            # response language
model_preset: free

# FreeLLMAPI gateway
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto:coding

default_cli: codex

providers:
  code_intelligence: serena  # keep serena

brave:
  api_key_env: TEAM_BRAVE_KEY
honcho:
  base_url: https://honcho.example.com
  workspace_id: team

agents:
  eval:
    model: anthropic/claude-sonnet-5-5

diagram:
  engine: auto
  archify:
    managed: true
    channel: stable
    check_interval_min: 60
    quality: showcase
market:
  managed: true
  path: /opt/last30days
`;

describe("consolidateConfigKeys", () => {
  it("moves free, credential sections and default_cli, drops dead keys, keeps comments", () => {
    const { text, actions } = consolidateConfigKeys(LEGACY);
    const config = parse(text);
    expect(config.free).toBeUndefined();
    expect(config.providers).toEqual({
      code_intelligence: "serena",
      free: {
        base_url: "http://127.0.0.1:31415/v1",
        api_key_env: "FREELLM_API_KEY",
        default_model: "auto:coding",
      },
      brave: { api_key_env: "TEAM_BRAVE_KEY" },
      honcho: { base_url: "https://honcho.example.com", workspace_id: "team" },
    });
    expect(config.brave).toBeUndefined();
    expect(config.honcho).toBeUndefined();
    expect(config.default_cli).toBeUndefined();
    expect(config.agents).toEqual({
      default: { cli: "codex" },
      eval: { model: "anthropic/claude-sonnet-5-5" },
    });
    expect(config.diagram).toEqual({
      engine: "auto",
      archify: { quality: "showcase" },
    });
    expect(config.market).toEqual({ path: "/opt/last30days" });
    // Untouched keys keep their comments and the preset stays.
    expect(text).toMatch(/language: en\s+# response language/);
    expect(text).toMatch(/code_intelligence: serena\s+# keep serena/);
    expect(text.startsWith("# oh-my-agent — project config")).toBe(true);
    expect(config.model_preset).toBe("free");
    expect(actions).toEqual([
      "moved free: → providers.free (model → default_model)",
      "moved brave: → providers.brave",
      "moved honcho: → providers.honcho",
      "moved default_cli: → agents.default.cli",
      "removed diagram.archify.managed (ignored)",
      "removed diagram.archify.channel (ignored)",
      "removed diagram.archify.check_interval_min (ignored)",
      "removed market.managed (ignored)",
    ]);
  });

  it("is idempotent and leaves an already-consolidated file byte-identical", () => {
    const first = consolidateConfigKeys(LEGACY);
    const second = consolidateConfigKeys(first.text);
    expect(second.actions).toEqual([]);
    expect(second.text).toBe(first.text);
    const modern =
      "model_preset: auto\nproviders:\n  exaone:\n    base_url: https://x/v1\n    api_key_env: K\nagents:\n  default: { effort: medium }\n";
    expect(consolidateConfigKeys(modern)).toEqual({
      text: modern,
      actions: [],
    });
  });

  it("drops the legacy key when the new spelling already exists", () => {
    const { text, actions } = consolidateConfigKeys(
      "model_preset: auto\nfree:\n  model: old\ndefault_cli: claude\nproviders:\n  free:\n    default_model: new\nagents:\n  default:\n    cli: codex\n",
    );
    const config = parse(text);
    expect(config.providers.free.default_model).toBe("new");
    expect(config.agents.default.cli).toBe("codex");
    expect(config.free).toBeUndefined();
    expect(config.default_cli).toBeUndefined();
    expect(actions).toEqual([
      "removed free: (providers.free wins)",
      "removed default_cli: (agents.default.cli wins)",
    ]);
  });

  it("does not touch a file whose root is not a map", () => {
    expect(consolidateConfigKeys("- a\n- b\n")).toEqual({
      text: "- a\n- b\n",
      actions: [],
    });
  });
});

describe("migrateConsolidateConfigKeys", () => {
  it("rewrites the shared and local files, reports per file, and is a state-only migration", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migration-033-"));
    roots.push(root);
    mkdirSync(join(root, ".agents"));
    writeFileSync(join(root, ".agents", "oma-config.yaml"), LEGACY);
    writeFileSync(
      join(root, ".agents", "oma-config.local.yaml"),
      "model_preset: free\nfree:\n  model: local\n",
    );

    const result = runMigrationsWithStatus(root, undefined, [
      migrateConsolidateConfigKeys,
    ]);

    expect(result.requiresReconcile).toBe(false);
    expect(result.failures).toEqual([]);
    expect(result.actions).toContain(
      ".agents/oma-config.yaml: moved free: → providers.free (model → default_model)",
    );
    expect(result.actions).toContain(
      ".agents/oma-config.local.yaml: moved free: → providers.free (model → default_model)",
    );
    const local = parse(
      readFileSync(join(root, ".agents", "oma-config.local.yaml"), "utf-8"),
    );
    expect(local).toEqual({
      model_preset: "free",
      providers: { free: { default_model: "local" } },
    });
    expect(migrateConsolidateConfigKeys.up(root)).toEqual([]);
  });

  it("is a no-op without config files", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migration-033-empty-"));
    roots.push(root);
    expect(migrateConsolidateConfigKeys.up(root)).toEqual([]);
    expect(existsSync(join(root, ".agents"))).toBe(false);
  });
});
