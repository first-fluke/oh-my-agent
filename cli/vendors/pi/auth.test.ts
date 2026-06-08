import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isPiAuthenticated } from "./auth.js";

describe("isPiAuthenticated", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function tempAgentDir(): string {
    const root = mkdtempSync(join(tmpdir(), "oma-pi-auth-"));
    roots.push(root);
    return root;
  }

  /** Base env that points pi at an empty temp dir so the real ~/.pi is never read. */
  function isolatedEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    return { PI_CODING_AGENT_DIR: tempAgentDir(), ...extra };
  }

  it("returns true when a provider API key is present (precedence)", () => {
    expect(
      isPiAuthenticated(isolatedEnv({ ANTHROPIC_API_KEY: "sk-ant-x" })),
    ).toBe(true);
    expect(isPiAuthenticated(isolatedEnv({ OPENAI_API_KEY: "sk-x" }))).toBe(
      true,
    );
    expect(isPiAuthenticated(isolatedEnv({ GEMINI_API_KEY: "g-x" }))).toBe(
      true,
    );
  });

  it("ignores blank/whitespace-only API keys", () => {
    expect(isPiAuthenticated(isolatedEnv({ ANTHROPIC_API_KEY: "   " }))).toBe(
      false,
    );
  });

  it("returns false when no auth.json and no env key", () => {
    expect(isPiAuthenticated(isolatedEnv())).toBe(false);
  });

  it("returns true when auth.json has a non-empty entry", () => {
    const dir = tempAgentDir();
    writeFileSync(
      join(dir, "auth.json"),
      JSON.stringify({ anthropic: { key: "sk-ant-x" } }),
    );
    expect(isPiAuthenticated({ PI_CODING_AGENT_DIR: dir })).toBe(true);
  });

  it("accepts string-valued auth.json entries ($VAR / !command form)", () => {
    const dir = tempAgentDir();
    writeFileSync(
      join(dir, "auth.json"),
      JSON.stringify({ openai: "$OPENAI_API_KEY" }),
    );
    expect(isPiAuthenticated({ PI_CODING_AGENT_DIR: dir })).toBe(true);
  });

  it("returns false for an empty auth.json object", () => {
    const dir = tempAgentDir();
    writeFileSync(join(dir, "auth.json"), JSON.stringify({}));
    expect(isPiAuthenticated({ PI_CODING_AGENT_DIR: dir })).toBe(false);
  });

  it("returns false for malformed auth.json", () => {
    const dir = tempAgentDir();
    writeFileSync(join(dir, "auth.json"), "{ not json");
    expect(isPiAuthenticated({ PI_CODING_AGENT_DIR: dir })).toBe(false);
  });
});
