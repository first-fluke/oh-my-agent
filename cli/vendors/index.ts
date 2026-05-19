import { isClaudeAuthenticated } from "./claude/auth.js";
import { isCodexAuthenticated } from "./codex/auth.js";
import { isCursorAuthenticated } from "./cursor/auth.js";
import { isGeminiAuthenticated } from "./gemini/auth.js";
import { isQwenAuthenticated } from "./qwen/auth.js";

export type VendorId =
  | "claude"
  | "gemini"
  | "codex"
  | "cursor"
  | "qwen"
  | "antigravity";

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
];

export {
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isCursorAuthenticated,
  isGeminiAuthenticated,
  isQwenAuthenticated,
};
