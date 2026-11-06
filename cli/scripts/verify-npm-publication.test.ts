import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type PublicationDependencies,
  PublicationVerificationError,
  verifyNpmPublication,
} from "./verify-npm-publication.js";

const payload = Buffer.from("npm publication fixture");
const integrity = `sha512-${createHash("sha512").update(payload).digest("base64")}`;
const tarballUrl =
  "https://registry.npmjs.org/oh-my-agent/-/oh-my-agent-20.36.1.tgz";
const metadata = {
  name: "oh-my-agent",
  version: "20.36.1",
  dist: { tarball: tarballUrl, integrity },
};
const options = { packageName: metadata.name, version: metadata.version };

function clock() {
  let time = 0;
  const sleep = vi.fn(async (milliseconds: number) => {
    time += milliseconds;
  });
  return { now: () => time, sleep };
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

describe("public npm publication readiness", () => {
  afterEach(() => vi.useRealTimers());

  it("waits through metadata and tarball propagation before verifying exact bytes", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json(metadata))
      .mockResolvedValueOnce(new Response("not propagated", { status: 404 }))
      .mockResolvedValueOnce(json(metadata))
      .mockResolvedValueOnce(new Response(payload));
    const time = clock();
    const receipt = await verifyNpmPublication(
      { ...options, retryDelayMs: 20 },
      { fetch: fetcher, ...time },
    );
    expect(receipt).toEqual({
      status: "verified",
      ...options,
      metadataUrl: "https://registry.npmjs.org/oh-my-agent/20.36.1",
      tarballUrl,
      integrity,
      bytes: payload.length,
      attempts: 3,
      elapsedMs: 40,
    });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      receipt.metadataUrl,
      receipt.metadataUrl,
      tarballUrl,
      receipt.metadataUrl,
      tarballUrl,
    ]);
    expect(
      fetcher.mock.calls.every(
        ([, init]) => init?.signal instanceof AbortSignal,
      ),
    ).toBe(true);
  });

  it("retries network and server failures without logging raw exception text", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("proxy password must never be printed"))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json(metadata))
      .mockResolvedValueOnce(new Response(payload));
    const receipt = await verifyNpmPublication(options, {
      fetch: fetcher,
      ...clock(),
    });
    expect(receipt.status).toBe("verified");
    expect(receipt.attempts).toBe(3);
    expect(JSON.stringify(receipt)).not.toContain("password");
  });

  it("fails immediately when downloaded bytes do not match published integrity", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(metadata))
      .mockResolvedValueOnce(new Response("corrupted archive"));
    const time = clock();
    await expect(
      verifyNpmPublication(options, { fetch: fetcher, ...time }),
    ).rejects.toMatchObject({
      receipt: {
        status: "failed",
        attempts: 1,
        phase: "tarball",
        reason: "Public tarball does not match its published integrity",
      },
    });
    expect(time.sleep).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects metadata for a different version without downloading its tarball", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ ...metadata, version: "20.36.0" }));
    await expect(
      verifyNpmPublication(options, { fetch: fetcher, ...clock() }),
    ).rejects.toBeInstanceOf(PublicationVerificationError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, "sha512-invalid", "sha999-AAAA"])(
    "requires valid published integrity: %s",
    async (value) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          json({ ...metadata, dist: { ...metadata.dist, integrity: value } }),
        );
      await expect(
        verifyNpmPublication(options, { fetch: fetcher, ...clock() }),
      ).rejects.toMatchObject({ receipt: { phase: "metadata", attempts: 1 } });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it("stops all retries at one total deadline", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => json({}, 404));
    const time = clock();
    await expect(
      verifyNpmPublication(
        { ...options, timeoutMs: 25, retryDelayMs: 20 },
        { fetch: fetcher, ...time },
      ),
    ).rejects.toMatchObject({
      receipt: {
        status: "failed",
        attempts: 2,
        elapsedMs: 25,
        httpStatus: 404,
      },
    });
    expect(time.sleep.mock.calls).toEqual([[20], [5]]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("aborts an in-flight read at the remaining total deadline", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
    );
    const dependencies: PublicationDependencies = {
      fetch: fetcher,
      now: () => Date.now(),
      sleep: (milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)),
    };
    const promise = verifyNpmPublication(
      { ...options, timeoutMs: 50, requestTimeoutMs: 30, retryDelayMs: 10 },
      dependencies,
    );
    const assertion = expect(promise).rejects.toMatchObject({
      receipt: { attempts: 2, elapsedMs: 50 },
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(fetcher.mock.calls.every(([, init]) => init?.signal?.aborted)).toBe(
      true,
    );
  });

  it("does not retry permanent HTTP errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({}, 403));
    await expect(
      verifyNpmPublication(options, { fetch: fetcher, ...clock() }),
    ).rejects.toMatchObject({ receipt: { httpStatus: 403, attempts: 1 } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses the strongest SRI digest when weaker digests are also listed", async () => {
    const weak = `sha1-${createHash("sha1").update(payload).digest("base64")}`;
    const wrongStrong = `sha512-${createHash("sha512").update("different").digest("base64")}`;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        json({
          ...metadata,
          dist: { tarball: tarballUrl, integrity: `${weak} ${wrongStrong}` },
        }),
      )
      .mockResolvedValueOnce(new Response(payload));
    await expect(
      verifyNpmPublication(options, { fetch: fetcher, ...clock() }),
    ).rejects.toMatchObject({ receipt: { phase: "tarball" } });
  });
});
