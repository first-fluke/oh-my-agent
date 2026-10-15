import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFullState,
  resolveMemoriesDir,
  resolveResultsDir,
} from "./state.js";

describe("resolveMemoriesDir", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the explicit project directory", () => {
    vi.stubEnv("MEMORIES_DIR", "");
    expect(resolveMemoriesDir("/tmp/project")).toBe(
      join("/tmp/project", ".agents", "state", "memories"),
    );
  });

  it("defaults to cwd and ignores positional argv (the `web` subcommand)", () => {
    vi.stubEnv("MEMORIES_DIR", "");
    const argv = process.argv;
    process.argv = [argv[0] ?? "node", "cli.js", "dashboard", "web"];
    try {
      expect(resolveMemoriesDir()).toBe(
        join(process.cwd(), ".agents", "state", "memories"),
      );
    } finally {
      process.argv = argv;
    }
  });

  it("honors MEMORIES_DIR", () => {
    vi.stubEnv("MEMORIES_DIR", "/tmp/override-memories");
    expect(resolveMemoriesDir("/tmp/project")).toBe("/tmp/override-memories");
  });
});

describe("dashboard report sources", () => {
  let projectDir: string;
  let memoriesDir: string;
  let resultsDir: string;

  beforeEach(() => {
    vi.stubEnv("MEMORIES_DIR", "");
    projectDir = mkdtempSync(join(tmpdir(), "oma-dashboard-sources-"));
    memoriesDir = resolveMemoriesDir(projectDir);
    resultsDir = resolveResultsDir(projectDir) as string;
    mkdirSync(memoriesDir, { recursive: true });
    mkdirSync(resultsDir, { recursive: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("combines canonical reports with coordination progress and session files", () => {
    writeFileSync(
      join(memoriesDir, "orchestrator-session.md"),
      "session-id: dashboard-session\n## Active\n",
    );
    writeFileSync(
      join(memoriesDir, "progress-frontend.md"),
      "Agent: frontend\nturn: 4\n## Progress\n- Updating navigation\n",
    );
    writeFileSync(
      join(resultsDir, "result-backend.md"),
      "Agent: backend\n## Task\nImplement API\n## Completed\n- API checks passed\n",
    );

    const state = buildFullState(memoriesDir, resultsDir);

    expect(state.session).toEqual({
      id: "dashboard-session",
      status: "RUNNING",
    });
    expect(state.agents).toEqual(
      expect.arrayContaining([
        { agent: "frontend", status: "running", task: "", turn: 4 },
        {
          agent: "backend",
          status: "completed",
          task: "Implement API",
          turn: null,
        },
      ]),
    );
    expect(state.activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: "progress-frontend.md" }),
        expect.objectContaining({
          file: "result-backend.md",
          message: "API checks passed",
        }),
      ]),
    );
  });

  it("prefers canonical report contents over a newer legacy file with the same name", () => {
    const filename = "result-backend.md";
    writeFileSync(
      join(resultsDir, filename),
      "Agent: backend\n## Completed\n- Canonical result verified\n",
    );
    writeFileSync(
      join(memoriesDir, filename),
      "Agent: backend\n## Failed\n- Legacy failure superseded\n",
    );
    utimesSync(join(resultsDir, filename), new Date(1_000), new Date(1_000));
    utimesSync(join(memoriesDir, filename), new Date(2_000), new Date(2_000));

    const state = buildFullState(memoriesDir, resultsDir);

    expect(state.agents).toEqual([
      { agent: "backend", status: "completed", task: "", turn: null },
    ]);
    expect(state.activity).toEqual([
      {
        agent: "backend",
        message: "Canonical result verified",
        file: filename,
      },
    ]);
  });

  it("retains legacy reports and excludes other result-directory artifacts", () => {
    writeFileSync(
      join(memoriesDir, "result-legacy.md"),
      "Agent: legacy\n## Completed\n- Legacy result retained\n",
    );
    writeFileSync(
      join(resultsDir, "research.md"),
      "Agent: unrelated\n## Completed\n- Arbitrary artifact ignored\n",
    );
    mkdirSync(join(resultsDir, "result-agent-folder.md"));

    const state = buildFullState(memoriesDir, resultsDir);

    expect(state.agents).toEqual([
      { agent: "legacy", status: "completed", task: "", turn: null },
    ]);
    expect(state.activity.map((activity) => activity.file)).toEqual([
      "result-legacy.md",
    ]);
  });

  it("keeps a custom MEMORIES_DIR isolated from project results", () => {
    const customDir = join(projectDir, "custom-store");
    mkdirSync(customDir);
    writeFileSync(
      join(customDir, "result-custom.md"),
      "Agent: custom\n## Completed\n- Custom result retained\n",
    );
    writeFileSync(
      join(resultsDir, "result-project.md"),
      "Agent: project\n## Completed\n- Project result ignored\n",
    );
    vi.stubEnv("MEMORIES_DIR", customDir);

    expect(resolveMemoriesDir(projectDir)).toBe(customDir);
    expect(resolveResultsDir(projectDir)).toBeUndefined();
    const state = buildFullState(
      resolveMemoriesDir(projectDir),
      resolveResultsDir(projectDir),
    );
    expect(state.agents.map((agent) => agent.agent)).toEqual(["custom"]);
    expect(state.resultsDir).toBeUndefined();
  });
});
