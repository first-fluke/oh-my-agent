import type { IncomingMessage } from "node:http";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { parseSSEStream } from "./sse.js";

describe("SSE UTF-8 decoding", () => {
  it.each(["한글", "🙂한글"])(
    "preserves %s when every byte arrives in a separate chunk",
    (text) => {
      const stream = new PassThrough();
      const messages: string[] = [];
      parseSSEStream(stream as unknown as IncomingMessage, (message) => {
        messages.push(message);
      });
      const payload = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { text },
      });
      for (const byte of Buffer.from(`data: ${payload}\r\n\r\n`)) {
        stream.write(Buffer.from([byte]));
      }
      stream.end();
      expect(messages).toEqual([payload]);
    },
  );
});
