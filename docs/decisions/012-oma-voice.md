# oma-voice Design

**Status:** Approved (brainstorm Phase 4 Gates 1-3 passed)
**Date:** 2026-05-15
**Feature:** Local-first TTS + STT skill backed by the Voicebox MCP server.

---

## 1. Concept

`oma-voice` wraps the local Voicebox desktop app and its bundled MCP server so any MCP-aware agent (Claude Code, Cursor, Cline) can generate speech or transcribe audio without cloud APIs or vendor keys. The skill is voicebox-only and MCP-only by design: the agent calls voicebox MCP tools directly, while the skill supplies intent routing, voice profile guidance, output conventions, and guardrails.

**Primary goals**
- Provide a single skill surface for three use cases: agent notifications, content asset TTS, and audio file transcription.
- Stay fully local. No API keys, no billing, no cloud round trips.
- Standardize output layout and manifests for reproducibility.
- Keep voicebox-native features (voice cloning UI, captures archive, stories editor) out of scope. Users handle those in the Voicebox app.

**Non-goals (v1)**
- Multi-vendor TTS routing (OpenAI, ElevenLabs, Gemini Voice). Future work.
- Real-time microphone dictation loop. Use Voicebox's built-in hotkey dictation.
- Automatic text chunking for long inputs. v1 only asks user intent on overflow.
- Speaker diarization beyond what voicebox returns.
- Video, music, or sound design generation.

## 2. Approach (Chosen: MCP-only, voicebox-single, standard layout)

Rejected alternatives:
- **CLI wrapper (`oma voice speak/transcribe`)** with vendor matrix: rejected because we are not planning other vendors and the wrapper would duplicate voicebox MCP without added value.
- **Minimal single-file skill**: rejected because the 7-engine voice matrix and three distinct use cases need separate reference docs to stay readable.
- **TTS/STT split into two skills**: rejected because users approved a unified scope; splitting would force cross-skill coordination for combined flows.

Chosen approach:
- Single `oma-voice` skill in `.agents/skills/oma-voice/`.
- SKILL.md drives intent, MCP tool discovery, and guardrails.
- `config/voice-config.yaml` holds defaults (profiles, engines, limits).
- `resources/` carries voice matrix, prompt tips, execution protocol, checklist.
- Agent calls voicebox MCP tools at runtime. The skill does not ship a custom CLI.

## 3. Architecture

```
Invocation (Skill /oma-voice or natural-language intent)
         │
         ▼
   Intent router (in SKILL.md)
     1. Detect mode: notify | asset | transcribe
     2. Health check voicebox via MCP handshake or REST /health
     3. Discover MCP tool names (cached after first run)
     4. Clarification if profile or text is missing
     5. Call MCP tool (voicebox_speak | voicebox_transcribe | ...)
     6. Write manifest.json next to output
     7. Return path or transcript to user
         │
         ▼
   Voicebox MCP server (http://127.0.0.1:17493/mcp)
     ├── voicebox_speak          (POST /generate)
     ├── voicebox_transcribe     (POST /transcribe)
     ├── voicebox_list_profiles  (GET  /profiles)
     └── voicebox_list_captures  (GET  /history captures view)

   Voicebox REST surface (not exposed as MCP tools, called over loopback when needed)
     ├── GET /health
     ├── GET /models/status
     └── GET /audio/{generation_id}

Output: .agents/results/voice/<timestamp>-<shortid>/
        .agents/results/voice/transcripts/<timestamp>-<shortid>/
```

### 3.1 MCP tool mapping (verified against Voicebox 0.5.0)

| Use case | MCP tool | REST backing |
|---|---|---|
| TTS generation | `voicebox_speak` | `POST /generate` |
| STT transcription | `voicebox_transcribe` | `POST /transcribe` |
| Profile listing | `voicebox_list_profiles` | `GET /profiles` |
| Captures listing | `voicebox_list_captures` | `GET /history captures view` |

Not exposed as MCP tools (REST only): `GET /models/status`, `GET /audio/{generation_id}`. The skill hits these over loopback HTTP when needed.

`voicebox_speak` schema: required `text`; optional `profile`, `engine`, `language`, `personality` (bool). Audio plays on the user speakers and is auto-saved to the Captures panel; there is no `save_to_disk` toggle.

`voicebox_transcribe` schema: exactly one of `audio_path` (loopback callers only) or `audio_base64`; optional `language`, `model`.

### 3.2 Voicebox prerequisites the skill enforces

| Step | Command or action | Verification |
|---|---|---|
| Install Voicebox app | Download installer from GitHub Releases (https://github.com/jamiepine/voicebox/releases). Not in Homebrew. | App icon present in menubar |
| Create at least one voice profile | Voicebox app UI → Profiles tab → + New Profile → clone or preset (Kokoro preset is the fastest path) | `voicebox_list_profiles` returns items |
| Register MCP | `claude mcp add --transport http voicebox http://127.0.0.1:17493/mcp` | Agent sees voicebox tools |
| Optional: pre-download engine model | App UI per engine | `GET /models/status` reports loaded |

If any prerequisite is missing, the skill emits a one-shot guidance message and exits without retrying.

## 4. Use Cases

### 4.1 Notification and narration

**Trigger:** long task completion, BLOCKED status, user approval request, workflow phase transitions.

**Defaults:**
- Short phrases only (single sentence, <= 240 chars).
- Voice profile read from `notification_profile` in config.
- Engine preference by language: Korean uses Qwen3-TTS; English uses Kokoro.
- No manifest required. Voicebox auto-saves the clip in its own Captures panel.

**Auto-invocation rules:**
- Only when task duration exceeds `auto_on_long_task_sec` (default 60s) and `notification.enabled` is true.
- The agent must announce the intent to play audio with a single text line before invoking.
- If no `notification_profile` is configured, auto-invocation is disabled and the agent surfaces a setup hint.

### 4.2 Content asset TTS

**Trigger:** explicit voiceover, tutorial narration, podcast intro, accessibility audio.

**Defaults:**
- Output: `.agents/results/voice/{timestamp}-{shortid}/output.mp3`.
- Manifest required. See section 6.2.
- `max_tts_chars` (default 5000). Above this the skill asks the user to split or truncate.
- If user did not name a profile or tone, the skill clarifies before generating.

**Clarification checklist:**
- Text content provided?
- Voice profile id or tone description provided?
- Target language explicit or detectable?
- Output format (mp3 default, wav optional)?

**Auto-invocation:** never. Always user-initiated.

### 4.3 Audio transcription

**Trigger:** user supplies an audio path with a request to transcribe, or asks for meeting notes.

**Defaults:**
- Input: absolute path or path relative to `$CWD`.
- Supported formats: mp3, wav, m4a, webm, flac.
- Output: `.agents/results/voice/transcripts/{timestamp}-{shortid}/transcript.md` plus manifest.
- Length guard: warn if input exceeds 30 minutes and ask whether to proceed.
- Speaker labeling: pass through whatever voicebox returns. No post-processing.

**Auto-invocation:** never.

## 5. Guardrails

| Guard | Action |
|---|---|
| Voicebox app not running | Health probe fails. Emit install or launch hint. Skill exits with code 5 (auth-required style). No auto-relaunch. |
| No voice profile exists | `voicebox_list_profiles` is empty. Skill points the user at the app UI to create a profile, then exits. |
| Engine model not loaded | `GET /models/status` reports missing. Skill asks the user before triggering a download. |
| Output path outside `$PWD` | Warn and require explicit user confirmation. |
| TTS length over 5000 chars | Skill asks whether to split. v1 does not auto-chunk. |
| STT length over 30 minutes | Skill asks whether to proceed. |
| Disk usage | Warn when `.agents/results/voice/` exceeds 100 MB. |
| Cancellation | SIGINT aborts MCP call and writes no partial output. |
| Auto-invocation transparency | A single pre-announcement line is required before audio playback. |
| Manifest required | Every generation writes a `manifest.json` with the six core fields. |

Cost guardrails from oma-image are intentionally omitted. Voicebox is free.

## 6. File Layout

### 6.1 Skill directory

```
.agents/skills/oma-voice/
├── SKILL.md
├── config/
│   └── voice-config.yaml
└── resources/
    ├── voice-matrix.md
    ├── prompt-tips.md
    ├── execution-protocol.md
    └── checklist.md
```

### 6.2 Output directory

```
.agents/results/voice/
├── 20260515-091533-a3b9k1/
│   ├── output.mp3
│   └── manifest.json
└── transcripts/
    └── 20260515-091820-xz7q22/
        ├── source.symlink
        ├── transcript.md
        └── manifest.json
```

### 6.3 `manifest.json` shape

```json
{
  "skill": "oma-voice",
  "mode": "tts",
  "voicebox_generation_id": "gen_abc123",
  "text": "...",
  "profile": "Nova",
  "engine": "kokoro",
  "language": "en",
  "format": "mp3",
  "duration_sec": 7.4,
  "created_at": "2026-05-15T09:15:33+09:00"
}
```

For STT manifests, `mode` is `stt`, `text` becomes `transcript_preview` (first 200 chars), and additional fields are `source_path` and `detected_language`. `format` is omitted.

## 7. `config/voice-config.yaml` Schema

```yaml
# Profile names returned by voicebox_list_profiles. Set after creating a profile
# in the Voicebox app (Profiles tab → + New Profile).
notification_profile: null
asset_profile: null

# Where TTS asset audio and STT transcripts are written.
output_dir: .agents/results/voice

# Trigger automatic voice notifications when the active task exceeds this many
# seconds. Set to null to disable auto-notification.
auto_notify_after_sec: 60

# Hard limits. Above these the skill asks the user to split or truncate.
max_tts_chars: 5000
max_stt_minutes: 30
```

Slimmed from the original draft during implementation (2026-05-15). Removed fields whose behavior is owned by Voicebox itself (`save_to_disk`, `supported_formats`), duplicates of voice-matrix.md (`engines.preferences`), borrowed-but-unused patterns from oma-image (`yes_bypass_env`, `disk_warn_mb`), and trivially derivable values (`mcp.http_url`, `skill_version`).

## 8. Engine Matrix Summary

`resources/voice-matrix.md` will own the full table. Headline picks:

| Language | First choice | Second choice |
|---|---|---|
| Korean | Qwen3-TTS | Chatterbox Multilingual |
| English | Kokoro (50 presets) | Chatterbox Turbo (emotion tags) |
| Japanese, Chinese | Qwen3-TTS | Chatterbox Multilingual |
| Mixed language | Chatterbox Multilingual | Qwen3-TTS |
| Lightweight CPU only | LuxTTS | Kokoro |
| Expressive narration | TADA (HumeAI) | Chatterbox Turbo |
| Character or cloned voice | Chatterbox Turbo + cloning | Qwen CustomVoice |

## 9. Prompt Writing Rules (resources/prompt-tips.md)

- Plain text only. Avoid SSML until voicebox confirms support.
- Use commas, periods, and line breaks for breath control.
- Spell out numbers, units, and acronyms when natural reading matters.
- Strip emojis and markdown markers before sending text.
- Keep mixed-language sentences in a single call. Pick a multilingual engine as primary.
- Notifications are one sentence and avoid stacked exclamation marks.

## 10. Execution Protocol Outline (resources/execution-protocol.md)

1. Health check voicebox via MCP handshake or `GET /health`.
2. On first run only, cache MCP `tools/list` output to override the expected tool names.
3. Read voice profiles. Abort with guidance if empty.
4. Route by mode: notify, asset, transcribe.
5. Apply clarification protocol if required signal is missing.
6. Invoke MCP tool with the resolved profile id, engine, and language.
7. Validate result. Write output and manifest.
8. Report path or transcript. Map errors to oma-image style exit codes (0 ok, 1 generic, 2 safety, 3 not-found, 4 invalid-input, 5 auth-required, 6 timeout).

## 11. Pre-flight Checklist (resources/checklist.md)

- Voicebox app reachable and healthy.
- Target voice profile id resolved.
- Text length within TTS limits, or audio duration within STT limits.
- Output path inside `$PWD` unless explicitly allowed.
- Auto-invocation announcement emitted when applicable.
- Manifest carries all six core fields.

## 12. Open Questions and Follow-up

- Resolved 2026-05-15: real MCP tool names confirmed against Voicebox 0.5.0. Section 3.1 reflects the live names (`voicebox_speak`, `voicebox_transcribe`, `voicebox_list_profiles`, `voicebox_list_captures`).
- Resolved 2026-05-15: install path is GitHub Releases. Voicebox is not in Homebrew. SKILL.md and execution-protocol.md updated.
- Open: chunking strategy for >5000 character TTS. v1.1 follow-up.
- Open: whether to publish a sibling `oma-voice-dictation` skill if users want programmatic hotkey dictation control.
- Open: cloud fallback engines (OpenAI TTS, ElevenLabs) once local-only coverage is proven.
- Open runtime smoke: Task 9-11 in plan 008 require a live voice profile in the Voicebox app. The skill, MCP wiring, and tool name mapping are verified, but TTS/STT round-trip with a real profile is still pending.

## 13. Brainstorm Approvals

- Gate 1 (skill identity and MCP integration): approved.
- Gate 2 (use case flows and guardrails): approved.
- Gate 3 (file structure and config schema): approved.

Ready for `/plan` handoff.
