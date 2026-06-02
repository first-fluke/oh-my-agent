#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import http from "node:http";
import https from "node:https";
import { homedir } from "node:os";
import { basename, join } from "node:path";

// AgentMemory's published version line moved from 0.11/0.12 (original design
// target) to 0.9.x service builds; accept 0.9.x and the 0.1x.x range.
const SUPPORTED = /^0\.(9|1\d)\./;

function endpointUrl(): string | null {
  if (process.env.OMA_NO_AGENTMEMORY === "1") return null;
  if (process.env.AGENTMEMORY_URL) return process.env.AGENTMEMORY_URL;

  const endpointPath = join(homedir(), ".agentmemory", "endpoint.json");
  if (!existsSync(endpointPath)) return null;

  try {
    const cfg = JSON.parse(readFileSync(endpointPath, "utf-8")) as {
      port?: number;
      url?: string;
    };
    if (typeof cfg.port === "number") return `http://127.0.0.1:${cfg.port}`;
    if (typeof cfg.url === "string" && cfg.url.trim()) return cfg.url;
    return null;
  } catch {
    return null;
  }
}

let reachable: boolean | null = null;

function requestAgentMemory(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  } = {},
): Promise<{ statusCode: number; headers: IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(path, baseUrl);
    const client = target.protocol === "https:" ? https : http;
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      reject(new Error(`unsupported protocol ${target.protocol}`));
      return;
    }

    const body = options.body;
    const headers = { ...(options.headers ?? {}) };
    if (body !== undefined && headers["content-length"] === undefined) {
      headers["content-length"] = String(Buffer.byteLength(body));
    }

    const req = client.request(
      target,
      {
        method: options.method ?? "GET",
        headers,
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: responseBody,
          });
        });
        res.on("error", reject);
      },
    );
    req.setTimeout(options.timeoutMs ?? 500, () => {
      req.destroy(new Error("request timed out"));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

export async function isAgentMemoryReachable(): Promise<boolean> {
  if (reachable !== null) return reachable;
  const url = endpointUrl();
  if (!url) {
    reachable = false;
    return reachable;
  }

  try {
    const response = await requestAgentMemory(url, "/agentmemory/health");
    if (response.statusCode < 200 || response.statusCode >= 300) {
      reachable = false;
      return reachable;
    }
    const headerVersion = response.headers["x-agentmemory-version"];
    const version = Array.isArray(headerVersion)
      ? headerVersion[0]
      : headerVersion;
    // Recent AgentMemory releases expose the version only in the health body,
    // not the `x-agentmemory-version` header.
    let isAgentMemory = false;
    let bodyVersion: string | undefined;
    try {
      const parsed = JSON.parse(response.body) as {
        service?: unknown;
        status?: unknown;
        version?: unknown;
      };
      isAgentMemory =
        parsed.service === "agentmemory" ||
        parsed.status === "healthy" ||
        parsed.status === "ok";
      if (typeof parsed.version === "string") bodyVersion = parsed.version;
    } catch {
      // Non-JSON body — fall back to the header check below.
    }
    const resolvedVersion = version ?? bodyVersion;
    reachable =
      isAgentMemory ||
      (resolvedVersion !== undefined && SUPPORTED.test(resolvedVersion));
    return reachable;
  } catch {
    reachable = false;
    return reachable;
  }
}

export async function observeWithTimeout(payload: {
  sessionId: string;
  content: string;
  source: string;
  projectDir?: string;
}): Promise<boolean> {
  if (!(await isAgentMemoryReachable())) return false;
  const url = endpointUrl();
  if (!url) return false;

  try {
    // AgentMemory's /observe expects a hook-event envelope
    // (hookType, sessionId, project, cwd, timestamp) carrying the content.
    const cwd = payload.projectDir ?? process.cwd();
    const response = await requestAgentMemory(url, "/agentmemory/observe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hookType: payload.source,
        sessionId: payload.sessionId,
        project: basename(cwd),
        cwd,
        timestamp: new Date().toISOString(),
        content: payload.content,
      }),
    });
    return response.statusCode >= 200 && response.statusCode < 300;
  } catch {
    return false;
  }
}
