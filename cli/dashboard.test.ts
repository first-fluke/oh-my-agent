import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { Server as HttpServer, request } from "node:http";
import { type AddressInfo, createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_HTML, RECAP_HTML } from "./dashboard/templates.js";
import { TRAJECTORY_HTML } from "./dashboard/trajectory-template.js";
import {
  DEFAULT_DASHBOARD_PORT,
  resolveDashboardPort,
  startDashboard,
} from "./dashboard.js";
import { emitEvent } from "./state/events.js";

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
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
  });

  it("rejects a non-finite top value with 400", async () => {
    dashboard = startDashboard({ port: 0 });
    await dashboard.ready;

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
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
  });

  it("sets security headers on the root HTML page", async () => {
    dashboard = startDashboard({ port: 0 });
    await dashboard.ready;

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
    dashboard = startDashboard({ port: 0 });
    await dashboard.ready;

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
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
  });

  // Regression: tests used to bind a random port from a fixed range (e.g.
  // 50000-54999) that overlaps the OS ephemeral range, where other local
  // tools listen. A collision sent the requests to the foreign server and
  // tripped the EADDRINUSE process.exit path. Port 0 lets the OS pick a free
  // port, and `ready` replaces the sleep that guessed when listen finished.
  it("binds an OS-assigned port for port 0 and reports it once ready", async () => {
    // A foreign listener already owns the port DASHBOARD_PORT names, as the
    // codex/Cursor listeners in 50000-54999 did for the old random ports.
    const foreign = createNetServer();
    await new Promise<void>((resolve) =>
      foreign.listen(0, "127.0.0.1", resolve),
    );
    const taken = (foreign.address() as AddressInfo).port;
    vi.stubEnv("DASHBOARD_PORT", String(taken));
    try {
      dashboard = startDashboard({ port: 0 });
      await dashboard.ready;
    } finally {
      await new Promise((resolve) => foreign.close(resolve));
    }

    expect(dashboard.port).toBeGreaterThan(0);
    expect(dashboard.port).not.toBe(taken);
    expect(dashboard.url).toBe(`http://127.0.0.1:${dashboard.port}/`);
    const page = await rawGet(dashboard.port, "/", {
      Host: `127.0.0.1:${dashboard.port}`,
    });
    expect(page.status).toBe(200);
    expect(page.body).toContain(dashboard.token);
  });

  it("serves HTML with an injected auth token", async () => {
    dashboard = startDashboard({ port: 0 });
    await dashboard.ready;

    const page = await httpGet(`http://${dashboard.host}:${dashboard.port}/`);
    expect(page.status).toBe(200);
    expect(page.body).toContain("OMA Memory Dashboard");
    expect(page.body).toContain(
      `window.__OMA_DASHBOARD_TOKEN__=${JSON.stringify(dashboard.token)}`,
    );
  });

  it("requires auth for /api/state", async () => {
    dashboard = startDashboard({ port: 0 });
    await dashboard.ready;

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
    // agent: false: a fresh connection per request, so no keep-alive socket
    // from an earlier test's (closed) server is ever reused.
    const req = request(
      { host: "127.0.0.1", port, path, headers, agent: false },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
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
      agent: false,
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
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
  });

  it("never serves the token-bearing page to a DNS-rebound Host", async () => {
    dashboard = startDashboard({ port: 0 });
    await dashboard.ready;
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
    dashboard = startDashboard({ port: 0 });
    await dashboard.ready;

    const res = await rawGet(dashboard.port, "/api/state", {
      Host: `127.0.0.1:${dashboard.port}`,
      Origin: "https://evil.example",
      "X-OMA-Dashboard-Token": dashboard.token,
    });
    expect(res.status).toBe(403);
  });

  it("gates the WebSocket upgrade on Host, Origin, and token", async () => {
    dashboard = startDashboard({ port: 0 });
    await dashboard.ready;
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
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("watches the given project, not a path taken from argv", async () => {
    // `oma dashboard web` leaves the subcommand name at argv[3].
    const argv = process.argv;
    process.argv = [argv[0] ?? "node", "cli.js", "dashboard", "web"];
    try {
      dashboard = startDashboard({ projectDir, port: 0 });
    } finally {
      process.argv = argv;
    }
    expect(dashboard.memoriesDir).toBe(
      join(projectDir, ".agents", "state", "memories"),
    );
    expect(existsSync(dashboard.memoriesDir)).toBe(true);
    expect(existsSync(join(process.cwd(), "web", ".agents"))).toBe(false);
    await dashboard.ready;
  });
});

describe("dashboard trajectory routes", () => {
  let projectDir = "";
  let dashboard: Awaited<ReturnType<typeof startDashboard>> | undefined;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-dashboard-trajectory-"));
    vi.stubEnv("MEMORIES_DIR", join(projectDir, "memories"));
  });

  afterEach(async () => {
    if (dashboard) {
      await dashboard.close();
      dashboard = undefined;
    }
    vi.unstubAllEnvs();
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("serves the viewer page under a CSP that needs no external host", async () => {
    dashboard = startDashboard({ projectDir, port: 0 });
    await dashboard.ready;

    const res = await httpGetFull(
      `http://${dashboard.host}:${dashboard.port}/trajectory?sid=oma-main`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-security-policy")).toContain(
      "default-src 'none'",
    );
    expect(res.body).toContain("__OMA_DASHBOARD_TOKEN__");
    expect(TRAJECTORY_HTML).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it("returns a session trajectory to an authorized client only", async () => {
    emitEvent(projectDir, "oma-main", {
      kind: "session.created",
      ts: "2026-05-25T10:00:00.000Z",
      payload: { workflow: "debug", category: "main" },
    });
    dashboard = startDashboard({ projectDir, port: 0 });
    await dashboard.ready;
    const base = `http://${dashboard.host}:${dashboard.port}`;
    const auth = { "X-OMA-Dashboard-Token": dashboard.token };

    expect((await httpGet(`${base}/api/trajectory?sid=oma-main`)).status).toBe(
      401,
    );
    expect(
      (await httpGet(`${base}/api/trajectory?sid=..%2Fsecrets`, auth)).status,
    ).toBe(400);

    const res = await httpGet(`${base}/api/trajectory?sid=oma-main`, auth);
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      sid: "oma-main",
      meta: { workflow: "debug" },
      records: [{ index: 1, kind: "oma", event: { kind: "session.created" } }],
    });

    const sessions = await httpGet(`${base}/api/trajectory/sessions`, auth);
    expect(JSON.parse(sessions.body).sessions).toMatchObject([
      { sid: "oma-main", workflow: "debug" },
    ]);
  });
});

// Regression: a bind failure other than EADDRINUSE (e.g. EACCES on a
// privileged port) used to be rethrown from the server's "error" handler. That
// surfaced as an uncaught exception with a stack trace before the callers'
// `ready` rejection handler could print "Dashboard failed to start: ...", and
// the dashboard kept its SIGINT/SIGTERM handlers and file watcher. The failure
// must now reject `ready` and release those.
describe("dashboard bind failure", () => {
  let memoriesDir = "";

  beforeEach(() => {
    memoriesDir = mkdtempSync(join(tmpdir(), "oma-dashboard-bind-"));
    vi.stubEnv("MEMORIES_DIR", memoriesDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(memoriesDir, { recursive: true, force: true });
  });

  it("rejects ready on EACCES without throwing and drops its signal handlers", async () => {
    const sigintBefore = process.listenerCount("SIGINT");
    const sigtermBefore = process.listenerCount("SIGTERM");
    vi.spyOn(HttpServer.prototype, "listen").mockImplementation(function (
      this: HttpServer,
    ) {
      process.nextTick(() => this.emit("error", eaccesError()));
      return this;
    });

    const dashboard = startDashboard({ port: 0 });

    await expect(dashboard.ready).rejects.toMatchObject({ code: "EACCES" });
    expect(process.listenerCount("SIGINT")).toBe(sigintBefore);
    expect(process.listenerCount("SIGTERM")).toBe(sigtermBefore);
  });

  it("lets recap --graph print the friendly message and exit 1", () => {
    // A real CLI process: the uncaught throw only shows up outside the runner.
    const recapModule = fileURLToPath(
      new URL("./commands/recap/run.ts", import.meta.url),
    );
    const result = runWithEaccesBind(memoriesDir, [
      `const { recap } = await import(${JSON.stringify(recapModule)});`,
      "await recap(false, { graph: true });",
    ]);

    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Dashboard failed to start: listen EACCES: permission denied",
    );
    expect(result.stderr).not.toContain("at startDashboard");
  });

  it("still fails loudly when the caller ignores ready", () => {
    // `oma dashboard web` does not observe `ready`; the rejection must not be
    // swallowed into a silent exit 0.
    const dashboardModule = fileURLToPath(
      new URL("./dashboard.ts", import.meta.url),
    );
    const result = runWithEaccesBind(memoriesDir, [
      `const { startDashboard } = await import(${JSON.stringify(dashboardModule)});`,
      "startDashboard();",
    ]);

    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("listen EACCES: permission denied");
  });
});

/** Runs `body` under bun with every http bind failing with EACCES. */
function runWithEaccesBind(dir: string, body: string[]) {
  const fixture = join(dir, "bind-eacces.ts");
  writeFileSync(
    fixture,
    [
      'import { Server } from "node:http";',
      "Server.prototype.listen = function () {",
      '  const err = Object.assign(new Error("listen EACCES: permission denied 127.0.0.1:80"), { code: "EACCES", syscall: "listen" });',
      '  process.nextTick(() => this.emit("error", err));',
      "  return this;",
      "};",
      ...body,
      "",
    ].join("\n"),
  );
  return spawnSync("bun", [fixture], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, MEMORIES_DIR: dir },
    timeout: 15_000,
  });
}

function eaccesError(): NodeJS.ErrnoException {
  return Object.assign(
    new Error("listen EACCES: permission denied 127.0.0.1:80"),
    { code: "EACCES", syscall: "listen" },
  );
}
