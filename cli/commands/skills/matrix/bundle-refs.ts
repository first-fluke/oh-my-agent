import path from "node:path";

/** Literal inline-code and Markdown-link .md paths; templates and remote URLs are excluded. */
export function installedMarkdownReferences(content: string): string[] {
  const references = new Set<string>();
  for (const match of content.matchAll(/`([^`\n]+)`|\]\(([^)\n]+)\)/g)) {
    let reference = (match[1] ?? match[2] ?? "").trim();
    if (reference.startsWith("<") && reference.endsWith(">"))
      reference = reference.slice(1, -1);
    reference = reference.replace(/#[^\s]*$/, "");
    if (
      reference.endsWith(".md") &&
      !/^[a-z][a-z0-9+.-]*:/i.test(reference) &&
      !reference.startsWith("//") &&
      !/[{}*?\n\r]/.test(reference) &&
      !reference.includes(" ")
    )
      references.add(reference);
  }
  return [...references].sort();
}

export function resolveInstalledReference(
  skill: string,
  reference: string,
): string {
  return path.posix.normalize(path.posix.join(skill, reference));
}

export function outsideInstalledRoot(
  reference: string,
  resolved: string,
): boolean {
  return (
    path.posix.isAbsolute(reference) ||
    resolved === ".." ||
    resolved.startsWith("../") ||
    reference.includes("\\")
  );
}
