import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cursorWorkspaceChatHash } from "../../../../../utils/hash.js";
import { pathToProjectName } from "../../utils/history-parser.js";
import type { CursorStoreSnapshot } from "./store.js";

const CURSOR_PROJECTS = join(homedir(), ".cursor", "projects");

export type AgentTranscriptFile = {
  filePath: string;
  projectSlug: string;
  sessionId: string;
};

export function findAgentTranscriptFiles(): AgentTranscriptFile[] {
  if (!existsSync(CURSOR_PROJECTS)) return [];

  const files: AgentTranscriptFile[] = [];
  try {
    for (const projectSlug of readdirSync(CURSOR_PROJECTS)) {
      const transcriptsDir = join(
        CURSOR_PROJECTS,
        projectSlug,
        "agent-transcripts",
      );
      if (!existsSync(transcriptsDir)) continue;

      try {
        for (const sessionId of readdirSync(transcriptsDir)) {
          const filePath = join(
            transcriptsDir,
            sessionId,
            `${sessionId}.jsonl`,
          );
          if (existsSync(filePath)) {
            files.push({ filePath, projectSlug, sessionId });
          }
        }
      } catch {
        // skip unreadable project dirs
      }
    }
  } catch {
    // ignore permission errors
  }

  return files;
}

export function projectSlugToName(slug: string): string {
  const documentsMatch = slug.match(/^Users-[^-]+-Documents-(.+)$/);
  if (documentsMatch?.[1]) return documentsMatch[1];

  const tmpMatch = slug.match(/^private-tmp-(.+)$/);
  if (tmpMatch?.[1]) return tmpMatch[1];

  const privateMatch = slug.match(/^private-(.+)$/);
  if (privateMatch?.[1]) return privateMatch[1];

  const parts = slug.split("-");
  return parts[parts.length - 1] ?? slug;
}

export function projectSlugToPath(slug: string): string | null {
  const documentsMatch = slug.match(/^Users-([^-]+)-Documents-(.+)$/);
  if (documentsMatch?.[1] && documentsMatch[2]) {
    return `/Users/${documentsMatch[1]}/Documents/${documentsMatch[2]}`;
  }

  const tmpMatch = slug.match(/^private-tmp-(.+)$/);
  if (tmpMatch?.[1]) return `/private/tmp/${tmpMatch[1]}`;

  const privateMatch = slug.match(/^private-(.+)$/);
  if (privateMatch?.[1]) return `/private/${privateMatch[1]}`;

  return null;
}

export function workspacePathToProjectName(workspacePath: string): string {
  return pathToProjectName(workspacePath) ?? workspacePath;
}

export function buildChatHashProjectMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(CURSOR_PROJECTS)) return map;

  try {
    for (const slug of readdirSync(CURSOR_PROJECTS)) {
      const path = projectSlugToPath(slug);
      if (!path) continue;
      const hash = cursorWorkspaceChatHash(path);
      map.set(hash, projectSlugToName(slug));
    }
  } catch {
    // ignore permission errors
  }

  return map;
}

export function resolveStoreProject(
  store: CursorStoreSnapshot,
  hashProjectMap: Map<string, string>,
): string | undefined {
  if (store.workspacePath) {
    return workspacePathToProjectName(store.workspacePath);
  }
  if (store.chatHash) {
    return hashProjectMap.get(store.chatHash);
  }
  return store.meta.name || undefined;
}
