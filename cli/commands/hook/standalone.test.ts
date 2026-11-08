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

  it("answers commandcode (the emitted mod bridge) in its own Claude-shaped dialect", async () => {
    const deny = await runStandaloneHookScript({
      vendor: "commandcode",
      script: "scm-guard.ts",
      cwd: root,
      rawStdin: JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: { command: "git add .env" },
        cwd: root,
        sessionId: "s1",
      }),
    });
    expect(JSON.parse(deny.output)).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
      },
    });

    // The mod has a prompt hook (transformInput) the settings-file variant
    // lacks; UserPromptSubmit must route to the prompt handlers.
    const prompt = await runStandaloneHookScript({
      vendor: "commandcode",
      script: "keyword-detector.ts",
      cwd: root,
      rawStdin: JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        prompt: "orchestrate: say hi",
        cwd: root,
        sessionId: "s1",
      }),
    });
    expect(prompt.output).toContain("[OMA WORKFLOW: ORCHESTRATE]");
    expect(JSON.parse(prompt.output)).toMatchObject({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit" },
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
