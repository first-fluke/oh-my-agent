import { describe, expect, it } from "vitest";
import { renderStateSnapshot } from "../../.agents/hooks/core/vendor-renderer.ts";

describe("hook vendor renderer", () => {
  it("renders a Claude state snapshot with empty memory facts", () => {
    const rendered = renderStateSnapshot({
      vendor: "claude",
      sid: "oma-test",
      reason: "vendor/session boundary",
      recentEvents: [
        {
          eventId: "evt-1",
          ts: "2026-05-27T00:00:00.000Z",
          sid: "oma-test",
          kind: "boundary",
          writerPid: 1,
        },
      ],
      facts: [],
    });

    expect(rendered).toContain("[OMA STATE SNAPSHOT]");
    expect(rendered).toContain("sid: oma-test");
    expect(rendered).toContain(
      "recent events:\n- 2026-05-27T00:00:00.000Z boundary",
    );
    expect(rendered).toContain("memory facts:\n- none");
  });
});
