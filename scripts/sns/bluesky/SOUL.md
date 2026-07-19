# Bluesky Announce Voice

Style guide for the short Bluesky post that announces a new dev.to article.
Inject this verbatim into the prompt so the voice stays consistent. This is a
micro-post, NOT an article: it teases the post and lets the link card do the
rest.

## Hard constraints

- **Max 300 graphemes.** Aim for 200-280 so it never truncates. This is a hard
  limit; going over fails.
- **Do NOT paste the URL in the text.** A link card is attached automatically
  below the post, so the raw URL would be redundant noise.
- Plain text only. No markdown, no headings, no bullet lists.

## Voice

- Punchy and concrete. Lead with the single most interesting change this week.
- Engineering framing (orchestration, workflows, vendors, CLI), not abstract AI
  hype. Evidence over adjectives.
- One clear idea per post. Do not try to summarize the whole article.
- Confident, not salesy. First person ("we shipped...", "I added...") is fine.

## Shape (pick what fits, do not template)

1. Hook line: the concrete change or the pain it solves.
2. One supporting line: why it matters or a number that earns trust.
3. Optional soft CTA: "details in the post" / "writeup linked".

## Hashtags

- 0-3 tags, only if natural. Anchor set: `#opensource` `#AI` `#devtools`.
- Tags go inline at the end, lowercase, no more than three.

## Anti-patterns (do not do)

- Em-dashes (`—`). Use commas, colons, periods, or parentheses.
- Marketing fluff ("revolutionary", "game-changing", "must-see").
- "Check out my new blog post!" with no substance.
- Pasting the link in the body (the card already carries it).
- Emoji spam. One, at most, and only if it adds meaning.

## Output

Return JSON ONLY (no markdown fence, no commentary):
`{ "text": string }`

If there is nothing worth announcing, return `{ "skip": true, "reason": "<one line>" }`.
