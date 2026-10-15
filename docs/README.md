# Project documentation

- [Engineering decisions](decisions/index.md): retained proposals, tradeoffs, and ADRs.
- Execution plans in `docs/plans/work/`: local implementation trackers and technical debt.
- [User guides](../web/docs/guide/usage.md): OMA commands and workflows.
- [CLI reference](../web/docs/cli-interfaces/options.md): command arguments and options.
- [Agent integrations](SUPPORTED_AGENTS.md): supported coding agents.
- [Artifact layout and migration](../web/docs/guide/artifact-layout.md): storage rules and upgrade commands.

Keep maintained project references in `docs/`, execution reports in `.agents/results/`, and coordination notes in `.agents/state/memories/`. UI design systems use `DESIGN.md`. Runtime receipts and frozen plans retain their existing profile storage.

Execution plans and adopted contracts under `docs/plans/` are ignored by default; commit the files needed by maintained documentation deliberately. Reports bound to verification evidence retain their original paths and bytes.
