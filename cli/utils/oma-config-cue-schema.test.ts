// The shipped `.agents/oma-config.cue` schema rejected two shapes the CLI
// itself writes: the installer's `vendors` list (typed as the `vendors.pi`
// map, which nothing reads) and the object `supports.effort` of every
// `oma model propose` entry (typed as a scalar, which the registry drops).
// Runs the real `cue` binary; skipped when it is not installed.

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { proposeMissingSlugs } from "../commands/model/propose.js";
import { ModelSpecSchema } from "../platform/model-registry/schema.js";
import { isCueAvailable } from "./cue.js";

const TEMPLATE = fileURLToPath(
  new URL("../../.agents/oma-config.cue", import.meta.url),
);

const accepted = (slug: string, cli: string) => ({
  slug,
  probeResult: {
    slug,
    cli,
    cliModel: slug.split("/")[1] as string,
    status: "accepted" as const,
    durationMs: 1,
  },
});

describe.skipIf(!isCueAvailable())("shipped oma-config.cue schema", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-cue-schema-"));
    copyFileSync(TEMPLATE, join(dir, "oma-config.cue"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** `cue vet` the template unified with `fields` (JSON is valid CUE). */
  const vet = (fields: Record<string, unknown>) => {
    const extra = Object.entries(fields)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join("\n");
    writeFileSync(join(dir, "extra.cue"), `package config\n\n${extra}\n`);
    return spawnSync(
      "cue",
      ["vet", "-c", join(dir, "oma-config.cue"), join(dir, "extra.cue")],
      { encoding: "utf8" },
    );
  };

  it("vets as shipped", () => {
    expect(vet({}).stderr).toBe("");
  });

  it("accepts the installer's vendor selection list", () => {
    const result = vet({ vendors: ["claude", "codex", "pi"] });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("accepts every model entry `oma model propose` writes", () => {
    const yaml = proposeMissingSlugs(
      [
        accepted("anthropic/claude-x", "claude"),
        accepted("openai/gpt-x", "codex"),
        accepted("google/gemini-x", "antigravity"),
        accepted("qwen/qwen-x", "qwen"),
        accepted("cursor/composer-x", "cursor"),
        accepted("other/model-x", "opencode"),
      ],
      "2026-10-15",
    );
    const { models } = parse(yaml) as { models: Record<string, unknown> };
    // The same entries pass the registry's own validation.
    for (const entry of Object.values(models))
      expect(ModelSpecSchema.safeParse(entry).success).toBe(true);

    const result = vet({ models });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("still rejects an effort the registry cannot read", () => {
    const result = vet({
      models: {
        "openai/gpt-x": {
          cli: "codex",
          cli_model: "gpt-x",
          supports: { effort: "turbo" },
        },
      },
    });
    expect(result.status).not.toBe(0);
  });
});
