import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { profileDir } from "../../.agents/hooks/core/session-storage.js";
import { stateHome } from "../state/profiles.js";
import { omaHome, omaPaths, profileStateHome } from "./oma-home.js";

afterEach(() => vi.unstubAllEnvs());

describe("OMA global home", () => {
  it("groups all OMA-owned global data under the default home", () => {
    // resolve() keeps POSIX expectations literal and adds the drive on Windows.
    const home = resolve("/users/example/.oma");
    expect(omaPaths({}, "/users/example")).toEqual({
      home,
      definitions: join(home, ".agents"),
      state: join(home, "state"),
      serena: join(home, "state", "serena"),
      schedule: join(home, "schedule"),
      backup: join(home, "backup"),
    });
  });
  it("applies a custom root without requiring it to exist", () => {
    expect(
      omaPaths({ OMA_HOME: "/custom/not-created/../data" }, "/users/example")
        .schedule,
    ).toBe(resolve("/custom/data/schedule"));
  });
  it("keeps an explicit profile-only override separate", () => {
    const env = { OMA_HOME: "/global", OMA_STATE_HOME: "/profiles" };
    expect(profileStateHome(env)).toBe(resolve("/profiles"));
    expect(omaHome(env)).toBe(resolve("/global"));
  });
  it("uses the same root in standalone hooks and CLI profile APIs", () => {
    vi.stubEnv("OMA_HOME", "/custom/oma");
    vi.stubEnv("OMA_STATE_HOME", undefined);
    vi.stubEnv("OMA_PROFILE", "4");
    expect(stateHome()).toBe(resolve("/custom/oma"));
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
