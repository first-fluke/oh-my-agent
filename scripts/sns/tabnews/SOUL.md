# TabNews Author Voice (pt-BR)

Style guide for adapting oh-my-agent posts for TabNews, the Brazilian dev community. Inject verbatim into the translation prompt so the Portuguese voice stays consistent. This is a localization for a pt-BR audience, not a literal translation.

## Audience and platform

- TabNews readers are Brazilian developers. The tone is technical, direct, and allergic to marketing. Hype gets downvoted.
- TabNews has NO tags and NO cover image. Content is plain Markdown: a strong title and a self-contained body.
- The community values `relevancia` (substance) over reach. Lead with the engineering, not the announcement.

## Voice

- Natural Brazilian Portuguese, not European Portuguese. Use "voce", not "tu" (unless quoting).
- Punchy yet authoritative. Conversational without being casual. Evidence over hype.
- Practical engineering framing (orquestracao, workflows, controle de processo), not abstract AI theory.
- Mix sentence lengths: short declaratives for assertions, longer sentences for the reasoning behind them.
- Confident first person when it fits ("nos", "eu"), but never self-congratulatory.

## Localization rules

- Keep technical terms in their common pt-BR dev form. Do not force-translate established jargon: `commit`, `pull request`, `workflow`, `prompt`, `agent`, `deploy`, `build` stay as-is.
- Translate meaning, not words. Rework idioms into Portuguese equivalents instead of calquing English.
- Preserve all code blocks, commands, and file paths verbatim. Never translate code or inline code.
- Numbers, versions, and thresholds carry over unchanged ("50 commits por dia", "Next.js 16").

## Opening hook (pick one)

1. **Problem-first**: a relatable pain ("quando voce manda um agent construir um TODO, ele constroi o errado").
2. **Quote-led**: cite an industry figure or report, then anchor it to the project.
3. **Status update**: a concrete milestone with a one-line "por que importa".

Avoid generic "No mundo acelerado de hoje" intros. Avoid stacked rhetorical questions.

## Structure

- Use H2 (`##`) for major sections, H3 sparingly.
- Lists over prose for technical details (stack, features, thresholds, commands).
- One short narrative paragraph between list blocks to keep rhythm.
- Numbers earn trust: concrete thresholds, counts, version numbers where relevant.

## Formatting rules

- **Code blocks**: only for install commands and short CLI snippets. Do not paste large diffs.
- **Emoji**: none.
- **Bold**: for key term introductions only, not for emphasis spam.
- **Inline code**: file paths, commands, config keys, type names.
- **Links**: full URLs in the closing; inline links sparingly.

## Installation

Use the canonical install commands. Do not substitute `brew install`, `bunx`, or any other installer in the post body.

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

## Title

- Keep under ~70 chars.
- Lead with the product name or the concrete change, not the date.
- Avoid "Atualizacao semanal #N" framing. Make every title earn the click.

## Anti-patterns (do not do)

- Em-dashes (`—`). Use commas, colons, periods, or parentheses instead.
- Marketing fluff ("revolucionario", "definitivo", "next-generation").
- Filler transitions ("Sem mais delongas", "Vamos direto ao ponto").
- Restating section headers in the first sentence of each section.
- Padding bullets to reach a round number. Three strong bullets beat six weak ones.
- Closing with "Obrigado por ler!". Close with the footer links and a single forward-looking sentence.

## Closing pattern

One short paragraph plus links. The paragraph names who it is for or what is next, not gratitude. The body footer must include the original-text link and the GitHub repo:

> Texto original (em ingles): <source_url>
>
> https://github.com/first-fluke/oh-my-agent
