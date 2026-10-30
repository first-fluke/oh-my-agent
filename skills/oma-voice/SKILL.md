---
name: oma-voice
description: Generate or transcribe speech with Voicebox or VoiceStudio, or
  process existing audio locally. Use for narration, transcripts, timed speech,
  and loudness conversion; video editing uses oma-video.
---

# Voice Skill - Speech and Local Audio Processing

## Scheduling

### Goal
Generate and transcribe speech through a local speech backend (the Voicebox app, or VoiceStudio per `voice.backend`), and process existing audio with local media tools. The backend owns synthesis engines and profiles; FFmpeg owns file conversion, duration adjustment, and loudness processing.

### Intent signature
- User asks to generate speech, narrate text, produce a voiceover, create an mp3 or wav from text.
- User wants an audio file transcribed into text, meeting notes, or a transcript.
- User asks for a voice notification when a long task completes or a workflow step is blocked.
- Another skill needs local audio generation infrastructure.
- User needs existing speech fitted to a time window, resampled, converted, or loudness-normalized.

### When to use
- Generating short notification audio for agent task completion or blockers.
- Producing voiceover, narration, or audio assets (mp3 or wav) for apps and content.
- Transcribing local audio files (mp3, wav, m4a, webm, flac) to Markdown.
- Comparing voice profiles by re-running the same text against different profile ids.
- Processing an existing audio asset, including speech used in an `oma-video` dubbing job.

### When NOT to use
- Cloud TTS or high-fidelity multilingual cloud voices -> out of scope; future multi-vendor extension.
- Real-time microphone dictation loop in the terminal -> use Voicebox app's built-in hotkey dictation.
- Voice cloning sample upload and profile creation -> done in the Voicebox desktop app UI.
- Video editing and audio/video placement -> `oma-video`; music and sound design are out of scope.
- Stories Editor multi-voice timeline composition -> use the Voicebox app UI.

### Expected inputs
- TTS: text (<= 5000 chars per call), optional profile id, optional engine, optional language, optional output path.
- STT: audio file path (absolute or relative to `$CWD`), optional language hint.
- Notification: short message (<= 240 chars), profile id resolved from config.
- Processing: existing audio path, requested operations, and any stated duration, sample rate, channel layout, loudness, or format constraints. Derive targets from the brief, not a universal mastering preset.

### Expected outputs
- TTS: audio file (`wav` — Voicebox's native TTS output format; `mp3` optional via a local ffmpeg transcode) at `.agents/results/voice/{timestamp}-{shortid}/output.{wav|mp3}` plus `manifest.json`.
- STT: `transcript.md` at `.agents/results/voice/transcripts/{timestamp}-{shortid}/` plus `manifest.json`.
- Notification: ephemeral playback through Voicebox; no disk write by default.
- Processing: a separate processed audio file plus `manifest.json` containing source/output paths, operations, and measured audio properties. Keep the source intact. A generation id is present only when Voicebox actually generated the audio.

### Dependencies
- Processing only: installed `ffmpeg` and `ffprobe`; no Voicebox app or voice profile is required.
- Generation/transcription: Voicebox desktop app installed and running locally, or a running VoiceStudio backend selected through `voice.backend` (`resources/voicestudio.md`).
- Generation/transcription only: Voicebox MCP registered (`claude mcp add --transport http voicebox http://127.0.0.1:17493/mcp`).
- TTS only: at least one voice profile created in the Voicebox app UI.
- TTS only: optionally pre-downloaded engine models for the selected profile.

### Control-flow features
- Branches by mode (notify, asset, transcribe), language, and profile availability.
- Calls voicebox via MCP tools, with REST `GET /health` as the handshake probe.
- Reads input audio files and writes generated audio plus manifests.
- Caches discovered MCP tool names after the first successful `tools/list`.

## Structural Flow

### Entry
1. Detect the requested mode: notification, asset TTS, transcription, or existing-audio processing. For processing, follow `resources/audio-processing.md` directly, before any Voicebox health, profile, or model lookup.
2. Resolve `voice.backend` (`auto` tries Voicebox, then VoiceStudio). For VoiceStudio, follow `resources/voicestudio.md` from here; the steps below describe Voicebox. Verify Voicebox is reachable via MCP handshake or `GET /health`.
3. On the first run only, call MCP `tools/list` and cache the resolved tool names.
4. For notification or asset TTS, resolve the target voice profile id. For transcription,
   validate the audio input and continue without a profile.

### Scenes
1. **PREPARE**: Resolve the operation and its inputs. Voicebox modes use text/audio and language; TTS additionally needs a profile. File processing uses the source and requested media properties.
2. **ACQUIRE**: If a required signal is missing, run the clarification protocol once.
3. **ACT**: Invoke the appropriate MCP tool (TTS or STT), or process the existing asset with local FFmpeg commands.
4. **VERIFY**: Confirm the response carries audio output or transcript content. Validate manifest fields.
5. **FINALIZE**: Write `manifest.json` alongside the output. Report the path or transcript to the user.

### Transitions
- For generation/transcription, if Voicebox is unreachable, surface the install or launch hint and exit. Do not attempt auto-relaunch. Existing-file processing continues without it.
- Loopback addresses refer to the process's own host or container. Invoke a host Voicebox service from the host, then transfer the resulting file to the task container; a container's `127.0.0.1` does not probe the host app.
- For timed narration, keep the raw generation. Select a language-capable available profile, measure the raw duration, and use `resources/audio-processing.md` for fitting. A neural engine or correct loudness does not establish natural pronunciation or prosody.
- If a TTS request has no usable profile, point the user at the Voicebox app UI to create a profile, then exit. A transcription request never needs a profile.
- If a TTS request exceeds 5000 chars, ask whether to truncate or split. Do not auto-chunk in v1.
- If an STT input exceeds 30 minutes, ask whether to proceed. Do not auto-split.
- If the selected engine model is not loaded, ask the user before triggering a download.

### Failure and recovery
| Failure | Recovery |
|---------|----------|
| No selected backend reachable | Print the Voicebox install/launch hint (and VoiceStudio for `auto`), exit code 5 |
| No voice profile for TTS | Print "create a profile in Voicebox" hint, exit code 3 |
| Engine model missing | Ask before triggering download |
| Output path outside `$PWD` | Use an explicitly requested path; ask only if the destination is ambiguous or overwrites unrelated data |
| TTS over 5000 chars | Ask the user to split or truncate |
| STT over 30 minutes | Confirm only if the requested duration or resource cost is unresolved |
| MCP tool name drift | Re-run `tools/list` and update the cache |
| SIGINT | Abort the MCP call, write no partial output |
| Local media executable missing | Report the missing tool for the requested operation; do not start Voicebox or replace audio with a placeholder |
| Speech cannot fit naturally | Retain the raw audio; adjust generation pacing when synthesis is available and authorized, or report the unresolved timing constraint instead of clipping words |

### Exit
- Success: audio file or transcript exists with a complete manifest, and the path is reported.
- Partial success: output exists but a guardrail warning is surfaced (length, disk, model fallback).
- Failure: no output, the blocker (auth, profile, engine, network) is explicit.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Validate mode and inputs | `VALIDATE` | Clarification protocol in execution-protocol.md |
| Resolve TTS voice profile | `SELECT` | `voicebox_list_profiles` + config defaults |
| Health check | `READ` | MCP handshake or `GET /health` |
| Generate speech | `CALL_TOOL` | MCP `voicebox_speak` |
| Transcribe audio | `CALL_TOOL` | MCP `voicebox_transcribe` |
| Write output and manifest | `WRITE` | Audio or transcript plus `manifest.json` |
| Inspect result | `VALIDATE` | Output presence, duration, manifest fields |
| Report result | `NOTIFY` | Final user-facing summary |

### Tools and instruments
- Voicebox MCP server at `http://127.0.0.1:17493/mcp` for generation/transcription; local FFmpeg and ffprobe for existing audio.
- REST surface for health and audio retrieval (`GET /health`, `GET /audio/{generation_id}`).
- Resource references: voice matrix, prompt tips, execution protocol, checklist.

### Canonical command path

Dispatch existing-audio work to `resources/audio-processing.md`. The path below
is for Voicebox generation/transcription only; timed TTS follows the processing
reference after fetching the raw WAV.

```text
# 1. MCP handshake or REST health
GET http://127.0.0.1:17493/health  ->  200 OK

# 2. Discover tool names on first run
MCP tools/list                      ->  cache real names

# 3. TTS only: resolve profile
MCP voicebox_list_profiles          ->  pick profile by name or config default

# 4. Generate or transcribe (STT skips profile lookup and model-status check)
MCP voicebox_speak     { text, profile, language?, engine?, personality? }
MCP voicebox_transcribe { audio_path | audio_base64, language?, model? }

# 5. Fetch the generated audio (MCP has no save-to-disk; TTS output is wav)
GET http://127.0.0.1:17493/audio/{generation_id}  ->  wav bytes

# 6. Persist output + manifest
.agents/results/voice/<timestamp>-<shortid>/output.wav + manifest.json
.agents/results/voice/transcripts/<timestamp>-<shortid>/transcript.md + manifest.json
```

### MCP tool mapping (verified against Voicebox 0.5.0)

| Use case | MCP tool | REST backing |
|---|---|---|
| TTS generation | `voicebox_speak` | `POST /speak` |
| STT transcription | `voicebox_transcribe` | `POST /transcribe` |
| Profile listing | `voicebox_list_profiles` | `GET /profiles` |
| Captures listing | `voicebox_list_captures` | `GET /history` (captures view) |

Tools not exposed via MCP (REST only): model status (`GET /models/status`), audio file serving (`GET /audio/{generation_id}`), per-version audio (`GET /audio/version/{version_id}`). The skill calls those over loopback HTTP when needed.

**Notes on `voicebox_speak`:**
- Required: `text`. Optional: `profile`, `engine`, `language`, `personality` (bool).
- Audio plays on the user speakers and is saved to the Captures / History panel automatically. There is no `save_to_disk` toggle on the MCP tool itself; to persist a local copy, fetch `GET /audio/{generation_id}` (Voicebox TTS always stores `wav`).
- Without a default profile set in Voicebox Settings, `profile=` is required.

**Notes on `voicebox_transcribe`:**
- Accepts exactly one of `audio_base64` or `audio_path` (loopback only). Optional `language`, `model`.

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `LOCAL_FS` | Input audio, generated audio, transcripts, manifests |
| `PROCESS` | Local Voicebox app (managed by the user), FFmpeg/ffprobe processing |
| `NETWORK` | Loopback HTTP to Voicebox `127.0.0.1:17493`, or the user's configured VoiceStudio backend (default `127.0.0.1:3900`) |
| `MEMORY` | Cached MCP tool names, resolved profile metadata |
| `CREDENTIALS` | None for Voicebox. A protected VoiceStudio backend uses the user's `OMNIVOICE_API_KEY`; never print it. |

### Preconditions
- Processing: local `ffmpeg` and `ffprobe` can read the source asset.
- Generation/transcription: Voicebox app is running and the MCP handshake succeeds.
- TTS only: at least one voice profile exists.
- TTS only: the selected engine model is loaded or the user approves a download.
- Output directory is inside `$PWD` unless explicitly allowed.

### Effects and side effects
- Creates audio files, transcripts, and manifests under `.agents/results/voice/`.
- Existing-audio processing runs local media subprocesses and preserves the input file.
- Triggers local Voicebox generation, which consumes CPU or GPU.
- May trigger an engine model download when the user approves.
- Does not call any cloud service. VoiceStudio cloud features and remote backends run only when the user chooses them.

### Guardrails

1. **Voicebox modes**: generation/transcription requires the MCP handshake or `GET /health`. On failure, exit with a one-shot install or launch hint; do not retry or auto-relaunch. Local processing does not require Voicebox.
2. **Profile required for TTS only**: resolve a profile and check the TTS engine only for notification or asset mode. Transcription proceeds with a valid audio input and optional STT model even when no profile exists.
3. **Tool-name discovery**: on the first Voicebox invocation, call MCP `tools/list` and cache the resolved names. Reuse the cache for subsequent calls in the same session.
4. **Length limits**: TTS calls cap at 5000 chars per call; warn at 2000. STT inputs cap at 30 minutes. v1 does not auto-chunk or auto-split.
5. **Auto-invocation transparency**: notifications fire automatically only when the active task exceeds `auto_notify_after_sec` (default 60s). This threshold is agent-enforced guidance — no hook measures task duration — so apply it by judgment when a long task completes or blocks. Always announce intent in one short line before generating audio.
6. **Path safety**: an explicitly requested output path authorizes writing there. Resolve ambiguity or unrelated-data replacement before the dependent write; preserve required CLI path flags.
7. **Cancellation**: SIGINT aborts the MCP call and writes no partial output.
8. **Manifest required for persisted output**: asset TTS and transcription modes write `manifest.json` with at minimum: `skill`, `mode`, `voicebox_generation_id`, `text` (or `transcript_preview`), `profile`, `engine`, `language`, `format` (TTS only), `created_at`. Processing records the source, operations, and measured output properties as specified in `resources/audio-processing.md`; it never invents Voicebox provenance. Notification mode is exempt because Voicebox Captures is its system of record and no disk output is written by default.
9. **Out of scope**: the Voicebox cloning UI, captures archive, stories editor, microphone dictation loop, and cloud vendors are intentionally not exposed. VoiceStudio cloning and voice design run only on an explicit request with the voice owner's permission (`resources/voicestudio.md`).
10. **No cost guard**: Voicebox is free. The cost guardrail from `oma-image` does not apply.

### Clarification protocol

Before invoking a TTS or STT call, the agent checks the following. If any required signal is missing, clarify with the user first.

**TTS (asset mode) required:**
- [ ] Text content provided?
- [ ] Voice profile id or tone description provided?

**TTS strongly recommended:**
- [ ] Language explicit or detectable from the text?
- [ ] Output format (wav default; mp3 requires a local ffmpeg transcode)?

**STT required:**
- [ ] Audio path provided and the file exists?
- [ ] Duration within 30 minutes, or user approves splitting?

**Notification mode skips clarification.** It uses `notification_profile` from config and language is auto-detected from the message.

### Invocation

#### Standalone
```text
/oma-voice "build succeeded, 4 minor warnings"
/oma-voice transcribe ~/Downloads/standup.m4a
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
```

#### Shared infrastructure (other skills)

Other skills can request audio output by calling the same MCP tools directly, or by invoking `/oma-voice` with their text. There is no separate CLI; the skill is MCP-native.

## References

- Voice engine matrix: `resources/voice-matrix.md` (TTS profile/engine selection)
- Prompt writing rules: `resources/prompt-tips.md` (TTS text)
- Execution protocol: `resources/execution-protocol.md` (Voicebox generation/transcription)
- VoiceStudio backend: `resources/voicestudio.md` (backend resolution, upstream skill routing, consent)
- Existing audio and timed narration: `resources/audio-processing.md` (processing, duration fitting, or requested loudness conversion)
- Pre-flight checklist: `resources/checklist.md` (Voicebox calls)
- Configuration: read the `voice:` section of `.agents/oma-config.yaml` first, then fall back to `config/voice-config.yaml` for any key it does not set. `voice.backend` (`auto` | `voicebox` | `voicestudio`, default `auto`) lives only in oma-config. Both profiles ship as `null` and must be set per machine — write them to `.agents/oma-config.yaml`, since `oma update` overwrites the skill config.
- Context loading: `references/_shared/core/context-loading.md`
- Quality principles: `references/_shared/core/quality-principles.md`
- Design reference: `../../../docs/plans/designs/012-oma-voice.md` (source repo only; absent in global-mode installs)