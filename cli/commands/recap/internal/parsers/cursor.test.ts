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

import { spawnSync } from "node:child_process";

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
    expect(
      projectSlugToPath("Users-alice-Documents-oh-my-agent"),
    ).toBe("/Users/alice/Documents/oh-my-agent");
  });

  it("reconstructs private tmp workspace paths", () => {
    expect(projectSlugToPath("private-tmp-oma-cursor-c25-work")).toBe(
      "/private/tmp/oma-cursor-c25-work",
    );
  });
});

describe("workspacePathToProjectName", () => {
  it("uses the final path segment as the project label", () => {
    expect(
      workspacePathToProjectName("/private/tmp/oma-cursor-c25-work"),
    ).toBe("oma-cursor-c25-work");
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
    expect(extractUserPrompt("<user_info>OS Version: darwin</user_info>")).toBeNull();
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
        return { status: 1, stdout: "", stderr: "", pid: 0, output: [] };
      }

      const sql = Array.isArray(args) ? String(args.at(-1) ?? "") : "";
      if (sql.includes("FROM meta")) {
        return {
          status: 0,
          stdout: `${Buffer.from(JSON.stringify(meta)).toString("hex")}\n`,
          stderr: "",
          pid: 1,
          output: [],
        } as ReturnType<typeof spawnSync>;
      }

      if (sql.includes("FROM blobs")) {
        return {
          status: 0,
          stdout: JSON.stringify([
            { data_hex: Buffer.from(userBlob).toString("hex") },
          ]),
          stderr: "",
          pid: 1,
          output: [],
        } as ReturnType<typeof spawnSync>;
      }

      return { status: 1, stdout: "", stderr: "", pid: 0, output: [] };
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
    const userInfo = "<user_info>Workspace Path: /private/tmp/oma-cursor-c25-work</user_info>";

    vi.mocked(spawnSync).mockImplementation((command, args) => {
      if (command !== "sqlite3") {
        return { status: 1, stdout: "", stderr: "", pid: 0, output: [] };
      }

      const sql = Array.isArray(args) ? String(args.at(-1) ?? "") : "";
      if (sql.includes("FROM meta")) {
        return {
          status: 0,
          stdout: `${Buffer.from(JSON.stringify({ name: "New Agent", createdAt: 1_700_000_000_000 })).toString("hex")}\n`,
          stderr: "",
          pid: 1,
          output: [],
        } as ReturnType<typeof spawnSync>;
      }

      if (sql.includes("FROM blobs")) {
        return {
          status: 0,
          stdout: JSON.stringify([
            { data_hex: Buffer.from(userInfo).toString("hex") },
          ]),
          stderr: "",
          pid: 1,
          output: [],
        } as ReturnType<typeof spawnSync>;
      }

      return { status: 1, stdout: "", stderr: "", pid: 0, output: [] };
    });

    const store = readStoreViaSqlite3Cli(
      "/Users/test/.cursor/chats/a2ee2df981bfe5c88ad458b83d0db51c/session/store.db",
    );
    expect(store?.workspacePath).toBe("/private/tmp/oma-cursor-c25-work");
    expect(store?.chatHash).toBe("a2ee2df981bfe5c88ad458b83d0db51c");
  });
});
