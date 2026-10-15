---
title: "Hướng dẫn: Tham chiếu cấu hình"
sidebar_label: Tham chiếu cấu hình
description: Các vị trí cấu hình OMA được hỗ trợ, thứ tự ưu tiên, khóa có kiểu, giá trị mặc định và quy tắc sở hữu khi cập nhật.
---

# Tham chiếu cấu hình {#configuration-reference}

OMA đọc cấu hình từ `.agents/oma-config.cue` hoặc `.agents/oma-config.yaml`. Local overlay, `.agents/oma-config.local.cue` hoặc `.agents/oma-config.local.yaml`, phù hợp cho các thiết lập theo máy không nên đưa vào file dùng chung.

Chạy lệnh này trong project có cấu hình bạn muốn kiểm tra:

```bash
oma doctor --profile
```

Kết quả mong đợi là profile đã resolve, hiển thị preset được chọn và model plan theo từng agent. Nếu lệnh báo lỗi parse, hãy sửa config layer gần nhất trước khi thay đổi thiết lập model.

## File nào được ưu tiên {#which-file-wins}

Loader đọc mặc định global từ `$OMA_HOME/.agents/` (mặc định
`~/.oma/.agents/`), sau đó đi ngược lên từ thư mục hiện tại và dừng ở
thư mục `.agents/` của project gần nhất. Trong mỗi thư mục được chọn:

1. `oma-config.yaml` cung cấp các giá trị shared.
2. `oma-config.cue`, khi có và hợp lệ, ghi đè mọi khóa mà nó đặt; các khóa YAML mà nó không đặt vẫn được giữ. Nếu không thể đánh giá file CUE, OMA cảnh báo và chỉ dùng file YAML.
3. Một local file (`oma-config.local.cue` hoặc `.local.yaml`) được merge lên kết quả shared.

Kết quả shared/local của project ghi đè kết quả shared/local của global.
Khi được đặt, `OMA_MODEL_PRESET` ghi đè `model_preset` sau tất cả các file layer.
Thứ tự đầy đủ, sơ đồ luồng và cách xử lý sự cố có trong
[Configuration loading](/docs/guide/oma-config-semantics#precedence-table).

Map được merge đệ quy. Array, scalar và `null` thay thế giá trị shared. Giữ cả hai local format là lỗi. Local file malformed là lỗi nghiêm trọng để private override không bị bỏ qua âm thầm.

Các project root ở cấp tổ tiên khác nhau không được merge. Một thư mục `.agents/` rỗng của project gần nhất
vẫn xác lập ranh giới đó. Bản cài `~/.agents/` đã ngừng dùng
chỉ là input cho migration và không được đọc như fallback của project. Mặc định global không
thay đổi danh tính hay phạm vi memory của project hiện tại.

## Các khóa cấp cao nhất {#top-level-keys}

Các khóa sau được runtime schema hiện tại hoặc consumer OMA được phát hành đọc. Khóa được đánh dấu sparse là một phần có chủ ý: bỏ qua giá trị lồng nhau để giữ code default.

| Khóa | Kiểu hoặc giá trị được chấp nhận | Mặc định khi thiếu | Mục đích |
| --- | --- | --- | --- |
| `language` | string | `en` | Ngôn ngữ phản hồi được workflow và skill dùng. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` trong template được phát hành | Chọn giọng cho `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` trong template được phát hành; bỏ qua nghĩa là không có override rõ ràng | Tùy chọn định dạng ngày. |
| `timezone` | tên IANA | múi giờ hệ thống | Thời gian được dùng trong schedule và report. |
| `auto_update_cli` | boolean | `true` | Kiểm tra phiên bản CLI nền; opt out bằng `false`. |
| `telemetry` | boolean | `false` | Opt in telemetry của vendor dùng trong install, update và link reconciliation. |
| `model_preset` | string không rỗng | `auto` trong template mới | Model preset built-in hoặc tùy chỉnh. `OMA_MODEL_PRESET` ghi đè trong một process. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | Thiết lập FreeLLMAPI khi preset là `free`; `FREELLM_BASE_URL` và `FREELLM_MODEL` ghi đè giá trị trong file, còn tên khóa không bao giờ chứa secret. Xem [Cấu hình model theo agent](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Chọn provider cho documentation, search, code intelligence và semantic memory. Xem [Providers](#providers). |
| `brave` | `api_key_env` hoặc `api_key_vault` | chưa đặt | Tham chiếu credential tìm kiếm Brave. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | Xem [Chi tiết Honcho](#honcho-semantic-memory) | Thiết lập kết nối Honcho semantic memory. |
| `agents` | agent ID → `model`, tùy chọn `effort`, `thinking`, `memory` | preset resolution | Override theo agent được áp dụng lên preset đã chọn. `effort` là `none`, `low`, `medium`, `high` hoặc `xhigh`; `memory` là `user`, `project` hoặc `local`. |
| `models` | model slug → CLI mapping | chưa đặt | Định nghĩa model inline cho vendor CLI được hỗ trợ. |
| `custom_presets` | preset → description, tùy chọn `extends`, `agent_defaults` | chưa đặt | Preset do người dùng định nghĩa; `extends` có thể kế thừa built-in. |
| `vendors` | `string[]` gồm vendor ID được chọn (YAML và CUE) | khi thiếu: `oma link` dùng mọi vendor có thể link, `oma update` dùng các vendor đã có thư mục trong project | Chọn vendor integration mà `oma install` và `oma update` project. Capability map cho dispatch nằm trong managed orchestration config; xem [Vendor selection và dispatch metadata](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | vendor ID (`claude`, `codex`, `cursor`, `antigravity`, `qwen`, `grok`, `kimi`, `kiro`, `opencode`, `pi`) | `claude`; `codex` cho transport `free` | Vendor được dùng khi không có gì khác chọn vendor: runtime không phát hiện được dưới `auto`, hoặc transport `free` sau `--vendor`, `OMA_RUNTIME_VENDOR` và runtime đã phát hiện. Xem [How OMA resolves an agent's model and CLI](/docs/guide/per-agent-models#how-oma-resolves-an-agents-model-and-cli). |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | mỗi dimension bị bỏ qua là không giới hạn | Token và spawn limit cứng được kiểm tra trước agent spawn tiếp theo; xem [Session quota caps](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Hành vi và phạm vi loại trừ khi scan của `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Serena MCP transport và hành vi cập nhật. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` hoặc `[]` | chưa đặt = giữ nguyên setup hiện có | Chọn Browser DevTools MCP khi reconciliation. List rỗng rõ ràng sẽ xóa browser entry đã chọn. |
| `video` | sparse map do skill sở hữu | skill default; xem [Tạo video](/docs/guide/video-generation) | Routing video, thứ tự provider, output, chi phí, limit và thiết lập refresh HyperFrames. |
| `image` | sparse map do skill sở hữu | skill default; xem [Tạo hình ảnh](/docs/guide/image-generation) | Thiết lập vendor hình ảnh, kích thước, chất lượng, output, so sánh và chi phí. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | skill default; xem [Workflow nội dung và nghiên cứu](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Profile Voicebox, output và thiết lập độ dài. |
| `hwp` | `format`, `version.*`, `output.*` | skill default; xem [Workflow nội dung và nghiên cứu](/docs/guide/content-and-research#extract-hwp-family-documents) | Định dạng Kordoc, kênh version và vị trí output. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | skill default; xem [Workflow nội dung và nghiên cứu](/docs/guide/content-and-research#extract-pdf-content) | Thiết lập trích xuất PDF, OCR, image và overwrite. |
| `scholar` | `base_url` | skill default; xem [Workflow nội dung và nghiên cứu](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host endpoint Knows; protocol shape do skill sở hữu. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | skill default; xem [Diagram Engine](/docs/guide/diagram-engine) | Chọn Mermaid/archify và thiết lập managed engine. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | skill default; xem [Nghiên cứu thị trường](/docs/guide/market-research) | Resolve managed last30days engine và vị trí lưu kết quả. |

Template được phát hành cũng có các block do consumer sở hữu. Các khóa và mặc định hiện tại:

| Block | Các khóa consumer đọc | Mặc định | Tác dụng |
|---|---|---|---|
| `memory.gc` | `keep_sessions`, `max_age_days` | giữ 100 session; dọn Serena artifact cũ hơn 50 ngày; `0` tắt age pruning | Mặc định cho `oma memory gc`; command flag ghi đè. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Điều khiển đường dọn Serena LSP theo lịch. `oma serena reap` tương tác vẫn phải gọi rõ; scheduled quiet run là opt-in. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Opt in stop-hook line-budget guard và đặt code budget theo file. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | template được phát hành bật conventional commit và PR protection, cùng identity và filename list của template | Điều khiển SCM skill, commit hook và secret-pattern guard. Thay identity trong template bằng thông tin của bạn trước khi bật co-author trailer. |

Các block này được chấp nhận qua configuration passthrough và được feature hoặc workflow tương ứng diễn giải. Parser `serena_reaper` chỉ đọc các snake_case key ở trên và bỏ qua camelCase. Các template được phát hành vẫn dùng camelCase (`keepWarm`, `idleMinutes`, `graceSeconds`), còn CUE schema được phát hành từ chối các snake_case key bên trong schema block của nó (`field not allowed`), vì vậy hãy đặt chúng trong `oma-config.yaml` hoặc một local YAML overlay. Đọc feature guide tương ứng trước khi thêm khóa lồng nhau; trang này không tự thêm khóa ngoài các consumer được liệt kê.

## Các object lồng nhau chính xác {#exact-nested-objects}

### Providers {#providers}

`providers` chọn một provider cho mỗi capability:

| Khóa | Giá trị được chấp nhận | Mặc định |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | search provider ID (chữ thường, chữ số, `_`, `-`), chẳng hạn `native` hoặc `brave` | `native` |
| `code_intelligence` | `serena`, `gortex` | `serena` |
| `code_intelligence_guard` | `block`, `off` | `block` |
| `semantic_memory` | `agentmemory`, `honcho`, `none` | `agentmemory` |

`code_intelligence_guard` điều khiển guard tìm kiếm PreToolUse. Các lệnh tìm kiếm native chỉ nằm trong mục loại trừ provider đã xác nhận hoặc ở path ngoài project được cho phép mà không cần bypass. Guard đọc các mục loại trừ của Serena và các rule gitignore đang bật, hoặc danh sách loại trừ của Gortex; nó không suy ra dependency từ tên thư mục.

Hook không nêu tên `OMA_CI_ALLOW_NATIVE`. Lệnh tìm kiếm shell có tiền tố `OMA_CI_ALLOW_NATIVE=1` chỉ bypass guard đối với tài nguyên ngoài project hoặc các path bị ignore mà guard không nhận ra, không áp dụng cho source của project.

### Semantic memory Honcho {#honcho-semantic-memory}

Map `honcho` được xác thực bởi `HonchoConfigSchema`. Tên khóa và hành vi runtime hiệu lực:

| Khóa | Hình dạng | Mặc định hoặc ràng buộc hiệu lực |
|---|---|---|
| `base_url` | URL string | `https://api.honcho.dev`; bắt buộc HTTPS trừ loopback HTTP. Credential, query string và fragment bị từ chối. |
| `workspace_id` | 1–128 chữ cái, chữ số, `_` hoặc `-` | Bắt buộc khi provider khởi động. Interactive installer seed `oma` nếu chưa có giá trị đã lưu. |
| `project_id` | string đã trim, dài 1–128 ký tự | Bỏ qua nghĩa là OMA project root hiện tại. |
| `api_key_env` | tên biến môi trường | `HONCHO_API_KEY`. Endpoint không phải loopback cần biến này hoặc `api_key_vault`. |
| `api_key_vault` | vault key name (`A-Z`, `a-z`, chữ số, `.`, `_`, `-`; dài 1–64 ký tự) | Bỏ qua nghĩa là không tra vault. Nếu có cả hai credential reference, giá trị môi trường được dùng trước. |
| `timeout_ms` | integer `100`–`30000` | `5000` millisecond. Cùng deadline áp dụng cho status hoặc memory request. |
| `max_results` | integer `1`–`50` | `8` kết quả recall. |
| `max_tokens` | integer `128`–`16000` | `2000` UTF-8 byte cho nội dung recall và context được suy ra. |
| `recall_mode` | `messages` hoặc `hybrid` | Installer ghi `messages` cho lựa chọn mới. Bỏ qua sẽ bật representation request của provider cùng message recall. |

Ví dụ, remote workspace có thể dùng secret reference mà không đặt secret trong YAML:

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

Installer dùng `http://127.0.0.1:8000` làm URL ban đầu khi thiết lập Honcho tương tác hoặc không tương tác mà chưa có URL đã lưu. Installer seed đó tách biệt với runtime fallback của provider ở trên. Sau khi chọn provider, dùng `oma memory status`; workspace hoặc credential bị thiếu sẽ được báo là unavailable thay vì âm thầm chuyển sang memory provider khác.

### Session quota caps {#session-quota-caps}

`session.quota_cap` là partial map. Mọi trường đều tùy chọn; trường bỏ qua giữ dimension đó không giới hạn. Giá trị phải là non-negative integer viết không có dấu phân cách `_` (YAML đọc `2_000_000` thành string, khiến dimension đó không bị giới hạn). `per_vendor` map dispatch vendor ID như `claude`, `codex` hoặc `antigravity` tới token budget:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

Cap loader kiểm tra user CUE layer, sau đó user YAML layer, rồi shipped defaults fallback. Trước một spawn, OMA kiểm tra `spawn_count`, tổng `tokens` và `per_vendor` theo thứ tự đó. Limit đạt khi usage lớn hơn hoặc bằng nó; OMA chặn spawn tiếp theo và báo dimension thắng. Usage là token accounting, không phải ước tính billing.

### Vendor selection và dispatch metadata {#vendor-selection-and-dispatch-metadata}

Trong `.agents/oma-config.yaml` do người dùng sở hữu, `vendors` là list integration ID được chọn:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Một list chọn đúng các vendor đó, còn `vendors: []` không chọn vendor nào. Khi không có khóa `vendors`, `oma link` nhắm tới mọi vendor trong linkable-vendor registry của OMA, còn `oma update` chỉ nhắm tới các vendor đã có thư mục trong project. List điều khiển projection khi install/update; nó không phải capability map theo vendor.

Schema `.agents/oma-config.cue` được phát hành định kiểu `vendors` là cùng một list (`[...string]`). CUE template cũ định kiểu nó là object `vendors.pi` (`#VendorsConfig`) mà không thành phần nào đọc: agent dispatch resolve capability field từ managed orchestration registry bên dưới. Nếu `oma-config.cue` của bạn vẫn khai báo `vendors?: #VendorsConfig`, hãy đổi thành `vendors?: [...string]` trước khi đặt selection list vào đó.

Managed `.agents/skills/oma-orchestration/config/cli-config.yaml` chứa capability map đó. Mỗi entry `vendors.<id>` hỗ trợ:

| Trường | Hình dạng | Cách dùng |
|---|---|---|
| `command` | executable string | Binary cần chạy. |
| `subcommand` | string | Subcommand chèn trước option, chẳng hạn `codex exec`. |
| `prompt_flag` | string, hoặc `none`/`null` để tắt | Flag đi cùng prompt; dùng positional prompt khi tắt. |
| `auto_approve_flag` | string | Vendor permission-bypass flag cho writable run. Bị suppress ở read-only mode. |
| `read_only_flag` | string | Vendor read-only flag. Nếu thiếu, builder dùng fallback theo vendor hoặc cảnh báo. |
| `output_format_flag` | string | Flag chọn output machine-readable. |
| `output_format` | string | Giá trị đi cùng `output_format_flag`. |
| `model_flag` | string | Flag đi cùng `default_model`. |
| `default_model` | string | Model dùng khi resolved plan không cung cấp model. |
| `isolation_env` | chuỗi `NAME=value` | Environment assignment tùy chọn; unsafe loader/interpreter key bị từ chối và `$$` được mở rộng thành process ID hiện tại. |
| `isolation_flags` | chuỗi argument kiểu shell | Isolation argument bổ sung, được tách thành token argv. |

Capability file được quản lý sẽ được OMA update tạo lại. Hãy sửa các khóa `agents`, `models` và `custom_presets` do người dùng sở hữu để chọn model; chỉ dùng capability map này khi bảo trì managed orchestration data hoặc debug vendor adapter. Object `vendors.pi` có comment trong template cũ là fallback metadata và không thay thế selected-vendor list hay managed dispatch registry.

## Các thay đổi thường gặp {#common-changes}

Chọn fixed preset cho project nhưng giữ personal override ở local.

**Shared file** (được commit):

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**Local overlay** (bị Git ignore):

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

Chọn rõ code-intelligence và memory provider:

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Giữ nguyên browser config khi update hoặc chủ động xóa:

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Quy tắc cập nhật và sở hữu {#update-and-ownership-rules}

`.agents/oma-config.yaml` do người dùng sở hữu. `oma update` giữ nội dung hiện có và có thể thêm các top-level template key mới dưới marker `# Added by oma update`. `oma update --force` có thể thay thế user configuration, MCP configuration và stack directory; chỉ dùng khi chủ động muốn reset các tùy chỉnh đó. Local overlay file vẫn là nơi riêng tư cho giá trị theo máy.

Không đặt API key trong file này. Dùng trường `api_key_env` hoặc `api_key_vault`, giữ credential thực tế trong secret store hoặc environment được tham chiếu.

Để biết chi tiết model resolution, xem [Cấu hình model theo agent](/docs/guide/per-agent-models). Để biết semantics và failure behavior của layer, xem [Ngữ nghĩa oma-config](/docs/guide/oma-config-semantics).
