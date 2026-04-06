---
title: Cấu trúc dự án
description: Cây thư mục đầy đủ của bản cài đặt oh-my-agent với mọi file và thư mục được giải thích — .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, symlink skills, agents), .serena/memories/, và cấu trúc source repo oh-my-agent.
---

# Cấu trúc dự án

Sau khi cài đặt oh-my-agent, dự án của bạn có thêm ba cây thư mục: `.agents/` (nguồn dữ liệu duy nhất), `.claude/` (tầng tích hợp IDE) và `.serena/` (trạng thái runtime). Trang này tài liệu mọi file và mục đích của nó.

---

## Cây thư mục hoàn chỉnh

```
your-project/
├── .agents/                          ← Nguồn dữ liệu duy nhất (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    ← Ngôn ngữ, múi giờ, ánh xạ CLI
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Tài nguyên dùng chung cho TẤT CẢ agent
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── tailwind-rules.md
│   │   │       ├── component-template.tsx
│   │   │       ├── snippets.md
│   │   │       ├── error-playbook.md
│   │   │       ├── checklist.md
│   │   │       └── examples.md
│   │   │
│   │   └── ...                       ← Các thư mục skill khác
│   │
│   ├── workflows/
│   │   ├── orchestrate.md             ← Liên tục: thực thi song song tự động
│   │   ├── work.md             ← Liên tục: điều phối từng bước
│   │   ├── ultrawork.md              ← Liên tục: workflow chất lượng 5 giai đoạn
│   │   ├── plan.md                   ← Phân tách task PM
│   │   ├── exec-plan.md              ← Quản lý kế hoạch thực thi
│   │   ├── brainstorm.md             ← Khám phá ý tưởng ưu tiên thiết kế
│   │   ├── deepinit.md               ← Khởi tạo dự án
│   │   ├── review.md                 ← Pipeline đánh giá QA
│   │   ├── debug.md                  ← Gỡ lỗi có cấu trúc
│   │   ├── design.md                 ← Workflow thiết kế 7 giai đoạn
│   │   ├── commit.md                 ← Conventional commits
│   │   ├── tools.md                  ← Quản lý công cụ MCP
│   │   └── stack-set.md              ← Cấu hình tech stack
│   │
│   ├── agents/
│   │   ├── backend-engineer.md        ← Định nghĩa subagent: backend
│   │   ├── frontend-engineer.md       ← Định nghĩa subagent: frontend
│   │   ├── mobile-engineer.md         ← Định nghĩa subagent: mobile
│   │   ├── db-engineer.md             ← Định nghĩa subagent: database
│   │   ├── qa-reviewer.md             ← Định nghĩa subagent: QA
│   │   ├── debug-investigator.md      ← Định nghĩa subagent: debug
│   │   └── pm-planner.md             ← Định nghĩa subagent: PM
│   │
│   ├── plan.json                      ← Kết quả kế hoạch đã tạo (điền bởi /plan)
│   ├── state/                         ← File trạng thái workflow đang hoạt động
│   ├── results/                       ← File kết quả agent
│   └── mcp.json                       ← Cấu hình MCP server
│
├── .claude/                           ← Tầng tích hợp IDE
│   ├── settings.json                  ← Đăng ký hook và quyền
│   ├── hooks/
│   │   ├── triggers.json              ← Ánh xạ từ khóa-workflow (11 ngôn ngữ)
│   │   ├── keyword-detector.ts        ← Logic phát hiện tự động
│   │   ├── persistent-mode.ts         ← Áp dụng workflow liên tục
│   │   └── hud.ts                     ← Chỉ báo thanh trạng thái [OMA]
│   ├── skills/                        ← Symlink → .agents/skills/
│   └── agents/                        ← Định nghĩa subagent cho Claude Code
│
└── .serena/                           ← Trạng thái runtime (Serena MCP)
    └── memories/
        ├── orchestrator-session.md    ← Session ID, trạng thái, theo dõi giai đoạn
        ├── task-board.md              ← Phân công task và trạng thái
        ├── progress-{agent}.md        ← Cập nhật tiến trình từng agent
        ├── result-{agent}.md          ← Kết quả cuối từng agent
        └── ...
```

---

## .agents/ — Nguồn dữ liệu duy nhất

Đây là thư mục cốt lõi. Mọi thứ agent cần đều nằm ở đây. Đây là thư mục duy nhất quan trọng cho hành vi agent — tất cả thư mục khác đều bắt nguồn từ nó.

### config/

**`oma-config.yaml`** — File cấu hình trung tâm với:
- `language`: Mã ngôn ngữ phản hồi (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Chuỗi định dạng timestamp (mặc định: `YYYY-MM-DD`)
- `timezone`: Định danh múi giờ (mặc định: `UTC`)
- `default_cli`: Vendor CLI dự phòng (gemini, claude, codex, qwen)
- `agent_cli_mapping`: Ghi đè định tuyến CLI theo agent

### skills/

Nơi chứa chuyên môn agent. Tổng cộng 15 thư mục: 14 agent skill + 1 thư mục tài nguyên dùng chung.

**`_shared/`** — Tài nguyên dùng bởi tất cả agent:
- `core/` — Định tuyến, tải ngữ cảnh, cấu trúc prompt, giao thức làm rõ, ngân sách ngữ cảnh, đánh giá độ khó, template suy luận, nguyên tắc chất lượng, phát hiện vendor, số liệu phiên, checklist chung, bài học kinh nghiệm, template API contract
- `runtime/` — Giao thức bộ nhớ cho subagent CLI, quy trình thực thi đặc thù vendor (claude, gemini, codex, qwen)
- `conditional/` — Đo lường Quality Score, theo dõi Experiment Ledger, giao thức Exploration Loop (chỉ tải khi được kích hoạt)

**`oma-{agent}/`** — Thư mục skill theo agent. Mỗi thư mục chứa:
- `SKILL.md` (~800 byte) — Layer 1: luôn tải. Danh tính, định tuyến, quy tắc cốt lõi.
- `resources/` — Layer 2: theo nhu cầu. Quy trình thực thi, ví dụ, checklist, playbook lỗi, tech stack, snippet, template.

### workflows/

14 file Markdown định nghĩa hành vi lệnh slash.

Workflow liên tục: `orchestrate.md`, `work.md`, `ultrawork.md`.
Không liên tục: `plan.md`, `exec-plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `commit.md`, `tools.md`, `stack-set.md`.

### agents/

7 file định nghĩa subagent dùng khi spawn agent qua Task tool (Claude Code) hoặc CLI.

### plan.json

Được tạo bởi workflow `/plan`. Chứa phân tách task có cấu trúc với phân công agent, ưu tiên, phụ thuộc và tiêu chí chấp nhận. Được dùng bởi `/orchestrate`, `/work` và `/exec-plan`.

### mcp.json

Cấu hình MCP server bao gồm định nghĩa server, cấu hình bộ nhớ và định nghĩa nhóm công cụ.

---

## .claude/ — Tích hợp IDE

Thư mục này kết nối oh-my-agent với Claude Code và các IDE khác.

### hooks/

**`triggers.json`** — Ánh xạ từ khóa-workflow. Định nghĩa workflow, mẫu thông tin, workflow loại trừ và script CJK.

**`keyword-detector.ts`** — Hook TypeScript quét đầu vào người dùng so với từ khóa trigger và đưa ngữ cảnh kích hoạt workflow vào.

**`persistent-mode.ts`** — Kiểm tra file trạng thái đang hoạt động trong `.agents/state/` và tăng cường thực thi workflow liên tục.

**`hud.ts`** — Hiển thị chỉ báo `[OMA]` trên thanh trạng thái.

### skills/

Symlink trỏ đến `.agents/skills/`. Làm cho skill hiển thị với IDE đọc từ `.claude/skills/` trong khi giữ `.agents/` là nguồn dữ liệu duy nhất.

---

## .serena/memories/ — Trạng thái runtime

Nơi agent ghi tiến trình trong phiên điều phối. Thư mục này được dashboard theo dõi cho cập nhật thời gian thực.

| File | Chủ sở hữu | Mục đích |
|------|-------|---------|
| `orchestrator-session.md` | Orchestrator | Metadata phiên: ID, trạng thái, thời gian bắt đầu, giai đoạn hiện tại |
| `task-board.md` | Orchestrator | Phân công task: agent, task, ưu tiên, trạng thái, phụ thuộc |
| `progress-{agent}.md` | Agent đó | Cập nhật từng lượt: hành động, file đọc/sửa, trạng thái hiện tại |
| `result-{agent}.md` | Agent đó | Kết quả cuối: trạng thái hoàn thành, tóm tắt, file thay đổi, tiêu chí chấp nhận |
| `session-metrics.md` | Orchestrator | Sự kiện Clarification Debt, tiến trình Quality Score |

Đường dẫn file bộ nhớ và tên công cụ có thể cấu hình trong `.agents/mcp.json` qua `memoryConfig`.

---

## Cấu trúc source repo oh-my-agent

Nếu bạn đang làm việc trên chính oh-my-agent (không chỉ sử dụng), repository là monorepo:

```
oh-my-agent/
├── cli/                  ← Source công cụ CLI (TypeScript, build bằng bun)
│   ├── src/              ← Mã nguồn
│   ├── package.json
│   └── install.sh        ← Trình cài đặt bootstrap
├── web/                  ← Trang tài liệu (Next.js)
│   └── content/
│       └── en/           ← Trang tài liệu tiếng Anh
├── action/               ← GitHub Action cho cập nhật skill tự động
├── docs/                 ← README dịch và đặc tả
├── .agents/              ← CÓ THỂ CHỈNH SỬA trong source repo (đây LÀ source)
├── .claude/              ← Tích hợp IDE
├── .serena/              ← Trạng thái runtime phát triển
├── CLAUDE.md             ← Hướng dẫn dự án cho Claude Code
└── package.json          ← Config workspace gốc
```

Trong source repo, cho phép sửa đổi `.agents/` (đây là ngoại lệ SSOT cho chính source repo). Quy tắc `.agents/` về không sửa thư mục này áp dụng cho dự án tiêu dùng, không phải repository oh-my-agent.

Lệnh phát triển:
- `bun run test` — Test CLI (vitest)
- `bun run lint` — Lint
- `bun run build` — Build CLI
- Commit phải theo định dạng conventional commit (commitlint bắt buộc)
