import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { sha256Hex } from "../../utils/hash.js";
import { isPathInside } from "./paths.js";
import type { HarnessSuite } from "./types.js";

function hashTree(root: string): string {
  if (!existsSync(root)) return sha256Hex("");
  const entries: Array<{ path: string; hash: string }> = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const absolute = join(current, entry.name);
      if (
        entry.isDirectory() &&
        ["node_modules", ".venv"].includes(entry.name)
      ) {
        continue;
      }
      if (lstatSync(absolute).isSymbolicLink()) {
        const target = readlinkSync(absolute);
        if (
          isAbsolute(target) ||
          !isPathInside(root, resolve(dirname(absolute), target))
        ) {
          throw new Error(`Cannot hash escaping symbolic link: ${absolute}`);
        }
        entries.push({
          path: relative(root, absolute).split(sep).join("/"),
          hash: sha256Hex(`symlink:${target}`),
        });
        continue;
      }
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        entries.push({
          path: relative(root, absolute).split(sep).join("/"),
          hash: sha256Hex(readFileSync(absolute)),
        });
      }
    }
  };
  visit(root);
  return sha256Hex(JSON.stringify(entries));
}

export function computeSuiteHash(suite: HarnessSuite): string {
  const taskInputs = suite.tasks.map((task) => ({
    id: task.id,
    prompt: task.prompt,
    weight: task.weight,
    checks: task.checks,
    workspaceHash: hashTree(task.workspace),
  }));
  return sha256Hex(
    JSON.stringify({
      schemaVersion: suite.schemaVersion,
      id: suite.id,
      agent: suite.agent,
      tasks: taskInputs,
    }),
  );
}

export function computeBaselineHash(projectRoot: string): string {
  const agentsRoot = join(projectRoot, ".agents");
  const inputs = ["agents", "config", "rules", "skills", "workflows"]
    .map((name) => [name, hashTree(join(agentsRoot, name))] as const)
    .concat([
      [
        "oma-config.yaml",
        existsSync(join(agentsRoot, "oma-config.yaml"))
          ? sha256Hex(readFileSync(join(agentsRoot, "oma-config.yaml")))
          : sha256Hex(""),
      ],
    ]);
  return sha256Hex(JSON.stringify(inputs));
}
