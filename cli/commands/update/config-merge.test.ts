import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  appendMissingConfigKeys,
  appendSectionEntries,
} from "./config-merge.js";

const TEMPLATE = [
  "# oh-my-agent — project config",
  "language: en",
  "translation_voice: balanced",
  "date_format: ISO",
  "timezone: Asia/Seoul",
  "auto_update_cli: true",
  "telemetry: false",
  "docs:",
  "  auto_verify: false",
  "  check_urls: true",
  "model_preset: antigravity",
  "",
].join("\n");

describe("appendMissingConfigKeys", () => {
  it("appends template keys missing from the user file", () => {
    const user =
      "language: ko\ndate_format: ISO\ntimezone: Asia/Seoul\nmodel_preset: gemini\n";
    const { content, addedKeys } = appendMissingConfigKeys(user, TEMPLATE);

    expect(addedKeys).toEqual([
      "translation_voice",
      "auto_update_cli",
      "telemetry",
      "docs",
    ]);
    const merged = parseYaml(content) as Record<string, unknown>;
    expect(merged.translation_voice).toBe("balanced");
    expect(merged.auto_update_cli).toBe(true);
    expect(merged.telemetry).toBe(false);
    expect(merged.docs).toEqual({ auto_verify: false, check_urls: true });
  });

  it("never modifies keys the user already has", () => {
    const user = "language: ko\nmodel_preset: gemini\n";
    const { content } = appendMissingConfigKeys(user, TEMPLATE);

    const merged = parseYaml(content) as Record<string, unknown>;
    expect(merged.language).toBe("ko");
    expect(merged.model_preset).toBe("gemini");
    // Existing content stays byte-identical at the head of the file
    expect(content.startsWith(user)).toBe(true);
  });

  it("is a no-op when the user file already has every template key", () => {
    const { content, addedKeys } = appendMissingConfigKeys(TEMPLATE, TEMPLATE);
    expect(addedKeys).toEqual([]);
    expect(content).toBe(TEMPLATE);
  });

  it("treats an empty user file as having no keys", () => {
    const { addedKeys } = appendMissingConfigKeys("", TEMPLATE);
    expect(addedKeys).toContain("language");
    expect(addedKeys).toContain("model_preset");
  });

  it("leaves malformed user YAML untouched", () => {
    const broken = "language: [unclosed\n  nope";
    const { content, addedKeys } = appendMissingConfigKeys(broken, TEMPLATE);
    expect(content).toBe(broken);
    expect(addedKeys).toEqual([]);
  });

  it("handles a user file without a trailing newline", () => {
    const user = "language: ko";
    const { content } = appendMissingConfigKeys(user, TEMPLATE);
    expect(() => parseYaml(content)).not.toThrow();
    const merged = parseYaml(content) as Record<string, unknown>;
    expect(merged.language).toBe("ko");
    expect(merged.model_preset).toBe("antigravity");
  });
});

describe("appendSectionEntries", () => {
  const ENTRY = { cli: "cursor", cli_model: "composer-3" };

  it("creates the section when the user does not have it", () => {
    const user = "language: ko\n";
    const { content, addedKeys } = appendSectionEntries(
      user,
      "models",
      { "cursor/composer-3": ENTRY },
      "proposed",
    );

    expect(addedKeys).toEqual(["cursor/composer-3"]);
    expect(content.startsWith(user)).toBe(true);
    const merged = parseYaml(content) as Record<string, unknown>;
    expect(merged.models).toEqual({ "cursor/composer-3": ENTRY });
  });

  it("appends into an existing section without a duplicate key", () => {
    const user =
      "language: ko\nmodels:\n  cursor/auto:\n    cli: cursor\n    cli_model: auto\n";
    const { content, addedKeys } = appendSectionEntries(
      user,
      "models",
      { "cursor/composer-3": ENTRY },
      "proposed",
    );

    expect(addedKeys).toEqual(["cursor/composer-3"]);
    expect(content.match(/^models:/gm)).toHaveLength(1);
    const merged = parseYaml(content) as Record<string, unknown>;
    expect(merged.models).toEqual({
      "cursor/auto": { cli: "cursor", cli_model: "auto" },
      "cursor/composer-3": ENTRY,
    });
  });

  it("keeps the keys that follow the section intact", () => {
    const user = [
      "models:",
      "  cursor/auto:",
      "    cli: cursor",
      "",
      "# a user comment",
      "telemetry: false",
      "",
    ].join("\n");
    const { content } = appendSectionEntries(
      user,
      "models",
      { "cursor/composer-3": ENTRY },
      "proposed",
    );

    expect(content).toContain("# a user comment");
    const merged = parseYaml(content) as Record<string, unknown>;
    expect(merged.telemetry).toBe(false);
    expect(Object.keys(merged.models as object)).toEqual([
      "cursor/auto",
      "cursor/composer-3",
    ]);
  });

  it("fills a section the user left empty", () => {
    const { content } = appendSectionEntries(
      "models:\nlanguage: ko\n",
      "models",
      { "cursor/composer-3": ENTRY },
      "proposed",
    );

    const merged = parseYaml(content) as Record<string, unknown>;
    expect(merged.models).toEqual({ "cursor/composer-3": ENTRY });
    expect(merged.language).toBe("ko");
  });

  it("writes the header comment above the appended entries", () => {
    const { content } = appendSectionEntries(
      "models:\n  cursor/auto:\n    cli: cursor\n",
      "models",
      { "cursor/composer-3": ENTRY },
      "proposed by model:propose",
    );
    expect(content).toContain("  # proposed by model:propose");
  });

  it("ignores a commented-out section header", () => {
    const user = "# models:\n#   cursor/auto:\nlanguage: ko\n";
    const { content, addedKeys } = appendSectionEntries(
      user,
      "models",
      { "cursor/composer-3": ENTRY },
      "proposed",
    );

    expect(addedKeys).toEqual(["cursor/composer-3"]);
    expect(content).toContain("# models:");
    const merged = parseYaml(content) as Record<string, unknown>;
    expect(merged.models).toEqual({ "cursor/composer-3": ENTRY });
  });

  it("refuses to touch a section that is not a mapping", () => {
    const user = "models: [a, b]\n";
    const { content, addedKeys } = appendSectionEntries(
      user,
      "models",
      { "cursor/composer-3": ENTRY },
      "proposed",
    );
    expect(addedKeys).toEqual([]);
    expect(content).toBe(user);
  });

  it("leaves malformed user YAML untouched", () => {
    const broken = "models: [unclosed\n  nope";
    const { content, addedKeys } = appendSectionEntries(
      broken,
      "models",
      { "cursor/composer-3": ENTRY },
      "proposed",
    );
    expect(addedKeys).toEqual([]);
    expect(content).toBe(broken);
  });

  it("is a no-op for an empty entry set", () => {
    const user = "models:\n  cursor/auto:\n    cli: cursor\n";
    const { content, addedKeys } = appendSectionEntries(
      user,
      "models",
      {},
      "proposed",
    );
    expect(addedKeys).toEqual([]);
    expect(content).toBe(user);
  });
});
