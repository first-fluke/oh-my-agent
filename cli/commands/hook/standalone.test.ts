import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STANDALONE_HOOK_VENDORS } from "../../constants/standalone-hooks.js";
import { runStandaloneHookScript } from "./standalone.js";

describe("runStandaloneHookScript — opencode-family identities", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-standalone-"));
    mkdirSync(join(root, ".agents"), { recursive: true });
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const stageSecret = (vendor: "opencode" | "kilo") =>
    runStandaloneHookScript({
      vendor,
      script: "scm-guard.ts",
      cwd: root,
      rawStdin: JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: { command: "git add .env" },
        cwd: root,
        session_id: "s1",
      }),
    });

  it("accepts kilo as a standalone hook vendor", () => {
    expect(STANDALONE_HOOK_VENDORS).toContain("kilo");
  });

  it("answers kilo in the same claude dialect the shared bridge reads for opencode", async () => {
    const opencode = await stageSecret("opencode");
    const kilo = await stageSecret("kilo");

    expect(opencode.output).not.toBe("");
    expect(kilo.output).toBe(opencode.output);
    expect(JSON.parse(kilo.output)).toMatchObject({
      hookSpecificOutput: { permissionDecision: "deny" },
    });
  });

  it("ignores vendors outside the standalone allowlist", async () => {
    const result = await runStandaloneHookScript({
      vendor: "kilocode" as "kilo",
      script: "scm-guard.ts",
      cwd: root,
      rawStdin: "{}",
    });
    expect(result.output).toBe("");
  });
});
