import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { isKimiAuthenticated, kimiHome } from "./auth.js";

const DEFAULT_HOME = join("/home/testuser", ".kimi-code");

describe("kimiHome", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to ~/.kimi-code", () => {
    vi.stubEnv("KIMI_CODE_HOME", "");
    expect(kimiHome()).toBe(DEFAULT_HOME);
  });

  it("honours KIMI_CODE_HOME override", () => {
    vi.stubEnv("KIMI_CODE_HOME", "/custom/kimi");
    expect(kimiHome()).toBe("/custom/kimi");
  });
});

describe("isKimiAuthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("KIMI_CODE_HOME", "");
    vi.stubEnv("KIMI_API_KEY", "");
    vi.stubEnv("MOONSHOT_API_KEY", "");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("is true when KIMI_API_KEY is set (no credential file needed)", () => {
    vi.stubEnv("KIMI_API_KEY", "sk-kimi-xxx");
    mockFsFunctions.existsSync.mockReturnValue(false);
    expect(isKimiAuthenticated()).toBe(true);
  });

  it("is true when MOONSHOT_API_KEY is set", () => {
    vi.stubEnv("MOONSHOT_API_KEY", "sk-moonshot-xxx");
    mockFsFunctions.existsSync.mockReturnValue(false);
    expect(isKimiAuthenticated()).toBe(true);
  });

  it("is true when an OAuth credential file carries an access_token", () => {
    mockFsFunctions.existsSync.mockImplementation((p: string) =>
      p.endsWith("auth.json"),
    );
    mockFsFunctions.readFileSync.mockImplementation((p: string) => {
      if (p.endsWith("auth.json")) {
        return JSON.stringify({ access_token: "kimi-tok-xxx" });
      }
      throw new Error("ENOENT");
    });
    expect(isKimiAuthenticated()).toBe(true);
  });

  it("is false when no credential file and no env key", () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    expect(isKimiAuthenticated()).toBe(false);
  });

  it("is false when a credential file exists but carries no token", () => {
    mockFsFunctions.existsSync.mockReturnValue(true);
    mockFsFunctions.readFileSync.mockReturnValue("{}");
    expect(isKimiAuthenticated()).toBe(false);
  });
});
