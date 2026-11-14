# Route selection

Select from the requested outcome, supplied input and constraints. Keywords can
help interpret context but do not override what the user is trying to obtain.

## Selection order

1. An explicit route flag or constraint decides.
2. Read a supplied or discovered URL with `fetch` when the requested result is its
   contents. A GitHub URL is not by itself a request for code-pattern search.
3. Use `docs` for a library/API contract or official version-specific instructions,
   `code` for remote implementation matches, and `web` for external discovery such
   as comparisons or current events.
4. If an unresolved ambiguity materially changes the answer, clarify that
   ambiguity before choosing.

## Examples

| Request | Primary action | Constraint |
|---|---|---|
| React 19 useEffect API | `docs` | Check the requested version |
| Next.js versus Remix | `web` | Discover comparative sources |
| OAuth PKCE implementation in a named repository | `code` | Retain repository and language filters |
| Read this GitHub file URL | `fetch` | Read that file; do not infer a broad search |
| Find handleAuth in this project | Local-code handoff | Use configured code intelligence directly |
