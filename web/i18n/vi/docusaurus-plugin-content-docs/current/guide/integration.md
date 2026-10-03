---
title: "Hướng dẫn: Tích hợp project hiện có"
sidebar_label: Project hiện có
description: Hướng dẫn thêm oh-my-agent vào project hiện có, gồm đường CLI, đường thủ công, xác minh, cấu trúc symlink SSOT và hoạt động bên trong của installer.
---

# Hướng dẫn: Tích hợp project hiện có

## Hai đường tích hợp

Có hai cách thêm oh-my-agent vào project hiện có:

1. **Đường CLI:** Chạy `oma` hoặc `npx oh-my-agent` rồi làm theo prompt interactive. Đây là lựa chọn được khuyến nghị cho phần lớn user.
2. **Đường thủ công:** Tự copy file và cấu hình symlink. Hữu ích trong môi trường hạn chế hoặc setup tùy chỉnh.

Cả hai đường cho cùng kết quả: thư mục `.agents/` là SSOT cùng các file native do vendor tạo như `.claude/agents/`, `.codex/agents/` và `.qwen/agents/`.

---

## Đường CLI: từng bước

### 1. Cài CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```


Sau khi cài global, command `oma` hoặc `oh-my-agent` có sẵn.

### 2. Đi tới project root

```bash
cd /path/to/your/project
```


Chạy installer từ project muốn cấu hình. OMA ghi SSOT tương đối với install root; nên dùng Git repository để review và rollback, nhưng installer không bắt buộc phải có Git.

### 3. Chạy installer

```bash
oma
```


Command mặc định, không có subcommand, mở installer interactive.

### 4. Chọn loại project

Installer hiển thị các preset:

| Preset | Skill bao gồm |
|:-------|:---------------|
| **All** | Mọi skill có sẵn |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | Skill React/Next.js |
| **Backend** | Skill backend Python/Node.js/Rust |
| **Mobile** | Skill mobile Flutter/Dart |
| **DevOps** | Skill Terraform + CI/CD + Workflow |
| **Custom** | Chọn skill riêng lẻ từ danh sách đầy đủ |

### 5. Chọn ngôn ngữ backend (nếu áp dụng)

Nếu preset gồm backend skill, bạn chọn variant ngôn ngữ:

- **Python:** FastAPI/SQLAlchemy, mặc định.
- **Node.js:** NestJS/Hono + Prisma/Drizzle.
- **Rust:** Axum/Actix-web.
- **Khác / tự phát hiện:** Cấu hình sau bằng `/stack-set`.

### 6. Cấu hình symlink IDE

Installer luôn tạo symlink Claude Code (`.claude/skills/`). Nó cũng sinh agent file, hook, setting và file tích hợp native cho vendor đã chọn. Các họ vendor hiện có gồm Antigravity, Claude, Codex, Cursor, Kiro, Kimi, Qwen, cùng đường mở rộng cho pi và OpenCode. Nếu có thư mục `.github/`, installer có thể tự tạo symlink GitHub Copilot. Nếu chọn **ZCode**, workflow được expose thành slash-command qua symlink `.zcode/commands/*.md`, chỉ dành cho workflow, không có agent file hoặc hook. Nếu không, installer hỏi:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```


### 7. Git config global khuyến nghị

Gần cuối `oma install` và `oma update`, CLI kiểm tra hai global git setting giúp workflow nhiều agent:

| Key | Giá trị mong muốn | Vì sao |
|:----|:--------------|:----|
| `rerere.enabled` | `true` | Dùng lại resolution đã ghi; merge nhiều agent thường gặp conflict giống nhau và rerere replay bản sửa trước. |
| `init.defaultBranch` | `main` | Tên branch mặc định nhất quán cho repository mới. |

Nếu value thiếu hoặc khác, CLI hỏi interactive với mặc định **yes**:

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```


Chấp nhận sẽ chạy tương đương:

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```


Đường non-interactive (`--yes`, `--ci` hoặc `CI=true`) không bao giờ ghi global git config; chỉ in ghi chú skip kèm command sửa thủ công.

`oma doctor` báo cùng các check dưới **Git Config**, tính mismatch là issue, expose qua `gitRecommended` trong output `--json` và có thể apply fix interactive.

### 8. Cấu hình MCP

Nếu tồn tại config MCP của Antigravity IDE (`~/.gemini/antigravity/mcp_config.json`), installer đề nghị cấu hình Serena MCP bridge:

```
Configure Serena MCP with bridge? (Required for full functionality)
```


Nếu chấp nhận, nó thiết lập:

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```


Tương tự, nếu có settings Gemini CLI (`~/.gemini/settings.json`), installer đề nghị cấu hình Serena cho Gemini CLI ở HTTP mode:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```


### 9. Hoàn tất

Installer hiển thị summary mọi thứ đã cài:

- Danh sách skill đã cài.
- Vị trí thư mục skill.
- Symlink đã tạo.
- Mục bị bỏ qua, nếu có.

---

## Đường thủ công

Dùng khi CLI interactive không khả dụng, chẳng hạn CI pipeline, shell hạn chế hoặc máy doanh nghiệp.

### Bước 1: tải và giải nén

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```


### Bước 2: copy file vào project

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```


`oma link` tạo lại `.claude/`, `.codex/`, `.qwen/` và file native vendor liên quan từ `.agents/agents/`. Khi runtime, OMA chỉ dùng native dispatch khi vendor runtime hiện tại khớp vendor đích của agent. Setup nhiều vendor vẫn hoạt động, nhưng agent không khớp sẽ fallback về external `oma agent spawn`.

Với Qwen Code, các định nghĩa Markdown được sinh ra nằm trong `.qwen/agents/`. Chọn một vai trò OMA thông qua `subagent_type` của Agent tool, ví dụ `backend-engineer`. Kiểm tra các định nghĩa khả dụng bằng `/agents manage` trong Qwen Code. Agent native dùng cùng [lifecycle của result](./agent-results-and-resume.md) như CLI spawn: `oma agent begin`, `oma agent verify` và `oma agent finish`. Với `model_preset: free`, hãy dùng `oma agent spawn` để child nhận được cấu hình gateway.

Qwen Code dùng cùng `code-intelligence-primer` như các vendor khác. Giống Claude Code, nó đăng ký primer dùng chung trên `SessionStart` và `UserPromptSubmit`: hướng dẫn được inject một lần mỗi session và inject lại sau khi compaction. Primer theo provider đã cấu hình (Serena hoặc Gortex), gồm hướng dẫn về deferred tool, và cho phép fallback sang native khi provider không khả dụng hoặc timeout. Qwen không thêm cơ chế chặn tìm kiếm code hay theo dõi kết quả provider riêng.

Sau khi cập nhật CLI, chạy `oma link qwen` để tạo lại setting hook và wrapper, rồi bắt đầu một session Qwen mới. Các test output của hook xác minh contract tích hợp; chúng không đảm bảo model sẽ chọn tool nào.

### Bước 3: cấu hình preference của user

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```


### Bước 4: khởi tạo thư mục memory

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```


---

## Checklist xác minh

Sau cài đặt theo bất kỳ đường nào, xác minh mọi thứ đã sẵn sàng:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```


Command doctor kiểm tra:

| Check | Xác minh |
|:------|:----------------|
| **Cài đặt CLI** | agy, claude, codex, qwen, version và khả dụng |
| **Authentication** | API key hoặc OAuth status của từng CLI |
| **Cấu hình MCP** | Setup Serena MCP server cho từng môi trường CLI |
| **Trạng thái skill** | Skill nào đã cài và có còn current không |

Command xác minh thủ công:

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```


---

## Cấu trúc symlink đa IDE (khái niệm SSOT)

oh-my-agent dùng kiến trúc Single Source of Truth (SSOT). Thư mục `.agents/` là nơi duy nhất chứa skill, workflow, config và agent definition. Thư mục riêng của IDE chỉ chứa symlink trỏ về `.agents/`.

### Layout thư mục

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```


### Vì sao dùng symlink?

Khi `oma update` refresh `.agents/`, mọi IDE trỏ tới đó đều nhận thay đổi. Skill được lưu một lần thay vì copy theo IDE. Xóa `.claude/` không xóa skill vì SSOT trong `.agents/` vẫn còn. Symlink cũng nhỏ và diff sạch trong Git.

---

## Mẹo an toàn và chiến lược rollback

### Trước khi cài đặt

1. **Commit công việc hiện tại:** Installer tạo directory và file mới. Trạng thái Git sạch cho phép dùng `git checkout .` để hoàn tác.
2. **Kiểm tra thư mục `.agents/` hiện có:** Nếu có từ tool khác, backup trước vì installer sẽ overwrite.

### Sau khi cài đặt

1. **Review thứ được tạo:** Chạy `git status` để xem file mới. Installer chỉ tạo file trong `.agents/`, `.claude/` và tùy chọn `.github/`.
2. **Kiểm tra `.gitignore`:** Trong Git repo, install/update/link tự append runtime entry vào root `.gitignore`, gồm `.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/` và `docs/plans/`. Phần lớn team commit `.agents/` và `.claude/` để chia sẻ setup. Với `.serena/`, Serena quản lý cache qua `.serena/.gitignore`; bạn có thể commit `.serena/project.yml` hoặc bỏ qua toàn thư mục:

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```


### Rollback

Để xóa hoàn toàn oh-my-agent khỏi project:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```


Hoặc revert bằng Git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```


---

## Thiết lập dashboard

Sau cài đặt có thể bật theo dõi thời gian thực. Xem [Dashboard Monitoring guide](/docs/guide/dashboard-monitoring) để biết chi tiết.

Thiết lập nhanh:

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```


---

## Installer làm gì bên trong

Khi chạy `oma`, tức command install, các bước là:

### 1. Migration legacy

Installer kiểm tra thư mục cũ `.agent/` (số ít) rồi migrate sang `.agents/` (số nhiều) nếu có. Đây là migration một lần cho user nâng cấp từ version cũ.

### 2. Phát hiện tool cạnh tranh

Installer quét tool cạnh tranh và đề nghị gỡ để tránh conflict.

### 3. Tải tarball

Installer tải release tarball mới nhất từ GitHub release của oh-my-agent. Tarball chứa toàn bộ `.agents/` gồm skill, shared resource, workflow, config và agent definition.

### 4. Cài shared resource

`installShared()` copy thư mục `_shared/` vào `.agents/skills/_shared/`, gồm:

- `core/`: skill routing, context loading, prompt structure, nguyên tắc chất lượng, phát hiện vendor, API contract.
- `runtime/`: memory protocol và execution protocol theo vendor.
- `conditional/`: resource chỉ load khi điều kiện cụ thể đúng, như quality score hoặc exploration loop.

### 5. Cài workflow

`installWorkflows()` copy mọi workflow vào `.agents/workflows/`: `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` và `/stack-set`.

### 6. Cài config

`installConfigs()` copy file phụ vào `.agents/config/`, tạo `.agents/mcp.json` và bootstrap config do user sở hữu `.agents/oma-config.yaml` hoặc `.agents/oma-config.cue`. File user hiện có được giữ trừ khi có `--force`; `oma update` cũng giữ config user và thêm top-level key của template khi cần.

### 7. Cài skill

Với mỗi skill được chọn, `installSkill()` copy thư mục skill vào `.agents/skills/{skill-name}/`. Nếu chọn variant, chẳng hạn Python cho backend, nó cũng tạo thư mục `stack/` với resource theo ngôn ngữ.

### 8. Adaptation theo vendor

`installVendorAdaptations()` cài file riêng cho IDE của vendor được hỗ trợ:

- Agent definition (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`).
- Hook config (`.claude/hooks/`, `.codex/hooks.json`).
- Settings và tài liệu tích hợp vendor dùng chung (chỉ `AGENTS.md`, kể cả Claude Code ≥ 2.1.277). `CLAUDE.md` và `GEMINI.md` không bao giờ nhận block OMA; `CLAUDE.md` có sẵn do user sở hữu chỉ nhận thêm một dòng import `@AGENTS.md` để Claude Code không bỏ qua `AGENTS.md`.

Codex gate hook sau bước trust một lần, nên `.codex/hooks.json` không chạy cho đến khi review một lần qua browser `/hooks` của Codex. Xem [Codex Hook Trust](/docs/guide/codex-hook-trust).

### 9. CLI symlink

`createCliSymlinks()` tạo symlink từ thư mục IDE tới SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`.
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`.
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` nếu bật Copilot.

File agent native được sinh từ `.agents/agents/` bởi `oma link`, `oma install` hoặc `oma update`, không symlink trực tiếp.

### 10. Workflow global

`installGlobalWorkflows()` cài workflow có thể cần ở cấp global, ngoài thư mục project.

### 11. Git config và MCP khuyến nghị

Như mô tả ở đường CLI, install/update tùy chọn cấu hình global git setting khuyến nghị (`rerere.enabled`, `init.defaultBranch`) sau consent interactive, đồng thời có thể cấu hình MCP khi phù hợp.
