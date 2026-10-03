import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_HTML, RECAP_HTML } from "./dashboard/templates.js";
import {
  DEFAULT_DASHBOARD_PORT,
  resolveDashboardPort,
  startDashboard,
} from "./dashboard.js";

async function httpGet(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: string }> {
  const res = await fetch(url, { headers });
  return { status: res.status, body: await res.text() };
}

describe("resolveDashboardPort", () => {
  it("returns the default port when unset", () => {
    expect(resolveDashboardPort(undefined)).toBe(DEFAULT_DASHBOARD_PORT);
  });

  it("parses a valid DASHBOARD_PORT", () => {
    expect(resolveDashboardPort("9848")).toBe(9848);
  });

  it("throws on invalid ports", () => {
    expect(() => resolveDashboardPort("abc")).toThrow(/Invalid DASHBOARD_PORT/);
    expect(() => resolveDashboardPort("0")).toThrow(/Invalid DASHBOARD_PORT/);
  });
});

describe("dashboard templates", () => {
  it("configures Tailwind via tailwind.config", () => {
    expect(DASHBOARD_HTML).toContain("tailwind.config=");
    expect(RECAP_HTML).toContain("tailwind.config=");
    expect(DASHBOARD_HTML).not.toContain("tailwindcss.config");
    expect(RECAP_HTML).not.toContain("tailwindcss.config");
  });

  it("checks API responses before rendering dashboard state", () => {
    expect(DASHBOARD_HTML).toContain(
      "if(!r.ok)throw new Error('unauthorized')",
    );
  });

  it("validates recap payloads before rendering", () => {
    expect(RECAP_HTML).toContain("if(!res.ok)");
    expect(RECAP_HTML).toContain("Array.isArray(rawData.entries)");
  });
});

async function httpGetFull(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: string; headers: Headers }> {
  const res = await fetch(url, { headers });
  return { status: res.status, body: await res.text(), headers: res.headers };
}

describe("dashboard /api/recap top parameter", () => {
  let memoriesDir = "";
  let dashboard: Awaited<ReturnType<typeof startDashboard>> | undefined;

  beforeEach(() => {
    memoriesDir = mkdtempSync(join(tmpdir(), "oma-dashboard-test-"));
    vi.stubEnv("MEMORIES_DIR", memoriesDir);
    vi.stubEnv(
      "DASHBOARD_PORT",
      String(40_000 + Math.floor(Math.random() * 5_000)),
    );
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
  });

  it("rejects a non-finite top value with 400", async () => {
    dashboard = startDashboard();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await httpGet(
      `http://${dashboard.host}:${dashboard.port}/api/recap?top=abc`,
      { "X-OMA-Dashboard-Token": dashboard.token },
    );
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toMatchObject({ error: /finite/i });
  });
});

describe("dashboard HTML security headers", () => {
  let memoriesDir = "";
  let dashboard: Awaited<ReturnType<typeof startDashboard>> | undefined;

  beforeEach(() => {
    memoriesDir = mkdtempSync(join(tmpdir(), "oma-dashboard-test-"));
    vi.stubEnv("MEMORIES_DIR", memoriesDir);
    vi.stubEnv(
      "DASHBOARD_PORT",
      String(45_000 + Math.floor(Math.random() * 5_000)),
    );
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
  });

  it("sets security headers on the root HTML page", async () => {
    dashboard = startDashboard();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await httpGetFull(
      `http://${dashboard.host}:${dashboard.port}/`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("content-security-policy")).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
  });

  it("sets security headers on the /recap HTML page", async () => {
    dashboard = startDashboard();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await httpGetFull(
      `http://${dashboard.host}:${dashboard.port}/recap`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("content-security-policy")).toContain("connect-src");
  });
});

describe("startDashboard", () => {
  let memoriesDir = "";
  let dashboard: Awaited<ReturnType<typeof startDashboard>> | undefined;

  beforeEach(() => {
    memoriesDir = mkdtempSync(join(tmpdir(), "oma-dashboard-test-"));
    vi.stubEnv("MEMORIES_DIR", memoriesDir);
    vi.stubEnv(
      "DASHBOARD_PORT",
      String(30_000 + Math.floor(Math.random() * 10_000)),
    );
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
  });

  it("serves HTML with an injected auth token", async () => {
    dashboard = startDashboard();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const page = await httpGet(`http://${dashboard.host}:${dashboard.port}/`);
    expect(page.status).toBe(200);
    expect(page.body).toContain("OMA Memory Dashboard");
    expect(page.body).toContain(
      `window.__OMA_DASHBOARD_TOKEN__=${JSON.stringify(dashboard.token)}`,
    );
  });

  it("requires auth for /api/state", async () => {
    dashboard = startDashboard();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const unauthorized = await httpGet(
      `http://${dashboard.host}:${dashboard.port}/api/state`,
    );
    expect(unauthorized.status).toBe(401);

    const authorized = await httpGet(
      `http://${dashboard.host}:${dashboard.port}/api/state`,
      { "X-OMA-Dashboard-Token": dashboard.token },
    );
    expect(authorized.status).toBe(200);
    expect(JSON.parse(authorized.body)).toMatchObject({
      session: { id: "N/A", status: "UNKNOWN" },
    });
  });
});

/** node:http (not fetch) so a test can present a DNS-rebound Host header. */
function rawGet(
  port: number,
  path: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

/** Attempt a WebSocket upgrade; resolves 101 on success, else the HTTP status. */
function tryUpgrade(
  port: number,
  path: string,
  headers: Record<string, string>,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request({
      host: "127.0.0.1",
      port,
      path,
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": randomBytes(16).toString("base64"),
        ...headers,
      },
    });
    req.on("upgrade", (_res, socket) => {
      socket.destroy();
      resolve(101);
    });
    req.on("response", (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.end();
  });
}

describe("dashboard loopback request gate", () => {
  let memoriesDir = "";
  let dashboard: Awaited<ReturnType<typeof startDashboard>> | undefined;

  beforeEach(() => {
    memoriesDir = mkdtempSync(join(tmpdir(), "oma-dashboard-test-"));
    vi.stubEnv("MEMORIES_DIR", memoriesDir);
    vi.stubEnv(
      "DASHBOARD_PORT",
      String(50_000 + Math.floor(Math.random() * 5_000)),
    );
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
  });

  it("never serves the token-bearing page to a DNS-rebound Host", async () => {
    dashboard = startDashboard();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const rebound = `rebind.evil.example:${dashboard.port}`;

    const page = await rawGet(dashboard.port, "/", { Host: rebound });
    expect(page.status).toBe(421);
    expect(page.body).not.toContain(dashboard.token);

    // Even with a leaked token the API refuses a foreign Host.
    for (const path of ["/api/state", "/api/recap?window=1d&top=1"]) {
      const api = await rawGet(dashboard.port, path, {
        Host: rebound,
        "X-OMA-Dashboard-Token": dashboard.token,
      });
      expect(api.status).toBe(421);
    }
  });

  it("rejects API calls from a foreign Origin", async () => {
    dashboard = startDashboard();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await rawGet(dashboard.port, "/api/state", {
      Host: `127.0.0.1:${dashboard.port}`,
      Origin: "https://evil.example",
      "X-OMA-Dashboard-Token": dashboard.token,
    });
    expect(res.status).toBe(403);
  });

  it("gates the WebSocket upgrade on Host, Origin, and token", async () => {
    dashboard = startDashboard();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const port = dashboard.port;
    const path = `/?token=${encodeURIComponent(dashboard.token)}`;
    const host = `127.0.0.1:${port}`;

    expect(
      await tryUpgrade(port, path, { Host: `rebind.evil.example:${port}` }),
    ).toBe(421);
    expect(
      await tryUpgrade(port, path, {
        Host: host,
        Origin: "https://evil.example",
      }),
    ).toBe(403);
    expect(await tryUpgrade(port, "/?token=wrong", { Host: host })).toBe(401);
    expect(
      await tryUpgrade(port, path, { Host: host, Origin: `http://${host}` }),
    ).toBe(101);
  });
});

describe("dashboard project directory", () => {
  let projectDir = "";
  let dashboard: Awaited<ReturnType<typeof startDashboard>> | undefined;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-dashboard-project-"));
    vi.stubEnv("MEMORIES_DIR", "");
    vi.stubEnv(
      "DASHBOARD_PORT",
      String(55_000 + Math.floor(Math.random() * 5_000)),
    );
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("watches the given project, not a path taken from argv", () => {
    // `oma dashboard web` leaves the subcommand name at argv[3].
    const argv = process.argv;
    process.argv = [argv[0] ?? "node", "cli.js", "dashboard", "web"];
    try {
      dashboard = startDashboard({ projectDir });
    } finally {
      process.argv = argv;
    }
    expect(dashboard.memoriesDir).toBe(
      join(projectDir, ".agents", "state", "memories"),
    );
    expect(existsSync(dashboard.memoriesDir)).toBe(true);
    expect(existsSync(join(process.cwd(), "web", ".agents"))).toBe(false);
  });
});
