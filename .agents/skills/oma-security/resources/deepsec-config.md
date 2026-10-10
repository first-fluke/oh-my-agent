# Deepsec configuration and recovery

Load for backend selection, credentials, configuration or scanner failure. Read the effective workspace configuration without printing secrets.

## Resolve the actual configuration

Find the config selected by the installed CLI and inspect its project root/data directory. Record config and plugin digests. A config/plugin is executable code: review it before loading with credentials.

Useful current fields include `projects`, `plugins`, `matchers`, `defaultAgent`, `defaultModel`, `defaultThinkingLevel`, `ai` and `dataDir`. Do not hardcode a default model or assume one vendor has better accuracy/cost.

Keep model routing separate from the agent runner. Supported authentication paths depend on the installed version:

| Route | Inspect |
|---|---|
| Vercel Gateway | linked-project OIDC or configured Gateway key; selected team/project |
| Direct provider | provider/base URL and the name of its environment variable |
| Local authenticated CLI | local runner session and its actual model; separate sandbox credentials |
| Custom provider | supported runner, endpoint, credential/header handling |

Use native `setup --model-auth …` to change and verify a supported route. Do not silently fall back to a paid provider after an authentication error. Store credential variable names in configuration, never key values in source or command arguments.

For a supported direct OpenAI setup the non-secret flags are:

```text
--agent codex --model-auth direct --ai-provider openai --ai-api-key-env MY_OPENAI_KEY
```

Supply the actual secret through the approved environment/secret store. Existing local CLI login does not imply that a hosted sandbox can authenticate.

## Recovery table

| Observation | Next bounded action |
|---|---|
| Wrong/no project | Check resolved root/project ID and configuration precedence before any process pass |
| Missing credential | Check variable presence without displaying value; verify configured route and account |
| Expired linked token | Use the installed authentication flow within the existing account/scope |
| Quota/provider refusal | Preserve exact redacted error, affected units and cost; resume after remediation |
| Sandbox initialization failure | Check the selected platform credentials and supported environment; do not substitute production |
| Empty matcher results | Inspect ignores, language support and inventory; empty output is not comprehensive coverage |
| Coverage repair paused | Retain checkpoint and generated proposal evidence; follow the printed resume instruction |
| Changed model/config/source | Preserve prior receipts; invalidate affected cache/evidence before reuse |

`only`/`exclude`, per-project legacy configuration and CLI overrides can alter coverage. Record the effective selection rather than only the top-level file. Review generated matcher imports and additive plugins together.

Debug logs can contain prompts or credentials. Keep originals access-controlled and redact report copies; avoid verbose auth output in the conversation.

Sources: [configuration](https://github.com/vercel-labs/deepsec/blob/main/docs/configuration.md), [models](https://github.com/vercel-labs/deepsec/blob/main/docs/models.md), [Vercel setup](https://github.com/vercel-labs/deepsec/blob/main/docs/vercel-setup.md).
