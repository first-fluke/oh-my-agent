---
title: Bắt đầu nhanh
description: Chạy một task có phạm vi từ cài đặt đến xác minh, kèm output mong đợi và cách khôi phục.
---

# Bắt đầu nhanh

Dùng trang này để chạy một task nhỏ và ghi lại một kết quả cụ thể. Bạn cần một thư mục dự án và ít nhất một AI CLI hoặc IDE được hỗ trợ. Trình cài đặt có thể thiết lập `bun`, `uv`, Serena và CUE trên macOS, Linux hoặc Windows; tích hợp host đã chọn là bắt buộc cho prompt đầu tiên, còn tích hợp provider và trình duyệt là tùy chọn.

## 1. Cài đặt

### Cách nhanh nhất — cài skill vào các agent của bạn

```bash
npx skills add first-fluke/oh-my-agent
```

Lệnh này cài gói skill OMA vào các agent runtime được phát hiện (Claude Code, Cursor, Codex và nhiều hơn nữa). Skill dạy agent cách làm việc. Nếu cần stop-hook gate, xác minh artifact, judge độc lập và CLI `oma`, hãy cài harness đầy đủ bên dưới.

Bản cài chỉ có skill không cung cấp CLI `oma`, hook, workflow hay judge. Hãy dùng một skill đã cài có nêu tên cho task đầu tiên bên dưới; dùng harness đầy đủ khi bạn cần các bước kiểm tra bằng CLI.

### Harness đầy đủ (gate, hook, CLI)

Từ thư mục dự án, chạy bootstrap installer:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Trong Windows PowerShell, chạy:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Thiết lập tương tác sẽ hỏi ngôn ngữ phản hồi, các CLI vendor, capability provider, model preset, project skill preset và stack variant. Ở lần chạy đầu tiên, hãy giữ giá trị mặc định, chọn vendor bạn đang dùng và chọn project preset gần với repository nhất.

Nếu đã có `bun`, dùng trực tiếp installer:

```bash
bunx oh-my-agent@latest
```

Bootstrap script cài đặt vào dự án hiện tại. Dùng `oma install --global` khi muốn cài ở cấp HOME; đọc [Cài đặt](./installation.md) trước khi kết hợp cài đặt theo dự án và cài đặt toàn cục.

## 2. Kiểm tra kết quả (chỉ với harness đầy đủ)

Nếu đã cài harness đầy đủ, chạy health check từ cùng thư mục dự án:

```bash
oma doctor
```

Lệnh dạng văn bản in ra một báo cáo gồm các phần như `CLI Status` và `Skills Status`, rồi trả về exit status của shell. Các dòng cụ thể phụ thuộc vào các host đã cài trong dự án:

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

Các tích hợp MCP, trình duyệt, bộ nhớ hoặc code intelligence tùy chọn có thể được báo dưới dạng cảnh báo; chúng chỉ cần cho các task sử dụng chúng. Để có trạng thái đọc được bằng máy, `oma doctor --json` trả về exit status khác 0 khi báo cáo có vấn đề. Dùng `oma doctor --profile` để xem model và CLI đã resolve cho từng vai trò agent chuẩn.

Nếu `oma` không khả dụng nhưng đã cài Bun, chạy cùng bước kiểm tra này mà không cần lệnh toàn cục:

```bash
bunx oh-my-agent@latest doctor
```

Nếu lệnh trần vẫn không tìm thấy, mở shell mới hoặc thêm thư mục bin của package manager vào `PATH`. Nếu `oma doctor` báo cấu hình không hợp lệ, sửa trường được nêu rồi chạy lại. Không xóa `.agents/oma-config.yaml` để khôi phục: đây là cấu hình do người dùng sở hữu và giữ lại thiết lập qua các lần cập nhật.

Nếu bạn chỉ cài skill, bỏ qua bước kiểm tra CLI này và tiếp tục với task dùng skill có tên bên dưới.

## 3. Chạy một task nhỏ

Mở repository trong AI tool đã cấu hình và yêu cầu một skill có tên cụ thể cùng một kết quả độc lập:

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

Host cần nêu rõ skill đã chọn, kiểm tra một mục tiêu và báo cáo một chỉnh sửa link có trọng tâm hoặc cho biết link vốn đã hợp lệ. Hãy kèm output lệnh và exit status cho mọi bước kiểm tra thực sự đã chạy. Bản cài chỉ có skill không thêm `/debug`, `/ralph`, hook hay workflow gate; việc yêu cầu skill có tên giúp task đầu tiên này nằm trong các khả năng đã cài.

Khi keyword hook được bật cho host đã chọn, nó có thể kích hoạt workflow phù hợp. Host hoặc workflow đã chọn thực hiện skill routing, vì vậy prompt tùy ý của host không đảm bảo có hook, skill cụ thể hoặc `CHARTER_CHECK`. Execution contract vẫn phải kiểm tra quy ước của repository, chỉ thực hiện thay đổi trong phạm vi và báo cáo kết quả xác minh. File và lệnh chính xác phụ thuộc vào dự án.

Với task đi qua ranh giới API và UI, hãy chọn rõ `/work` hoặc `/orchestrate`. Với một domain duy nhất, tiếp tục với [Thực thi một skill](../guide/single-skill.md). [Hướng dẫn sử dụng](../guide/usage.md) có các ví dụ dài hơn.

## 4. Biết các mặc định trước khi mở rộng

OMA khởi động với `model_preset: auto`, Serena cho code intelligence, Agent Memory cho semantic memory, native web search và telemetry bị tắt. Serena dùng transport dùng chung `bridge` và tự động cập nhật nếu không được cấu hình khác. Browser DevTools MCP là tùy chọn bật; thiết lập tương tác mới sẽ đề xuất Aside trước. Xem [Các mặc định quan trọng](./important-defaults.md) để biết hệ quả và các khóa ghi đè.

Nếu managed task bị dừng, bắt đầu bằng `oma agent status <session-id> [agent-id]`, sau đó kiểm tra receipt trong `.agents/state/agent-runs/` và injected structured claim path. Các bản ghi đó cho biết run, task, workspace, exit code và trạng thái xác minh. File `result-*.md` và `progress-*.md` dễ đọc trong `.agents/state/memories/` bổ sung ngữ cảnh nếu có. Chỉ chạy lại command thất bại nhỏ nhất sau khi xác nhận run không còn hoạt động. Persistent workflow vẫn hoạt động cho đến khi hoàn tất hoặc bạn nói `workflow done`; xem [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) để biết cách khôi phục state file.

## Bước tiếp theo

- [Các mặc định quan trọng](./important-defaults.md) về precedence, provider và lựa chọn khôi phục
- [Cài đặt](./installation.md) về preset, thiết lập vendor, cài đặt toàn cục và cập nhật
- [Agents](../core-concepts/agents.md) về 33 skill package và vai trò dispatch
- [Workflows](../core-concepts/workflows.md) về lập kế hoạch, thực thi song song, QA và chế độ persistent
