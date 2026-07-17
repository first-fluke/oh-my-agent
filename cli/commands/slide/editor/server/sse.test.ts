import { describe, expect, it } from "vitest";
import { escapeSseData } from "./sse.js";

describe("escapeSseData", () => {
  it("escapes newlines", () => {
    expect(escapeSseData("a\nb")).toBe("a\\nb");
  });

  it("escapes lone carriage returns (SSE treats \\r as a line terminator)", () => {
    expect(escapeSseData("progress 50%\rprogress 51%")).toBe(
      "progress 50%\\nprogress 51%",
    );
  });

  it("collapses CRLF to a single escaped newline", () => {
    expect(escapeSseData("a\r\nb")).toBe("a\\nb");
  });

  it("leaves plain text untouched", () => {
    expect(escapeSseData("plain text")).toBe("plain text");
  });
});
