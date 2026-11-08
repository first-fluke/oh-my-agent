# API Contracts

This directory owns the optional contract template, not generated API specifications. Reuse the project's existing OpenAPI, schema, or other authoritative contract before creating a parallel Markdown specification.

## When a contract artifact helps

Create or update a contract when a changed API boundary needs coordination between producers and consumers, or the task explicitly requests a specification. A scoped implementation against an existing contract does not require a PM task or a new document.

| Artifact | Location |
|---|---|
| Transient coordination contract | `.agents/results/api-contracts/{domain}.md` |
| Durable project specification, if no existing location applies | `docs/plans/contracts/{domain}.md` |
| Reusable format example | `template.md` in this directory |

Use task/session-specific domain names for independent runs that could otherwise overwrite the same transient file. Follow assigned artifact paths when supplied. Read and write with available file tools; no memory MCP is required.

## Authoring and use

1. Identify the authoritative schema and affected consumers. The assigned API owner can define the contract; PM involvement is useful for unresolved product requirements.
2. Document changed operations: method/path, input fields and validation, success/error schemas, authentication and authorization, and relevant compatibility requirements.
3. Share the contract path with affected assigned agents through the workflow's authorized coordination channel. Resolve incompatible expectations before dependent implementation. A separate approval ceremony is unnecessary when the existing contract and task already settle them.
4. Implement and verify producer/consumer compatibility with applicable schema checks, generated clients, or integration tests. If a contract changes, update its source and affected consumers within scope.

## Completion

The changed boundary is explicit, consumers can use it, and applicable compatibility checks support the result. Include pagination, rate limits, timestamp formats, and migration/deprecation behavior only when relevant. Do not invent JWT authentication, CRUD endpoints, a database, or error codes merely because the template includes an example.

Follow `../execution-policy.md` for authorization and verification. Transient artifacts do not belong in this source directory; durable specifications follow the repository's tracking policy.
