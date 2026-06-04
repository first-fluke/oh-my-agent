import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { exitCodeForError, SchemaValidationError } from "./errors.js";
import {
  ManifestSchema,
  parseVideoSchema,
  RenderSpecSchema,
  ScriptSchema,
  TimingSchema,
} from "./types.js";

const FIXTURES = path.join(__dirname, "__fixtures__");

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8"));
}

describe("video asset-bus schemas", () => {
  it.each([
    ["script.json", ScriptSchema, "script.valid.json"],
    ["timing.json", TimingSchema, "timing.valid.json"],
    ["render-spec.json", RenderSpecSchema, "render-spec.valid.json"],
    ["manifest.json", ManifestSchema, "manifest.valid.json"],
  ])("validates %s golden fixture", (schemaName, schema, fixture) => {
    const parsed = parseVideoSchema(schemaName, schema, readFixture(fixture));
    expect(parsed.schemaVersion).toBe("1.0");
  });

  it.each([
    ["script.json", ScriptSchema, "script.invalid.json"],
    ["timing.json", TimingSchema, "timing.invalid.json"],
    ["render-spec.json", RenderSpecSchema, "render-spec.invalid.json"],
    ["manifest.json", ManifestSchema, "manifest.invalid.json"],
  ])("rejects invalid %s golden fixture", (schemaName, schema, fixture) => {
    expect(() =>
      parseVideoSchema(schemaName, schema, readFixture(fixture)),
    ).toThrow(SchemaValidationError);
  });

  it("maps SchemaValidationError to exit code 4", () => {
    expect(exitCodeForError(new SchemaValidationError("bad"))).toBe(4);
  });
});
