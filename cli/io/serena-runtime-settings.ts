import { execFileSync } from "node:child_process";
import { isMap, isScalar, isSeq, parseDocument } from "yaml";

/** Probe the project's installed SDK without invoking Flutter or downloading it. */
export function detectDartSdkVersion(cwd: string): string | undefined {
  try {
    const output = execFileSync("dart", ["--version"], {
      cwd,
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 8192,
      stdio: ["ignore", "pipe", "ignore"],
    });
    // Serena's downloader uses the stable archive. Do not turn a dev/beta SDK
    // into a nonexistent stable download URL.
    return output.match(/Dart SDK version: (\d+\.\d+\.\d+) \(stable\)/)?.[1];
  } catch {
    return undefined;
  }
}

/**
 * Serena defaults to Dart 3.7.1 and analyzes every project under the workspace
 * root. In monorepos this starts unrelated analysis contexts before any file
 * is opened. Its supported initialization override limits analysis to the
 * projects containing files requested by the client. Explicit settings win.
 */
export function reconcileSerenaRuntimeSettings(
  content: string,
  cwd: string,
  detectVersion: (cwd: string) => string | undefined = detectDartSdkVersion,
): string | null {
  const doc = parseDocument(content);
  if (doc.errors.length || !isMap(doc.contents)) return null;
  const languages =
    doc.get("language_servers", true) ?? doc.get("languages", true);
  if (
    !isSeq(languages) ||
    !languages.items.some((item) => isScalar(item) && item.value === "dart")
  ) {
    return null;
  }

  const settingsPath = ["ls_specific_settings", "dart"];
  const initPath = [...settingsPath, "initializationOptions"];
  // Do not overwrite malformed/user-defined nodes or dereference aliases.
  for (const path of [["ls_specific_settings"], settingsPath, initPath]) {
    const node = doc.getIn(path, true);
    if (
      node !== undefined &&
      !(isScalar(node) && node.value === null) &&
      !isMap(node)
    )
      return null;
  }
  let changed = false;
  for (const path of [["ls_specific_settings"], settingsPath, initPath]) {
    if (!isMap(doc.getIn(path, true))) doc.setIn(path, doc.createNode({}));
  }
  const lazyPath = [...initPath, "onlyAnalyzeProjectsWithOpenFiles"];
  if (!doc.hasIn(lazyPath)) {
    doc.setIn(lazyPath, true);
    changed = true;
  }
  const versionPath = [...settingsPath, "dart_sdk_version"];
  if (!doc.hasIn(versionPath)) {
    const version = detectVersion(cwd);
    if (version) {
      doc.setIn(versionPath, version);
      changed = true;
    }
  }
  return changed ? doc.toString() : null;
}
