import { spawn } from "node:child_process";
import type { FetchContext, FetchResult } from "./types.js";

/**
 * Code search — wraps `gh search code` / `glab api`. Returns the
 * tool's raw JSON output; the caller is responsible for parsing.
 */

export interface CodeSearchOptions {
  host?: "github" | "gitlab";
  language?: string;
  repo?: string;
  limit?: number;
}

async function runCmd(
  bin: string,
  args: string[],
  ctx: FetchContext,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const onAbort = () => child.kill("SIGTERM");
    ctx.signal?.addEventListener("abort", onAbort);
    child.on("close", (code) => {
      ctx.signal?.removeEventListener("abort", onAbort);
      resolve({ code, stdout, stderr });
    });
    child.on("error", (err) => {
      ctx.signal?.removeEventListener("abort", onAbort);
      resolve({
        code: -1,
        stdout,
        stderr: `${stderr}\nspawn_error:${err.message}`,
      });
    });
  });
}

export async function codeSearch(
  query: string,
  ctx: FetchContext,
  options: CodeSearchOptions = {},
): Promise<FetchResult> {
  const host = options.host ?? "github";
  const limit = options.limit ?? 20;
  const started = performance.now();

  if (host === "gitlab") {
    const params = new URLSearchParams({
      scope: "blobs",
      search: query,
      per_page: String(limit),
    });
    const { code, stdout, stderr } = await runCmd(
      "glab",
      ["api", `/search?${params.toString()}`],
      ctx,
    );
    return makeResult(
      "gitlab",
      query,
      code,
      stdout,
      stderr,
      performance.now() - started,
    );
  }

  const args = [
    "search",
    "code",
    query,
    "--limit",
    String(limit),
    "--json",
    "repository,path,url,textMatches",
  ];
  if (options.language) args.push("--language", options.language);
  if (options.repo) args.push("--repo", options.repo);

  const { code, stdout, stderr } = await runCmd("gh", args, ctx);
  return makeResult(
    "github",
    query,
    code,
    stdout,
    stderr,
    performance.now() - started,
  );
}

function makeResult(
  host: "github" | "gitlab",
  query: string,
  code: number | null,
  stdout: string,
  stderr: string,
  elapsed: number,
): FetchResult {
  const elapsedMs = Math.round(elapsed);
  if (code === null || code !== 0) {
    const normalized = stderr.trim();
    if (/command not found|ENOENT/i.test(normalized)) {
      return {
        url: `search:${host}:${query}`,
        status: "error",
        strategy: "api",
        platform: `${host}-cli`,
        content: "",
        elapsedMs,
        signals: [],
        error:
          host === "github"
            ? "GitHub CLI (gh) not installed. https://cli.github.com/"
            : "GitLab CLI (glab) not installed. https://gitlab.com/gitlab-org/cli",
      };
    }
    if (/rate limit/i.test(normalized)) {
      return {
        url: `search:${host}:${query}`,
        status: "blocked",
        strategy: "api",
        platform: `${host}-cli`,
        content: "",
        elapsedMs,
        signals: [{ kind: "rate-limit", detail: normalized }],
        error: normalized,
      };
    }
    return {
      url: `search:${host}:${query}`,
      status: "error",
      strategy: "api",
      platform: `${host}-cli`,
      content: "",
      elapsedMs,
      signals: [],
      error: normalized || `${host} cli exited ${code}`,
    };
  }
  return {
    url: `search:${host}:${query}`,
    status: "ok",
    strategy: "api",
    platform: `${host}-cli`,
    content: stdout.trim(),
    contentType: "application/json",
    elapsedMs,
    signals: [],
  };
}
