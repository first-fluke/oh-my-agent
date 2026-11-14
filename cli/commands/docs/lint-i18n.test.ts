import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lintI18nStyle, summarizeStyleIssues } from "./lint-i18n.js";

function mkrepo(): string {
  return mkdtempSync(join(tmpdir(), "oma-lint-i18n-"));
}

function writeFile(root: string, rel: string, content: string): void {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
}

describe("lintI18nStyle - cjk-em-dash rule", () => {
  it("returns no issues for CJK file without em-dashes", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        "# 제목\n\n본문 내용입니다.\n",
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags em-dash in Korean prose", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        "# 제목\n\n본문 — 부가 설명입니다.\n",
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toHaveLength(1);
      expect(issues[0]?.rule).toBe("cjk-em-dash");
      expect(issues[0]?.lang).toBe("ko");
      expect(issues[0]?.line).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags em-dash in Japanese prose", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ja/docusaurus-plugin-content-docs/current/a.md",
        "概要 — 詳細はこちら\n",
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toHaveLength(1);
      expect(issues[0]?.lang).toBe("ja");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags em-dash in Chinese prose", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/zh/docusaurus-plugin-content-docs/current/a.md",
        "标题 — 副标题\n",
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toHaveLength(1);
      expect(issues[0]?.lang).toBe("zh");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores em-dash inside fenced code blocks", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        '# 제목\n\n```bash\ncommand --flag "value — with dash"\n```\n\n다음 본문.\n',
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores em-dash inside inline code spans", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        "본문 `--flag — value` 인라인 코드.\n",
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does NOT flag em-dash in Latin-script locales (de/es/fr)", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/de/docusaurus-plugin-content-docs/current/a.md",
        "Hauptpunkt — Erklärung\n",
      );
      writeFile(
        root,
        "web/i18n/fr/docusaurus-plugin-content-docs/current/a.md",
        "Sujet — explication\n",
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports correct line number for multi-line files", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        "line 1\nline 2\nline — 3\nline 4\n",
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toHaveLength(1);
      expect(issues[0]?.line).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("handles multiple em-dashes per file (one issue per line)", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        "본문 — 첫번째\n다른 — 두번째\n안전한 줄\n또 다른 — 세번째\n",
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toHaveLength(3);
      expect(issues.map((i) => i.line)).toEqual([1, 2, 4]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("respects custom cjkLocales option", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        "본문 — 부가\n",
      );
      writeFile(
        root,
        "web/i18n/ja/docusaurus-plugin-content-docs/current/a.md",
        "本文 — 補足\n",
      );
      const issues = lintI18nStyle({
        repoRoot: root,
        cjkLocales: ["ko"],
      });
      expect(issues).toHaveLength(1);
      expect(issues[0]?.lang).toBe("ko");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores em-dash inside a closed oma:generated region", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/zh/docusaurus-plugin-content-docs/current/a.md",
        [
          "翻译正文",
          "<!-- oma:generated cli-registry:start -->",
          "| Command | Description |",
          "| — | — |",
          "<!-- oma:generated cli-registry:end -->",
          "",
        ].join("\n"),
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports em-dashes before and after a generated region on their own lines", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/zh/docusaurus-plugin-content-docs/current/a.md",
        [
          "前文 — 说明",
          "<!-- oma:generated skill-catalog:start -->",
          "| — |",
          "<!-- oma:generated skill-catalog:end -->",
          "后文 — 说明",
          "",
        ].join("\n"),
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues.map((issue) => issue.line)).toEqual([1, 5]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not hide lines after an unterminated generated-region start", () => {
    // A start marker with no matching end is not a region. Lines after it
    // stay checked so a missing end cannot hide the rest of the file.
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        [
          "앞 — 설명",
          "<!-- oma:generated cli-registry:start -->",
          "남은 — 본문",
          "",
        ].join("\n"),
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues.map((issue) => issue.line)).toEqual([1, 3]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores table rows with placeholder em-dash cells only", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        [
          "| Platform | Manager | Fallback |",
          "| --- | --- | --- |",
          "| macOS | launchd | — |",
          "| — | — | — |",
          "",
        ].join("\n"),
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports a row with a placeholder cell and a non-placeholder em-dash cell once", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/zh/docusaurus-plugin-content-docs/current/a.md",
        ["| Key | Description |", "| --- | --- |", "| — | 文 — 文 |", ""].join(
          "\n",
        ),
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues).toHaveLength(1);
      expect(issues[0]?.rule).toBe("cjk-em-dash");
      expect(issues[0]?.line).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps prose em-dashes reported and line numbers accurate across placeholder tables", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        [
          "앞 문단 — 설명",
          "",
          "| macOS | launchd | — |",
          "| — | — | — |",
          "",
          "뒤 문단 — 설명",
          "",
        ].join("\n"),
      );
      const issues = lintI18nStyle({ repoRoot: root });
      expect(issues.map((issue) => issue.line)).toEqual([1, 6]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("lintI18nStyle - wrong-language rule", () => {
  // Generate body content long enough (>= 200 chars) to pass the
  // minDetectionChars threshold. Use repeating phrases for stable detection.
  const koBody =
    "이것은 한국어 본문입니다. 워크플로우와 에이전트에 대해 설명합니다. 모델 프리셋을 통해 각 에이전트가 사용할 모델을 구성할 수 있습니다. 빌트인 프리셋을 선택하거나 개별 에이전트를 재정의하거나 사용자 정의 프리셋을 정의할 수 있습니다.\n";
  const enBody =
    "This is the English body content describing workflows and agents. The model_preset configures which AI model each agent uses. You can pick a built-in preset, override individual agents, or define custom presets with extends.\n";

  it("does not flag when body language matches expected", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        `# 제목\n\n${koBody}`,
      );
      const issues = lintI18nStyle({
        repoRoot: root,
        rules: ["wrong-language"],
      });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("flags untranslated EN-as-placeholder under ko/", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        `# Title\n\n${enBody}`,
      );
      const issues = lintI18nStyle({
        repoRoot: root,
        rules: ["wrong-language"],
      });
      expect(issues).toHaveLength(1);
      expect(issues[0]?.rule).toBe("wrong-language");
      expect(issues[0]?.lang).toBe("ko");
      expect(issues[0]?.match).toContain("detected=en");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("skips files shorter than minDetectionChars", () => {
    const root = mkrepo();
    try {
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        "# Hi\n\nshort.\n",
      );
      const issues = lintI18nStyle({
        repoRoot: root,
        rules: ["wrong-language"],
        minDetectionChars: 100,
      });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ignores code blocks when assessing body language", () => {
    const root = mkrepo();
    try {
      // Body is Korean prose; large code block is English. Should not flag.
      writeFile(
        root,
        "web/i18n/ko/docusaurus-plugin-content-docs/current/a.md",
        `# 제목\n\n${koBody}\n\n\`\`\`bash\n# all this English code should be ignored\nfor i in $(seq 1 10); do\n  echo "iteration $i"\ndone\n\`\`\`\n`,
      );
      const issues = lintI18nStyle({
        repoRoot: root,
        rules: ["wrong-language"],
      });
      expect(issues).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("summarizeStyleIssues", () => {
  it("aggregates by rule, lang, and file", () => {
    const issues = [
      {
        file: "a.md",
        lang: "ko",
        line: 1,
        rule: "cjk-em-dash" as const,
        match: "x",
      },
      {
        file: "a.md",
        lang: "ko",
        line: 2,
        rule: "cjk-em-dash" as const,
        match: "y",
      },
      {
        file: "b.md",
        lang: "ja",
        line: 1,
        rule: "cjk-em-dash" as const,
        match: "z",
      },
    ];
    const s = summarizeStyleIssues(issues);
    expect(s.total).toBe(3);
    expect(s.byRule["cjk-em-dash"]).toBe(3);
    expect(s.byLang.ko).toBe(2);
    expect(s.byLang.ja).toBe(1);
    expect(s.byFile[0]).toEqual({ file: "a.md", lang: "ko", count: 2 });
    expect(s.byFile[1]).toEqual({ file: "b.md", lang: "ja", count: 1 });
  });
});
