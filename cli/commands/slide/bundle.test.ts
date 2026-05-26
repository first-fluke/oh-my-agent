import { describe, expect, it } from "vitest";
import { extractRemoteLinkStylesheets, hasLocalVideoRef } from "./bundle.js";

describe("hasLocalVideoRef", () => {
  it("detects a local video via src", () => {
    const html = `<video src="./assets/intro.mp4"></video>`;
    expect(hasLocalVideoRef(html)).toBe(true);
  });

  it("detects a local video via CSS url()", () => {
    const html = `<div style="background:url('./assets/clip.webm')"></div>`;
    expect(hasLocalVideoRef(html)).toBe(true);
  });

  it("ignores remote video URLs (not a local-asset concern here)", () => {
    const html = `<video src="https://cdn.example.com/x.mp4"></video>`;
    expect(hasLocalVideoRef(html)).toBe(false);
  });

  it("returns false for image-only decks", () => {
    const html = `<img src="./assets/logo.png">`;
    expect(hasLocalVideoRef(html)).toBe(false);
  });
});

describe("extractRemoteLinkStylesheets", () => {
  it("collects remote CDN link tags", () => {
    const html = `<link rel="stylesheet" href="https://fonts.example/p.css">`;
    expect(extractRemoteLinkStylesheets(html)).toHaveLength(1);
  });

  it("skips local link tags", () => {
    const html = `<link rel="stylesheet" href="./viewport-base.css">`;
    expect(extractRemoteLinkStylesheets(html)).toEqual([]);
  });

  it("dedupes identical remote links", () => {
    const tag = `<link rel="stylesheet" href="https://fonts.example/p.css">`;
    expect(extractRemoteLinkStylesheets(tag + tag)).toHaveLength(1);
  });
});
