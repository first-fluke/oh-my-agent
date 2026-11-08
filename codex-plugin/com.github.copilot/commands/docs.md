---
description: Documentation drift detection and sync via `oma-docs`. Verify mode
  finds broken refs in all repo markdown (default glob `**/*.md`), sync mode
  proposes patches for docs affected by a git diff, i18n mode surfaces stale
  translations, and lint mode checks CJK em-dash style plus wrong-language
  placeholders across all locales.
---

<!-- oma:generated -->

Read and follow `.agents/workflows/docs.md` step by step. If that file is missing, run `oma install` in the project first (the oma plugin's session-start hook does this automatically when the oma CLI is installed).
