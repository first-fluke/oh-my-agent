import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_CLI_VENDORS,
  CLI_SKILLS_DIR,
  EXTENSION_VENDORS,
  vendorRequiresHomeConsent,
} from "../../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../../types/index.js";
import type { UpdateOptions } from "./types.js";

const VENDOR_ROOTS: Record<CliVendor, string[]> = {
  antigravity: [".gemini/antigravity-cli"],
  claude: [".claude"],
  codex: [".codex"],
  commandcode: [".commandcode"],
  copilot: [".github"],
  cursor: [".cursor"],
  gemini: [".gemini"],
  grok: [".grok"],
  hermes: [".hermes"],
  kiro: [".kiro"],
  pi: [".pi"],
  qwen: [".qwen"],
};

const UPDATE_VENDORS = [...ALL_CLI_VENDORS, ...EXTENSION_VENDORS].sort();

function isCliTool(vendor: CliVendor): vendor is CliTool {
  return vendor in CLI_SKILLS_DIR;
}

function parseVendorList(raw: string): CliVendor[] {
  const validVendors = new Set<string>(UPDATE_VENDORS);
  const vendors = raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const invalid = vendors.filter((v) => !validVendors.has(v));

  if (invalid.length > 0) {
    throw new Error(
      `Unsupported vendor(s): ${invalid.join(", ")}. Supported vendors: ${UPDATE_VENDORS.join(", ")}`,
    );
  }

  return [...new Set(vendors)] as CliVendor[];
}

function hasExistingVendorRoot(cwd: string, vendor: CliVendor): boolean {
  const roots = [...VENDOR_ROOTS[vendor]];
  if (isCliTool(vendor)) roots.push(CLI_SKILLS_DIR[vendor].projectPath);
  return roots.some((rel) => existsSync(join(cwd, rel)));
}

function supportedProjectVendors(): CliVendor[] {
  return UPDATE_VENDORS.filter((vendor) => {
    if (!isCliTool(vendor)) return true;
    return !vendorRequiresHomeConsent(vendor);
  });
}

export function resolveUpdateVendors(
  cwd: string,
  options: Pick<UpdateOptions, "all" | "vendor"> = {},
): CliVendor[] {
  if (options.vendor) return parseVendorList(options.vendor);
  if (options.all) return supportedProjectVendors();

  return UPDATE_VENDORS.filter((vendor) => hasExistingVendorRoot(cwd, vendor));
}

export function toCliTools(vendors: CliVendor[]): CliTool[] {
  return vendors.filter(isCliTool);
}
