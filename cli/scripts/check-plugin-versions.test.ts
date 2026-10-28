import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DOMAIN_PRESETS } from "../platform/domain-presets.js";
import { checkPluginVersions } from "./check-plugin-versions.mjs";

const roots: string[] = [];
const repoRoot = resolve(import.meta.dirname, "../..");
const domainPaths = Object.keys(DOMAIN_PRESETS).flatMap((domain) => [
  `.claude-plugin/domains/${domain}/plugin.json`,
  `.claude-plugin/domains/${domain}/.claude-plugin/plugin.json`,
]);

function write(root: string, file: string, value: unknown) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), JSON.stringify(value));
}

function fixture(version = "20.20.0") {
  const root = mkdtempSync(join(tmpdir(), "oma-plugin-release-versions-"));
  roots.push(root);
  const config = JSON.parse(
    readFileSync(join(repoRoot, "release-please-config.json"), "utf8"),
  );
  const files = [
    "package.json",
    "cli/package.json",
    ".agents/skills/_version.json",
    ".claude-plugin/plugin.json",
    "plugin.json",
    ".cursor-plugin/plugin.json",
    ...domainPaths,
  ];
  for (const file of files) write(root, file, { version });
  write(root, ".claude-plugin/marketplace.json", { metadata: { version } });
  write(root, "release-please-config.json", config);
  return { root, config };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("plugin release version propagation", () => {
  it("accepts the current release with all native updater registrations", () => {
    expect(checkPluginVersions(fixture().root)).toEqual([]);
  });

  it.each(domainPaths)(
    "rejects a stale %s despite normalized emit comparison",
    (file) => {
      const { root } = fixture();
      write(root, file, { version: "20.19.0" });
      expect(checkPluginVersions(root)).toEqual([
        `${file}: expected version 20.20.0, found "20.19.0"`,
      ]);
    },
  );

  it.each(["20.21.0", "21.0.0-rc.1"])(
    "accepts a consistently bumped release %s",
    (version) => {
      expect(checkPluginVersions(fixture(version).root)).toEqual([]);
    },
  );

  it("rejects native manifests omitted from the release updater", () => {
    const { root, config } = fixture();
    const omitted = domainPaths[0];
    config.packages["."]["extra-files"] = config.packages["."][
      "extra-files"
    ].filter((entry: { path: string }) => entry.path !== omitted);
    write(root, "release-please-config.json", config);
    expect(checkPluginVersions(root)).toContain(
      `release-please-config.json: missing JSON version updater for ${omitted} ($.version)`,
    );
  });

  it("rejects an updater pointed at the wrong JSON field", () => {
    const { root, config } = fixture();
    const target = config.packages["."]["extra-files"].find(
      (entry: { path: string }) => entry.path === domainPaths[0],
    );
    target.jsonpath = "$.metadata.version";
    write(root, "release-please-config.json", config);
    expect(checkPluginVersions(root)).toContain(
      `release-please-config.json: missing JSON version updater for ${domainPaths[0]} ($.version)`,
    );
  });

  it.each(["missing", "invalid"])(
    "fails closed for a %s domain manifest",
    (kind) => {
      const { root } = fixture();
      const file = domainPaths[0] as string;
      if (kind === "missing") rmSync(join(root, file));
      else writeFileSync(join(root, file), "{ invalid");
      expect(checkPluginVersions(root)).toContain(
        `${file}: missing, unreadable or invalid JSON`,
      );
    },
  );

  it("rejects root and CLI version disagreement", () => {
    const { root } = fixture();
    write(root, "cli/package.json", { version: "20.19.0" });
    expect(checkPluginVersions(root)).toContain(
      'cli/package.json: expected version 20.20.0, found "20.19.0"',
    );
  });
});
