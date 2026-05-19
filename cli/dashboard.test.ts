import { mkdtempSync } from "node:fs";
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
    expect(page.body).toContain("Serena Memory Dashboard");
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
