---
title: "Hướng dẫn: Central Registry"
description: Tài liệu chi tiết central registry — workflow release-please, conventional commits, template cho consumer, định dạng .agent-registry.yml và so sánh với phương pháp GitHub Action.
---

# Hướng dẫn: Central Registry

## Tổng quan

Mô hình central registry coi repository GitHub oh-my-agent (`first-fluke/oh-my-agent`) như nguồn artifact có phiên bản. Dự án consumer kéo phiên bản cụ thể của skill và workflow từ registry này, đảm bảo nhất quán xuyên đội ngũ và dự án.

Đây là cách tiếp cận enterprise cho tổ chức cần:
- Pin phiên bản xuyên nhiều dự án.
- Theo dõi cập nhật có thể kiểm toán qua pull request.
- Xác minh checksum cho artifact tải về.
- Kiểm tra cập nhật tự động hàng tuần.
- Xem xét thủ công trước khi áp dụng cập nhật.

---

## Kiến trúc

```
┌──────────────────────────────────────────────────────────┐
│                  Central Registry                         │
│              (first-fluke/oh-my-agent)                    │
│                                                          │
│  release-please → CHANGELOG.md → Releases (tarball+sha) │
└───────────────────────────────────────────┬──────────────┘
                                            │
              ┌─────────────────────────────┼──────────────┐
              │                             │              │
        ┌─────▼─────┐              ┌───────▼──────┐ ┌─────▼──────┐
        │ Project A  │              │ Project B    │ │ Project C  │
        │ .agent-    │              │ .agent-      │ │ .agent-    │
        │ registry   │              │ registry     │ │ registry   │
        │ .yml       │              │ .yml         │ │ .yml       │
        └────────────┘              └──────────────┘ └────────────┘
```

---

## Cho maintainer: Phát hành phiên bản mới

oh-my-agent dùng [release-please](https://github.com/googleapis/release-please) để tự động hóa release. Quy trình:

1. **Conventional commit** vào `main` với tiền tố: `feat:` (minor), `fix:` (patch), `feat!:` (major).
2. **Release-please tạo PR release** bump phiên bản và cập nhật CHANGELOG.md.
3. **Khi PR release được merge**, tạo Git tag và GitHub Release.
4. **Workflow CI** build tarball `agent-skills.tar.gz`, tạo file checksum SHA256 và `prompt-manifest.json`.

---

## Cho consumer: Thiết lập dự án

### Định dạng .agent-registry.yml

```yaml
registry:
  repo: first-fluke/oh-my-agent

version: "4.7.0"

auto_update:
  enabled: true
  schedule: "0 9 * * 1"
  pr:
    auto_merge: false
    labels:
      - "dependencies"
      - "agent-registry"

sync:
  target_dir: "."
  backup_existing: true
  preserve:
    - ".agent/oma-config.yaml"
    - ".agent/config/local-*"
```

### Vai trò workflow

- **check-registry-updates.yml**: Kiểm tra phiên bản mới và tạo PR nếu có cập nhật.
- **sync-agent-registry.yml**: Tải và áp dụng file registry khi phiên bản thay đổi, bao gồm xác minh checksum SHA256.

---

## So sánh: Central Registry vs GitHub Action

| Khía cạnh | Central Registry | GitHub Action |
|:-------|:----------------|:-------------|
| **Độ phức tạp thiết lập** | Cao hơn — 3 file cấu hình | Thấp hơn — 1 file workflow |
| **Quản lý phiên bản** | Pin tường minh trong `.agent-registry.yml` | Luôn cập nhật mới nhất |
| **Xác minh checksum** | Có — SHA256 xác minh trước giải nén | Không — dựa vào npm registry |
| **Rollback** | Đổi phiên bản trong `.agent-registry.yml` | Revert commit cập nhật |
| **Phù hợp nhiều dự án** | Mỗi dự án có phiên bản pin riêng | Mỗi dự án chạy độc lập |
| **Nguồn cập nhật** | GitHub Release artifact (tarball) | npm registry (gói oh-my-agent) |

---

## Khi nào dùng cách nào

### Dùng Central Registry khi:
- Quản lý nhiều dự án cần cùng phiên bản.
- Cần PR cập nhật có thể kiểm toán, xem xét với xác minh checksum.
- Cần khả năng tải artifact cho môi trường air-gapped.

### Dùng GitHub Action khi:
- Có một dự án đơn hoặc vài dự án độc lập.
- Muốn thiết lập đơn giản nhất có thể.
- Thoải mái với cập nhật tự động lên phiên bản mới nhất.
