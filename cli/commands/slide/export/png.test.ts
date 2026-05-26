import { describe, expect, it } from "vitest";
import { parseResolution } from "./png.js";

describe("parseResolution", () => {
  it("maps 720p to 1280×720 @1x", () => {
    expect(parseResolution("720p")).toEqual({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    });
  });

  it("maps 1080p to base 1920×1080 @1x", () => {
    expect(parseResolution("1080p")).toEqual({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });
  });

  it("maps 2160p to 1920×1080 @2x (scaled capture)", () => {
    expect(parseResolution("2160p")).toEqual({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2,
    });
  });

  it("treats 4k as an alias of 2160p", () => {
    expect(parseResolution("4k")).toEqual(parseResolution("2160p"));
  });

  it("is case-insensitive", () => {
    expect(parseResolution("1440P")).toEqual(parseResolution("1440p"));
  });

  it("returns null for an unknown preset", () => {
    expect(parseResolution("8k")).toBeNull();
    expect(parseResolution("")).toBeNull();
  });
});
