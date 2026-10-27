import { describe, expect, it } from "vitest";
import { PRESETS } from "../../constants/index.js";
import { resolvePresetSkills } from "./skill-selection.js";

describe("resolvePresetSkills", () => {
  it("leaves the existing project prompt and defaults in charge without a flag", () => {
    expect(resolvePresetSkills()).toBeUndefined();
  });

  it("selects the eight frontend skills instead of all thirty-three", () => {
    const selected = resolvePresetSkills("frontend");
    expect(selected).toHaveLength(8);
    expect(selected).toContain("oma-frontend");
    expect(selected).not.toContain("oma-backend");
    expect(resolvePresetSkills("all")).toHaveLength(33);
  });

  it.each(["unknown-preset", "custom", "", "__proto__", "toString"])(
    "rejects unregistered preset %j",
    (preset) => {
      expect(() => resolvePresetSkills(preset)).toThrow("Unknown skill preset");
    },
  );

  it("returns an independent selection so callers cannot change the registry", () => {
    const selected = resolvePresetSkills("frontend");
    selected?.pop();
    expect(PRESETS.frontend).toHaveLength(8);
    expect(resolvePresetSkills("frontend")).toHaveLength(8);
  });
});
