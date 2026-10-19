import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { projectIdentity } from "../../.agents/hooks/core/session-storage.ts";
import { runtimeStateDir } from "../state/project-runtime.js";
import { migrateArtifactLayout } from "./artifact-layout.js";

const roots: string[] = [];
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-layout-"));
  roots.push(root);
  return root;
}
function put(root: string, path: string, content: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}
function read(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}
function snapshot(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  const visit = (path: string) => {
    for (const entry of readdirSync(join(root, path), {
      withFileTypes: true,
    })) {
      const name = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile()) files[name] = read(root, name);
    }
  };
  visit("");
  return files;
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("migrateArtifactLayout", () => {
  it("preserves targets transitively referenced by immutable Markdown", () => {
    const root = makeRoot();
    put(
      root,
      ".agents/state/memories/orchestrator-session.md",
      "- Design: docs/design-docs/a.md\n",
    );
    put(root, "docs/design-docs/a.md", "[dependency](../plans/designs/b.md)\n");
    put(root, "docs/plans/designs/b.md", "B\n");
    put(root, "docs/plans/designs/free.md", "Free\n");
    const receipt = JSON.stringify({
      artifacts: {
        ".agents/state/memories/orchestrator-session.md": "a".repeat(64),
      },
    });
    put(root, ".agents/state/agent-runs/run.json", receipt);

    const report = migrateArtifactLayout(root);

    expect(report.moved).toEqual([
      { from: "docs/plans/designs/free.md", to: "docs/decisions/free.md" },
    ]);
    expect(read(root, ".agents/state/memories/orchestrator-session.md")).toBe(
      "- Design: docs/design-docs/a.md\n",
    );
    expect(read(root, "docs/design-docs/a.md")).toBe(
      "[dependency](../plans/designs/b.md)\n",
    );
    expect(read(root, "docs/plans/designs/b.md")).toBe("B\n");
    expect(read(root, ".agents/state/agent-runs/run.json")).toBe(receipt);
    expect(report.skipped.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "docs/design-docs/a.md",
        "docs/plans/designs/b.md",
      ]),
    );
  });

  it("updates architecture reviews while preserving immutable review ADR groups", () => {
    const root = makeRoot();
    put(root, ".agents/results/architecture/adr-free.md", "Free ADR\n");
    put(root, ".agents/results/architecture/adr-bound.md", "Bound ADR\n");
    put(root, ".agents/results/architecture/adr-bound.archify.json", "{}\n");
    put(
      root,
      ".agents/results/architecture/review-free.md",
      "[ADR](adr-free.md)\n",
    );
    put(
      root,
      ".agents/results/architecture/review-bound.md",
      "[ADR](adr-bound.md)\n",
    );
    put(
      root,
      ".agents/state/agent-runs/run.json",
      JSON.stringify({
        artifacts: {
          ".agents/results/architecture/review-bound.md": "a".repeat(64),
        },
      }),
    );

    const report = migrateArtifactLayout(root);

    expect(report.moved).toEqual([
      {
        from: ".agents/results/architecture/adr-free.md",
        to: "docs/decisions/adr-free.md",
      },
    ]);
    expect(read(root, ".agents/results/architecture/review-free.md")).toBe(
      "[ADR](../../../docs/decisions/adr-free.md)\n",
    );
    expect(read(root, ".agents/results/architecture/review-bound.md")).toBe(
      "[ADR](adr-bound.md)\n",
    );
    expect(read(root, ".agents/results/architecture/adr-bound.md")).toBe(
      "Bound ADR\n",
    );
    expect(
      read(root, ".agents/results/architecture/adr-bound.archify.json"),
    ).toBe("{}\n");
  });

  it("moves retained ADRs and matching Archify sidecars while leaving review logs", () => {
    const root = makeRoot();
    put(root, ".agents/results/architecture/adr-001-storage.md", "# ADR\n");
    put(
      root,
      ".agents/results/architecture/adr-001-storage.archify.json",
      '{"title":"ADR"}\n',
    );
    put(
      root,
      ".agents/results/architecture/adr-001-storage.archify.html",
      "<article>ADR</article>\n",
    );
    put(root, ".agents/results/architecture/adr-unpaired.archify.json", "{}\n");
    put(root, ".agents/results/architecture/review-storage.md", "Review\n");
    put(
      root,
      ".agents/results/architecture/recommendation.md",
      "Recommendation\n",
    );
    put(root, "docs/decisions/adr-001-storage.md", "Existing ADR\n");
    put(
      root,
      "README.md",
      "[ADR](.agents/results/architecture/adr-001-storage.md)\n",
    );

    const report = migrateArtifactLayout(root);

    expect(report.moved).toHaveLength(3);
    expect(
      read(root, "docs/decisions/adr-001-storage--from-architecture.md"),
    ).toBe("# ADR\n");
    expect(
      read(
        root,
        "docs/decisions/adr-001-storage--from-architecture.archify.json",
      ),
    ).toBe('{"title":"ADR"}\n');
    expect(
      read(
        root,
        "docs/decisions/adr-001-storage--from-architecture.archify.html",
      ),
    ).toBe("<article>ADR</article>\n");
    expect(read(root, ".agents/results/architecture/review-storage.md")).toBe(
      "Review\n",
    );
    expect(read(root, ".agents/results/architecture/recommendation.md")).toBe(
      "Recommendation\n",
    );
    expect(
      read(root, ".agents/results/architecture/adr-unpaired.archify.json"),
    ).toBe("{}\n");
    expect(read(root, "README.md")).toBe(
      "[ADR](docs/decisions/adr-001-storage--from-architecture.md)\n",
    );
  });

  it("moves decisions and reports while preserving state and UI design", () => {
    const root = makeRoot();
    put(root, "docs/design-docs/010-storage.md", "# Storage\n");
    put(root, "docs/plans/designs/sub/011-queue.md", "# Queue\n");
    put(root, "docs/design-docs/images/flow.svg", "<svg/>\n");
    put(root, ".agents/state/memories/result-backend.md", "# Result\n");
    put(root, ".serena/memories/result-qa.md", "# QA\n");
    for (const name of [
      "progress-backend.md",
      "session-s1.md",
      "task-board.md",
      "lessons.md",
      "evidence.md",
    ])
      put(root, `.agents/state/memories/${name}`, name);
    put(root, ".serena/memories/decisions/result-keep.md", "Serena knowledge");
    put(root, "DESIGN.md", "UI root docs/design-docs/\n");
    put(root, "docs/DESIGN.md", "UI nested docs/design-docs/\n");

    const report = migrateArtifactLayout(root);

    expect(report.moved).toHaveLength(5);
    expect(read(root, "docs/decisions/010-storage.md")).toBe("# Storage\n");
    expect(read(root, "docs/decisions/sub/011-queue.md")).toBe("# Queue\n");
    expect(read(root, "docs/decisions/images/flow.svg")).toBe("<svg/>\n");
    expect(read(root, ".agents/results/result-backend.md")).toBe("# Result\n");
    expect(read(root, ".agents/results/result-qa.md")).toBe("# QA\n");
    expect(existsSync(join(root, "docs/design-docs/010-storage.md"))).toBe(
      false,
    );
    expect(existsSync(join(root, ".serena/memories/result-qa.md"))).toBe(false);
    expect(read(root, ".agents/state/memories/task-board.md")).toBe(
      "task-board.md",
    );
    expect(read(root, ".agents/state/memories/lessons.md")).toBe("lessons.md");
    expect(read(root, ".serena/memories/decisions/result-keep.md")).toBe(
      "Serena knowledge",
    );
    expect(read(root, "DESIGN.md")).toBe("UI root docs/design-docs/\n");
    expect(read(root, "docs/DESIGN.md")).toBe("UI nested docs/design-docs/\n");
    expect(migrateArtifactLayout(root).actions).toEqual([]);
  });

  it("preserves collisions and rewrites references to source-qualified names", () => {
    const root = makeRoot();
    put(root, "docs/decisions/001-storage.md", "Canonical\n");
    put(
      root,
      "docs/decisions/001-storage--from-design-docs.md",
      "Earlier import\n",
    );
    put(root, "docs/design-docs/001-storage.md", "Older\n");
    put(root, "docs/plans/designs/001-storage.md", "Newer\n");
    put(root, ".agents/results/result-qa.md", "Canonical QA\n");
    put(root, ".agents/state/memories/result-qa.md", "Legacy QA\n");
    put(
      root,
      "README.md",
      "[old](docs/design-docs/001-storage.md)\n[plan](docs/plans/designs/001-storage.md)\n`.agents/state/memories/result-qa.md`\n",
    );
    put(root, "AGENTS.md", "Read docs/design-docs/001-storage.md.\n");

    const preview = migrateArtifactLayout(root, { dryRun: true });
    const report = migrateArtifactLayout(root);

    expect(report.moved).toEqual(preview.moved);
    expect(report.conflicts).toHaveLength(3);
    const older = report.moved.find(
      ({ from }) => from === "docs/design-docs/001-storage.md",
    );
    expect(older?.to).toMatch(
      /^docs\/decisions\/001-storage--from-design-docs-[a-f0-9]{12}\.md$/,
    );
    expect(read(root, older?.to ?? "")).toBe("Older\n");
    expect(read(root, "docs/decisions/001-storage--from-plan-designs.md")).toBe(
      "Newer\n",
    );
    expect(read(root, "docs/decisions/001-storage.md")).toBe("Canonical\n");
    expect(read(root, "README.md")).toContain(`](${older?.to})`);
    expect(read(root, "AGENTS.md")).toBe(`Read ${older?.to}.\n`);
    expect(read(root, "README.md")).toContain(
      ".agents/results/result-qa--from-state-memories.md",
    );
    const before = snapshot(root);
    expect(migrateArtifactLayout(root).actions).toEqual([]);
    expect(snapshot(root)).toEqual(before);
  });

  it("rebases moved Markdown links and updates scoped relative/root literals", () => {
    const root = makeRoot();
    put(
      root,
      "docs/design-docs/001-a.md",
      [
        "[plan](../plans/designs/002-b.md#tradeoffs)",
        "[guide](../guide.md)",
        "[picture](images/flow.svg)",
        "[ref][b]",
        "",
        '[b]: ../plans/designs/002-b.md?view=1#section "B"',
        "`docs/plans/designs/002-b.md`",
        "[remote](https://example.com/docs/design-docs/001-a.md)",
      ].join("\n"),
    );
    put(
      root,
      "docs/plans/designs/002-b.md",
      "[a](../../design-docs/001-a.md)\n",
    );
    put(root, "docs/design-docs/images/flow.svg", "<svg/>\n");
    put(
      root,
      "docs/guide.md",
      "[a](design-docs/001-a.md)\n[root](/docs/plans/designs/002-b.md)\n",
    );
    put(
      root,
      "README.md",
      "See `docs/design-docs/` and [a](docs/design-docs/001-a.md).\n",
    );
    put(root, "AGENTS.md", "Read docs/plans/designs/002-b.md.\n");
    put(root, "source.ts", 'const path = "docs/design-docs/001-a.md";\n');

    migrateArtifactLayout(root);

    expect(read(root, "docs/decisions/001-a.md")).toBe(
      [
        "[plan](002-b.md#tradeoffs)",
        "[guide](../guide.md)",
        "[picture](images/flow.svg)",
        "[ref][b]",
        "",
        '[b]: 002-b.md?view=1#section "B"',
        "`docs/decisions/002-b.md`",
        "[remote](https://example.com/docs/design-docs/001-a.md)",
      ].join("\n"),
    );
    expect(read(root, "docs/decisions/002-b.md")).toBe("[a](001-a.md)\n");
    expect(read(root, "docs/guide.md")).toBe(
      "[a](decisions/001-a.md)\n[root](/docs/decisions/002-b.md)\n",
    );
    expect(read(root, "README.md")).toContain("`docs/decisions/`");
    expect(read(root, "AGENTS.md")).toBe("Read docs/decisions/002-b.md.\n");
    expect(read(root, "source.ts")).toContain("docs/design-docs/001-a.md");
  });

  it("performs no dry-run writes, deletes, or directory creation", () => {
    const root = makeRoot();
    put(root, "docs/plans/designs/a.md", "# A\n");
    put(root, ".agents/state/memories/result-qa.md", "# QA\n");
    put(root, "README.md", "[a](docs/plans/designs/a.md)\n");
    const before = snapshot(root);

    const report = migrateArtifactLayout(root, { dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(report.moved).toHaveLength(2);
    expect(report.rewritten).toContain("README.md");
    expect(snapshot(root)).toEqual(before);
    expect(existsSync(join(root, "docs/decisions"))).toBe(false);
    expect(existsSync(join(root, ".agents/results"))).toBe(false);
  });

  it("preserves URL-encoded asset filenames and fragment/query suffixes", () => {
    const root = makeRoot();
    const links = [
      "[hash](assets/a%23b.svg#preview)",
      "[question](assets/a%3Fb.svg?download=1)",
      "[percent](assets/a%25b.svg)",
      "[space](assets/a%20b.svg)",
    ].join("\n");
    put(root, "docs/design-docs/a.md", links);
    for (const filename of ["a#b.svg", "a?b.svg", "a%b.svg", "a b.svg"])
      put(root, `docs/design-docs/assets/${filename}`, "<svg/>\n");

    migrateArtifactLayout(root);

    expect(read(root, "docs/decisions/a.md")).toBe(links);
    expect(read(root, "docs/decisions/assets/a#b.svg")).toBe("<svg/>\n");
    expect(read(root, "docs/decisions/assets/a?b.svg")).toBe("<svg/>\n");
    expect(read(root, "docs/decisions/assets/a%b.svg")).toBe("<svg/>\n");
  });

  it("rebases nested labels/images and balanced-parenthesis collision paths", () => {
    const root = makeRoot();
    put(
      root,
      "docs/plans/designs/nested.md",
      "[nested [label]](../../guide.md)\n[image ![alt](../../pic.svg)](../../guide.md)\n",
    );
    put(root, "docs/design-docs/a(v2).md", "Migrated\n");
    put(root, "docs/decisions/a(v2).md", "Existing\n");
    put(root, "docs/guide.md", "[paren](design-docs/a(v2).md)\n");
    put(root, "docs/pic.svg", "<svg/>\n");

    migrateArtifactLayout(root);

    expect(read(root, "docs/decisions/nested.md")).toBe(
      "[nested [label]](../guide.md)\n[image ![alt](../pic.svg)](../guide.md)\n",
    );
    expect(read(root, "docs/guide.md")).toBe(
      "[paren](decisions/a(v2)--from-design-docs.md)\n",
    );
    expect(read(root, "docs/decisions/a(v2).md")).toBe("Existing\n");
  });

  it("publishes rebased readonly Markdown and atomically updates readonly references", () => {
    const root = makeRoot();
    put(root, "docs/plans/designs/a.md", "[guide](../../guide.md)\n");
    put(root, "docs/guide.md", "Guide\n");
    put(root, "README.md", "[a](docs/plans/designs/a.md)\n");
    chmodSync(join(root, "docs/plans/designs/a.md"), 0o444);
    chmodSync(join(root, "README.md"), 0o444);

    const report = migrateArtifactLayout(root);

    expect(report.skipped).toEqual([]);
    expect(read(root, "docs/decisions/a.md")).toBe("[guide](../guide.md)\n");
    expect(read(root, "README.md")).toBe("[a](docs/decisions/a.md)\n");
    expect(statSync(join(root, "docs/decisions/a.md")).mode & 0o777).toBe(
      0o444,
    );
    expect(statSync(join(root, "README.md")).mode & 0o777).toBe(0o444);
    expect(migrateArtifactLayout(root).actions).toEqual([]);
  });

  it.skipIf(process.getuid?.() === 0)(
    "rolls back a failed reference update and retries without duplicate imports",
    () => {
      const root = makeRoot();
      put(root, "docs/design-docs/a.md", "A\n");
      mkdirSync(join(root, "docs/decisions"), { recursive: true });
      put(root, "README.md", "[a](docs/design-docs/a.md)\n");
      chmodSync(root, 0o555);
      let report: ReturnType<typeof migrateArtifactLayout>;
      try {
        report = migrateArtifactLayout(root);
      } finally {
        chmodSync(root, 0o755);
      }

      expect(report.moved).toEqual([]);
      expect(
        report.skipped.some(({ reason }) =>
          reason.includes("Migration deferred"),
        ),
      ).toBe(true);
      expect(read(root, "docs/design-docs/a.md")).toBe("A\n");
      expect(read(root, "README.md")).toBe("[a](docs/design-docs/a.md)\n");
      expect(existsSync(join(root, "docs/decisions/a.md"))).toBe(false);
      expect(migrateArtifactLayout(root).moved).toEqual([
        { from: "docs/design-docs/a.md", to: "docs/decisions/a.md" },
      ]);
      expect(read(root, "README.md")).toBe("[a](docs/decisions/a.md)\n");
      expect(readdirSync(join(root, "docs/decisions"))).toEqual(["a.md"]);
    },
  );

  it("repairs pre-032 Serena report aliases and Markdown coordination references", () => {
    const root = makeRoot();
    put(root, ".agents/state/memories/result-qa.md", "QA\n");
    put(root, ".agents/state/memories/task-board.md", "[QA](result-qa.md)\n");
    put(root, ".serena/memories/progress-qa.md", "[QA](result-qa.md)\n");
    put(root, "README.md", "[QA](.serena/memories/result-qa.md)\n");

    migrateArtifactLayout(root);

    expect(read(root, "README.md")).toBe(
      "[QA](.agents/results/result-qa.md)\n",
    );
    expect(read(root, ".agents/state/memories/task-board.md")).toBe(
      "[QA](../../results/result-qa.md)\n",
    );
    expect(read(root, ".serena/memories/progress-qa.md")).toBe(
      "[QA](../../.agents/results/result-qa.md)\n",
    );
  });

  it("defers receipt/claim/plan-bound files in local and actual profile state", () => {
    const root = makeRoot();
    const profile = makeRoot();
    vi.stubEnv("OMA_STATE_HOME", profile);
    put(root, ".agents/state/memories/result-bound.md", "Evidence\n");
    put(root, "docs/design-docs/bound.md", "Pinned\n");
    put(root, "docs/plans/designs/free.md", "Free\n");
    const receipt = JSON.stringify({
      artifactRoot: root,
      agentId: "docs",
      taskId: "docs",
      artifacts: { ".agents/state/memories/result-bound.md": "hash" },
      contract: { inputs: ["src"] },
    });
    put(root, ".agents/state/agent-runs/old.json", receipt);
    const plan = JSON.stringify({
      tasks: [{ artifacts: ["docs/design-docs/bound.md"] }],
    });
    const plans = runtimeStateDir(root, "agent-plans");
    mkdirSync(plans, { recursive: true });
    writeFileSync(join(plans, "pinned.json"), plan);
    put(
      root,
      "README.md",
      "[bound](docs/design-docs/bound.md)\n[free](docs/plans/designs/free.md)\n",
    );

    const report = migrateArtifactLayout(root);

    expect(report.moved).toEqual([
      { from: "docs/plans/designs/free.md", to: "docs/decisions/free.md" },
    ]);
    expect(report.skipped.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        ".agents/state/memories/result-bound.md",
        "docs/design-docs/bound.md",
      ]),
    );
    expect(read(root, ".agents/state/memories/result-bound.md")).toBe(
      "Evidence\n",
    );
    expect(read(root, "docs/design-docs/bound.md")).toBe("Pinned\n");
    expect(read(root, ".agents/state/agent-runs/old.json")).toBe(receipt);
    expect(readFileSync(join(plans, "pinned.json"), "utf8")).toBe(plan);
    expect(read(root, "README.md")).toContain("](docs/design-docs/bound.md)");
    expect(read(root, "README.md")).toContain("](docs/decisions/free.md)");
    expect(existsSync(join(root, ".agents/results/result-bound.md"))).toBe(
      false,
    );
  });

  it("defers migration if evidence cannot be inspected", () => {
    const root = makeRoot();
    put(root, "docs/design-docs/a.md", "A\n");
    put(root, ".agents/state/agent-runs/bad.json", "{bad");

    const report = migrateArtifactLayout(root);

    expect(report.moved).toEqual([]);
    expect(
      report.skipped.some(({ reason }) =>
        reason.includes("Evidence bindings could not be established"),
      ),
    ).toBe(true);
    expect(read(root, "docs/design-docs/a.md")).toBe("A\n");
  });

  it("preserves bindings owned by another numeric profile", () => {
    const root = makeRoot();
    const profile = makeRoot();
    vi.stubEnv("OMA_STATE_HOME", profile);
    vi.stubEnv("OMA_PROFILE", "0");
    put(root, ".agents/state/memories/result-other.md", "Shared evidence\n");
    const runs = join(
      profile,
      "u/7/projects",
      projectIdentity(root).projectId,
      "agent-runs",
    );
    mkdirSync(runs, { recursive: true });
    const claim = JSON.stringify({
      artifacts: [".agents/state/memories/result-other.md"],
    });
    writeFileSync(join(runs, "run.claim.json"), claim);

    const report = migrateArtifactLayout(root);

    expect(report.moved).toEqual([]);
    expect(report.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ".agents/state/memories/result-other.md",
        }),
      ]),
    );
    expect(read(root, ".agents/state/memories/result-other.md")).toBe(
      "Shared evidence\n",
    );
    expect(readFileSync(join(runs, "run.claim.json"), "utf8")).toBe(claim);
    expect(process.env.OMA_PROFILE).toBe("0");
  });

  it("honors ignored legacy examples and leaves absent source conventions alone", () => {
    const root = makeRoot();
    const examples = [
      "<!-- oma-docs:ignore-start -->",
      "Old source: `docs/design-docs/a.md` and [source](../design-docs/a.md).",
      "<!-- oma-docs:ignore-end -->",
    ].join("\n");
    put(root, "docs/design-docs/a.md", "A\n");
    put(
      root,
      "docs/guide/migration.md",
      `${examples}\n[active](../design-docs/a.md)\n`,
    );
    put(
      root,
      "README.md",
      "Absent `docs/plans/designs/example.md`. [local](./README.md)\n",
    );

    migrateArtifactLayout(root);

    expect(read(root, "docs/guide/migration.md")).toBe(
      `${examples}\n[active](../decisions/a.md)\n`,
    );
    expect(read(root, "README.md")).toBe(
      "Absent `docs/plans/designs/example.md`. [local](./README.md)\n",
    );
    expect(migrateArtifactLayout(root).actions).toEqual([]);
  });

  it("keeps sources and valid references when a destination parent is blocked", () => {
    const root = makeRoot();
    put(root, "docs/design-docs/sub/a.md", "A\n");
    put(root, "docs/plans/designs/b.md", "[a](../../design-docs/sub/a.md)\n");
    put(root, "docs/decisions/sub", "User file occupies the directory\n");
    put(
      root,
      "README.md",
      "[a](docs/design-docs/sub/a.md)\n[b](docs/plans/designs/b.md)\n",
    );

    const report = migrateArtifactLayout(root);

    expect(report.moved).toEqual([
      { from: "docs/plans/designs/b.md", to: "docs/decisions/b.md" },
    ]);
    expect(
      report.skipped.some(({ path }) => path === "docs/design-docs/sub/a.md"),
    ).toBe(true);
    expect(read(root, "docs/design-docs/sub/a.md")).toBe("A\n");
    expect(read(root, "docs/decisions/sub")).toBe(
      "User file occupies the directory\n",
    );
    expect(read(root, "docs/decisions/b.md")).toBe(
      "[a](../design-docs/sub/a.md)\n",
    );
    expect(read(root, "README.md")).toBe(
      "[a](docs/design-docs/sub/a.md)\n[b](docs/decisions/b.md)\n",
    );
  });

  it("rejects symlink sources, linked parents, destinations and reference files", () => {
    const root = makeRoot();
    const external = makeRoot();
    put(external, "outside.md", "External docs/design-docs/a.md\n");
    put(root, "docs/design-docs/a.md", "[outside](../../../../outside.md)\n");
    symlinkSync(
      join(external, "outside.md"),
      join(root, "docs/design-docs/link.md"),
    );
    symlinkSync(external, join(root, "docs/decisions"));
    symlinkSync(join(external, "outside.md"), join(root, "README.md"));
    mkdirSync(join(root, ".agents"), { recursive: true });
    symlinkSync(external, join(root, ".agents/state"));

    const report = migrateArtifactLayout(root);

    expect(report.moved).toEqual([]);
    expect(
      report.skipped.some(({ reason }) =>
        reason.toLowerCase().includes("symlink"),
      ),
    ).toBe(true);
    expect(read(external, "outside.md")).toBe(
      "External docs/design-docs/a.md\n",
    );
    expect(read(root, "docs/design-docs/a.md")).toBe(
      "[outside](../../../../outside.md)\n",
    );
    expect(existsSync(join(external, "a.md"))).toBe(false);
  });
});
