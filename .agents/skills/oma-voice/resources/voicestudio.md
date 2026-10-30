# VoiceStudio Backend

Use this branch when `voice.backend` resolves to VoiceStudio
(`https://github.com/debpalash/VoiceStudio`), a local speech backend with
voice cloning, voice design, transcription and dubbing. Voicebox steps in
`execution-protocol.md` do not apply on this branch; the OMA modes, limits,
output layout, manifest and report still do. Existing-file processing stays
with `audio-processing.md` and needs no backend.

## Resolve the backend

1. Read `voice.backend` from `.agents/oma-config.yaml`. Values: `auto`
   (default), `voicebox`, `voicestudio`. The oma-video narration provider
   resolves the same setting.
2. The VoiceStudio base URL is `OMA_VOICESTUDIO_URL`, then `VOICESTUDIO_URL`,
   then `http://127.0.0.1:3900`.
3. `auto` probes Voicebox `GET /health` first and VoiceStudio `GET /health`
   second; the first healthy one wins. An explicit backend probes only itself
   and never falls through.
4. With no healthy backend, print the Voicebox hint from `execution-protocol.md`
   plus "or open the VoiceStudio app", and exit with code 5. Do not launch,
   install or update either app.

## Route to the upstream skill

1. Check the runtime skill catalog for `voicestudio` from
   `https://github.com/debpalash/VoiceStudio` and read its complete `SKILL.md`.
2. If it is absent, load it without a persistent installation or another agent:

   ```bash
   bunx skills use debpalash/VoiceStudio@voicestudio
   ```

   Omit `--agent`. `voicestudio-maintainer` maintains that repository and is
   not part of this route.
3. Follow the loaded upstream instructions for discovery (`/openapi.json`,
   `/v1/audio/voices`), endpoints, authentication, and the clone, design,
   dubbing and long-form job operations. Do not copy them into OMA resources.
4. An already-connected VoiceStudio MCP server is an optional surface. Discover
   its actual tools before calling them. Prefer the REST speech endpoint for a
   file on disk, unless the MCP server runs in `files` mode with
   `OMNIVOICE_MCP_BASE_PATH` inside `$PWD`.

## OMA keeps

- **Modes and limits**: notify, asset and transcribe modes, the 240 / 5000
  character and 30-minute limits, and the clarification protocol are unchanged.
- **Profiles**: resolve TTS voices from VoiceStudio's discovered profile IDs.
  A `notification_profile` or `asset_profile` written for Voicebox does not
  exist in VoiceStudio; ask instead of guessing. OpenAI voice names
  (`alloy`, ...) are compatibility aliases, not saved voices; do not use one for
  repeatable narration unless the user accepts it.
- **Output and manifest**: write to the same `.agents/results/voice/` layout.
  Record `"backend": "voicestudio"`, the profile ID, the engine and language
  when the backend reports them, `format`, `duration_sec` and `created_at`.
  Omit `voicebox_generation_id`; never invent a Voicebox field.
- **Verification**: check the HTTP status, then probe the saved file with
  ffprobe before calling it audio; an error body can be written to the output
  path.
- **Notification mode**: VoiceStudio does not play generations on the
  speakers. Write the clip to a temporary file, play it with an available local
  player (`afplay`, or `ffplay -nodisp -autoexit`), then delete it. Without a
  player, report that playback was unavailable.
- **Timed narration**: request `verbose_json` transcription for word timing,
  then fit the raw WAV through `audio-processing.md`.

## Consent and side effects

- Clone a voice only on an explicit request and with the voice owner's
  permission. Cloning and `design_voice` create persistent profiles; confirm
  before creating one.
- First use of an engine may download model weights (OmniVoice is about
  2.3 GB). Ask before triggering a download.
- Cloud translation, cloud sync, community features and remote backends run
  only when the user chooses them. Send `OMNIVOICE_API_KEY` or a sharing PIN
  only to the user's configured backend, over HTTPS unless it is loopback or
  an explicitly trusted LAN. Never print a key or PIN.
- VoiceStudio is AGPL-3.0; OMA uses it only through its local API and does not
  vendor or bundle it. Model, voice and output licences are per model in its
  Model Manager; report them when the user asks about reuse.

## References

- [Upstream VoiceStudio](https://github.com/debpalash/VoiceStudio):
  `skills/voicestudio/SKILL.md`, `docs/mcp.md` and `docs/speech-platform.md`.
- [Skills CLI use](https://github.com/vercel-labs/skills/blob/main/docs/commands.md#skills-use):
  prompt and complete support-directory loading without an installed skill.
