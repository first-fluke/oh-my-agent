# Pre-flight Checklist

Run this check before every TTS or STT call. The agent should be able to answer "yes" to every applicable item, or surface a clarification before invoking voicebox.

## Environment

- [ ] Voicebox desktop app is running.
- [ ] `GET http://127.0.0.1:17493/health` returned 200 within 5 seconds.
- [ ] Voicebox MCP server is registered with the host CLI.

## Profiles and models (TTS only)

- [ ] At least one voice profile exists (cached from `voicebox_list_profiles`).
- [ ] Target profile id is resolved for notify or asset TTS (explicit > config default > user choice).
- [ ] Engine model for the resolved profile is loaded, or the user approved a download.

Transcription skips profile lookup and the TTS engine check.

## Inputs

- [ ] Mode (notify, asset, transcribe) is identified.
- [ ] TTS text length is within the mode limit (notify <= 240, asset <= 5000).
- [ ] STT audio path exists and is one of the supported formats.
- [ ] STT audio duration is within 30 minutes, or the handling of a longer recording is explicitly resolved; v1 does not auto-split.
- [ ] Language is set to auto or to a single explicit BCP-47 code.

## Output

- [ ] Output directory is inside `$PWD`, or the user explicitly confirmed an external path.

## Safety

- [ ] Auto-invocation announcement was emitted (one short pre-line) if the call is automatic.
- [ ] The user has not asked to suppress notifications in the current session.
- [ ] No partial output from a prior cancellation is being overwritten.

## Manifest

- [ ] Persisted output has `skill`, `mode`, `voicebox_generation_id`, `language`, and `created_at`. For TTS, resolve `profile` and `engine`; for STT, use `profile: null` and the actual STT engine/model when returned, otherwise `engine: null`. Notification mode needs no disk manifest.
- [ ] Mode-specific field is set: `text` for TTS, `transcript_preview` for STT.
- [ ] `format` is set for TTS manifests.

## Post-call

- [ ] Output file exists and is non-empty.
- [ ] Duration in the manifest matches the audio (or the transcript word count looks plausible).
- [ ] User-facing report includes mode, path, duration, and any warning.
