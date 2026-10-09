import { randomUUID } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { LocalProfile } from "../../.agents/hooks/core/session-storage.js";
import { profileSlot } from "../../.agents/hooks/core/session-storage.js";
import { profileStateHome } from "../utils/oma-home.js";

export type ShellKind = "sh" | "bash" | "zsh" | "fish";

export interface ProfileStatus {
  slot: string;
  selected: boolean;
  profile: LocalProfile | null;
}

export function isProfileSlot(value: string): boolean {
  return /^(0|[1-9][0-9]{0,9})$/.test(value);
}

export function stateHome(): string {
  return profileStateHome();
}

export function profilesRoot(): string {
  return join(stateHome(), "u");
}

export function profileDirectory(slot: string): string {
  assertProfileSlot(slot);
  return join(profilesRoot(), slot);
}

export function readLocalProfile(slot: string): LocalProfile | null {
  const path = join(profileDirectory(slot), "profile.json");
  if (!existsSync(path)) return null;
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    throw new Error(`Invalid local profile: ${path}`);
  }
  if (!isLocalProfile(value, slot))
    throw new Error(`Invalid local profile: ${path}`);
  return value;
}

export function listLocalProfiles(): ProfileStatus[] {
  const selected = profileSlot();
  const root = profilesRoot();
  if (!existsSync(root)) return [];
  const profiles: ProfileStatus[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !isProfileSlot(entry.name)) continue;
    const profile = readLocalProfile(entry.name);
    if (profile)
      profiles.push({
        slot: entry.name,
        selected: entry.name === selected,
        profile,
      });
  }
  return profiles.sort((a, b) => Number(a.slot) - Number(b.slot));
}

export function selectedProfileStatus(): ProfileStatus {
  const slot = profileSlot();
  return { slot, selected: true, profile: readLocalProfile(slot) };
}

export function createLocalProfile(slot: string): LocalProfile {
  assertProfileSlot(slot);
  const path = join(profileDirectory(slot), "profile.json");
  const candidate: LocalProfile = {
    schemaVersion: 1,
    slot,
    profileId: randomUUID(),
    createdAt: new Date().toISOString(),
    account: null,
  };
  mkdirSync(profileDirectory(slot), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(candidate, null, 2)}\n`, {
      mode: 0o600,
    });
    try {
      linkSync(temporary, path);
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  const existing = readLocalProfile(slot);
  if (!existing) throw new Error(`Unable to create local profile: ${path}`);
  return existing;
}

export function shellActivation(slot: string, shell: ShellKind): string {
  assertProfileSlot(slot);
  if (shell === "fish") return `set -gx OMA_PROFILE ${slot}`;
  return `export OMA_PROFILE=${shellQuote(slot)}`;
}

function assertProfileSlot(value: string): void {
  if (!isProfileSlot(value)) {
    throw new Error("Profile slot must be a non-negative decimal number");
  }
}

function isLocalProfile(value: unknown, slot: string): value is LocalProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<LocalProfile>;
  return (
    profile.schemaVersion === 1 &&
    profile.slot === slot &&
    typeof profile.profileId === "string" &&
    profile.profileId.length > 0 &&
    typeof profile.createdAt === "string" &&
    (profile.account === null ||
      (typeof profile.account === "object" &&
        profile.account !== null &&
        typeof profile.account.issuer === "string" &&
        typeof profile.account.subject === "string"))
  );
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\\"'\\\"'")}'`;
}
