import { describe, expect, it } from "vitest";
import type { VendorConfig } from "../../platform/agent-config.js";
import { planDispatch } from "../runtime-dispatch.js";
import { buildExternalInvocation } from "./invocations/external.js";
import {
  buildAntigravityNativeInvocation,
  buildClaudeNativeInvocation,
  buildCodexNativeInvocation,
  buildCursorAgentPrintInvocation,
  buildKiroNativeInvocation,
} from "./invocations/native.js";

const prompt = "Inspect the source without changing it.";
const readonlyOptions = { readOnly: true };

describe("required read-only dispatch", () => {
  it.each([
    "antigravity",
    "cursor",
    "kiro",
    "grok",
    "kimi",
    "opencode",
    "gemini",
    "qwen",
    "hermes",
    "custom-cli",
  ])("refuses unsupported external vendor %s", (vendor) => {
    expect(() =>
      buildExternalInvocation(
        vendor,
        {},
        null,
        prompt,
        undefined,
        readonlyOptions,
      ),
    ).toThrow(/read-only/i);
  });

  it.each([
    ["antigravity", buildAntigravityNativeInvocation],
    ["cursor", buildCursorAgentPrintInvocation],
    ["kiro", buildKiroNativeInvocation],
  ] as const)("refuses unsupported native vendor %s", (_vendor, build) => {
    expect(() => build("reviewer", prompt, {}, readonlyOptions)).toThrow(
      /read-only/i,
    );
  });

  it.each(["", "   ", "''", '""'])(
    "refuses an explicitly empty restriction instead of using a default: %j",
    (read_only_flag) => {
      const config = { read_only_flag };
      expect(() =>
        buildCodexNativeInvocation("reviewer", prompt, config, readonlyOptions),
      ).toThrow(/read-only/i);
      expect(() =>
        buildClaudeNativeInvocation(
          "reviewer",
          prompt,
          config,
          readonlyOptions,
        ),
      ).toThrow(/read-only/i);
      expect(() =>
        buildExternalInvocation(
          "codex",
          config,
          null,
          prompt,
          undefined,
          readonlyOptions,
        ),
      ).toThrow(/read-only/i);
    },
  );

  it.each([
    "--yolo",
    "--trust-all-tools",
    "--force",
    "--dangerously-skip-permissions",
    "--dangerously-bypass-approvals-and-sandbox",
    "--full-auto",
    "--sandbox workspace-write",
    "--sandbox=danger-full-access",
    "--permission-mode bypassPermissions",
    "--permission-mode=acceptEdits",
    "--approval-mode yolo",
    '-c sandbox_mode="danger-full-access"',
    '--config=sandbox_mode="danger-full-access"',
  ])("rejects a permissive read-only configuration: %s", (read_only_flag) => {
    expect(() =>
      buildExternalInvocation(
        "codex",
        { read_only_flag },
        null,
        prompt,
        undefined,
        readonlyOptions,
      ),
    ).toThrow(/read-only/i);
  });

  it.each([
    '--config sandbox_mode="danger-full-access"',
    "--config=sandbox_mode=danger-full-access",
    "-c=sandbox_mode=workspace-write",
    "-csandbox_mode=workspace-write",
  ])(
    "rejects isolation flags that disable a requested restriction: %s",
    (isolation_flags) => {
      expect(() =>
        buildExternalInvocation(
          "codex",
          { isolation_flags },
          null,
          prompt,
          undefined,
          readonlyOptions,
        ),
      ).toThrow(/read-only/i);
    },
  );

  it("does not fall back to permissive dispatch when a required restriction is missing", () => {
    expect(() =>
      planDispatch("reviewer", "gemini", {}, null, prompt, {}, readonlyOptions),
    ).toThrow(/read-only.*refusing to launch/i);
  });

  it("does not interpret the task prompt as execution flags", () => {
    const invocation = buildExternalInvocation(
      "codex",
      {},
      null,
      "Explain why --yolo and --sandbox workspace-write allow mutations.",
      undefined,
      readonlyOptions,
    );
    expect(invocation.args).toContain("read-only");
  });

  it("disables Pi shells as well as direct mutation tools", () => {
    const invocation = buildExternalInvocation(
      "pi",
      {},
      "-p",
      prompt,
      undefined,
      readonlyOptions,
    );
    const index = invocation.args.indexOf("--exclude-tools");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(new Set(invocation.args[index + 1]?.split(","))).toEqual(
      new Set(["edit", "write", "bash", "powershell"]),
    );
  });

  it.each([
    "--exclude-tools edit,write",
    "--exclude-tools edit,write,bash",
    "--exclude-tools edit,write,powershell",
    "-xt edit,write",
    "--exclude-tools=edit,write",
  ])(
    "rejects a Pi exclusion that leaves a shell enabled: %s",
    (read_only_flag) => {
      expect(() =>
        buildExternalInvocation(
          "pi",
          { read_only_flag },
          "-p",
          prompt,
          undefined,
          readonlyOptions,
        ),
      ).toThrow(/read-only/i);
    },
  );

  it.each(["codex", "claude"])(
    "retains the built-in restrictive mode for %s",
    (vendor) => {
      const invocation = buildExternalInvocation(
        vendor,
        { auto_approve_flag: "--yolo" },
        null,
        prompt,
        undefined,
        readonlyOptions,
      );
      expect(invocation.args).toContain(
        vendor === "codex" ? "read-only" : "plan",
      );
      expect(invocation.args).not.toContain("--yolo");
    },
  );

  it("retains explicit user-configured restrictive modes for custom CLIs", () => {
    const config: VendorConfig = {
      command: "custom-cli",
      read_only_flag: "--read-only",
      auto_approve_flag: "--yolo",
    };
    const invocation = buildExternalInvocation(
      "custom-cli",
      config,
      null,
      prompt,
      undefined,
      readonlyOptions,
    );
    expect(invocation.args).toEqual(["--read-only", prompt]);
  });

  it("does not restrict a normal mutable dispatch", () => {
    const invocation = buildKiroNativeInvocation("reviewer", prompt, {});
    expect(invocation.args).toContain("--trust-all-tools");
  });
});
