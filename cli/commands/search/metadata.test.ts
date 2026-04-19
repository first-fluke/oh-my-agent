import { describe, expect, it } from "vitest";
import { parseMetadata } from "./metadata.js";

describe("parseMetadata", () => {
  it("extracts OGP tags", () => {
    const html = `
      <html>
      <head>
        <meta property="og:title" content="Hello World" />
        <meta property="og:description" content="A test page" />
        <meta property="og:image" content="https://example.com/img.png" />
      </head>
      </html>
    `;
    const meta = parseMetadata(html);
    expect(meta.ogp).toEqual({
      title: "Hello World",
      description: "A test page",
      image: "https://example.com/img.png",
    });
  });

  it("extracts description meta", () => {
    const html = `<meta name="description" content="short summary">`;
    const meta = parseMetadata(html);
    expect(meta.description).toBe("short summary");
  });

  it("falls back to twitter:description", () => {
    const html = `<meta name="twitter:description" content="tw desc">`;
    const meta = parseMetadata(html);
    expect(meta.description).toBe("tw desc");
  });

  it("extracts JSON-LD", () => {
    const html = `
      <script type="application/ld+json">
      {"@type":"Article","headline":"Hi"}
      </script>
    `;
    const meta = parseMetadata(html);
    expect(meta.jsonLd).toHaveLength(1);
    expect((meta.jsonLd as Array<Record<string, unknown>>)[0]?.headline).toBe(
      "Hi",
    );
  });

  it("skips invalid JSON-LD", () => {
    const html = `<script type="application/ld+json">not json</script>`;
    const meta = parseMetadata(html);
    expect(meta.jsonLd).toBeUndefined();
  });

  it("extracts title", () => {
    const html = `<title>The Page Title</title>`;
    expect(parseMetadata(html).title).toBe("The Page Title");
  });

  it("captures RSS alternate links", () => {
    const html = `
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="Site feed">
      <link rel="stylesheet" href="/style.css">
    `;
    const meta = parseMetadata(html);
    expect(meta.alternate).toHaveLength(1);
    expect(meta.alternate?.[0]?.href).toBe("/feed.xml");
  });
});
