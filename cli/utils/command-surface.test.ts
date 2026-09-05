import { Command } from "commander";
import { describe, expect, it, vi } from "vitest";
import { createCommandSurface } from "./command-surface.js";

function fixture() {
  const program = new Command("oma")
    .option("-g, --global")
    .option("-y, --yes")
    .exitOverride();
  const calls: unknown[][] = [];
  const action = (...args: unknown[]) => {
    calls.push(args);
  };
  program
    .command("schedule:add <agent> <prompt>")
    .option("-m, --model <vendor>")
    .option("--every <phrase>")
    .option("--max-age-days <n>")
    .action(action);
  program
    .command("schedule:list")
    .option("--json")
    .option("--output <format>")
    .action(action);
  program
    .command("agent:spawn <agent> <prompt> <session>")
    .option("--root <path>")
    .option("-m, --model <vendor>")
    .action(action);
  program
    .command("agent:verify <id> [command...]")
    .option("--root <path>")
    .option("--required")
    .action(action);
  program.command("model:probe <slug>").option("--timeout <ms>").action(action);
  program
    .command("memory:maintain <action>")
    .option("--dry-run")
    .action(action);
  program
    .command("state [sid]")
    .option("--activate <id>")
    .option("--archive")
    .option("--purge")
    .option("--dry-run")
    .action(action);
  program.command("state:get <sid>").action(action);
  program
    .command("state:inject-log <sid>")
    .option("--entry <file>")
    .option("--json")
    .action(action);
  const search = program.command("search").alias("s");
  search.command("api <url>").action(action);
  search
    .command("api:search <query>")
    .option("--timeout <seconds>")
    .action(action);
  const image = program.command("image").alias("img");
  image
    .command("generate <prompt...>")
    .option("--model <name>")
    .option("--format <format>")
    .option("--out <dir>")
    .option("--timeout <seconds>")
    .action(action);
  return { program, calls, surface: createCommandSurface(program) };
}

describe("canonical command surface", () => {
  it("rejects removed command paths and option spellings", () => {
    const { surface } = fixture();
    for (const argv of [
      ["schedule:list"],
      ["agent:spawn", "qa", "p", "sid"],
      ["img", "generate", "p"],
      ["state", "sid"],
      ["search", "api", "https://example.test"],
      ["schedule", "create", "qa", "p", "--model", "codex"],
      ["schedule", "create", "qa", "p", "-mcodex"],
      ["schedule", "create", "qa", "p", "--max-age-days", "2"],
      ["agent", "spawn", "qa", "p", "sid", "--root", "/tmp"],
      ["state", "list", "--archive"],
      ["image", "generate", "p", "--out", "/tmp"],
    ])
      expect(() => surface.normalize(argv), argv.join(" ")).toThrow();
  });
  it("dispatches the canonical spelling to the handler exactly once", async () => {
    for (const argv of [
      [
        "schedule",
        "create",
        "qa",
        "check: api",
        "--vendor",
        "codex",
        "--every",
        "5m",
        "--expires-after",
        "2d",
      ],
    ]) {
      const { program, calls, surface } = fixture();
      const hook = vi.fn();
      program.hook("preAction", hook);
      await program.parseAsync(surface.normalize(argv), { from: "user" });
      expect(calls).toHaveLength(1);
      expect(hook).toHaveBeenCalledOnce();
      expect(calls[0]?.slice(0, 3)).toEqual([
        "qa",
        "check: api",
        { model: "codex", every: "5m", maxAgeDays: "2" },
      ]);
    }
  });

  it("preserves leading globals, equals options, Unicode and prompt tokens", () => {
    const { surface } = fixture();
    expect(
      surface.normalize([
        "-g",
        "--yes",
        "agent",
        "spawn",
        "qa",
        "schedule:list --model x 한글",
        "sid",
        "--project-root=C:\\my repo",
        "--vendor=codex",
      ]),
    ).toEqual([
      "-g",
      "--yes",
      "agent:spawn",
      "qa",
      "schedule:list --model x 한글",
      "sid",
      "--root=C:\\my repo",
      "--model=codex",
    ]);
  });

  it("does not interpret an option value as another option or help", () => {
    const { surface } = fixture();
    expect(
      surface.normalize([
        "agent",
        "spawn",
        "qa",
        "prompt",
        "sid",
        "--project-root",
        "--vendor",
      ]),
    ).toEqual(["agent:spawn", "qa", "prompt", "sid", "--root", "--vendor"]);
    expect(
      surface.showHelp([
        "agent",
        "spawn",
        "qa",
        "prompt",
        "sid",
        "--root",
        "--help",
      ]),
    ).toBe(false);
  });

  it("leaves passthrough argv untouched after -- or the child executable", () => {
    const { surface } = fixture();
    expect(
      surface.normalize([
        "agent",
        "verify",
        "run1",
        "--",
        "node",
        "--project-root",
        "foo:bar",
      ]),
    ).toEqual([
      "agent:verify",
      "run1",
      "--",
      "node",
      "--project-root",
      "foo:bar",
    ]);
    expect(
      surface.normalize([
        "agent",
        "verify",
        "run1",
        "node",
        "--project-root",
        "foo",
      ]),
    ).toEqual(["agent:verify", "run1", "node", "--project-root", "foo"]);
  });

  it("converts explicit durations to handler units", () => {
    const { surface } = fixture();
    expect(
      surface.normalize(["model", "probe", "m", "--timeout", "30s"]),
    ).toEqual(["model:probe", "m", "--timeout", "30000"]);
    expect(() =>
      surface.normalize(["model", "probe", "m", "--timeout", "30"]),
    ).toThrow("unit");
    expect(() =>
      surface.normalize([
        "schedule",
        "create",
        "qa",
        "p",
        "--expires-after",
        "1h",
      ]),
    ).toThrow("whole number");
  });

  it("keeps model selection distinct from vendor selection and alias names", () => {
    const { surface } = fixture();
    expect(
      surface.normalize([
        "image",
        "generate",
        "p",
        "--model",
        "gpt-image-2",
        "--output",
        "json",
        "--output-dir",
        "/tmp/out",
        "--timeout",
        "2m",
      ]),
    ).toEqual([
      "image",
      "generate",
      "p",
      "--model",
      "gpt-image-2",
      "--format",
      "json",
      "--out",
      "/tmp/out",
      "--timeout",
      "120",
    ]);
  });

  it("resolves conflicting parent actions and explicit state operations", () => {
    const { surface } = fixture();
    expect(surface.normalize(["search", "api", "search", "q"])).toEqual([
      "search",
      "api:search",
      "q",
    ]);
    expect(
      surface.normalize(["search", "api", "fetch", "https://example.test"]),
    ).toEqual(["search", "api", "https://example.test"]);
    expect(surface.normalize(["state", "get", "repair"])).toEqual([
      "state:get",
      "repair",
    ]);

    expect(surface.normalize(["state", "activate", "s1"])).toEqual([
      "state",
      "--activate",
      "s1",
    ]);
    expect(surface.normalize(["state", "activate", "--dry-run", "s1"])).toEqual(
      ["state", "--activate", "s1", "--dry-run"],
    );
    expect(() => surface.normalize(["state", "activate"])).toThrow(
      "session-id",
    );
    expect(surface.normalize(["state", "archive", "--dry-run"])).toEqual([
      "state",
      "--archive",
      "--dry-run",
    ]);
    expect(
      surface.normalize(["memory", "maintain", "backup", "--dry-run"]),
    ).toEqual(["memory:maintain", "backup", "--dry-run"]);
    expect(
      surface.normalize([
        "state",
        "inject-log",
        "get",
        "s1",
        "entry.json",
        "--json",
      ]),
    ).toEqual(["state:inject-log", "--entry", "entry.json", "s1", "--json"]);
  });

  it("rejects contradictory output choices", () => {
    const { surface } = fixture();
    expect(() =>
      surface.normalize(["schedule", "list", "--json", "--output", "text"]),
    ).toThrow("conflicts");
  });

  it("exposes nested help without invoking an action", () => {
    const { surface, calls } = fixture();
    const output: string[] = [];
    surface.help.configureOutput({ writeOut: (s) => output.push(s) });
    // output settings were inherited at construction, so inspect generated help directly.
    const schedule = surface.help.commands.find((c) => c.name() === "schedule");
    expect(schedule?.helpInformation()).toContain("create");
    expect(schedule?.helpInformation()).toContain("list");
    expect(
      schedule?.commands.find((c) => c.name() === "create")?.helpInformation(),
    ).toContain("--vendor");
    expect(surface.describePath("schedule create")).toBe("schedule create");
    expect(calls).toEqual([]);
    expect(surface.showHelp([])).toBe(false);
    expect(surface.showHelp(["--global"])).toBe(false);
    expect(surface.showHelp(["--version"])).toBe(false);
    expect(
      surface.showHelp([
        "agent",
        "spawn",
        "qa",
        "p",
        "sid",
        "--project-root",
        "--help",
      ]),
    ).toBe(false);
  });
});
