import { describe, expect, it } from "vitest";
import { isSafeOutputName } from "./fetch-video.js";

describe("isSafeOutputName", () => {
  it("accepts a bare filename", () => {
    expect(isSafeOutputName("clip.mp4")).toBe(true);
    expect(isSafeOutputName("my_video-01.webm")).toBe(true);
  });

  it("rejects traversal and separators (would escape assets/)", () => {
    expect(isSafeOutputName("../../foo.mp4")).toBe(false);
    expect(isSafeOutputName("sub/clip.mp4")).toBe(false);
    expect(isSafeOutputName("sub\\clip.mp4")).toBe(false);
    expect(isSafeOutputName("clip..mp4")).toBe(false);
    expect(isSafeOutputName("")).toBe(false);
  });
});
