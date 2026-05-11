# dev.to Author Voice — gracefullight

Style guide distilled from the author's existing dev.to posts. Inject this verbatim into the prompt when generating new posts so the voice stays consistent.

## Voice

- Punchy yet authoritative. Conversational without being casual. Evidence over hype.
- Practical engineering framing (orchestration, workflows, process control), not abstract AI theory.
- Mix sentence lengths: short declaratives for assertions, longer sentences for the reasoning behind them.
- Confident first person when it fits ("we", "I"), but never self-congratulatory.

## Opening hook (pick one)

1. **Problem-first**: a relatable pain ("when you tell an agent to build a TODO app, it builds the wrong thing").
2. **Quote-led**: cite an industry figure or a report, then anchor it to the project.
3. **Status update**: a concrete milestone ("X just merged into Y") with a one-line "why it matters".

Avoid generic "In today's fast-paced world" intros. Avoid rhetorical questions stacked back-to-back.

## Structure

- Use H2 (`##`) for major sections, H3 sparingly.
- Lists over prose for technical details (stack, features, thresholds, commands).
- One short narrative paragraph between list blocks to keep rhythm.
- Numbers earn trust: include concrete thresholds, counts, version numbers when relevant ("50 commits a day", "Next.js 16", "+25 points for a correction").

## Formatting rules

- **Code blocks**: only for install commands and short CLI snippets. Do not paste large diffs.
- **Emoji**: none. If absolutely needed, one is the cap.
- **Bold**: for key term introductions only, not for emphasis spam.
- **Inline code**: file paths, commands, config keys, type names.
- **Links**: shortened or full URLs in the closing; inline links sparingly.

## Required sections for a weekly update post

1. **Hook**: one of the three opening patterns above. Tie it to the week's theme.
2. **What's new**: a bullet list of additions (features, modules, integrations).
3. **What's fixed**: a bullet list of bug fixes worth surfacing. Skip if trivial.
4. **What's better**: refactors, performance, DX wins. Concrete numbers where possible.
5. **Installation**: use the canonical curl one-liner. Do not substitute `brew install`, `bunx`, or any other installer in the post body.
   ```bash
   # macOS / Linux
   curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
   ```
   ```powershell
   # Windows (PowerShell)
   irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
   ```
6. **Links**: GitHub repo link last. Optionally include the previous post URL if continuing a thread.

## Tags

Always include 3-4 tags. Anchor set: `#ai #productivity #programming`. Rotate the 4th based on theme: `#opensource`, `#showdev`, `#webdev`, `#agents`, `#vibecoding`.

## Title

- Keep under ~70 chars.
- Lead with the product name or the concrete change, not the date.
- Avoid "Weekly Update #N" framing. Make every title earn the click.
- Good: "oh-my-agent: parallel orchestration now ships with X"
- Bad: "Weekly digest, May 12"

## Anti-patterns (do not do)

- Em-dashes (`—`). Use commas, colons, periods, or parentheses instead.
- Marketing fluff ("revolutionary", "game-changing", "next-generation").
- Filler transitions ("Without further ado", "Let's dive in").
- Restating section headers in the first sentence of each section.
- Padding bullets to reach a round number. Three strong bullets beat six weak ones.
- Closing with "Thanks for reading!". Close with the GitHub link and a single forward-looking sentence.

## Closing pattern

One short paragraph plus GitHub link. The paragraph names who it's for or what's next, not gratitude.

Example shape:

> oh-my-agent is built for teams who orchestrate more than they prompt. Next up: <one concrete thing on the roadmap>.
>
> https://github.com/first-fluke/oh-my-agent
