---
title: "Hướng dẫn: Khắc phục sự cố"
sidebar_label: Khắc phục sự cố
description: Chẩn đoán lỗi cài đặt, cấu hình, vendor, dashboard, schedule, evaluation và agent result bằng các bước kiểm tra dựa trên source.
---

# Khắc phục sự cố {#troubleshooting}

Bắt đầu bằng chẩn đoán machine-readable từ project hoặc install root:

```bash
oma doctor --json
```

Lệnh phải kết thúc bằng JSON xác định các phát hiện về install, vendor, configuration và integration. Thêm `--profile` khi vấn đề liên quan đến model hoặc per-agent resolution. Giữ JSON khi báo lỗi; nó chứa path và check đã chọn, không cần đoán bằng prose.

## CLI hoặc install đang dùng sai file {#the-cli-or-install-is-using-the-wrong-files}

Kiểm tra context rõ ràng:

```bash
oma doctor --json
oma doctor --profile
```

Project command đọc `.agents/oma-config.cue` hoặc `.agents/oma-config.yaml` gần nhất, sau đó một local overlay. Global command đọc HOME install root. Nếu đồng thời có local CUE và local YAML, hãy xóa một file. Nếu local file malformed, OMA dừng thay vì âm thầm bỏ qua override. Xem [Tham chiếu cấu hình](/docs/guide/configuration-reference).

Sau update, kiểm tra config và generated path:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` giữ run ở chế độ không tương tác. Nếu user configuration bị thay thế ngoài dự kiến, kiểm tra có dùng `--force` không; update thường giữ config do người dùng sở hữu, còn force mode có thể thay thế nó.

## Install hoặc update không tải được release {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` và phần repair của `oma doctor` tải release mà `prompt-manifest.json` trên `main` chỉ định. Chúng thử asset `agent-skills.tar.gz` của GitHub release `cli-v<version>` trước, đối chiếu với file `.sha256` của nó, rồi đến source archive của tag đó, rồi đến shallow clone của tag. Checksum không khớp, hoặc payload có `.agents/skills/_version.json` ghi một version khác, sẽ dừng run thay vì thử nguồn khác.
<!-- oma-docs:ignore-end -->

Ngay sau khi cắt release, manifest có thể nêu một version mà asset vẫn đang được publish; hãy đợi vài phút rồi thử lại. Để cố ý cài nội dung chưa phát hành từ branch `main`, hãy opt in cho lần chạy đó:

```bash
OMA_UPDATE_CHANNEL=main oma update
```

Lần chạy in một cảnh báo: nội dung branch main không phải release có tag cũng không được xác minh checksum.

## Vendor không khởi động {#a-vendor-does-not-start}

Chạy authentication check của vendor, sau đó kiểm tra profile OMA đã resolve:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

Dùng chính xác vendor command mà `oma doctor` liệt kê để authenticate lại. Model override phải dùng dạng `owner/model` mà schema chấp nhận và vendor phải hỗ trợ selected CLI transport. Với `model_preset: free`, kiểm tra gateway URL và model đã resolve bằng `oma doctor --profile`, sau đó xác nhận biến môi trường API key đã cấu hình có key. Nếu bỏ qua `free` map, mặc định là `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` và model `auto`; không bao giờ đặt API key trực tiếp trong YAML.

Nếu child thoát mà không có result artifact, kiểm tra run directory và parent status. Child được spawn nhận run identity và result instruction, ghi claim ở path được inject và báo artifact của nó; parent hoàn tất managed receipt sau khi thu exit code. Read-only child trả về `OMA_RESULT_JSON: ...`; dòng đó được ghi nhận là inspection và không thỏa executable verification.

## Hook đã cài nhưng không chạy {#hooks-are-installed-but-do-not-run}

Với Codex, kiểm tra file được tạo và làm trust flow một lần:

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Chạy `/hooks` sau lần cài đầu tiên và sau update làm thay đổi command string. Codex subprocess do OMA spawn truyền bypass flag cho managed invocation của chính nó; điều đó không trust hook trong Codex session bạn tự khởi động. Xem [Codex Hook Trust](/docs/guide/codex-hook-trust).

## Dashboard trống hoặc mất kết nối {#the-dashboard-is-empty-or-disconnected}

Khởi động terminal dashboard từ project chứa session file:

```bash
oma dashboard terminal
```

Dashboard đọc `.agents/state/memories/` theo mặc định. Đặt `MEMORIES_DIR` nếu state ở nơi khác. Web dashboard bind vào loopback và in URL có token:

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Mở chính xác URL command in ra; web API và WebSocket yêu cầu dashboard token. Nếu port bận, dùng `DASHBOARD_PORT` khác. Nếu không thấy agent, kiểm tra workflow đã ghi session/task/progress file vào memory directory đã chọn. Dashboard không tự tìm thư mục legacy `.serena/memories/`.

## Schedule bị thiếu hoặc không chạy {#a-schedule-is-missing-or-did-not-run}

Kiểm tra manifest và scheduler state:

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` báo `synced`, `stale`, `missing-in-os` và `orphan-in-os`. `schedule sync` khôi phục job bị thiếu và ghi lại các registration lỗi thời (dòng `Unknown command: schedule:run` trong run log nghĩa là registration có từ trước khi lệnh được đổi tên; `oma update` tự động sync lại); chỉ thêm `--prune` khi cần xóa OS job mồ côi. Preview tạo bằng `--dry-run` không đăng ký job. Với interval lặp lại, chấp nhận OMA rounding bằng `--accept-rounded` sau khi xem preview. Kiểm tra run log tại `~/.agents/schedule/runs/<id>/` để tìm vendor exit khác không hoặc `re-auth required`.

## Evaluation hoặc optimization report không có coverage {#evaluation-or-optimization-reports-no-coverage}

Cả skill eval và skill optimization đều cần ít nhất năm fixture trong `.agents/eval/<skill>/`. Ở mock mode, recorded rollout provenance phải khớp skill hiện tại và fixture hash. Record lại bằng live mode khi fixture hoặc skill thay đổi; không copy file `_rollouts` cũ vào skill directory mới rồi coi đó là bằng chứng hiện tại.

Với optimization, giữ `--dry-run` mặc định trong lúc xem proposed diff. `--apply` cần validation result dương nghiêm ngặt và runner-owned test split đạt; skill do OMA sở hữu có thể bị `oma update` ghi đè về sau.

## Result không thể hoàn tất hoặc resume {#a-result-cannot-finish-or-resume}

Kiểm tra run và plan file:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

Chạy `oma agent verify RUN_ID --required` trước khi kết thúc. Completed claim với receipt thất bại, input đã đổi, artifact thiếu, unresolved item hoặc task contract đã đổi sẽ bị từ chối hoặc hạ cấp. Resume tự động chỉ dành cho task có `retry_policy: "safe"`, prompt có thể replay và còn attempt. Process đang chạy hoặc native attempt bị gián đoạn mà không có partial/failed result rõ ràng sẽ được giữ nguyên để tránh duplicate work. Xem [Agent result và resume](/docs/guide/agent-results-and-resume).

Khi cần trợ giúp, gửi kèm output `oma doctor --json` liên quan, command, session/run ID và message chưa giải quyết. Không gửi credential hoặc nội dung của secret-bearing file.
