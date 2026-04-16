---
title: "Hướng dẫn: Cập nhật tự động"
description: Tài liệu đầy đủ về GitHub Action cho oh-my-agent — thiết lập, tất cả input và output, ví dụ chi tiết, hoạt động bên trong và so sánh với central registry.
---

# Hướng dẫn: Cập nhật tự động

## Tổng quan

GitHub Action oh-my-agent (`first-fluke/oma-update-action@v1`) tự động cập nhật skill agent của dự án bằng cách chạy `oma update` trong CI. Nó hỗ trợ hai chế độ: tạo pull request để xem xét, hoặc commit trực tiếp vào nhánh.

---

## Thiết lập nhanh

Thêm file này vào dự án tại `.github/workflows/update-oh-my-agent.yml`:

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'  # Mỗi thứ Hai lúc 9 giờ sáng UTC
  workflow_dispatch:        # Cho phép trigger thủ công

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
```

Đây là cấu hình tối thiểu. Nó tạo PR với cài đặt mặc định khi có phiên bản mới.

---

## Tất cả input Action

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|:------|:-----|:---------|:--------|:-----------|
| `mode` | string | Không | `"pr"` | Cách áp dụng thay đổi. `"pr"` tạo pull request. `"commit"` push trực tiếp vào nhánh base. |
| `base-branch` | string | Không | `"main"` | Nhánh base cho PR (chế độ `pr`) hoặc nhánh đích cho commit trực tiếp (chế độ `commit`). |
| `force` | string | Không | `"false"` | Truyền `--force` cho `oma update`. Khi `"true"`, ghi đè file config tùy chỉnh. |
| `pr-title` | string | Không | `"chore(deps): update oh-my-agent skills"` | Tiêu đề tùy chỉnh cho PR. Chỉ dùng ở chế độ `pr`. |
| `pr-labels` | string | Không | `"dependencies,automated"` | Label phân cách bằng dấu phẩy cho PR. Chỉ dùng ở chế độ `pr`. |
| `commit-message` | string | Không | `"chore(deps): update oh-my-agent skills"` | Thông điệp commit tùy chỉnh. Dùng ở cả hai chế độ. |
| `token` | string | Không | `${{ github.token }}` | Token GitHub cho tạo PR. Dùng Personal Access Token (PAT) nếu cần PR trigger workflow khác. |

---

## Tất cả output Action

| Output | Kiểu | Mô tả | Có sẵn |
|:-------|:-----|:-----------|:----------|
| `updated` | string | `"true"` nếu phát hiện thay đổi sau `oma update`. `"false"` nếu đã cập nhật. | Luôn |
| `version` | string | Phiên bản oh-my-agent sau cập nhật. | Khi `updated` là `"true"` |
| `pr-number` | string | Số pull request. | Chỉ chế độ `pr` khi PR được tạo |
| `pr-url` | string | URL đầy đủ của PR đã tạo. | Chỉ chế độ `pr` khi PR được tạo |

---

## So sánh với Central Registry

| Khía cạnh | GitHub Action | Central Registry |
|:-------|:-------------|:----------------|
| **File cần thêm** | 1 file workflow | 3 file (.agent-registry.yml + 2 workflow) |
| **Nguồn cập nhật** | npm registry | GitHub Release artifact |
| **Pin phiên bản** | Không — luôn mới nhất | Có — tường minh trong .agent-registry.yml |
| **Xác minh checksum** | Không | Có — SHA256 |
| **Bảo toàn config** | Tự động (oma-config.yaml, mcp.json, stack/) | Thủ công (cấu hình mẫu preserve) |
| **Tạo PR** | Tích hợp sẵn | Tích hợp sẵn |
| **Phù hợp nhất** | Dự án đơn giản, đội đơn | Tổ chức nhiều dự án, nhu cầu compliance |

Với hầu hết đội ngũ, GitHub Action là đủ. Dùng central registry khi cần pin phiên bản, xác minh checksum, hoặc cập nhật phối hợp xuyên nhiều dự án.
