# Execution Protocol

This file lays out the Voicebox generation/transcription sequence. Existing-audio processing dispatches to `audio-processing.md` before the health check; it does not require Voicebox or a profile.

## Step 0: Mode detection

Detect one of three modes from the user request:

| Signal | Mode |
|---|---|
| Short message after a long task, "tell me when done", "음성으로 알려줘" | `notify` |
| "Generate a voiceover", "make an mp3", "narrate this text", explicit length over a sentence | `asset` |
| Audio file path provided plus a "transcribe", "회의록", "받아 적어" intent | `transcribe` |
| Existing audio plus conversion, loudness, or duration fitting | `process`: use `audio-processing.md`; skip the Voicebox steps below |

If the signal is ambiguous, ask one question before proceeding.

## Step 1: Health check

Resolve `voice.backend` first (`resources/voicestudio.md`). When it selects
VoiceStudio, follow that resource instead of Steps 1-3 and 6-7; the remaining
steps still apply.

1. Probe `GET http://127.0.0.1:17493/health` with a 5-second timeout.
2. On success, continue to Step 2.
3. On failure with `voice.backend: auto`, probe VoiceStudio as described in
   `resources/voicestudio.md`. With `voice.backend: voicebox`, or when no
   backend is healthy, surface this hint, then stop and report `blocked`:
   ```
   Voicebox is not reachable. Install or launch the Voicebox desktop app
   from GitHub Releases (https://github.com/jamiepine/voicebox/releases).
   Voicebox is not in Homebrew.
     - Apple Silicon: download Voicebox_<ver>_aarch64.dmg
     - Intel Mac:     download Voicebox_<ver>_x64.dmg
     - Windows:       Voicebox_<ver>_x64-setup.exe
   Then register the MCP server in the host's MCP config
   (Streamable HTTP): http://127.0.0.1:17493/mcp
   ```

## Step 2: Tool discovery cache

Tool names, their REST backing, and the REST-only endpoints are listed in `SKILL.md` > MCP tool mapping.

On the first call in this session:

1. Invoke MCP `tools/list` on the `voicebox` server.
2. Confirm the tool required by the selected mode: `voicebox_transcribe` for `transcribe`, or
   `voicebox_speak` and `voicebox_list_profiles` for `notify` and `asset`. `voicebox_list_captures` is optional.
3. If a required tool is missing, stop, report `failed`, and name the gap. A missing profile tool
   must not block transcription. Voicebox may have renamed a tool in a newer release.

## Step 3: TTS profile resolution

Run this step only for `notify` and `asset` modes. `transcribe` has no profile
parameter: skip directly to its audio checks and then `voicebox_transcribe`.

1. Call the cached `profiles` tool.
2. If the list is empty, surface this hint, then stop and report `blocked`:
   ```
   No voice profile found in Voicebox.
   Create one in the app UI (cloning or preset), then retry.
   ```
3. Resolve the target profile in this order:
   1. Explicit `profile` argument from the user.
   2. `notification_profile` from `voice-config.yaml` when mode is `notify`.
   3. `asset_profile` from `voice-config.yaml` when mode is `asset` and the user did not specify one.
   4. Else ask the user which profile to use.

## Step 4: Clarification (asset and transcribe modes only)

Run the checklist from `SKILL.md > Clarification protocol`. Notification mode skips this step.

## Step 5: Length and duration guard

| Mode | Check | Action |
|---|---|---|
| `notify` | `len(text) <= 240` | Truncate with ellipsis; warn user |
| `asset` | `len(text) <= 5000` | Ask user to split or truncate if exceeded |
| `transcribe` | audio duration <= 30 min | Ask user to confirm if exceeded |

## Step 6: Model availability (optional)

For `asset` and `notify` modes only:

1. Probe `GET http://127.0.0.1:17493/models/status` over loopback REST (model status is not exposed as an MCP tool — see Step 2).
2. If the selected engine reports `loaded: false`, ask the user before triggering a download. Voicebox owns the download flow; this skill only relays the prompt.

## Step 7: Invoke MCP tool

Parameters and return values are in `SKILL.md` > MCP tool mapping.

- **TTS**: call `voicebox_speak` with the normalized text and the profile name resolved in Step 3. Keep the returned generation id for Step 8.
- **STT**: call `voicebox_transcribe` with exactly one of `audio_path` or `audio_base64`.

## Step 8: Persist output and manifest

### TTS output

The MCP tool has no save-to-disk: fetch the generated audio over loopback REST
(`GET /audio/{generation_id}`) and write it as `output.wav` — Voicebox stores
TTS generations as wav. If the user asked for mp3, transcode locally with
ffmpeg after the fetch and record `"format": "mp3"` in the manifest.

```text
.agents/results/voice/<YYYYMMDD-HHMMSS>-<shortid>/
├── output.wav
└── manifest.json
```

### STT output
```text
.agents/results/voice/transcripts/<YYYYMMDD-HHMMSS>-<shortid>/
├── transcript.md
└── manifest.json
```

### Manifest shape

TTS:
```json
{
  "skill": "oma-voice",
  "mode": "tts",
  "voicebox_generation_id": "gen_abc123",
  "text": "...",
  "profile": "Nova",
  "engine": "kokoro",
  "language": "en",
  "format": "wav",
  "duration_sec": 7.4,
  "created_at": "2026-05-15T09:15:33+09:00"
}
```

STT:
```json
{
  "skill": "oma-voice",
  "mode": "stt",
  "voicebox_generation_id": "gen_def456",
  "transcript_preview": "first 200 chars...",
  "source_path": "/abs/path/to/input.mp3",
  "profile": null,
  "engine": "whisper",
  "language": "ko",
  "duration_sec": 312.0,
  "created_at": "2026-05-15T09:18:20+09:00"
}
```

For notification mode no manifest is required: Voicebox auto-saves the clip to its Captures panel and that is the system of record.

## Step 9: Report

Report to the user in one short message:

- Mode (notify / tts / stt)
- Output path (or "played" for ephemeral notifications)
- Duration in seconds
- Any warnings (length truncated, disk warn fired, model fallback used)

## Outcome mapping

The skill runs MCP calls, not a CLI process, so there is no exit code. Stop and report one status:

| Situation | Status |
|---|---|
| Output or transcript written with a complete manifest | `completed` |
| Output exists but a warning applies (text truncated, model fallback) | `partial` |
| Backend not reachable, no voice profile, missing audio file, or a model download awaiting approval | `blocked` |
| Invalid input (length, format), required MCP tool missing, call error, or timeout | `failed` |

## Interruption

When a call is interrupted, do not write partial output, and report the request as not completed.

## Idempotency

- Two identical TTS calls produce two separate generations and two separate output folders. The skill does not de-duplicate.
- Voicebox's own History panel tracks all generations; users can prune it from the app UI.
