import { existsSync, mkdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { renderPattern } from "./naming.js";

export interface ResolveOutDirArgs {
  outFlag?: string;
  allowExternal: boolean;
  defaultBase: string;
  runId: { timestamp: string; shortid: string };
  compare: boolean;
  singleFolderPattern: string;
  compareFolderPattern: string;
  cwd?: string;
}

export function resolveOutDir(args: ResolveOutDirArgs): string {
  const cwd = args.cwd ?? process.cwd();
  const folderPattern = args.compare
    ? args.compareFolderPattern
    : args.singleFolderPattern;
  const resolved = args.outFlag
    ? path.resolve(cwd, args.outFlag)
    : path.resolve(
        cwd,
        args.defaultBase,
        renderPattern(folderPattern, args.runId),
      );

  const absCwd = canonical(cwd);
  const absOut = canonical(resolved);
  if (!args.allowExternal && !isWithin(absOut, absCwd)) {
    throw new Error(
      `--out path "${args.outFlag ?? resolved}" is outside $PWD. Use --allow-external-out to override.`,
    );
  }
  mkdirSync(resolved, { recursive: true });
  return resolved;
}

function canonical(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    if (existsSync(p)) return p;
    const parent = path.dirname(p);
    if (parent === p) return p;
    return path.join(canonical(parent), path.basename(p));
  }
}

function isWithin(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
