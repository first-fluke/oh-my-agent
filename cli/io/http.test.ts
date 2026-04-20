import https from "node:https";
import { describe, expect, it } from "vitest";
import { http, isAxiosError } from "./http.js";

describe("http client", () => {
  it("uses an https.Agent with family 4 (IPv4-only)", () => {
    const agent = http.defaults.httpsAgent as https.Agent;
    expect(agent).toBeInstanceOf(https.Agent);
    expect((agent.options as Record<string, unknown>).family).toBe(4);
  });

  it("exports isAxiosError for error handling", () => {
    expect(typeof isAxiosError).toBe("function");
    expect(isAxiosError(new Error("not axios"))).toBe(false);
  });
});
