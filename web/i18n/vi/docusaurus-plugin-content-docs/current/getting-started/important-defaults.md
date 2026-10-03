---
title: Các mặc định quan trọng
description: Các mặc định của oh-my-agent ảnh hưởng đến routing, chọn model, provider, cập nhật, telemetry, browser MCP, Serena transport và khôi phục workflow.
---

# Các mặc định quan trọng

Các mặc định được chọn để dự án đầu tiên có thể sử dụng ngay mà vẫn giữ ổn định cấu hình do người dùng sở hữu. Chúng được resolve trong runtime, vì vậy khóa bị bỏ qua có thể hoạt động khác với giá trị rỗng được ghi rõ. Hãy bắt đầu ở đây khi harness hoạt động nhưng hành vi khác với dự kiến.

## Các mặc định ảnh hưởng đến lần chạy đầu tiên

| Phạm vi | Mặc định | Hệ quả | Ghi đè |
|---|---|---|---|
| Ngôn ngữ phản hồi | `en` | Phản hồi của agent và workflow dùng tiếng Anh trừ khi cấu hình dự án chọn ngôn ngữ được hỗ trợ khác. Chỉ dẫn ngôn ngữ rõ ràng từ người dùng hoặc session vẫn có thể ghi đè mặc định dự án khi host/workflow hỗ trợ. | `language` trong `.agents/oma-config.yaml` hoặc `.cue` |
| Model routing | `auto` | Dùng cấu hình agent/model native của runtime hiện tại. Runtime không xác định sẽ dùng `default_cli` nếu có. | `model_preset`, `default_cli` hoặc `agents.<id>` |
| Code intelligence | `serena` | Cài đặt mới cố gắng cài Serena và kết nối cấu hình MCP của nó. | `providers.code_intelligence: gortex` hoặc `serena` |
| Code-search guard | `block` | Khi đã cấu hình provider code intelligence, hook PreToolUse từ chối `Grep`/`Glob` native và việc tìm kiếm shell đệ quy (`rg`, `grep -r`, `find -name`), đồng thời hướng agent sang các tool của provider. Các lệnh tìm kiếm chỉ nằm trong mục loại trừ đã được xác nhận hoặc ở path ngoài project thì được cho phép. Hook không quảng bá cách bypass đối với source của project. | `providers.code_intelligence_guard: off` |
| Semantic memory | `agentmemory` | Chọn Agent Memory cho semantic memory khi khả dụng. | `providers.semantic_memory: honcho` hoặc `none` |
| Web search | `native` | Search dùng kênh web native của runtime trừ khi chọn provider khác. | `providers.web` |
| Documentation provider | `context7` | Tra cứu documentation dùng Context7 khi skill yêu cầu. | `providers.docs` |
| Telemetry | tắt | OMA ghi thiết lập opt-out của vendor khi linking. | `telemetry: true` |
| CLI auto-update | bật | CLI kiểm tra cập nhật trừ khi tắt. | `auto_update_cli: false` |
| Định dạng ngày | `ISO` | Ngày dùng định dạng kiểu ISO khi project không đặt format. | `date_format: US` hoặc `EU` |
| Múi giờ | múi giờ hệ thống | Thời gian lập lịch và báo cáo theo host khi bỏ qua `timezone`. | `timezone: Australia/Sydney` (hoặc tên IANA khác) |
| Serena transport | `bridge` | Các session dùng chung một Serena server theo project; bridge không khả dụng sẽ fallback sang stdio theo session. | `serena.mode: stdio` |
| Serena auto-update | bật | `oma update` nâng cấp Serena cục bộ khi có thể. | `serena.auto_update: false` |
| Browser DevTools MCP | chưa đặt | Giữ các browser entry hiện có; thiết lập tương tác mới đề xuất `aside`. | `mcp.devtools_browsers: [aside]`, `[chrome]`, `[firefox]` hoặc `[]` |
| Serena Reaper | scheduled path tắt | `serena_reaper.enabled: false` giữ việc reap định kỳ không hoạt động. `oma serena reap` tương tác vẫn chạy. | `serena_reaper.enabled: true` cùng `oma serena reaper enable` |

Tên và mặc định của provider đến từ runtime loader và installer prompt. File config do installer tạo có comment cho các section khả dụng; dùng các comment đó làm hướng dẫn schema theo phiên bản.

## Thứ tự ưu tiên cấu hình

OMA tìm ngược lên từ thư mục làm việc hiện tại để tìm `.agents/` gần nhất. Nó đọc `oma-config.cue` khi có và fallback sang `oma-config.yaml` nếu đánh giá CUE dùng chung thất bại. Project-local overlay, `oma-config.local.cue` hoặc `oma-config.local.yaml`, được merge lên trên; chỉ giữ một local overlay. `OMA_MODEL_PRESET` có thể ghi đè `model_preset` cho một process. Cấu hình local không hợp lệ sẽ dừng việc load thay vì âm thầm chọn giá trị khác.

Model routing có hai trường hợp đặc biệt trước thứ tự preset cố định:

- Với `model_preset: auto`, dùng cấu hình agent/model native của runtime hiện tại. Ghi đè rõ `agents.<id>` vẫn được ưu tiên; runtime không xác định có thể dùng `default_cli`.
- Với `model_preset: free`, child spawn dùng local FreeLLMAPI gateway. `free.model` chọn model gateway và thay thế các per-agent model pin; nếu bỏ qua, dùng `FREELLM_MODEL` hoặc provider fallback `auto`.

Với preset cố định hoặc tùy chỉnh, thứ tự hiệu lực là:

1. Ghi đè rõ `agents.<id>`.
2. Entry của `model_preset` tương ứng, built-in hoặc `custom_presets`.
3. Entry `orchestrator` của preset khi role không có entry riêng.
4. `default_cli` làm vendor fallback khi các cấp trước không resolve được plan.

Preset `free` cung cấp mặc định cho cả ba thiết lập provider: `base_url` là `http://127.0.0.1:31415/v1`, `api_key_env` là `FREELLM_API_KEY` (chấp nhận `FREELLMAPI_API_KEY` như alias tương thích), và `model` là `auto`. Vẫn cần API key sử dụng được trong biến môi trường đã chọn; không có vendor fallback. Đặt các giá trị này trong `oma-config.local.yaml` khi chúng chỉ nên thuộc máy local, hoặc dùng `FREELLM_BASE_URL` và `FREELLM_MODEL` để ghi đè theo process.

## Các mặc định có hệ quả dễ gây bất ngờ

Khóa `mcp.devtools_browsers` bị bỏ qua có nghĩa là “giữ nguyên browser entry hiện tại”. List rỗng ghi rõ sẽ xóa browser entry khi reconciliation. Browser MCP process chạy theo từng agent session, vì vậy chỉ bật khi task điều khiển trình duyệt.

Chế độ Serena `bridge` mặc định giảm các language-server process trùng lặp khi nhiều agent làm việc trong một project. `stdio` là lựa chọn khôi phục khi bridge cục bộ không khởi động được hoặc khi cần process isolation nghiêm ngặt. Serena tự sửa các language-server child ở tool call tiếp theo; memory reaper là thành phần riêng và không cần bật cho việc dùng bình thường.

Thiết lập telemetry mặc định là opt-out. Đặt `telemetry: true` sẽ xóa các vendor opt-out entry của OMA ở lần link/update tiếp theo, có thể bật lại các vendor feature phụ thuộc telemetry. Thiết lập này điều khiển thay đổi tích hợp vendor; nó không thay đổi các session-cost file OMA ghi cho việc hạch toán riêng.

## Đường dẫn khôi phục

| Triệu chứng | Kiểm tra trước | Khôi phục |
|---|---|---|
| Vendor file đã cũ | `oma doctor` và `oma link --dry-run` | Chạy `oma link <vendor>` sau khi sửa `.agents/`; giữ SSOT làm nguồn. |
| Model không được chấp nhận | `oma doctor --profile` | Chuyển sang `auto`, dùng built-in preset hoặc định nghĩa model slug dưới `models:`. |
| Serena tool timeout | `oma doctor` và provider section | Thử `serena.mode: stdio`; nếu vấn đề là memory pressure, xem trước bằng `oma serena reap --dry-run`. |
| Persistent workflow không dừng | `.agents/state/*-state.json` | Nói `workflow done`; chỉ kiểm tra state file khi workflow không tự dọn dẹp. |
| Scheduled reaper không làm gì | Phần Serena Reaper của `oma doctor` | Đặt `serena_reaper.enabled: true`, rồi chạy `oma serena reaper enable`. |
| Local config làm startup lỗi | Đường dẫn lỗi của `oma doctor` | Sửa hoặc xóa local overlay; không tạo cả overlay `.cue` và `.yaml`. |

Tiếp tục với [Cài đặt](./installation.md), [Model theo agent](../guide/per-agent-models.md) hoặc [Ngữ nghĩa oma-config](../guide/oma-config-semantics.md).
