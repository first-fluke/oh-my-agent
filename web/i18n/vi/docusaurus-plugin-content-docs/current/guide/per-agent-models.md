---
title: "Hướng dẫn: Cấu hình model theo từng agent"
sidebar_label: Model theo agent
description: Cấu hình model AI của từng agent qua model_preset trong oma-config.yaml. Bao gồm preset có sẵn, override theo agent, định nghĩa model inline, custom preset với extends, oma doctor --profile và migration từ agent_cli_mapping cũ.
---

# Hướng dẫn: Cấu hình model theo từng agent

## Tổng quan

`model_preset: auto` là mặc định của install mới. Agent chưa cấu hình dùng agent definition và model setting native của runtime hiện tại. Chọn preset cố định để pin model, hoặc override từng agent khi cần model/vendor khác. Preset explicit hiện có được giữ khi reinstall và update.

Cấu hình shared nằm trong `.agents/oma-config.cue` hoặc `.agents/oma-config.yaml`. File local tùy chọn, được Git ignore, dùng để override setting trên máy của bạn.

Xem [Configuration reference](/docs/guide/configuration-reference) để biết key top-level và precedence đầy đủ.

Trang này gồm:

1. Preset có sẵn.
2. Override agent riêng qua map `agents:`.
3. Khai báo model slug tùy biến qua `models:`.
4. Định nghĩa custom preset với `custom_presets:` và `extends:`.
5. Xem config đã resolve qua `oma doctor --profile`.
6. Migration từ `agent_cli_mapping` cũ.

---

## Preset có sẵn

Đặt `model_preset` thành một key có sẵn:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```


| Key | Mô tả | Phù hợp với |
|:----|:-----------|:---------|
| `auto` | Theo setting agent/model của runtime hiện tại mà không inject model hoặc effort flag. | Mặc định cho install mới |
| `free` | Gateway mode đặc biệt cho process Codex, Claude hoặc Qwen do OMA spawn; được resolve tách khỏi built-in preset registry. | Gateway FreeLLMAPI local |
| `antigravity` | Mọi agent dùng Antigravity CLI (`agy`): Gemini 3.1 Pro cho implementation/architecture và Gemini 3.6 Flash cho orchestration, docs và explore. Model chọn theo config bên trong `agy`, không expose flag `--model` hoặc `--thinking-budget`. | Người dùng Antigravity CLI |
| `claude` | Mọi agent dùng Claude (Sonnet/Opus). | Người dùng thuê bao Claude Max |
| `codex` | Mọi agent dùng OpenAI Codex (GPT-5.5 cho phần lớn role, GPT-5.4-mini cho explore) với effort level. | Người dùng ChatGPT Plus/Pro |
| `qwen` | Mọi agent dùng Qwen Code; session Qwen khớp vendor có thể dùng native agent được sinh ra, còn runtime khác dùng CLI dispatch. | Inference local / self-hosted |
| `kiro` | Mọi agent dùng Kiro CLI; Sonnet xử lý implementation/architecture, Haiku xử lý orchestration/explore. | Người dùng Kiro |
| `cursor` | Mọi agent dùng Cursor `composer-2.5`, `composer-2.5-fast` cho orchestrator/qa/pm/docs/explore. | Người dùng Cursor Pro / Pro Student |
| `mixed` | Hỗn hợp: role implementation dùng Codex, architecture/qa/pm dùng Claude, explore dùng Gemini. | Tận dụng thế mạnh nhiều vendor mà không tự quản lý config từng agent |

Preset built-in ship trong package CLI và tự update khi nâng cấp `oh-my-agent`. `gemini` là compatibility alias chuyển tới `antigravity`, không phải preset riêng hiện tại. Không cần file preset local.

---

## Auto dispatch

Với `auto`, override model explicit ở `agents.<id>` có ưu tiên. Nếu không có, OMA phát hiện runtime hiện tại và dùng native subagent path khi có; agent hoặc runtime cross-vendor không có native dispatch dùng `oma agent spawn`. Auto không mở rộng thành preset vendor cố định.

Trong CLI dispatch, `--vendor` chọn target rõ ràng. Nếu bỏ qua, OMA dùng runtime phát hiện được rồi tới `default_cli` khi detection fail, mặc định `claude` nếu không đặt. Plan kế thừa không inject model hoặc effort flag của OMA; agent/session config của vendor tự cung cấp. Process CLI external dùng persisted default của CLI đó, có thể khác model chỉ chọn trong parent session.

`oma doctor --profile` hiển thị `(vendor agent default)` cho agent kế thừa và model resolve cho override explicit. Native agent file giữ vendor definition; override cùng vendor ở mode auto được áp dụng khi install/update sinh file.

## Cấu hình local

Tạo **một trong hai** `.agents/oma-config.local.cue` hoặc `.agents/oma-config.local.yaml` cạnh config shared. Install, link và update thêm cả hai path vào `.gitignore`; update giữ file local, kể cả khi có `--force`.

OMA chọn thư mục config project gần nhất. Trong thư mục đó, CUE shared ưu tiên YAML shared, file local override giá trị shared. File CUE được evaluate độc lập trước khi merge, nên `model_preset: "auto"` shared có thể bị local `"free"` thay thế. Object merge đệ quy; array, scalar và `null` thay shared. Local file malformed, local CUE thiếu executable hoặc có cả hai format local đều là lỗi, không phải lý do dùng default shared.

Command option và environment override được hỗ trợ có ưu tiên hơn effective file config. `oma doctor --profile` hiển thị file đã dùng. File local không đi theo Git clone hoặc worktree mới. Process free mode kế thừa `OMA_MODEL_PRESET=free` và gateway environment đã resolve để nested OMA spawn giữ route; session khởi chạy độc lập cần config local hoặc environment riêng. Setting do install/setup ghi vẫn target config shared, còn local override tiếp tục thắng lúc runtime.

## Preset FreeLLMAPI {#freellmapi-preset}

Giữ `model_preset: auto` trong file shared và opt in ở local:

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```


File YAML tương đương:

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```


Khởi động FreeLLMAPI riêng và export unified key là `FREELLM_API_KEY`. OMA cũng nhận `FREELLMAPI_API_KEY` của upstream khi chọn biến key mặc định; biến canonical thắng khi cả hai cùng đặt. `api_key_env` tùy biến chỉ đọc biến đó. Không đặt key thật trong config. `OMA_MODEL_PRESET` override preset. `FREELLM_BASE_URL` và `FREELLM_MODEL` override setting tương ứng trong file. Giá trị ví dụ là default, nên chỉ cần `model_preset: free` khi server và key đã sẵn sàng.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```


Free mode dùng `free.model` cho mọi role do OMA dispatch, kể cả role đã pin `agents.*.model`. Nó không resolve pin đó thành thuê bao trả phí. Chọn `auto`, gateway model ID hoặc chain có tên như `auto:coding`, được tạo trước trong FreeLLMAPI.

Transport được chọn theo thứ tự `--vendor`, `OMA_RUNTIME_VENDOR`, runtime phát hiện được và hỗ trợ, `default_cli` rồi `codex`. Chỉ transport Codex, Claude và Qwen được hỗ trợ. Chọn transport không hỗ trợ một cách explicit là lỗi.

| Transport | Gateway endpoint | CLI base URL |
|:--|:--|:--|
| Codex | `/v1/responses` | Bao gồm `/v1` |
| Claude | `/v1/messages` | Server root; OMA bỏ suffix `/v1` |
| Qwen | `/v1/chat/completions` | Bao gồm `/v1` |

Dùng `oma agent spawn` kể cả khi parent dùng cùng vendor. OMA chỉ inject gateway connection và credential vào subprocess; đổi preset không đổi model của host session đang mở hoặc host-native subagent tool. Codex nhận custom Responses provider qua invocation argument, key vẫn ở child environment. Claude và Qwen nhận endpoint tương thích. Conflict setting của Claude/Qwen có thể ghi đè route hoặc key sẽ được báo trước khi chạy; OMA không sửa các file đó.

Spawn và review kiểm tra authenticated `GET /v1/models` trước khi khởi động agent. Key thiếu, connection fail hoặc HTTP auth error sẽ dừng execution. `oma doctor --profile` hiển thị URL/model hiệu lực, environment override, key presence và server readiness mà không in key. Readiness không bảo đảm model đủ quota để hoàn thành task.

FreeLLMAPI sở hữu failover provider ở cấp request. Cơ chế failover vendor dựa trên checkpoint explicit của OMA là recovery riêng; successor trong free mode vẫn phải dùng transport FreeLLMAPI được hỗ trợ. Không tự động quay về cấu hình vendor trả phí.

Preset free cấu hình inference agent, không đổi embedding config của memory service hiện có. FreeLLMAPI cũng expose `/v1/embeddings`; khi tự cấu hình vector store, pin một model family để vector hiện có giữ không gian tương thích.

Tham khảo upstream: [client setup](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [API and embedding families](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## Override từng agent

Dùng map `agents:` để override agent cụ thể trên preset đang hoạt động. Chỉ agent được liệt kê bị ảnh hưởng; phần còn lại theo vendor setting ở auto mode hoặc default của fixed preset.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```


Mỗi entry là object `AgentSpec`:

| Trường | Kiểu | Bắt buộc | Mô tả |
|:------|:-----|:---------|:-----------|
| `model` | string | Có | Model slug, built-in hoặc user-defined |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | Không | Effort reasoning, bỏ qua trên model không hỗ trợ |
| `thinking` | boolean | Không | Bật extended thinking theo model |
| `memory` | `user` \| `project` \| `local` | Không | Phạm vi memory của agent |

Agent ID hợp lệ: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore`.

Merge là shallow: mỗi field trong override thay field tương ứng của preset. Field không khai báo giữ giá trị preset.

---

## Khai báo model slug inline {#inlining-model-slugs}

Đăng ký model slug chưa có trong built-in registry dưới `models:`. Sau đó dùng slug trong `agents:` hoặc `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false
```


Hai quy tắc áp dụng cho slug đã đăng ký khi tham chiếu từ `agents:`:

1. **Key phải ở dạng `owner/model`:** `agents.<id>.model` validate theo pattern `owner/model`, nên key trần như `my-fast-model` bị từ chối; dùng key có slash như `google/gemini-3-flash-fast` hoặc slug `provider/model` của vendor.
2. **Spec phải đầy đủ:** `cli`, `cli_model`, `auth_hint` và mọi boolean trong `supports` bắt buộc ở thời điểm resolve. Spec thiếu field có thể qua parser nhưng fail model-registry validation rồi âm thầm fallback về core registry.

> Nếu user-defined slug trùng built-in slug, định nghĩa user thắng và phát warning.

---

## Custom preset

Định nghĩa preset bổ sung trong `custom_presets:`. Dùng `extends:` để kế thừa toàn bộ default agent từ built-in preset và chỉ override agent cần.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```


Không có `extends:`, hãy cung cấp default cho các canonical agent role của preset. Có `extends:` thì chỉ entry được liệt kê bị override; phần còn lại kế thừa base preset.

---

## `oma doctor --profile`

Chạy `oma doctor --profile` để xem ma trận model đã resolve sau khi merge preset default, `custom_presets` và override `agents:`.

```bash
oma doctor --profile
```


**Output mẫu:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```


Mỗi dòng cho biết model slug đã resolve và source áp dụng là `(preset)` hoặc `(override)`. Dùng lệnh này khi subagent chọn vendor ngoài dự kiến.

---

## Migration từ `agent_cli_mapping` cũ

Migration 008 tự chạy khi gọi `oma install` và `oma update`, chuyển project cũ tại chỗ:

| Config legacy | Kết quả sau migration 008 |
|:-------------|:--------------------------|
| Mọi entry cùng vendor, ví dụ tất cả `gemini` | `model_preset: gemini`, không có `agents:` |
| Vendor hỗn hợp | Vendor xuất hiện nhiều nhất -> `model_preset`; phần còn lại -> override `agents:` |
| Giá trị object `AgentSpec` | Chuyển nguyên trạng vào `agents:` |
| Nội dung `models.yaml` | Inline vào `oma-config.yaml.models` |
| `defaults.yaml` tùy biến | Giữ dưới dạng `custom_presets.user-customized` kèm warning |

Original được backup vào `.agents/.backup-pre-008-{timestamp}/` trước khi đổi. Migration idempotent; nếu `model_preset` đã có, nó bỏ qua.

<!-- oma-docs:ignore-start -->
Sau migration, `.agents/config/defaults.yaml`, `.agents/config/models.yaml` và thư mục `.agents/config/` bị xóa.
<!-- oma-docs:ignore-end -->

---

## Giới hạn quota session

`session.quota_cap` giữ nguyên. Thêm vào `oma-config.yaml` để giới hạn spawn subagent mất kiểm soát:

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```


Khi đạt cap, orchestrator từ chối spawn thêm và báo status `QUOTA_EXCEEDED`.

---

## Ví dụ đầy đủ

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```


Chạy `oma doctor --profile` để xác nhận resolution rồi khởi động workflow như thường.

---

## Dispatch qua pi (runtime transport)

[pi](https://github.com/earendil-works/pi) (Earendil) là proxy runtime nhiều provider, không phải owner model; nó chạy model provider thật như Anthropic, OpenAI và Google qua một CLI. oma coi pi là **transport overlay**: `model_preset` và override `agents:` giữ nguyên, còn pi trở thành CLI thực thi cho agent cụ thể.

Dispatch agent qua pi bằng override `--vendor pi`:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```


Điều gì xảy ra:

- Model theo agent được resolve từ preset/override, ví dụ `openai/gpt-5.5`, chuyển thành dạng `--model <provider/id>` của pi; `effort` chuyển thành level `--thinking`. **Model theo subagent hoạt động trên pi y hệt như native** — mỗi agent có thể dùng model khác.
- Persona agent, tức system prompt, được inline từ `.agents/agents/<id>.md` vì pi không có agent file phía vendor.
- Auth do pi cấu hình, từ `~/.pi/agent/auth.json` hoặc provider API key trong environment. `oma doctor` báo install và auth của pi cùng CLI khác.

**Giới hạn:** pi chỉ chạy model provider thật. Preset độc quyền CLI như `cursor`, `kiro`, `qwen` và `antigravity` chỉ có model bên CLI riêng, nên dispatch qua pi bị từ chối kèm lỗi rõ ràng. Dùng preset provider thật `claude`, `codex`, `gemini` hoặc `mixed` khi định tuyến qua pi.

> Catalog model của pi theo release và bị auth gate. Nếu slug resolve không khớp catalog pi đang expose, kiểm tra `pi --list-models`; matching `--model` của pi fuzzy nên phần lớn provider slug resolve được.

### Model ngoài registry built-in của pi (ví dụ Z.ai GLM)

pi resolve `--model` theo **built-in model registry**; setting `defaultProvider` chỉ được dùng khi hoàn toàn không truyền model. Với Z.ai, pi chỉ ship một phần GLM ID, gồm `glm-4.7`, `glm-4.5-air`, `glm-5-turbo`, `glm-5.1` và `glm-5v-turbo` ở pi 0.80.x. Preset gọi GLM ID khác sẽ fail resolve.

Có hai cách:

1. **ID trong registry:** Giới hạn preset vào ID registry. Dùng dạng `provider/id`, ví dụ `zai/glm-4.7`, để pin provider; oma truyền nguyên dạng vào `--model`.
2. **ID chưa đăng ký:** Đăng ký qua pi extension. Field `api` phải là một trong **api adapter id** của pi, như `openai-completions` hoặc `anthropic-messages`, không phải tên provider. Tên `"zai"` hoặc shorthand `"openai"` không phải adapter id và fail với `No API provider registered for api: …`.

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```


Xác minh bằng `pi --list-models` trước khi đưa ID vào preset.

---

## Dispatch qua OpenCode

[OpenCode](https://opencode.ai) là vendor lớp extension, giống pi, không sở hữu model mà chạy model từ catalog riêng: provider miễn phí `opencode`, gói thuê bao rẻ `opencode-go` và gateway `opencode-zen`. oma tích hợp như **vendor plugin in-process**: opencode tự load `.opencode/plugins/oma/` thay vì đăng ký hook trong settings file, rồi resolve persona của agent từ file sinh ở `.opencode/agents/<id>.md`.

### Dispatch tường minh

Định tuyến agent qua opencode bằng override `--vendor opencode`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```


Command chạy `opencode run --agent pm --dir <workspace> "<prompt>"`. Prompt là **trailing positional argument**; flag `-p` của opencode có nghĩa là `--password`, không phải prompt.

### Model OpenCode theo agent

Để route agent cụ thể tới model opencode, đăng ký model dưới `models:` rồi tham chiếu từ `agents:`. Có hai yêu cầu, xem [Khai báo model slug inline](#inlining-model-slugs):

1. **Slug dạng `owner/model`:** Dùng slug `provider/model` của opencode làm registry key; tên trần bị schema `agents.<id>.model` từ chối.
2. **Spec đầy đủ:** `cli`, `cli_model`, `auth_hint` và mọi boolean `supports`. Spec thiếu fail validation và âm thầm fallback core registry, nên agent không route vào opencode.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```


Mỗi agent route sẽ dispatch `opencode run -m opencode-go/deepseek-v4-flash --agent <id> --dir <workspace> "<prompt>"`. Đây phù hợp cho role nhẹ, nhanh như pm, qa, docs và explore, còn implementation nặng giữ ở Codex/Claude v.v.

### Xác minh model slug

Catalog opencode bị giới hạn bởi thuê bao và đăng nhập, nên oma **không** hardcode slug. Xác minh một slug với catalog đã cài:

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```


`oma model probe` trả `accepted` nếu slug có trong `opencode models`, `rejected` nếu không, và `auth_required` nếu provider cần login hoặc subscription.

### Auth và file được sinh

- **Auth:** `opencode auth login` lưu credential tại `~/.local/share/opencode/auth.json`, mỗi provider một entry. `oma auth status` / `oma doctor` báo opencode authenticated khi bất kỳ provider nào có credential. `oma doctor --profile` phân biệt provider: mỗi dòng kiểm tra prefix provider trong `cli_model` đã đăng ký; model có `cli_model: zai-coding-plan/glm-5.3` được kiểm tra theo credential `zai-coding-plan`. Row không có model với `cli_model` dạng `provider/model` đã đăng ký báo `? unknown` thay vì khẳng định auth fail.
- **File sinh:** `oma link` hoặc `oma link opencode` ghi persona `.opencode/agents/<id>.md` cho từng agent và bridge `.opencode/plugins/oma/`. Chúng sinh từ SSOT `.agents/`, không sửa trực tiếp; chạy lại `oma link` để tạo lại.

> **Lưu ý workflow persistent:** event `session.idle` của opencode, gần nhất với hook `Stop` của Claude, chỉ thông báo và không chặn session kết thúc. Vì vậy workflow persistent (orchestrate / work / ultrawork) chạy với **ngữ nghĩa Stop suy giảm** dưới opencode; reinforcement xảy ra ở message tiếp theo thay vì giữ session mở.

---

## Dispatch qua Kimi Code CLI

[Kimi Code CLI](https://www.kimi.com/code) chỉ đọc **hook** từ global config (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`), nên `oma install`/`oma link` ghi hook chain và symlink skill vào HOME sau consent rõ ràng, giống Antigravity. Kimi cũng quét trực tiếp SSOT `.agents/skills/`, nên skill resolve trên toàn project. **MCP** không cần ghi HOME và có scope project, được ghi theo mode vào `<cwd>/.kimi-code/mcp.json` (project) hoặc `~/.kimi-code/mcp.json` (global).

### Dispatch tường minh

Route agent qua Kimi bằng override `--vendor kimi`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```


Lệnh chạy `kimi -p "<prompt>"`. Mode `-p` non-interactive của Kimi auto-approve tool call thường theo policy `auto`, nên oma **không** thêm `--yolo` hoặc `--auto` vì chúng mutually exclusive với `-p`.

### Model Kimi theo agent

Giống opencode, oma **không** hardcode catalog Kimi vì lineup phụ thuộc provider/subscription. Để route agent cụ thể tới model Kimi, đăng ký spec đầy đủ dưới `models:` với `cli: kimi` rồi tham chiếu từ `agents:`:

Registry key phải dạng `owner/model`, tên trần bị schema `agents.<id>.model` từ chối; `cli_model` là alias chính xác truyền cho `kimi --model`. Alias coding được tài liệu hóa là `kimi-code/kimi-for-coding`. Xác nhận alias subscription expose bằng `kimi --model <alias>` trước khi commit.

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```


Mỗi agent route sẽ dispatch `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`.

> **Lưu ý workflow persistent:** Đường Stop-blocking được Kimi tài liệu hóa là exit-code 2 / stderr, nhưng router `oma hook run` luôn exit 0 và emit dialect stdout. OMA phát best-effort `permissionDecision: "deny"` cùng `decision: "block"` kiểu Claude để workflow persistent degrade gracefully dưới Kimi.
