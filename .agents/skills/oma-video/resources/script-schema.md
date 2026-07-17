# script.json Schema — agent-as-key authoring reference

`oma video generate --script <path>` hard-validates the file against this
schema (mirrors `cli/commands/video/types.ts` `ScriptSchema`). A mismatch is
exit 4 (invalid-input) with the offending field named. **`schemaVersion` is
required** — omitting it is the most common authoring failure.

## Fields

| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `schemaVersion` | `"1.0"` (literal) | ✅ | exactly the string `"1.0"` |
| `mode` | `shorts` \| `explainer` \| `demo` | ✅ | must match the run's `--mode` |
| `aspect` | `9:16` \| `16:9` \| `1:1` | ✅ | concrete value — `auto` is a CLI flag, not a script value |
| `locale` | string (min 1) | ✅ | narration/caption language tag, e.g. `en`, `ko` |
| `title` | string (min 1) | ✅ | also drives the output filename slug: `<mode>-<slug>.mp4` |
| `scenes` | array (min 1, ≤ 40) | ✅ | see per-scene fields below |
| `music` | `upbeat` \| `calm` \| `none` | ✅ | recorded only — music mixing is deferred (`TODO(oma-deferred): music`) |
| `brand` | object | — | free-form; defaults to `{}` |

### Per-scene fields (`scenes[]`)

| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `id` | string (min 1) | ✅ | convention: `scene-01`, `scene-02`, … |
| `durationSec` | number > 0 | ✅ | sum ≤ 180 (`limits.max_duration_sec`); also anchors estimated caption timing |
| `narration` | string | ✅ | may be `""` for a silent scene; keep ≤ ~8 words/segment for clean caption cues |
| `onScreenText` | string[] | — | overlay lines; defaults to `[]` |
| `visual` | object | ✅ | see below |
| `visual.kind` | `still` \| `clip` \| `mixed` \| `slide` \| `capture` | ✅ | `still` (oma-image), `slide` (oma-slide, explainer), `capture` (demo footage), `clip`/`mixed` (stock/AIGC) |
| `visual.prompt` | string | — | English image prompt forwarded to oma-image (see `prompt-tips.md`) |
| `visual.ref` | string | — | reference to an existing asset (e.g. capture segment) |
| `visual.source` | string | — | provenance marker (e.g. `agent-authored`) |
| `transition` | string | — | transition-out hint |

## Minimal valid example

```json
{
  "schemaVersion": "1.0",
  "mode": "shorts",
  "aspect": "9:16",
  "locale": "en",
  "title": "Jeju coffee in 30 seconds",
  "music": "none",
  "brand": {},
  "scenes": [
    {
      "id": "scene-01",
      "durationSec": 3,
      "narration": "Jeju's coffee scene is exploding.",
      "onScreenText": ["JEJU ☕"],
      "visual": {
        "kind": "still",
        "prompt": "Aerial drone shot of Jeju coastline at golden hour, vertical composition with headroom",
        "source": "agent-authored"
      }
    },
    {
      "id": "scene-02",
      "durationSec": 4,
      "narration": "Volcanic soil, ocean air, and a cafe on every corner.",
      "onScreenText": [],
      "visual": {
        "kind": "still",
        "prompt": "Close-up of a hand pouring espresso over ice in a seaside cafe, warm light, shallow depth of field",
        "source": "agent-authored"
      }
    }
  ]
}
```

## Authoring checklist

- [ ] `schemaVersion: "1.0"` present (required literal).
- [ ] `aspect` is concrete (`9:16` / `16:9` / `1:1`) — never `auto`.
- [ ] Scene count ≤ 40, total `durationSec` ≤ 180.
- [ ] Every scene has a `visual.kind` from the enum; `still` scenes carry an English `visual.prompt`.
- [ ] `music` is set (use `"none"` unless the user asked — mixing is deferred either way).
- [ ] Validate cheaply before rendering: pass the file via `--script` with `--dry-run` first.
