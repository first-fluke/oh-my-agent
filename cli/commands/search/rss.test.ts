import { describe, expect, it } from "vitest";
import { googleNewsRss, parseFeed } from "./rss.js";

describe("parseFeed — RSS 2.0", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Example Feed</title>
      <description>An example</description>
      <link>https://example.com</link>
      <item>
        <title>Post 1</title>
        <link>https://example.com/p1</link>
        <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
        <description>First post</description>
      </item>
      <item>
        <title>Post 2</title>
        <link>https://example.com/p2</link>
      </item>
    </channel>
  </rss>`;

  it("detects RSS kind and extracts entries", () => {
    const feed = parseFeed(xml);
    expect(feed?.kind).toBe("rss");
    expect(feed?.title).toBe("Example Feed");
    expect(feed?.entries).toHaveLength(2);
    expect(feed?.entries[0]?.title).toBe("Post 1");
    expect(feed?.entries[0]?.pubDate).toContain("Mon, 01 Jan 2024");
  });
});

describe("parseFeed — Atom", () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <title>Atom Feed</title>
    <subtitle>subtitle</subtitle>
    <link href="https://example.com" rel="alternate"/>
    <entry>
      <title>Entry A</title>
      <link href="https://example.com/a" rel="alternate"/>
      <published>2024-01-01T00:00:00Z</published>
      <summary>First</summary>
    </entry>
  </feed>`;

  it("detects Atom kind and extracts entries", () => {
    const feed = parseFeed(xml);
    expect(feed?.kind).toBe("atom");
    expect(feed?.title).toBe("Atom Feed");
    expect(feed?.entries[0]?.link).toBe("https://example.com/a");
    expect(feed?.entries[0]?.pubDate).toBe("2024-01-01T00:00:00Z");
  });
});

describe("parseFeed — invalid", () => {
  it("returns null for non-feed XML", () => {
    expect(parseFeed("<html><body>no feed here</body></html>")).toBeNull();
  });

  it("returns null for malformed XML", () => {
    expect(parseFeed("<<not xml>>")).toBeNull();
  });
});

describe("googleNewsRss", () => {
  it("defaults to en-US", () => {
    const url = new URL(googleNewsRss("typescript"));
    expect(url.searchParams.get("hl")).toBe("en");
    expect(url.searchParams.get("gl")).toBe("US");
  });

  it("honours locale", () => {
    const url = new URL(googleNewsRss("타입스크립트", "ko-KR"));
    expect(url.searchParams.get("hl")).toBe("ko");
    expect(url.searchParams.get("gl")).toBe("KR");
    expect(url.searchParams.get("ceid")).toBe("KR:ko");
  });
});
