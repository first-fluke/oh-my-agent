import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

const { storeSecret } = vi.hoisted(() => ({
  storeSecret: vi.fn().mockResolvedValue({ overwrote: false }),
}));
vi.mock("../../io/vault.js", () => ({ storeSecret }));

import { configureHonchoKey } from "./honcho-keys.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-honcho-keys-"));
  mkdirSync(join(root, ".agents"));
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "# keep this comment\nlanguage: ko\nhoncho:\n  workspace_id: team\n  api_key_env: CUSTOM_HONCHO_KEY\n",
  );
  storeSecret.mockClear();
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});
const secret = "synthetic-test-key-only";
const env = { INPUT_KEY: secret };

describe("Honcho credential setup", () => {
  it("stores a connection key in the vault and only its reference in project YAML", async () => {
    const result = await configureHonchoKey({
      projectDir: root,
      fromEnv: "INPUT_KEY",
      env,
    });
    if (!("name" in result)) throw new Error("Expected connection credential");
    expect(storeSecret).toHaveBeenCalledWith(result.name, secret);
    const text = readFileSync(join(root, ".agents", "oma-config.yaml"), "utf8");
    expect(text).toContain("# keep this comment");
    expect(text).not.toContain(secret);
    expect(parse(text)).toMatchObject({
      language: "ko",
      honcho: {
        workspace_id: "team",
        api_key_env: "CUSTOM_HONCHO_KEY",
        api_key_vault: result.name,
      },
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });
  it("uses the configured vault reference when rotating a key", async () => {
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "honcho:\n  api_key_vault: existing-key\n",
    );
    await configureHonchoKey({ projectDir: root, fromEnv: "INPUT_KEY", env });
    expect(storeSecret).toHaveBeenCalledWith("existing-key", secret);
  });
  it("does not change YAML when the OS keychain rejects storage", async () => {
    const path = join(root, ".agents", "oma-config.yaml");
    const before = readFileSync(path, "utf8");
    storeSecret.mockRejectedValueOnce(new Error("keychain unavailable"));
    await expect(
      configureHonchoKey({ projectDir: root, fromEnv: "INPUT_KEY", env }),
    ).rejects.toThrow("keychain unavailable");
    expect(readFileSync(path, "utf8")).toBe(before);
  });
  it("previews without requiring or storing any key", async () => {
    const before = readFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "utf8",
    );
    expect(
      await configureHonchoKey({ projectDir: root, dryRun: true }),
    ).toMatchObject({ dryRun: true });
    expect(
      await configureHonchoKey({
        kind: "embedding",
        homeDir: root,
        dryRun: true,
      }),
    ).toMatchObject({ dryRun: true });
    expect(storeSecret).not.toHaveBeenCalled();
    expect(existsSync(join(root, ".honcho"))).toBe(false);
    expect(readFileSync(join(root, ".agents", "oma-config.yaml"), "utf8")).toBe(
      before,
    );
  });
  it("writes embedding credentials privately in the server profile, preserving other settings", async () => {
    const profile = join(root, ".honcho", "profiles", "oma");
    mkdirSync(profile, { recursive: true });
    writeFileSync(
      join(profile, ".env"),
      "# preserve\nCUSTOM_SETTING=value\nLLM_OPENAI_API_KEY=old\nDREAM_ENABLED=true\n",
    );
    const result = await configureHonchoKey({
      kind: "embedding",
      homeDir: root,
      fromEnv: "INPUT_KEY",
      env,
    });
    const text = readFileSync(join(profile, ".env"), "utf8");
    expect(text).toContain("# preserve\nCUSTOM_SETTING=value");
    expect(text).not.toContain("=old");
    expect(text).toContain(`LLM_OPENAI_API_KEY='${secret}'`);
    expect(text).toContain(
      "EMBEDDING_MODEL_CONFIG__OVERRIDES__API_KEY_ENV='LLM_OPENAI_API_KEY'",
    );
    expect(text).toContain("DREAM_ENABLED='false'");
    expect(text).toContain("DERIVER_ENABLED='false'");
    expect(text).toContain("EMBED_MESSAGES='true'");
    // Windows does not store POSIX mode bits.
    if (process.platform !== "win32")
      expect(statSync(join(profile, ".env")).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(storeSecret).not.toHaveBeenCalled();
  });
  it.each(["../escape", ".", "a/b"])(
    "rejects unsafe profile %s before collecting a key",
    async (profile) => {
      await expect(
        configureHonchoKey({ kind: "embedding", homeDir: root, profile }),
      ).rejects.toThrow("Invalid Honcho profile");
      expect(existsSync(join(root, ".honcho"))).toBe(false);
    },
  );
  it("refuses credential writes through a symlinked profile", async () => {
    mkdirSync(join(root, ".honcho", "profiles"), { recursive: true });
    symlinkSync(root, join(root, ".honcho", "profiles", "oma"), "junction");
    await expect(
      configureHonchoKey({
        kind: "embedding",
        homeDir: root,
        fromEnv: "INPUT_KEY",
        env,
      }),
    ).rejects.toThrow("symlink");
    expect(existsSync(join(root, ".env"))).toBe(false);
  });
  it("requires explicit environment input for JSON mode and rejects multiline credentials", async () => {
    await expect(
      configureHonchoKey({ projectDir: root, json: true }),
    ).rejects.toThrow("--from-env");
    await expect(
      configureHonchoKey({ projectDir: root, fromEnv: "MISSING", env: {} }),
    ).rejects.toThrow("Set MISSING");
    await expect(
      configureHonchoKey({
        projectDir: root,
        fromEnv: "INPUT_KEY",
        env: { INPUT_KEY: "key\nINJECT=value" },
      }),
    ).rejects.toThrow("single line");
    expect(storeSecret).not.toHaveBeenCalled();
  });
});
