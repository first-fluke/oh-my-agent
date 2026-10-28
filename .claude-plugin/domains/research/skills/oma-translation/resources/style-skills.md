# Selected prose-style skills

Use after drafting substantive translated prose or when reviewing its style.
Select from the **target** BCP 47 primary language subtag, case-insensitively.
Source language and English code snippets do not select this route. Short
independent UI strings retain the lightweight path in the owning SKILL.md.

| Target | Skill | Upstream |
|---|---|---|
| `en`, including `en-US` and `en-GB` | `humanizer` | [blader/humanizer](https://github.com/blader/humanizer) |
| `ko`, including `ko-KR` | `humanize-korean` | [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai) |

## Resolve and load

1. Look up the selected skill in the runtime's skill catalog and read its actual
   SKILL.md in full. Confirm the entry corresponds to the listed upstream. A
   namespaced catalog entry is acceptable. Reuse an installed bundle or an
   existing upstream checkout; do not infer a path from a skill name.
2. Load the upstream references required by the selected mode from that bundle.
   OMA owns the translation boundary below, not a copy of either pattern catalog.
3. If the selected skill is absent, use the Skills CLI through Bun to load its
   instructions and supporting files into a temporary directory:

   ```bash
   bunx skills use blader/humanizer@humanizer
   ```

   For Korean on Codex, select its runtime-specific entry explicitly:

   ```bash
   bunx skills use https://github.com/epoko77-ai/im-not-ai/tree/main/codex/skills/humanize-korean
   ```

   Read the generated prompt and its supporting-files directory. Omit `--agent`:
   the current executor consumes the instructions. That flag launches another
   interactive agent; it does not choose a Korean package variant. These commands
   load instructions; the executor still performs the requested style pass.
   Reuse the resolved content for the session.
4. Korean execution requires references, role contracts and runnable Python
   scripts. Resolve the matching package from upstream's
   [installation guide](https://github.com/epoko77-ai/im-not-ai/blob/main/INSTALL.md):

   | Runtime | Entry relative to the upstream checkout |
   |---|---|
   | Codex | `codex/skills/humanize-korean/SKILL.md` |
   | Claude Code | `skills/humanize-korean/SKILL.md` |
   | GitHub Copilot | `copilot/skills/humanize-korean/SKILL.md` |
   | Gemini | Follow upstream's `GEMINI.md` extension contract |

   For other Skills CLI loads, use the exact GitHub subpath of the matching
   SKILL.md directory. A repository-wide name selector can choose a different
   runtime variant. Do not assume Claude-specific dispatch or Codex gates are
   available in an unsupported runtime.

   Check supporting files and script indirections before executing. A file that
   exists can still be a launcher depending on paths outside the temporary
   bundle. The current Codex package's launchers call scripts in the original
   repository root; copying those launchers alone does not preserve that root.
   See the upstream [launcher](https://github.com/epoko77-ai/im-not-ai/blob/main/codex/skills/humanize-korean/scripts/prepare_monolith_input.py).

   If the loaded bundle is incomplete, reuse a complete upstream checkout or a
   self-contained installation produced by upstream's installer. When neither
   exists, set `STYLE_SKILL_CHECKOUT` to a new writable task-cache or scratch
   location and fetch the complete repository:

   ```bash
   git clone --depth 1 https://github.com/epoko77-ai/im-not-ai.git "$STYLE_SKILL_CHECKOUT"
   ```

   Load the runtime entry and dependencies from that checkout, resolving symlinks
   to physical paths. This is a fallback for missing execution resources, not a
   requirement to bypass Skills CLI loading.
5. If retrieval, a supported runtime contract, or required resources are unavailable,
   complete the supported translation checks and state that the selected style
   pass was unavailable. Do not claim upstream execution or fall back to another
   language's pattern catalog. Keep upstream files outside OMA-managed definitions.

## Execute within the translation boundary

- **English:** apply Humanizer's embedded mode to the translated draft. Keep its
  pattern definitions and rewrite procedure upstream. Return the owning
  translation task's requested output, without Humanizer's default draft/critique
  wrapper.
- **Korean:** run the matching upstream contract, including its routing, role
  references and deterministic gates. Put input copies and intermediate artifacts
  in a writable scratch working directory. Missing or failing gates are not a
  verified style pass; preserve the safe draft and report the limit. Keep gate
  diagnostics and runtime banners out of translated document content. After the
  gates, use the final prose body as the candidate translation; retain upstream
  summary blocks and gate evidence in scratch rather than the delivered content.
- **Fidelity:** preserve source claims, qualifications, names, numbers, citations,
  emotional force, glossary terms and intended voice. Upstream permissions to add
  reactions, delete content or reorganize a document do not expand this task's
  scope. Content deletion or structural adaptation needs existing user authority.
- **Protected content:** pass editable prose as data. Preserve placeholders, locale
  keys, code, commands, paths, links, headings, table/list structure and untouched
  diff-sync sections. Recheck these against the source after the style pass.
- **Review:** keep proposed rewrites in scratch or memory and return supported
  findings. Do not edit source or target files. Accept zero findings.
- **Execution:** respect the current host's authorization, budgets, tool limits and
  language profile. Reuse bundles; do not reinstall, refresh or launch another
  interactive coding agent for each translation. Persistent installation follows
  the upstream guide and the already authorized scope. Keep the resolved bundle
  fixed for the run and record its revision or version when available.
