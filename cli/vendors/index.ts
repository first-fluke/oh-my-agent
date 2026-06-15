import type { ExtensionVendorType, VendorType } from "../types/vendors.js";
import { isAntigravityAuthenticated } from "./antigravity/auth.js";
import { isClaudeAuthenticated } from "./claude/auth.js";
import { isCodexAuthenticated } from "./codex/auth.js";
import { isCommandCodeAuthenticated } from "./commandcode/auth.js";
import { isCursorAuthenticated } from "./cursor/auth.js";
import { isGeminiAuthenticated } from "./gemini/auth.js";
import { isGrokAuthenticated } from "./grok/auth.js";
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
}

export const VENDORS: readonly Vendor[] = [
  { id: "claude", label: "Claude CLI", isAuthenticated: isClaudeAuthenticated },
  { id: "gemini", label: "Gemini CLI", isAuthenticated: isGeminiAuthenticated },
  { id: "codex", label: "Codex CLI", isAuthenticated: isCodexAuthenticated },
  {
    id: "commandcode",
    label: "Command Code",
    isAuthenticated: isCommandCodeAuthenticated,
  },
  { id: "cursor", label: "Cursor CLI", isAuthenticated: isCursorAuthenticated },
  { id: "qwen", label: "Qwen CLI", isAuthenticated: isQwenAuthenticated },
  {
    id: "antigravity",
    label: "Antigravity CLI (agy)",
    isAuthenticated: () => isAntigravityAuthenticated(),
  },
  {
    id: "grok",
    label: "Grok",
    isAuthenticated: isGrokAuthenticated,
  },
  {
    id: "kiro",
    label: "Kiro CLI",
    isAuthenticated: isKiroAuthenticated,
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
  },
];

export {
  isAntigravityAuthenticated,
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isCommandCodeAuthenticated,
  isCursorAuthenticated,
  isGeminiAuthenticated,
  isGrokAuthenticated,
  isKiroAuthenticated,
  isOpencodeAuthenticated,
  isPiAuthenticated,
  isQwenAuthenticated,
};
