import { describe, expect, it } from "vitest";
import { findHandler, PLATFORM_HANDLERS } from "./index.js";

describe("platform registry — host matching", () => {
  const cases: Array<{ url: string; expected: string | null }> = [
    { url: "https://x.com/elonmusk", expected: "twitter" },
    { url: "https://twitter.com/elonmusk/status/12345", expected: "twitter" },
    { url: "https://www.reddit.com/r/rust/.json", expected: "reddit" },
    { url: "https://news.ycombinator.com/?id=1", expected: "hackernews" },
    {
      url: "https://stackoverflow.com/questions/12345/how",
      expected: "stackexchange",
    },
    {
      url: "https://superuser.com/questions/42/what",
      expected: "stackexchange",
    },
    {
      url: "https://unix.stackexchange.com/questions/42/what",
      expected: "stackexchange",
    },
    { url: "https://bsky.app/profile/alice.bsky.social", expected: "bluesky" },
    { url: "https://hachyderm.io/@alice", expected: "mastodon" },
    { url: "https://arxiv.org/abs/2501.12345", expected: "arxiv" },
    { url: "https://doi.org/10.1234/abc", expected: "crossref" },
    { url: "https://en.wikipedia.org/wiki/TypeScript", expected: "wikipedia" },
    { url: "https://openlibrary.org/works/OL1M", expected: "openlibrary" },
    { url: "https://lobste.rs/s/abc/foo", expected: "lobsters" },
    { url: "https://dev.to/user/post", expected: "devto" },
    { url: "https://www.v2ex.com/t/1000", expected: "v2ex" },
    { url: "https://www.npmjs.com/package/express", expected: "npm" },
    { url: "https://pypi.org/project/requests/", expected: "pypi" },
    { url: "https://blog.naver.com/id/1234", expected: "naver-blog" },
    {
      url: "https://finance.naver.com/item/main.naver?code=005930",
      expected: "naver-finance",
    },
    { url: "https://unrelated.example.com/foo", expected: null },
  ];

  for (const { url, expected } of cases) {
    it(`matches ${url} → ${expected ?? "null"}`, () => {
      const handler = findHandler(new URL(url));
      expect(handler?.id ?? null).toBe(expected);
    });
  }

  it("registry covers 16 platforms", () => {
    expect(PLATFORM_HANDLERS.length).toBeGreaterThanOrEqual(16);
  });
});
