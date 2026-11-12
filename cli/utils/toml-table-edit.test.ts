import { describe, expect, it } from "vitest";
import { editTomlTables } from "./toml-table-edit.js";

const ORIGINAL = `# user comment kept verbatim
model = "gpt-5"

[projects."/work/a"]
trust_level = "trusted"

[hooks.state."/work/a/.codex/hooks.json:stop:0:0"]
enabled = true
trusted_hash = "sha256:old" # reviewed
`;

describe("editTomlTables", () => {
  it("replaces a field in place and appends a missing table", () => {
    const result = editTomlTables(ORIGINAL, [
      {
        prefix: "hooks.state",
        key: "/work/a/.codex/hooks.json:stop:0:0",
        fields: [{ name: "trusted_hash", value: "sha256:new" }],
      },
      {
        prefix: "projects",
        key: "/work/b",
        fields: [{ name: "trust_level", value: "trusted" }],
      },
    ]);

    expect(result).toEqual({
      ok: true,
      outcomes: ["changed", "changed"],
      text: `# user comment kept verbatim
model = "gpt-5"

[projects."/work/a"]
trust_level = "trusted"

[hooks.state."/work/a/.codex/hooks.json:stop:0:0"]
enabled = true
trusted_hash = "sha256:new"

[projects."/work/b"]
trust_level = "trusted"
`,
    });
  });

  it("returns the original text when every value already matches", () => {
    const result = editTomlTables(ORIGINAL, [
      {
        prefix: "projects",
        key: "/work/a",
        fields: [{ name: "trust_level", value: "trusted" }],
      },
    ]);

    expect(result).toEqual({
      ok: true,
      outcomes: ["unchanged"],
      text: ORIGINAL,
    });
  });

  it("honours skip and onlyIfMissing", () => {
    const original = `[folders."/w"]\ntrusted = false\n\n[folders."/x"]\ntrusted = true\ndecided_at = 1\n`;
    const result = editTomlTables(original, [
      {
        prefix: "folders",
        key: "/w",
        fields: [{ name: "trusted", value: true }],
        skip: (current) => current.trusted === false,
      },
      {
        prefix: "folders",
        key: "/x",
        fields: [
          { name: "trusted", value: true },
          { name: "decided_at", value: 99, onlyIfMissing: true },
        ],
      },
    ]);

    expect(result).toEqual({
      ok: true,
      outcomes: ["skipped", "unchanged"],
      text: original,
    });
  });

  it("refuses an edit that would not round-trip", () => {
    // The table already exists as a dotted key, so appending a header would
    // define it twice.
    const original = `projects."/w".trust_level = "untrusted"\n`;
    const result = editTomlTables(original, [
      {
        prefix: "projects",
        key: "/w",
        fields: [{ name: "trust_level", value: "trusted" }],
      },
    ]);

    expect(result.ok).toBe(false);
  });

  it("refuses a document that does not parse", () => {
    expect(editTomlTables("[broken", []).ok).toBe(false);
  });
});
