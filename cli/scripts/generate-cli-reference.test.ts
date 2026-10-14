import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectRows,
  END_MARKER,
  escapeProse,
  findTargets,
  formatArguments,
  generateCliReference,
  renderRegistry,
  replaceMarkedBlock,
  START_MARKER,
} from "./generate-cli-reference.mjs";

// A trimmed `oma describe` tree: one bare group, one group that runs on its
// own (options + children), leaves with arguments, defaults, and pipes.
const fixture = {
  name: "oh-my-agent",
  command: {
    name: "oh-my-agent",
    path: "",
    description: "root",
    arguments: [],
    options: [{ flags: "-y, --yes", description: "Skip prompts" }],
    subcommands: [
      {
        name: "state",
        path: "state",
        description: "",
        arguments: [],
        options: [],
        subcommands: [
          {
            name: "emit",
            path: "state emit",
            description: "Append an event for <kind>",
            arguments: [
              { name: "kind", required: true, variadic: false },
              { name: "payload", required: false, variadic: false },
            ],
            options: [
              {
                flags: "--category <category>",
                description: "Category",
                defaultValue: "main",
              },
              { flags: "--json", description: "JSON" },
            ],
            subcommands: [],
          },
        ],
      },
      {
        name: "home",
        path: "home",
        description: "Inspect storage",
        arguments: [],
        options: [{ flags: "--json", description: "JSON" }],
        subcommands: [
          {
            name: "migrate",
            path: "home migrate",
            description: "Copy legacy files",
            arguments: [],
            options: [
              {
                flags: "-w, --workspace <path>",
                description: "Workspace",
                defaultValue: "/repo/cli",
              },
              {
                flags: "-r, --reference <path>",
                description: "Refs",
                defaultValue: [],
              },
            ],
            subcommands: [],
          },
        ],
      },
      {
        name: "code",
        path: "agent code",
        description: "Run tools (doctor | guide)",
        arguments: [{ name: "paths", required: false, variadic: true }],
        options: [
          {
            flags: "--host <github|gitlab>",
            description: "Host",
            defaultValue: "github",
          },
        ],
        subcommands: [],
      },
    ],
  },
};

describe("generate-cli-reference rendering", () => {
  it("lists runnable paths only, sorted, and skips bare groups and the root", () => {
    const paths = collectRows(fixture).map((row) => row.path);
    expect(paths).toEqual(["agent code", "home", "home migrate", "state emit"]);
  });

  it("spells required, optional, and variadic arguments", () => {
    expect(
      formatArguments([
        { name: "kind", required: true, variadic: false },
        { name: "payload", required: false, variadic: false },
      ]),
    ).toBe("`<kind> [payload]`");
    expect(
      formatArguments([{ name: "paths", required: false, variadic: true }]),
    ).toBe("`[paths...]`");
    expect(formatArguments([])).toBe("—");
  });

  it("escapes pipes and angle brackets outside code spans", () => {
    expect(escapeProse("Run a | b for <name> and `x | <y>`")).toBe(
      "Run a \\| b for &lt;name&gt; and `x \\| <y>`",
    );
  });

  it("renders a table with defaults and machine-neutral path defaults", () => {
    const table = renderRegistry(fixture, { cwd: "/repo/cli" });
    expect(table.split("\n")).toEqual([
      "| Command | Arguments | Options | Description |",
      "|:--|:--|:--|:--|",
      "| `agent code` | `[paths...]` | `--host <github\\|gitlab>` (default: `github`) | Run tools (doctor \\| guide) |",
      "| `home` | — | `--json` | Inspect storage |",
      "| `home migrate` | — | `-w, --workspace <path>` (default: current directory), `-r, --reference <path>` | Copy legacy files |",
      "| `state emit` | `<kind> [payload]` | `--category <category>` (default: `main`), `--json` | Append an event for &lt;kind&gt; |",
    ]);
  });

  it("drops absolute-path defaults that are not the describe cwd", () => {
    const table = renderRegistry(fixture, { cwd: "/elsewhere" });
    expect(table).toContain(
      "| `home migrate` | — | `-w, --workspace <path>`, ",
    );
  });
});

describe("generate-cli-reference block replacement", () => {
  it("replaces only the text between the markers", () => {
    const doc = [
      "# Title",
      "Intro",
      START_MARKER,
      "old row",
      END_MARKER,
      "Outro",
    ].join("\n");
    expect(replaceMarkedBlock(doc, "| new |")).toBe(
      [
        "# Title",
        "Intro",
        START_MARKER,
        "",
        "| new |",
        "",
        END_MARKER,
        "Outro",
      ].join("\n"),
    );
  });

  it("returns null when a marker is missing or out of order", () => {
    expect(replaceMarkedBlock(`a\n${START_MARKER}\nb`, "x")).toBeNull();
    expect(
      replaceMarkedBlock(`${END_MARKER}\nb\n${START_MARKER}`, "x"),
    ).toBeNull();
  });
});

describe("generate-cli-reference targets and --check", () => {
  let root: string;
  let english: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-cli-ref-"));
    const docsDir = join(root, "web/docs/cli-interfaces");
    mkdirSync(docsDir, { recursive: true });
    english = join(docsDir, "options.md");
    writeFileSync(
      english,
      `# Options\n${START_MARKER}\nstale\n${END_MARKER}\n`,
    );
    for (const [locale, marked] of [
      ["ko", true],
      ["ja", false],
    ] as const) {
      const dir = join(
        root,
        "web/i18n",
        locale,
        "docusaurus-plugin-content-docs/current/cli-interfaces",
      );
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "options.md"),
        marked ? `# 옵션\n${START_MARKER}\n${END_MARKER}\n` : "# No markers\n",
      );
    }
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("targets the English page plus locale copies that carry both markers", () => {
    const targets = findTargets(root).map((file) => file.slice(root.length));
    expect(targets).toEqual([
      "/web/docs/cli-interfaces/options.md",
      "/web/i18n/ko/docusaurus-plugin-content-docs/current/cli-interfaces/options.md",
    ]);
  });

  it("reports stale blocks in check mode without writing", () => {
    const targets = findTargets(root);
    const changed = generateCliReference({
      describe: fixture,
      targets,
      check: true,
    });
    expect(changed).toEqual(targets);
    expect(readFileSync(english, "utf8")).toContain("stale");
  });

  it("writes the blocks, after which check mode reports nothing", () => {
    const targets = findTargets(root);
    generateCliReference({ describe: fixture, targets });
    expect(readFileSync(english, "utf8")).not.toContain("stale");
    expect(readFileSync(english, "utf8")).toContain("| `state emit` |");
    expect(
      generateCliReference({ describe: fixture, targets, check: true }),
    ).toEqual([]);
  });

  it("fails when a target has lost its markers", () => {
    writeFileSync(english, "# Options\n");
    expect(() =>
      generateCliReference({ describe: fixture, targets: [english] }),
    ).toThrow(/missing/);
  });
});
