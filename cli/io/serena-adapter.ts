import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DART_PROJECT_TOOL = "get_dart_project_diagnostics";
// Source: cli/io -> cli/assets. Bundle: cli/bin -> cli/assets.
export const SERENA_ASSETS = fileURLToPath(
  new URL("../assets/serena/", import.meta.url),
);

export interface SerenaAdapterStatus {
  status: "ready" | "missing" | "unsupported" | "unavailable" | "error";
  python?: string;
  revision?: string;
  version?: string;
  changed?: boolean;
  error?: string;
}

/** Follow the actual Serena entrypoint, not the system Python's packages. */
export function serenaPython(): string | undefined {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (
      process.platform === "win32" &&
      existsSync(join(directory, "serena.exe"))
    ) {
      const python = join(directory, "python.exe");
      return existsSync(python) ? python : undefined;
    }
    const executable = join(directory, "serena");
    if (!existsSync(executable)) continue;
    const firstLine = readFileSync(executable, "utf8").split("\n")[0] ?? "";
    const interpreter = firstLine.startsWith("#!")
      ? firstLine.slice(2).trim()
      : "";
    if (
      interpreter &&
      !interpreter.includes("/env ") &&
      existsSync(interpreter)
    ) {
      return interpreter;
    }
    return undefined;
  }
  const candidate = join(
    homedir(),
    ".local/share/uv/tools/serena-agent",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python3",
  );
  return existsSync(candidate) ? candidate : undefined;
}

export function ensureSerenaAdapter(checkOnly = false): SerenaAdapterStatus {
  try {
    const python = serenaPython();
    if (!python)
      return {
        status: "unavailable",
        error: "Serena's Python interpreter was not found",
      };
    const raw = execFileSync(
      python,
      [join(SERENA_ASSETS, "install.py"), ...(checkOnly ? ["--check"] : [])],
      {
        encoding: "utf8",
        timeout: 15_000,
        maxBuffer: 32_768,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const result = JSON.parse(raw) as SerenaAdapterStatus;
    if (!["ready", "missing", "unsupported", "error"].includes(result.status)) {
      throw new Error("Invalid adapter installer response");
    }
    return { ...result, python };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
