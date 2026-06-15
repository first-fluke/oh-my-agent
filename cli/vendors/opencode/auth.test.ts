import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mock functions so vi.mock factories can capture them.
// ---------------------------------------------------------------------------

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

// Import the module under test AFTER vi.mock declarations.
import { isOpencodeAuthenticated } from "./auth.js";

// ---------------------------------------------------------------------------
// Expected auth.json path: /home/testuser/.local/share/opencode/auth.json
// ---------------------------------------------------------------------------

const AUTH_JSON_PATH = "/home/testuser/.local/share/opencode/auth.json";

describe("isOpencodeAuthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // True cases
  // -------------------------------------------------------------------------

  it("returns true for a provider entry with type='api' and a key", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(
      JSON.stringify({
        "opencode-go": { type: "api", key: "sk-abc123" },
      }),
    );

    expect(isOpencodeAuthenticated()).toBe(true);
  });

  it("returns true for a provider entry with type='oauth' and an access token", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(
      JSON.stringify({
        "opencode-go": { type: "oauth", access: "tok_xyz", refresh: "ref_abc" },
      }),
    );

    expect(isOpencodeAuthenticated()).toBe(true);
  });

  it("returns true for a provider entry with type='wellknown'", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(
      JSON.stringify({
        "opencode-go": { type: "wellknown" },
      }),
    );

    expect(isOpencodeAuthenticated()).toBe(true);
  });

  it("returns true for a custom provider passed as argument", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(
      JSON.stringify({
        "custom-provider": { type: "api", key: "sk-custom" },
      }),
    );

    expect(isOpencodeAuthenticated("custom-provider")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // False cases
  // -------------------------------------------------------------------------

  it("returns false when the auth.json file is absent", () => {
    mockFsFunctions.existsSync.mockReturnValue(false);

    expect(isOpencodeAuthenticated()).toBe(false);
  });

  it("returns false when auth.json contains malformed JSON", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue("{invalid json{{");

    expect(isOpencodeAuthenticated()).toBe(false);
  });

  it("returns false when the provider key is missing from auth.json", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(
      JSON.stringify({
        "other-provider": { type: "api", key: "sk-other" },
      }),
    );

    expect(isOpencodeAuthenticated()).toBe(false);
  });

  it("returns false for type='api' when key is absent", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(
      JSON.stringify({
        "opencode-go": { type: "api" },
      }),
    );

    expect(isOpencodeAuthenticated()).toBe(false);
  });

  it("returns false for type='oauth' when access is absent", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(
      JSON.stringify({
        "opencode-go": { type: "oauth" },
      }),
    );

    expect(isOpencodeAuthenticated()).toBe(false);
  });

  it("returns false for an unrecognised type", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(
      JSON.stringify({
        "opencode-go": { type: "unknown-type", data: "something" },
      }),
    );

    expect(isOpencodeAuthenticated()).toBe(false);
  });

  it("returns false when auth.json root value is not an object (e.g. array)", () => {
    mockFsFunctions.existsSync.mockImplementation(
      (p: string) => p === AUTH_JSON_PATH,
    );
    mockFsFunctions.readFileSync.mockReturnValue(JSON.stringify([]));

    expect(isOpencodeAuthenticated()).toBe(false);
  });
});
