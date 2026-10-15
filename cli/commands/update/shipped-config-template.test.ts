import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { appendMissingConfigKeys } from "../../platform/agent-config/config-merge.js";

// `.agents/oma-config.{cue,yaml}` in this repository is also the template every
// user receives: `oma install` copies it on a fresh install and `oma update`
// appends any top-level key it defines that the user's file lacks. A value that
// only fits the maintainers (their timezone) therefore lands in every install.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const TEMPLATE_YAML = readFileSync(
  resolve(REPO_ROOT, ".agents", "oma-config.yaml"),
  "utf-8",
);
const TEMPLATE_CUE = readFileSync(
  resolve(REPO_ROOT, ".agents", "oma-config.cue"),
  "utf-8",
);

describe("shipped oma-config template", () => {
  it("does not pin a timezone, so the host system timezone applies", () => {
    const parsed = parseYaml(TEMPLATE_YAML) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty("timezone");
    // The schema keeps `timezone?: string`; only a concrete value is a leak.
    expect(TEMPLATE_CUE).not.toMatch(/^\s*timezone:\s*"/m);
  });

  it("does not add a timezone to a user config that omits it on update", () => {
    const user = "language: en\nmodel_preset: auto\n";
    const { addedKeys, content } = appendMissingConfigKeys(user, TEMPLATE_YAML);
    expect(addedKeys).not.toContain("timezone");
    expect(content).not.toMatch(/^timezone:/m);
  });

  // An absent `mcp.devtools_browsers` means "leave browser MCP entries alone".
  // A live key in the template would be appended on update and wire an Aside
  // server for users who never chose it (update does not install Aside).
  it("does not add a browser MCP selection to a user config on update", () => {
    const user = "language: en\nmodel_preset: auto\n";
    const { addedKeys } = appendMissingConfigKeys(user, TEMPLATE_YAML);
    expect(addedKeys).not.toContain("mcp");
  });
});
