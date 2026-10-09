import { projectIdentity } from "../../.agents/hooks/core/session-storage.ts";
import { resolveProjectRoot } from "../utils/fs-utils.js";

export interface AgentMemoryScope {
  project: string;
  projectDir: string;
  profile: string;
  projectId: string;
  concept: string;
}

/** Vendor and session changes share a scope; project paths and profiles do not. */
export function createAgentMemoryScope(
  projectDir?: string,
  env: NodeJS.ProcessEnv = process.env,
): AgentMemoryScope {
  // Explicit contexts may belong to a removed worktree. Never resolve them
  // through an ancestor project and silently change a queued delivery's owner.
  const identity = projectIdentity(projectDir ?? resolveProjectRoot());
  const profile = env.OMA_PROFILE ?? identity.profile;
  if (!/^(0|[1-9][0-9]{0,9})$/.test(profile))
    throw new Error("OMA_PROFILE must be a non-negative profile number");
  return {
    project: `oma:${profile}:${identity.projectId}`,
    projectDir: identity.projectDir,
    profile,
    projectId: identity.projectId,
    concept: `oma-project:${profile}:${identity.projectId}`,
  };
}

export function scopedAgentMemorySessionId(
  scope: AgentMemoryScope,
  sessionId: string,
): string {
  return `${scope.project}:${sessionId}`;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Unknown ownership is excluded even when the server ignores its query filter. */
export function filterAgentMemoryResults(
  data: unknown,
  scope: AgentMemoryScope,
): { results: unknown[] } {
  const raw = record(data)?.results;
  if (!Array.isArray(raw)) return { results: [] };
  const prefix = `${scope.project}:`;
  return {
    results: raw.filter((value) => {
      const entry = record(value);
      const observation = record(entry?.observation);
      if (!entry || !observation) return false;
      const concepts = Array.isArray(observation.concepts)
        ? observation.concepts.filter(
            (concept): concept is string => typeof concept === "string",
          )
        : [];
      const owners = concepts.filter((concept) =>
        concept.startsWith("oma-project:"),
      );
      if (owners.some((owner) => owner !== scope.concept)) return false;
      const sessions = [entry.sessionId, observation.sessionId].filter(
        (session): session is string =>
          typeof session === "string" && session.length > 0,
      );
      const ownSession = (session: string) =>
        session.startsWith(prefix) && session.length > prefix.length;
      if (
        sessions.some((session) => session !== "memory" && !ownSession(session))
      )
        return false;
      const projects = [entry.project, observation.project].filter(
        (project) => project !== undefined && project !== null,
      );
      if (projects.some((project) => project !== scope.project)) return false;
      return owners.includes(scope.concept) || sessions.some(ownSession);
    }),
  };
}
