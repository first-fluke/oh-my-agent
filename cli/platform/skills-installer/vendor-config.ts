import * as fs from "node:fs";
import { join } from "node:path";
import { ALL_CLI_VENDORS } from "../../constants/index.js";
import type { CliVendor } from "../../types/index.js";

/** Read selected vendors from oma-config.yaml. Falls back to all vendors. */
export function readVendorsFromConfig(installRoot: string): CliVendor[] {
  const configPath = join(installRoot, ".agents", "oma-config.yaml");
  if (!fs.existsSync(configPath)) return [...ALL_CLI_VENDORS];

  const content = fs.readFileSync(configPath, "utf-8");
  const match = content.match(/^vendors:\s*\n((?:\s+-\s+\S+\n?)*)/m);
  if (!match?.[1]) return [...ALL_CLI_VENDORS];

  const vendors = [...match[1].matchAll(/-\s+(\S+)/g)].map(
    (m) => m[1] as CliVendor,
  );
  return vendors.length > 0 ? vendors : [...ALL_CLI_VENDORS];
}

/** Write selected vendors to oma-config.yaml. */
export function writeVendorsToConfig(
  installRoot: string,
  vendors: CliVendor[],
): void {
  const configPath = join(installRoot, ".agents", "oma-config.yaml");
  if (!fs.existsSync(configPath)) return;

  let content = fs.readFileSync(configPath, "utf-8");
  const vendorsBlock = `vendors:\n${vendors.map((v) => `  - ${v}`).join("\n")}`;

  if (/^vendors:/m.test(content)) {
    content = content.replace(
      /^vendors:\s*\n(?:\s+-\s+\S+\n?)*/m,
      `${vendorsBlock}\n`,
    );
  } else {
    content = `${content.trimEnd()}\n${vendorsBlock}\n`;
  }

  fs.writeFileSync(configPath, content);
}
