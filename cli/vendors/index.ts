import type { ExtensionVendorType, VendorType } from "../types/vendors.js";
import { isAntigravityAuthenticated } from "./antigravity/auth.js";
import { isClaudeAuthenticated } from "./claude/auth.js";
import { isCodexAuthenticated } from "./codex/auth.js";
import { isCommandCodeAuthenticated } from "./commandcode/auth.js";
import { isCursorAuthenticated } from "./cursor/auth.js";
import { isGrokAuthenticated } from "./grok/auth.js";
import { isKimiAuthenticated } from "./kimi/auth.js";
import { isKiroAuthenticated } from "./kiro/auth.js";
import { isOpencodeAuthenticated } from "./opencode/auth.js";
import { isPiAuthenticated } from "./pi/auth.js";
import { isQwenAuthenticated } from "./qwen/auth.js";

/**
 * Runtime-adapter vendor id: every hook vendor plus the extension-model
 * vendors. Derived from the canonical lists in `cli/constants/vendors.ts`
 * so a new vendor cannot be added without surfacing here.
 */
export type VendorId = VendorType | ExtensionVendorType;

export interface Vendor {
  id: VendorId;
  label: string;
  isAuthenticated(): boolean;
  /** CLI login command shown by `oma auth status` when not authenticated.
   * Omit for vendors with no interactive login surface. */
  authHint?: string;
}

export const VENDORS: readonly Vendor[] = [
  {
    id: "claude",
    label: "Claude CLI",
    isAuthenticated: isClaudeAuthenticated,
    authHint: "claude auth",
  },
  {
    id: "codex",
    label: "Codex CLI",
    isAuthenticated: isCodexAuthenticated,
    authHint: "codex login",
  },
  {
    id: "commandcode",
    label: "Command Code",
    isAuthenticated: isCommandCodeAuthenticated,
  },
  {
    id: "cursor",
    label: "Cursor CLI",
    isAuthenticated: isCursorAuthenticated,
    authHint: "cursor agent login",
  },
  {
    id: "qwen",
    label: "Qwen CLI",
    isAuthenticated: isQwenAuthenticated,
    authHint: "qwen /auth",
  },
  {
    id: "antigravity",
    label: "Antigravity CLI (agy)",
    isAuthenticated: () => isAntigravityAuthenticated(),
    authHint: "agy auth",
  },
  {
    id: "grok",
    label: "Grok",
    isAuthenticated: isGrokAuthenticated,
  },
  {
    id: "kimi",
    label: "Kimi Code CLI",
    isAuthenticated: isKimiAuthenticated,
  },
  {
    id: "kiro",
    label: "Kiro CLI",
    isAuthenticated: isKiroAuthenticated,
    authHint: "kiro-cli login",
  },
  {
    id: "pi",
    label: "pi (Earendil)",
    isAuthenticated: isPiAuthenticated,
  },
  {
    id: "opencode",
    label: "OpenCode CLI",
    isAuthenticated: isOpencodeAuthenticated,
    authHint: "opencode auth login",
  },
];

/**
 * Vendor id → auth checker, derived from the single VENDORS descriptor so the
 * doctor (environment + profile) auth surfaces share one source. Keyed loosely
 * by string for ergonomic lookup by an arbitrary cli name; callers guard with
 * `?.()` for ids absent here.
 */
export const AUTH_CHECKERS: Record<string, () => boolean> = Object.fromEntries(
  VENDORS.map((v) => [v.id, v.isAuthenticated]),
);

export {
  isAntigravityAuthenticated,
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isCommandCodeAuthenticated,
  isCursorAuthenticated,
  isGrokAuthenticated,
  isKimiAuthenticated,
  isKiroAuthenticated,
  isOpencodeAuthenticated,
  isPiAuthenticated,
  isQwenAuthenticated,
};
