import { describe, expect, it } from "vitest";
import { PRESETS } from "../../constants/index.js";
import { resolvePresetSkills } from "./skill-selection.js";

describe("resolvePresetSkills", () => {
  it("leaves the existing project prompt and defaults in charge without a flag", () => {
    expect(resolvePresetSkills()).toBeUndefined();
  });

  it("selects the frontend preset's skills instead of the full registry", () => {
    const selected = resolvePresetSkills("frontend");
    expect(selected).toEqual(PRESETS.frontend);
    expect(selected).toContain("oma-frontend");
    expect(selected).not.toContain("oma-backend");
    const all = resolvePresetSkills("all");
    expect(all).toEqual(PRESETS.all);
    expect(selected?.length).toBeLessThan(all?.length ?? 0);
  });

  it.each(["unknown-preset", "custom", "", "__proto__", "toString"])(
    "rejects unregistered preset %j",
    (preset) => {
      expect(() => resolvePresetSkills(preset)).toThrow("Unknown skill preset");
    },
  );

  it("returns an independent selection so callers cannot change the registry", () => {
    const registered = [...(PRESETS.frontend ?? [])];
    const selected = resolvePresetSkills("frontend");
    selected?.pop();
    expect(PRESETS.frontend).toEqual(registered);
    expect(resolvePresetSkills("frontend")).toEqual(registered);
  });
});
