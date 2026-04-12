import * as child_process from "node:child_process";
import type * as http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  connect,
  fetchQuota,
  formatTimeUntilReset,
  getQuota,
  parseQuota,
  type RpcResponse,
} from "./antigravity-bridge.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

const mockHttps = vi.hoisted(() => ({
  request: vi.fn(),
}));

vi.mock("node:https", () => ({
  default: mockHttps,
  ...mockHttps,
}));

describe("antigravity-bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatTimeUntilReset", () => {
    it("should return 'Ready' for zero or negative ms", () => {
      expect(formatTimeUntilReset(0)).toBe("Ready");
      expect(formatTimeUntilReset(-1000)).toBe("Ready");
      expect(formatTimeUntilReset(-999999)).toBe("Ready");
    });

    it("should return minutes for less than 60 minutes", () => {
      expect(formatTimeUntilReset(60000)).toBe("1m");
      expect(formatTimeUntilReset(30000)).toBe("1m");
      expect(formatTimeUntilReset(300000)).toBe("5m");
      expect(formatTimeUntilReset(3540000)).toBe("59m");
    });

    it("should return hours and minutes for >= 60 minutes", () => {
      expect(formatTimeUntilReset(3600000)).toBe("1h 0m");
      expect(formatTimeUntilReset(5400000)).toBe("1h 30m");
      expect(formatTimeUntilReset(7200000)).toBe("2h 0m");
      expect(formatTimeUntilReset(9000000)).toBe("2h 30m");
    });

    it("should ceil partial minutes", () => {
      expect(formatTimeUntilReset(61000)).toBe("2m");
      expect(formatTimeUntilReset(1)).toBe("1m");
    });
  });

  describe("parseQuota", () => {
    it("should handle empty response", () => {
      const result = parseQuota({});
      expect(result.userName).toBe("Unknown");
      expect(result.email).toBe("");
      expect(result.planName).toBe("Free");
      expect(result.tierName).toBe("");
      expect(result.promptCredits).toBeUndefined();
      expect(result.flowCredits).toBeUndefined();
      expect(result.models).toEqual([]);
      expect(result.defaultModel).toBeNull();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should parse user info and tier", () => {
      const data: RpcResponse = {
        userStatus: {
          name: "TestUser",
          email: "test@example.com",
          planStatus: {
            planInfo: { planName: "Pro" },
          },
          userTier: { name: "Google AI Pro" },
        },
      };
      const result = parseQuota(data);
      expect(result.userName).toBe("TestUser");
      expect(result.email).toBe("test@example.com");
      expect(result.planName).toBe("Pro");
      expect(result.tierName).toBe("Google AI Pro");
    });

    it("should calculate prompt credits correctly", () => {
      const data: RpcResponse = {
        userStatus: {
          planStatus: {
            planInfo: { monthlyPromptCredits: 1000 },
            availablePromptCredits: 750,
          },
        },
      };
      const result = parseQuota(data);
      expect(result.promptCredits).toEqual({
        available: 750,
        monthly: 1000,
        usedPercent: 25,
        remainingPercent: 75,
      });
    });

    it("should handle zero available credits", () => {
      const data: RpcResponse = {
        userStatus: {
          planStatus: {
            planInfo: { monthlyPromptCredits: 500 },
            availablePromptCredits: 0,
          },
        },
      };
      const result = parseQuota(data);
      expect(result.promptCredits).toEqual({
        available: 0,
        monthly: 500,
        usedPercent: 100,
        remainingPercent: 0,
      });
    });

    it("should skip promptCredits when monthly is 0", () => {
      const data: RpcResponse = {
        userStatus: {
          planStatus: {
            planInfo: { monthlyPromptCredits: 0 },
            availablePromptCredits: 0,
          },
        },
      };
      const result = parseQuota(data);
      expect(result.promptCredits).toBeUndefined();
    });

    it("should skip promptCredits when availableCredits is undefined", () => {
      const data: RpcResponse = {
        userStatus: {
          planStatus: {
            planInfo: { monthlyPromptCredits: 1000 },
          },
        },
      };
      const result = parseQuota(data);
      expect(result.promptCredits).toBeUndefined();
    });

    it("should parse model quotas with remainingFraction", () => {
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "Gemini 2.5 Pro",
                modelOrAlias: { model: "gemini-2.5-pro" },
                quotaInfo: { remainingFraction: 0.72 },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models).toHaveLength(1);
      expect(result.models[0].label).toBe("Gemini 2.5 Pro");
      expect(result.models[0].modelId).toBe("gemini-2.5-pro");
      expect(result.models[0].remainingPercent).toBeCloseTo(72);
      expect(result.models[0].isExhausted).toBe(false);
    });

    it("should mark exhausted models", () => {
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "Claude Sonnet",
                quotaInfo: { remainingFraction: 0 },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models[0].isExhausted).toBe(true);
      expect(result.models[0].remainingPercent).toBe(0);
    });

    it("should default to 100% when allowed but no fraction", () => {
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "Unlimited Model",
                quotaInfo: { allowed: true },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models[0].remainingPercent).toBe(100);
      expect(result.models[0].isExhausted).toBe(false);
    });

    it("should default to 0% when no fraction and not allowed", () => {
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "Blocked Model",
                quotaInfo: { allowed: false },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models[0].remainingPercent).toBe(0);
    });

    it("should filter out models without quotaInfo", () => {
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [
              { label: "No Quota" },
              {
                label: "Has Quota",
                quotaInfo: { remainingFraction: 0.5 },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models).toHaveLength(1);
      expect(result.models[0].label).toBe("Has Quota");
    });

    it("should parse resetTime and compute timeUntilReset", () => {
      const future = new Date(Date.now() + 7200000).toISOString();
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "Model",
                quotaInfo: { remainingFraction: 0.1, resetTime: future },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models[0].resetTime).toBeInstanceOf(Date);
      expect(result.models[0].timeUntilReset).toMatch(/\dh \d+m/);
    });

    it("should handle null resetTime", () => {
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "Model",
                quotaInfo: { remainingFraction: 0.5 },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models[0].resetTime).toBeNull();
      expect(result.models[0].timeUntilReset).toBe("Ready");
    });

    it("should use defaults for missing label and model", () => {
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [{ quotaInfo: { remainingFraction: 0.5 } }],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models[0].label).toBe("Unknown");
      expect(result.models[0].modelId).toBe("unknown");
    });

    it("should handle multiple models mixed", () => {
      const data: RpcResponse = {
        userStatus: {
          name: "User",
          planStatus: {
            planInfo: { planName: "Team", monthlyPromptCredits: 2000 },
            availablePromptCredits: 1500,
          },
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "Pro",
                modelOrAlias: { model: "pro-model" },
                quotaInfo: { remainingFraction: 0.8 },
              },
              {
                label: "Flash",
                modelOrAlias: { model: "flash-model" },
                quotaInfo: { remainingFraction: 0 },
              },
              { label: "NoQuota" },
              {
                label: "Unlimited",
                quotaInfo: { allowed: true },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models).toHaveLength(3);
      expect(result.models[0].remainingPercent).toBeCloseTo(80);
      expect(result.models[1].isExhausted).toBe(true);
      expect(result.models[2].remainingPercent).toBe(100);
      expect(result.promptCredits?.remainingPercent).toBe(75);
    });

    it("should handle null remainingFraction with allowed true", () => {
      const data: RpcResponse = {
        userStatus: {
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "NullFraction",
                quotaInfo: { remainingFraction: null, allowed: true },
              },
            ],
          },
        },
      };
      const result = parseQuota(data);
      expect(result.models[0].remainingPercent).toBe(100);
    });
  });

  describe("connect", () => {
    it("should return null if no process found", async () => {
      vi.mocked(child_process.execSync).mockImplementation(() => {
        throw new Error("no process");
      });

      const result = await connect();
      expect(result).toBeNull();
    });

    it("should return null if csrf token not found", async () => {
      vi.mocked(child_process.execSync).mockImplementation(
        (cmd: string | URL) => {
          if (cmd.toString().includes("pgrep")) {
            return "12345 language_server --flag";
          }
          if (cmd.toString().includes("ps -p")) {
            return "ARGS\nlanguage_server --no-token-here";
          }
          return "";
        },
      );

      const result = await connect();
      expect(result).toBeNull();
    });

    it("should return null if no ports found", async () => {
      vi.mocked(child_process.execSync).mockImplementation(
        (cmd: string | URL) => {
          if (cmd.toString().includes("pgrep")) {
            return "12345 language_server --flag";
          }
          if (cmd.toString().includes("ps -p")) {
            return "ARGS\nlanguage_server --csrf_token abc-123";
          }
          if (cmd.toString().includes("lsof")) {
            throw new Error("no ports");
          }
          return "";
        },
      );

      const result = await connect();
      expect(result).toBeNull();
    });

    it("should return connection if probe succeeds", async () => {
      vi.mocked(child_process.execSync).mockImplementation(
        (cmd: string | URL) => {
          if (cmd.toString().includes("pgrep")) {
            return "12345 language_server --flag";
          }
          if (cmd.toString().includes("ps -p")) {
            return "ARGS\nlanguage_server --csrf_token my-token-123";
          }
          if (cmd.toString().includes("lsof")) {
            return "HEADER\nlanguage 12345 user 5u IPv4 TCP 127.0.0.1:9222 (LISTEN)";
          }
          return "";
        },
      );

      const mockRes = {
        statusCode: 200,
        on: vi.fn((event: string, cb: (data?: string) => void) => {
          if (event === "data") cb("{}");
          if (event === "end") cb();
        }),
      };
      const mockReq = {
        on: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
      };
      mockHttps.request.mockImplementation(
        (
          _opts: http.RequestOptions,
          cb?: (res: http.IncomingMessage) => void,
        ) => {
          if (cb) cb(mockRes as unknown as http.IncomingMessage);
          return mockReq;
        },
      );

      const result = await connect();
      expect(result).toEqual({
        pid: 12345,
        csrfToken: "my-token-123",
        port: 9222,
      });
    });

    it("should try next port if first probe fails", async () => {
      vi.mocked(child_process.execSync).mockImplementation(
        (cmd: string | URL) => {
          if (cmd.toString().includes("pgrep")) {
            return "12345 language_server --flag";
          }
          if (cmd.toString().includes("ps -p")) {
            return "ARGS\nlanguage_server --csrf_token tk-1";
          }
          if (cmd.toString().includes("lsof")) {
            return "HEADER\nls 12345 u 5u IPv4 TCP 127.0.0.1:9000 (LISTEN)\nls 12345 u 6u IPv4 TCP 127.0.0.1:9001 (LISTEN)";
          }
          return "";
        },
      );

      let callCount = 0;
      mockHttps.request.mockImplementation(
        (
          _opts: http.RequestOptions,
          cb?: (res: http.IncomingMessage) => void,
        ) => {
          callCount++;
          const mockReq = {
            on: vi.fn((event: string, handler: () => void) => {
              if (event === "error" && callCount === 1) handler();
            }),
            write: vi.fn(),
            end: vi.fn(),
            destroy: vi.fn(),
          };

          if (callCount > 1 && cb) {
            const mockRes = {
              statusCode: 200,
              on: vi.fn((event: string, handler: (data?: string) => void) => {
                if (event === "data") handler("{}");
                if (event === "end") handler();
              }),
            };
            cb(mockRes as unknown as http.IncomingMessage);
          }

          return mockReq;
        },
      );

      const result = await connect();
      expect(result).toEqual({
        pid: 12345,
        csrfToken: "tk-1",
        port: 9001,
      });
    });
  });

  describe("getQuota", () => {
    it("should return null on request failure", async () => {
      mockHttps.request.mockImplementation(() => {
        const mockReq = {
          on: vi.fn((event: string, handler: (err: Error) => void) => {
            if (event === "error") handler(new Error("fail"));
          }),
          write: vi.fn(),
          end: vi.fn(),
          destroy: vi.fn(),
        };
        return mockReq;
      });

      const result = await getQuota({ pid: 1, csrfToken: "t", port: 9000 });
      expect(result).toBeNull();
    });

    it("should return parsed quota on success", async () => {
      const rpcData: RpcResponse = {
        userStatus: {
          name: "Tester",
          email: "t@test.com",
          planStatus: {
            planInfo: { planName: "Pro", monthlyPromptCredits: 100 },
            availablePromptCredits: 60,
          },
          cascadeModelConfigData: {
            clientModelConfigs: [
              {
                label: "Model A",
                modelOrAlias: { model: "model-a" },
                quotaInfo: { remainingFraction: 0.9 },
              },
            ],
          },
        },
      };

      const mockRes = {
        statusCode: 200,
        on: vi.fn((event: string, cb: (data?: string) => void) => {
          if (event === "data") cb(JSON.stringify(rpcData));
          if (event === "end") cb();
        }),
      };
      mockHttps.request.mockImplementation(
        (
          _opts: http.RequestOptions,
          cb?: (res: http.IncomingMessage) => void,
        ) => {
          if (cb) cb(mockRes as unknown as http.IncomingMessage);
          return {
            on: vi.fn(),
            write: vi.fn(),
            end: vi.fn(),
            destroy: vi.fn(),
          };
        },
      );

      const result = await getQuota({ pid: 1, csrfToken: "t", port: 9000 });
      expect(result).not.toBeNull();
      expect(result?.userName).toBe("Tester");
      expect(result?.planName).toBe("Pro");
      expect(result?.models).toHaveLength(1);
      expect(result?.models[0].remainingPercent).toBeCloseTo(90);
      expect(result?.promptCredits?.remainingPercent).toBe(60);
    });
  });

  describe("fetchQuota", () => {
    it("should return null when connect fails", async () => {
      vi.mocked(child_process.execSync).mockImplementation(() => {
        throw new Error("no process");
      });

      const result = await fetchQuota();
      expect(result).toBeNull();
    });
  });
});
