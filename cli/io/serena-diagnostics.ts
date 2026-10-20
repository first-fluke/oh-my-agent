import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { http } from "./http.js";
import { readRegistry } from "./serena-daemon/registry.js";

export interface FileDiagnostic {
  severity: "Error" | "Warning";
  message: string;
  line: number;
  column: number;
  code?: string | number;
  source?: string;
}

export interface DiagnosticProvider {
  identity: string;
  read(path: string, signal: AbortSignal): Promise<FileDiagnostic[]>;
  close?(signal: AbortSignal): Promise<void>;
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Reject truncated/malformed results; they must never become a clean baseline. */
export function parseFileDiagnostics(
  value: unknown,
  path: string,
): FileDiagnostic[] {
  if (!record(value)) throw new Error("Invalid diagnostic response");
  const result: FileDiagnostic[] = [];
  for (const [file, grouped] of Object.entries(value)) {
    if (file !== path || !record(grouped))
      throw new Error("Unexpected diagnostic scope");
    for (const [severity, symbols] of Object.entries(grouped)) {
      if (!record(symbols)) throw new Error("Invalid diagnostic groups");
      for (const entries of Object.values(symbols)) {
        if (!Array.isArray(entries)) throw new Error("Invalid diagnostics");
        for (const entry of entries) {
          const start =
            record(entry) && record(entry.range)
              ? entry.range.start
              : undefined;
          if (
            !record(entry) ||
            typeof entry.message !== "string" ||
            !record(start) ||
            !Number.isSafeInteger(start.line) ||
            !Number.isSafeInteger(start.character) ||
            (start.line as number) < 0 ||
            (start.character as number) < 0
          )
            throw new Error("Invalid diagnostic location");
          if (severity !== "Error" && severity !== "Warning") continue;
          result.push({
            severity,
            message: entry.message,
            line: (start.line as number) + 1,
            column: (start.character as number) + 1,
            ...(typeof entry.code === "string" || typeof entry.code === "number"
              ? { code: entry.code }
              : {}),
            ...(typeof entry.source === "string"
              ? { source: entry.source }
              : {}),
          });
        }
      }
    }
  }
  return result;
}

function parseRpc(raw: string): Record<string, unknown> {
  // Streamable HTTP may interleave JSON-RPC notifications with its response.
  const messages = !raw.trimStart().startsWith("{")
    ? raw.split(/\r?\n\r?\n/).flatMap((event) => {
        const data = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) return [];
        try {
          return [JSON.parse(data) as unknown];
        } catch {
          return [];
        }
      })
    : [JSON.parse(raw) as unknown];
  const message = messages.findLast(
    (item) => record(item) && ("result" in item || "error" in item),
  );
  if (!record(message) || message.error || !record(message.result))
    throw new Error("Invalid diagnostics RPC response");
  return message.result;
}

/** Existing project daemon only: this path never starts a service or language server. */
export function existingSerenaDiagnostics(
  root: string,
): DiagnosticProvider | null {
  let canonical: string;
  try {
    canonical = realpathSync(root);
  } catch {
    return null;
  }
  const daemon = Object.values(readRegistry()).find((entry) => {
    try {
      const matches =
        entry &&
        resolve(entry.root) === canonical &&
        entry.context === "oma" &&
        Number.isInteger(entry.port) &&
        entry.port > 0 &&
        entry.port <= 65535 &&
        Number.isSafeInteger(entry.pid) &&
        entry.pid > 0;
      if (!matches) return false;
      process.kill(entry.pid, 0);
      return true;
    } catch {
      return false;
    }
  });
  if (!daemon) return null;
  const url = `http://127.0.0.1:${daemon.port}/mcp`;
  let session: string | undefined;
  let initialized = false;
  let nextId = 1;
  const headers = () => ({
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    ...(session ? { "mcp-session-id": session } : {}),
  });
  async function post(body: Record<string, unknown>, signal: AbortSignal) {
    const response = await http.post(url, body, {
      signal,
      timeout: 10_000,
      proxy: false,
      headers: headers(),
      responseType: "text",
      transformResponse: [(data: unknown) => data],
      maxContentLength: 256 * 1024,
    });
    const id = response.headers["mcp-session-id"];
    if (typeof id === "string") session = id;
    return response.data as string;
  }
  return {
    identity: `${daemon.pid}:${daemon.port}:${daemon.startedAt}`,
    async read(path, signal) {
      if (!initialized) {
        parseRpc(
          await post(
            {
              jsonrpc: "2.0",
              id: nextId++,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "oma-diagnostic-feedback", version: "1" },
              },
            },
            signal,
          ),
        );
        await post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          signal,
        );
        initialized = true;
      }
      const result = parseRpc(
        await post(
          {
            jsonrpc: "2.0",
            id: nextId++,
            method: "tools/call",
            params: {
              name: "get_diagnostics_for_file",
              arguments: { relative_path: path, min_severity: 2 },
            },
          },
          signal,
        ),
      );
      if (result.isError) throw new Error("Diagnostics tool failed");
      const content = result.content;
      const text = Array.isArray(content)
        ? content.find((item) => record(item) && item.type === "text")?.text
        : undefined;
      const value =
        result.structuredContent ??
        (typeof text === "string" ? (JSON.parse(text) as unknown) : undefined);
      return parseFileDiagnostics(value, path);
    },
    async close(signal) {
      if (!session) return;
      await http.delete(url, {
        headers: headers(),
        signal,
        timeout: 10_000,
        proxy: false,
        validateStatus: () => true,
      });
    },
  };
}
