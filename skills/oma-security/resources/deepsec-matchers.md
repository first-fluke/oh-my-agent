# Deepsec matcher and coverage work

Load only for a concrete coverage gap or explicit matcher request. Matchers select source for investigation; a match alone is not a vulnerability.

## Inspect before changing

Read the installed matcher types/samples, the project's surface inventory, generated matchers and candidate counts. State the missed ingress primitive and representative source files. Distinguish unsupported language/parsing from a missing matcher.

Prefer setup's validated declarative specs for bounded regex selection. Keep their schema validation, examples, unique slugs and breadth checks intact. Do not evaluate model-generated TypeScript as a declarative proposal.

A hand-authored plugin is appropriate when the selection requires negative conditions, multiple contextual searches or syntax-aware organization rules. Review it as code. Use the installed `MatcherPlugin` and `regexMatcher` signatures rather than assuming a copied example still compiles.

## Acceptance checks

For each proposal retain:

- The ingress/surface IDs and revision it intends to cover.
- Narrow relative source globs, language/framework prerequisites and a unique slug.
- Representative matching examples and nearby nonmatching controls.
- The expected candidate family/count and measured results.
- A rationale for its noise tier; this is candidate selection metadata, not finding severity or validation confidence.

Add the plugin without dropping `generatedMatchersPlugin` or other selected plugins. Keep generated data separate from richer reviewed code. Avoid catch-all globs and expensive regexes.

Use the installed focused scan syntax, for example:

```bash
npx deepsec scan --matchers project-rpc-ingress
```

Inspect actual candidates, including samples across each intended family and false-match controls. Reconcile full inventory coverage using the installed setup/resume procedure only when its model/cost effects are authorized. A focused scan cannot establish full coverage.

If validation rejects a proposal or it floods the candidate set, retain the rejection/breadth evidence, narrow the rule and repeat the bounded check. Do not bypass safeguards, erase state or label the remaining surface checked.

Store the accepted configuration/matcher digests in `run.json`, including intentionally excluded surfaces. Feed discovered candidates through the same independent validation contract as built-in matcher results.

Sources: [writing matchers](https://github.com/vercel-labs/deepsec/blob/main/docs/writing-matchers.md), [architecture](https://github.com/vercel-labs/deepsec/blob/main/docs/architecture.md).
