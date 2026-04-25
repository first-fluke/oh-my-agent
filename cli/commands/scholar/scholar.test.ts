import { describe, expect, it } from "vitest";
import { reconstructAbstract } from "./api.js";
import { slugFromKnowsId } from "./get.js";
import { lintDoc } from "./lint.js";
import {
  queryToTitleSimilarity,
  titleToTitleSimilarity,
} from "./similarity.js";

describe("title similarity", () => {
  it("queryToTitleSimilarity: full coverage = 1.0", () => {
    expect(
      queryToTitleSimilarity(
        "Attention Is All You Need",
        "Attention Is All You Need",
      ),
    ).toBeCloseTo(1.0);
  });

  it("queryToTitleSimilarity: short query in long title", () => {
    expect(
      queryToTitleSimilarity(
        "Attention Is All You Need",
        "Tool Attention Is All You Need: Dynamic Tool Gating",
      ),
    ).toBeCloseTo(1.0);
  });

  it("titleToTitleSimilarity: identical titles = 1.0", () => {
    const t = "Attention Is All You Need";
    expect(titleToTitleSimilarity(t, t)).toBeCloseTo(1.0);
  });

  it("titleToTitleSimilarity: different papers below same-paper threshold (0.7)", () => {
    const sim = titleToTitleSimilarity(
      "Attention Is All You Need",
      "Tool Attention Is All You Need: Dynamic Tool Gating",
    );
    expect(sim).toBeLessThan(0.7);
  });

  it("titleToTitleSimilarity: empty input = 0", () => {
    expect(titleToTitleSimilarity("", "anything")).toBe(0);
    expect(titleToTitleSimilarity("anything", "")).toBe(0);
  });
});

describe("lintDoc — v0.9.0 sidecar", () => {
  const validSidecar = {
    knows_version: "0.9.0",
    profile: "paper@1",
    record_id: "knows:local/test/1.0.0",
    subject_ref: "art:paper",
    title: "Test Paper",
    authors: ["A. Author"],
    summary: "summary",
    coverage: { statements: "main_claims_only", evidence: "key_evidence_only" },
    artifacts: [{ id: "art:paper", artifact_type: "paper", role: "subject" }],
    statements: [
      {
        id: "stmt:claim-one",
        statement_type: "claim",
        text: "claim 1",
        confidence: { claim_strength: "high", extraction_fidelity: "high" },
      },
      {
        id: "stmt:claim-two",
        statement_type: "claim",
        text: "claim 2",
        confidence: { claim_strength: "high", extraction_fidelity: "high" },
      },
    ],
    evidence: [{ id: "ev:result-table", evidence_type: "table_result" }],
    relations: [
      {
        id: "rel:claim-one-evidence",
        predicate: "supported_by",
        subject_ref: "stmt:claim-one",
        object_ref: "ev:result-table",
      },
      {
        id: "rel:claim-two-evidence",
        predicate: "supported_by",
        subject_ref: "stmt:claim-two",
        object_ref: "ev:result-table",
      },
      {
        id: "rel:claim-one-art",
        predicate: "documents",
        subject_ref: "stmt:claim-one",
        object_ref: "art:paper",
      },
    ],
    provenance: {
      origin: "machine",
      actor: { name: "test", type: "tool" },
      generated_at: "2026-04-25T00:00:00Z",
      method: "extraction",
    },
    version: { spec: "0.9.0", record: "1.0.0", source: "original" },
    freshness: { as_of: "2026-04-25T00:00:00Z", update_policy: "versioned" },
  };

  it("valid sidecar → 0 errors", () => {
    const report = lintDoc(validSidecar);
    expect(report.errors).toBe(0);
  });

  it("placeholder DOI → error", () => {
    const report = lintDoc({ ...validSidecar, doi: "TODO" });
    const matches = report.findings.filter(
      (f) => f.severity === "error" && f.path === "doi",
    );
    expect(matches.length).toBe(1);
  });

  it("legacy actors[] array → error suggesting actor", () => {
    const bad = {
      ...validSidecar,
      provenance: { origin: "machine", actors: [{ type: "tool" }] },
    };
    const report = lintDoc(bad);
    const matches = report.findings.filter(
      (f) => f.path === "provenance.actors",
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("forbidden actor type 'ai' → error", () => {
    const bad = {
      ...validSidecar,
      provenance: { origin: "machine", actor: { type: "ai", name: "x" } },
    };
    const report = lintDoc(bad);
    const matches = report.findings.filter(
      (f) => f.path === "provenance.actor.type" && f.severity === "error",
    );
    expect(matches.length).toBe(1);
  });

  it("legacy `type` on statement → error", () => {
    const bad = {
      ...validSidecar,
      statements: [
        { id: "stmt:legacy", type: "claim", text: "x" },
        ...validSidecar.statements,
      ],
    };
    const report = lintDoc(bad);
    const matches = report.findings.filter(
      (f) => f.severity === "error" && f.path.endsWith(".type"),
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("dangling object_ref → error in strict mode", () => {
    const bad = {
      ...validSidecar,
      relations: [
        ...validSidecar.relations,
        {
          id: "rel:dangling",
          predicate: "supported_by",
          subject_ref: "stmt:claim-one",
          object_ref: "ev:nonexistent",
        },
      ],
    };
    const report = lintDoc(bad);
    const matches = report.findings.filter(
      (f) => f.severity === "error" && f.path.endsWith(".object_ref"),
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("dangling object_ref → warning in lenient mode", () => {
    const bad = {
      ...validSidecar,
      relations: [
        ...validSidecar.relations,
        {
          id: "rel:dangling",
          predicate: "supported_by",
          subject_ref: "stmt:claim-one",
          object_ref: "ev:nonexistent",
        },
      ],
    };
    const report = lintDoc(bad, { lenient: true });
    const errs = report.findings.filter(
      (f) => f.severity === "error" && f.path.endsWith(".object_ref"),
    );
    const warns = report.findings.filter(
      (f) => f.severity === "warning" && f.path.endsWith(".object_ref"),
    );
    expect(errs.length).toBe(0);
    expect(warns.length).toBeGreaterThan(0);
  });

  it("quoted number on evidence value → error", () => {
    const bad = {
      ...validSidecar,
      evidence: [
        { id: "ev:quoted", evidence_type: "table_result", value: "22" },
      ],
    };
    const report = lintDoc(bad);
    const matches = report.findings.filter(
      (f) => f.severity === "error" && f.path.includes("value"),
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("invalid coverage.evidence → warning, not error", () => {
    const bad = {
      ...validSidecar,
      coverage: { statements: "exhaustive", evidence: "bogus" },
    };
    const report = lintDoc(bad);
    const matches = report.findings.filter(
      (f) => f.path === "coverage.evidence",
    );
    expect(matches.length).toBe(1);
    expect(matches[0].severity).toBe("warning");
  });

  it("past-tense predicate → warning, not error", () => {
    const bad = {
      ...validSidecar,
      relations: [
        ...validSidecar.relations,
        {
          id: "rel:past-tense",
          predicate: "evaluated_on",
          subject_ref: "stmt:claim-one",
          object_ref: "ev:result-table",
        },
      ],
    };
    const report = lintDoc(bad);
    const matches = report.findings.filter(
      (f) => f.path.endsWith(".predicate") && f.message.includes("past-tense"),
    );
    expect(matches.length).toBe(1);
    expect(matches[0].severity).toBe("warning");
    expect(matches[0].fix).toContain("evaluates_on");
  });

  it("relation density < 1.5 → warning", () => {
    const sparse = {
      ...validSidecar,
      relations: [
        // only 1 relation for 2 statements → 0.5 ratio
        {
          id: "rel:single",
          predicate: "supported_by",
          subject_ref: "stmt:claim-one",
          object_ref: "ev:result-table",
        },
      ],
    };
    const report = lintDoc(sparse);
    const matches = report.findings.filter(
      (f) =>
        f.severity === "warning" &&
        f.path === "relations" &&
        f.message.includes("avg relations/statement"),
    );
    expect(matches.length).toBe(1);
  });

  it("statement with zero relations → warning per orphan", () => {
    const orphan = {
      ...validSidecar,
      statements: [
        ...validSidecar.statements,
        {
          id: "stmt:orphan",
          statement_type: "claim",
          text: "no relations",
          confidence: { claim_strength: "high", extraction_fidelity: "high" },
        },
      ],
    };
    const report = lintDoc(orphan);
    const matches = report.findings.filter(
      (f) =>
        f.severity === "warning" &&
        f.path.includes("stmt:orphan") &&
        f.message.includes("no incoming/outgoing relations"),
    );
    expect(matches.length).toBe(1);
  });
});

describe("slugFromKnowsId", () => {
  it("extracts slug from canonical record id", () => {
    expect(slugFromKnowsId("knows:generated/reconvla/1.0.0")).toBe("reconvla");
  });

  it("converts dashes to spaces (search-friendly)", () => {
    expect(
      slugFromKnowsId("knows:generated/agentic-finance-survey/1.0.0"),
    ).toBe("agentic finance survey");
  });

  it("returns null for non-knows ids", () => {
    expect(slugFromKnowsId("10.48550/arXiv.1706.03762")).toBeNull();
    expect(slugFromKnowsId("W2147144213")).toBeNull();
  });

  it("returns null for malformed knows ids", () => {
    expect(slugFromKnowsId("knows:no-slash")).toBeNull();
    expect(slugFromKnowsId("knows:only/onepart")).toBeNull();
  });
});

describe("reconstructAbstract", () => {
  it("rebuilds words in correct positional order", () => {
    const inv = {
      hello: [0],
      world: [1],
      foo: [2],
    };
    expect(reconstructAbstract(inv)).toBe("hello world foo");
  });

  it("handles repeated words at multiple positions", () => {
    // "the cat sat on the mat" — "the" at index 0 and 4
    const inv = {
      the: [0, 4],
      cat: [1],
      sat: [2],
      on: [3],
      mat: [5],
    };
    expect(reconstructAbstract(inv)).toBe("the cat sat on the mat");
  });

  it("returns empty string for null/undefined", () => {
    expect(reconstructAbstract(null)).toBe("");
    expect(reconstructAbstract(undefined)).toBe("");
  });

  it("returns empty string for empty mapping", () => {
    expect(reconstructAbstract({})).toBe("");
  });

  it("preserves order even when keys are inserted out of order", () => {
    const inv = {
      end: [4],
      the: [0],
      middle: [2],
      "in-the": [1, 3],
    };
    expect(reconstructAbstract(inv)).toBe("the in-the middle in-the end");
  });
});
