/**
 * Unit tests: vault.ts
 *
 * Covers the pure validation + index helpers. Native keyring round-trip
 * is exercised by the end-to-end CLI invocation, not here, because
 * @napi-rs/keyring touches the host OS credential store and must not
 * leave artifacts in CI runs.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireOwnedDirectoryLock } from "../utils/owned-directory-lock.js";

const renameFailure = vi.hoisted(() => ({ fail: false }));
const secrets = vi.hoisted(() => new Map<string, string>());
vi.mock("node:fs", async (original) => {
  const actual = await original<typeof import("node:fs")>();
  return {
    ...actual,
    renameSync: (...args: Parameters<typeof actual.renameSync>) => {
      if (renameFailure.fail) throw new Error("rename interrupted");
      return actual.renameSync(...args);
    },
  };
});
vi.mock("@napi-rs/keyring", () => ({
  Entry: class {
    constructor(
      _service: string,
      private name: string,
    ) {}
    getPassword() {
      return secrets.get(this.name) ?? null;
    }
    setPassword(value: string) {
      secrets.set(this.name, value);
    }
    deletePassword() {
      return secrets.delete(this.name);
    }
  },
}));

// Force HOME to an isolated temp dir so vault-index.json writes there.
let tmpHome: string;

beforeEach(() => {
  tmpHome = mkdtempSync(path.join(tmpdir(), "oma-vault-test-"));
  vi.stubEnv("HOME", tmpHome);
  vi.stubEnv("OMA_HOME", path.join(tmpHome, "custom-oma"));
  renameFailure.fail = false;
  secrets.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpHome, { recursive: true, force: true });
});

describe("isValidKeyName", () => {
  it("accepts plausible API key names", async () => {
    const { isValidKeyName } = await import("./vault.js");
    for (const name of [
      "anthropic",
      "openai-prod",
      "github_pat",
      "sentry.dsn",
      "a",
      "A1.B2-C3_D4",
    ]) {
      expect(isValidKeyName(name)).toBe(true);
    }
  });

  it("rejects unsafe / oversized names", async () => {
    const { isValidKeyName } = await import("./vault.js");
    for (const bad of [
      "",
      "has space",
      "has/slash",
      "has;semi",
      "../escape",
      "x".repeat(65),
    ]) {
      expect(isValidKeyName(bad)).toBe(false);
    }
  });
});

describe("vault index roundtrip (without keyring backend)", () => {
  it("listSecrets returns [] when no index exists", async () => {
    const { listSecrets } = await import("./vault.js");
    expect(listSecrets()).toEqual([]);
  });

  it("stores and removes key names under OMA_HOME while values stay in the credential adapter", async () => {
    const { storeSecret, removeSecret, listSecrets } = await import(
      "./vault.js"
    );
    await storeSecret("openai", "sensitive-value");
    const file = path.join(tmpHome, "custom-oma/state/vault-index.json");
    expect(readFileSync(file, "utf8")).not.toContain("sensitive-value");
    expect(listSecrets().map((entry) => entry.name)).toEqual(["openai"]);
    expect(existsSync(path.join(tmpHome, ".config/oma/vault-index.json"))).toBe(
      false,
    );
    if (process.platform !== "win32")
      expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(await removeSecret("openai")).toBe(true);
    expect(listSecrets()).toEqual([]);
  });

  it("refuses a concurrent writer before changing the secret or index", async () => {
    const { storeSecret, removeSecret } = await import("./vault.js");
    const file = path.join(tmpHome, "custom-oma/state/vault-index.json");
    mkdirSync(path.dirname(file), { recursive: true });
    const lock = acquireOwnedDirectoryLock(`${file}.lock`);
    expect(lock.ok).toBe(true);
    if (!lock.ok) return;
    try {
      await expect(storeSecret("openai", "value")).rejects.toThrow(
        "being updated",
      );
      await expect(removeSecret("openai")).rejects.toThrow("being updated");
      expect(secrets.size).toBe(0);
      expect(existsSync(file)).toBe(false);
    } finally {
      lock.release();
    }
  });

  it("preserves the complete old index when atomic replacement fails", async () => {
    const { writeVaultIndex } = await import("./vault.js");
    const file = path.join(tmpHome, "index.json");
    const previous = '{"version":1,"entries":[]}';
    writeFileSync(file, previous);
    renameFailure.fail = true;
    expect(() =>
      writeVaultIndex(file, {
        version: 1,
        entries: [{ name: "new", createdAt: "now" }],
      }),
    ).toThrow("rename interrupted");
    expect(readFileSync(file, "utf8")).toBe(previous);
    expect(readdirSync(tmpHome)).toEqual(["index.json"]);
  });
});
