import { describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import {
  detectDartSdkVersion,
  reconcileSerenaRuntimeSettings,
} from "./serena-runtime-settings.js";

const exec = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFileSync: exec }));

describe("Serena runtime defaults", () => {
  it("avoids indexing an entire monorepo before a Dart file is opened", () => {
    const detect = vi.fn(() => "3.13.4");
    const result = reconcileSerenaRuntimeSettings(
      "language_servers: [dart, python]\nls_specific_settings: {}\n",
      "/project",
      detect,
    );
    expect(parse(result ?? "").ls_specific_settings.dart).toEqual({
      dart_sdk_version: "3.13.4",
      initializationOptions: { onlyAnalyzeProjectsWithOpenFiles: true },
    });
    expect(detect).toHaveBeenCalledWith("/project");
    expect(
      reconcileSerenaRuntimeSettings(result ?? "", "/project", detect),
    ).toBeNull();
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it("preserves explicit SDK, analysis behavior, other settings, and comments", () => {
    const content = `# Keep my analyzer settings
languages: [dart]
ls_specific_settings:
  python: { custom: true }
  dart:
    dart_sdk_version: '3.12.0'
    initializationOptions:
      onlyAnalyzeProjectsWithOpenFiles: false
      outline: true
`;
    const detect = vi.fn();
    expect(
      reconcileSerenaRuntimeSettings(content, "/project", detect),
    ).toBeNull();
    expect(detect).not.toHaveBeenCalled();
  });

  it("sets lazy analysis even if no local Dart is available", () => {
    const result = reconcileSerenaRuntimeSettings(
      "languages: [dart]\n# Keep this comment\nls_specific_settings:\n  dart:\n    initializationOptions: { outline: true }\n",
      "/project",
      () => undefined,
    );
    const settings = parse(result ?? "").ls_specific_settings.dart;
    expect(settings.dart_sdk_version).toBeUndefined();
    expect(settings.initializationOptions).toEqual({
      outline: true,
      onlyAnalyzeProjectsWithOpenFiles: true,
    });
    expect(result).toContain("# Keep this comment");
  });

  it.each([
    "languages: [python]\n",
    "language_servers: [typescript]\nlanguages: [dart]\n",
    "languages: [dart\n",
    "languages: [dart]\nls_specific_settings: disabled\n",
    "languages: [dart]\nls_specific_settings: { dart: [] }\n",
    "languages: [dart]\nls_specific_settings: { dart: { initializationOptions: [] } }\n",
  ])("leaves unrelated or malformed configuration untouched: %s", (content) => {
    const detect = vi.fn();
    expect(
      reconcileSerenaRuntimeSettings(content, "/project", detect),
    ).toBeNull();
    expect(detect).not.toHaveBeenCalled();
  });
});

describe("Dart SDK detection", () => {
  it("reads the stable SDK selected in the project directory with a bounded probe", () => {
    exec.mockReturnValue("Dart SDK version: 3.13.4 (stable) on macos_arm64\n");
    expect(detectDartSdkVersion("/workspace/mobile")).toBe("3.13.4");
    expect(exec).toHaveBeenLastCalledWith(
      "dart",
      ["--version"],
      expect.objectContaining({
        cwd: "/workspace/mobile",
        timeout: 5000,
        maxBuffer: 8192,
      }),
    );
  });

  it.each([
    "Dart SDK version: 3.14.0-1.0.dev (dev)",
    "Dart SDK version: 3.14.0 (beta)",
    "unrecognized",
  ])("does not construct a stable download from %s", (output) => {
    exec.mockReturnValue(output);
    expect(detectDartSdkVersion("/project")).toBeUndefined();
  });

  it("tolerates a missing SDK or a timed-out version manager", () => {
    exec.mockImplementation(() => {
      throw new Error("ETIMEDOUT");
    });
    expect(detectDartSdkVersion("/project")).toBeUndefined();
  });
});
