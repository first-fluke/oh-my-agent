import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMap, parseDocument } from "yaml";
import type { DevToolsBrowser } from "../../vendors/serena.js";

/** Edit only the browser preference, retaining YAML comments and other MCP keys. */
export function saveDevToolsBrowsers(
  root: string,
  browsers: DevToolsBrowser[],
): void {
  const path = join(root, ".agents", "oma-config.yaml");
  const doc = parseDocument(
    existsSync(path) ? readFileSync(path, "utf-8") : "",
  );
  if (doc.errors.length)
    throw new Error(`Invalid YAML in ${path}: ${doc.errors[0]?.message}`);
  const mcp = doc.get("mcp");
  if (mcp != null && !isMap(mcp))
    throw new Error(`Expected mcp to be a mapping in ${path}`);
  if (!isMap(mcp)) doc.set("mcp", doc.createNode({}));
  doc.setIn(["mcp", "devtools_browsers"], [...new Set(browsers)]);
  writeFileSync(path, doc.toString());
}
