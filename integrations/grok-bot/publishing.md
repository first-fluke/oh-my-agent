# Grok Bot marketplace publication

The requested deliverable is a native plugin link with **Add to Grok Bot**,
like [Pstack's registered plugin page](https://x.ai/bot/plugin/9717366).
A CLI installation or a Bot-template share link does not satisfy this contract.

Current application: submitted on 2026-11-02 UTC as **First Fluke**
(`first-fluke`). The publish portal confirmed receipt with **Thanks for applying**.
Review and the assigned native plugin ID are still pending. Do not resubmit
the same application while it is awaiting review.

## Package and application

The existing [Cursor manifest](../../.cursor-plugin/plugin.json) exposes the
portable OMA skills, the `oma-bootstrap` skill, specialist agents, rules and MCP
definitions. No binary build is required to submit this public Git repository.

Validate the checkout and print the public application fields:

```bash
node integrations/grok-bot/marketplace.mjs
```

Submit the prepared fields at [Cursor Marketplace](https://cursor.com/marketplace/publish).
Submission is an external publication action and requires the maintainer's
approval. Cursor reviews the application; submission alone is not an installable
listing. Do not invent a plugin ID or treat HTTP 200 as proof of publication.
Not-found marketplace pages can also return HTTP 200.

## Activate the link

After approval, obtain OMA's actual `https://x.ai/bot/plugin/<id>` link and run:

```bash
node integrations/grok-bot/marketplace.mjs --record-install-url 'https://x.ai/bot/plugin/ACTUAL_ID'
```

The command must verify OMA's identity and the **Add to Grok Bot** action before
writing [the site's marketplace record](../../web/src/data/grok-bot-marketplace.json).
It refuses other plugins, not-found pages and non-native URLs. `ACTUAL_ID` above
is a placeholder, not an installation link.

Review and publish the recorded link with the site. The stable entry point is
`https://firstfluke.com/oh-my-agent/grok-bot/`. Until a verified record exists,
the page reports registration pending and renders no installation button.

## Acceptance

1. The public plugin page identifies Oh My Agent and offers **Add to Grok Bot**.
2. The site's install button opens that exact registered plugin page.
3. In a signed-in Grok Bot account, install the plugin into a test Bot.
4. Verify the plugin is enabled and `oma-qa` is discoverable. Run a bounded,
   read-only task. Verify CLI/bootstrap requirements separately for a skill
   that invokes `oma`; loading skill text alone does not prove binary setup.

Keep the goal incomplete until the registered link and the actual install flow
are verified. Package checks and a pending page are preparation evidence.
