import { describe, expect, it } from "vitest";
import { isLifecycleHookEvent, withLifecycleHookEvents } from "./lifecycle.js";
import type { HookVariant } from "./variant-types.js";

describe("native subagent lifecycle registration", () => {
  it.each(["claude", "codex", "copilot"])(
    "registers %s observation without parent completion handlers",
    (vendor) => {
      const original: HookVariant = {
        vendor,
        hookDir: ".test/hooks",
        settingsFile: ".test/settings.json",
        projectDirEnv: null,
        runtime: "bun",
        events: { Stop: [{ hook: "persistent-mode.ts", timeout: 30 }] },
      };
      const result = withLifecycleHookEvents(original);
      const start = vendor === "copilot" ? "subagentStart" : "SubagentStart";
      const stop = vendor === "copilot" ? "subagentStop" : "SubagentStop";
      expect(result.events[start]).toEqual([
        { hook: "lifecycle.ts", timeout: 3 },
      ]);
      expect(result.events[stop]).toEqual([
        { hook: "lifecycle.ts", timeout: 3 },
      ]);
      expect(result.events.Stop).toEqual(original.events.Stop);
      expect(original.events[start]).toBeUndefined();
      expect(withLifecycleHookEvents(result)).toEqual(result);
      expect(isLifecycleHookEvent(vendor, start)).toBe(true);
      expect(isLifecycleHookEvent(vendor, "Stop")).toBe(false);
    },
  );
});
