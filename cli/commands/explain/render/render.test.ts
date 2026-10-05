import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateHtmlContent } from "../validate.js";
import { inferComponentType, toArchifySpec } from "./archify.js";
import {
  artifactSlug,
  runExplainLint,
  runExplainPatch,
  runExplainRender,
} from "./command.js";
import { COMPONENTS } from "./components/index.js";
import { DraftError, parseDraft } from "./draft.js";
import { layoutLayered } from "./layered.js";
import { lintDraft, splitSentences } from "./lint.js";
import { renderInline, renderMarkdown } from "./markdown.js";
import { planRows } from "./page-script.js";
import {
  contentSpan,
  extractDraftSource,
  fillRows,
  isRenderedPage,
  patchDraft,
  readPageSettings,
  renderDraft,
} from "./render.js";
import { detectLanguage, measure, wrapText } from "./text.js";
import { themeCss } from "./theme.js";

const draft = (body: string, meta = "title: Sample") =>
  `---\n${meta}\n---\n\n${body}\n`;

function failure(source: string): DraftError {
  try {
    renderDraft(source);
  } catch (error) {
    if (error instanceof DraftError) return error;
    throw error;
  }
  throw new Error("expected the draft to be rejected");
}

describe("parseDraft", () => {
  it("reads frontmatter, the lead, and one panel per heading", () => {
    const parsed = parseDraft(
      draft(
        'Lead text.\n\n## First {span=2 note="n" archify}\n\nBody.\n\n```flow LR\nA -> B\n```\n\n## Second\n\nMore.',
        "title: T\nsubtitle: S\ncols: 2\nowner: me",
      ),
    );
    expect(parsed.meta).toMatchObject({ title: "T", subtitle: "S", cols: 2 });
    expect(parsed.meta.extras).toEqual([["owner", "me"]]);
    expect(parsed.lead).toHaveLength(1);
    expect(parsed.panels.map((panel) => panel.id)).toEqual(["A", "B"]);
    expect(parsed.panels[0]).toMatchObject({
      title: "First",
      span: 2,
      note: "n",
      archify: true,
    });
    expect(parsed.panels[0]?.blocks[1]).toMatchObject({
      type: "component",
      name: "flow",
      args: "LR",
      line: 14,
    });
  });

  it("rejects a draft without a title or without panels", () => {
    expect(() => parseDraft("## Panel\n\ntext")).toThrow(/needs a title/);
    expect(() => parseDraft(draft("only a lead"))).toThrow(/no panels/);
  });

  it("reports the line of an unclosed fence", () => {
    const error = failure(draft("## P\n\n```flow\nA -> B"));
    expect(error.message).toMatch(/never closed/);
    expect(error.line).toBe(7);
  });
});

describe("layoutLayered", () => {
  const box = (id: string) => ({ id, width: 80, height: 40 });

  it("keeps nodes of one rank apart and ranks in edge order", () => {
    const layout = layoutLayered(["a", "b", "c", "d"].map(box), [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
      { from: "b", to: "d" },
      { from: "c", to: "d" },
    ]);
    const at = (id: string) => layout.nodes.get(id) as { x: number; y: number };
    expect(at("a").y).toBeLessThan(at("b").y);
    expect(at("b").y).toBe(at("c").y);
    expect(at("b").y).toBeLessThan(at("d").y);
    expect(Math.abs(at("b").x - at("c").x)).toBeGreaterThanOrEqual(80 + 28);
    for (const node of layout.nodes.values()) {
      expect(node.x - node.width / 2).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width / 2).toBeLessThanOrEqual(layout.width + 0.01);
    }
  });

  it("lays out a cycle and draws the closing edge in its real direction", () => {
    const layout = layoutLayered(["a", "b", "c"].map(box), [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "a" },
    ]);
    const back = layout.edges[2];
    const c = layout.nodes.get("c") as { y: number };
    const a = layout.nodes.get("a") as { y: number };
    expect(back?.points[0]?.[1]).toBeGreaterThan(back?.points.at(-1)?.[1] ?? 0);
    expect(c.y).toBeGreaterThan(a.y);
  });

  it("reserves a rank for an edge label, clear of both nodes", () => {
    const layout = layoutLayered(
      ["a", "b"].map(box),
      [{ from: "a", to: "b", label: { width: 60, height: 20 } }],
      { direction: "LR" },
    );
    const a = layout.nodes.get("a") as { x: number; width: number };
    const b = layout.nodes.get("b") as { x: number; width: number };
    const label = layout.edges[0]?.label as [number, number];
    expect(label[0] - 30).toBeGreaterThanOrEqual(a.x + a.width / 2);
    expect(label[0] + 30).toBeLessThanOrEqual(b.x - b.width / 2);
  });
});

describe("text", () => {
  it("measures CJK glyphs as full width and wraps without overflow", () => {
    expect(measure("가나다", 10)).toBe(30);
    for (const line of wrapText(
      "cli/commands/explain/render/components/sequence.ts",
      120,
    )) {
      expect(measure(line)).toBeLessThanOrEqual(120);
    }
    expect(
      wrapText("한국어는 글자 사이에서 줄을 바꿀 수 있다", 60).length,
    ).toBeGreaterThan(1);
  });

  it("tells Korean from Chinese and Japanese", () => {
    expect(detectLanguage("렌더러가 HTML 파일을 만든다")).toBe("ko");
    expect(detectLanguage("渲染器生成一个文件")).toBe("zh");
    expect(detectLanguage("レンダラーがファイルを作る")).toBe("ja");
    expect(detectLanguage("The renderer writes one file")).toBe("en");
  });
});

describe("renderDraft", () => {
  it("renders every component into one self-contained page", () => {
    const blocks = COMPONENTS.map(
      (component, index) => `## Panel ${index}\n\n${component.example}`,
    ).join("\n\n");
    const { html, diagrams } = renderDraft(draft(blocks));
    expect(isRenderedPage(html)).toBe(true);
    expect(html).not.toMatch(/(?:src|href)="https?:/);
    expect(html).toContain("default-src 'none'");
    expect(diagrams.map((diagram) => diagram.model.kind)).toEqual([
      "flow",
      "sequence",
    ]);
    const check = validateHtmlContent("2026-01-01-sample.html", html);
    expect(check.issues).toEqual([]);
  });

  it("shows draft markup as text instead of running it", () => {
    const { html } = renderDraft(
      draft(
        "## <img src=x onerror=alert(1)>\n\nUse `<sid>` and <script>alert(1)</script>.\n\n```tree\n<root>/\n  <sid>.jsonl\n```",
      ),
    );
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>alert(1)");
    expect(html).toContain("&lt;sid&gt;.jsonl");
  });

  it("treats an unknown fence as code and a near miss as a mistake", () => {
    const { html } = renderDraft(
      draft(
        "## P\n\n```ts\nconst a = 1 < 2;\n```\n\n```diff\n+added\n-removed\n```",
      ),
    );
    expect(html).toContain("const a = 1 &lt; 2;");
    expect(html).toContain('<span class="oe-code-add">+added</span>');
    const error = failure(draft("## P\n\n```flwo\nA -> B\n```"));
    expect(error.message).toMatch(/did you mean "flow"/);
    expect(error.line).toBe(7);
  });

  it("points a component error at its line and shows the syntax", () => {
    const error = failure(
      draft("## P\n\n```sequence\nA -> B: ok\nthis is not a message\n```"),
    );
    expect(error.line).toBe(9);
    expect(error.message).toMatch(/Syntax of "sequence"/);
    expect(error.message).toMatch(/Example:/);
  });

  it("uses the draft's language for the page and its controls", () => {
    const korean = renderDraft(
      draft("## 개요\n\n렌더러가 파일을 만든다.", "title: 설명"),
    );
    expect(korean.lang).toBe("ko");
    expect(korean.html).toContain('<html lang="ko"');
    expect(korean.html).toContain("인쇄");
    expect(renderDraft(draft("## P\n\ntext"), { lang: "ja" }).html).toContain(
      "印刷",
    );
  });

  it("rejects an unknown theme, mode, or style", () => {
    expect(() => renderDraft(draft("## P\n\nx"), { theme: "neon" })).toThrow(
      /theme must be one of blueprint, card/,
    );
    expect(() =>
      renderDraft(draft("## P\n\nx", "title: T\nstyle: loud")),
    ).toThrow(/style must be one of/);
  });

  it("links the sidecar from the panel that owns the diagram", () => {
    const source = draft(
      "## One\n\n```flow\nA -> B\n```\n\n## Two {archify}\n\n```sequence\nA -> B: hi\n```",
    );
    const { html } = renderDraft(source, { sidecarHref: "./x.archify.html" });
    const second = html.slice(html.indexOf('id="panel-b"'));
    expect(second).toContain('class="oe-archify" href="./x.archify.html"');
    expect(html.slice(0, html.indexOf('id="panel-b"'))).not.toContain(
      'oe-archify"',
    );
  });

  it("keeps the draft in the page, even one that contains </script>", () => {
    const source = draft(
      "## P\n\nA closing `</script>` tag and a   separator.",
    );
    const { html } = renderDraft(source);
    expect(html.match(/<\/script>/g)).toHaveLength(3);
    expect(extractDraftSource(html)).toBe(source);
    expect(extractDraftSource("<html></html>")).toBeUndefined();
  });
});

describe("components", () => {
  const render = (block: string) => {
    const result = renderDraft(draft(`## P\n\n${block}`));
    // The stylesheet names every class; assertions are about the markup.
    return {
      ...result,
      html: result.html.slice(result.html.indexOf("</style>")),
    };
  };

  it("flow: chains, fan-out, shapes, labels, and groups become one graph", () => {
    const { html, diagrams } = render(
      "```flow LR\n(Start) -> Parse -> A & B: split\nA --> [(Store)]*\ndb = [(Orders DB)]\nB -> db\ngroup Core: Parse, A\n```",
    );
    const model = diagrams[0]?.model;
    if (model?.kind !== "flow") throw new Error("expected a flow model");
    expect(model.direction).toBe("LR");
    expect(model.nodes.map((node) => [node.label, node.shape])).toEqual([
      ["Start", "pill"],
      ["Parse", "box"],
      ["A", "box"],
      ["B", "box"],
      ["Store", "cylinder"],
      ["Orders DB", "cylinder"],
    ]);
    expect(model.edges).toHaveLength(5);
    expect(model.edges.filter((edge) => edge.label === "split")).toHaveLength(
      2,
    );
    expect(model.edges[3]).toMatchObject({ dashed: true });
    expect(new Set(model.nodes.map((node) => node.id)).size).toBe(6);
    expect(html).toContain("oe-group");
    expect(html).toContain("oe-node-em");
  });

  it("flow: a group may only name nodes that exist", () => {
    const error = failure(
      draft("## P\n\n```flow\nA -> B\ngroup G: A, Missing\n```"),
    );
    expect(error.message).toMatch(/does not exist: Missing/);
    expect(error.line).toBe(9);
  });

  it("sequence: participants in order of first use, aliases, self messages", () => {
    const { diagrams } = render(
      "```sequence\ndb = Orders database\nUser -> API: place order\nAPI -> db: insert\nAPI -> API: validate\ndb --> API: row\nnote API: done\n```",
    );
    const model = diagrams[0]?.model;
    if (model?.kind !== "sequence")
      throw new Error("expected a sequence model");
    expect(model.participants.map((p) => p.label)).toEqual([
      "User",
      "API",
      "Orders database",
    ]);
    expect(model.messages).toHaveLength(4);
    expect(model.messages[3]).toMatchObject({ label: "row", dashed: true });
  });

  it("limits: marks a value above its limit", () => {
    const { html } = render("```limits\nA | 4 / 3 | words\nB | max 20\n```");
    expect(html.match(/class="oe-limit oe-limit-over"/g)).toHaveLength(1);
    expect(failure(draft("## P\n\n```limits\nA | many\n```")).message).toMatch(
      /label \| value \/ limit/,
    );
  });

  it("quiz: needs exactly one correct option per question", () => {
    const { html } = render(
      "```quiz\n? Q\n- a\n  > a is <wrong>\n+ b\n  > b is right\n= always\n```",
    );
    expect(html.match(/ data-correct /g)).toHaveLength(1);
    expect(html).toContain('data-feedback="a is &amp;lt;wrong&amp;gt; always"');
    expect(html).toContain('data-correct data-feedback="b is right always"');
    expect(
      failure(draft("## P\n\n```quiz\n? Q\n- a\n- b\n```")).message,
    ).toMatch(/one marked with \+/);
    expect(
      failure(draft("## P\n\n```quiz\n? Q\n+ a\n+ b\n```")).message,
    ).toMatch(/two \+ options/);
  });

  it("annot: stacks notes that would overlap", () => {
    const { html } = render(
      "```annot\n[a]{a long note about a} [b]{another long note} c\n```",
    );
    expect(html).toContain("--row:0");
    expect(html).toContain("--row:1");
    expect(html).toContain("--rows:2");
  });

  it("markdown tables turn ok / no / warn cells into badges", () => {
    const { html } = render(
      "| A | B |\n| --- | --- |\n| x | ok fine |\n| y | no |",
    );
    expect(html).toContain("oe-status-ok");
    expect(html).toContain("oe-status-no");
  });
});

describe("lintDraft", () => {
  const rules = (body: string, lang: "ko" | "en") =>
    lintDraft(parseDraft(draft(`## P\n\n${body}`)), lang).map((w) => w.rule);

  it("flags long English sentences, passives, and inflated words", () => {
    const found = rules(
      "In order to utilize the cache, the value is written by the worker.\n\n" +
        `${Array.from({ length: 30 }, (_value, index) => `word${index}`).join(" ")}.`,
      "en",
    );
    expect(found).toEqual(
      expect.arrayContaining(["word", "passive", "sentence-length"]),
    );
  });

  it("flags Korean translationese and double passives, not plain prose", () => {
    expect(
      rules("렌더러가 초안을 읽고 파일을 만든다. 배치는 자동이다.", "ko"),
    ).toEqual([]);
    expect(
      rules("설정이 되어진다. 검증을 수행한다. 사용자에 의해 실행된다.", "ko"),
    ).toEqual(["double-passive", "light-verb", "translationese"]);
  });

  it("skips code, struck text, and rows marked no", () => {
    expect(
      rules(
        "Use `utilize` here. ~~In order to win.~~\n\n| A | B |\n| --- | --- |\n| no | in order to |",
        "en",
      ),
    ).toEqual([]);
  });

  it("reports the line of the sentence inside a wrapped paragraph or a list", () => {
    const warnings = lintDraft(
      parseDraft(
        draft(
          "## P\n\nA short line.\nWe utilize it here.\n\n1. Fine.\n2. We leverage `utilize`.",
        ),
      ),
      "en",
    );
    expect(warnings.map((w) => [w.line, w.suggestion])).toEqual([
      [8, "use"],
      [11, "use"],
    ]);
  });

  it("does not end a sentence at a dot inside a name", () => {
    expect(splitSentences("Open draft.ts in v1.2. Then run it.")).toEqual([
      "Open draft.ts in v1.2.",
      "Then run it.",
    ]);
  });

  it("fails a strict render and writes nothing", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-explain-"));
    const out = path.join(dir, "2026-01-01-x.html");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await runExplainRender({
      source: draft("## P\n\nWe utilize it.", "title: T\nstyle: strict"),
      out,
      archify: false,
      cwd: dir,
    });
    log.mockRestore();
    expect(code).toBe(1);
    expect(fs.existsSync(out)).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("planRows", () => {
  const text = (span?: number) => ({
    samples: [
      { w: 260, h: 400 },
      { w: 520, h: 220 },
      { w: 1040, h: 130 },
    ],
    minWidth: 260,
    span,
  });

  it("fills every row to the container width, in reading order", () => {
    const plan = planRows({
      width: 1200,
      gap: 16,
      cols: 3,
      panels: Array.from({ length: 7 }, () => text()),
    });
    const order = plan.rows.flatMap((row) =>
      row.columns.flatMap((column) => column.panels),
    );
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const row of plan.rows) {
      const used =
        row.columns.reduce((sum, column) => sum + column.width, 0) +
        16 * (row.columns.length - 1);
      expect(used).toBe(1200);
      expect(row.columns.length).toBeLessThanOrEqual(3);
    }
  });

  it("keeps a full-span panel alone and respects minimum widths", () => {
    const plan = planRows({
      width: 900,
      gap: 16,
      cols: 3,
      panels: [text(), text(3), { ...text(), minWidth: 700 }, text()],
    });
    expect(plan.rows[1]?.columns).toEqual([{ panels: [1], width: 900 }]);
    for (const row of plan.rows) {
      for (const column of row.columns) {
        if (column.panels.includes(2))
          expect(column.width).toBeGreaterThanOrEqual(700);
      }
    }
  });

  it("falls back to one panel per row when the input is unusable", () => {
    const plan = planRows({ width: 0, panels: [text(), text()] });
    expect(plan.rows.map((row) => row.columns[0]?.panels)).toEqual([[0], [1]]);
  });
});

describe("archify sidecar spec", () => {
  it("derives an architecture grid from a flow", () => {
    const { diagrams } = renderDraft(
      draft(
        "## P\n\n```flow LR\n(User) -> API -> [(DB)]\nAPI --> Queue: event\n```",
      ),
    );
    const built = toArchifySpec(diagrams[0]?.model as never, {
      title: "T",
      output: "x.archify.html",
      quality: "standard",
    });
    expect(built?.type).toBe("architecture");
    const spec = built?.spec as {
      components: Array<{ id: string; type: string; row: number; col: number }>;
      connections: Array<{
        from: string;
        to: string;
        variant: string;
        label?: string;
      }>;
    };
    expect(spec.components.map((c) => [c.type, c.col])).toEqual([
      ["external", 0],
      ["backend", 1],
      ["database", 2],
      ["messagebus", 2],
    ]);
    const cells = spec.components.map((c) => `${c.row}:${c.col}`);
    expect(new Set(cells).size).toBe(cells.length);
    for (const component of spec.components) {
      expect(component.id).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
    }
    expect(spec.connections[2]).toMatchObject({
      variant: "dashed",
      label: "event",
    });
  });

  it("derives a sequence, marks returns, and drops self messages", () => {
    const { diagrams } = renderDraft(
      draft(
        "## P\n\n```sequence\nA -> B: call\nB -> B: think\nB --> A: result\nB --> C: notify\n```",
      ),
    );
    const built = toArchifySpec(diagrams[0]?.model as never, {
      title: "T",
      output: "x.archify.html",
      quality: "showcase",
    });
    const spec = built?.spec as {
      messages: Array<{ y: number; variant: string }>;
    };
    expect(spec.messages.map((message) => message.variant)).toEqual([
      "default",
      "return",
      "dashed",
    ]);
    expect(spec.messages[0]?.y).toBeGreaterThanOrEqual(160);
  });

  it("gives up on a diagram archify cannot draw", () => {
    const { diagrams } = renderDraft(draft("## P\n\n```flow\nOnly\n```"));
    expect(
      toArchifySpec(diagrams[0]?.model as never, {
        title: "T",
        output: "x.html",
        quality: "standard",
      }),
    ).toBeUndefined();
    expect(inferComponentType("사용자")).toBe("external");
    expect(inferComponentType("anything", "cylinder")).toBe("database");
  });
});

describe("explain render / patch", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0))
      fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("names the file by date and slug, and patches one panel in place", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-explain-"));
    dirs.push(dir);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await runExplainRender({
      source: draft(
        "## One\n\nfirst\n\n## Two\n\nsecond",
        "title: Sample page\ntheme: card",
      ),
      archify: false,
      json: true,
      cwd: dir,
    });
    expect(code).toBe(0);
    const report = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      file: string;
    };
    expect(path.basename(report.file)).toMatch(
      /^\d{4}-\d{2}-\d{2}-sample-page\.html$/,
    );
    expect(path.dirname(report.file)).toBe(
      path
        .join(fs.realpathSync(dir), ".agents", "results", "explain")
        .replace(fs.realpathSync(dir), path.resolve(dir)),
    );

    const patched = await runExplainPatch({
      html: report.file,
      panel: "b",
      source: "replaced body",
      json: true,
      cwd: dir,
    });
    expect(patched).toBe(0);
    const html = fs.readFileSync(report.file, "utf-8");
    expect(html).toContain("<p>replaced body</p>");
    expect(html).toContain("<p>first</p>");
    expect(html).not.toContain("<p>second</p>");
    expect(html).toContain('data-oe-theme="card"');
  });

  it("patchDraft replaces a heading when the new panel brings one", () => {
    const source = draft("## One\n\na\n\n## Two\n\nb\n\n## Three\n\nc");
    const next = parseDraft(
      patchDraft(source, "B", "## Renamed {span=2}\n\nnew"),
    );
    expect(next.panels.map((panel) => panel.title)).toEqual([
      "One",
      "Renamed",
      "Three",
    ]);
    expect(next.panels[1]?.span).toBe(2);
    expect(() => patchDraft(source, "Z", "x")).toThrow(/no panel "Z"/);
  });

  it("refuses to patch a page it did not make", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oma-explain-"));
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, "other.html"), "<html></html>");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await runExplainPatch({
        html: "other.html",
        panel: "A",
        source: "x",
        cwd: dir,
      }),
    ).toBe(1);
    expect(String(error.mock.calls[0]?.[0])).toMatch(/holds no draft/);
  });

  it("slugs: explicit slug, ASCII title, file name, then a hash", () => {
    expect(artifactSlug("My Slug!", "ignored")).toBe("my-slug");
    expect(artifactSlug(undefined, "Session Trajectory Viewer")).toBe(
      "session-trajectory-viewer",
    );
    expect(
      artifactSlug(
        undefined,
        "세션 트래젝터리",
        "notes/2026-01-01-trajectory.md",
      ),
    ).toBe("trajectory");
    expect(artifactSlug(undefined, "세션 트래젝터리")).toMatch(
      /^explain-[0-9a-f]{8}$/,
    );
  });
});

describe("draft grammar", () => {
  it("takes the title from a leading # heading and accepts ~~~ fences", () => {
    const parsed = parseDraft(
      "# From heading\n\nLead.\n\n## P\n\n~~~flow\nA -> B\n~~~\n",
    );
    expect(parsed.meta.title).toBe("From heading");
    expect(parsed.lead[0]).toMatchObject({ text: "Lead." });
    expect(parsed.panels[0]?.blocks[0]).toMatchObject({ name: "flow" });
  });

  it("keeps written ids, fills the rest, and goes past Z", () => {
    const heads = ["## C Third", "## First", "## B1 Sub", "## Second"];
    const parsed = parseDraft(
      draft(heads.map((h) => `${h}\n\nx`).join("\n\n")),
    );
    expect(parsed.panels.map((panel) => panel.id)).toEqual([
      "C",
      "A",
      "B1",
      "B",
    ]);
    const many = parseDraft(
      draft(
        Array.from({ length: 28 }, (_v, i) => `## Panel ${i}\n\nx`).join(
          "\n\n",
        ),
      ),
    );
    expect(many.panels.slice(25).map((panel) => panel.id)).toEqual([
      "Z",
      "P27",
      "P28",
    ]);
    expect(() => parseDraft(draft("## A One\n\nx\n\n## A Two\n\ny"))).toThrow(
      /two panels have the id "A"/,
    );
  });

  it("reads rows, quoted notes, and the meta alias from a heading", () => {
    const [panel] = parseDraft(
      draft("## Wide {span=2 rows=2 meta='top right' bare}\n\nx"),
    ).panels;
    expect(panel).toMatchObject({
      span: 2,
      rows: 2,
      note: "top right",
      bare: true,
    });
  });
});

describe("markdown", () => {
  it("renders nested and task lists, aligned tables, rules, and quotes", () => {
    const html = renderMarkdown(
      [
        "### Head",
        "- one",
        "  - nested",
        "- [x] done",
        "",
        "1. first",
        "",
        "   more",
        "",
        "| L | R |",
        "| :-- | --: |",
        "| ✓ fine | a \\| b |",
        "",
        "> quote",
        "> - item",
        "",
        "---",
      ].join("\n"),
    );
    expect(html).toContain("<h3>Head</h3>");
    expect(html).toContain("<ul><li>one\n<ul><li>nested</li></ul></li>");
    expect(html).toContain('class="oe-task oe-task-done"');
    expect(html).toContain("<ol><li><p>first</p>\n<p>more</p></li></ol>");
    expect(html).toContain('<th style="text-align:right">R</th>');
    expect(html).toContain("oe-status-ok");
    expect(html).toContain("a | b");
    expect(html).toContain(
      "<blockquote><p>quote</p>\n<ul><li>item</li></ul></blockquote>",
    );
    expect(html).toContain("<hr>");
  });

  it("renders inline forms and never emits an unsafe link or raw markup", () => {
    const html = renderInline(
      "**b** _e_ ***x*** ~~d~~ ``a ` b`` [l](https://e.com) <https://a.b> snake_case_name \\*lit\\* ![i](https://x/y.png) ![d](data:image/png;base64,AA) [bad](javascript:alert(1)) <b>raw</b>",
    );
    expect(html).toContain(
      "<strong>b</strong> <em>e</em> <em><strong>x</strong></em> <del>d</del>",
    );
    expect(html).toContain("<code>a ` b</code>");
    expect(html).toContain('<a href="https://e.com">l</a>');
    expect(html).toContain('<a href="https://a.b">https://a.b</a>');
    expect(html).toContain("snake_case_name *lit*");
    // An external image is never loaded: it becomes a link.
    expect(html).toContain('<a href="https://x/y.png">i</a>');
    expect(html).toContain('<img alt="d" src="data:image/png;base64,AA">');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;b&gt;raw&lt;/b&gt;");
    // A label that would parse as a block is still a label.
    expect(renderInline("1. first <x>")).toBe("1. first &lt;x&gt;");
  });

  it("resolves reference links and collects footnotes", () => {
    const html = renderMarkdown(
      'See [the spec][spec] and a note.[^n]\n\n[spec]: https://e.com/spec "Spec"\n\n[^n]: The **note** text.',
    );
    expect(html).toContain(
      '<a href="https://e.com/spec" title="Spec">the spec</a>',
    );
    expect(html).toContain('<sup class="oe-fn-ref">[1]</sup>');
    expect(html).toContain(
      '<ol class="oe-footnotes"><li><p>The <strong>note</strong> text.</p></li></ol>',
    );
  });
});

describe("templates and page shell", () => {
  it("doc: one column with a contents list from three panels up", () => {
    const three = renderDraft(
      draft(
        "## One\n\na\n\n## Two\n\nb\n\n## Three\n\nc",
        "title: T\ntemplate: doc",
      ),
    );
    expect(three.template).toBe("doc");
    expect(three.html).toContain('<nav class="oe-toc"');
    expect(three.html).toContain('<a href="#panel-b">B · Two</a>');
    expect(three.html).not.toContain('class="oe-grid"');
    const two = renderDraft(draft("## One\n\na\n\n## Two\n\nb"), {
      template: "doc",
    });
    expect(two.html).toContain("oe-doc-plain");
    expect(() =>
      renderDraft(draft("## P\n\nx"), { template: "slides" }),
    ).toThrow(/template must be one of sheet, doc/);
  });

  it("sheet: widens wide tables and diagrams, and leaves no hole in a row", () => {
    const { draft: parsed } = renderDraft(
      draft(
        "## T\n\n| a | b | c | d | e | f |\n| - | - | - | - | - | - |\n| 1 | 2 | 3 | 4 | 5 | 6 |",
      ),
    );
    expect(contentSpan(parsed.panels[0] as never, "")).toBe(3);
    expect(
      contentSpan(parsed.panels[0] as never, '<svg data-natural="1300">'),
    ).toBe(3);
    expect(fillRows([1, 1, 2, 1], 3, false)).toEqual([1, 2, 2, 1]);
    expect(fillRows([1, 3, 1], 3, false)).toEqual([3, 3, 3]);
    expect(fillRows([2, 5], 3, true)).toEqual([2, 3]);
  });

  it("carries every theme and a three-way colour mode in one page", () => {
    const css = themeCss();
    expect(css).toContain(':root[data-oe-theme="card"]{');
    expect(css).toContain(':root[data-oe-theme="card"][data-theme="dark"]');
    expect(css).toContain(':root[lang="ja"]');
    const { html } = renderDraft(draft("## P\n\nx"), {
      theme: "card",
      mode: "dark",
    });
    expect(readPageSettings(html)).toMatchObject({
      template: "sheet",
      theme: "card",
      mode: "dark",
      style: "warn",
    });
    for (const control of ["theme", "mode", "copy", "print"]) {
      expect(html).toContain(`data-oe="${control}"`);
    }
  });

  it("uses zh-CN for Chinese pages and localized diagram labels", () => {
    const { html } = renderDraft(
      draft("## 流程\n\n```flow\n用户 -> 网关\n```", "title: 渲染器如何工作"),
    );
    expect(html).toContain('<html lang="zh-CN"');
    expect(html).toContain('aria-label="流程图：用户、网关"');
  });
});

describe("component grammar", () => {
  const render = (block: string) => {
    const result = renderDraft(draft(`## P\n\n${block}`));
    // The stylesheet names every class; assertions are about the markup.
    return {
      ...result,
      html: result.html.slice(result.html.indexOf("</style>")),
    };
  };
  const fails = (block: string) => failure(draft(`## P\n\n${block}`)).message;

  it("flow: * prefix, fullwidth punctuation, and bracketed colons", () => {
    const { diagrams, html } = render(
      "```flow\n*核心 -> [步骤: 一]：标签\ngroup 后端：核心，步骤: 一\n```",
    );
    const model = diagrams[0]?.model;
    if (model?.kind !== "flow") throw new Error("expected a flow model");
    expect(model.nodes.map((node) => node.label)).toEqual(["核心", "步骤: 一"]);
    expect(model.edges[0]?.label).toBe("标签");
    expect(model.groups[0]?.members).toHaveLength(2);
    expect(html).toContain("oe-node-em");
    expect(fails("```flow\nA: stray\n```")).toMatch(/cannot parse/);
  });

  it("flow: a group frame holds its members and no other node", () => {
    const boxes = [
      "Client",
      "Gateway",
      "Auth",
      "Orders",
      "Catalog",
      "Queue",
      "Worker",
      "Cache",
    ].map((id) => ({ id, width: 90, height: 36 }));
    const layout = layoutLayered(
      boxes,
      [
        ["Client", "Gateway"],
        ["Gateway", "Auth"],
        ["Gateway", "Orders"],
        ["Gateway", "Catalog"],
        ["Orders", "Queue"],
        ["Queue", "Worker"],
        ["Catalog", "Cache"],
        ["Gateway", "Cache"],
        ["Orders", "Catalog"],
      ].map(([from, to]) => ({ from: from as string, to: to as string })),
      {
        groups: [
          { members: ["Auth", "Orders", "Catalog"] },
          { members: ["Queue", "Worker"] },
        ],
      },
    );
    const inside = (
      id: string,
      frame: { x: number; y: number; width: number; height: number },
    ) => {
      const node = layout.nodes.get(id) as {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      return (
        node.x + node.width / 2 > frame.x &&
        node.x - node.width / 2 < frame.x + frame.width &&
        node.y + node.height / 2 > frame.y &&
        node.y - node.height / 2 < frame.y + frame.height
      );
    };
    const [services, async] = layout.groups as [never, never];
    expect(
      ["Auth", "Orders", "Catalog"].every((id) => inside(id, services)),
    ).toBe(true);
    expect(
      ["Client", "Gateway", "Queue", "Worker", "Cache"].some((id) =>
        inside(id, services),
      ),
    ).toBe(false);
    expect(
      ["Client", "Gateway", "Auth", "Orders", "Catalog", "Cache"].some((id) =>
        inside(id, async),
      ),
    ).toBe(false);
  });

  it("sequence: fixed order, wide notes, dividers, and numbers", () => {
    const { diagrams, html } = render(
      "```sequence num\nparticipants: C, B, A\nA -> B: one\n== Phase two ==\nB --> C：two\nnote A, C: across\n```",
    );
    const model = diagrams[0]?.model;
    if (model?.kind !== "sequence")
      throw new Error("expected a sequence model");
    expect(model.participants.map((p) => p.label)).toEqual(["C", "B", "A"]);
    expect(model.messages[1]).toMatchObject({ label: "two", dashed: true });
    expect(model.phases).toEqual([{ label: "Phase two", from: 1, to: 1 }]);
    expect(html.match(/class="oe-seq-step"/g)).toHaveLength(2);
    expect(html).toContain("oe-seq-divider");
    expect(fails("```sequence\nnonsense\n```")).toMatch(/cannot parse/);
  });

  it("tree: org chart, side-by-side roots, and file lists", () => {
    const org = render(
      "```tree\nRoot | sub\n  A\n    `S1` leaf\n  *B | note\n```",
    ).html;
    expect(org).toContain("oe-tree-org");
    expect(org).toContain('style="--n:2"');
    expect(org).toContain("oe-tree-box-em");
    expect(org).toContain('<span class="oe-tree-tag">S1</span>');
    expect(render("```tree\nOne\nTwo\nThree\n```").html).toContain(
      "oe-tree-cols-free",
    );
    const files = render(
      "```tree\nsrc/\n  main.ts  # entry\n  lib/\n    a.ts\n```",
    ).html;
    expect(files).toContain("oe-tree-files");
    expect(files).not.toContain("oe-tree-org");
    expect(render("```tree list\nRoot\n  A\n  B\n```").html).toContain(
      "oe-tree-files",
    );
  });

  it("timeline: horizontal up to six events, vertical beyond or on request", () => {
    const few = "```timeline\n*2023 | Start\n2024 | Next | detail\n```";
    expect(render(few).html).toContain(
      'class="oe-timeline oe-timeline-h" style="--n:2"',
    );
    expect(render(few).html).toContain('class="oe-tl-key"');
    expect(render(few.replace("timeline", "timeline v")).html).toContain(
      "oe-timeline-v",
    );
    const many = Array.from({ length: 7 }, (_v, i) => `${i} | e${i}`).join(
      "\n",
    );
    expect(render(`\`\`\`timeline\n${many}\n\`\`\``).html).toContain(
      "oe-timeline-v",
    );
  });

  it("kv: colon and pipe forms, wide rows, and a column count", () => {
    const { html } = render(
      "```kv cols=3\n* Title: Big: one\nKey：值\nPiped | value | note\n```",
    );
    expect(html).toContain('style="--kv-cols:3"');
    expect(html).toContain(
      'class="oe-kv-cell oe-kv-wide"><dt>Title</dt><dd>Big: one</dd>',
    );
    expect(html).toContain("<dt>Key</dt><dd>值</dd>");
    expect(html).toContain(
      '<dd>value<span class="oe-kv-note">note</span></dd>',
    );
    expect(fails("```kv\nno separator\n```")).toMatch(/no colon/);
  });

  it("callout: kinds, their aliases, a title alone, and a misplaced type", () => {
    expect(render("```callout warning Careful\nbody\n```").html).toContain(
      "oe-callout-warn",
    );
    expect(render("```callout err\nbody\n```").html).toContain(
      "oe-callout-err",
    );
    expect(render("```callout Just a title\n```").html).toContain(
      '<strong class="oe-callout-title">Just a title</strong>',
    );
    expect(fails("```callout\ntype: warning\nbody\n```")).toMatch(
      /put the kind on the fence line.*callout warn/,
    );
  });
});

describe("planner scale band", () => {
  const diagram = (natural: number) => ({
    samples: [
      { w: natural * 0.75 + 34, h: 240 },
      { w: natural * 1.25 + 34, h: 400 },
    ],
    minWidth: natural * 0.75 + 34,
    maxWidth: natural * 1.25 + 34,
    natural,
    pad: 34,
  });

  it("keeps diagram scales on one page within a quarter of each other", () => {
    const plan = planRows({
      width: 1200,
      gap: 16,
      cols: 3,
      panels: [diagram(1100), diagram(300), diagram(320)],
    });
    expect(plan.maxScale).toBeLessThan(1.25);
    const scales = plan.rows.flatMap((row) =>
      row.columns.map((column) => {
        const natural = [1100, 300, 320][column.panels[0] as number] as number;
        return Math.min(plan.maxScale, (column.width - 34) / natural);
      }),
    );
    expect(Math.max(...scales) / Math.min(...scales)).toBeLessThanOrEqual(
      1.2501,
    );
  });

  it("lets a single diagram grow to a quarter above its drawn size", () => {
    const plan = planRows({ width: 1200, gap: 16, panels: [diagram(400)] });
    expect(plan.maxScale).toBe(1.25);
  });
});

describe("lint word lists", () => {
  const rules = (body: string, lang: "ko" | "en" | "ja" | "zh") =>
    lintDraft(parseDraft(draft(`## P\n\n${body}`)), lang).map(
      (warning) => `${warning.rule}:${warning.suggestion ?? ""}`,
    );

  it("English: inflected forms of non-approved words", () => {
    expect(rules("We utilised it and obtained a result.", "en")).toEqual(
      expect.arrayContaining(["word:use", "word:get"]),
    );
  });

  it("Chinese: light verbs, wrong characters, vague amounts, open ranges", () => {
    const found = rules("请尽快登陆并进行验证。超过 10 次以上会失败。", "zh");
    expect(found).toEqual(
      expect.arrayContaining([
        "word:登录",
        "word:写出具体期限",
        "light-verb:直接用“验证”",
        "word:写明端点：大于 / 不小于，小于 / 不大于",
      ]),
    );
  });

  it("Korean: wrong spellings; Japanese: wordy forms", () => {
    expect(rules("설정이 됬다. 몇일 걸린다.", "ko")).toEqual([
      "word:됐",
      "word:며칠",
    ]);
    expect(rules("検証を行うことができる。", "ja")).toEqual(
      expect.arrayContaining([
        "light-verb:動詞を直接使う（検証を行う → 検証する）",
      ]),
    );
  });

  it("the lint command checks a draft whose style is off, and strict fails", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const source = draft("## P\n\nWe utilize it.", "title: T\nstyle: off");
    expect(runExplainLint({ source, json: true })).toBe(0);
    const report = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      warnings: unknown[];
    };
    expect(report.warnings).toHaveLength(1);
    expect(runExplainLint({ source, style: "strict", json: true })).toBe(1);
    log.mockRestore();
  });
});

describe("patch by title and sidecar details", () => {
  it("finds a panel by letter, title, or both, and rejects an ambiguous title", () => {
    const source = draft("## Same\n\na\n\n## Call order\n\nb\n\n## Same\n\nc");
    expect(patchDraft(source, "Call order", "new")).toContain(
      "## Call order\n\nnew",
    );
    expect(patchDraft(source, "## B Call order {span=2}", "new")).toContain(
      "new",
    );
    expect(patchDraft(source, "b", "new")).toContain("new");
    expect(() => patchDraft(source, "Same", "x")).toThrow(
      /more than one panel/,
    );
    expect(() => patchDraft(source, "B", "## One\n\nx\n\n## Two\n\ny")).toThrow(
      /exactly one ## heading/,
    );
  });

  it("maps flow groups to archify boundaries and phases to segments", () => {
    const flowModel = renderDraft(
      draft("## P\n\n```flow\nA -> B -> C\ngroup Core: A, B\n```"),
    ).diagrams[0]?.model;
    const architecture = toArchifySpec(flowModel as never, {
      title: "T",
      output: "x.archify.html",
      quality: "standard",
    })?.spec as { boundaries: Array<{ label: string; wraps: string[] }> };
    expect(architecture.boundaries).toEqual([
      { kind: "region", label: "Core", wraps: ["a", "b"] },
    ]);
    const sequenceModel = renderDraft(
      draft(
        "## P\n\n```sequence\nA -> B: one\n== Later ==\nB -> B: self\nB --> A: two\n```",
      ),
    ).diagrams[0]?.model;
    const spec = toArchifySpec(sequenceModel as never, {
      title: "T",
      output: "x.archify.html",
      quality: "standard",
    })?.spec as {
      segments: Array<{ label: string; from: number; to: number }>;
    };
    expect(spec.segments).toHaveLength(1);
    expect(spec.segments[0]).toMatchObject({ label: "Later" });
    expect(spec.segments[0]?.from).toBeLessThan(spec.segments[0]?.to ?? 0);
  });
});
