/**
 * vault.ts
 *
 * OS-native credential storage for oma. Backed by @napi-rs/keyring,
 * which delegates to macOS Keychain, Linux Secret Service, or Windows
 * Credential Manager. A small index file under <OMA_HOME>/state/
 * tracks the key names that have been stored (values stay in the OS
 * keychain) so `oma vault list` can enumerate without ever exposing
 * secret values.
 *
 * Native module load failures are surfaced explicitly rather than
 * silently falling back, so users notice when the platform credential
 * store is unavailable (e.g. headless Linux without Secret Service).
 */

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { omaPaths } from "../utils/oma-home.js";
import { acquireOwnedDirectoryLock } from "../utils/owned-directory-lock.js";

const SERVICE = "oh-my-agent";

export interface VaultIndexEntry {
  name: string;
  createdAt: string;
}

export interface VaultIndex {
  version: 1;
  entries: VaultIndexEntry[];
}

function indexDir(): string {
  return omaPaths().state;
}

function indexPath(): string {
  return path.join(indexDir(), "vault-index.json");
}

function readIndex(): VaultIndex {
  const p = indexPath();
  if (!existsSync(p)) return { version: 1, entries: [] };
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8"));
    if (raw && raw.version === 1 && Array.isArray(raw.entries)) return raw;
  } catch {
    // Corrupted index: surface as empty so the user can re-add keys.
  }
  return { version: 1, entries: [] };
}

/** The caller holds `<indexFile>.lock` across its read/modify/write. */
export function writeVaultIndex(indexFile: string, idx: VaultIndex): void {
  const dir = path.dirname(indexFile);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
  const temporary = path.join(
    dir,
    `.vault-index-${process.pid}-${randomUUID()}.tmp`,
  );
  try {
    writeFileSync(temporary, `${JSON.stringify(idx, null, 2)}\n`, {
      encoding: "utf-8",
      mode: 0o600,
      flag: "wx",
    });
    renameSync(temporary, indexFile);
  } finally {
    try {
      unlinkSync(temporary);
    } catch {}
  }
}

function updateIndex(update: (idx: VaultIndex) => boolean): void {
  const file = indexPath();
  mkdirSync(indexDir(), { recursive: true, mode: 0o700 });
  const lock = acquireOwnedDirectoryLock(`${file}.lock`);
  if (!lock.ok)
    throw new Error("Vault index is being updated; retry this command.");
  try {
    const idx = readIndex();
    if (update(idx)) writeVaultIndex(file, idx);
  } finally {
    lock.release();
  }
}

// Lazy-load the native module so a missing platform credential store
// produces a clear error at call time, not at import time.
type KeyringEntry = {
  getPassword(): string | null;
  setPassword(value: string): void;
  deletePassword(): boolean;
};

async function makeEntry(name: string): Promise<KeyringEntry> {
  try {
    const mod = await import("@napi-rs/keyring");
    return new mod.Entry(SERVICE, name);
  } catch (err) {
    throw new Error(
      `oma vault requires @napi-rs/keyring and an OS credential store. ` +
        `On headless Linux, install and start libsecret/gnome-keyring. ` +
        `Underlying error: ${String(err)}`,
    );
  }
}

export function isValidKeyName(name: string): boolean {
  return /^[A-Za-z0-9._-]{1,64}$/.test(name);
}

function assertValidKeyName(name: string): void {
  if (!isValidKeyName(name)) {
    throw new Error(
      `Invalid vault key name ${JSON.stringify(name)}. ` +
        `Must be 1-64 chars of alphanumeric, dot, underscore, or hyphen.`,
    );
  }
}

export async function storeSecret(
  name: string,
  value: string,
): Promise<{ overwrote: boolean }> {
  assertValidKeyName(name);
  if (value.length === 0) {
    throw new Error("Refusing to store empty value in vault.");
  }
  const entry = await makeEntry(name);
  let existing: string | null = null;
  updateIndex((idx) => {
    existing = entry.getPassword();
    entry.setPassword(value);
    if (idx.entries.some((e) => e.name === name)) return false;
    idx.entries.push({ name, createdAt: new Date().toISOString() });
    return true;
  });

  return { overwrote: existing !== null };
}

export async function getSecret(name: string): Promise<string | null> {
  assertValidKeyName(name);
  const entry = await makeEntry(name);
  return entry.getPassword();
}

export async function removeSecret(name: string): Promise<boolean> {
  assertValidKeyName(name);
  const entry = await makeEntry(name);
  let removed = false;
  updateIndex((idx) => {
    removed = entry.deletePassword();
    const filtered = idx.entries.filter((e) => e.name !== name);
    if (filtered.length === idx.entries.length) return false;
    idx.entries = filtered;
    return true;
  });

  return removed;
}

export function listSecrets(): VaultIndexEntry[] {
  return readIndex()
    .entries.slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}
