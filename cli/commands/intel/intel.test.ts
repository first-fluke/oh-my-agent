import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type IntelSignal,
  resolveIntelConfig,
  runIntelSuggest,
  scoreCandidates,
} from "./intel.js";

let tmpDir: string;

function makeTmpDir(): string {
  return path.join(os.tmpdir(), "oma-intel-test", randomUUID());
}

function writeFile(relativePath: string, content: string): string {
  const filePath = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

beforeEach(() => {
  tmpDir = makeTmpDir();
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("resolveIntelConfig", () => {
  it("loads minimal YAML config and keeps GitHub repos as source inputs", () => {
    writeFile(
      "oma-intel.yaml",
      [
        "version: 1",
        "target: first-fluke/oh-my-agent",
        "topic: agent harness workflows",
        "sources:",
        "  github:",
        "    repos:",
        "      - owner/example-agent-tool",
        "  market:",
        "    enabled: true",
        "window:",
        "  since: 14d",
        "output:",
        "  dir: docs/intel",
        "  formats: [md, json]",
        "remote:",
        "  github_issue:",
        "    enabled: false",
        "    require_confirm: true",
      ].join("\n"),
    );

    const config = resolveIntelConfig({ cwd: tmpDir });

    expect(config.target).toBe("first-fluke/oh-my-agent");
    expect(config.topic).toBe("agent harness workflows");
    expect(config.sources.github?.repos).toEqual(["owner/example-agent-tool"]);
    expect(config.sources.market?.enabled).toBe(true);
    expect(config.window.since).toBe("14d");
    expect(config.output.dir).toBe("docs/intel");
  });

  it("rejects configs with both since and last_commits", () => {
    writeFile(
      "oma-intel.yaml",
      [
        "version: 1",
        "target: first-fluke/oh-my-agent",
        "sources:",
        "  github:",
        "    repos: [owner/example]",
        "window:",
        "  since: 30d",
        "  last_commits: 10",
      ].join("\n"),
    );

    expect(() => resolveIntelConfig({ cwd: tmpDir })).toThrow(
      "Config must use only one window",
    );
  });

  it("lets inline repos override configured GitHub repos", () => {
    writeFile(
      "oma-intel.yaml",
      [
        "version: 1",
        "target: first-fluke/oh-my-agent",
        "sources:",
        "  github:",
        "    repos: [owner/from-config]",
      ].join("\n"),
    );

    const config = resolveIntelConfig({
      cwd: tmpDir,
      repos: "owner/from-cli,other/tool",
    });

    expect(config.sources.github?.repos).toEqual([
      "owner/from-cli",
      "other/tool",
    ]);
  });
});

describe("scoreCandidates", () => {
  it("accepts repeated high-trust capability signals", () => {
    const baseSignal = {
      source: "commit" as const,
      observedAt: "2026-06-01T00:00:00Z",
      retrievedAt: "2026-06-01T00:00:00Z",
      summary: "team orchestration workflow verification",
      capabilityTags: ["workflow-loop"],
      trust: "high" as const,
    };
    const signals: IntelSignal[] = [
      {
        ...baseSignal,
        repo: "owner/a",
        title: "Add workflow loop",
      },
      {
        ...baseSignal,
        repo: "owner/b",
        title: "Improve verification loop",
      },
    ];

    const candidates = scoreCandidates(signals);

    expect(candidates[0]?.capability).toBe("workflow-loop");
    expect(candidates[0]?.decision).toBe("accept");
    expect(candidates[0]?.valueScore).toBeGreaterThanOrEqual(55);
  });
});

describe("runIntelSuggest", () => {
  it("writes local markdown and json outputs from fixture signals", async () => {
    writeFile(
      "oma-intel.yaml",
      [
        "version: 1",
        "target: first-fluke/oh-my-agent",
        "topic: agent harness workflows",
        "sources:",
        "  market:",
        "    enabled: true",
        "output:",
        "  dir: out",
        "  formats: [md, json]",
      ].join("\n"),
    );
    const fixture = writeFile(
      "signals.json",
      JSON.stringify({
        signals: [
          {
            repo: "owner/a",
            source: "commit",
            observedAt: "2026-06-01T00:00:00Z",
            retrievedAt: "2026-06-01T00:00:00Z",
            title: "Add team workflow verification",
            summary: "team orchestration workflow verification",
            ref: "abc123",
            capabilityTags: ["workflow-loop"],
            trust: "high",
          },
          {
            repo: "owner/b",
            source: "commit",
            observedAt: "2026-06-01T00:00:00Z",
            retrievedAt: "2026-06-01T00:00:00Z",
            title: "Improve autopilot workflow loop",
            summary: "autopilot workflow loop",
            ref: "def456",
            capabilityTags: ["workflow-loop"],
            trust: "high",
          },
        ],
        coverage: [
          {
            source: "fixture",
            status: "ok",
            detail: "loaded fixture",
          },
        ],
      }),
    );

    const result = await runIntelSuggest({
      cwd: tmpDir,
      fixture,
      now: new Date("2026-06-01T00:00:00Z"),
    });

    expect(result.outputPaths.markdown).toBeTruthy();
    expect(result.outputPaths.json).toBeTruthy();
    expect(fs.existsSync(result.outputPaths.markdown ?? "")).toBe(true);
    expect(fs.existsSync(result.outputPaths.json ?? "")).toBe(true);
    expect(result.markdown).toContain("Intelligence Suggestions");
    expect(result.candidates.some((c) => c.decision === "accept")).toBe(true);
  });
});
