---
title: Bố cục artifact
sidebar_label: Bố cục artifact
description: OMA lưu tài liệu được duy trì, báo cáo thực thi và state runtime ở đâu, và cách chuyển các vị trí cũ.
---

# Bố cục artifact {#artifact-layout}

OMA dùng ba vị trí: `docs/` cho tài liệu project được duy trì, `.agents/results/` cho báo cáo thực thi người đọc được, và `.agents/state/` cho bằng chứng điều phối và thực thi. Các đường dưới đây là tương đối so với gốc project.

## Tài liệu được duy trì {#maintained-documents}

| Vị trí | Nội dung |
|----------|---------|
| `docs/decisions/` | Đề xuất hướng tiếp cận, đánh đổi và bản ghi quyết định kiến trúc (ADR) |
| `docs/plans/work/` | Kế hoạch công việc, tiến độ, nhật ký quyết định và trình theo dõi nợ kỹ thuật |
| `docs/plans/contracts/` | API contract đã được chấp nhận |
| `DESIGN.md` | Hệ thống thiết kế UI: typography, màu, khoảng cách, chuyển động và component |

Dùng trường `Status` trong tài liệu quyết định để ghi `draft`, `accepted` hoặc `superseded`. Giữ quyết định đã bị thay và liên kết tới bản thay thế để lý do vẫn còn. Trong OMA, `design` chỉ thiết kế UI; đề xuất kỹ thuật và ADR dùng chung `docs/decisions/`.

Dùng một mục lục tài liệu của project, chẳng hạn `docs/README.md`, để liên kết tới các tài liệu được duy trì. Migration artifact chuyển các file hiện có; nó không tạo mục lục và không đổi status của tài liệu.

## Báo cáo thực thi và state runtime {#execution-reports-and-runtime-state}

| Vị trí | Nội dung |
|----------|---------|
| `.agents/results/result-*.md` | Báo cáo kết quả agent và workflow mà người đọc được |
| `.agents/results/architecture/` | Phân tích và khuyến nghị kiến trúc |
| `.agents/results/bugs/` | Báo cáo lỗi |
| `.agents/results/refactor/` | Kế hoạch và báo cáo refactor |
| `.agents/results/security/` | Báo cáo quét bảo mật |
| `.agents/results/market/` | Bản tóm tắt nghiên cứu thị trường |
| `.agents/results/recap/` | Bản tóm tắt công việc |
| `.agents/results/explain/` | Tài liệu giải thích HTML |
| `.agents/results/api-contracts/` | Bản nháp API contract |
| `.agents/results/plan-{sessionId}.json` | Kế hoạch task hiện tại |
| `.agents/state/memories/` | Tóm tắt session, bảng task, tiến độ, bài học và bản ghi thí nghiệm |
| Runtime `agent-runs/` | Receipt có cấu trúc, claim và bằng chứng xác minh |
| Runtime `agent-plans/` | Kế hoạch thực thi đã đóng băng |

Các thư mục con của báo cáo vẫn tách theo domain. Báo cáo người đọc được bổ sung cho bằng chứng có cấu trúc; riêng chúng không xác lập việc hoàn tất đã được xác minh. Xem [Kết quả và Resume](../agent-results-and-resume/).

Receipt hiện tại và kế hoạch đã đóng băng nằm trong thư mục state project của profile đang hoạt động. Project cũ hơn có thể vẫn giữ chúng dưới `.agents/state/`. Việc lưu trữ và các ràng buộc xác minh của chúng không đổi bởi migration này.

## Đưa một tài liệu lên vị trí được duy trì {#promote-a-maintained-document}

Khi một artifact thực thi trở thành tài liệu tham chiếu của project, hãy chuyển nó tới vị trí được duy trì tương ứng. Ví dụ, chuyển một contract đã chấp nhận từ `.agents/results/api-contracts/` sang `docs/plans/contracts/`, hoặc biến một khuyến nghị kiến trúc thành bản ghi quyết định trong `docs/decisions/`. Để lại một liên kết ở vị trí cũ và cập nhật mục lục tài liệu.

Nếu bằng chứng thực thi có cấu trúc ghi file gốc hoặc hash của nó, hãy giữ file đó nguyên và tạo một bản được duy trì. Liên kết tới tài liệu được duy trì từ mục lục project.

Install, update và link mặc định bỏ qua `.agents/results/`, `.agents/state/` và `docs/plans/` trong Git. `docs/decisions/` nằm ngoài ignore mặc định đó. Xem `.gitignore` của project khi chấp nhận một contract hoặc kế hoạch công việc mà nhóm cần đưa vào version.

## Chuyển một project hiện có {#migrate-an-existing-project}

Xem trước migration trước:

```bash
oma docs migrate --dry-run
```

Để có output có cấu trúc, thêm `--json`. Áp dụng cùng migration một cách tường minh khi sẵn sàng:

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` và `oma update` cũng chạy migration này. Nó gộp các vị trí cũ sau:

<!-- oma-docs:ignore-start -->
| Vị trí cũ | Đích |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` và sidecar sơ đồ do tác giả viết | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

Tài liệu quyết định giữ cấu trúc thư mục con. ADR kiến trúc cũ chuyển cùng sidecar `.archify.json` và `.archify.html` do tác giả viết. Review, khuyến nghị và log xác minh gắn với một lần chạy vẫn ở thư mục kết quả. Migration kết quả phủ các file `result-*.md` ở cấp cao nhất của hai thư mục memory; các file memory khác ở nguyên chỗ.

Migration giữ các file đích đã có. Nếu một file khác trùng tên, nó thêm hậu tố nguồn, chẳng hạn `001-cache--from-plan-designs.md`, và báo đường đã chọn. Nếu tên đó cũng đã bị chiếm, nó thêm một content hash ổn định. Chạy lại migration không tạo bản sao trùng và không đổi tên các file đã chuyển.

Nó cập nhật liên kết Markdown và tham chiếu đường được hỗ trợ trong tài liệu đã chuyển, ghi chú điều phối Markdown, `docs/**/*.md`, cùng các file `README*.md` và `AGENTS.md` ở gốc. Hãy xem các thay đổi đó cùng báo cáo migration và Git diff. Bằng chứng runtime có cấu trúc và file `DESIGN.md` của UI không bị viết lại tham chiếu. Các khối `oma-docs:ignore-start` / `oma-docs:ignore-end` hiện có giữ các ví dụ đường cũ.

Xem báo cáo để biết các file bị hoãn. Một báo cáo kết quả được bằng chứng thực thi có cấu trúc tham chiếu sẽ ở đường gốc để receipt và hash đã ghi vẫn hợp lệ. Receipt, claim, kế hoạch thực thi đã đóng băng và bằng chứng runtime khác được để nguyên. Migration không đưa bản nháp contract lên vị trí được duy trì, không chấp nhận quyết định và không đổi hệ thống thiết kế UI.
