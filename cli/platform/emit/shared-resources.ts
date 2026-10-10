import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

// Literal file paths in Markdown links, inline code, and prose. A path cannot
// start inside a URL or another path; anchors and surrounding punctuation stay
// outside the match.
const FILE_PATH =
  /(?<![\w./:\\-])(?:\.{1,2}\/)*(?:[\w.-]+\/)*[\w.-]+\.[a-zA-Z0-9]+(?![\w./-])/g;

/** Keep shared references usable when an installer copies just one skill. */
export function bundleSharedResources(
  repoRoot: string,
  sourceDir: string,
  outDir: string,
  excludedNames: ReadonlySet<string>,
): void {
  const sharedDir = resolve(repoRoot, ".agents/skills/_shared");
  const bundledDir = join(outDir, "references", "_shared");
  const copied = new Set<string>();
  rmSync(bundledDir, { recursive: true, force: true });

  function rewrite(
    content: string,
    sourceFile: string,
    destFile: string,
  ): string {
    return content.replace(FILE_PATH, (literal) => {
      const target = literal.startsWith(".agents/skills/_shared/")
        ? resolve(repoRoot, literal)
        : resolve(dirname(sourceFile), literal);
      const sharedPath = relative(sharedDir, target);
      if (
        sharedPath === "" ||
        sharedPath === ".." ||
        sharedPath.startsWith(`..${sep}`) ||
        sharedPath.split(sep).some((part) => excludedNames.has(part)) ||
        !existsSync(target) ||
        !statSync(target).isFile()
      ) {
        return literal;
      }

      const bundledFile = join(bundledDir, sharedPath);
      if (!copied.has(target)) {
        copied.add(target);
        mkdirSync(dirname(bundledFile), { recursive: true });
        if (target.endsWith(".md")) {
          writeFileSync(
            bundledFile,
            rewrite(readFileSync(target, "utf-8"), target, bundledFile),
          );
        } else {
          copyFileSync(target, bundledFile);
        }
      }
      return relative(dirname(destFile), bundledFile).split(sep).join("/");
    });
  }

  function visit(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const destFile = join(dir, entry.name);
      if (destFile === bundledDir) continue;
      if (entry.isDirectory()) {
        visit(destFile);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const skillPath = relative(outDir, destFile);
        // Overflow content originated in SKILL.md, so its source-relative
        // references still resolve from the original entry file.
        const sourceFile = join(
          sourceDir,
          skillPath === join("references", "overflow.md")
            ? "SKILL.md"
            : skillPath,
        );
        const content = readFileSync(destFile, "utf-8");
        const rewritten = rewrite(content, sourceFile, destFile);
        if (rewritten !== content) writeFileSync(destFile, rewritten);
      }
    }
  }

  visit(outDir);
}
