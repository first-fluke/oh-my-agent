import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { RetroSnapshot } from "./types.js";

function getRetroDir(cwd: string): string {
  return join(cwd, ".serena", "retrospectives");
}

export function saveSnapshot(cwd: string, snapshot: RetroSnapshot): string {
  const dir = getRetroDir(cwd);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const dateStr = snapshot.date.split("T")[0] || snapshot.date;
  const existing = readdirSync(dir).filter((file) =>
    file.startsWith(dateStr),
  ).length;
  const filename = `${dateStr}-${existing + 1}.json`;
  const filepath = join(dir, filename);

  writeFileSync(filepath, JSON.stringify(snapshot, null, 2), "utf-8");
  return filepath;
}

export function loadPreviousSnapshot(cwd: string): RetroSnapshot | null {
  const dir = getRetroDir(cwd);
  if (!existsSync(dir)) return null;

  try {
    const files = readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const content = readFileSync(join(dir, files[0] || ""), "utf-8");
    const parsed = JSON.parse(content);
    if (parsed.metrics) return parsed as RetroSnapshot;
    return null;
  } catch {
    return null;
  }
}
