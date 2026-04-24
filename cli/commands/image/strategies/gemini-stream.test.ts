import { describe, expect, it } from "vitest";
import { extractImageFromStream } from "./gemini-stream.js";

describe("extractImageFromStream", () => {
  it("returns null when no inline image is present", () => {
    const stdout = `${JSON.stringify({ text: "hello" })}\n`;
    expect(extractImageFromStream(stdout)).toBeNull();
  });

  it("extracts base64 from camelCase inlineData", () => {
    const payload = Buffer.from("PNGdata").toString("base64");
    const stdout = `${JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: "image/png", data: payload } }],
          },
        },
      ],
    })}\n`;
    const result = extractImageFromStream(stdout);
    expect(result).not.toBeNull();
    expect(result?.toString("utf8")).toBe("PNGdata");
  });

  it("extracts base64 from snake_case inline_data", () => {
    const payload = Buffer.from("SNAKE").toString("base64");
    const stdout = `${JSON.stringify({
      parts: [{ inline_data: { mime_type: "image/png", data: payload } }],
    })}\n`;
    const result = extractImageFromStream(stdout);
    expect(result?.toString("utf8")).toBe("SNAKE");
  });

  it("ignores non-image inlineData", () => {
    const stdout = `${JSON.stringify({
      inlineData: { mimeType: "audio/mpeg", data: "xxx" },
    })}\n`;
    expect(extractImageFromStream(stdout)).toBeNull();
  });

  it("skips non-JSON lines", () => {
    const payload = Buffer.from("ok").toString("base64");
    const stdout = [
      "not json",
      JSON.stringify({ inlineData: { mimeType: "image/png", data: payload } }),
    ].join("\n");
    const result = extractImageFromStream(stdout);
    expect(result?.toString("utf8")).toBe("ok");
  });
});
