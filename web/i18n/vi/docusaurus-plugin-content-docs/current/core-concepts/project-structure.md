---
title: Cấu trúc dự án
description: Bản đồ hướng người đọc về một cài đặt oh-my-agent, bao quát SSOT trong .agents/, tài nguyên skill tiêu biểu, workflow, định nghĩa agent được kiểm soát trong repository, runtime state, các lớp tích hợp vendor và bố cục repository mã nguồn.
---

# Cấu trúc dự án

Sau khi cài oh-my-agent, project của bạn có hai cây thư mục cốt lõi: `.agents/` (nguồn sự thật duy nhất, gồm cả kho điều phối `.agents/state/memories/`) và các lớp tích hợp runtime (ví dụ `.claude/`, `.cursor/`, `.codex/`). Nếu chọn Serena làm provider code-intelligence, project cũng có thể có thư mục `.serena/` tùy chọn chứa memory onboarding của Serena. Trang này giải thích các file dùng chung và những đường dẫn tùy chọn hoặc được tạo cần biết khi gỡ lỗi.

---

## Cây thư mục tiêu biểu

Cây dưới đây trình bày chi tiết tài nguyên dùng chung và các skill domain tiêu biểu. Danh mục hiện tại có 33 thư mục skill; các skill bị lược bỏ dùng cùng mẫu `SKILL.md` kèm `resources/`, `variants/` tùy chọn hoặc cấu trúc riêng của skill. Khi một file được tạo hoặc tùy chọn bị thiếu, hãy coi cây `.agents/` đang chạy là nguồn có thẩm quyền.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
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
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## .agents/: Nguồn sự thật

Đây là thư mục cốt lõi. Mọi thứ agent cần đều nằm ở đây. Đây là thư mục duy nhất quyết định hành vi của agent; các thư mục khác đều được suy ra từ nó.

### oma-config.cue và oma-config.yaml

**`oma-config.yaml`**: Tệp cấu hình trung tâm gồm:
- `language`: Mã ngôn ngữ phản hồi (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Chuỗi định dạng timestamp (`ISO`, `US` hoặc `EU`; mặc định `ISO`)
- `timezone`: Định danh múi giờ IANA; giá trị bỏ trống dùng múi giờ hệ thống
- `model_preset`: Key preset model đang hoạt động (`auto` theo mặc định, hoặc preset cố định/tùy chỉnh)
- `providers`: Provider capability cho docs, web, code intelligence và semantic memory
- `auto_update_cli`: Kiểm tra cập nhật chạy nền (mặc định `true`, tắt bằng `false`)
- `telemetry`: Cho phép telemetry vendor (mặc định `false`)
- `mcp.devtools_browsers`: Danh sách browser tùy chọn; bỏ trống để giữ entry hiện có
- `agents`: Override từng agent tùy chọn (object-only `AgentSpec`)
- `models`: Slug model do người dùng định nghĩa tùy chọn
- `custom_presets`: Preset do người dùng định nghĩa, có thể có `extends:`

### skills/

Nơi lưu kiến thức chuyên môn của skill. Có 33 thư mục skill cùng tài nguyên `_shared` trong danh mục hiện tại; preset `all` được suy ra từ cây đang chạy này.

**`_shared/`**: Tài nguyên dùng cho mọi agent:
- `core/`: Định tuyến, tải context, cấu trúc prompt, clarification protocol, context budget, đánh giá độ khó, reasoning template, quality principles, phát hiện vendor, session metrics, common checklist, lessons learned và API contract template
- `runtime/`: Memory protocol, event spec, result contract và execution protocol theo vendor
- `conditional/`: Đo quality score, theo dõi experiment ledger, protocol exploration loop (chỉ tải khi được kích hoạt)

**`oma-{skill}/`**: Thư mục của từng skill. Mỗi thư mục gồm:
- `SKILL.md` (trung vị khoảng 2.631 token trong cây hiện tại): Lớp 1, tải khi skill được định tuyến. Chứa identity, định tuyến và quy tắc cốt lõi.
- `resources/`: Lớp 2, tải theo nhu cầu. Chứa execution protocol, ví dụ, checklist, error playbook, tech stack, snippet và template.
- Một số skill có thư mục con: `variants/` (seed backend/mobile), tham chiếu `stack/` được tạo từ `/stack-set`, `reference/` (oma-design) và script/config riêng của skill.

### workflows/

21 file Markdown định nghĩa hành vi lệnh slash. Mỗi file gồm:
- Frontmatter YAML với `description`
- Phần rule bắt buộc (ngôn ngữ phản hồi, thứ tự bước, yêu cầu MCP tool)
- Hướng dẫn phát hiện vendor
- Protocol thực thi từng bước
- Định nghĩa gate (đối với workflow persistent)

Workflow persistent: `orchestrate.md`, `work.md`, `ultrawork.md` và `ralph.md`.
Workflow không persistent gồm `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md` và `video.md`.

### agents/

12 tệp định nghĩa subagent dùng khi spawn agent qua Task tool (Claude Code) hoặc CLI. Mỗi tệp định nghĩa:
- Frontmatter: `name`, `description`, `skills` (skill cần tải)
- Tham chiếu execution protocol
- Template charter preflight (CHARTER_CHECK)
- Tóm tắt kiến trúc
- Rule theo domain (10 rule)
- Statement: “Never modify `.agents/` files”

### plan-\{sessionId\}.json

Được workflow `/plan` tạo ra. Tệp chứa phân rã task có cấu trúc với phân công agent, ưu tiên, dependency và tiêu chí chấp nhận. `/orchestrate` và `/work` sử dụng tệp này. Tracker dễ đọc cho người dùng nằm tại `docs/plans/work/{NNN}-{name}.md` (vòng đời qua field `Status`). Tham chiếu thiết kế vĩnh viễn nằm cùng cấp trong `docs/plans/designs/{NNN}-{name}.md`.

### state/

Tệp state workflow đang hoạt động dành cho workflow persistent. Các JSON này chỉ tồn tại trong lúc workflow persistent chạy. Xóa chúng, hoặc nói “workflow done”, sẽ tắt workflow.

Thư mục con `state/memories/` là kho memory điều phối chuẩn: state session của orchestrator, task board, tệp progress và result theo agent, session metrics và telemetry chi phí. Đây là đường dẫn dashboard theo dõi và CLI ưu tiên resolve (project cũ fallback về vị trí legacy `.serena/memories/`). Xem [.agents/state/memories/: runtime state](#agentsstatememories-runtime-state) bên dưới.

### results/

Tệp result của agent. Agent hoàn tất tạo tệp với status (completed/failed), summary, danh sách file đã thay đổi và checklist tiêu chí chấp nhận. Orchestrator đọc chúng khi thu thập kết quả, dashboard đọc để theo dõi.

### mcp.json

Cấu hình MCP server gồm:
- Định nghĩa server (Serena, v.v.)
- Cấu hình memory: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (tên tool read/write/edit)
- Định nghĩa nhóm tool để quản lý bằng `/tools`

---

## .claude/: tích hợp IDE

Thư mục này kết nối oh-my-agent với Claude Code và các IDE khác.

### settings.json

Đăng ký hook và permission cho Claude Code. Mỗi entry event hook hiện dùng ABI chuẩn `oma hook run`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

Entry `statusLine` vẫn dùng đường dẫn `bun` trực tiếp (hiển thị hot path, không đi qua `oma hook run`).

### hooks/

Thư mục `hooks/` của vendor **chỉ chứa các file được runtime thực thi hoặc đọc từ thư mục đó**. Chuỗi handler (phát hiện từ khóa, persistent mode, skill injection, …) chạy trong process bên trong binary `oma` qua `oma hook run`; các file handler `.ts` được bundle vào CLI lúc build và KHÔNG được materialize vào thư mục vendor.

**`oma-hook.sh`**: Script wrapper được tạo bởi `oma link`/`oma install`/`oma update`. Mọi event hook của vendor đi qua file này. Thứ tự resolve lúc runtime: `$OMA_BIN` (override rõ ràng) → `command -v oma` (PATH) → thư mục cài đặt quen thuộc như `$HOME/.bun/bin` và `$HOME/.local/share/mise/shims` (agent khởi chạy từ GUI nhận PATH tối thiểu) → `exit 0` (fail-open, không bao giờ block agent). Script không ghi thông tin riêng cho máy nên byte-identical với mọi developer và an toàn để commit. Truyền `"$@"` nguyên vẹn để các arg `--vendor`, `--event` và `--matcher` tới `oma hook run` không đổi. Có preamble self-dedup để ngăn double-fire khi cả cài đặt project và global cùng đăng ký một event.

**`hud.ts`**: Render chỉ báo `[OMA]` trên status bar, hiển thị tên model, mức dùng context (mã màu xanh/vàng/đỏ) và state workflow đang hoạt động. Được đăng ký trực tiếp dưới `statusLine` (không đi qua `oma hook run`) để giữ độ trễ render hot path. Chỉ materialize cho vendor có variant đăng ký `statusLine` hoặc event chỉ dành cho HUD (ví dụ claude, antigravity và qwen). Nó suy ra dialect vendor từ path đã cài, nên bản sao theo vendor có vai trò thực tế.

**`filter-test-output.sh`**: Shell filter cắt bớt output ồn của test runner. Handler test-filter trong process viết lại lệnh test Bash được phát hiện để pipe qua `<hookDir>/filter-test-output.sh`, vì vậy file này được materialize cho mọi vendor có variant đăng ký `test-filter.ts` (tất cả trừ cursor).

#### Logic handler thực sự nằm ở đâu

Nguồn handler là SSOT tại `.agents/hooks/core/` và chạy trong process qua `oma hook run`:

**`keyword-detector.ts`**: Handler thuần (`run(input, ctx): HandlerResult | null`) để phát hiện từ khóa. Logic:
1. Làm sạch input (bỏ code block, chuỗi được trích dẫn, block system-echo được dán vào)
2. Quét input đã làm sạch theo `keywords` trigger (literal) và `patterns` (regex)
3. Kiểm tra pattern thông tin trong cửa sổ 60 ký tự quanh mỗi match
4. Áp dụng guard củng cố (suppress nếu cùng workflow đã trigger từ 2 lần trở lên trong 60 giây)
5. Trả về result `context` chèn `[OMA WORKFLOW: ...]` hoặc `[OMA PERSISTENT MODE: ...]`

**`persistent-mode.ts`**: Handler thuần (`run()`) kiểm tra các state file đang hoạt động trong `.agents/state/` và củng cố việc chạy workflow persistent. Được gọi trong process qua `oma hook run` trên event `Stop`.

**`scm-guard.ts`**: Handler thuần (`run()`) trên `PreToolUse` (tool Bash/shell), từ chối `git add` các file có vẻ chứa secret. Thực thi `forbidden_patterns` trừ `allowed_exceptions` từ `.agents/skills/oma-scm/config/commit-config.yaml` (default nhúng khi thiếu config). Chạy trước `test-filter` trong chain của claude, codex, cursor, grok, kimi, kiro và qwen, cũng như trong bridge opencode (`tool.execute.before` throw để block) và bridge pi (`tool_call` trả về `{ block: true, reason }`); lệnh có tiền tố `OMA_SCM_ALLOW_SECRETS=1` bypass guard sau khi người dùng chấp thuận rõ ràng. Staging rộng (`git add -A` / `git add .`) cố ý không bị block, vì rule đó phụ thuộc vào consent của người dùng mà hook không quan sát được.

**`code-intelligence-guard.ts`**: Handler thuần (`run()`) trên `PreToolUse`, thực thi rule "Code Search" một cách cơ học. Khi `providers.code_intelligence` resolve thành `serena` (hoặc `gortex`) và `providers.code_intelligence_guard` không phải `off`, handler từ chối các tool tìm kiếm native (`Grep`, `Glob` trên Claude Code) và các lệnh shell có binary đứng đầu là tìm kiếm code đệ quy (`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`); lý do từ chối nêu tên tool của provider cần dùng thay thế (`search_for_pattern`, `find_file`, `find_symbol`). `grep` không đệ quy (bộ lọc pipe, file đơn lẻ), `find` không có name predicate và thao tác đọc không bao giờ bị can thiệp. Được đăng ký ngay sau `scm-guard` cho claude, codex, cursor, grok, kimi, kiro và qwen; installer gộp các matcher của chain, nên entry `PreToolUse` của Claude trở thành `Bash|Grep|Glob`. Lệnh shell chứa `OMA_CI_ALLOW_NATIVE=1` vẫn bypass được guard, nhưng chỉ như lối thoát dành cho operator khi tìm kiếm tài nguyên nằm ngoài project hoặc các path bị ignore mà guard không nhận ra. Lý do từ chối không nêu tiền tố này, và đó không phải đường fallback cho source của project.

**`triggers.json`**: Mapping keyword tới workflow, được inline tĩnh vào binary `oma` lúc build (source: `.agents/hooks/core/triggers.json`). Định nghĩa:
- `workflows`: Map tên workflow tới `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`. `keywords` là phrase literal; `patterns` là raw regex string (compile với cờ `iu`). `explicit` (chỉ persistent workflow) liệt kê các keyword được tính là lời gọi rõ ràng — chỉ các keyword này mới kích hoạt persistent mode; mọi match khác được inject dưới dạng gợi ý.
- `informationalPatterns`: Phrase biểu thị câu hỏi (lọc khỏi auto-detection)
- `excludedWorkflows`: Workflow yêu cầu gọi `/command` rõ ràng

Các section ngôn ngữ trong `keywords`, `patterns` và `informationalPatterns` theo quy ước:
- `*`: Universal/English.
- `en`: Về chức năng tương đương `*`.
- `ko`/`ja`/`zh`/etc.: Cách diễn đạt theo ngôn ngữ cụ thể.

Mọi section đều luôn được tải; setting `language` trong `.agents/oma-config.yaml` chỉ điều khiển ngôn ngữ phản hồi. Ranh giới từ phụ thuộc vào chính keyword: keyword ASCII khớp nguyên từ, keyword chứa văn bản không phải ASCII khớp như chuỗi con.

#### Materialize theo vendor: before → after

Các bản cài cũ sao chép **toàn bộ** tập `.agents/hooks/core/` (khoảng 20 file) vào thư mục hook của mỗi vendor, dù dispatch trong process khiến phần lớn trở thành file chết:

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

Bây giờ installer tạo whitelist từ JSON variant của vendor (`requiredVariantScripts` trong `cli/platform/hooks-composer.ts`) và chỉ materialize những gì vendor đó thực thi hoặc đọc:

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| Vendor | File được materialize | Lý do |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter, không có statusLine |
| cursor | `oma-hook.sh` | không có statusLine, không có test-filter |
| commandcode | `oma-hook.sh` | Chỉ Stop, Command Code không có prompt event và PreToolUse không thể viết lại input ([hooks reference](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | không có (project), `hud.ts` + core hook được copy vào `~/.gemini/antigravity-cli/hooks/` | agy chỉ đọc setting từ HOME và workspace hook từ `.agents/hooks.json`, chạy handler trực tiếp từ `.agents/hooks/core/`; `.gemini/antigravity-cli/` trong project không bao giờ được tải (`homeOnly` variant flag) |
| pi | toàn bộ tập `.agents/hooks/core/` dưới `.pi/extensions/oma/` | bridge pi spawn handler như subprocess thay vì dùng setting hook |

Thư mục đích được xóa trước khi copy, vì vậy chạy lại `oma install`/`oma update`/`oma link` trên cài đặt cũ sẽ tự dọn các file stale từ bản sao toàn bộ trước đó.

#### Gỡ lỗi chuỗi handler độc lập

Bạn có thể chạy bất kỳ chuỗi handler nào với payload thật mà không kích hoạt session agent đang chạy:

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` luôn thoát 0 (fail-open). stdout rỗng nghĩa là chain không làm gì cho event đó. JSON theo dialect của vendor (hoặc plain text cho prompt kiro) được ghi ra stdout khi một handler kích hoạt.

#### Migration từ cài đặt pre-019

Các cài đặt hiện có chứa entry cũ `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` sẽ tự migration vào lần tiếp theo chạy `oma install`, `oma update` hoặc `oma link`. Installer dùng thay thế theo marker: chỉ nhóm hook do OMA quản lý (xác định bằng pattern `name`/`command`) bị thay thế; mọi nhóm hook bạn tự thêm được giữ nguyên thứ tự. Đường dẫn `statusLine`/HUD không đổi. Bridge pi trong process không bị ảnh hưởng. Xem `cli/commands/hook/command.ts` để biết router (nội bộ gọi là “design 019”) và `cli/platform/hooks-composer/` để biết logic materialize theo vendor.

### skills/

Symlink trỏ tới `.agents/skills/`. Cách này giúp IDE đọc từ `.claude/skills/` nhìn thấy skill, đồng thời giữ `.agents/` là nguồn sự thật duy nhất.

### agents/

Định nghĩa subagent theo định dạng Agent tool của Claude Code. Chúng tham chiếu tới file skill và bao gồm template CHARTER_CHECK.

---

---

## .agents/state/memories/: trạng thái runtime {#agentsstatememories-runtime-state}

Nơi agent ghi progress trong các session orchestration. Đây là kho memory điều phối chuẩn; CLI resolve nó trước và fallback về đường dẫn legacy `.serena/memories/` cho project tạo trước lần chuyển đổi. File session và task-board chứa session ID; file progress và result chứa agent, task, run và session ID. Dashboard theo dõi thư mục này để cập nhật thời gian thực.

| File | Owner | Mục đích |
|------|-------|---------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Metadata session: ID, status, thời điểm bắt đầu, phase hiện tại |
| `task-board-{sessionId}.md` | Orchestrator | Phân công task: agent, task, priority, status, dependency |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Lần chạy đó | Cập nhật từng lượt: hành động, file đã đọc/thay đổi, status hiện tại |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Lần chạy đó | Output cuối: status hoàn tất, summary, file đã thay đổi, tiêu chí chấp nhận |
| `session-metrics.md` | Orchestrator | Các sửa chữa đáng kể và bằng chứng experiment |
| `experiment-ledger.md` | Orchestrator/QA | Các dòng bằng chứng cho experiment thực sự |
| `session-work.md` | Work workflow | State session theo Work workflow |
| `session-ultrawork.md` | Ultrawork workflow | Theo dõi phase theo Ultrawork |
| `session-cost-{sessionId}.md` | System | Telemetry chi phí spawn theo session |
| `archive/metrics-{date}.md` | System | Metrics session đã lưu trữ (giữ 30 ngày) |

Đường dẫn file memory và tên tool có thể cấu hình trong `.agents/mcp.json` qua `memoryConfig`.

Memory onboarding riêng của Serena (`code_style.md`, `project_purpose.md` và file kiến thức tương tự) vẫn nằm trong `.serena/memories/`, tách biệt với các artifact điều phối này.

---

## Cấu trúc repository mã nguồn oh-my-agent

Nếu đang làm việc trên chính oh-my-agent (không chỉ sử dụng nó), repository là monorepo:

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

Trong source repo, được phép sửa `.agents/` (đây là ngoại lệ SSOT cho chính source repo). Rule `.agents/` cấm sửa thư mục này áp dụng cho project consumer, không áp dụng cho repository oh-my-agent.

Các lệnh phát triển (chạy từ root repository):
- `bun run test`: Test CLI (vitest)
- `bun run lint`: Lint workspace CLI và web
- `bun run build`: Build CLI
- `bun run typecheck`: Type-check CLI và web
- Commit phải theo định dạng conventional commit (commitlint bắt buộc)
