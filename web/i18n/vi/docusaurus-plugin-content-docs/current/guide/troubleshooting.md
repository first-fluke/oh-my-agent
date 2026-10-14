---
title: "Hướng dẫn: Khắc phục sự cố"
sidebar_label: Khắc phục sự cố
description: Chẩn đoán lỗi cài đặt, cấu hình, vendor, hook, dashboard, schedule, evaluation và agent result theo triệu chứng hoặc theo đúng thông báo lỗi, với các bước kiểm tra và cách sửa dựa trên source.
---

# Khắc phục sự cố {#troubleshooting}

Bắt đầu bằng chẩn đoán machine-readable từ project hoặc install root:

```bash
oma doctor --json
```

Lệnh phải kết thúc bằng JSON xác định các phát hiện về install, vendor, configuration và integration. Thêm `--profile` khi vấn đề liên quan đến model hoặc per-agent resolution. Giữ JSON khi báo lỗi; nó chứa path và check đã chọn, không cần đoán bằng prose.

## Tìm triệu chứng của bạn {#find-your-symptom}

| Triệu chứng | Xem mục |
|---------|-------|
| OMA đọc sai config, hoặc một lần update đã thay thế thiết lập của bạn | [CLI hoặc install đang dùng sai file](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` hoặc `oma update` không tải được release | [Install hoặc update không tải được release](#an-install-or-update-cannot-download-the-release) |
| Vendor CLI hoặc model không khởi động | [Vendor không khởi động](#a-vendor-does-not-start) |
| Hook đã cài nhưng không có gì xảy ra | [Hook đã cài nhưng không chạy](#hooks-are-installed-but-do-not-run) |
| Dashboard trống, mất kết nối hoặc không khởi động | [Dashboard trống hoặc mất kết nối](#the-dashboard-is-empty-or-disconnected) |
| Scheduled job bị thiếu hoặc thất bại | [Schedule bị thiếu hoặc không chạy](#a-schedule-is-missing-or-did-not-run) |
| Skill eval hoặc optimization báo không có coverage | [Evaluation hoặc optimization report không có coverage](#evaluation-or-optimization-reports-no-coverage) |
| Agent run không verify, không kết thúc hoặc không resume được | [Result không thể hoàn tất hoặc resume](#a-result-cannot-finish-or-resume) |
| CLI in ra một thông báo lỗi | [Tìm thông báo lỗi của bạn](#find-your-error) |

## Tìm thông báo lỗi của bạn {#find-your-error}

Mỗi thông báo dưới đây do CLI in ra. Hãy đối chiếu phần đầu của thông báo.

| Thông báo | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| `Unknown plan task: <id>` | Task ID (từ `--task-id`, hoặc mặc định là agent ID) không phải là `id` của task nào trong `.agents/results/plan-<session>.json` | Truyền `--task-id` với một task ID có trong plan |
| `Plan is immutable after dispatch; ...` | Session plan đã thay đổi sau lần dispatch đầu tiên | Khôi phục plan, hoặc lưu plan đã đổi dưới một session ID mới (và một `lineage_id` mới nếu bạn có đặt) |
| `Task acceptance contract changed before dispatch` hoặc `Plan changed before dispatch` | Plan bị sửa trong lúc một run đang khởi động | Thử lại khi plan đã ổn định |
| `Attempt limit reached for workflow lineage and logical goal` | `max_attempts` của plan (mặc định 3, tính cả attempt đầu tiên) đã dùng hết | Kiểm tra các attempt thất bại trước khi lên plan cho attempt khác |
| `Cannot verify a finished run; start a new run` | `oma agent verify` chạy sau khi run đã kết thúc | Bắt đầu run mới bằng `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` không nhận verification mode nào, hoặc nhận nhiều hơn một | Dùng đúng một trong `--required`, `--affected PATH...` hoặc `-- <argv>` |
| `No complete test selection for affected paths: ...` | Graph không có test selection đầy đủ cho các path đó | Dùng `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent finish` được gọi trên run do `oma agent spawn` hoặc `parallel` khởi động | Ghi claim tại path được inject; parent sẽ hoàn tất run |
| `Resume requires a session plan with task contracts` | Session không có plan file | Resume chỉ hoạt động với session dựa trên plan; thay vào đó hãy spawn lại task |
| `A resume coordinator already owns this session` | Một `oma agent resume` khác cho session đang chạy, hoặc lease của nó đến từ host khác | Đợi lần resume kia kết thúc; lease do process đã chết trên cùng host để lại sẽ được thu hồi tự động |
| `No graph-backed context found for <agent>` | Không có graph context cho agent đó | Sửa task definition, hoặc tiếp tục với native search path đã được project ghi lại |
| `Dashboard failed: port 9847 is already in use. ...` | Một process khác đang giữ dashboard port | `DASHBOARD_PORT=8080 oma dashboard web`, hoặc dừng process kia |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` không phải số nguyên từ 1 đến 65535 | Đặt port hợp lệ, hoặc unset để dùng 9847 |
| `Removed option <old>. Use <new>.` | Lệnh dùng cách viết flag đã bị loại bỏ | Dùng flag được nêu trong thông báo |
| `Unknown command: ... Use oma --help.` | Command path đã bị loại bỏ hoặc đổi tên | Chạy `oma --help` hoặc `oma describe` để xem các path hiện tại |
| `oma agent spawn` thoát với code 3 | Vendor thoát với 0, nhưng run không kết thúc ở `completed` | Đọc `unresolved` trong run record; xem [Agent result và resume](./agent-results-and-resume.md) |

## CLI hoặc install đang dùng sai file {#the-cli-or-install-is-using-the-wrong-files}

Kiểm tra context rõ ràng:

```bash
oma doctor --json
oma doctor --profile
```

| Triệu chứng | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| Một thiết lập bị bỏ qua, hoặc global default thắng | Các lệnh đọc global default từ `$OMA_HOME/.agents/` (mặc định `~/.oma/.agents/`), sau đó đến project shared config gần nhất và một local overlay. Các project root tổ tiên khác nhau không được merge | Kiểm tra những config path mà `oma doctor --json` đã chọn, và sửa đúng file thực sự được đọc |
| OMA dừng trong lúc load config | Đồng thời có local CUE và local YAML, hoặc một local file bị malformed. OMA dừng thay vì âm thầm bỏ qua override | Xóa một trong hai local file, hoặc sửa file bị malformed |
| User configuration bị thay thế sau một lần update | Update đã chạy với `--force`. Update thông thường giữ config do người dùng sở hữu; force mode có thể thay thế nó | Update không kèm `--force`, sau đó kiểm tra config và generated path |

Xem [Tham chiếu cấu hình](/docs/guide/configuration-reference) để biết thứ tự file. Sau update, kiểm tra config và generated path:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` giữ run ở chế độ không tương tác.

## Install hoặc update không tải được release {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` và phần repair của `oma doctor` tải release mà `prompt-manifest.json` trên `main` chỉ định. Chúng thử asset `agent-skills.tar.gz` của GitHub release `cli-v<version>` trước, đối chiếu với file `.sha256` của nó, rồi đến source archive của tag đó, rồi đến shallow clone của tag. Checksum không khớp, hoặc payload có `.agents/skills/_version.json` ghi một version khác, sẽ dừng run thay vì thử nguồn khác.
<!-- oma-docs:ignore-end -->

| Triệu chứng | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| Tải thất bại ngay sau khi release | Manifest nêu một version mà asset vẫn đang được publish | Đợi vài phút rồi thử lại |
| Bạn cần nội dung chưa phát hành từ `main` | Release chỉ cài nội dung đã gắn tag | Opt in cho một lần chạy bằng `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

Lần chạy in một cảnh báo: nội dung branch main không phải release có tag cũng không được xác minh checksum.

## Vendor không khởi động {#a-vendor-does-not-start}

Chạy authentication check của chính vendor, sau đó kiểm tra profile OMA đã resolve:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Triệu chứng | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| Vendor CLI chưa được authenticate | Vendor session đã hết hạn hoặc chưa từng được thiết lập | Authenticate lại bằng chính xác vendor command mà `oma doctor` liệt kê |
| Model override bị từ chối | Override không ở dạng `owner/model` mà schema chấp nhận, hoặc vendor của nó không hỗ trợ CLI transport đã chọn | Dùng dạng `owner/model` với một vendor hỗ trợ transport đó |
| `model_preset: free` không kết nối được gateway | Gateway URL hoặc model đã resolve bị sai, hoặc biến môi trường API key đã cấu hình đang rỗng | Kiểm tra gateway URL và model bằng `oma doctor --profile`, sau đó đặt key vào biến môi trường |
| Child thoát mà không có result artifact | Child không ghi claim tại path được inject | Kiểm tra run directory và parent status (xem bên dưới) |

Nếu bỏ qua `free` map, mặc định là `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` và model `auto`; không bao giờ đặt API key trực tiếp trong YAML.

Child được spawn nhận run identity và result instruction, ghi claim ở path được inject và báo artifact của nó; parent hoàn tất managed receipt sau khi thu exit code. Read-only child trả về `OMA_RESULT_JSON: ...`; dòng đó được ghi nhận là inspection và không thỏa executable verification.

## Hook đã cài nhưng không chạy {#hooks-are-installed-but-do-not-run}

| Triệu chứng | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| Codex không chạy OMA hook | Hook chưa được trust: đây là lần cài đầu tiên, hoặc một lần update đã thay đổi hook command string | Kiểm tra `.codex/hooks.json`, sau đó chạy `/hooks` bên trong Codex |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Codex subprocess do OMA spawn truyền bypass flag cho managed invocation của chính nó; điều đó không trust hook trong Codex session bạn tự khởi động. Xem [Codex Hook Trust](/docs/guide/codex-hook-trust).

## Dashboard trống hoặc mất kết nối {#the-dashboard-is-empty-or-disconnected}

Khởi động terminal dashboard từ project chứa session file:

```bash
oma dashboard terminal
```

| Triệu chứng | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| `No agents detected yet` | Workflow chưa ghi session, task hoặc progress file vào memory directory đang được theo dõi, hoặc dashboard đang theo dõi một thư mục khác | Đợi progress file đầu tiên; chạy từ project root, truyền `--project-root <path>`, hoặc đặt `MEMORIES_DIR` |
| File trong thư mục legacy `.serena/memories/` không xuất hiện | Dashboard đọc `.agents/state/memories/` và không tìm trong thư mục legacy | Đặt `MEMORIES_DIR` thành thư mục chứa các file đó |
| `oma dashboard web` thoát với `port 9847 is already in use` | Một process khác đang giữ port | Dùng `DASHBOARD_PORT` khác |
| Trang web vẫn ở trạng thái Disconnected sau khi bạn khởi động lại dashboard | Mỗi lần khởi động tạo một access token mới, còn tab đang mở vẫn giữ token cũ | Tải lại trang |

Web dashboard bind vào loopback và in URL của nó. Hãy mở URL đó; trang tự mang token cho web API và WebSocket.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Các tín hiệu dashboard khác có trong [Giám sát Dashboard](./dashboard-monitoring.md#troubleshooting-runbook).

## Schedule bị thiếu hoặc không chạy {#a-schedule-is-missing-or-did-not-run}

Kiểm tra manifest và scheduler state. Hai lệnh đầu chỉ đọc; hai lệnh cuối thay đổi state:

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Triệu chứng | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| `schedule list` hiển thị `missing-in-os` hoặc `stale` | OS registration bị thiếu hoặc lỗi thời | `oma schedule sync` |
| Run log hiển thị `Unknown command: schedule:run` | Registration có từ trước khi lệnh được đổi tên | `oma update` tự động sync lại; `oma schedule sync` cũng ghi lại nó |
| `schedule list` hiển thị `orphan-in-os` | Một OS job không có manifest entry | `oma schedule sync --prune`, chỉ khi cần xóa các job mồ côi |
| Schedule đã tạo nhưng không bao giờ được đăng ký | Nó được tạo bằng `--dry-run`, vốn chỉ preview | Tạo lại mà không kèm `--dry-run` |
| Interval lặp lại không được đăng ký | Interval cần làm tròn | Xem preview, sau đó chấp nhận việc làm tròn bằng `--accept-rounded` |
| Job đã chạy nhưng thất bại | Vendor thoát với code khác 0, hoặc log ghi `re-auth required` | Kiểm tra run log tại `~/.oma/schedule/runs/<id>/` và authenticate lại vendor |

## Evaluation hoặc optimization report không có coverage {#evaluation-or-optimization-reports-no-coverage}

| Triệu chứng | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| Skill eval hoặc optimization báo không có coverage | Có ít hơn năm fixture trong `.agents/eval/<skill>/` | Thêm fixture cho đến khi có ít nhất năm |
| Mock mode từ chối recorded rollout | Recorded rollout provenance không khớp skill hiện tại và fixture hash | Record lại bằng live mode; không copy file `_rollouts` cũ vào skill directory mới rồi coi đó là bằng chứng hiện tại |
| `--apply` từ chối ghi | `--apply` cần validation result dương nghiêm ngặt và runner-owned test split đạt | Giữ `--dry-run` mặc định trong lúc xem proposed diff, và sửa validation đang thất bại trước |

Skill do OMA sở hữu đã bị `--apply` thay đổi có thể bị `oma update` ghi đè về sau.

## Result không thể hoàn tất hoặc resume {#a-result-cannot-finish-or-resume}

Kiểm tra run và plan file:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Triệu chứng | Nguyên nhân | Cách sửa |
|---------|-------|-----|
| Completed claim bị từ chối hoặc hạ cấp | Receipt thất bại, input đã đổi, artifact thiếu, unresolved item hoặc task contract đã đổi | Chạy `oma agent verify RUN_ID --required` trước khi kết thúc, và sửa những gì receipt báo |
| Resume để task ở trạng thái `blocked` | Resume tự động cần `retry_policy: "safe"`, prompt có thể replay và còn attempt | Đọc lý do trong dry-run report. Plan bị đóng băng sau lần dispatch đầu tiên, nên hãy đặt `retry_policy` trong plan của một session mới, hoặc chạy lại task thủ công |
| Resume không retry một task | Process đang chạy, hoặc native attempt bị gián đoạn mà không có partial/failed result rõ ràng, sẽ được giữ nguyên để tránh duplicate work | Đợi process đang chạy, hoặc hoàn tất native attempt trước |

Xem [Agent result và resume](./agent-results-and-resume.md) để biết toàn bộ lifecycle.

## Yêu cầu trợ giúp {#ask-for-help}

Khi cần trợ giúp, gửi kèm output `oma doctor --json` liên quan, command, session/run ID và message chưa giải quyết. Không gửi credential hoặc nội dung của secret-bearing file. Mở issue tại [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## Xem thêm {#see-also}

- [Sử dụng OMA](./usage.md#troubleshooting): các vấn đề thiết lập như thiếu skill, thiếu CLI và xung đột workspace
- [Giám sát Dashboard](./dashboard-monitoring.md#troubleshooting-runbook): tín hiệu dashboard bị kẹt, bị crash và mất kết nối
- [Agent result và resume](./agent-results-and-resume.md): run record, claim và khôi phục
- [Thuật ngữ](../getting-started/glossary.md): các thuật ngữ như [run record và claim](../getting-started/glossary.md#run-record-and-claim)
