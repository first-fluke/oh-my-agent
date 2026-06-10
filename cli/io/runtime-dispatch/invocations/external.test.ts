/**
 * Regression tests for buildExternalInvocation — cursor read-only bypass fix.
 *
 * Coverage:
 * (a) cursor + readOnly:true → NO --yolo / auto_approve_flag in args
 * (b) cursor + readOnly:true + read_only_flag defined → appends it
 * (c) cursor + readOnly:true + NO read_only_flag → warns, no --yolo
 * (d) cursor + readOnly:false (default) → --yolo present (back-compat)
 * (e) cursor + readOnly:false + custom auto_approve_flag → custom flag present
 * (f) table-driven: kiro/grok/codex/claude/gemini external with readOnly:true each suppress auto-approve
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VendorConfig } from "../../../platform/agent-config.js";
import {
  buildExternalInvocation,
  type ExternalInvocationOptions,
  isSafeIsolationEnvKey,
} from "./external.js";

// Base cursor vendorConfig used across tests
const cursorConfig = (): VendorConfig => ({
  command: "cursor",
  auto_approve_flag: undefined,
  read_only_flag: undefined,
  model_flag: "--model",
  default_model: "gpt-4o",
  output_format_flag: undefined,
  output_format: undefined,
  subcommand: undefined,
  isolation_flags: undefined,
  isolation_env: undefined,
  prompt_flag: undefined,
});

describe("buildExternalInvocation — cursor read-only bypass regression", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // (a) cursor + readOnly:true → NO --yolo and NO auto_approve_flag
  // -------------------------------------------------------------------------
  it("cursor readOnly:true: suppresses --yolo when no auto_approve_flag is defined", () => {
    const cfg = cursorConfig();
    const inv = buildExternalInvocation(
      "cursor",
      cfg,
      null,
      "do work",
      undefined,
      {
        readOnly: true,
      },
    );
    expect(inv.args).not.toContain("--yolo");
  });

  // -------------------------------------------------------------------------
  // (b) cursor + readOnly:true + read_only_flag defined → appends it
  // -------------------------------------------------------------------------
  it("cursor readOnly:true: appends read_only_flag when defined", () => {
    const cfg: VendorConfig = {
      ...cursorConfig(),
      read_only_flag: "--read-only-mode",
    };
    const inv = buildExternalInvocation(
      "cursor",
      cfg,
      null,
      "do work",
      undefined,
      {
        readOnly: true,
      },
    );
    expect(inv.args).toContain("--read-only-mode");
    expect(inv.args).not.toContain("--yolo");
  });

  // -------------------------------------------------------------------------
  // (c) cursor + readOnly:true + NO read_only_flag → console.warn, no --yolo
  // -------------------------------------------------------------------------
  it("cursor readOnly:true + no read_only_flag: warns and omits --yolo", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cfg = cursorConfig(); // no read_only_flag
    const inv = buildExternalInvocation(
      "cursor",
      cfg,
      null,
      "analyze",
      undefined,
      {
        readOnly: true,
      },
    );
    expect(inv.args).not.toContain("--yolo");
    const warnMessages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(
      warnMessages.some((m) => m.includes("read-only") && m.includes("cursor")),
    ).toBe(true);
  });

  // -------------------------------------------------------------------------
  // (d) cursor + readOnly:false (default) → --yolo present (back-compat)
  // -------------------------------------------------------------------------
  it("cursor readOnly:false (default): --yolo is appended when no auto_approve_flag", () => {
    const cfg = cursorConfig();
    const inv = buildExternalInvocation(
      "cursor",
      cfg,
      null,
      "build it",
      undefined,
      {
        readOnly: false,
      },
    );
    expect(inv.args).toContain("--yolo");
  });

  // -------------------------------------------------------------------------
  // (e) cursor + readOnly:false + custom auto_approve_flag → custom flag, no --yolo
  // -------------------------------------------------------------------------
  it("cursor readOnly:false + custom auto_approve_flag: uses custom flag, not --yolo", () => {
    const cfg: VendorConfig = {
      ...cursorConfig(),
      auto_approve_flag: "--force",
    };
    const inv = buildExternalInvocation("cursor", cfg, null, "run", undefined, {
      readOnly: false,
    });
    expect(inv.args).toContain("--force");
    expect(inv.args).not.toContain("--yolo");
  });

  // -------------------------------------------------------------------------
  // (f) cursor + readOnly:true + custom auto_approve_flag → auto_approve suppressed
  // -------------------------------------------------------------------------
  it("cursor readOnly:true + custom auto_approve_flag: auto_approve suppressed, read_only_flag used", () => {
    const cfg: VendorConfig = {
      ...cursorConfig(),
      auto_approve_flag: "--force",
      read_only_flag: "--safe-mode",
    };
    const inv = buildExternalInvocation(
      "cursor",
      cfg,
      null,
      "read only work",
      undefined,
      {
        readOnly: true,
      },
    );
    expect(inv.args).not.toContain("--force");
    expect(inv.args).not.toContain("--yolo");
    expect(inv.args).toContain("--safe-mode");
  });
});

describe("buildExternalInvocation — table-driven: all external vendors suppress auto-approve under readOnly", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const vendors: Array<{
    vendor: string;
    autoApproveFlag: string;
    readOnlyFlag?: string;
    promptFlag: string | null;
    extraConfig?: Partial<VendorConfig>;
  }> = [
    {
      vendor: "cursor",
      autoApproveFlag: "--yolo",
      readOnlyFlag: "--cursor-ro",
      promptFlag: null,
    },
    {
      vendor: "kiro",
      autoApproveFlag: "--trust-all-tools",
      readOnlyFlag: "--kiro-ro",
      promptFlag: null,
    },
    {
      vendor: "grok",
      autoApproveFlag: "--yolo",
      readOnlyFlag: "--grok-ro",
      promptFlag: "-p",
    },
    {
      vendor: "gemini",
      autoApproveFlag: "--approval-mode=yolo",
      readOnlyFlag: "--gemini-ro",
      promptFlag: "-p",
    },
    {
      vendor: "codex",
      autoApproveFlag: "--full-auto",
      readOnlyFlag: "--sandbox read-only",
      promptFlag: null,
      extraConfig: { subcommand: "exec" },
    },
  ];

  for (const {
    vendor,
    autoApproveFlag,
    readOnlyFlag,
    promptFlag,
    extraConfig,
  } of vendors) {
    it(`${vendor}: readOnly:true suppresses auto-approve flag '${autoApproveFlag}'`, () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const cfg: VendorConfig = {
        command: vendor === "kiro" ? "kiro-cli" : vendor,
        auto_approve_flag: autoApproveFlag,
        read_only_flag: readOnlyFlag,
        model_flag: undefined,
        default_model: undefined,
        output_format_flag: undefined,
        output_format: undefined,
        subcommand: undefined,
        isolation_flags: undefined,
        isolation_env: undefined,
        prompt_flag: undefined,
        ...extraConfig,
      };
      const opts: ExternalInvocationOptions = { readOnly: true };
      const inv = buildExternalInvocation(
        vendor,
        cfg,
        promptFlag,
        "task prompt",
        undefined,
        opts,
      );

      // auto-approve must be absent
      expect(inv.args).not.toContain(autoApproveFlag);
      // For --approval-mode=yolo style flags that aren't split, check full string
      const argsStr = inv.args.join(" ");
      expect(argsStr).not.toContain(autoApproveFlag);

      warnSpy.mockRestore();
    });
  }

  it("all external vendors: readOnly:false emits auto-approve flags (back-compat)", () => {
    const vendorFlags: Array<{
      vendor: string;
      promptFlag: string | null;
      expectedAutoApprove: string;
      extraConfig?: Partial<VendorConfig>;
    }> = [
      { vendor: "cursor", promptFlag: null, expectedAutoApprove: "--yolo" },
      {
        vendor: "kiro",
        promptFlag: null,
        expectedAutoApprove: "--trust-all-tools",
      },
      { vendor: "grok", promptFlag: "-p", expectedAutoApprove: "--yolo" },
    ];

    for (const {
      vendor,
      promptFlag,
      expectedAutoApprove,
      extraConfig,
    } of vendorFlags) {
      const cfg: VendorConfig = {
        command: vendor === "kiro" ? "kiro-cli" : vendor,
        auto_approve_flag: undefined,
        read_only_flag: undefined,
        model_flag: undefined,
        default_model: undefined,
        output_format_flag: undefined,
        output_format: undefined,
        subcommand: undefined,
        isolation_flags: undefined,
        isolation_env: undefined,
        prompt_flag: undefined,
        ...extraConfig,
      };
      const inv = buildExternalInvocation(
        vendor,
        cfg,
        promptFlag,
        "do work",
        undefined,
        {
          readOnly: false,
        },
      );
      expect(inv.args).toContain(expectedAutoApprove);
    }
  });
});

describe("isolation_env hardening", () => {
  it("applies a safe isolation_env key with $$ pid substitution", () => {
    // gemini takes the generic build path, which is where isolation_env applies.
    const cfg = { ...cursorConfig(), isolation_env: "OMA_SANDBOX_ID=run-$$" };
    const inv = buildExternalInvocation("gemini", cfg, null, "task");
    expect(inv.env.OMA_SANDBOX_ID).toBe(`run-${process.pid}`);
  });

  it("refuses loader-hijack env keys from config", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      for (const dangerous of [
        "LD_PRELOAD=/tmp/evil.so",
        "DYLD_INSERT_LIBRARIES=/tmp/evil.dylib",
        "PATH=/evil/bin",
        "NODE_OPTIONS=--require /tmp/evil.js",
        "PYTHONPATH=/tmp/evil",
      ]) {
        const key = dangerous.split("=")[0] as string;
        const before = process.env[key];
        const cfg = { ...cursorConfig(), isolation_env: dangerous };
        const inv = buildExternalInvocation("gemini", cfg, null, "task");
        expect(inv.env[key]).toBe(before);
      }
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("isSafeIsolationEnvKey accepts benign keys and rejects malformed ones", () => {
    expect(isSafeIsolationEnvKey("OMA_SESSION_ID")).toBe(true);
    expect(isSafeIsolationEnvKey("ld_preload")).toBe(false);
    expect(isSafeIsolationEnvKey("1BAD")).toBe(false);
    expect(isSafeIsolationEnvKey("BAD-KEY")).toBe(false);
  });
});
