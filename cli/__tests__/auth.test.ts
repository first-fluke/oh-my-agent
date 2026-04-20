import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

const execSyncMock = vi.fn();
vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => execSyncMock(...args),
}));

const isGhAuthenticatedMock = vi.fn();
vi.mock("../io/github.js", () => ({
  isGhAuthenticated: () => isGhAuthenticatedMock(),
}));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
}));

import { checkAuthStatus } from "../commands/auth-status/auth-status.js";

describe("auth:status command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("all authenticated", () => {
    it("should report all as authenticated in JSON mode", async () => {
      isGhAuthenticatedMock.mockReturnValue(true);
      execSyncMock.mockReturnValue(JSON.stringify({ loggedIn: true }));
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockImplementation((path: string) => {
        if (path.includes(".gemini")) {
          return JSON.stringify({
            access_token: "ya29.xxx",
            refresh_token: "1//xxx",
          });
        }
        if (path.includes(".codex")) {
          return JSON.stringify({
            tokens: { access_token: "tok_xxx" },
          });
        }
        if (path.includes(".qwen")) {
          return JSON.stringify({
            security: { auth: { selectedType: "openai" } },
          });
        }
        return "{}";
      });

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result).toEqual({
        github: true,
        gemini: true,
        claude: true,
        codex: true,
        qwen: true,
      });
    });
  });

  describe("none authenticated", () => {
    it("should report all as not authenticated in JSON mode", async () => {
      isGhAuthenticatedMock.mockReturnValue(false);
      execSyncMock.mockImplementation(() => {
        throw new Error("not authenticated");
      });
      mockFsFunctions.existsSync.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result).toEqual({
        github: false,
        gemini: false,
        claude: false,
        codex: false,
        qwen: false,
      });
    });
  });

  describe("claude auth", () => {
    beforeEach(() => {
      isGhAuthenticatedMock.mockReturnValue(false);
      mockFsFunctions.existsSync.mockReturnValue(false);
    });

    it("should detect claude loggedIn: true", async () => {
      execSyncMock.mockReturnValue(JSON.stringify({ loggedIn: true }));

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.claude).toBe(true);
    });

    it("should detect claude loggedIn: false", async () => {
      execSyncMock.mockReturnValue(JSON.stringify({ loggedIn: false }));

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.claude).toBe(false);
    });

    it("should handle invalid JSON from claude", async () => {
      execSyncMock.mockReturnValue("not json");

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.claude).toBe(false);
    });
  });

  describe("gemini auth", () => {
    beforeEach(() => {
      isGhAuthenticatedMock.mockReturnValue(false);
      execSyncMock.mockImplementation(() => {
        throw new Error("fail");
      });
    });

    it("should detect valid oauth creds", async () => {
      mockFsFunctions.existsSync.mockImplementation((p: string) =>
        p.includes(".gemini"),
      );
      mockFsFunctions.readFileSync.mockReturnValue(
        JSON.stringify({
          access_token: "ya29.xxx",
          refresh_token: "1//xxx",
        }),
      );

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.gemini).toBe(true);
    });

    it("should return false when creds file missing", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.gemini).toBe(false);
    });

    it("should return false when creds have no tokens", async () => {
      mockFsFunctions.existsSync.mockImplementation((p: string) =>
        p.includes(".gemini"),
      );
      mockFsFunctions.readFileSync.mockReturnValue(JSON.stringify({}));

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.gemini).toBe(false);
    });
  });

  describe("codex auth", () => {
    beforeEach(() => {
      isGhAuthenticatedMock.mockReturnValue(false);
      execSyncMock.mockImplementation(() => {
        throw new Error("fail");
      });
    });

    it("should detect valid auth.json with tokens", async () => {
      mockFsFunctions.existsSync.mockImplementation((p: string) =>
        p.includes(".codex"),
      );
      mockFsFunctions.readFileSync.mockReturnValue(
        JSON.stringify({ tokens: { access_token: "tok_xxx" } }),
      );

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.codex).toBe(true);
    });

    it("should return false when tokens missing", async () => {
      mockFsFunctions.existsSync.mockImplementation((p: string) =>
        p.includes(".codex"),
      );
      mockFsFunctions.readFileSync.mockReturnValue(JSON.stringify({}));

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.codex).toBe(false);
    });
  });

  describe("qwen auth", () => {
    beforeEach(() => {
      isGhAuthenticatedMock.mockReturnValue(false);
      execSyncMock.mockImplementation(() => {
        throw new Error("fail");
      });
    });

    it("should detect valid settings with selectedType", async () => {
      mockFsFunctions.existsSync.mockImplementation((p: string) =>
        p.includes(".qwen"),
      );
      mockFsFunctions.readFileSync.mockReturnValue(
        JSON.stringify({
          security: { auth: { selectedType: "qwen-oauth" } },
        }),
      );

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.qwen).toBe(true);
    });

    it("should return false when settings file missing", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.qwen).toBe(false);
    });

    it("should return false when selectedType is missing", async () => {
      mockFsFunctions.existsSync.mockImplementation((p: string) =>
        p.includes(".qwen"),
      );
      mockFsFunctions.readFileSync.mockReturnValue(
        JSON.stringify({ security: {} }),
      );

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.qwen).toBe(false);
    });
  });

  describe("interactive mode", () => {
    it("should render table via p.note when not in JSON mode", async () => {
      isGhAuthenticatedMock.mockReturnValue(true);
      execSyncMock.mockReturnValue(JSON.stringify({ loggedIn: true }));
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockImplementation((path: string) => {
        if (path.includes(".gemini")) {
          return JSON.stringify({
            access_token: "ya29.xxx",
            refresh_token: "1//xxx",
          });
        }
        if (path.includes(".codex")) {
          return JSON.stringify({
            tokens: { access_token: "tok_xxx" },
          });
        }
        if (path.includes(".qwen")) {
          return JSON.stringify({
            security: { auth: { selectedType: "openai" } },
          });
        }
        return "{}";
      });

      const prompts = await import("@clack/prompts");
      await checkAuthStatus(false);

      expect(prompts.intro).toHaveBeenCalled();
      expect(prompts.note).toHaveBeenCalledWith(
        expect.stringContaining("GitHub"),
        "Authentication Status",
      );
      expect(prompts.outro).toHaveBeenCalled();
    });
  });

  describe("corrupted files", () => {
    beforeEach(() => {
      isGhAuthenticatedMock.mockReturnValue(false);
      execSyncMock.mockImplementation(() => {
        throw new Error("fail");
      });
    });

    it("should handle corrupted JSON files gracefully", async () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockReturnValue("{invalid json");

      const consoleSpy = vi.spyOn(console, "log");
      await checkAuthStatus(true);

      const result = JSON.parse(consoleSpy.mock.calls[0][0]);
      expect(result.gemini).toBe(false);
      expect(result.codex).toBe(false);
      expect(result.qwen).toBe(false);
    });
  });
});
