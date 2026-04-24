import { describe, expect, it } from "vitest";
import {
  formatTimestamp,
  makeRunId,
  renderPattern,
  shortId,
} from "./naming.js";

describe("naming", () => {
  it("formats timestamps as YYYYMMDD-HHMMSS", () => {
    const d = new Date(2026, 3, 24, 14, 30, 52);
    expect(formatTimestamp(d)).toBe("20260424-143052");
  });

  it("generates short ids of the requested length", () => {
    expect(shortId(6)).toHaveLength(6);
    expect(shortId(10)).toHaveLength(10);
    expect(shortId(6)).toMatch(/^[0-9a-z]+$/);
  });

  it("produces a run id with timestamp and shortid", () => {
    const id = makeRunId(new Date(2026, 3, 24, 14, 30, 52));
    expect(id.timestamp).toBe("20260424-143052");
    expect(id.shortid).toMatch(/^[0-9a-z]{6}$/);
  });

  it("renders patterns with known vars", () => {
    const result = renderPattern("{timestamp}-{shortid}-{vendor}", {
      timestamp: "20260424",
      shortid: "ab12cd",
      vendor: "codex",
    });
    expect(result).toBe("20260424-ab12cd-codex");
  });

  it("leaves unknown vars in place", () => {
    expect(renderPattern("{foo}/{bar}", { foo: "x" })).toBe("x/{bar}");
  });
});
