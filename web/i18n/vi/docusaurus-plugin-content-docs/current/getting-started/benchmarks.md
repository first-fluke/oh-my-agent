---
title: Benchmark
description: Năm harness Claude Code đã xây dựng cùng một MVP nền tảng học tập 3D dành cho trẻ em từ một prompt giống hệt nhau. oh-my-agent xếp hạng nhất với 80.6/100 trên các trục functional, spec, visual, engineering và efficiency.
---

# Benchmark

Năm harness Claude Code đã xây dựng cùng một MVP nền tảng học tập sáng tạo 3D dành cho trẻ em từ một raw prompt giống hệt nhau. **oh-my-agent đứng đầu với 80.6/100** trên rubric 5 trục (functional, spec, visual, engineering, efficiency).

> Điều kiện chạy: `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth qua CLI `claude` đã đăng nhập của người dùng (không dùng `ANTHROPIC_API_KEY`).

---

## Các harness được so sánh

| Harness | Cơ chế |
|---|---|
| `vanilla` | Claude Code thuần, không plugin/skill (baseline) |
| `oma` | `oh-my-agent` được seed từ source (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` qua `--plugin-dir` |
| `ecc` | `everything-claude-code` cài vào `~/.claude/` |
| `superpowers` | `superpowers` qua `--plugin-dir` |

---

## Bảng điểm cuối cùng

| Hạng | Harness | **Tổng** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Hiệu quả vận hành

| Harness | Lượt | Thời lượng | Chi phí | File (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## So sánh landing page

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

So sánh đầy đủ theo từng màn hình (world builder, AI panel, gallery, trạng thái save→reload) có tại [báo cáo benchmark trên GitHub](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Cách tính các trục

| Trục | Trọng số | Tín hiệu chính | Công cụ |
|---|---|---|---|
| **Functional** | 35 | build exit, dev-server khởi động (HTTP 200 ≤45s), 5 kiểm tra hành trình người dùng, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Spec** | 15 | 13 deliverable tường minh từ prompt, bonus real-API | LLM judge với bộ trích xuất JSON cân bằng dấu ngoặc |
| **Visual** | 20 | anti-pattern, UX thân thiện trẻ em, tính nhất quán design-system, accessibility | LLM judge trên screenshot |
| **Engineering** | 20 | độ phủ mã, TS strict, kích thước file tối đa + độ sâu thư mục, marker stub deferred, không hardcode key | phân tích tĩnh (jq + grep + find) |
| **Efficiency** | 10 | số lượt để hoàn thành, thời gian wall-clock, chi phí trên mỗi file | JSON kết quả `claude -p` |

Spec judge và visual judge chạy 3 lần cho mỗi harness qua `judge-multi.sh` và điểm từng mục được lấy trung bình qua các vòng. Phần triển khai nằm tại [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Lưu ý

1. **Ghi đè prompt của superpowers** — cần thiết để harness hoạt động ở chế độ non-interactive (skill brainstorming `<HARD-GATE>` của nó chặn các lần chạy single-shot). Kết quả phản ánh "khả năng của superpowers khi gate đã được vượt qua", không phải so sánh thuần túy ngang hàng.
2. **Trung bình hóa đa judge cho spec + visual, single-run cho journey** — judge journey cần một dev server đang chạy, vì vậy phần này vẫn là single-run. Hãy coi chênh lệch journey dưới khoảng 2 điểm là nhiễu. Cỡ mẫu là 1 lần build cho mỗi harness.
3. **Chuẩn hóa chi phí** — trục efficiency dùng chi phí trên mỗi file; chi phí tuyệt đối ($1.28–$8.19 trên 5 harness) không được phản ánh vào điểm.
4. **Mức phạt `lint-clean` của oma là cố ý** — oma chủ ý để việc thực thi lint/typecheck cho git hooks (husky + lint-staged) và CI thay vì nhúng các quy tắc đặc thù ESLint vào skill của agent. Benchmark single-run phạt điều này -5 ở `lint-clean`, nhưng trong workflow thực tế những vấn đề tương tự sẽ bị chặn bởi pre-push trước khi đến remote.

---

## Tái hiện

```bash
# Chạy cả 5 harness (tuần tự, ~45 phút, ~$15-20 chi phí API)
./benchmarks/run.sh

# Chấm điểm multiaxis cho từng harness (5 trục, 100pt) — single judge round
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Tạo báo cáo
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

Phần tường thuật đầy đủ theo từng harness, điểm thô và screenshot được duy trì tại [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md) — file đó được tạo bởi `build-report.sh` từ `multiaxis/*.json` của mỗi lần chạy, vì vậy nó luôn đồng bộ với artifact chấm điểm mới nhất.
