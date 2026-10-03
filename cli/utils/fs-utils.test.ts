import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveProjectRoot } from "./fs-utils.js";

// resolveProjectRoot walks up to the filesystem root, so a marker at any
// ancestor of the temp root — e.g. /tmp/.git left by a parallel vitest worker
// on Linux CI, where os.tmpdir() === "/tmp" — leaks into the walk and breaks
// the no-marker test. Confine existsSync to the test's own tree so the walk
// sees a marker-free world above it, regardless of shared machine state.
let markerScope: string | null = null;

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const existsSync: typeof actual.existsSync = (p) => {
    if (markerScope !== null && !String(p).startsWith(markerScope)) {
      return false;
    }
    return actual.existsSync(p);
  };
  return { ...actual, existsSync, default: { ...actual, existsSync } };
});

/** An OMA install: `.agents/` holding a config marker, not just runtime output. */
function install(dir: string, marker = "oma-config.yaml"): void {
  const file = join(dir, ".agents", marker);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, "language: en\n");
}

describe("resolveProjectRoot", () => {
  let root: string;

  beforeEach(() => {
    // realpathSync to normalize macOS /var -> /private/var so equality holds.
    root = realpathSync(mkdtempSync(join(tmpdir(), "oma-project-root-")));
    markerScope = root;
  });

  afterEach(() => {
    markerScope = null;
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("walks up from a monorepo sub-package to the `.agents/` project root", () => {
    // Regression: `oma state:emit` (and siblings) run with cwd inside e.g.
    // apps/api used to anchor state on the bare cwd, materializing a stray
    // apps/api/.agents/ instead of writing to the repo-level .agents/.
    install(root);
    const subPackage = join(root, "apps", "api");
    mkdirSync(subPackage, { recursive: true });

    expect(resolveProjectRoot(subPackage)).toBe(root);
  });

  it("prefers the `.agents/` root over a deeper `.git` boundary", () => {
    install(root);
    mkdirSync(join(root, ".git"), { recursive: true });
    const nested = join(root, "packages", "i18n");
    mkdirSync(nested, { recursive: true });

    expect(resolveProjectRoot(nested)).toBe(root);
  });

  it("falls back to the `.git` repo root when no `.agents/` exists yet", () => {
    mkdirSync(join(root, ".git"), { recursive: true });
    const nested = join(root, "apps", "web");
    mkdirSync(nested, { recursive: true });

    expect(resolveProjectRoot(nested)).toBe(root);
  });

  it("never escapes a sub-repo `.git` boundary into a parent `.agents/`", () => {
    // Parent has .agents; a nested git submodule has its own .git but no
    // .agents. Resolution must stop at the submodule, not leak state into the
    // parent project root.
    install(root);
    const submodule = join(root, "vendor", "lib");
    mkdirSync(join(submodule, ".git"), { recursive: true });
    const deep = join(submodule, "src");
    mkdirSync(deep, { recursive: true });

    expect(resolveProjectRoot(deep)).toBe(submodule);
  });

  it("returns the start dir unchanged when no marker is found", () => {
    const bare = join(root, "loose", "dir");
    mkdirSync(bare, { recursive: true });

    expect(resolveProjectRoot(bare)).toBe(bare);
  });

  it("treats a sub-package with its own install as the project root", () => {
    mkdirSync(join(root, ".git"), { recursive: true });
    install(root);
    const app = join(root, "apps", "x");
    install(app, "oma-config.local.yaml");
    mkdirSync(join(app, "src"), { recursive: true });
    mkdirSync(join(root, "apps", "y", "src"), { recursive: true });

    expect(resolveProjectRoot(join(app, "src"))).toBe(app);
    expect(resolveProjectRoot(join(root, "apps", "y", "src"))).toBe(root);
  });

  it("accepts skills/_version.json as an install marker", () => {
    mkdirSync(join(root, ".git"), { recursive: true });
    const app = join(root, "apps", "x");
    install(app, join("skills", "_version.json"));

    expect(resolveProjectRoot(app)).toBe(app);
  });

  it("ignores a marker-less `.agents/` (stray runtime output)", () => {
    // e.g. cli/.agents/{state,backup} written by a run from cli/: not an
    // install, so it must not capture state or config away from the repo.
    mkdirSync(join(root, ".git"), { recursive: true });
    install(root);
    const cli = join(root, "cli");
    mkdirSync(join(cli, ".agents", "state"), { recursive: true });
    mkdirSync(join(cli, ".agents", "backup"), { recursive: true });
    mkdirSync(join(cli, "commands"), { recursive: true });

    expect(resolveProjectRoot(join(cli, "commands"))).toBe(root);
  });

  it("does not adopt the global install in the home directory outside a repo", () => {
    const home = join(root, "home");
    install(home);
    const scratch = join(home, "scratch", "notes");
    mkdirSync(scratch, { recursive: true });
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);

    expect(resolveProjectRoot(scratch)).toBe(scratch);
    expect(resolveProjectRoot(home)).toBe(home);
  });

  it("still finds a project install below the home directory", () => {
    const home = join(root, "home");
    install(home);
    const project = join(home, "projects", "app");
    install(project);
    mkdirSync(join(project, "src"), { recursive: true });
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);

    expect(resolveProjectRoot(join(project, "src"))).toBe(project);
  });
});
