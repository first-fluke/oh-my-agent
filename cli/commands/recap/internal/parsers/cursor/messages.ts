import type { PairMessage } from "../../utils/history-parser.js";

export type CursorMessage = {
  role: string;
  content: string;
};

export function extractMessageContent(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const parts = content
    .map((part) => {
      if (typeof part !== "object" || part == null) return "";
      const record = part as { type?: string; text?: unknown };
      if (record.type === "text" && typeof record.text === "string") {
        return record.text;
      }
      return "";
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : null;
}

export function extractUserPrompt(content: string): string | null {
  const match = content.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  const raw = (match?.[1] ?? content).trim();
  if (!raw || raw.startsWith("<user_info>")) return null;
  return raw;
}

export function toPairMessage(msg: CursorMessage): PairMessage {
  if (msg.role === "user") return { role: "user", text: msg.content };
  if (msg.role === "assistant") {
    return { role: "assistant", text: msg.content };
  }
  return { role: "other", text: msg.content };
}
