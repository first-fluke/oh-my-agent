import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { emitAgentSkills } from "./agent-skills.js";
import type { PiPackageEmitReport } from "./types.js";

interface PackageMetadata {
  version?: string;
  description?: string;
  author?: unknown;
  license?: string;
  homepage?: string;
  repository?: unknown;
}

/** Emit a dependency-free Pi skill package; this does not publish or install it. */
export function emitPiPackage(
  repoRoot: string,
  outDir: string,
): PiPackageEmitReport {
  const sourceManifest = join(repoRoot, "package.json");
  const metadata: PackageMetadata = existsSync(sourceManifest)
    ? JSON.parse(readFileSync(sourceManifest, "utf-8"))
    : {};
  mkdirSync(outDir, { recursive: true });
  // Replace the emitter-owned skill tree so removed source skills do not linger.
  rmSync(join(outDir, "skills"), { recursive: true, force: true });
  const skills = emitAgentSkills(repoRoot, join(outDir, "skills"));
  const manifestPath = join(outDir, "package.json");
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        name: "oh-my-agent-pi",
        version: metadata.version ?? "0.0.0",
        description: metadata.description ?? "oh-my-agent skills for Pi",
        ...(metadata.author ? { author: metadata.author } : {}),
        license: metadata.license ?? "MIT",
        ...(metadata.homepage ? { homepage: metadata.homepage } : {}),
        ...(metadata.repository ? { repository: metadata.repository } : {}),
        keywords: ["pi-package", "agent-skills", "oh-my-agent"],
        files: ["skills"],
        pi: {
          skills: ["./skills"],
          extensions: [],
          prompts: [],
          themes: [],
        },
      },
      null,
      2,
    )}\n`,
  );
  const passCount = skills.filter((skill) => skill.validation.valid).length;
  return {
    target: "pi-package",
    outDir,
    manifestPath,
    skills,
    passCount,
    failCount: skills.length - passCount,
  };
}
