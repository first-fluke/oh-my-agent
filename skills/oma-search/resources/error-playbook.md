# Search and retrieval recovery

Preserve the failed route, provider and original constraints. Report the concrete
failure and use an available recovery within the existing scope.

## Documentation

- **No library match:** try an alternate library spelling, then discover the
  official documentation with the requested version. State the Context7 gap.
- **Empty or irrelevant excerpt:** refine the documentation topic or inspect an
  official page. Do not substitute community material for an official-only task.
- **Version unavailable:** report the missing version; identify any different
  version explicitly rather than presenting it as equivalent.

## Web discovery

- **Selected provider unavailable:** use `oma search providers` for registration
  and required credential metadata. Use `oma doctor` for credential-presence
  checks; it does not establish key validity, quota or API reachability.
  Missing Brave/Exa credentials are route failures.
  Report the required credential name without its value. Do not silently switch
  an explicit provider selection to runtime-native search.
- **Native tool absent:** report unavailable native search. Use another configured
  provider only when provider/source constraints permit it, naming the switch.
  A URL reader cannot discover results from a keyword query.
- **No results:** simplify or narrow the query within its constraints. If no
  candidate URL exists, report no result; do not invent one for `fetch`.
- **Rate limit or provider error:** preserve the reported status and retry/deadline
  limits. Do not loop or represent an authentication/quota error as an empty
  successful search.

## Known-URL retrieval

- **All strategies failed:** inspect the CLI's `attempts`, status, signals and
  archive provenance. The archive sidecar already runs after primary failures;
  do not repeat the same run solely with `--include-archive`.
- **Authentication/paywall:** report the access requirement. Keep restricted or
  unavailable content out of supporting evidence.
- **Browser or optional dependency missing:** use `oma search doctor`, an already
  available reader, or a documented `--skip` path. Do not automatically install a
  browser or dependency.
- **Timeout:** adjust the explicit request deadline when justified by the same
  operation; do not retry indefinitely.
- **Archive only:** retain snapshot provenance and date. State when it cannot
  establish current state.

## Remote code

- **Host or authentication unavailable:** report the selected `gh`/`glab` gap.
  Preserve an explicit host/repository. A host switch requires scope that permits
  the different source; do not silently replace GitLab with GitHub.
- **No matches or rate limit:** refine requested repository/language terms or
  report the gap. Do not run a retry loop or invent implementation matches.

## Source and evidence limits

- **Unknown source ownership or unread page:** mark that limit. A domain registry
  label does not verify content.
- **No result meets `--strict`:** report the missing primary source, version or
  inspected support. Broader `--wide` output remains a separate, labeled result
  set within the user's source constraints.
- **Optional trust lookup unavailable:** leave its diagnostic unknown. Continue
  with source/content evidence; do not fabricate a score.

For local-code requests, hand off directly under the shared code-intelligence
contract instead of running another external search route.
