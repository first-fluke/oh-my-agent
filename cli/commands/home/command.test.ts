import { Command } from "commander";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerHome } from "./command.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("home command", () => {
  it("reports one custom global root and the explicit profile exception", async () => {
    vi.stubEnv("OMA_HOME", "/custom/global");
    vi.stubEnv("OMA_STATE_HOME", "/custom/profiles");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = new Command();
    registerHome(program);
    await program.parseAsync(["home", "--json"], { from: "user" });
    const result = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(result.home).toBe("/custom/global");
    expect(result.schedule).toBe("/custom/global/schedule");
    expect(result.serena).toBe("/custom/global/state/serena");
    expect(result.profiles).toBe("/custom/profiles");
  });
});
