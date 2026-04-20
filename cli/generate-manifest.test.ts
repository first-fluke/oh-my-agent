import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createManifest, REPOSITORY_URL } from "./generate-manifest.js";

function readJson(path: URL) {
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

describe("package metadata", () => {
  it("should publish the renamed CLI package metadata", () => {
    const cliPackage = readJson(new URL("./package.json", import.meta.url));

    expect(cliPackage.name).toBe("oh-my-agent");
    expect(cliPackage.repository).toEqual({
      type: "git",
      url: REPOSITORY_URL,
    });
    expect(cliPackage.keywords).toEqual(
      expect.arrayContaining([
        "oh-my-agent",
        "claude",
        "claude-code",
        "codex",
        "cursor",
        "chatgpt",
      ]),
    );
  });

  it("should keep the workspace package aligned with the renamed project", () => {
    const workspacePackage = readJson(
      new URL("../package.json", import.meta.url),
    );

    expect(workspacePackage.name).toBe("oh-my-agent-workspace");
    const cliPackage = readJson(new URL("./package.json", import.meta.url));
    expect(workspacePackage.version).toBe(cliPackage.version);
  });
});

describe("manifest metadata", () => {
  it("should generate manifest metadata with the renamed repository", () => {
    const manifest = createManifest({
      version: "2.0.0",
      releaseDate: "2026-03-13T05:25:55.005Z",
      skillCount: 12,
      workflowCount: 11,
      files: [
        {
          path: ".agents/skills/example/SKILL.md",
          sha256: "abc123",
          size: 42,
        },
      ],
    });

    expect(manifest).toMatchObject({
      name: "oh-my-agent",
      version: "2.0.0",
      releaseDate: "2026-03-13T05:25:55.005Z",
      repository: REPOSITORY_URL,
      checksums: {
        algorithm: "sha256",
      },
      metadata: {
        skillCount: 12,
        workflowCount: 11,
        totalFiles: 1,
      },
    });
  });
});
