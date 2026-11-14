---
title: Chọn cách thiết lập
description: Tải một skill OMA cho một task, chọn preset theo domain, hoặc cài plugin Claude Code cùng các dependency runtime.
---

# Chọn cách thiết lập {#choose-a-setup}

Chọn điểm vào cho task bạn muốn hoàn thành.

| Nhu cầu | Điểm vào | Những gì được thiết lập |
|---|---|---|
| Một task có trọng tâm trong agent hiện tại | [Tải một skill](#load-one-skill) | Hướng dẫn và file hỗ trợ trong một thư mục tạm |
| Hook của project, agent chuyên biệt và workflow | [Cài một skill preset](#install-a-skill-preset) | Tích hợp runtime OMA với các skill đã chọn |
| Cài từ marketplace Claude Code | [Cài plugin](#install-the-claude-code-plugin) | Plugin OMA và bootstrap của project |
| Cài package cho Copilot CLI, Kiro, Qwen Code, Hermes hoặc Codex | [Package Agent Plugins](../guide/vendor-capabilities.md#agent-plugins-package) | Skill và MCP server cho mọi host; Copilot còn nhận agent, command, rule và hook bootstrap |

## Tải một skill {#load-one-skill}

Yêu cầu coding agent chạy lệnh của task và đọc hướng dẫn trả về. `skills use` in hướng dẫn cùng đường dẫn tới thư mục hỗ trợ. Lệnh này không khởi chạy agent khác và không chạy installer OMA.

| Task | Lệnh | Yêu cầu đầu tiên |
|---|---|---|
| Thiết kế admin UI hoặc review UI hiện có | `bunx skills use first-fluke/oh-my-agent@oma-design` | Review our admin page's hierarchy, table density, and empty states. |
| Một lỗi tái hiện được | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduce this failure, fix its cause, and run the relevant check. |
| Một quyết định kiến trúc | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Compare keeping this job in the API with moving it to a worker. |

Thư mục được chọn gồm các tham chiếu hướng dẫn dùng chung. Dependency nằm ngoài thư mục đó vẫn được nêu rõ: một skill domain khác, rule của project, thao tác CLI, công cụ trình duyệt hoặc engine bên ngoài vẫn có thể cần. Hãy đọc dependency của skill đã chọn cho thao tác được yêu cầu. Cài runtime khi task cần hook hoặc thực thi được quản lý của runtime.

Với công việc thiết kế, `oma-design` chọn Interface Design cho hướng admin và giao diện sản phẩm, Taste cho art direction web khác, và Impeccable cho critique, audit và polish UI hiện có. Stack của project và `DESIGN.md` vẫn là hợp đồng triển khai và thiết kế.

## Cài một skill preset {#install-a-skill-preset}

Cài CLI một lần, rồi chọn skill của project:

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

Bản cài CLI đã có thể bắt đầu từ lệnh thứ hai. Dùng `oma install --help` để xem tên preset và tùy chọn provider. [Bootstrap installer](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install) cũng chuẩn bị dependency runtime trước khi thiết lập tương tác.

| Preset | Task đầu tiên | Ví dụ workflow áp dụng |
|---|---|---|
| `frontend` | Lập kế hoạch một trang cài đặt, rồi triển khai form | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | Lập kế hoạch một endpoint API có xác thực | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | Tìm bài báo và so sánh bằng chứng | Yêu cầu tìm tài liệu có trích dẫn |
| `all` | Phối hợp một tính năng qua UI, API và dữ liệu | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

[Các named preset](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets) được `--preset` chấp nhận. Tên không xác định, giá trị rỗng hoặc `custom` bị từ chối trước khi cài. Để chọn từng skill, chạy `oma install` tương tác và chọn Custom. Không có `--preset`, thiết lập không giám sát `--yes`/CI chọn `all`.

Preset frontend chọn tám skill. Preset chọn nội dung skill; installer vẫn thiết lập file dùng chung, mọi định nghĩa workflow và agent, hook và provider. Một số workflow cần skill nằm ngoài preset domain. Kiểm tra [dependency của workflow](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset) trước khi dùng, hoặc chọn `all` cho mọi workflow. Preset nhỏ hơn trên bản cài đã có không xóa các skill khác.

Lựa chọn provider độc lập với preset. Ví dụ, thêm `--semantic-memory none` khi project không cần dịch vụ semantic-memory. Xem [tác dụng của cài đặt](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default) để biết các file và tích hợp khác mà runtime cấu hình.

Bản tóm tắt cài đặt liệt kê skill đã chọn và kiểm tra manifest skill hiện có, kể cả skill được giữ lại. Nó báo các tham chiếu workflow và agent tĩnh, gồm cả nhánh điều kiện, dưới dạng manifest skill được tham chiếu. Chạy `oma doctor` để sửa các mục thiếu hoặc không đọc được mà task cần. Các kiểm tra này không xác minh nội dung resource, tool, provider, credential hay việc thực thi.

## Cài plugin Claude Code {#install-the-claude-code-plugin}

Chạy các lệnh sau trong Claude Code:

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

Chọn `oma-frontend@oh-my-agent`, `oma-security@oh-my-agent` hoặc `oma-research@oh-my-agent` cho plugin domain. Mục `oma` đầy đủ giữ nguyên lựa chọn skill hoàn chỉnh. Các mục domain bootstrap preset tương ứng.

Hook session-start của plugin cung cấp CLI khi cần và chạy `oma install --yes` cho project hiện tại. Đường này thực hiện thiết lập runtime. Receipt thành công thuộc về project đó, và event hook của plugin dùng CLI đã cài. Hook của plugin cần Bash, kể cả trên Windows. Bootstrap có timeout 600 giây; khi thất bại, hook báo các bước thiết lập thủ công và giữ log project tại `.agents/state/plugin-bootstrap.last-error.log`. Receipt chỉ được dùng lại sau khi kiểm tra phiên bản CLI, cấu hình project và hook đều qua. Khởi động lại session sau khi bootstrap báo hoàn tất.

Để chọn cấu hình và dependency trong lúc thiết lập, dùng trực tiếp `oma install`. Bootstrap không giám sát của plugin đầy đủ dùng skill preset `all`; mỗi plugin domain truyền preset đã chọn. Preset nhỏ hơn giữ các skill khác đã cài trong project.

## Kiểm tra kết quả {#check-the-result}

Với skill đã tải, xác nhận agent đã đọc hướng dẫn được chọn và báo các kiểm tra thực tế của task. Với bản cài runtime, chạy `oma doctor` và thử yêu cầu đầu tiên của preset. Cảnh báo provider của `oma doctor` có ý nghĩa khi task được yêu cầu dùng provider đó.
