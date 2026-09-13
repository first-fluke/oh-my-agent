import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertConstitutionAllows,
  CONSTITUTION_FILE,
  DEFAULT_MAINTAINER_TEMPLATE,
  DEFAULT_OPTIMIZER_TEMPLATE,
  EVOLUTION_DIR,
  exportEvolutionProcedure,
  isImmutablePath,
  loadEvolutionProcedure,
  OPTIMIZER_TEMPLATE_FILE,
  renderTemplate,
} from "./procedure.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-procedure-"));
  roots.push(root);
  return root;
}

describe("evolution procedure", () => {
  it("renders placeholders and leaves unknown ones verbatim", () => {
    expect(renderTemplate("a {{x}} b {{y}} {{zz}}", { x: 1, y: "two" })).toBe(
      "a 1 b two {{zz}}",
    );
  });

  it("falls back to the built-in defaults with a stable hash", () => {
    const root = workspace();
    const first = loadEvolutionProcedure(root);
    const second = loadEvolutionProcedure(root);
    expect(first.optimizer.source).toBe("default");
    expect(first.maintainer.source).toBe("default");
    expect(first.constitution.source).toBe("default");
    expect(first.procedureHash).toBe(second.procedureHash);
    expect(first.optimizer.template).toBe(DEFAULT_OPTIMIZER_TEMPLATE);
    expect(first.maintainer.template).toBe(DEFAULT_MAINTAINER_TEMPLATE);
  });

  it("exports editable defaults once and then reads them back with a new hash", () => {
    const root = workspace();
    const before = loadEvolutionProcedure(root);
    const exported = exportEvolutionProcedure(root);
    expect(exported.written).toHaveLength(3);
    expect(exported.kept).toHaveLength(0);
    expect(exportEvolutionProcedure(root)).toEqual({
      written: [],
      kept: exported.written,
    });
    const path = join(root, EVOLUTION_DIR, OPTIMIZER_TEMPLATE_FILE);
    writeFileSync(
      path,
      `${readFileSync(path, "utf-8")}\n- Prefer edits that add a concrete command.\n`,
    );
    const after = loadEvolutionProcedure(root);
    expect(after.optimizer.source).toBe(
      `${EVOLUTION_DIR}/${OPTIMIZER_TEMPLATE_FILE}`,
    );
    expect(after.optimizer.hash).not.toBe(before.optimizer.hash);
    expect(after.procedureHash).not.toBe(before.procedureHash);
    expect(after.constitution.source).toBe(
      `${EVOLUTION_DIR}/${CONSTITUTION_FILE}`,
    );
  });

  it("refuses a template that dropped a required placeholder", () => {
    const root = workspace();
    mkdirSync(join(root, EVOLUTION_DIR), { recursive: true });
    writeFileSync(
      join(root, EVOLUTION_DIR, OPTIMIZER_TEMPLATE_FILE),
      "Just improve it.\n{{body}}\n",
    );
    expect(() => loadEvolutionProcedure(root)).toThrow(
      /missing required placeholders: \{\{findings\}\}, \{\{editsPerEpoch\}\}/,
    );
  });

  it("requires the constitution to freeze itself and validates its shape", () => {
    const root = workspace();
    mkdirSync(join(root, EVOLUTION_DIR), { recursive: true });
    const path = join(root, EVOLUTION_DIR, CONSTITUTION_FILE);
    writeFileSync(
      path,
      'schema_version: 1\nimmutable: [".agents/eval/**"]\nmeta_targets: [optimizer]\n',
    );
    expect(() => loadEvolutionProcedure(root)).toThrow(
      /list itself as immutable/,
    );
    writeFileSync(
      path,
      `schema_version: 1\nimmutable: ["${EVOLUTION_DIR}/${CONSTITUTION_FILE}"]\nmeta_targets: [judge]\n`,
    );
    expect(() => loadEvolutionProcedure(root)).toThrow(/invalid constitution/);
  });

  it("treats immutable paths as globs relative to the workspace", () => {
    const root = workspace();
    const { constitution } = loadEvolutionProcedure(root);
    expect(
      isImmutablePath(constitution, root, ".agents/eval/oma-scm/a.yaml"),
    ).toBe(true);
    expect(
      isImmutablePath(constitution, root, "cli/commands/skills/opt/edits.ts"),
    ).toBe(true);
    expect(
      isImmutablePath(constitution, root, ".agents/skills/oma-scm/SKILL.md"),
    ).toBe(false);
    expect(() =>
      assertConstitutionAllows(
        constitution,
        root,
        `${EVOLUTION_DIR}/${CONSTITUTION_FILE}`,
        "editing the constitution",
      ),
    ).toThrow(/constitution forbids editing the constitution/);
    expect(() =>
      assertConstitutionAllows(
        constitution,
        root,
        `${EVOLUTION_DIR}/${OPTIMIZER_TEMPLATE_FILE}`,
        "editing the optimizer",
      ),
    ).not.toThrow();
  });
});
