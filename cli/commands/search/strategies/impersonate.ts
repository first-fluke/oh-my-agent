import { spawn } from "node:child_process";
import { detectSignals, hasJsEssential } from "../signals.js";
import type {
  FetchContext,
  FetchResult,
  HttpResponse,
  SignalHit,
} from "../types.js";
import { classifyStatus, errorResult } from "./api/helpers.js";

/**
 * TLS impersonation strategy — wraps a Python curl_cffi subprocess.
 * Target priority: safari → chrome → firefox (Korean sites prefer
 * safari). JS-essential markers cause early exit from TLS attempts;
 * the pipeline then escalates to the browser strategy.
 */

const IMPERSONATE_TARGETS = ["safari", "chrome", "firefox"] as const;
type Target = (typeof IMPERSONATE_TARGETS)[number];

const KR_HINT_HOSTS = [
  "coupang.com",
  "fmkorea.com",
  "dcinside.com",
  "clien.net",
  "naver.com",
  "daum.net",
  "tistory.com",
  "kakao.com",
];

const PYTHON_SCRIPT = `
import json, sys, os
try:
    from curl_cffi import requests
except ImportError:
    print(json.dumps({"error": "curl_cffi_not_installed"}))
    sys.exit(0)

from urllib.parse import urlparse

url = os.environ["OMA_IMPERSONATE_URL"]
target = os.environ["OMA_IMPERSONATE_TARGET"]
locale = os.environ.get("OMA_IMPERSONATE_LOCALE", "en-US,en;q=0.9")
timeout_ms = int(os.environ.get("OMA_IMPERSONATE_TIMEOUT", "15000"))
timeout = max(timeout_ms / 1000.0, 1.0)

origin = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
primary = locale.split(",")[0] or "en-US"
lang = primary.split("-")[0]
accept_lang = locale if ";q=" in locale else f"{primary},{lang};q=0.9"

session = requests.Session(impersonate=target)
session.headers.update({
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": accept_lang,
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.google.com/",
})

# Identity warmup — visit homepage to pick up cookies and set realistic Referer.
try:
    session.get(origin, timeout=min(timeout, 10.0))
except Exception:
    pass
session.headers["Referer"] = origin

try:
    resp = session.get(url, timeout=timeout, allow_redirects=True)
except Exception as err:
    print(json.dumps({"error": f"request_failed:{err}"}))
    sys.exit(0)

headers = {}
for k, v in resp.headers.items():
    headers.setdefault(k.lower(), v)
set_cookie = resp.headers.get("set-cookie")
if set_cookie:
    headers["set-cookie"] = set_cookie

print(json.dumps({
    "status": resp.status_code,
    "url": resp.url,
    "headers": headers,
    "body": resp.text,
    "encoding": resp.encoding,
    "target": target,
}))
`;

interface ImpersonateResult {
  error?: string;
  status?: number;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  encoding?: string;
  target?: Target;
}

function pythonBinary(): string {
  return process.env.OMA_PYTHON ?? "python3";
}

function orderTargets(hostname: string): Target[] {
  if (KR_HINT_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
    return ["safari", "chrome", "firefox"];
  }
  return ["chrome", "safari", "firefox"];
}

async function runPython(
  url: URL,
  target: Target,
  ctx: FetchContext,
): Promise<ImpersonateResult> {
  return new Promise((resolve) => {
    const child = spawn(pythonBinary(), ["-c", PYTHON_SCRIPT], {
      env: {
        ...process.env,
        OMA_IMPERSONATE_URL: url.toString(),
        OMA_IMPERSONATE_TARGET: target,
        OMA_IMPERSONATE_LOCALE: ctx.locale,
        OMA_IMPERSONATE_TIMEOUT: String(ctx.timeoutMs),
      },
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
    const onAbort = () => {
      child.kill("SIGTERM");
    };
    ctx.signal?.addEventListener("abort", onAbort);
    child.on("close", (code) => {
      ctx.signal?.removeEventListener("abort", onAbort);
      if (code !== 0 && !stdout) {
        resolve({
          error: `python_exit:${code}:${stderr.trim().slice(0, 200)}`,
        });
        return;
      }
      const trimmed = stdout.trim();
      if (!trimmed) {
        resolve({ error: "empty_stdout" });
        return;
      }
      try {
        resolve(JSON.parse(trimmed) as ImpersonateResult);
      } catch (err) {
        resolve({
          error: `parse_error:${(err as Error).message}:${trimmed.slice(0, 200)}`,
        });
      }
    });
    child.on("error", (err) => {
      ctx.signal?.removeEventListener("abort", onAbort);
      resolve({ error: `spawn_error:${err.message}` });
    });
  });
}

function toHttpResponse(
  parsed: ImpersonateResult,
  fallbackUrl: string,
  elapsedMs: number,
): HttpResponse {
  const headers = new Headers();
  if (parsed.headers) {
    for (const [k, v] of Object.entries(parsed.headers)) {
      try {
        headers.set(k, v);
      } catch {
        // skip invalid header names
      }
    }
  }
  return {
    ok: (parsed.status ?? 0) >= 200 && (parsed.status ?? 0) < 400,
    status: parsed.status ?? 0,
    headers,
    url: parsed.url ?? fallbackUrl,
    text: parsed.body ?? "",
    elapsedMs,
    redirected: (parsed.url ?? fallbackUrl) !== fallbackUrl,
  };
}

export async function impersonateStrategy(
  url: URL,
  ctx: FetchContext,
): Promise<FetchResult> {
  const targets = orderTargets(url.hostname);
  const failures: Array<{ target: Target; detail: string }> = [];
  const started = performance.now();

  for (const target of targets) {
    if (ctx.signal?.aborted) break;
    const attemptStart = performance.now();
    const parsed = await runPython(url, target, ctx);
    const attemptElapsed = Math.round(performance.now() - attemptStart);

    if (parsed.error === "curl_cffi_not_installed") {
      return errorResult({
        url: url.toString(),
        strategy: "impersonate",
        error: new Error(
          "curl_cffi is not installed. Run: pip install curl_cffi",
        ),
      });
    }
    if (parsed.error) {
      failures.push({ target, detail: parsed.error });
      continue;
    }
    const resp = toHttpResponse(parsed, url.toString(), attemptElapsed);
    const signals = detectSignals(resp);
    if (hasJsEssential(signals)) {
      // JS-essential markers — further TLS attempts are futile. Signal
      // the pipeline to jump to browser strategy.
      return {
        url: url.toString(),
        status: "blocked",
        strategy: "impersonate",
        platform: target,
        httpStatus: resp.status,
        content: resp.text,
        contentType: resp.headers.get("content-type") ?? undefined,
        elapsedMs: Math.round(performance.now() - started),
        signals,
        error: "js-essential-markers-detected",
      };
    }
    if (resp.ok && resp.text.length >= 200) {
      return {
        url: url.toString(),
        status: classifyStatus(resp, signals),
        strategy: "impersonate",
        platform: target,
        httpStatus: resp.status,
        content: resp.text,
        contentType: resp.headers.get("content-type") ?? undefined,
        elapsedMs: Math.round(performance.now() - started),
        signals,
      };
    }
    failures.push({
      target,
      detail: `status=${resp.status} size=${resp.text.length}`,
    });
  }

  const elapsedMs = Math.round(performance.now() - started);
  const detail = failures.map((f) => `${f.target}(${f.detail})`).join(" | ");
  return {
    ...errorResult({
      url: url.toString(),
      strategy: "impersonate",
      error: new Error(
        detail ? `impersonate_failed: ${detail}` : "impersonate_failed",
      ),
    }),
    elapsedMs,
    signals: [] as SignalHit[],
  };
}

export { IMPERSONATE_TARGETS };
