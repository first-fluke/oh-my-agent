// cli/commands/model/propose.test.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-propose-test-"));
    // Create .agents/config/ structure
    fs.mkdirSync(path.join(tmpDir, ".agents", "config"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates models.yaml when it does not exist", () => {
    const models = [makeProbed("cursor/composer-3")];
    const { written, skipped } = writeProposalToFile(
      models,
      tmpDir,
      "2026-05-09",
    );

    expect(written).toContain("cursor/composer-3");
    expect(skipped).toHaveLength(0);

    const filePath = path.join(tmpDir, ".agents", "config", "models.yaml");
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("cursor/composer-3");
  });

  it("appends to existing models.yaml", () => {
    const filePath = path.join(tmpDir, ".agents", "config", "models.yaml");
    fs.writeFileSync(
      filePath,
      "# existing file\nmodels:\n  cursor/auto:\n    cli: cursor\n    cli_model: auto\n",
      "utf-8",
    );

    const models = [makeProbed("cursor/composer-3")];
    const { written } = writeProposalToFile(models, tmpDir, "2026-05-09");

    expect(written).toContain("cursor/composer-3");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("cursor/auto:");
    expect(content).toContain("cursor/composer-3");
  });

  it("skips duplicate slugs and reports them", () => {
    const filePath = path.join(tmpDir, ".agents", "config", "models.yaml");
    fs.writeFileSync(
      filePath,
      "models:\n  cursor/composer-3:\n    cli: cursor\n    cli_model: composer-3\n",
      "utf-8",
    );

    const models = [makeProbed("cursor/composer-3")];
    const { written, skipped } = writeProposalToFile(
      models,
      tmpDir,
      "2026-05-09",
    );

    expect(written).toHaveLength(0);
    expect(skipped).toContain("cursor/composer-3");
  });

  it("filters out non-accepted models before writing", () => {
    const models = [
      makeProbed("cursor/good-model", "accepted"),
      makeProbed("cursor/bad-model", "rejected"),
    ];
    const { written, skipped } = writeProposalToFile(
      models,
      tmpDir,
      "2026-05-09",
    );

    expect(written).toContain("cursor/good-model");
    expect(written).not.toContain("cursor/bad-model");
    expect(skipped).toHaveLength(0);

    const filePath = path.join(tmpDir, ".agents", "config", "models.yaml");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("cursor/bad-model");
  });

  it("returns empty written array when no accepted models", () => {
    const models = [makeProbed("cursor/bad-model", "rejected")];
    const { written, skipped } = writeProposalToFile(
      models,
      tmpDir,
      "2026-05-09",
    );

    expect(written).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });
});
