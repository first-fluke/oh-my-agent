import type { Command } from "commander";
import color from "picocolors";
import { codeSearch } from "./code.js";
import { fetchMedia } from "./media.js";
import { metadataFromUrl, parseMetadata } from "./metadata.js";
import { runPipeline } from "./pipeline.js";
import { discoverFeed, googleNewsRss, parseFeed } from "./rss.js";
import {
  apiKeywordSearch,
  apiStrategy,
  findHandler,
} from "./strategies/api/index.js";
import { archiveStrategy } from "./strategies/archive.js";
import { findChromeExecutable } from "./strategies/browser.js";
import { trustScore } from "./trust.js";
import type { FetchContext, FetchResult, Strategy } from "./types.js";

const VALID_STRATEGIES: Strategy[] = [
  "api",
  "probe",
  "impersonate",
  "browser",
  "archive",
];

function parseStrategyList(value?: string): Strategy[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = parts.filter(
    (p) => !VALID_STRATEGIES.includes(p as Strategy),
  );
  if (invalid.length > 0) {
    throw new Error(
      `Unknown strategy: ${invalid.join(", ")}. Valid: ${VALID_STRATEGIES.join(", ")}`,
    );
  }
  return parts as Strategy[];
}

function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }
}

function buildContext(opts: {
  timeout?: string;
  locale?: string;
}): FetchContext {
  const timeoutMs = opts.timeout
    ? Math.max(1000, Math.floor(Number(opts.timeout) * 1000))
    : 15000;
  return {
    timeoutMs,
    locale: opts.locale ?? "en-US,en;q=0.9",
  };
}

function printResult(result: unknown, pretty: boolean) {
  if (pretty) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(JSON.stringify(result));
  }
}

function attachExitCode(result: FetchResult | null): void {
  if (!result) {
    process.exitCode = 1;
    return;
  }
  if (result.status === "ok") process.exitCode = 0;
  else if (result.status === "blocked") process.exitCode = 2;
  else if (result.status === "not-found") process.exitCode = 3;
  else if (result.status === "invalid-input") process.exitCode = 4;
  else if (result.status === "auth-required") process.exitCode = 5;
  else if (result.status === "timeout") process.exitCode = 6;
  else process.exitCode = 1;
}

export function registerSearchCommand(program: Command): void {
  const search = program
    .command("search")
    .description(
      "Mechanical search primitives — fetch, meta, rss, media, trust, code",
    )
    .alias("s");

  search
    .command("fetch <url>")
    .description("Fetch URL via auto-escalating strategy pipeline")
    .option("--only <strategies>", "Comma-separated strategies to run")
    .option("--skip <strategies>", "Comma-separated strategies to skip")
    .option("--include-archive", "Include archive strategy as last fallback")
    .option("--timeout <seconds>", "Per-strategy timeout", "15")
    .option("--locale <value>", "Accept-Language header", "en-US,en;q=0.9")
    .option("--pretty", "Pretty-print JSON output")
    .action(
      async (
        urlArg: string,
        opts: {
          only?: string;
          skip?: string;
          includeArchive?: boolean;
          timeout?: string;
          locale?: string;
          pretty?: boolean;
        },
      ) => {
        try {
          const url = parseUrl(urlArg);
          const ctx = buildContext(opts);
          const result = await runPipeline(url, ctx, {
            only: parseStrategyList(opts.only),
            skip: parseStrategyList(opts.skip),
            includeArchive: opts.includeArchive,
          });
          printResult(result, Boolean(opts.pretty));
          attachExitCode(result);
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  search
    .command("api <url>")
    .description("Fetch via matched platform API (Phase 0)")
    .option("--timeout <seconds>", "Timeout", "15")
    .option("--locale <value>", "Accept-Language", "en-US,en;q=0.9")
    .option("--pretty", "Pretty-print JSON")
    .action(
      async (
        urlArg: string,
        opts: { timeout?: string; locale?: string; pretty?: boolean },
      ) => {
        try {
          const url = parseUrl(urlArg);
          const handler = findHandler(url);
          if (!handler) {
            console.error(
              color.yellow(`No API handler matches host ${url.hostname}`),
            );
            process.exitCode = 3;
            return;
          }
          const ctx = buildContext(opts);
          const result = await apiStrategy(url, ctx);
          if (!result) {
            process.exitCode = 3;
            return;
          }
          printResult(result, Boolean(opts.pretty));
          attachExitCode(result);
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  search
    .command("api:search <query>")
    .description("Fan-out keyword search across platforms that support it")
    .option("--platforms <list>", "Comma-separated platform ids")
    .option("--timeout <seconds>", "Timeout", "15")
    .option("--locale <value>", "Accept-Language", "en-US,en;q=0.9")
    .option("--pretty", "Pretty-print JSON")
    .action(
      async (
        query: string,
        opts: {
          platforms?: string;
          timeout?: string;
          locale?: string;
          pretty?: boolean;
        },
      ) => {
        const ctx = buildContext(opts);
        const platforms = opts.platforms
          ? opts.platforms
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
        const results = await apiKeywordSearch(query, ctx, platforms);
        printResult(results, Boolean(opts.pretty));
      },
    );

  search
    .command("meta <url>")
    .description("Extract OGP / JSON-LD / Schema.org from URL")
    .option("--timeout <seconds>", "Timeout", "15")
    .option("--locale <value>", "Accept-Language", "en-US,en;q=0.9")
    .option("--pretty", "Pretty-print JSON")
    .action(
      async (
        urlArg: string,
        opts: { timeout?: string; locale?: string; pretty?: boolean },
      ) => {
        try {
          const url = parseUrl(urlArg);
          const ctx = buildContext(opts);
          const result = await metadataFromUrl(url, ctx);
          const { content: _content, ...rest } = result;
          void _content;
          printResult(rest, Boolean(opts.pretty));
          attachExitCode(result);
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  search
    .command("rss <url>")
    .description("Discover and parse RSS/Atom feed for a URL")
    .option("--timeout <seconds>", "Timeout", "15")
    .option("--locale <value>", "Accept-Language", "en-US,en;q=0.9")
    .option("--pretty", "Pretty-print JSON")
    .action(
      async (
        urlArg: string,
        opts: { timeout?: string; locale?: string; pretty?: boolean },
      ) => {
        try {
          const url = parseUrl(urlArg);
          const ctx = buildContext(opts);
          const result = await discoverFeed(url, ctx);
          const { content: _content, ...rest } = result;
          void _content;
          printResult(rest, Boolean(opts.pretty));
          attachExitCode(result);
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  search
    .command("rss:google <query>")
    .description("Build Google News RSS URL for a query")
    .option("--locale <value>", "Locale (e.g., ko-KR)", "en-US")
    .action((query: string, opts: { locale?: string }) => {
      const url = googleNewsRss(query, opts.locale ?? "en-US");
      console.log(url);
    });

  search
    .command("media <url>")
    .description("Extract media metadata via yt-dlp (1858 sites)")
    .option("--subs", "Write subtitles")
    .option("--sub-lang <list>", "Subtitle languages (comma-separated)", "en")
    .option("--format <spec>", "yt-dlp format spec")
    .option("--timeout <seconds>", "Timeout", "30")
    .option("--pretty", "Pretty-print JSON")
    .action(
      async (
        urlArg: string,
        opts: {
          subs?: boolean;
          subLang?: string;
          format?: string;
          timeout?: string;
          pretty?: boolean;
        },
      ) => {
        try {
          const url = parseUrl(urlArg);
          const ctx = buildContext(opts);
          const subLangs = opts.subLang
            ? opts.subLang
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined;
          const result = await fetchMedia(url, ctx, {
            subtitles: opts.subs,
            ...(subLangs ? { subLangs } : {}),
            ...(opts.format ? { format: opts.format } : {}),
          });
          printResult(result, Boolean(opts.pretty));
          attachExitCode(result);
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  search
    .command("archive <url>")
    .description("Fetch via AMP / archive.today / Wayback")
    .option("--timeout <seconds>", "Timeout", "15")
    .option("--locale <value>", "Accept-Language", "en-US,en;q=0.9")
    .option("--pretty", "Pretty-print JSON")
    .action(
      async (
        urlArg: string,
        opts: { timeout?: string; locale?: string; pretty?: boolean },
      ) => {
        try {
          const url = parseUrl(urlArg);
          const ctx = buildContext(opts);
          const result = await archiveStrategy(url, ctx);
          printResult(result, Boolean(opts.pretty));
          attachExitCode(result);
        } catch (err) {
          console.error(color.red((err as Error).message));
          process.exitCode = 1;
        }
      },
    );

  search
    .command("trust <domain>")
    .description("Resolve trust level / score for a domain")
    .option("--pretty", "Pretty-print JSON")
    .action(async (domain: string, opts: { pretty?: boolean }) => {
      const result = await trustScore(domain.toLowerCase());
      printResult(result, Boolean(opts.pretty));
    });

  search
    .command("code <query>")
    .description("Search code via gh / glab")
    .option("--host <github|gitlab>", "Host", "github")
    .option("--language <lang>", "Language filter")
    .option("--repo <owner/repo>", "Scope to a repo")
    .option("--limit <n>", "Max results", "20")
    .option("--pretty", "Pretty-print JSON")
    .action(
      async (
        query: string,
        opts: {
          host?: string;
          language?: string;
          repo?: string;
          limit?: string;
          pretty?: boolean;
        },
      ) => {
        const host =
          opts.host === "gitlab" || opts.host === "github"
            ? (opts.host as "github" | "gitlab")
            : "github";
        const ctx = buildContext({});
        const result = await codeSearch(query, ctx, {
          host,
          ...(opts.language ? { language: opts.language } : {}),
          ...(opts.repo ? { repo: opts.repo } : {}),
          ...(opts.limit ? { limit: Number.parseInt(opts.limit, 10) } : {}),
        });
        printResult(result, Boolean(opts.pretty));
        attachExitCode(result);
      },
    );

  search
    .command("doctor")
    .description("Check dependencies (Chrome, python3 curl_cffi, yt-dlp, gh)")
    .action(async () => {
      const checks: Array<{
        name: string;
        ok: boolean;
        detail: string;
      }> = [];

      const chrome = findChromeExecutable();
      checks.push({
        name: "chrome",
        ok: Boolean(chrome),
        detail: chrome ?? "Install Chrome or set OMA_CHROME_PATH",
      });

      checks.push(await checkBinary("python3", ["--version"]));
      checks.push(await checkCurlCffi());
      checks.push(await checkBinary("yt-dlp", ["--version"]));
      checks.push(await checkBinary("gh", ["--version"]));

      for (const check of checks) {
        const mark = check.ok ? color.green("✓") : color.yellow("!");
        console.log(`${mark} ${check.name}: ${check.detail}`);
      }
      if (checks.some((c) => !c.ok)) process.exitCode = 1;
    });
}

export { parseFeed, parseMetadata };

async function checkBinary(
  bin: string,
  args: string[],
): Promise<{ name: string; ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    const { spawn } =
      require("node:child_process") as typeof import("node:child_process");
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on("error", () =>
      resolve({ name: bin, ok: false, detail: "not found" }),
    );
    child.on("close", (code: number | null) => {
      if (code === 0) resolve({ name: bin, ok: true, detail: out.trim() });
      else resolve({ name: bin, ok: false, detail: `exit code ${code}` });
    });
  });
}

async function checkCurlCffi(): Promise<{
  name: string;
  ok: boolean;
  detail: string;
}> {
  return new Promise((resolve) => {
    const { spawn } =
      require("node:child_process") as typeof import("node:child_process");
    const child = spawn(
      "python3",
      ["-c", "import curl_cffi; print(curl_cffi.__version__)"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on("error", () =>
      resolve({
        name: "curl_cffi",
        ok: false,
        detail: "python3 not found",
      }),
    );
    child.on("close", (code: number | null) => {
      if (code === 0)
        resolve({
          name: "curl_cffi",
          ok: true,
          detail: `v${out.trim()}`,
        });
      else
        resolve({
          name: "curl_cffi",
          ok: false,
          detail: "not installed (pip install curl_cffi)",
        });
    });
  });
}
