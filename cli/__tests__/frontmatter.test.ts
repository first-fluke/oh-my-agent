import { describe, expect, it } from "vitest";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../cli-kit/frontmatter.js";

describe("parseFrontmatter", () => {
  it("should parse basic YAML frontmatter", () => {
    const content = `---
name: test-agent
description: A test agent
---

Body content here.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.name).toBe("test-agent");
    expect(result.frontmatter.description).toBe("A test agent");
    expect(result.body).toContain("Body content here.");
  });

  it("should handle file without frontmatter", () => {
    const content =
      "Just a regular markdown file.\n\nWith multiple paragraphs.";
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(content);
  });

  it("should handle frontmatter with arrays", () => {
    const content = `---
name: agent
skills:
  - oma-backend
  - oma-db
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.skills).toEqual(["oma-backend", "oma-db"]);
  });

  it("should handle frontmatter with numbers", () => {
    const content = `---
name: agent
maxTurns: 20
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.maxTurns).toBe(20);
  });

  it("should handle malformed YAML gracefully", () => {
    const content = `---
name: [invalid yaml
---

Body.`;

    const result = parseFrontmatter(content);
    // Should not throw, returns empty frontmatter and body without frontmatter block
    expect(result.frontmatter).toEqual({});
    expect(result.body).toContain("Body.");
    expect(result.body).not.toContain("name: [invalid yaml");
  });

  it("should handle empty frontmatter", () => {
    const content = `---
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toContain("Body.");
  });

  it("should handle content with leading whitespace", () => {
    const content = `\n\n---
name: agent
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.name).toBe("agent");
  });
});

describe("serializeFrontmatter", () => {
  it("should serialize basic frontmatter", () => {
    const result = serializeFrontmatter(
      { name: "test", description: "desc" },
      "Body content.",
    );
    expect(result).toContain("---");
    expect(result).toContain("name: test");
    expect(result).toContain("description: desc");
    expect(result).toContain("Body content.");
  });

  it("should serialize arrays correctly", () => {
    const result = serializeFrontmatter(
      { name: "test", skills: ["oma-backend", "oma-db"] },
      "Body.",
    );
    expect(result).toContain("skills:");
    expect(result).toContain("  - oma-backend");
    expect(result).toContain("  - oma-db");
  });

  it("should skip null/undefined values", () => {
    const result = serializeFrontmatter(
      { name: "test", tools: undefined, model: null },
      "Body.",
    );
    expect(result).not.toContain("tools:");
    expect(result).not.toContain("model:");
  });
});
