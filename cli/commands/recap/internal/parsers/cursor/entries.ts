import { statSync } from "node:fs";
import type { MemoryRawTurn } from "../../../../../types/memory.js";
import type { NormalizedEntry } from "../../schema.js";
import {
  createRawTurn,
  findResponse,
  inWindow,
  parseTimestampMs,
  preview,
  readJsonlSync,
} from "../../utils/history-parser.js";
import {
  type CursorMessage,
  extractMessageContent,
  extractUserPrompt,
  toPairMessage,
} from "./messages.js";
import {
  type AgentTranscriptFile,
  projectSlugToName,
  resolveStoreProject,
} from "./projects.js";
import type { CursorStoreSnapshot } from "./store.js";

type CursorRawTranscriptRow = {
  role?: string;
  timestamp?: string | number;
  createdAt?: string | number;
  message?: { content?: unknown };
};

function normalizePromptKey(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase();
}

export function dedupeCursorEntries(
  entries: NormalizedEntry[],
): NormalizedEntry[] {
  const seen = new Map<string, NormalizedEntry>();

  for (const entry of entries) {
    const key = `${entry.project ?? ""}|${normalizePromptKey(entry.prompt)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, entry);
      continue;
    }

    const preferNew =
      (!existing.sessionId && entry.sessionId) ||
      (entry.response?.length ?? 0) > (existing.response?.length ?? 0) ||
      entry.timestamp > existing.timestamp;

    if (preferNew) {
      seen.set(key, entry);
    }
  }

  return [...seen.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function entriesFromAgentTranscript(
  file: AgentTranscriptFile,
  start: number,
  end: number,
): NormalizedEntry[] {
  const stat = statSync(file.filePath);
  const birthMs = stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.ctimeMs;
  const endMs = stat.mtimeMs;
  const project = projectSlugToName(file.projectSlug);

  const messages: CursorMessage[] = [];
  for (const row of readJsonlSync<{
    role?: string;
    message?: { content?: unknown };
  }>(file.filePath)) {
    if (row.role !== "user" && row.role !== "assistant") continue;
    const content = extractMessageContent(row.message?.content);
    if (content) {
      messages.push({ role: row.role, content });
    }
  }
  const pairs = messages.map(toPairMessage);

  const userOrdinals = messages
    .map((msg, index) => (msg.role === "user" ? index : -1))
    .filter((index) => index >= 0);

  const entries: NormalizedEntry[] = [];
  let userIndex = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || msg.role !== "user") continue;

    const prompt = extractUserPrompt(msg.content);
    if (!prompt) continue;

    // A single-turn session starts at file birth; using endMs (file mtime)
    // would stamp the prompt with the session's end time instead.
    const timestamp =
      userOrdinals.length <= 1
        ? birthMs
        : birthMs + ((endMs - birthMs) * userIndex) / (userOrdinals.length - 1);
    userIndex++;

    if (!inWindow(timestamp, start, end)) continue;

    const responseText = findResponse(pairs, i, "first");
    const response = responseText ? preview(responseText) : undefined;

    entries.push({
      tool: "cursor",
      timestamp: Math.round(timestamp),
      project,
      prompt: prompt.length > 500 ? `${prompt.slice(0, 500)}...` : prompt,
      response,
      sessionId: file.sessionId,
    });
  }

  return entries;
}

export function rawTurnsFromAgentTranscript(
  file: AgentTranscriptFile,
  start: number,
  end: number,
): { turns: MemoryRawTurn[]; skippedMissingTimestamp: number } {
  const turns: MemoryRawTurn[] = [];
  const project = projectSlugToName(file.projectSlug);
  let skippedMissingTimestamp = 0;

  for (const row of readJsonlSync<CursorRawTranscriptRow>(file.filePath)) {
    const role =
      row.role === "user" || row.role === "assistant" ? row.role : null;
    if (!role) continue;

    const timestamp = parseTimestampMs(row.timestamp ?? row.createdAt);
    if (!timestamp) {
      skippedMissingTimestamp += 1;
      continue;
    }
    if (!inWindow(timestamp, start, end)) continue;

    const content = extractMessageContent(row.message?.content);
    const text =
      role === "user" ? extractUserPrompt(content ?? "") : content?.trim();
    if (!text) continue;

    turns.push(
      createRawTurn({
        vendor: "cursor",
        role,
        text,
        timestamp,
        sourcePath: file.filePath,
        vendorSessionId: file.sessionId,
        project,
      }),
    );
  }

  return { turns, skippedMissingTimestamp };
}

export function entriesFromStore(
  store: CursorStoreSnapshot,
  start: number,
  end: number,
  hashProjectMap: Map<string, string>,
): NormalizedEntry[] {
  const createdAt = store.meta.createdAt ?? 0;
  if (!inWindow(createdAt, start, end)) return [];

  const project = resolveStoreProject(store, hashProjectMap);
  const pairs = store.messages.map(toPairMessage);
  const entries: NormalizedEntry[] = [];
  for (let i = 0; i < store.messages.length; i++) {
    const msg = store.messages[i];
    if (!msg || msg.role !== "user") continue;

    const prompt = extractUserPrompt(msg.content);
    if (!prompt) continue;

    const responseText = findResponse(pairs, i, "immediate");
    const response = responseText ? preview(responseText) : undefined;

    entries.push({
      tool: "cursor",
      timestamp: createdAt,
      project,
      prompt: prompt.length > 500 ? `${prompt.slice(0, 500)}...` : prompt,
      response,
      metadata: store.meta.lastUsedModel
        ? { model: store.meta.lastUsedModel }
        : undefined,
    });
  }

  return entries;
}
