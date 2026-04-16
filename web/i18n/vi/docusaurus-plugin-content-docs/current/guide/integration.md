---
title: "Hướng dẫn: Tích hợp dự án hiện có"
description: Hướng dẫn đầy đủ để thêm oh-my-agent vào dự án hiện có — đường CLI, đường thủ công, xác minh, cấu trúc symlink SSOT và hoạt động bên trong của trình cài đặt.
---

# Hướng dẫn: Tích hợp dự án hiện có

## Hai đường tích hợp

1. **Đường CLI** — Chạy `oma` (hoặc `npx oh-my-agent`) và làm theo prompt tương tác. Khuyến nghị cho hầu hết người dùng.
2. **Đường thủ công** — Tự sao chép file và cấu hình symlink. Hữu ích cho môi trường hạn chế hoặc thiết lập tùy chỉnh.

Cả hai đường cho kết quả giống nhau: thư mục `.agents/` (SSOT) với symlink trỏ thư mục IDE cụ thể về nó.

---

## Đường CLI: Từng bước

### 1. Cài CLI

```bash
bun install --global oh-my-agent
# Hoặc dùng npx cho chạy một lần
npx oh-my-agent
```

### 2. Điều hướng đến gốc dự án

```bash
cd /path/to/your/project
```

### 3. Chạy trình cài đặt

```bash
oma
```

### 4. Chọn loại dự án

Trình cài đặt trình bày preset: All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom.

### 5-8. Cấu hình

Chọn ngôn ngữ backend (nếu có), symlink IDE, git rerere và cấu hình MCP.

---

## Đường thủ công

Cho môi trường không có CLI tương tác (pipeline CI, shell hạn chế):

```bash
# Tải tarball mới nhất
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Xác minh checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Giải nén
tar -xzf agent-skills.tar.gz
```

Sau đó sao chép file, tạo symlink và cấu hình oma-config.yaml.

---

## Checklist xác minh

```bash
# Chạy lệnh doctor cho kiểm tra sức khỏe đầy đủ
oma doctor
```

Kiểm tra: cài đặt CLI, xác thực, cấu hình MCP, trạng thái skill.

---

## Cấu trúc symlink đa IDE (khái niệm SSOT)

oh-my-agent dùng kiến trúc Nguồn dữ liệu duy nhất (SSOT). Thư mục `.agents/` là nơi duy nhất skill, workflow, config và định nghĩa agent sống. Tất cả thư mục IDE cụ thể chỉ chứa symlink trỏ về `.agents/`.

### Tại sao dùng symlink?

- **Một lần cập nhật, tất cả IDE hưởng lợi.** Khi `oma update` làm mới `.agents/`, mọi IDE tự động nhận thay đổi.
- **Không trùng lặp.** Skill được lưu một lần, không sao chép theo IDE.
- **An toàn khi xóa.** Xóa `.claude/` không phá hủy skill.
- **Thân thiện Git.** Symlink nhỏ và diff sạch.

---

## Mẹo an toàn và chiến lược rollback

### Trước cài đặt

1. **Commit công việc hiện tại.** Có trạng thái git sạch để có thể `git checkout .` hoàn tác mọi thứ.
2. **Kiểm tra thư mục `.agents/` hiện có.** Nếu có từ công cụ khác, sao lưu trước.

### Sau cài đặt

Thêm vào `.gitignore`:
```gitignore
# File runtime oh-my-agent
.serena/
.agents/results/
.agents/state/
```

### Rollback

```bash
# Xóa hoàn toàn oh-my-agent
rm -rf .agents/ .claude/skills/ .claude/agents/ .serena/

# Hoặc revert bằng git
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```
