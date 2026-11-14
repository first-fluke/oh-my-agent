# OpenAlex API Key Setup (Optional)

OpenAlex powers metadata enrichment during Generate mode by backfilling missing DOI, venue, and year from a vast academic catalog. **The skill works without a key**: enrichment and the search fallback run anonymously, and a key only raises the rate limit.

## When you need this

- You frequently generate sidecars from raw text/LaTeX where DOI is not visible
- You want DOI/venue auto-resolved from the title
- You hit anonymous rate limits ("$1/day" allowance exhausted)

## Free Tier (Generous)

Without any key, OpenAlex grants $1/day equivalent free quota:
- **Unlimited** single-entity lookups
- **10,000** list/filter calls per day
- **1,000** search calls per day
- **100** content downloads per day

For most users, anonymous use is enough.

## Get a Key (30 seconds)

1. Sign up: https://openalex.org/
2. Generate key: https://openalex.org/settings/api
3. Copy the key

## Configure

### Option A: Per-shell environment

```bash
export OPENALEX_API_KEY="your_key_here"
```

### Option B: Polite-pool email only (no key)

If you don't want to sign up but want priority, set just an email:

```bash
export OPENALEX_EMAIL="you@example.com"
```

This puts you in the "polite pool" with better latency, no key required.

## Verify

```bash
curl -s "https://api.openalex.org/works?search=attention+is+all+you+need&api_key=$OPENALEX_API_KEY" \
  | head -c 500
```

A 200 response with JSON results means the key is live.

## Pricing Beyond Free Tier

OpenAlex uses pay-as-you-go past the daily free allowance, with no monthly subscription. Most academic users never exceed the free tier. See https://openalex.org/pricing for current rates.

## Skill Behavior

`oma scholar` reads only the process environment:

1. `OPENALEX_API_KEY` set -> sent as `api_key`
2. `OPENALEX_EMAIL` set -> sent as `mailto` (polite pool)
3. Neither set -> anonymous calls
4. On 403/429 -> stop enrichment, tell the user to set the key, leave fields omitted (anti-fabrication)

## Privacy

- The key (or email) is sent to OpenAlex servers as a query parameter
- No source paper content is sent to OpenAlex; only title/author search strings
- OpenAlex is operated by OurResearch (a non-profit); see their privacy policy at https://openalex.org/
