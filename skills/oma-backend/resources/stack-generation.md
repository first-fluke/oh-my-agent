# Stack generation: backend

The generation and verification spec `/stack-set` follows for a backend project. `/stack-set` detects the stack, resolves the target skill, and writes the files below into that skill's `stack/` directory; this file says what each file must contain.

## Generate

### stack.yaml
```yaml
language: {language}
framework: {framework}
orm: {orm}
validation: {validation}
migration: {migration}
test: {test_framework}
source: detected
detected_from:
  - {manifest_file}
verify:                          # consumed by `oma verify agent backend` (see _shared/core/stack-verify.schema.json)
  detect: {manifest_file}        # e.g. package.json, pyproject.toml
  syntax:
    cmd: "{syntax_check_cmd}"    # e.g. bunx tsc --noEmit
  tests:
    cmd: "{test_cmd}"            # e.g. bunx vitest run
    skip_if_missing: "{optional_binary}"
  raw_sql:                       # raw-SQL injection grep scan — omit only when the stack has no raw-query escape hatch
    patterns:
      - "{raw_sql_pattern}"      # ORM-appropriate ERE, e.g. "\\$queryRawUnsafe\\(" (Prisma), "f[\"'].*(SELECT|INSERT|UPDATE|DELETE)" (Python)
    include_glob: "{source_glob}" # e.g. "*.ts", "*.py"
    exclude_dirs: [{build_and_dep_dirs}]  # e.g. node_modules, dist, .venv, target
```

Seed `raw_sql` patterns from the shipped preset for the language when the install has it: the existing `stack/stack.yaml` of a preset install, or `variants/{language}/stack.yaml` where the variants are present (node, python, and rust ship tested patterns). Otherwise derive patterns from the detected ORM's raw-query APIs.

### tech-stack.md
Generate tech stack reference with these MANDATORY sections:
- Framework version and core API
- ORM/DB library and usage
- Validation library
- Migration tool
- Test framework
- Linter/formatter

### snippets.md
Generate copy-paste code patterns. MANDATORY patterns (all 8 required):
- [ ] Route/Handler + Auth example
- [ ] Validation Schema example
- [ ] ORM Model/Entity example
- [ ] DI (Dependency Injection) example
- [ ] Repository pattern example
- [ ] Paginated Query example
- [ ] Migration example
- [ ] Test example

### api-template.*
Generate CRUD endpoint boilerplate in the detected language.

## Verify

- [ ] `stack.yaml` has `language`, `framework`, `orm`, `validation` fields
- [ ] `stack.yaml` has a `verify:` block with runnable `syntax.cmd` and `tests.cmd` (otherwise `oma verify agent backend` cannot dispatch)
- [ ] `stack.yaml` `verify:` includes a `raw_sql` scan with ORM-appropriate patterns (without it `oma verify agent backend` silently skips the raw-SQL injection check); omit only when the stack has no raw-query escape hatch
- [ ] `snippets.md` contains all 8 mandatory patterns
- [ ] `tech-stack.md` contains all 6 mandatory sections
- [ ] `api-template` file uses the correct language extension
- [ ] Code follows existing project conventions
