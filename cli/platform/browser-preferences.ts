import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as p from "@clack/prompts";
import { isMap, parseDocument } from "yaml";
import { planPreferenceWrite } from "../utils/config-layers.js";
import type { DevToolsBrowser } from "../vendors/serena.js";

/**
 * Edit only the browser preference, retaining YAML comments and other MCP keys.
 * A project with oma-config.cue gets it in the local overlay instead, since
 * CUE outranks oma-config.yaml (see {@link planPreferenceWrite}).
 */
export function saveDevToolsBrowsers(
  root: string,
  browsers: DevToolsBrowser[],
): void {
  const plan = planPreferenceWrite(root, [
    [["mcp", "devtools_browsers"], [...new Set(browsers)]],
  ]);
  if (plan.warning) p.log.warn(plan.warning);
  if (!plan.entries.length) return;
  const { path } = plan;
  const doc = parseDocument(
    existsSync(path) ? readFileSync(path, "utf-8") : "",
  );
  if (doc.errors.length)
    throw new Error(`Invalid YAML in ${path}: ${doc.errors[0]?.message}`);
  const mcp = doc.get("mcp");
  if (mcp != null && !isMap(mcp))
    throw new Error(`Expected mcp to be a mapping in ${path}`);
  if (!isMap(mcp)) doc.set("mcp", doc.createNode({}));
  for (const [keys, value] of plan.entries) doc.setIn(keys, value);
  writeFileSync(path, doc.toString());
  if (plan.notice) p.log.info(plan.notice);
}
