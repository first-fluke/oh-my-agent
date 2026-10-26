import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mergeRulesIndexForVendor } from "../../platform/rules.js";
import { registerWebSearch, webSearch } from "./web.js";

let root: string;
const originalExitCode = process.exitCode;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-brave-command-"));
  mkdirSync(join(root, ".agents"));
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "providers: {web: brave}\n",
  );
  vi.stubEnv("BRAVE_SEARCH_API_KEY", "synthetic-cli-token");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      web: { results: [{ url: "https://example.com", title: "Example" }] },
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.exitCode = originalExitCode;
  rmSync(root, { recursive: true, force: true });
});

it("executes the configured Brave adapter through the actual CLI handler", async () => {
  vi.spyOn(process, "cwd").mockReturnValue(root);
  const output = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = new Command();
  registerWebSearch(program);
  await program.parseAsync([
    "node",
    "search",
    "web",
    "typed adapters",
    "--limit",
    "2",
    "--json",
  ]);
  expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toMatchObject({
    provider: "brave",
    sources: [{ url: "https://example.com" }],
  });
  expect(fetch).toHaveBeenCalledOnce();
});

it("allows per-request Brave override without changing the native default", async () => {
  writeFileSync(join(root, ".agents", "oma-config.yaml"), "language: en\n");
  await expect(webSearch("test", { projectDir: root })).rejects.toThrow(
    "no CLI adapter",
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(
    (await webSearch("test", { projectDir: root, provider: "brave" })).provider,
  ).toBe("brave");
  expect(readFileSync(join(root, ".agents", "oma-config.yaml"), "utf8")).toBe(
    "language: en\n",
  );
});

it("executes a configured Exa provider through the CLI handler", async () => {
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "providers: {web: exa}\n",
  );
  vi.stubEnv("EXA_API_KEY", "synthetic-exa-cli-token");
  vi.mocked(fetch).mockResolvedValue(
    Response.json({
      results: [
        {
          url: "https://example.com/exa",
          title: "Exa result",
          publishedDate: "2026-01-01T00:00:00Z",
          highlights: ["Relevant excerpt"],
        },
      ],
    }),
  );
  vi.spyOn(process, "cwd").mockReturnValue(root);
  const output = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = new Command();
  registerWebSearch(program);
  await program.parseAsync([
    "node",
    "search",
    "web",
    "typed adapters",
    "--limit",
    "25",
  ]);
  expect(JSON.parse(String(output.mock.calls[0]?.[0]))).toMatchObject({
    provider: "exa",
    capability: "web",
    sources: [
      {
        url: "https://example.com/exa",
        excerpt: "Relevant excerpt",
        publishedAt: "2026-01-01T00:00:00Z",
      },
    ],
  });
  expect(fetch).toHaveBeenCalledOnce();
});

it("allows an Exa request override without rewriting the native selection", async () => {
  writeFileSync(join(root, ".agents", "oma-config.yaml"), "language: en\n");
  vi.stubEnv("EXA_API_KEY", "synthetic-exa-cli-token");
  vi.mocked(fetch).mockResolvedValue(Response.json({ results: [] }));
  expect(
    (await webSearch("test", { projectDir: root, provider: "exa" })).provider,
  ).toBe("exa");
  expect(readFileSync(join(root, ".agents", "oma-config.yaml"), "utf8")).toBe(
    "language: en\n",
  );
});

it.each([NaN, 0, 120001])(
  "rejects invalid timeout %s before a request",
  async (timeoutMs) => {
    await expect(
      webSearch("test", { projectDir: root, timeoutMs }),
    ).rejects.toThrow("timeout");
    expect(fetch).not.toHaveBeenCalled();
  },
);

it.each([
  ["brave", "Brave Search"],
  ["exa", "Exa Search"],
])(
  "projects %s routing for agents and removes it when switching back",
  (provider, label) => {
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      `providers: {web: ${provider}}\n`,
    );
    mergeRulesIndexForVendor(root, "codex");
    const path = join(root, "AGENTS.md");
    expect(readFileSync(path, "utf8")).toContain(
      'oma search web "query" --json',
    );
    expect(readFileSync(path, "utf8")).toContain(
      "Use Context7 for library documentation",
    );
    expect(readFileSync(path, "utf8")).toContain(`${label} is the selected`);
    expect(readFileSync(path, "utf8")).toContain("only for known URLs");
    writeFileSync(
      join(root, ".agents", "oma-config.yaml"),
      "providers: {web: native}\n",
    );
    mergeRulesIndexForVendor(root, "codex");
    expect(readFileSync(path, "utf8")).not.toContain(
      `${label} is the selected`,
    );
  },
);
