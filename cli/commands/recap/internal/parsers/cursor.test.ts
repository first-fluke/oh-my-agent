import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  extractMessageContent,
  extractUserPrompt,
  projectSlugToName,
  projectSlugToPath,
  readStoreViaSqlite3Cli,
  workspacePathToProjectName,
} from "./cursor.js";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawnSync: vi.fn(),
  };
});

const tempHome = vi.hoisted(
  () => `/tmp/oma-cursor-home-${Date.now()}-${Math.random()}`,
);

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: () => tempHome };
});

function mockSpawnResult(
  overrides: Partial<ReturnType<typeof spawnSync>> = {},
): ReturnType<typeof spawnSync> {
  return {
    stdout: "",
    stderr: "",
    status: 0,
    error: undefined,
    pid: 1234,
    signal: null,
    output: [],
    ...overrides,
  } as ReturnType<typeof spawnSync>;
}

describe("projectSlugToName", () => {
  it("derives repo name from Users-* project slugs", () => {
    expect(projectSlugToName("Users-alice-Documents-oh-my-agent")).toBe(
      "oh-my-agent",
    );
  });

  it("derives workspace name from private-tmp-* slugs", () => {
    expect(projectSlugToName("private-tmp-oma-cursor-c25-work")).toBe(
      "oma-cursor-c25-work",
    );
  });
});

describe("projectSlugToPath", () => {
  it("reconstructs Documents workspace paths", () => {
    expect(projectSlugToPath("Users-alice-Documents-oh-my-agent")).toBe(
      "/Users/alice/Documents/oh-my-agent",
    );
  });

  it("reconstructs private tmp workspace paths", () => {
    expect(projectSlugToPath("private-tmp-oma-cursor-c25-work")).toBe(
      "/private/tmp/oma-cursor-c25-work",
    );
  });
});

describe("workspacePathToProjectName", () => {
  it("uses the final path segment as the project label", () => {
    expect(workspacePathToProjectName("/private/tmp/oma-cursor-c25-work")).toBe(
      "oma-cursor-c25-work",
    );
  });
});

describe("extractUserPrompt", () => {
  it("extracts text from user_query tags", () => {
    expect(
      extractUserPrompt(
        "<user_query>\nDOES CHANGES FITS CURSOR-AGENT? REVIEW IT\n</user_query>",
      ),
    ).toBe("DOES CHANGES FITS CURSOR-AGENT? REVIEW IT");
  });

  it("returns null for user_info payloads", () => {
    expect(
      extractUserPrompt("<user_info>OS Version: darwin</user_info>"),
    ).toBeNull();
  });
});

describe("extractMessageContent", () => {
  it("returns plain string content", () => {
    expect(extractMessageContent("hello")).toBe("hello");
  });

  it("joins Cursor array content parts", () => {
    expect(
      extractMessageContent([
        { type: "text", text: "<user_query>\nFix the bug\n</user_query>" },
      ]),
    ).toBe("<user_query>\nFix the bug\n</user_query>");
  });

  it("returns null for unsupported content shapes", () => {
    expect(extractMessageContent(null)).toBeNull();
    expect(extractMessageContent([{ type: "image", data: "abc" }])).toBeNull();
  });
});

describe("readStoreViaSqlite3Cli", () => {
  it("parses meta and JSON blobs from sqlite3 CLI output", () => {
    const meta = {
      name: "Demo Agent",
      createdAt: 1_700_000_000_000,
      lastUsedModel: "composer-2.5",
    };
    const userBlob = JSON.stringify({
      role: "user",
      content: [{ type: "text", text: "<user_query>hello</user_query>" }],
    });

    vi.mocked(spawnSync).mockImplementation((command, args) => {
      if (command !== "sqlite3") {
        return mockSpawnResult({ status: 1, pid: 0 });
      }

      const sql = Array.isArray(args) ? String(args.at(-1) ?? "") : "";
      if (sql.includes("FROM meta")) {
        return mockSpawnResult({
          stdout: `${Buffer.from(JSON.stringify(meta)).toString("hex")}\n`,
        });
      }

      if (sql.includes("FROM blobs")) {
        return mockSpawnResult({
          stdout: JSON.stringify([
            { data_hex: Buffer.from(userBlob).toString("hex") },
          ]),
        });
      }

      return mockSpawnResult({ status: 1, pid: 0 });
    });

    const store = readStoreViaSqlite3Cli(
      "/Users/test/.cursor/chats/a2ee2df981bfe5c88ad458b83d0db51c/session/store.db",
    );
    expect(store?.meta.name).toBe("Demo Agent");
    expect(store?.messages).toEqual([
      { role: "user", content: "<user_query>hello</user_query>" },
    ]);
  });

  it("extracts workspace path from user_info blobs", () => {
    const userInfo =
      "<user_info>Workspace Path: /private/tmp/oma-cursor-c25-work</user_info>";

    vi.mocked(spawnSync).mockImplementation((command, args) => {
      if (command !== "sqlite3") {
        return mockSpawnResult({ status: 1, pid: 0 });
      }

      const sql = Array.isArray(args) ? String(args.at(-1) ?? "") : "";
      if (sql.includes("FROM meta")) {
        return mockSpawnResult({
          stdout: `${Buffer.from(JSON.stringify({ name: "New Agent", createdAt: 1_700_000_000_000 })).toString("hex")}\n`,
        });
      }

      if (sql.includes("FROM blobs")) {
        return mockSpawnResult({
          stdout: JSON.stringify([
            { data_hex: Buffer.from(userInfo).toString("hex") },
          ]),
        });
      }

      return mockSpawnResult({ status: 1, pid: 0 });
    });

    const store = readStoreViaSqlite3Cli(
      "/Users/test/.cursor/chats/a2ee2df981bfe5c88ad458b83d0db51c/session/store.db",
    );
    expect(store?.workspacePath).toBe("/private/tmp/oma-cursor-c25-work");
    expect(store?.chatHash).toBe("a2ee2df981bfe5c88ad458b83d0db51c");
  });
});

describe("cursor raw parser", async () => {
  const { getParsers } = await import("../registry.js");
  await import("./cursor.js");
  const parser = getParsers().find((p) => p.name === "cursor");

  it("imports only transcript rows with exact timestamps", async () => {
    rmSync(join(tempHome, ".cursor"), { recursive: true, force: true });
    const ts = new Date("2026-05-29T00:00:00.000Z").getTime();
    const transcriptDir = join(
      tempHome,
      ".cursor",
      "projects",
      "Users-alice-Documents-oh-my-agent",
      "agent-transcripts",
      "cursor-session-1",
    );
    const transcriptPath = join(transcriptDir, "cursor-session-1.jsonl");
    mkdirSync(transcriptDir, { recursive: true });
    writeFileSync(
      transcriptPath,
      [
        JSON.stringify({
          role: "user",
          timestamp: new Date(ts).toISOString(),
          message: {
            content: [
              {
                type: "text",
                text: "<user_query>fix cursor import</user_query>",
              },
            ],
          },
        }),
        JSON.stringify({
          role: "assistant",
          timestamp: new Date(ts + 1000).toISOString(),
          message: { content: [{ type: "text", text: "fixed" }] },
        }),
        JSON.stringify({
          role: "user",
          message: {
            content: [
              { type: "text", text: "<user_query>missing ts</user_query>" },
            ],
          },
        }),
      ].join("\n"),
      "utf-8",
    );

    const result = await parser?.parseRaw?.(ts - 10_000, ts + 10_000);
    const raw = Array.isArray(result)
      ? { turns: result, warnings: [] }
      : result;

    expect(raw?.turns).toHaveLength(2);
    expect(raw?.turns[0]).toMatchObject({
      vendor: "cursor",
      role: "user",
      text: "fix cursor import",
      sourcePath: transcriptPath,
      vendorSessionId: "cursor-session-1",
      project: "oh-my-agent",
    });
    expect(raw?.turns[1]).toMatchObject({
      role: "assistant",
      text: "fixed",
      sourcePath: transcriptPath,
    });
    expect(raw?.warnings[0]).toContain("without exact timestamps");
    rmSync(join(tempHome, ".cursor"), { recursive: true, force: true });
  });
});
