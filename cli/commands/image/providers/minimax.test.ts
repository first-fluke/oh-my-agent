import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MiniMaxProvider } from "./minimax.js";

describe("MiniMaxProvider", () => {
  const originalKey = process.env.MINIMAX_API_KEY;
  const tmpDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.MINIMAX_API_KEY;
    else process.env.MINIMAX_API_KEY = originalKey;
    for (const dir of tmpDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  it("reports authentication setup when the key is missing", async () => {
    delete process.env.MINIMAX_API_KEY;
    const health = await new MiniMaxProvider().health();
    expect(health).toMatchObject({ ok: false, reason: "not-authenticated" });
  });

  it("posts the image request and writes returned image URLs", async () => {
    process.env.MINIMAX_API_KEY = "test-key";
    const dir = mkdtempSync(path.join(os.tmpdir(), "oma-minimax-"));
    tmpDirs.push(dir);
    const calls: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(init ?? {});
        if (url.includes("image_generation")) {
          return new Response(
            JSON.stringify({
              data: { image_urls: ["https://cdn.example/image.jpg"] },
            }),
            { status: 200 },
          );
        }
        return new Response(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), {
          status: 200,
        });
      }),
    );
    const result = await new MiniMaxProvider().generate({
      prompt: "a red apple",
      size: "1024x1024",
      quality: "auto",
      n: 1,
      outDir: dir,
      signal: new AbortController().signal,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.vendor).toBe("minimax");
    expect(readFileSync(result[0]?.filePath ?? "").subarray(0, 2)).toEqual(
      Buffer.from([0xff, 0xd8]),
    );
    const body = JSON.parse(String(calls[0]?.body ?? "{}"));
    expect(body).toMatchObject({
      model: "image-01",
      prompt: "a red apple",
      aspect_ratio: "1:1",
      n: 1,
      response_format: "url",
    });
  });
});
