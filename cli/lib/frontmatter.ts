import { parse as parseYaml } from "yaml";

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns the parsed frontmatter object and the remaining body text.
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }
  // Adjust to point to the start of "---" (skip the "\n")
  const fmEnd = endIndex + 1;

  const yamlBlock = trimmed.slice(3, fmEnd).trim();
  const body = trimmed.slice(fmEnd + 3).replace(/^\n/, "");

  try {
    const parsed = parseYaml(yamlBlock);
    const frontmatter =
      parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    return { frontmatter, body };
  } catch {
    // Return body without frontmatter block even on parse failure
    // to prevent duplicate frontmatter on regeneration
    return { frontmatter: {}, body };
  }
}

/**
 * Serialize frontmatter + body back to markdown with YAML frontmatter.
 */
export function serializeFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else {
      const str = String(value);
      const needsQuote = /[:#\[\]{}|>&*!,'"%@`]/.test(str) || str.includes("\n");
      lines.push(`${key}: ${needsQuote ? JSON.stringify(str) : str}`);
    }
  }
  lines.push("---");
  lines.push("");
  return lines.join("\n") + body;
}
