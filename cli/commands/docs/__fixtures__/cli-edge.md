---
title: CLI edge case fixture
---

# CLI Disambiguation

Random prose backtick that is NOT a known binary: `notarealcommand foo bar`

Another unknown token: `fakecmd --flag`

Valid CLI inside a fenced bash block:

```bash
oma docs verify --json
git status
```

Valid inline CLI with known binary: `oma docs verify`

Not a CLI — just a file-like token: `src/some-file.ts`
