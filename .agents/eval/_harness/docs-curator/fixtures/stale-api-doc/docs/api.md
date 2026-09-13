# Session API

Call `createSession(userId)` to start a session. It returns a `Session`
with `id`, `userId`, and `expiresAt`. Call `closeSession(session)` to end it.
