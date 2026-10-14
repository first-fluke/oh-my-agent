import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectSkills,
  END_MARKER,
  renderCatalog,
  replaceGeneratedBlock,
  START_MARKER,
  syncSkillCatalog,
} from "./generate-skill-catalog.mjs";

const SOURCE_DOC = "web/docs/core-concepts/agents.md";
const localeDoc = (locale: string) =>
  `web/i18n/${locale}/docusaurus-plugin-content-docs/current/core-concepts/agents.md`;

let root: string;

function write(relPath: string, content: string) {
  const path = join(root, relPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function read(relPath: string) {
  return readFileSync(join(root, relPath), "utf-8");
}

function page(body = "stale") {
  return `# Agents\n\nIntro.\n\n${START_MARKER}\n${body}\n${END_MARKER}\n\n## After\n`;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "skill-catalog-"));
  write(
    ".agents/skills/oma-zeta/SKILL.md",
    '---\nname: oma-zeta\ndescription: "Zeta work. Use for z | pipes."\n---\n\n# Zeta\n',
  );
  write(
    ".agents/skills/oma-alpha/SKILL.md",
    "---\nname: oma-alpha\ndescription: >\n  Alpha work across\n  two folded lines.\n---\n\n# Alpha\n",
  );
  write(".agents/skills/_shared/core/SKILL.md", "---\nname: shared\n---\n");
  write(".agents/skills/oma-empty/resources/notes.md", "no SKILL.md here\n");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("collectSkills", () => {
  it("reads frontmatter, skips _shared and dirs without SKILL.md, sorts by name", () => {
    expect(collectSkills(join(root, ".agents/skills"))).toEqual([
      {
        dir: "oma-alpha",
        name: "oma-alpha",
        description: "Alpha work across two folded lines.",
      },
      {
        dir: "oma-zeta",
        name: "oma-zeta",
        description: "Zeta work. Use for z | pipes.",
      },
    ]);
  });
});

describe("renderCatalog", () => {
  it("renders one linked row per skill with escaped, single-line cells", () => {
    const table = renderCatalog(collectSkills(join(root, ".agents/skills")));
    expect(table).toContain("| Skill | Use it for |");
    expect(table).toContain(
      "| [`oma-alpha`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-alpha/SKILL.md) | Alpha work across two folded lines. |",
    );
    expect(table).toContain("| Zeta work. Use for z \\| pipes. |");
    expect(table).not.toContain("oma-empty");
    expect(table).not.toContain("shared");
  });
});

describe("replaceGeneratedBlock", () => {
  it("replaces only the marked block and is idempotent", () => {
    const once = replaceGeneratedBlock(page(), "NEW");
    expect(once).toBe(
      `# Agents\n\nIntro.\n\n${START_MARKER}\nNEW\n${END_MARKER}\n\n## After\n`,
    );
    expect(replaceGeneratedBlock(once ?? "", "NEW")).toBe(once);
  });

  it("returns null when a marker is missing or the markers are reversed", () => {
    expect(replaceGeneratedBlock("# No markers\n", "NEW")).toBeNull();
    expect(
      replaceGeneratedBlock(`${END_MARKER}\nx\n${START_MARKER}\n`, "NEW"),
    ).toBeNull();
  });
});

describe("syncSkillCatalog", () => {
  it("updates the source page and marked locale copies, skipping unmarked ones", () => {
    write(SOURCE_DOC, page());
    write(localeDoc("ko"), page("old ko"));
    write(localeDoc("ja"), "# エージェント\n\nNo markers yet.\n");

    const result = syncSkillCatalog({ repoRoot: root });

    expect(result.skills).toBe(2);
    expect(result.missing).toEqual([]);
    expect(result.updated).toEqual([SOURCE_DOC, localeDoc("ko")]);
    expect(read(SOURCE_DOC)).toContain("`oma-zeta`");
    expect(read(SOURCE_DOC)).toContain("## After");
    expect(read(localeDoc("ko"))).not.toContain("old ko");
    expect(read(localeDoc("ja"))).toBe("# エージェント\n\nNo markers yet.\n");
  });

  it("reports drift in check mode without writing, then passes once synced", () => {
    write(SOURCE_DOC, page());

    const drift = syncSkillCatalog({ repoRoot: root, check: true });
    expect(drift.drifted).toEqual([SOURCE_DOC]);
    expect(read(SOURCE_DOC)).toBe(page());

    syncSkillCatalog({ repoRoot: root });
    const clean = syncSkillCatalog({ repoRoot: root, check: true });
    expect(clean.drifted).toEqual([]);
    expect(clean.updated).toEqual([]);
  });

  it("reports a source page without markers as missing", () => {
    write(SOURCE_DOC, "# Agents\n");
    const result = syncSkillCatalog({ repoRoot: root });
    expect(result.missing).toEqual([SOURCE_DOC]);
    expect(read(SOURCE_DOC)).toBe("# Agents\n");
  });
});
