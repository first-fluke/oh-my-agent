import { createHash } from "node:crypto";
import { isAbsolute } from "node:path";
import { projectIdentity } from "../../.agents/hooks/core/session-storage.ts";
import type {
  MemoryDeliveryIdentity,
  MemoryDeliveryTarget,
  MemoryProvider,
} from "../types/memory.js";

/** URLs carrying credentials or query routing cannot be safely frozen on disk. */
export function memoryEndpointIdentity(endpoint: string | null): string | null {
  if (!endpoint) return null;
  try {
    const url = new URL(endpoint);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function publicIdentity(
  identity: MemoryDeliveryIdentity,
): MemoryDeliveryIdentity {
  return {
    ...(identity.endpoint !== undefined
      ? { endpoint: memoryEndpointIdentity(identity.endpoint) }
      : {}),
    ...(identity.workspace !== undefined
      ? { workspace: identity.workspace }
      : {}),
    ...(identity.session !== undefined ? { session: identity.session } : {}),
    ...(identity.identity !== undefined ? { identity: identity.identity } : {}),
  };
}

export function createMemoryDeliveryTarget(
  projectDir: string,
  provider: MemoryProvider,
): MemoryDeliveryTarget {
  const project = projectIdentity(projectDir);
  return {
    version: 1,
    provider: provider.name,
    profile: project.profile,
    projectId: project.projectId,
    projectDir: project.projectDir,
    destination: publicIdentity(
      provider.deliveryIdentity ?? { identity: "injected" },
    ),
  };
}

export function isMemoryDeliveryTarget(
  value: unknown,
): value is MemoryDeliveryTarget {
  if (!value || typeof value !== "object") return false;
  if (
    Object.keys(value).some(
      (key) =>
        ![
          "version",
          "provider",
          "profile",
          "projectId",
          "projectDir",
          "destination",
        ].includes(key),
    )
  )
    return false;
  const target = value as Partial<MemoryDeliveryTarget>;
  if (
    target.version !== 1 ||
    !["agentmemory", "honcho", "none"].includes(target.provider ?? "") ||
    typeof target.profile !== "string" ||
    !/^(0|[1-9][0-9]{0,9})$/.test(target.profile) ||
    typeof target.projectId !== "string" ||
    !/^[a-f0-9]{64}$/.test(target.projectId) ||
    typeof target.projectDir !== "string" ||
    !isAbsolute(target.projectDir) ||
    !target.destination ||
    typeof target.destination !== "object" ||
    Array.isArray(target.destination)
  )
    return false;
  const destination = target.destination;
  if (
    Object.keys(destination).some(
      (key) => !["endpoint", "workspace", "session", "identity"].includes(key),
    )
  )
    return false;
  for (const key of ["workspace", "session", "identity"] as const)
    if (destination[key] !== undefined && typeof destination[key] !== "string")
      return false;
  if (
    destination.endpoint !== undefined &&
    destination.endpoint !== null &&
    typeof destination.endpoint !== "string"
  )
    return false;
  if (
    destination.endpoint !== undefined &&
    memoryEndpointIdentity(destination.endpoint) !== destination.endpoint
  )
    return false;
  return true;
}

export function sameMemoryDeliveryTarget(
  left: MemoryDeliveryTarget,
  right: MemoryDeliveryTarget,
): boolean {
  return memoryDeliveryTargetKey(left) === memoryDeliveryTargetKey(right);
}

export function memoryDeliveryTargetKey(target: MemoryDeliveryTarget): string {
  const { destination } = target;
  return createHash("sha256")
    .update(
      JSON.stringify([
        target.version,
        target.provider,
        target.profile,
        target.projectId,
        target.projectDir,
        destination.endpoint ?? null,
        destination.workspace ?? null,
        destination.session ?? null,
        destination.identity ?? null,
      ]),
    )
    .digest("hex");
}

export function memoryDeliveryTargetMatches(
  projectDir: string,
  target: MemoryDeliveryTarget,
  provider: MemoryProvider,
): boolean {
  // An unresolved production destination cannot authorize delivery.
  if (target.destination.endpoint === null) return false;
  return sameMemoryDeliveryTarget(
    target,
    createMemoryDeliveryTarget(projectDir, provider),
  );
}
