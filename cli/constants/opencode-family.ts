/**
 * Opencode-family hosts: CLIs that share Sst opencode's config, plugin, agent,
 * MCP and `run` contracts under their own names. Kilo Code CLI (`kilo`,
 * `@kilocode/cli`) is an opencode fork that only renames the paths below, so
 * every opencode code path routes through this table instead of branching on
 * `vendor === "opencode"`. Adding a field here is the only change a further
 * fork needs; opencode's own values must stay byte-identical to the literals
 * they replaced.
 */
export interface OpencodeFamilyHost {
  id: string;
  /** Human-readable product name for console output. */
  label: string;
  /** Project config dir, relative to the project root (`.opencode`). */
  projectDir: string;
  /** Global config dir name under `$XDG_CONFIG_HOME` / `~/.config`. */
  configDirName: string;
  /** Config file basename without extension (`<name>.json` / `<name>.jsonc`). */
  configBasename: string;
  /** `$schema` URL written into a freshly created config. */
  schema: string;
  /** Executable name for `run` / `models` / `--version`. */
  binary: string;
  /**
   * `<binary> run` flag that auto-approves tool permissions for a headless
   * write-capable spawn. Kilo's `run` has no `--dangerously-skip-permissions`.
   */
  autoApproveFlag: string;
  /** Credential store, relative to HOME (`~/.local/share/<host>/auth.json`). */
  authFile: readonly string[];
  /** Login command shown when the host is not authenticated. */
  authHint: string;
  /** Install command shown by `oma doctor` when the binary is missing. */
  installHint: string;
}

export const OPENCODE_FAMILY_HOSTS = {
  opencode: {
    id: "opencode",
    label: "OpenCode",
    projectDir: ".opencode",
    configDirName: "opencode",
    configBasename: "opencode",
    schema: "https://opencode.ai/config.json",
    binary: "opencode",
    autoApproveFlag: "--dangerously-skip-permissions",
    authFile: [".local", "share", "opencode", "auth.json"],
    authHint: "opencode auth login",
    installHint: "npm install -g opencode-ai",
  },
  kilo: {
    id: "kilo",
    label: "Kilo Code",
    projectDir: ".kilo",
    configDirName: "kilo",
    configBasename: "kilo",
    schema: "https://app.kilo.ai/config.json",
    binary: "kilo",
    autoApproveFlag: "--auto",
    authFile: [".local", "share", "kilo", "auth.json"],
    authHint: "kilo auth login",
    installHint: "npm install -g @kilocode/cli",
  },
} as const satisfies Record<string, OpencodeFamilyHost>;

export type OpencodeFamilyVendor = keyof typeof OPENCODE_FAMILY_HOSTS;

export const OPENCODE_FAMILY_VENDORS = Object.keys(
  OPENCODE_FAMILY_HOSTS,
) as OpencodeFamilyVendor[];

/** True for opencode and the forks that share its contracts (kilo). */
export function isOpencodeFamily(
  vendor: unknown,
): vendor is OpencodeFamilyVendor {
  return (
    typeof vendor === "string" && Object.hasOwn(OPENCODE_FAMILY_HOSTS, vendor)
  );
}

export function opencodeFamilyHost(
  vendor: OpencodeFamilyVendor,
): OpencodeFamilyHost {
  return OPENCODE_FAMILY_HOSTS[vendor];
}

/** Display label of a dispatch target's opencode-family host ("OpenCode"). */
export function opencodeFamilyLabel(vendor: string): string {
  return isOpencodeFamily(vendor)
    ? OPENCODE_FAMILY_HOSTS[vendor].label
    : OPENCODE_FAMILY_HOSTS.opencode.label;
}
