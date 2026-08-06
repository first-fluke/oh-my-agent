import { afterEach, describe, expect, it, vi } from "vitest";
import { warnOnErrorEnvelope } from "./dispatch.js";

describe("warnOnErrorEnvelope", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns on a claude error envelope that exited 0 (session limit 429)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const envelope = JSON.stringify({
      is_error: true,
      api_error_status: 429,
      result: "You've hit your session limit · resets 6:40pm",
      type: "result",
    });

    expect(warnOnErrorEnvelope(envelope)).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("HTTP 429"));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("session limit"),
    );
  });

  it("stays silent for a successful envelope", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const envelope = JSON.stringify({
      is_error: false,
      result: "the answer",
      type: "result",
    });

    expect(warnOnErrorEnvelope(envelope)).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("stays silent for plain-text and malformed output", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(warnOnErrorEnvelope("plain text answer")).toBe(false);
    expect(warnOnErrorEnvelope("{not json")).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
