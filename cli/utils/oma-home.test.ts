import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { profileDir } from "../../.agents/hooks/core/session-storage.js";
import { stateHome } from "../state/profiles.js";
import { omaHome, omaPaths, profileStateHome } from "./oma-home.js";

afterEach(() => vi.unstubAllEnvs());

describe("OMA global home", () => {
  it("groups all OMA-owned global data under the default home", () => {
    expect(omaPaths({}, "/users/example")).toEqual({
      home: "/users/example/.oma",
      definitions: "/users/example/.oma/.agents",
      state: "/users/example/.oma/state",
      serena: "/users/example/.oma/state/serena",
      schedule: "/users/example/.oma/schedule",
      backup: "/users/example/.oma/backup",
    });
  });
  it("applies a custom root without requiring it to exist", () => {
    expect(
      omaPaths({ OMA_HOME: "/custom/not-created/../data" }, "/users/example")
        .schedule,
    ).toBe("/custom/data/schedule");
  });
  it("keeps an explicit profile-only override separate", () => {
    const env = { OMA_HOME: "/global", OMA_STATE_HOME: "/profiles" };
    expect(profileStateHome(env)).toBe("/profiles");
    expect(omaHome(env)).toBe("/global");
  });
  it("uses the same root in standalone hooks and CLI profile APIs", () => {
    vi.stubEnv("OMA_HOME", "/custom/oma");
    vi.stubEnv("OMA_STATE_HOME", undefined);
    vi.stubEnv("OMA_PROFILE", "4");
    expect(stateHome()).toBe("/custom/oma");
    expect(profileDir()).toBe(join(stateHome(), "u", "4"));
  });
  it.each(["relative", "/valid\ninvalid", "/valid\0invalid"])(
    "rejects invalid global root %j",
    (value) => {
      expect(() => omaHome({ OMA_HOME: value })).toThrow(
        "OMA_HOME must be an absolute path",
      );
    },
  );
  it("rejects an explicitly empty profile override", () => {
    expect(() => profileStateHome({ OMA_STATE_HOME: "" })).toThrow(
      "OMA_STATE_HOME",
    );
  });
});
