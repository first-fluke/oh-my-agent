// cli/commands/model/sources/cursor.ts
// Fetches model list from the Cursor CLI via `cursor agent models`
// (falls back to legacy `cursor agent --list-models`).

import { spawnSync, type SpawnSyncReturns } from "node:child_process";

export type CursorModel = {
  slug: string;
};

export type CursorResult =
  | { ok: true; models: CursorModel[] }
  | { ok: false; error: string };

const MODEL_LINE_PATTERN = /^([a-z0-9][a-z0-9.-]*) - .+$/;

const CURSOR_MODEL_COMMANDS = [
  ["models"],
  ["--list-models"],
] as const;

function parseModelLines(stdout: string): CursorModel[] {
  const models: CursorModel[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "Available models") continue;
    const match = MODEL_LINE_PATTERN.exec(trimmed);
    if (match?.[1]) {
      models.push({ slug: `cursor/${match[1]}` });
    }
  }
  return models;
}

function spawnErrorMessage(
  err: unknown,
  commandLabel: string,
): CursorResult | null {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "ENOENT") {
    return { ok: false, error: "cursor CLI not found (ENOENT)" };
  }
  return {
    ok: false,
    error:
      err instanceof Error
        ? `${commandLabel}: ${err.message}`
        : `${commandLabel}: ${String(err)}`,
  };
}

function resultFromSpawn(
  result: SpawnSyncReturns<string>,
  commandLabel: string,
): CursorResult {
  if (result.error) {
    const errCode = (result.error as NodeJS.ErrnoException).code;
    if (errCode === "ENOENT") {
      return { ok: false, error: "cursor CLI not found (ENOENT)" };
    }
    return {
      ok: false,
      error:
        result.error instanceof Error
          ? `${commandLabel}: ${result.error.message}`
          : `${commandLabel}: ${String(result.error)}`,
    };
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? String(result.stderr).trim() : "";
    return {
      ok: false,
      error: `${commandLabel} exited with status ${result.status}${stderr ? `: ${stderr}` : ""}`,
    };
  }

  const stdout = result.stdout ? String(result.stdout) : "";
  if (!stdout.trim()) {
    return { ok: false, error: `${commandLabel} returned empty output` };
  }

  const models = parseModelLines(stdout);
  if (models.length === 0) {
    return {
      ok: false,
      error: `No models found in ${commandLabel} output`,
    };
  }

  return { ok: true, models };
}

function runCursorModelsCommand(args: readonly string[]): CursorResult {
  const commandLabel = `cursor agent ${args.join(" ")}`.trim();

  let result: SpawnSyncReturns<string>;
  try {
    result = spawnSync("cursor", ["agent", ...args], {
      encoding: "utf-8",
      timeout: 15_000,
    });
  } catch (err) {
    const spawnError = spawnErrorMessage(err, commandLabel);
    if (spawnError) return spawnError;
    throw err;
  }

  return resultFromSpawn(result, commandLabel);
}

export function fetchCursorModels(): CursorResult {
  let lastError: CursorResult = {
    ok: false,
    error: "cursor CLI model listing failed",
  };

  for (const args of CURSOR_MODEL_COMMANDS) {
    const result = runCursorModelsCommand(args);
    if (result.ok) return result;
    lastError = result;
  }

  return lastError;
}
