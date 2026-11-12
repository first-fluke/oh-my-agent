import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  kiroHome,
  kiroWorkspaceId,
  kiroWorkspaceRoot,
  trustKiroWorkspace,
} from "./trust.js";

describe.skipIf(process.platform === "win32")("kiroHome", () => {
  it("uses an absolute KIRO_HOME outside HOME, else ~/.kiro", () => {
    expect(kiroHome({}, "/Users/me")).toBe("/Users/me/.kiro");
    expect(kiroHome({ KIRO_HOME: "/opt/kiro" }, "/Users/me")).toBe("/opt/kiro");
    expect(kiroHome({ KIRO_HOME: "relative" }, "/Users/me")).toBe(
      "/Users/me/.kiro",
    );
    expect(kiroHome({ KIRO_HOME: "/Users" }, "/Users/me")).toBe(
      "/Users/me/.kiro",
    );
  });
});

describe.skipIf(process.platform === "win32")("trustKiroWorkspace", () => {
  let dir: string;
  let home: string;
  let project: string;
  let userHome: string;

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "oma-kiro-trust-")));
    home = join(dir, ".kiro");
    project = join(dir, "project");
    userHome = join(dir, "user");
    mkdirSync(home);
    mkdirSync(project);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("ids a workspace by the first 16 hex of sha256(realpath)", () => {
    expect(kiroWorkspaceRoot(`${project}/`)).toBe(project);
    expect(kiroWorkspaceId(project)).toBe(
      createHash("sha256").update(project).digest("hex").slice(0, 16),
    );
  });

  it("merges workspaceTrusted into the workspace permissions file", () => {
    const wsDir = join(home, "workspace-roots", kiroWorkspaceId(project));
    mkdirSync(wsDir, { recursive: true });
    const yamlPath = join(wsDir, "permissions.yaml");
    writeFileSync(yamlPath, "# my rules\nrules:\n  - allow: fs_read\n");

    expect(trustKiroWorkspace(home, project, userHome)).toEqual({
      changed: true,
      alreadyTrusted: false,
    });
    const text = readFileSync(yamlPath, "utf-8");
    expect(text).toContain("# my rules");
    expect(text).toContain("- allow: fs_read");
    expect(text).toContain("workspaceTrusted: true");
    expect(statSync(yamlPath).mode & 0o777).toBe(0o600);
    expect(trustKiroWorkspace(home, project, userHome).alreadyTrusted).toBe(
      true,
    );
  });

  it("creates the file when absent, never trusts HOME, keeps a denial", () => {
    expect(trustKiroWorkspace(home, project, userHome).changed).toBe(true);
    expect(
      existsSync(
        join(
          home,
          "workspace-roots",
          kiroWorkspaceId(project),
          "permissions.yaml",
        ),
      ),
    ).toBe(true);

    expect(trustKiroWorkspace(home, project, project).changed).toBe(false);

    const other = join(dir, "other");
    mkdirSync(other);
    const wsDir = join(home, "workspace-roots", kiroWorkspaceId(other));
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, "permissions.yaml"), "workspaceTrusted: false\n");
    expect(trustKiroWorkspace(home, other, userHome).changed).toBe(false);
  });
});
