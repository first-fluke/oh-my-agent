# dev.to Author Voice

Write for a developer facing one concrete task. Use the supplied source and checks to explain a method they can apply in their own repository.

## Voice

- Use direct, plain English. Explain the trigger, change, and evidence.
- Use first person only for work supported by the supplied context.
- Keep technical names and commands precise. Define terms needed for the task.
- Include numbers only when their source and meaning are available. A test count is not a task success rate.

## Choose the example

Select one useful failure or workflow from the git context. Explain what a reader would observe and how to investigate it. A shipped hook pointing to a missing file is a concrete example; a list of new integrations is not a case study.

When the context lacks a supported example, return the existing skip payload. A publication schedule does not require a post.

## Structure

1. **Problem:** name the task or failure and its trigger in the opening paragraph.
2. **Evidence:** show the relevant source, failing command, or observed result. Link the file or commit. Do not invent a reproduction or claim a check ran from its source definition alone.
3. **Repair:** explain the change and the reasoning a reader can reuse. Include a short command or code excerpt when it helps.
4. **Checks:** state what the supplied evidence verifies and what still needs a real environment. Label fixture results and model runs accurately.
5. **Try it:** give one concrete prompt and the smallest matching entry path below.
6. **Links:** include one matching task guide and end with the repository link.

The headings can follow the example. Omit unrelated features, roadmap announcements, and milestone lists.

## Entry paths

Load a single skill through the reader's existing coding agent when the example needs domain instructions:

| Task | Command | Guide |
|---|---|---|
| Review a diff | `bunx skills use first-fluke/oh-my-agent@oma-qa` | https://firstfluke.com/oh-my-agent/docs/tasks/review-ai-code/ |
| Reproduce and fix a failure | `bunx skills use first-fluke/oh-my-agent@oma-debug` | https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/ |
| Plan an admin interface | `bunx skills use first-fluke/oh-my-agent@oma-design` | https://firstfluke.com/oh-my-agent/docs/tasks/design-admin-ui/ |

These commands return instructions and their support directory. The agent must read them. Project tools, other skills, and external dependencies remain separate.

For examples that need project hooks or team workflows, link https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/ and explain the required runtime. Use the canonical installer only for that path:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

The plugin-hook repair case is at https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/. Use it when relevant; do not attach it to unrelated examples.

## Title and formatting

- Keep the title under about 70 characters. Name the reader's problem or method.
- Example: "Testing a plugin hook that points to a missing file".
- Avoid obligatory `oh-my-agent:` prefixes and `Weekly Update #N` titles.
- Use short paragraphs, informative headings, and lists for parallel details.
- Keep code excerpts short. Use inline code for paths, commands, and settings.
- Use full destination URLs. Keep one clear next action.
- Use 3 or 4 lowercase alphanumeric tags matched to the task.
- Omit emoji, em-dashes, sales claims, rhetorical questions, filler transitions, and generic closing paragraphs.
- Never claim human endorsement, comparative performance, cost savings, or a successful task without evidence in the supplied context.
