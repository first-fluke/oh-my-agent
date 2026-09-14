import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createManifest,
  isExcluded,
  REPOSITORY_URL,
} from "./generate-manifest.js";

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

describe("excluded patterns", () => {
  it("should exclude local runtime state from the manifest", () => {
    expect(
      isExcluded(".agents/state/sessions/oma-00mq6mk0b9w9hj319d/events.jsonl"),
    ).toBe(true);
    expect(isExcluded(".agents/state/keyword-detector-state.json")).toBe(true);
    expect(isExcluded(".agents/state/skill-sessions.json")).toBe(true);
  });

  it("should exclude skill eval fixtures and user-owned evolution files", () => {
    expect(isExcluded(".agents/eval/oma-docs/docs-broken-link.yaml")).toBe(
      true,
    );
    expect(isExcluded(".agents/evolution/optimizer.md")).toBe(true);
    expect(isExcluded(".agents/evolution/constitution.yaml")).toBe(true);
  });

  it("should exclude safe-write backups written at run time", () => {
    expect(
      isExcluded(
        ".agents/backup/safe-write/.agents__hooks.json.backup-1781793010235-9631",
      ),
    ).toBe(true);
    expect(isExcluded(".agents/backup/safe-write/.claude__settings.json")).toBe(
      true,
    );
  });

  it("should exclude vendored lockfiles but keep the tracked package.json", () => {
    expect(
      isExcluded(
        ".agents/skills/oma-video/resources/remotion/package-lock.json",
      ),
    ).toBe(true);
    expect(
      isExcluded(".agents/skills/oma-video/resources/remotion/package.json"),
    ).toBe(false);
  });

  it("should exclude the install-generated hooks.json but not hook sources", () => {
    expect(isExcluded(".agents/hooks.json")).toBe(true);
    expect(isExcluded(".agents/hooks/core/keyword-detector.ts")).toBe(false);
    expect(isExcluded(".agents/hooks/core/triggers.json")).toBe(false);
  });

  it("should not exclude shipped files whose names merely contain 'state'", () => {
    expect(isExcluded(".agents/workflows/stack-set.md")).toBe(false);
    expect(isExcluded(".agents/skills/oma-pm/resources/state-machine.md")).toBe(
      false,
    );
    expect(isExcluded(".agents/workflows/ralph.md")).toBe(false);
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
