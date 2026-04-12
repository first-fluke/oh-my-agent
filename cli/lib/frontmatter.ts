import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeFrontmatterValue(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeFrontmatterValue(item))
      .filter((item) => item !== undefined);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, sanitizeFrontmatterValue(item)])
        .filter(([, item]) => item !== undefined),
    );
  }

  return value;
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

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 4); // skip \n---

  try {
    const parsed = parseYaml(yamlBlock);
    const frontmatter =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
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
  const sanitizedFrontmatter = Object.fromEntries(
    Object.entries(frontmatter)
      .map(([key, value]) => [key, sanitizeFrontmatterValue(value)])
      .filter(([, value]) => value !== undefined),
  );

  if (Object.keys(sanitizedFrontmatter).length === 0) {
    return `---\n---\n\n${body}`;
  }

  const yamlBlock = stringifyYaml(sanitizedFrontmatter).trimEnd();
  return `---\n${yamlBlock}\n---\n\n${body}`;
}
