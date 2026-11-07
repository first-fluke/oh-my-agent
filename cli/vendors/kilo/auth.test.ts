import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { AUTH_CHECKERS, VENDORS } from "../index.js";
import { isKiloAuthenticated } from "./auth.js";

// `kilo auth list` reports ~/.local/share/kilo/auth.json (opencode's format).
const KILO_AUTH = join(
  "/home/testuser",
  ".local",
  "share",
  "kilo",
  "auth.json",
);
const OPENCODE_AUTH = join(
  "/home/testuser",
  ".local",
  "share",
  "opencode",
  "auth.json",
);

function authFiles(files: Record<string, unknown>): void {
  mockFsFunctions.existsSync.mockImplementation((p: string) => p in files);
  mockFsFunctions.readFileSync.mockImplementation((p: string) =>
    JSON.stringify(files[p]),
  );
}

describe("isKiloAuthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when any provider in kilo's auth.json has a credential", () => {
    authFiles({ [KILO_AUTH]: { kilo: { type: "oauth", access: "tok" } } });
    expect(isKiloAuthenticated()).toBe(true);
  });

  it("checks a specific provider when one is given", () => {
    authFiles({ [KILO_AUTH]: { openai: { type: "api", key: "sk-1" } } });
    expect(isKiloAuthenticated("openai")).toBe(true);
    expect(isKiloAuthenticated("anthropic")).toBe(false);
  });

  it("rejects entries without a usable credential", () => {
    authFiles({ [KILO_AUTH]: { kilo: { type: "api", key: "" } } });
    expect(isKiloAuthenticated()).toBe(false);
  });

  it("does not read opencode's credential store", () => {
    authFiles({ [OPENCODE_AUTH]: { "opencode-go": { type: "wellknown" } } });
    expect(isKiloAuthenticated()).toBe(false);
  });

  it("returns false when the file is missing or malformed", () => {
    authFiles({});
    expect(isKiloAuthenticated()).toBe(false);
    mockFsFunctions.existsSync.mockReturnValue(true);
    mockFsFunctions.readFileSync.mockReturnValue("{ not json");
    expect(isKiloAuthenticated()).toBe(false);
  });

  it("is registered as the kilo auth checker with its login hint", () => {
    expect(AUTH_CHECKERS.kilo).toBe(isKiloAuthenticated);
    expect(VENDORS.find((v) => v.id === "kilo")).toMatchObject({
      label: "Kilo Code CLI",
      authHint: "kilo auth login",
    });
  });
});
