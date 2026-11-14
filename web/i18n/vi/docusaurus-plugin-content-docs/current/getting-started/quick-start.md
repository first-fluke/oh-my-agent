---
title: Bắt đầu nhanh
description: Chọn một skill hoặc một runtime preset, rồi chạy task đầu tiên có phạm vi rõ kèm xác minh thực tế.
---

# Bắt đầu nhanh

Dùng một task có trọng tâm để kiểm tra kết quả. Tải một skill vào coding agent bạn đang dùng, hoặc cài đặt runtime khi bạn cần project hook, agent chuyên biệt và workflow. [Chọn cách thiết lập](./choose-setup.md) giải thích các hướng khả dụng và dependency tương ứng.

## 1. Chọn cách thiết lập {#1-install}

Với task Git chỉ đọc bên dưới, yêu cầu agent tải skill và đọc hướng dẫn cùng thư mục hỗ trợ của nó:

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

Tiếp tục với task ở Bước 3. Thao tác CLI của skill, các skill khác, rule của dự án và dịch vụ bên ngoài vẫn là các dependency riêng. Việc tải skill này không chạy bộ cài OMA.

### Cài runtime khi cần

Bootstrap runtime có thể chuẩn bị `bun`, `uv`, Serena, CUE và lệnh `oma` global. Hãy chọn AI CLI hoặc IDE bạn đang dùng; các tích hợp provider và trình duyệt phụ thuộc vào những task bạn dự định chạy.

Từ thư mục dự án, chạy bootstrap installer:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Trong Windows PowerShell, chạy:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Thiết lập giữ nguyên ngôn ngữ phản hồi hiện có hoặc tự động phát hiện ngôn ngữ hệ thống. Thiết lập tương tác sẽ hỏi các CLI vendor, [capability provider](./glossary.md#capability-provider), [model preset](./glossary.md#model-preset), project [skill preset](./glossary.md#skill-preset) và stack variant. Ở lần chạy đầu tiên, hãy giữ giá trị mặc định, chọn vendor bạn đang dùng và chọn project preset gần với repository nhất. Xem [Preset](./installation.md#presets) để biết skill của từng preset và các [workflow cần skill nằm ngoài preset](./installation.md#workflows-that-need-skills-outside-a-preset).

Nếu đã có `bun`, dùng trực tiếp installer:

```bash
bunx oh-my-agent@latest
```

Bootstrap script cài đặt vào dự án hiện tại. Dùng `oma install --global` khi muốn cài ở cấp HOME; đọc [Cài đặt toàn cục](../guide/global-install.md) trước khi kết hợp cài đặt theo dự án và cài đặt toàn cục.

## 2. Kiểm tra kết quả

Khi tải skill tạm thời, hãy xác nhận agent đã đọc hướng dẫn được chọn và tự xác minh task. Với bản cài runtime, chạy health check từ cùng thư mục dự án:

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

`oma doctor` có thể báo các vấn đề của tích hợp tùy chọn dưới dạng cảnh báo. Việc chuẩn bị AgentMemory mặc định được kiểm tra trong `oma install` và `oma update`; lỗi cài đặt, khởi động hoặc health check sẽ dừng các lệnh đó. Chọn `providers.semantic_memory: none` hoặc `honcho`, hoặc đặt `OMA_NO_AGENTMEMORY=1`, sẽ bỏ qua bước chuẩn bị này.

Để có trạng thái đọc được bằng máy, `oma doctor --json` trả về exit status khác 0 khi báo cáo có vấn đề. Dùng `oma doctor --profile` để xem model và CLI đã resolve cho từng vai trò agent chuẩn.

Nếu `oma` không khả dụng nhưng đã cài Bun, chạy cùng bước kiểm tra này mà không cần lệnh toàn cục:

```bash
bunx oh-my-agent@latest doctor
```

Nếu lệnh trần vẫn không tìm thấy, mở shell mới hoặc thêm thư mục bin của package manager vào `PATH`; [Cài đặt](./installation.md#method-3-global-install) hướng dẫn cách cài lệnh `oma`. Nếu `oma doctor` báo cấu hình không hợp lệ, sửa trường được nêu rồi chạy lại. Không xóa `.agents/oma-config.yaml` để khôi phục: đây là cấu hình do người dùng sở hữu và giữ lại thiết lập qua các lần cập nhật.

## 3. Chạy một task nhỏ

Mở một Git repository sẵn có trong AI tool của bạn. Dùng skill `oma-scm` đã tải, hoặc bản sao được cài bởi một runtime preset cụ thể. Nếu bạn dùng tùy chọn Custom, hãy thêm `oma-scm` cho ví dụ này:

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

So sánh branch và các thay đổi được báo cáo với output Git thực tế. Agent cần báo cáo các lệnh đã chạy cùng exit status của chúng. Task chỉ đọc này không cần test mã hay build.

Một prompt thông thường không khởi động workflow nào; nơi prompt hook được bật, nó chỉ thêm gợi ý skill mang tính tham khảo. Host hoặc workflow đã chọn thực hiện skill routing, vì vậy prompt tùy ý của host không đảm bảo có hook hoặc skill cụ thể. Execution contract vẫn phải kiểm tra quy ước của repository, chỉ thực hiện thay đổi trong phạm vi và báo cáo kết quả xác minh. File và lệnh chính xác phụ thuộc vào dự án.

Với task đi qua ranh giới API và UI, hãy chọn rõ `/work` hoặc `/orchestrate`. Với một domain duy nhất, tiếp tục với [Thực thi một skill](../guide/single-skill.md). [Hướng dẫn sử dụng](../guide/usage.md) có các ví dụ dài hơn.

## 4. Biết các mặc định runtime trước khi mở rộng

Việc tải skill tạm thời không cấu hình các mặc định runtime này. Để dùng project hook, thiết lập provider hoặc workflow nhóm, hãy dùng hướng cài runtime trong [Chọn cách thiết lập](./choose-setup.md).

OMA khởi động với `model_preset: auto`, Serena cho code intelligence, Agent Memory cho semantic memory, native web search và telemetry bị tắt. Serena dùng transport dùng chung `bridge` và tự động cập nhật nếu không được cấu hình khác. Browser DevTools MCP là tùy chọn bật; thiết lập tương tác mới sẽ đề xuất Aside trước. Xem [Các mặc định quan trọng](./important-defaults.md) để biết hệ quả và các khóa ghi đè.

Nếu managed task bị dừng, bắt đầu bằng `oma agent status <session-id> [agent-id]`, sau đó kiểm tra receipt trong `.agents/state/agent-runs/` và injected structured claim path. Các bản ghi đó cho biết run, task, workspace, exit code và trạng thái xác minh. File `result-*.md` và `progress-*.md` dễ đọc trong `.agents/state/memories/` bổ sung ngữ cảnh nếu có. Chỉ chạy lại command thất bại nhỏ nhất sau khi xác nhận run không còn hoạt động. [Workflow liên tục](./glossary.md#persistent-workflow) vẫn hoạt động cho đến khi hoàn tất hoặc bạn nói `workflow done`; xem [Các workflow](../core-concepts/workflows.md#persistent-mode-mechanics) để biết cách khôi phục state file.

## Bước tiếp theo

- [Chọn cách thiết lập](./choose-setup.md) cho một skill, một runtime preset hoặc plugin Claude Code
- [Các mặc định quan trọng](./important-defaults.md) về precedence, provider và lựa chọn khôi phục
- [Cài đặt](./installation.md) về preset, thiết lập vendor, cài đặt toàn cục và cập nhật
- [Agents](../core-concepts/agents.md) về 33 skill package và vai trò dispatch
- [Các workflow](../core-concepts/workflows.md) về lập kế hoạch, thực thi song song, QA và chế độ liên tục
- [Troubleshooting](../guide/troubleshooting.md) khi việc cài đặt, vendor hoặc hook không hoạt động như mong đợi
