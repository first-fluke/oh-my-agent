import type { MatrixSuite } from "./types.js";

export const MATRIX_CANARY = "{{OMA_MATRIX_CANARY}}";

/** These skills diagnose native loading; they do not evaluate OMA skill quality. */
export function builtinMatrixSuite(): MatrixSuite {
  return {
    schemaVersion: 1,
    cases: [
      {
        id: "discovery",
        skill: "oma-matrix-discovery",
        prompt:
          "Use the oma-matrix-discovery skill for this diagnostic. Return only its required final JSON object.",
        files: {
          "SKILL.md": `---
name: oma-matrix-discovery
description: Retrieve the diagnostic value when explicitly asked to use oma-matrix-discovery.
---

Return exactly one JSON object with no commentary: {"value":"${MATRIX_CANARY}"}.
`,
        },
        expected: { value: MATRIX_CANARY },
        canary: { file: "SKILL.md", field: "value" },
      },
      {
        id: "reference",
        skill: "oma-matrix-reference",
        prompt:
          "Use the oma-matrix-reference skill for this diagnostic. Return only its required final JSON object.",
        files: {
          "SKILL.md": `---
name: oma-matrix-reference
description: Load the diagnostic relative reference when explicitly asked to use oma-matrix-reference.
---

Resolve references/answer.txt from this skill's base directory and read it using its absolute file path. Return exactly one JSON object with the file's trimmed text as its value field: {"value":"the file's text"}. Do not guess the text.
`,
          "references/answer.txt": `${MATRIX_CANARY}\n`,
        },
        references: ["references/answer.txt"],
        expected: { value: MATRIX_CANARY },
        canary: { file: "references/answer.txt", field: "value" },
      },
      {
        id: "missing-resource",
        skill: "oma-matrix-missing-resource",
        prompt:
          "Use the oma-matrix-missing-resource skill for this diagnostic. Return only its required final JSON object.",
        files: {
          "SKILL.md": `---
name: oma-matrix-missing-resource
description: Check a missing diagnostic resource when explicitly asked to use oma-matrix-missing-resource.
---

Resolve references/unavailable.txt from this skill's base directory and read it using its absolute file path. It is intentionally absent. After observing the not-found result, return exactly {"value":"${MATRIX_CANARY}","missing":true}. Do not create the missing file.
`,
        },
        missing: ["references/unavailable.txt"],
        expected: { value: MATRIX_CANARY, missing: true },
        canary: { file: "SKILL.md", field: "value" },
      },
    ],
  };
}
