import { existsSync } from "node:fs";
import type { MemoryRawTurn } from "../../../../types/memory.js";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";
import { sortRawTurns } from "../utils/history-parser.js";
import {
  dedupeCursorEntries,
  entriesFromAgentTranscript,
  entriesFromStore,
  rawTurnsFromAgentTranscript,
} from "./cursor/entries.js";
import { extractMessageContent, extractUserPrompt } from "./cursor/messages.js";
import {
  buildChatHashProjectMap,
  findAgentTranscriptFiles,
  projectSlugToName,
  projectSlugToPath,
  workspacePathToProjectName,
} from "./cursor/projects.js";
import {
  CURSOR_CHATS,
  type CursorStoreReadSummary,
  canReadCursorStores,
  findStoreDBs,
  hasSqlite3Cli,
  probeCursorStoreLocks,
  readCursorStores,
  readStoreViaSqlite3Cli,
} from "./cursor/store.js";

registerParser({
  name: "cursor",

  async detect() {
    if (findAgentTranscriptFiles().length > 0) return true;
    if (!existsSync(CURSOR_CHATS)) return false;
    return canReadCursorStores();
  },

  async parse(start, end) {
    const entries: NormalizedEntry[] = [];
    const hashProjectMap = buildChatHashProjectMap();

    for (const file of findAgentTranscriptFiles()) {
      try {
        entries.push(...entriesFromAgentTranscript(file, start, end));
      } catch {
        // skip unreadable transcripts
      }
    }

    for (const store of readCursorStores().stores) {
      try {
        entries.push(...entriesFromStore(store, start, end, hashProjectMap));
      } catch {
        // skip stores that fail to map to entries
      }
    }

    return dedupeCursorEntries(entries);
  },

  async parseRaw(start, end) {
    const turns: MemoryRawTurn[] = [];
    const warnings: string[] = [];
    let skippedTranscriptCount = 0;
    let skippedTurnCount = 0;

    for (const file of findAgentTranscriptFiles()) {
      try {
        const result = rawTurnsFromAgentTranscript(file, start, end);
        turns.push(...result.turns);
        if (result.skippedMissingTimestamp > 0) {
          skippedTranscriptCount += 1;
          skippedTurnCount += result.skippedMissingTimestamp;
        }
      } catch {
        warnings.push(`cursor transcript ${file.sessionId} is unreadable`);
      }
    }

    if (skippedTurnCount > 0) {
      warnings.push(
        `cursor skipped ${skippedTurnCount} transcript raw turns across ${skippedTranscriptCount} transcripts without exact timestamps`,
      );
    }

    const { total, locked } = probeCursorStoreLocks();
    if (locked > 0) {
      warnings.push(
        `cursor: ${locked}/${total} store.db file(s) are locked (Cursor running?); coverage is partial — close Cursor and rerun, or pass --force-partial`,
      );
    }
    if (total > 0) {
      warnings.push(
        `cursor store.db raw import skipped for ${total} stores because per-message timestamps are unavailable`,
      );
    }

    return {
      turns: sortRawTurns(turns),
      warnings,
    };
  },
});

export type { CursorStoreReadSummary };
export {
  entriesFromAgentTranscript,
  extractMessageContent,
  extractUserPrompt,
  findAgentTranscriptFiles,
  findStoreDBs,
  hasSqlite3Cli,
  projectSlugToName,
  projectSlugToPath,
  readStoreViaSqlite3Cli,
  workspacePathToProjectName,
};
