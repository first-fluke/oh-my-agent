import type { TranscriptRecord } from "./types.js";

/**
 * Flags the first record of each vendor turn. A turn opens on a user prompt
 * or when the vendor signals one (a resumed task has no prompt). Context the
 * harness injects ahead of the prompt stays in the same turn as the prompt.
 */
export function createTurnTracker(): {
  begin(): void;
  mark(record: TranscriptRecord): void;
} {
  let pending = false;
  let preamble = false;
  return {
    begin() {
      pending = true;
    },
    mark(record) {
      if (pending) {
        record.opensTurn = true;
        pending = false;
        preamble = record.kind === "context";
        return;
      }
      if (record.kind === "user") {
        if (!preamble) record.opensTurn = true;
        preamble = false;
      } else if (record.kind !== "context") {
        preamble = false;
      }
    },
  };
}
