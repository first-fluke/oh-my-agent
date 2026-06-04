import { existsSync, mkdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { renderPattern, type VideoRunId } from "./naming.js";

export interface ResolveVideoRunDirArgs {
  outFlag?: string;
  allowExternal: boolean;
  defaultBase: string;
  runId: VideoRunId;
  singleFolderPattern: string;
  cwd?: string;
}

export function resolveVideoRunDir(args: ResolveVideoRunDirArgs): string {
  const cwd = args.cwd ?? process.cwd();
  const base = args.outFlag
    ? path.resolve(cwd, args.outFlag)
    : path.resolve(cwd, args.defaultBase);
  const resolved = path.resolve(
    base,
    renderPattern(args.singleFolderPattern, {
      timestamp: args.runId.timestamp,
      shortid: args.runId.shortid,
      mode: args.runId.mode,
    }),
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
