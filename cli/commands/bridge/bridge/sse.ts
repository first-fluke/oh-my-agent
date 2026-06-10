import type { IncomingMessage } from "node:http";

export function parseSSEStream(
  res: IncomingMessage,
  onMessage: (data: string) => void,
): void {
  let buffer = "";

  res.on("data", (chunk: string | Buffer) => {
    buffer += chunk.toString();
    buffer = buffer.replace(/\r\n/g, "\n");

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const lines = part.split("\n");
      let eventData = "";

      for (const line of lines) {
        if (line.startsWith("data:")) {
          eventData += line.slice(5).trim();
        }
      }

      if (eventData) {
        onMessage(eventData);
      }
    }
  });
}
