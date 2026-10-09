import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { renderCliVendorDoc } from "../rules.js";
import type { CliDocsEmitReport } from "./types.js";

/**
 * `cli/`-scoped instruction output. The shared AGENTS.md file is generated
 * from rules.ts so `check:emit-drift` can detect stale instructions.
 */
const CLI_DOCS: ReadonlyArray<{ vendor: string; rel: string }> = [
  { vendor: "codex", rel: join("cli", "AGENTS.md") },
];

/**
 * Emit `cli/AGENTS.md` under `outDir`, splicing the fresh
 * vendor block into the COMMITTED file's OMA markers (read from `repoRoot`)
 * so content outside the block survives and scratch-base drift runs compare
 * apples to apples.
 */
export function emitCliDocs(
  repoRoot: string,
  outDir: string,
): CliDocsEmitReport {
  const files = CLI_DOCS.map(({ vendor, rel }) => {
    const committedPath = join(repoRoot, rel);
    const existing = existsSync(committedPath)
      ? readFileSync(committedPath, "utf-8")
      : null;
    const content = renderCliVendorDoc(vendor, existing);
    const outPath = join(outDir, rel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, content);
    return { vendor, outPath, changed: existing !== content };
  });

  return { target: "cli-docs", outDir, files };
}
