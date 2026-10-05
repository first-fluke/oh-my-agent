import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateHtmlContent } from "../validate.js";
import { inferComponentType, toArchifySpec } from "./archify.js";
import { artifactSlug, runExplainPatch, runExplainRender } from "./command.js";
import { COMPONENTS } from "./components/index.js";
import { DraftError, parseDraft } from "./draft.js";
import { layoutLayered } from "./layered.js";
import { lintDraft, splitSentences } from "./lint.js";
import { planRows } from "./page-script.js";
import {
  extractDraftSource,
  isRenderedPage,
  patchDraft,
  renderDraft,
} from "./render.js";
import { detectLanguage, measure, wrapText } from "./text.js";

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
  const render = (block: string) => renderDraft(draft(`## P\n\n${block}`));

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
    expect(error.message).toMatch(/names "Missing"/);
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
