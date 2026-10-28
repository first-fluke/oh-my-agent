#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_PRESETS } from "../platform/domain-presets.ts";

/** Release Please updates these files alongside the root package version. */
export function pluginVersionTargets() {
  return [
    { path: "cli/package.json", jsonpath: "$.version" },
    { path: ".agents/skills/_version.json", jsonpath: "$.version" },
    { path: ".claude-plugin/plugin.json", jsonpath: "$.version" },
    { path: "plugin.json", jsonpath: "$.version" },
    { path: ".cursor-plugin/plugin.json", jsonpath: "$.version" },
    { path: ".claude-plugin/marketplace.json", jsonpath: "$.metadata.version" },
    ...Object.keys(DOMAIN_PRESETS).flatMap((domain) => [
      {
        path: `.claude-plugin/domains/${domain}/plugin.json`,
        jsonpath: "$.version",
      },
      {
        path: `.claude-plugin/domains/${domain}/.claude-plugin/plugin.json`,
        jsonpath: "$.version",
      },
    ]),
  ];
}

/** Check checked-in versions before emit drift normalizes release metadata. */
export function checkPluginVersions(repoRoot) {
  const issues = [];
  const read = (file) => {
    try {
      const value = JSON.parse(readFileSync(join(repoRoot, file), "utf8"));
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        issues.push(`${file}: expected a JSON object`);
        return undefined;
      }
      return value;
    } catch {
      issues.push(`${file}: missing, unreadable or invalid JSON`);
      return undefined;
    }
  };
  const expected = read("package.json")?.version;
  if (typeof expected !== "string" || expected.trim().length === 0) {
    issues.push("package.json: expected a non-empty release version");
    return issues;
  }
  const config = read("release-please-config.json");
  const extraFiles = config?.packages?.["."]?.["extra-files"];
  if (!Array.isArray(extraFiles)) {
    issues.push("release-please-config.json: missing CLI extra-files array");
  }
  for (const target of pluginVersionTargets()) {
    const manifest = read(target.path);
    if (manifest) {
      const actual =
        target.jsonpath === "$.metadata.version"
          ? manifest.metadata?.version
          : manifest.version;
      if (actual !== expected) {
        issues.push(
          `${target.path}: expected version ${expected}, found ${JSON.stringify(actual) ?? "missing"}`,
        );
      }
    }
    if (
      Array.isArray(extraFiles) &&
      !extraFiles.some(
        (entry) =>
          entry?.type === "json" &&
          entry.path === target.path &&
          entry.jsonpath === target.jsonpath,
      )
    ) {
      issues.push(
        `release-please-config.json: missing JSON version updater for ${target.path} (${target.jsonpath})`,
      );
    }
  }
  return issues;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = resolve(
    process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "../.."),
  );
  const issues = checkPluginVersions(root);
  if (issues.length) {
    console.error("Plugin release version check failed:");
    for (const issue of issues) console.error(`  ${issue}`);
    process.exitCode = 1;
  } else {
    console.log(
      "Plugin release versions and Release Please propagation match.",
    );
  }
}
