import type {
  EXTENSION_VENDORS,
  INSTALL_ONLY_VENDORS,
  NO_SKILL_VENDORS,
  VENDORS,
} from "../constants/vendors.js";

/**
 * Canonical vendor type, derived from the `VENDORS` runtime constant in
 * `cli/constants/vendors.ts`. The constant is the source of truth; this type
 * stays in sync via the `typeof` derivation. See the comment on `VENDORS`
 * for the inclusion rationale (especially the cursor partial-support note).
 */
export type VendorType = (typeof VENDORS)[number];
export type ExtensionVendorType = (typeof EXTENSION_VENDORS)[number];
export type InstallOnlyVendor = (typeof INSTALL_ONLY_VENDORS)[number];

/**
 * CLI tools that support skill symlinking: every hook vendor except the
 * skill-less ones, plus the install-only targets. `CLI_SKILLS_DIR` in
 * `cli/constants/vendors.ts` is annotated with this type, so adding a vendor
 * to `VENDORS` forces either a skills-dir entry or a `NO_SKILL_VENDORS`
 * exclusion at compile time.
 */
export type CliTool =
  | Exclude<VendorType, (typeof NO_SKILL_VENDORS)[number]>
  | InstallOnlyVendor;

/** All CLI tools including non-hook and extension-model vendors. */
export type CliVendor = VendorType | ExtensionVendorType | InstallOnlyVendor;

export interface CLICheck {
  name: string;
  installed: boolean;
  version?: string;
  installCmd: string;
}
