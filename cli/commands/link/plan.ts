import { homedir } from "node:os";
import { relative, sep } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";

/**
 * A single filesystem target touched by a link pass.
 *
 * `kind` distinguishes plain writes from symlink refreshes because the two
 * have different blast radii: a `write` replaces one generated file, whereas
 * a `link` refresh also prunes dangling symlinks in the target directory.
 */
export interface LinkPlanEntry {
  /** Absolute path of the file, or of the directory for symlink refreshes. */
  path: string;
  kind: "write" | "link";
  /** Which installer owns this target, for attribution in the preview. */
  reason: string;
}

/**
 * Format an absolute path for display. Paths under the install root render as
 * `<root>/…`; paths elsewhere in the user's HOME render as `~/…`. Vendors like
 * antigravity, kimi, and Claude workspace trust write outside the root, so a
 * root-relative-only formatter would emit unreadable `../../` chains.
 */
export function displayPath(entryPath: string, installRoot: string): string {
  const fromRoot = relative(installRoot, entryPath);
  if (fromRoot === "") return "<root>";
  if (!fromRoot.startsWith("..")) {
    return `<root>${sep}${fromRoot}`;
  }

  const fromHome = relative(homedir(), entryPath);
  if (fromHome !== "" && !fromHome.startsWith("..")) {
    return `~${sep}${fromHome}`;
  }

  return entryPath;
}

/**
 * Render the dry-run preview for a link pass, mirroring the two-section
 * `oma uninstall --dry-run` layout.
 *
 * The footer states the symlink-pruning caveat explicitly: `createVendorSymlinks`
 * removes dangling links as a side effect of refreshing a directory, and those
 * removals cannot be enumerated without duplicating its traversal, so the
 * preview names the directory rather than guessing at individual deletions.
 */
export function renderLinkPlan(
  plan: LinkPlanEntry[],
  installRoot: string,
): void {
  const writes = plan.filter((e) => e.kind === "write");
  const links = plan.filter((e) => e.kind === "link");

  // Pad to the widest path in this run rather than a fixed column: a fixed
  // width pushes the dimmed reason past the note box and wraps every line.
  const width = Math.min(
    44,
    Math.max(0, ...plan.map((e) => displayPath(e.path, installRoot).length)),
  );

  const format = (entries: LinkPlanEntry[], marker: string): string[] =>
    entries.map(
      (e) =>
        `  ${marker} ${displayPath(e.path, installRoot).padEnd(width)}  ${pc.dim(e.reason)}`,
    );

  const writeLines =
    writes.length === 0
      ? [pc.dim("  (nothing to write)")]
      : format(writes, pc.yellow("~"));

  const linkLines =
    links.length === 0 ? [pc.dim("  (none)")] : format(links, pc.cyan("→"));

  const content = [
    pc.bold("The following files would be created or updated:"),
    ...writeLines,
    "",
    pc.bold("The following directories would have their symlinks refreshed:"),
    ...linkLines,
    "",
    pc.dim(
      "Refreshing symlinks also prunes links whose target no longer exists.",
    ),
    pc.dim("HOME-scoped writes are skipped when that vendor is not installed."),
  ].join("\n");

  p.note(content, "Link preview");
}
