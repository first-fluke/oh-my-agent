import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const state = vi.hoisted(() => ({
  routes: new Map<string, () => unknown>(),
  requested: [] as string[],
  gitCalls: [] as string[][],
  gitImpl: null as null | ((args: string[]) => void),
}));

function httpError(status: number): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });
}

vi.mock("./http.js", () => ({
  http: {
    get: vi.fn(async (url: string) => {
      state.requested.push(url);
      const route = state.routes.get(url);
      if (!route) throw httpError(404);
      return { data: route() };
    }),
  },
  isAxiosError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { isAxiosError?: boolean }).isAxiosError === true,
}));

vi.mock("../platform/manifest.js", () => ({
  fetchRemoteManifest: vi.fn(async () => ({ version: "9.9.9" })),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFileSync: vi.fn(
      (command: string, args: string[], options?: Record<string, unknown>) => {
        if (command === "git") {
          state.gitCalls.push(args);
          if (!state.gitImpl) throw new Error("git clone disabled in tests");
          state.gitImpl(args);
          return Buffer.alloc(0);
        }
        return actual.execFileSync(command, args, options as never);
      },
    ),
  };
});

const {
  DownloadIntegrityError,
  downloadAndExtract,
  parseSha256File,
  readExtractedVersion,
  releaseAssetUrls,
  resolveUpdateChannel,
  tagArchiveUrls,
} = await import("./tarball.js");

const VERSION = "9.9.9";
const MAIN_URLS = [
  "https://api.github.com/repos/first-fluke/oh-my-agent/tarball/main",
  "https://codeload.github.com/first-fluke/oh-my-agent/tar.gz/main",
  "https://github.com/first-fluke/oh-my-agent/archive/main.tar.gz",
];

const fixtureRoot = mkdtempSync(join(tmpdir(), "oma-tarball-fixtures-"));
let fixtureSeq = 0;

/** Build a .tar.gz whose entries live under `prefix` (or at the root). */
function makeArchive(version: string, prefix?: string): Buffer {
  const src = join(fixtureRoot, `src-${fixtureSeq++}`);
  const top = prefix ? join(src, prefix) : src;
  mkdirSync(join(top, ".agents", "skills"), { recursive: true });
  mkdirSync(join(top, ".agents", "workflows"), { recursive: true });
  writeFileSync(
    join(top, ".agents", "skills", "_version.json"),
    JSON.stringify({ version }),
  );
  writeFileSync(join(top, ".agents", "workflows", "work.md"), "# work\n");
  const out = join(fixtureRoot, `archive-${fixtureSeq++}.tar.gz`);
  execFileSync("tar", ["-czf", out, "-C", src, prefix ?? ".agents"]);
  return readFileSync(out);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function serveAsset(archive: Buffer, digest = sha256(archive)): void {
  const { archive: archiveUrl, checksum } = releaseAssetUrls(VERSION);
  state.routes.set(checksum, () => `${digest}  agent-skills.tar.gz\n`);
  state.routes.set(archiveUrl, () => archive);
}

const cleanups: Array<() => void> = [];

beforeEach(() => {
  state.routes.clear();
  state.requested.length = 0;
  state.gitCalls.length = 0;
  state.gitImpl = null;
  vi.stubEnv("OMA_UPDATE_CHANNEL", "");
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.unstubAllEnvs();
});

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe("downloadAndExtract — release channel", () => {
  it("installs the checksum-verified release asset", async () => {
    serveAsset(makeArchive(VERSION));

    const result = await downloadAndExtract({ version: VERSION });
    cleanups.push(result.cleanup);

    expect(result.source).toBe("release-asset");
    expect(result.version).toBe(VERSION);
    expect(result.warnings).toEqual([]);
    expect(readExtractedVersion(result.dir)).toBe(VERSION);
    expect(
      existsSync(join(result.dir, ".agents", "workflows", "work.md")),
    ).toBe(true);
    expect(existsSync(join(result.dir, ".oma-download.tar.gz"))).toBe(false);
    expect(state.requested).toEqual([
      releaseAssetUrls(VERSION).checksum,
      releaseAssetUrls(VERSION).archive,
    ]);

    result.cleanup();
    expect(existsSync(result.dir)).toBe(false);
  });

  it("rejects an asset whose checksum does not match, without falling back", async () => {
    serveAsset(makeArchive(VERSION), "0".repeat(64));
    for (const url of tagArchiveUrls(VERSION)) {
      state.routes.set(url, () => makeArchive(VERSION, "repo"));
    }

    const error = await downloadAndExtract({ version: VERSION }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(DownloadIntegrityError);
    expect(String(error)).toMatch(/Checksum mismatch/);
    for (const url of tagArchiveUrls(VERSION)) {
      expect(state.requested).not.toContain(url);
    }
  });

  it("falls back to the tag source archive when the asset is missing", async () => {
    const [codeload] = tagArchiveUrls(VERSION);
    state.routes.set(codeload as string, () =>
      makeArchive(VERSION, "oh-my-agent-cli-v9.9.9"),
    );

    const result = await downloadAndExtract({ version: VERSION });
    cleanups.push(result.cleanup);

    expect(result.source).toBe("tag-archive");
    expect(readExtractedVersion(result.dir)).toBe(VERSION);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/cli-v9\.9\.9.*unavailable.*HTTP 404/);
    expect(state.requested.some((url) => MAIN_URLS.includes(url))).toBe(false);
  });

  it("rejects content whose _version.json does not match the release", async () => {
    serveAsset(makeArchive("9.9.8"));

    await expect(downloadAndExtract({ version: VERSION })).rejects.toThrow(
      /refusing to install mismatched content/,
    );
  });

  it("errors instead of silently falling back to main when the release is unavailable", async () => {
    const error = await downloadAndExtract({ version: VERSION }).catch(
      (e: unknown) => e as Error,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/cli-v9\.9\.9/);
    expect((error as Error).message).toMatch(/OMA_UPDATE_CHANNEL=main/);
    expect(state.requested.some((url) => MAIN_URLS.includes(url))).toBe(false);
    // The clone last resort is pinned to the release tag, never main.
    expect(state.gitCalls).toHaveLength(1);
    expect(state.gitCalls[0]).toContain("cli-v9.9.9");
    expect(state.gitCalls[0]).not.toContain("main");
  });

  it("pins to the remote manifest's release when no version is passed", async () => {
    serveAsset(makeArchive(VERSION));

    const result = await downloadAndExtract();
    cleanups.push(result.cleanup);

    expect(result.version).toBe(VERSION);
    expect(state.requested[0]).toBe(releaseAssetUrls(VERSION).checksum);
  });

  it("refuses a malformed release version before any request", async () => {
    await expect(downloadAndExtract({ version: "../../main" })).rejects.toThrow(
      /Invalid release version/,
    );
    expect(state.requested).toEqual([]);
  });
});

describe("downloadAndExtract — main channel", () => {
  it("downloads main only when OMA_UPDATE_CHANNEL=main, with a warning", async () => {
    vi.stubEnv("OMA_UPDATE_CHANNEL", "main");
    state.routes.set(MAIN_URLS[0] as string, () =>
      makeArchive("1.0.0", "first-fluke-oh-my-agent-abc123"),
    );

    const result = await downloadAndExtract({ version: VERSION });
    cleanups.push(result.cleanup);

    expect(result.source).toBe("main-archive");
    expect(result.version).toBeNull();
    expect(result.warnings[0]).toMatch(
      /unreleased content from the main branch/,
    );
    expect(
      existsSync(join(result.dir, ".agents", "workflows", "work.md")),
    ).toBe(true);
    expect(state.requested).toEqual([MAIN_URLS[0]]);
  });
});

describe("helpers", () => {
  it("parses sha256sum output", () => {
    const digest = "a".repeat(64);
    expect(parseSha256File(`${digest}  agent-skills.tar.gz\n`)).toBe(digest);
    expect(parseSha256File(digest.toUpperCase())).toBe(digest);
    expect(parseSha256File("not-a-digest agent-skills.tar.gz")).toBeNull();
  });

  it("opts into main only for an explicit channel value", () => {
    expect(resolveUpdateChannel({})).toBe("release");
    expect(resolveUpdateChannel({ OMA_UPDATE_CHANNEL: "release" })).toBe(
      "release",
    );
    expect(resolveUpdateChannel({ OMA_UPDATE_CHANNEL: " MAIN " })).toBe("main");
  });
});
