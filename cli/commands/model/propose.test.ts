// cli/commands/model/propose.test.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import type { ProbedSourceModel } from "./propose.js";
import { proposeMissingSlugs, writeProposalToFile } from "./propose.js";

function makeProbed(
  slug: string,
  status:
    | "accepted"
    | "rejected"
    | "auth_required"
    | "quota_exceeded"
    | "unknown" = "accepted",
): ProbedSourceModel {
  const slashIndex = slug.indexOf("/");
  const owner = slashIndex >= 0 ? slug.slice(0, slashIndex) : "";
  const cliModel = slashIndex >= 0 ? slug.slice(slashIndex + 1) : slug;

  const ownerToCli: Record<string, string> = {
    anthropic: "claude",
    openai: "codex",
    google: "gemini",
    qwen: "qwen",
    cursor: "cursor",
  };
  const cli = ownerToCli[owner] ?? owner;

  return {
    slug,
    probeResult: {
      slug,
      cli,
      cliModel,
      status,
      durationMs: 500,
    },
  };
}

// ---------------------------------------------------------------------------
// proposeMissingSlugs
// ---------------------------------------------------------------------------

describe("proposeMissingSlugs", () => {
  it("returns no-op comment when no accepted candidates", () => {
    const output = proposeMissingSlugs(
      [makeProbed("anthropic/claude-new", "rejected")],
      "2026-05-09",
    );
    expect(output).toContain("no accepted candidates found");
  });

  it("returns no-op comment when input is empty", () => {
    const output = proposeMissingSlugs([], "2026-05-09");
    expect(output).toContain("no accepted candidates found");
  });

  it("generates valid YAML with models key", () => {
    const output = proposeMissingSlugs(
      [makeProbed("anthropic/claude-opus-5-0")],
      "2026-05-09",
    );
    expect(output).toContain("models:");
    expect(output).toContain("anthropic/claude-opus-5-0");
  });

  it("points at oma-config.yaml, not the deprecated models.yaml", () => {
    const output = proposeMissingSlugs(
      [makeProbed("anthropic/claude-opus-5-0")],
      "2026-05-09",
    );
    expect(output).toContain(".agents/oma-config.yaml");
    expect(output).not.toContain("models.yaml");
  });

  it("includes cli and cli_model in generated YAML", () => {
    const output = proposeMissingSlugs(
      [makeProbed("anthropic/claude-opus-5-0")],
      "2026-05-09",
    );
    expect(output).toContain("cli: claude");
    expect(output).toContain("cli_model: claude-opus-5-0");
  });

  it("generates English auth hints", () => {
    const output = proposeMissingSlugs(
      [makeProbed("cursor/composer-3"), makeProbed("qwen/qwen4-coder")],
      "2026-05-09",
    );
    expect(output).toContain("Requires Cursor Pro or Pro Student subscription");
    expect(output).toContain(
      "Requires Qwen Code subscription or Bailian Coding Plan API key",
    );
    expect(output).not.toMatch(/[가-힣]/);
  });

  it("includes date in header comment", () => {
    const output = proposeMissingSlugs(
      [makeProbed("anthropic/claude-opus-5-0")],
      "2026-05-09",
    );
    expect(output).toContain("2026-05-09");
  });

  it("filters out non-accepted models", () => {
    const models = [
      makeProbed("anthropic/claude-good", "accepted"),
      makeProbed("anthropic/claude-bad", "rejected"),
      makeProbed("anthropic/claude-auth", "auth_required"),
    ];
    const output = proposeMissingSlugs(models, "2026-05-09");
    expect(output).toContain("anthropic/claude-good");
    expect(output).not.toContain("anthropic/claude-bad");
    expect(output).not.toContain("anthropic/claude-auth");
  });

  it("generates correct defaults for openai/codex owner", () => {
    const output = proposeMissingSlugs(
      [makeProbed("openai/gpt-6")],
      "2026-05-09",
    );
    expect(output).toContain("cli: codex");
    expect(output).toContain("cli_model: gpt-6");
    expect(output).toContain("apply_patch: true");
  });

  it("generates correct defaults for google/gemini owner", () => {
    const output = proposeMissingSlugs(
      [makeProbed("google/gemini-4-pro")],
      "2026-05-09",
    );
    expect(output).toContain("cli: gemini");
    expect(output).toContain("cli_model: gemini-4-pro");
  });

  it("generates correct defaults for cursor owner", () => {
    const output = proposeMissingSlugs(
      [makeProbed("cursor/composer-3")],
      "2026-05-09",
    );
    expect(output).toContain("cli: cursor");
    expect(output).toContain("cli_model: composer-3");
  });

  it("generates correct defaults for qwen owner", () => {
    const output = proposeMissingSlugs(
      [makeProbed("qwen/qwen4-coder-plus")],
      "2026-05-09",
    );
    expect(output).toContain("cli: qwen");
    expect(output).toContain("cli_model: qwen4-coder-plus");
  });

  it("handles multiple accepted models", () => {
    const models = [
      makeProbed("anthropic/claude-a"),
      makeProbed("openai/gpt-z"),
    ];
    const output = proposeMissingSlugs(models, "2026-05-09");
    expect(output).toContain("anthropic/claude-a");
    expect(output).toContain("openai/gpt-z");
  });

  it("uses current date when no date is provided", () => {
    const output = proposeMissingSlugs([makeProbed("cursor/auto-2")]);
    // Should contain a date-like string (YYYY-MM-DD)
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

// ---------------------------------------------------------------------------
// writeProposalToFile
// ---------------------------------------------------------------------------

describe("writeProposalToFile", () => {
  let tmpDir: string;
  let configPath: string;

  const BASE_CONFIG = [
    "# oh-my-agent — project config",
    "language: ko",
    "model_preset: claude",
    "",
    "agents:",
    "  eval:",
    "    model: anthropic/claude-sonnet-4-6",
    "",
  ].join("\n");

  function readConfig(): string {
    return fs.readFileSync(configPath, "utf-8");
  }

  function writeLegacyModelsYaml(content: string): string {
    const legacyPath = path.join(tmpDir, ".agents", "config", "models.yaml");
    fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
    fs.writeFileSync(legacyPath, content, "utf-8");
    return legacyPath;
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-propose-test-"));
    fs.mkdirSync(path.join(tmpDir, ".agents"), { recursive: true });
    configPath = path.join(tmpDir, ".agents", "oma-config.yaml");
    fs.writeFileSync(configPath, BASE_CONFIG, "utf-8");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates the models: block when oma-config has none", () => {
    const { written, skipped } = writeProposalToFile(
      [makeProbed("cursor/composer-3")],
      tmpDir,
      "2026-05-09",
    );

    expect(written).toContain("cursor/composer-3");
    expect(skipped).toHaveLength(0);

    const parsed = parseYaml(readConfig()) as Record<string, unknown>;
    const models = parsed.models as Record<string, unknown>;
    expect(models["cursor/composer-3"]).toMatchObject({
      cli: "cursor",
      cli_model: "composer-3",
    });
  });

  it("appends into an existing models: block", () => {
    fs.writeFileSync(
      configPath,
      `${BASE_CONFIG}models:\n  cursor/auto:\n    cli: cursor\n    cli_model: auto\n\n# trailing user comment\ntelemetry: false\n`,
      "utf-8",
    );

    const { written } = writeProposalToFile(
      [makeProbed("cursor/composer-3")],
      tmpDir,
      "2026-05-09",
    );

    expect(written).toContain("cursor/composer-3");
    const parsed = parseYaml(readConfig()) as Record<string, unknown>;
    const models = parsed.models as Record<string, unknown>;
    expect(Object.keys(models)).toEqual(["cursor/auto", "cursor/composer-3"]);
    expect(models["cursor/auto"]).toEqual({ cli: "cursor", cli_model: "auto" });
    expect(parsed.telemetry).toBe(false);
    expect(readConfig()).toContain("# trailing user comment");
  });

  it("fills a models: key the user left empty", () => {
    fs.writeFileSync(configPath, `${BASE_CONFIG}models:\n`, "utf-8");

    const { written } = writeProposalToFile(
      [makeProbed("cursor/composer-3")],
      tmpDir,
      "2026-05-09",
    );

    expect(written).toContain("cursor/composer-3");
    const parsed = parseYaml(readConfig()) as Record<string, unknown>;
    expect(parsed.models).toHaveProperty("cursor/composer-3");
  });

  it("never rewrites the keys the user already had", () => {
    writeProposalToFile(
      [makeProbed("cursor/composer-3")],
      tmpDir,
      "2026-05-09",
    );

    const content = readConfig();
    expect(content.startsWith(BASE_CONFIG)).toBe(true);
    const parsed = parseYaml(content) as Record<string, unknown>;
    expect(parsed.language).toBe("ko");
    expect(parsed.model_preset).toBe("claude");
    expect(parsed.agents).toEqual({
      eval: { model: "anthropic/claude-sonnet-4-6" },
    });
  });

  it("skips slugs already in oma-config and reports them", () => {
    fs.writeFileSync(
      configPath,
      `${BASE_CONFIG}models:\n  cursor/composer-3:\n    cli: cursor\n    cli_model: composer-3\n`,
      "utf-8",
    );

    const { written, skipped } = writeProposalToFile(
      [makeProbed("cursor/composer-3")],
      tmpDir,
      "2026-05-09",
    );

    expect(written).toHaveLength(0);
    expect(skipped).toContain("cursor/composer-3");
  });

  it("proposes a slug that survives only in the deprecated models.yaml", () => {
    writeLegacyModelsYaml(
      "models:\n  cursor/composer-3:\n    cli: cursor\n    cli_model: composer-3\n",
    );

    const { written, skipped } = writeProposalToFile(
      [makeProbed("cursor/composer-3")],
      tmpDir,
      "2026-05-09",
    );

    // That file is no longer read, so the slug resolves nowhere until it lands
    // in oma-config — skipping it would strand the user.
    expect(skipped).toHaveLength(0);
    expect(written).toEqual(["cursor/composer-3"]);
  });

  it("leaves the deprecated models.yaml untouched", () => {
    const legacyRaw = "models:\n  cursor/auto:\n    cli: cursor\n";
    const legacyPath = writeLegacyModelsYaml(legacyRaw);

    writeProposalToFile(
      [makeProbed("cursor/composer-3")],
      tmpDir,
      "2026-05-09",
    );

    expect(fs.readFileSync(legacyPath, "utf-8")).toBe(legacyRaw);
  });

  it("filters out non-accepted models before writing", () => {
    const { written, skipped } = writeProposalToFile(
      [
        makeProbed("cursor/good-model", "accepted"),
        makeProbed("cursor/bad-model", "rejected"),
      ],
      tmpDir,
      "2026-05-09",
    );

    expect(written).toContain("cursor/good-model");
    expect(written).not.toContain("cursor/bad-model");
    expect(skipped).toHaveLength(0);
    expect(readConfig()).not.toContain("cursor/bad-model");
  });

  it("returns empty written array when no accepted models", () => {
    const { written, skipped } = writeProposalToFile(
      [makeProbed("cursor/bad-model", "rejected")],
      tmpDir,
      "2026-05-09",
    );

    expect(written).toHaveLength(0);
    expect(skipped).toHaveLength(0);
    expect(readConfig()).toBe(BASE_CONFIG);
  });

  it("reports an error when no oma-config.yaml exists", () => {
    fs.rmSync(configPath);

    const {
      written,
      configPath: resolved,
      error,
    } = writeProposalToFile(
      [makeProbed("cursor/composer-3")],
      tmpDir,
      "2026-05-09",
    );

    expect(written).toHaveLength(0);
    expect(resolved).toBeNull();
    expect(error).toContain("oma-config.yaml");
  });

  it("is idempotent across repeated runs", () => {
    const models = [makeProbed("cursor/composer-3")];
    writeProposalToFile(models, tmpDir, "2026-05-09");
    const afterFirst = readConfig();

    const second = writeProposalToFile(models, tmpDir, "2026-05-09");
    expect(second.written).toHaveLength(0);
    expect(second.skipped).toContain("cursor/composer-3");
    expect(readConfig()).toBe(afterFirst);
  });
});
