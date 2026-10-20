import { describe, expect, it } from "vitest";
import { readOnlyClaim } from "./agent-results.js";

const claim = {
  status: "completed",
  changedFiles: [],
  unresolved: [],
  artifacts: [],
  verificationSkipped: "Inspected the task contract and current source files",
};
const marker = `OMA_RESULT_JSON: ${JSON.stringify(claim)}`;

describe("read-only claims in native output", () => {
  it("preserves plain-text claims and uses the last marker", () => {
    expect(readOnlyClaim(`OMA_RESULT_JSON: {}\nDone\n${marker}`)).toEqual(
      claim,
    );
  });

  it("reads a Claude JSON result without requiring the agent to write files", () => {
    expect(
      readOnlyClaim(
        JSON.stringify({
          type: "result",
          subtype: "success",
          is_error: false,
          session_id: "session-id",
          result: `Inspection complete\n${marker}`,
        }),
      ),
    ).toEqual(claim);
  });

  it("does not accept an error envelope as a completed inspection", () => {
    expect(
      readOnlyClaim(
        JSON.stringify({ type: "result", is_error: true, result: marker }),
      ),
    ).toBeUndefined();
  });

  it("reads Codex final assistant messages and ignores tool output and commentary", () => {
    const log = [
      { type: "thread.started", thread_id: "session-id" },
      { type: "item.completed", item: { type: "agent_message", text: marker } },
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          aggregated_output: "OMA_RESULT_JSON: {}",
        },
      },
      {
        type: "item.completed",
        item: {
          type: "agent_message",
          phase: "commentary",
          text: "OMA_RESULT_JSON: {}",
        },
      },
    ]
      .map((event) => JSON.stringify(event))
      .join("\n");
    expect(readOnlyClaim(log)).toEqual(claim);
  });

  it("does not search arbitrary JSON fields or tool events for a claim", () => {
    expect(readOnlyClaim(JSON.stringify({ output: marker }))).toBeUndefined();
    expect(
      readOnlyClaim(
        [
          { type: "thread.started", thread_id: "session-id" },
          {
            type: "item.completed",
            item: { type: "command_execution", aggregated_output: marker },
          },
        ]
          .map((event) => JSON.stringify(event))
          .join("\n"),
      ),
    ).toBeUndefined();
  });

  it("keeps malformed or absent claims incomplete", () => {
    expect(readOnlyClaim("No structured claim")).toBeUndefined();
    expect(readOnlyClaim("OMA_RESULT_JSON: {broken")).toBeUndefined();
  });
});
