import { isAntigravityAuthenticated } from "./antigravity/auth.js";
import { isClaudeAuthenticated } from "./claude/auth.js";
import { isCodexAuthenticated } from "./codex/auth.js";
import { isCursorAuthenticated } from "./cursor/auth.js";
import { isGeminiAuthenticated } from "./gemini/auth.js";
import { isGrokAuthenticated } from "./grok/auth.js";
import { isKiroAuthenticated } from "./kiro/auth.js";
import { isPiAuthenticated } from "./pi/auth.js";
import { isQwenAuthenticated } from "./qwen/auth.js";

export type VendorId =
  | "claude"
  | "gemini"
  | "codex"
  | "cursor"
  | "qwen"
  | "antigravity"
  | "grok"
  | "kiro"
  | "pi";

export interface Vendor {
  id: VendorId;
  label: string;
  isAuthenticated(): boolean;
}

export const VENDORS: readonly Vendor[] = [
  { id: "claude", label: "Claude CLI", isAuthenticated: isClaudeAuthenticated },
  { id: "gemini", label: "Gemini CLI", isAuthenticated: isGeminiAuthenticated },
  { id: "codex", label: "Codex CLI", isAuthenticated: isCodexAuthenticated },
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
];

export {
  isAntigravityAuthenticated,
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isCursorAuthenticated,
  isGeminiAuthenticated,
  isGrokAuthenticated,
  isKiroAuthenticated,
  isPiAuthenticated,
  isQwenAuthenticated,
};
