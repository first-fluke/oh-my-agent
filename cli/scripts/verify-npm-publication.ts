import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

const REGISTRY = "https://registry.npmjs.org";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export interface PublicationOptions {
  packageName: string;
  version: string;
  timeoutMs?: number;
  requestTimeoutMs?: number;
  retryDelayMs?: number;
}

export interface PublicationDependencies {
  fetch: typeof fetch;
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
}

type Phase = "metadata" | "tarball";

interface PublicationReceipt {
  status: "verified" | "failed";
  packageName: string;
  version: string;
  metadataUrl: string;
  attempts: number;
  elapsedMs: number;
  tarballUrl?: string;
  integrity?: string;
  bytes?: number;
  phase?: Phase;
  httpStatus?: number;
  reason?: string;
}

export class PublicationVerificationError extends Error {
  constructor(public receipt: PublicationReceipt) {
    super(receipt.reason);
    this.name = "PublicationVerificationError";
  }
}

class RetryableReadError extends Error {
  constructor(
    public phase: Phase,
    public httpStatus?: number,
  ) {
    super(`${phase} is not publicly available yet`);
  }
}

function positive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive number`);
  }
  return value;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function integrityDigest(integrity: string):
  | {
      algorithm: string;
      expected: Buffer;
    }
  | undefined {
  // SRI can list multiple digests. Verify the strongest supported algorithm,
  // rather than allowing a weaker digest to conceal a stronger mismatch.
  const algorithms = ["sha512", "sha384", "sha256", "sha1"];
  const tokens = integrity.trim().split(/\s+/);
  for (const algorithm of algorithms) {
    const token = tokens.find((item) => item.startsWith(`${algorithm}-`));
    if (!token) continue;
    const encoded = token.slice(algorithm.length + 1);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return undefined;
    const expected = Buffer.from(encoded, "base64");
    if (expected.length !== createHash(algorithm).digest().length)
      return undefined;
    return { algorithm, expected };
  }
  return undefined;
}

/** Wait for the public exact-version artifact; this never authenticates or publishes. */
export async function verifyNpmPublication(
  options: PublicationOptions,
  dependencies: Partial<PublicationDependencies> = {},
): Promise<PublicationReceipt> {
  const { packageName, version } = options;
  if (
    !packageName.trim() ||
    !/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(version)
  ) {
    throw new Error("A package name and exact package version are required");
  }
  const timeoutMs = positive(
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    "timeoutMs",
  );
  const requestTimeoutMs = positive(
    options.requestTimeoutMs ?? 30_000,
    "requestTimeoutMs",
  );
  const retryDelayMs = positive(options.retryDelayMs ?? 10_000, "retryDelayMs");
  const runtime: PublicationDependencies = {
    fetch: dependencies.fetch ?? fetch,
    now: dependencies.now ?? (() => performance.now()),
    sleep:
      dependencies.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds))),
  };
  const startedAt = runtime.now();
  const deadline = startedAt + timeoutMs;
  const metadataUrl = `${REGISTRY}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
  let attempts = 0;
  let lastRead: RetryableReadError | undefined;
  function fail(
    reason: string,
    extra: Partial<PublicationReceipt> = {},
  ): never {
    throw new PublicationVerificationError({
      status: "failed",
      packageName,
      version,
      metadataUrl,
      attempts,
      elapsedMs: Math.max(0, runtime.now() - startedAt),
      reason,
      ...extra,
    });
  }
  const read = async <T>(
    url: string,
    phase: Phase,
    consume: (response: Response) => Promise<T>,
  ): Promise<T> => {
    const remaining = deadline - runtime.now();
    if (remaining <= 0) throw new RetryableReadError(phase);
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(requestTimeoutMs, remaining),
    );
    try {
      const response = await runtime.fetch(url, { signal: controller.signal });
      if (!response.ok) {
        const status = response.status;
        await response.body?.cancel();
        if (
          status === 404 ||
          status === 408 ||
          status === 429 ||
          status >= 500
        ) {
          throw new RetryableReadError(phase, status);
        }
        return fail(`Public ${phase} request returned HTTP ${status}`, {
          phase,
          httpStatus: status,
        });
      }
      return await consume(response);
    } catch (error) {
      if (
        error instanceof PublicationVerificationError ||
        error instanceof RetryableReadError
      )
        throw error;
      // Do not print arbitrary network exception text: it can contain proxy
      // credentials or other environment-dependent information.
      throw new RetryableReadError(phase);
    } finally {
      clearTimeout(timer);
    }
  };

  while (runtime.now() < deadline) {
    attempts++;
    try {
      const metadata = record(
        await read(metadataUrl, "metadata", (response) => response.json()),
      );
      if (metadata?.name !== packageName || metadata.version !== version) {
        fail(
          "Public metadata does not match the exact requested package version",
          { phase: "metadata" },
        );
      }
      const dist = record(metadata.dist);
      if (
        typeof dist?.tarball !== "string" ||
        typeof dist.integrity !== "string"
      ) {
        fail("Public metadata has no tarball URL or integrity", {
          phase: "metadata",
        });
      }
      const digest = integrityDigest(dist.integrity);
      if (!digest)
        fail("Public metadata contains unsupported or malformed integrity", {
          phase: "metadata",
        });
      let tarballUrl: URL;
      try {
        tarballUrl = new URL(dist.tarball);
      } catch {
        return fail("Public metadata contains an invalid tarball URL", {
          phase: "metadata",
        });
      }
      if (
        tarballUrl.protocol !== "https:" ||
        tarballUrl.username ||
        tarballUrl.password
      ) {
        fail("Public tarball URL must use HTTPS without credentials", {
          phase: "metadata",
        });
      }
      const bytes = Buffer.from(
        await read(tarballUrl.href, "tarball", (response) =>
          response.arrayBuffer(),
        ),
      );
      const actual = createHash(digest.algorithm).update(bytes).digest();
      if (!timingSafeEqual(actual, digest.expected)) {
        fail("Public tarball does not match its published integrity", {
          phase: "tarball",
          tarballUrl: tarballUrl.href,
        });
      }
      if (runtime.now() >= deadline) break;
      return {
        status: "verified",
        packageName,
        version,
        metadataUrl,
        tarballUrl: tarballUrl.href,
        integrity: dist.integrity,
        bytes: bytes.length,
        attempts,
        elapsedMs: Math.max(0, runtime.now() - startedAt),
      };
    } catch (error) {
      if (!(error instanceof RetryableReadError)) throw error;
      lastRead = error;
    }
    const remaining = deadline - runtime.now();
    if (remaining > 0) await runtime.sleep(Math.min(retryDelayMs, remaining));
  }
  return fail(
    "Public npm artifact was not verified before the publication deadline",
    {
      phase: lastRead?.phase,
      httpStatus: lastRead?.httpStatus,
    },
  );
}

export async function runPublicationVerification(
  args: string[],
): Promise<void> {
  const manifestPath = args[0] ?? "cli/package.json";
  if (args.length > 1)
    throw new Error(
      "Usage: bun cli/scripts/verify-npm-publication.ts [package.json]",
    );
  const manifest = record(JSON.parse(readFileSync(manifestPath, "utf8")));
  if (
    typeof manifest?.name !== "string" ||
    typeof manifest.version !== "string"
  ) {
    throw new Error("Package manifest must declare its name and exact version");
  }
  const receipt = await verifyNpmPublication({
    packageName: manifest.name,
    version: manifest.version,
  });
  console.log(JSON.stringify(receipt));
}

if (import.meta.main) {
  runPublicationVerification(process.argv.slice(2)).catch((error: unknown) => {
    console.error(
      JSON.stringify(
        error instanceof PublicationVerificationError
          ? error.receipt
          : {
              status: "failed",
              reason: "Invalid publication-verifier input or package manifest",
            },
      ),
    );
    process.exitCode = 1;
  });
}
