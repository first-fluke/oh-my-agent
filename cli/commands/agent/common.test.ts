import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSessionId } from "./common.js";

const mockMemoryFunctions = vi.hoisted(() => ({
  getSessionMeta: vi.fn(),
  formatSessionId: vi.fn(),
}));

vi.mock("../../lib/memory.js", () => mockMemoryFunctions);

describe("agent/common.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemoryFunctions.getSessionMeta.mockReturnValue({});
    mockMemoryFunctions.formatSessionId.mockReturnValue(
      "session-20260327-120000",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns active session id when available", () => {
    mockMemoryFunctions.getSessionMeta.mockReturnValue({
      id: "session-20260327-090000",
      status: "running",
    });

    expect(resolveSessionId()).toBe("session-20260327-090000");
  });

  it("generates new session id when no active session", () => {
    mockMemoryFunctions.getSessionMeta.mockReturnValue({});

    expect(resolveSessionId()).toBe("session-20260327-120000");
    expect(mockMemoryFunctions.formatSessionId).toHaveBeenCalled();
  });

  it("generates new session id when session is completed", () => {
    mockMemoryFunctions.getSessionMeta.mockReturnValue({
      id: "session-20260327-080000",
      status: "completed",
    });

    expect(resolveSessionId()).toBe("session-20260327-120000");
  });

  it("generates new session id when session is failed", () => {
    mockMemoryFunctions.getSessionMeta.mockReturnValue({
      id: "session-20260327-080000",
      status: "failed",
    });

    expect(resolveSessionId()).toBe("session-20260327-120000");
  });

  it("reuses idle session", () => {
    mockMemoryFunctions.getSessionMeta.mockReturnValue({
      id: "session-20260327-100000",
      status: "idle",
    });

    expect(resolveSessionId()).toBe("session-20260327-100000");
  });
});
