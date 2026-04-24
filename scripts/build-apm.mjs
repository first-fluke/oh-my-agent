#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const skillsSrc = join(repoRoot, ".agents", "skills");
const skillsDst = join(repoRoot, ".apm", "skills");
const versionFile = join(skillsSrc, "_version.json");
const apmYmlPath = join(repoRoot, "apm.yml");

const version = JSON.parse(readFileSync(versionFile, "utf-8")).version;

rmSync(skillsDst, { recursive: true, force: true });
mkdirSync(skillsDst, { recursive: true });

const trackedOutput = execFileSync(
  "git",
  ["ls-files", "-z", "--", ".agents/skills"],
  { cwd: repoRoot, encoding: "utf-8" },
);
const trackedFiles = trackedOutput.split("\0").filter(Boolean);

const skillSet = new Set();
let copied = 0;
for (const tracked of trackedFiles) {
  const relToSkills = relative(".agents/skills", tracked);
  const [top, ...rest] = relToSkills.split("/");
  if (!top || top.startsWith("_") || top.startsWith(".") || rest.length === 0)
    continue;
  skillSet.add(top);
  const dst = join(skillsDst, top, ...rest);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(repoRoot, tracked), dst);
  copied += 1;
}

const apmYml = readFileSync(apmYmlPath, "utf-8");
const nextApmYml = apmYml.replace(/^version:\s*.+$/m, `version: ${version}`);
if (nextApmYml !== apmYml) writeFileSync(apmYmlPath, nextApmYml);

console.log(
  `[build-apm] synced ${skillSet.size} skill(s), ${copied} file(s) at version ${version}`,
);
