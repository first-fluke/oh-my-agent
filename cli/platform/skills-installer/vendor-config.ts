import * as fs from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { isMap, parse, parseDocument } from "yaml";
import { ALL_CLI_VENDORS } from "../../constants/index.js";
import type { CliVendor } from "../../types/index.js";
import { loadOmaConfig } from "../../utils/config.js";
import {
  ConfigLayerError,
  loadConfigLayers,
  planPreferenceWrite,
} from "../../utils/config-layers.js";
import { isRecord } from "../../utils/type-guards.js";

/** Read selected vendors from oma-config.yaml. Falls back to all vendors. */
export function readVendorsFromConfig(installRoot: string): CliVendor[] {
  const raw: unknown = loadOmaConfig(installRoot)?.vendors;
  if (!Array.isArray(raw)) return [...ALL_CLI_VENDORS];
  return raw.filter(
    (vendor): vendor is CliVendor => typeof vendor === "string",
  );
}

/**
 * Write selected vendors to oma-config.yaml. A CUE-only project (oma-config.cue
 * without oma-config.yaml) gets them in the local overlay instead (see
 * {@link writeVendorsBesideCue}).
 */
export function writeVendorsToConfig(
  installRoot: string,
  vendors: CliVendor[],
): void {
  const cuePath = join(installRoot, ".agents", "oma-config.cue");
  const configPath = join(installRoot, ".agents", "oma-config.yaml");
  if (!fs.existsSync(configPath)) {
    if (fs.existsSync(cuePath)) writeVendorsBesideCue(installRoot, vendors);
    return;
  }

  let content = fs.readFileSync(configPath, "utf-8");
  // The line-based rewrite below knows only the list form; a `vendors:` map
  // (the documented `vendors.pi` block) would be left half-replaced as YAML
  // that no longer parses.
  let existing: unknown;
  try {
    const parsed: unknown = parse(content);
    existing = isRecord(parsed) ? parsed.vendors : undefined;
  } catch {
    // Unparseable YAML: keep the historical line rewrite.
  }
  // Beside oma-config.cue the YAML list is a default that a CUE `vendors` map
  // would replace.
  if (!isRecord(existing) && fs.existsSync(cuePath))
    existing = effectiveVendors(installRoot);
  if (isRecord(existing)) {
    warnVendorsMap(existing, vendors);
    return;
  }
  const vendorsBlock = vendors.length
    ? `vendors:\n${vendors.map((v) => `  - ${v}`).join("\n")}`
    : "vendors: []";

  if (/^vendors:/m.test(content)) {
    content = content.replace(
      /^vendors:[^\n]*(?:\n[\t ]+-\s+\S+[^\n]*)*/m,
      `${vendorsBlock}\n`,
    );
  } else {
    content = `${content.trimEnd()}\n${vendorsBlock}\n`;
  }

  fs.writeFileSync(configPath, content);
}

/**
 * The vendor list readers ({@link readVendorsFromConfig}, `oma update`) take
 * `vendors` from the merged config only when it is an array. oma-config.cue is
 * not rewritten as text, so the list goes to the gitignored local YAML overlay,
 * which outranks CUE and replaces (not merges) an array value. The shipped CUE
 * schema types `vendors` as that list (`[...string]`); templates before it
 * typed it as the unread `vendors.pi` map (`#VendorsConfig`). When the
 * effective `vendors` is such a map, writing the list would silently hide it
 * from every reader, so the selection is not saved and a warning says so.
 */
function writeVendorsBesideCue(root: string, vendors: CliVendor[]): void {
  const list = [...vendors];
  const current = effectiveVendors(root);
  if (isRecord(current)) {
    warnVendorsMap(current, list);
    return;
  }
  let plan: ReturnType<typeof planPreferenceWrite>;
  try {
    plan = planPreferenceWrite(root, [[["vendors"], list]]);
  } catch (error) {
    // An oma-config.local.cue overlay cannot be patched: say so, keep installing.
    if (!(error instanceof ConfigLayerError)) throw error;
    p.log.warn(
      `The vendor selection (${list.join(", ") || "none"}) was not saved: ${error.message}`,
    );
    return;
  }
  if (plan.warning) p.log.warn(plan.warning);
  if (!plan.entries.length) return;
  const doc = parseDocument(
    fs.existsSync(plan.path) ? fs.readFileSync(plan.path, "utf-8") : "",
  );
  if (doc.errors.length || (doc.contents != null && !isMap(doc.contents)))
    throw new Error(`Invalid configuration in ${plan.path}`);
  doc.set("vendors", list);
  fs.writeFileSync(plan.path, doc.toString());
  p.log.info(
    `The vendor selection (${list.join(", ") || "none"}) was saved to ${plan.path} (local, gitignored), since oma-config.cue outranks oma-config.yaml. To share it, move it into oma-config.cue as \`vendors: [...]\`; an older oma-config.cue that declares \`vendors?: #VendorsConfig\` needs \`vendors?: [...string]\` first.`,
  );
}

/** The merged `vendors` value, or undefined while the config cannot be loaded. */
function effectiveVendors(root: string): unknown {
  try {
    return loadConfigLayers(root, process.env, { searchParents: false }).config
      .vendors;
  } catch {
    // CUE that cannot be evaluated yet: planPreferenceWrite decides.
    return undefined;
  }
}

function warnVendorsMap(
  map: Record<string, unknown>,
  vendors: readonly string[],
): void {
  p.log.warn(
    `The config sets \`vendors\` as a map (${Object.keys(map).join(", ") || "empty"}), so the vendor selection (${vendors.join(", ") || "none"}) was not saved over it. oma does not read that map (pi's command and flags live in the managed oma-orchestration cli-config.yaml): replace it with a vendor list (\`vendors: [${vendors.join(", ")}]\`) to keep a selection. Until then vendor detection keeps its fallback; pass vendors explicitly (\`oma update --vendor\`).`,
  );
}
