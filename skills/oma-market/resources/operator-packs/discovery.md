# Operator pack used when intent=discovery — surfaces unmet needs, underserved gaps, and wish-list signals.

## English OR Clause

```
(wish OR need OR missing OR underrated OR underserved OR "I want" OR "if only" OR "why doesn't" OR gap OR overlooked OR "nobody builds" OR unmet OR "would love" OR "please add" OR "feature request")
```

## Korean OR Clause

```
(있었으면 OR 필요하다 OR 아쉽다 OR "왜 없지" OR 부족하다 OR 못 찾겠다 OR 니즈 OR 발굴 OR "추가해줘" OR "기능 요청")
```

## Usage

Discovery intent is only triggered by explicit `--intent discovery` flag or by keyword scan with confidence >= 2. It is NOT triggered by fallback chain.

```bash
# Example invocation:
oma market harvest "async standup tools (wish OR need OR missing OR underrated OR underserved OR \"I want\" OR \"if only\")" \
     --sources reddit,hn,bluesky,mastodon,github,grounding --window 30d \
     --operator-pack discovery \
  | oma market score --intent discovery \
  | oma market fuse \
  | oma market cluster \
  | oma market render --format md --intent discovery --frameworks auto
```

## Notes

- Discovery signals are forward-looking; they reveal what users want to exist, not what exists and fails.
- Combine with trend pack results to distinguish "gap that nobody has filled" from "gap that is being filled but is unknown."
- Signal quality is lower than pain signals — apply a higher `--min-trust` threshold (`verified` or `community`) in the render stage.
- Sources: Reddit (r/entrepreneur, r/startups, r/productivity) and HN "Ask HN" threads are highest-yield for discovery signals.
