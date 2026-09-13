export interface Session { id: string; userId: string; expiresAt: number }
/** Open a session for a user. Replaces the removed createSession helper. */
export function openSession(userId: string, ttlMs = 3_600_000): Session {
  return { id: crypto.randomUUID(), userId, expiresAt: Date.now() + ttlMs };
}
export function closeSession(session: Session): void { void session; }
