import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { VENDORS } from "../constants/vendors.js";
import {
  type AgentSpec,
  loadExecutionProtocol,
  type OmaConfig,
  type OmaDocsConfig,
  parseOmaConfig,
} from "./agent-config.js";

// ---------------------------------------------------------------------------
// agent-config.test.ts
// Tests for OmaConfig schema (model-preset unified config).
//
// Note: parseOmaConfig validates the full schema. The 'agents' override map
// uses z.record(AgentIdEnum, AgentSpec) which requires all 11 keys when
// present as a full record — partial overrides are passed as OmaConfig
// objects directly to resolveAgentPlanFromConfig in runtime-dispatch.test.ts.
// ---------------------------------------------------------------------------

describe("parseOmaConfig — minimal valid config", () => {
  it("parses language + model_preset", () => {
    const yaml = "language: en\nmodel_preset: claude\n";
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.language).toBe("en");
    expect(result?.model_preset).toBe("claude");
  });

  it("defaults language to 'en' when absent", () => {
    const yaml = "model_preset: gemini\n";
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.language).toBe("en");
  });

  it("parses all optional top-level scalar fields", () => {
    const yaml = [
      "language: ko",
      "model_preset: codex",
      "date_format: ISO",
      "timezone: Asia/Seoul",
      "auto_update_cli: true",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.date_format).toBe("ISO");
    expect(result?.timezone).toBe("Asia/Seoul");
    expect(result?.auto_update_cli).toBe(true);
  });

  it("accepts all 6 built-in preset keys", () => {
    const presets = [
      "antigravity",
      "claude",
      "codex",
      "qwen",
      "cursor",
      "mixed",
    ];
    for (const preset of presets) {
      const result = parseOmaConfig(`language: en\nmodel_preset: ${preset}\n`);
      expect(result, `preset=${preset} should parse`).not.toBeNull();
      expect(result?.model_preset).toBe(preset);
    }
  });
});

describe("parseOmaConfig — missing or invalid required fields", () => {
  it("returns null when model_preset is absent", () => {
    expect(parseOmaConfig("language: en\n")).toBeNull();
  });

  it("returns null for empty YAML string", () => {
    expect(parseOmaConfig("")).toBeNull();
    expect(parseOmaConfig("   ")).toBeNull();
  });

  it("returns null for null YAML value (~)", () => {
    expect(parseOmaConfig("~")).toBeNull();
  });

  it("returns null when model_preset is empty string", () => {
    expect(parseOmaConfig("language: en\nmodel_preset: ''\n")).toBeNull();
  });
});

describe("parseOmaConfig — custom_presets passthrough", () => {
  it("passes through custom_presets block", () => {
    const yaml = [
      "language: en",
      "model_preset: my-team",
      "custom_presets:",
      "  my-team:",
      "    extends: claude",
      "    description: Team preset",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.custom_presets?.["my-team"]).toBeDefined();
  });
});

describe("parseOmaConfig — models passthrough", () => {
  it("passes through inline models definition", () => {
    const yaml = [
      "language: en",
      "model_preset: claude",
      "models:",
      "  custom-fast:",
      "    cli: gemini",
      "    cli_model: gemini-3-flash",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.models?.["custom-fast"]).toBeDefined();
  });
});

describe("OmaConfig TypeScript interface", () => {
  it("satisfies OmaConfig with required fields only", () => {
    const config: OmaConfig = {
      language: "en",
      model_preset: "claude",
    };
    expect(config.model_preset).toBe("claude");
    expect(config.agents).toBeUndefined();
    expect(config.models).toBeUndefined();
    expect(config.custom_presets).toBeUndefined();
  });

  it("accepts agents override map as partial record (object shape)", () => {
    const config: OmaConfig = {
      language: "en",
      model_preset: "gemini",
      agents: {
        backend: { model: "openai/gpt-5.4", effort: "high" },
      },
    };
    expect(config.agents?.backend?.model).toBe("openai/gpt-5.4");
    expect(config.agents?.backend?.effort).toBe("high");
  });

  it("AgentSpec supports all effort levels", () => {
    const levels: AgentSpec["effort"][] = [
      "none",
      "low",
      "medium",
      "high",
      "xhigh",
    ];
    for (const effort of levels) {
      const spec: AgentSpec = { model: "openai/gpt-5.4", effort };
      expect(spec.effort).toBe(effort);
    }
  });

  it("AgentSpec supports all memory tiers", () => {
    const tiers: AgentSpec["memory"][] = ["user", "project", "local"];
    for (const memory of tiers) {
      const spec: AgentSpec = { model: "anthropic/claude-sonnet-4-6", memory };
      expect(spec.memory).toBe(memory);
    }
  });

  it("AgentSpec supports thinking flag", () => {
    const spec: AgentSpec = {
      model: "google/gemini-3-flash",
      thinking: true,
    };
    expect(spec.thinking).toBe(true);
  });
});

describe("parseOmaConfig — docs.auto_verify field", () => {
  it("parses docs.auto_verify: true", () => {
    const yaml = [
      "language: en",
      "model_preset: claude",
      "docs:",
      "  auto_verify: true",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.docs?.auto_verify).toBe(true);
  });

  it("parses docs.auto_verify: false", () => {
    const yaml = [
      "language: en",
      "model_preset: claude",
      "docs:",
      "  auto_verify: false",
    ].join("\n");
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.docs?.auto_verify).toBe(false);
  });

  it("docs field is optional — defaults to undefined when absent", () => {
    const yaml = "language: en\nmodel_preset: claude\n";
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.docs).toBeUndefined();
  });

  it("auto_verify is effectively false when docs field is absent", () => {
    const yaml = "language: en\nmodel_preset: claude\n";
    const result = parseOmaConfig(yaml);
    expect(result?.docs?.auto_verify ?? false).toBe(false);
  });

  it("docs field is optional — docs present without auto_verify", () => {
    const yaml = ["language: en", "model_preset: claude", "docs: {}"].join(
      "\n",
    );
    const result = parseOmaConfig(yaml);
    expect(result).not.toBeNull();
    expect(result?.docs?.auto_verify).toBeUndefined();
  });

  it("OmaDocsConfig TypeScript interface accepts auto_verify boolean", () => {
    const docsConfig: OmaDocsConfig = { auto_verify: true };
    expect(docsConfig.auto_verify).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// loadExecutionProtocol — execution-protocol parity
//
// Regression for: antigravity (agy) spawns reported `crashed` despite success.
// Root cause was a missing `antigravity.md` execution protocol, so agy received
// no instruction to write `.serena/memories/result-{agent-id}.md` (the artifact
// `agent:status` reads). Every vendor reachable via external `oma agent:spawn`
// must resolve a protocol that instructs writing the result artifact.
// See .agents/results/bugs/bug-20260529-antigravity-spawn-no-result-artifact.md
// ---------------------------------------------------------------------------

describe("loadExecutionProtocol — execution-protocol parity", () => {
  // Repo root, resolved relative to this test file (cli/platform/*.test.ts).
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

  // Vendors that do NOT dispatch via external `oma agent:spawn` and therefore
  // do not require a `{vendor}.md` execution protocol on this path. Keep this
  // list — and the justification — tight: anything not listed here is REQUIRED
  // to have a protocol, derived from the VENDORS source of truth below.
  //   - claude: runs as a native subagent (Agent tool), not external spawn.
  //   - cursor: partial-support; result hand-off tracked separately.
  const PROTOCOL_EXEMPT_VENDORS = new Set(["claude", "cursor"]);

  // Derived from the VENDORS source of truth: adding a vendor there
  // automatically enrolls it here, so a new vendor cannot be added without
  // either shipping a protocol or explicitly exempting it above. This is the
  // guard that prevents the antigravity bug from recurring for future vendors.
  const REQUIRED_PROTOCOL_VENDORS = VENDORS.filter(
    (v) => !PROTOCOL_EXEMPT_VENDORS.has(v),
  );

  it("antigravity protocol documents the headless stdout hand-off", () => {
    // The crux of the bug: agy `-p` stdout is discarded, so the result file is
    // the only durable hand-off. The protocol must call this out explicitly.
    const protocol = loadExecutionProtocol("antigravity", repoRoot);
    expect(protocol.toLowerCase()).toContain("headless");
  });

  it.each(
    REQUIRED_PROTOCOL_VENDORS,
  )("%s (external-dispatch) protocol resolves and instructs the result artifact write", (vendor) => {
    const protocol = loadExecutionProtocol(vendor, repoRoot);
    expect(protocol.length).toBeGreaterThan(0);
    expect(protocol).toContain("result-{agent-id}");
  });

  it.each(
    REQUIRED_PROTOCOL_VENDORS,
  )("%s protocol prescribes a status line that checkStatus's regex can parse", (vendor) => {
    // Systemic defect found during repro: protocols documented Status as a
    // sub-bullet (`- Status: completed`), which checkStatus's
    // `^## Status:\s*(\S+)` regex never matches — so a failed run silently
    // falls back to the "completed" default. Every external-dispatch protocol
    // must prescribe the exact heading shape the parser actually reads.
    const protocol = loadExecutionProtocol(vendor, repoRoot);
    // The status-parsing regex used by checkStatus (spawn-status.ts).
    const statusRegex = /^## Status:\s*(\S+)/m;
    // The example the protocol prescribes must itself match that regex.
    expect(protocol).toMatch(/^## Status: completed$/m);
    const match = protocol.match(statusRegex);
    expect(match?.[1]).toBe("completed");
  });

  it.each(
    REQUIRED_PROTOCOL_VENDORS,
  )("%s protocol routes coordination files to the .serena/memories store the readers use", (vendor) => {
    // Path defect found during repro: codex/grok protocols told agents to
    // write `result-{agent-id}.md` under `.agents/results/`, but every reader
    // of those coordination files — checkStatus (spawn-status.ts),
    // findResultFile (verify.ts), and getMemoriesPath (io/memory.ts) — reads
    // `.serena/memories/`. Files written elsewhere are orphaned → `crashed`.
    const protocol = loadExecutionProtocol(vendor, repoRoot);
    expect(protocol).toContain(".serena/memories");
    // Coordination artifacts must NOT be routed to `.agents/results/`
    // (that dir is for human-facing deliverables: plans, bug reports, etc.).
    expect(protocol).not.toContain(".agents/results/result-");
    expect(protocol).not.toContain(".agents/results/progress-");
    expect(protocol).not.toContain(".agents/results/task-board");
  });

  it("claude (native) protocol also routes coordination files to .serena/memories", () => {
    // claude is exempt from external-dispatch checks, but the result/progress
    // readers (io/memory.ts, verify.ts) are shared, so the same path + status
    // contract applies to the native flow.
    const protocol = loadExecutionProtocol("claude", repoRoot);
    expect(protocol).toContain(".serena/memories");
    expect(protocol).not.toContain(".agents/results/result-");
    expect(protocol).toMatch(/^## Status: completed$/m);
  });

  it("every exempt vendor is still a real VENDOR (no stale exemptions)", () => {
    // Prevents the exemption list from silently masking a removed/renamed
    // vendor — keeps the guard honest as VENDORS evolves.
    for (const vendor of PROTOCOL_EXEMPT_VENDORS) {
      expect(VENDORS).toContain(vendor);
    }
  });

  it("returns empty string for an unknown vendor", () => {
    expect(loadExecutionProtocol("does-not-exist", repoRoot)).toBe("");
  });
});
