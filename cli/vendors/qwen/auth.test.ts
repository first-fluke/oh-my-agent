import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectDeprecatedOAuthSession, printMigrationGuide } from "./auth.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A legacy OAuth credential object (mtime before 2026-04-15). */
const LEGACY_OAUTH_CONTENT = JSON.stringify({
  refresh_token: "rt_abc123",
  token_type: "Bearer",
  expires_in: 3600,
});

/** A modern API-key-style credential object. */
const MODERN_API_KEY_CONTENT = JSON.stringify({
  api_key: "sk-abc123",
  region: "cn-hangzhou",
});

/** A legacy-dated file that contains only API-key fields (should NOT trigger). */
const OLD_API_KEY_CONTENT = JSON.stringify({
  api_key: "sk-legacy",
});

/** mtime before the deprecation date (2026-01-01). */
const BEFORE_DEPRECATION = new Date("2026-01-01T00:00:00Z");
/** mtime after the deprecation date (2026-05-01). */
const AFTER_DEPRECATION = new Date("2026-05-01T00:00:00Z");

// ---------------------------------------------------------------------------
// Mocks — node:fs and node:os are mocked per test using vi.mock + vi.mocked
// ---------------------------------------------------------------------------

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

// Import mocked modules AFTER vi.mock declarations.
import * as fs from "node:fs";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("detectDeprecatedOAuthSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns hasLegacySession=false when no candidate files exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(false);
    expect(result.migrationNeeded).toBe(false);
    expect(result.tokenPath).toBeUndefined();
  });

  it("detects a legacy OAuth session when file is old and has OAuth fields", () => {
    // Only the first candidate path triggers existsSync = true.
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("oauth.json"),
    );
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: BEFORE_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(LEGACY_OAUTH_CONTENT);

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(true);
    expect(result.migrationNeeded).toBe(true);
    expect(result.tokenPath).toMatch(/oauth\.json$/);
  });

  it("returns hasLegacySession=false when file is new (post-deprecation mtime) even if it has OAuth fields", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("oauth.json"),
    );
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: AFTER_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(LEGACY_OAUTH_CONTENT);

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(false);
    expect(result.migrationNeeded).toBe(false);
  });

  it("returns hasLegacySession=false when old file contains only modern API-key fields", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("oauth.json"),
    );
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: BEFORE_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(OLD_API_KEY_CONTENT);

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(false);
    expect(result.migrationNeeded).toBe(false);
  });

  it("returns hasLegacySession=false for a modern credentials.json with API-key fields", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("credentials.json"),
    );
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: AFTER_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(MODERN_API_KEY_CONTENT);

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(false);
  });

  it("skips unreadable / malformed JSON files gracefully", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: BEFORE_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue("NOT_VALID_JSON{{{");

    // Should not throw, should return no legacy session.
    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(false);
    expect(result.migrationNeeded).toBe(false);
  });

  it("falls through to the second candidate path when the first is absent", () => {
    let callCount = 0;
    vi.mocked(fs.existsSync).mockImplementation(() => {
      callCount += 1;
      // First call returns false, second returns true.
      return callCount >= 2;
    });
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: BEFORE_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(LEGACY_OAUTH_CONTENT);

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(true);
    expect(result.tokenPath).toMatch(/credentials\.json$/);
  });

  it("handles statSync throwing an error gracefully", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockImplementation(() => {
      throw new Error("EPERM: operation not permitted");
    });

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // L-1: prefix-matched OAuth field detection
  // ---------------------------------------------------------------------------

  it("detects legacy session when file has oauth_token (oauth_ prefix)", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("oauth.json"),
    );
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: BEFORE_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ oauth_token: "tok_abc", token_type: "Bearer" }),
    );

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(true);
    expect(result.migrationNeeded).toBe(true);
  });

  it("detects legacy session when file has oidc_access_token (oidc_ prefix)", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("oauth.json"),
    );
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: BEFORE_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ oidc_access_token: "oidc_xyz", expires_in: 3600 }),
    );

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(true);
    expect(result.migrationNeeded).toBe(true);
  });

  it("detects legacy session when file has oauth2_refresh (oauth_ prefix)", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("oauth.json"),
    );
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: BEFORE_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ oauth2_refresh: "ref_token_abc" }),
    );

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(true);
    expect(result.migrationNeeded).toBe(true);
  });

  it("returns hasLegacySession=false when prefix-matched OAuth field co-exists with api_key (hybrid guard)", () => {
    vi.mocked(fs.existsSync).mockImplementation((p) =>
      String(p).endsWith("oauth.json"),
    );
    vi.mocked(fs.statSync).mockReturnValue({
      mtime: BEFORE_DEPRECATION,
    } as ReturnType<typeof fs.statSync>);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ oauth_token: "tok_abc", api_key: "sk-modern" }),
    );

    const result = detectDeprecatedOAuthSession();

    expect(result.hasLegacySession).toBe(false);
    expect(result.migrationNeeded).toBe(false);
  });
});

describe("printMigrationGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes a deprecation warning to stderr when migration is needed", () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    printMigrationGuide({
      hasLegacySession: true,
      tokenPath: "/home/testuser/.qwen/oauth.json",
      migrationNeeded: true,
    });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("2026-04-15");
    expect(output).toContain("/home/testuser/.qwen/oauth.json");
    expect(output).toContain("qwen /auth");
  });

  it("does nothing when hasLegacySession is false", () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    printMigrationGuide({ hasLegacySession: false, migrationNeeded: false });

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("does nothing when migrationNeeded is false even if hasLegacySession is true", () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    printMigrationGuide({
      hasLegacySession: true,
      tokenPath: "/home/testuser/.qwen/oauth.json",
      migrationNeeded: false,
    });

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("uses (unknown path) when tokenPath is not provided", () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    printMigrationGuide({
      hasLegacySession: true,
      migrationNeeded: true,
    });

    const output = stderrSpy.mock.calls[0]?.[0] as string;
    expect(output).toContain("(unknown path)");
  });
});
