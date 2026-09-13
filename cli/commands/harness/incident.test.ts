import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { beginAgentRun, finishAgentRun } from "../../state/agent-results.js";
import { readEvents } from "../../state/events.js";
import {
  captureHarnessIncident,
  exportHarnessIncident,
  readHarnessIncident,
} from "./incident.js";
import { reproduceHarnessIncident } from "./incident-command.js";
import { inspectHarnessRecord } from "./records.js";
import { rescoreHarnessRecord } from "./replay.js";
import { loadHarnessSuite } from "./suite.js";

const cleanup: string[] = [];
function setup(patch: Record<string, unknown> = {}) {
  const root = mkdtempSync(join(tmpdir(), "oma-incident-"));
  cleanup.push(root);
  mkdirSync(join(root, "input"));
  writeFileSync(join(root, "input", "result.json"), '{"complete":false}');
  mkdirSync(join(root, ".agents", "rules"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "rules", "task.md"),
    "Report the outcome.",
  );
  mkdirSync(join(root, "candidate", ".agents", "rules"), { recursive: true });
  writeFileSync(
    join(root, "candidate", ".agents", "rules", "task.md"),
    "Finish the task and update result.json.",
  );
  const spec = {
    schema_version: 1,
    id: "reported-incomplete",
    summary: "Agent reported success without finishing",
    prompt: "Finish this task",
    agent: "backend",
    observed: {
      failure: "Success text did not match file state",
      output: "success",
      exit_code: 0,
    },
    initial_workspace: "input",
    expected_checks: [
      {
        type: "file_json_equals",
        path: "result.json",
        pointer: "/complete",
        value: true,
      },
    ],
    ...patch,
  };
  const specPath = join(root, "incident-spec.json");
  writeFileSync(specPath, JSON.stringify(spec));
  return { root, specPath };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of cleanup.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("incident to regression", () => {
  it("pins the supplied initial state and keeps an unestablished cause unknown", () => {
    const { root, specPath } = setup();
    const { incident } = captureHarnessIncident(root, specPath);
    expect(incident.cause.category).toBe("unknown");
    writeFileSync(join(root, "input", "result.json"), '{"complete":true}');
    const { suitePath } = exportHarnessIncident(root, incident.id);
    const suite = loadHarnessSuite(suitePath, root);
    expect(suite.schemaVersion).toBe(1);
    expect(suite.tasks).toHaveLength(1);
    expect(suite.tasks[0]?.incident?.manifestHash).toBe(incident.manifestHash);
    expect(
      readFileSync(
        join(suite.tasks[0]?.workspace ?? "", "result.json"),
        "utf8",
      ),
    ).toBe('{"complete":false}');
    expect(exportHarnessIncident(root, incident.id).suitePath).toBe(suitePath);
  });

  it("connects the captured failure, candidate result, and fresh raw-evidence rescore", async () => {
    const { root, specPath } = setup();
    captureHarnessIncident(root, specPath);
    const recordFile = join(root, "comparison.json");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await reproduceHarnessIncident(
      root,
      "reported-incomplete",
      true,
      {
        candidate: "candidate",
        live: true,
        record: true,
        yes: true,
        recordFile,
        _vendor: "codex",
        _materializeVendor: () => {},
        _dispatch: ({ workspace }) => {
          const rule = readFileSync(
            join(workspace, ".agents", "rules", "task.md"),
            "utf8",
          );
          if (rule.includes("Finish the task"))
            writeFileSync(join(workspace, "result.json"), '{"complete":true}');
          return "success";
        },
      },
    );
    expect(result?.score.correctedTaskIds).toEqual(["reported-incomplete"]);
    expect(result?.runs.map((run) => run.passed)).toEqual([false, true]);
    expect(result?.promotionReady).toBe(false);
    const events = readEvents(root, "oma-incident-reported-incomplete");
    expect(events.map((event) => event.kind)).toEqual([
      "harness.incident.captured",
      "harness.incident.exported",
      "harness.incident.evaluated",
    ]);
    expect(events.at(-1)?.payload?.candidateHash).toBe(result?.candidateHash);
    const { suitePath } = exportHarnessIncident(root, "reported-incomplete");
    const record = inspectHarnessRecord(recordFile);
    for (const run of record.runs) {
      run.passed = true;
      for (const check of run.checks) check.passed = true;
    }
    const rescored = rescoreHarnessRecord(record, {
      suite: loadHarnessSuite(suitePath, root),
    });
    expect(rescored.runs.map((run) => run.passed)).toEqual([false, true]);
  });

  it("imports run lineage but refuses to invent absent initial evidence", () => {
    const { root, specPath } = setup({
      prompt: undefined,
      initial_workspace: undefined,
    });
    const started = beginAgentRun({
      root,
      workspace: root,
      agentId: "backend",
      sessionId: "source-session",
      taskId: "source-task",
      vendor: "codex",
      dispatch: { prompt: "Original request" },
    });
    finishAgentRun(root, started.runId, 1, {
      status: "failed",
      changedFiles: [],
      unresolved: ["environment unavailable"],
      artifacts: [],
    });
    const { incident } = captureHarnessIncident(root, specPath, started.runId);
    expect(incident.source).toMatchObject({
      kind: "agent-run",
      runId: started.runId,
      sessionId: "source-session",
      status: "failed",
    });
    expect(incident.prompt).toBe("Original request");
    expect(incident.cause.category).toBe("unknown");
    expect(incident.initial).toBeUndefined();
    expect(() => exportHarnessIncident(root, incident.id)).toThrow(
      "initial workspace evidence is missing",
    );
  });

  it("keeps external dependencies explicit instead of claiming full replay", () => {
    const { root, specPath } = setup({
      dependencies: [
        {
          name: "production-service",
          repeatability: "unavailable",
          reason: "Response was not recorded",
        },
      ],
    });
    const { incident } = captureHarnessIncident(root, specPath);
    expect(
      incident.limitations.some((reason) =>
        reason.includes("production-service"),
      ),
    ).toBe(true);
  });

  it("preserves the source agent when the incident spec does not override it", () => {
    const { root, specPath } = setup({ agent: undefined });
    const started = beginAgentRun({
      root,
      workspace: root,
      agentId: "frontend",
      sessionId: "source-frontend",
      taskId: "source-task",
      vendor: "codex",
      dispatch: { prompt: "Original frontend request" },
    });
    const { incident } = captureHarnessIncident(root, specPath, started.runId);
    expect(incident.agent).toBe("frontend");
  });

  it("rejects substituted dependency responses even when the pinned file is unchanged", async () => {
    const { root, specPath } = setup({
      dependencies: [
        {
          name: "service",
          repeatability: "fixture",
          reason: "Recorded response",
          fixture: "pinned.json",
        },
      ],
    });
    const pinned = {
      schemaVersion: 1,
      taskId: "reported-incomplete",
      requests: [{ tool: "service", request: { id: 1 } }],
      steps: [
        {
          tool: "service",
          request: { id: 1 },
          response: { complete: false },
          writes: [{ path: "result.json", content: '{"complete":false}' }],
        },
      ],
    };
    writeFileSync(join(root, "pinned.json"), JSON.stringify(pinned));
    captureHarnessIncident(root, specPath);
    const substituted = structuredClone(pinned);
    const step = substituted.steps[0];
    if (!step) throw new Error("Fixture step missing");
    step.response.complete = true;
    step.writes = [{ path: "result.json", content: '{"complete":true}' }];
    writeFileSync(join(root, "substituted.json"), JSON.stringify(substituted));
    await expect(
      reproduceHarnessIncident(root, "reported-incomplete", true, {
        candidate: "candidate",
        action: "fixture-replay",
        transcriptFile: "substituted.json",
      }),
    ).rejects.toThrow("differs from pinned responses");
  });

  it("refuses offline replay when an incident dependency was not recorded", async () => {
    const { root, specPath } = setup({
      dependencies: [
        {
          name: "service",
          repeatability: "unavailable",
          reason: "Response was not recorded",
        },
      ],
    });
    captureHarnessIncident(root, specPath);
    await expect(
      reproduceHarnessIncident(root, "reported-incomplete", true, {
        candidate: "candidate",
        action: "fixture-replay",
        transcriptFile: "transcript.json",
      }),
    ).rejects.toThrow("cannot be replayed offline");
  });

  it.each(["prompt", "agent", "checks"])(
    "rejects an edited exported %s acceptance contract",
    (field) => {
      const { root, specPath } = setup();
      const { incident } = captureHarnessIncident(root, specPath);
      const { suitePath } = exportHarnessIncident(root, incident.id);
      const raw = parseYaml(readFileSync(suitePath, "utf8"));
      if (field === "agent") raw.agent = "frontend";
      else if (field === "prompt") raw.tasks[0].prompt = "Just say success";
      else
        raw.tasks[0].checks = [{ type: "output_contains", value: "success" }];
      writeFileSync(suitePath, stringifyYaml(raw));
      expect(() => exportHarnessIncident(root, incident.id)).toThrow(
        "fixture changed",
      );
    },
  );

  it("preserves immutable incident evidence and rejects edited exports", () => {
    const { root, specPath } = setup();
    const first = captureHarnessIncident(root, specPath);
    expect(() => captureHarnessIncident(root, specPath)).toThrow(
      "already exists",
    );
    const { suitePath } = exportHarnessIncident(root, first.incident.id);
    const suite = loadHarnessSuite(suitePath, root);
    writeFileSync(
      join(suite.tasks[0]?.workspace ?? "", "result.json"),
      "tampered",
    );
    expect(() => exportHarnessIncident(root, first.incident.id)).toThrow(
      "fixture changed",
    );
    const raw = JSON.parse(readFileSync(first.path, "utf8"));
    raw.observed.failure = "rewritten";
    writeFileSync(first.path, JSON.stringify(raw));
    expect(() => readHarnessIncident(root, first.incident.id)).toThrow(
      "integrity",
    );
  });

  it("redacts sensitive observation text without claiming exact replay", () => {
    const { root, specPath } = setup({
      prompt: "Inspect api_key=SECRETSECRETVALUE",
      observed: {
        failure: "request failed",
        output: "access_token=SECRETSECRETVALUE",
      },
    });
    const { incident, path } = captureHarnessIncident(root, specPath);
    expect(readFileSync(path, "utf8")).not.toContain("SECRETSECRETVALUE");
    expect(
      incident.limitations.some((reason) => reason.includes("redacted")),
    ).toBe(true);
  });

  it("rejects external/symlinked incident evidence before creating a record", () => {
    const { root, specPath } = setup({ evidence_files: ["outside.txt"] });
    symlinkSync(specPath, join(root, "outside.txt"));
    expect(() => captureHarnessIncident(root, specPath)).toThrow(
      "regular file",
    );
    expect(
      existsSync(
        join(
          root,
          ".agents",
          "results",
          "incidents",
          "reported-incomplete",
          "incident.json",
        ),
      ),
    ).toBe(false);
  });
});
