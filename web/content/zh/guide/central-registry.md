---
title: "指南：中央注册表"
description: 详细的中央注册表文档 —— release-please 工作流、conventional commits、消费者模板、.agent-registry.yml 格式以及与 GitHub Action 方案的比较。
---

# 指南：中央注册表

## 概述

中央注册表模型将 oh-my-agent GitHub 仓库（`first-fluke/oh-my-agent`）作为版本化产物源。消费者项目从该注册表拉取特定版本的技能和工作流，确保团队和项目之间的一致性。

这是面向需要以下功能的组织的企业级方案：
- 跨多个项目的版本锁定。
- 通过 Pull Request 实现可审计的更新轨迹。
- 下载产物前的校验和验证。
- 自动化的每周更新检查。
- 任何更新应用前的手动审查。

---

## 架构

```
┌──────────────────────────────────────────────────────────┐
│                  中央注册表                                │
│              (first-fluke/oh-my-agent)                    │
│                                                          │
│  ┌──────────────┐   ┌────────────────┐   ┌───────────┐  │
│  │ release-      │   │ CHANGELOG.md    │   │ Releases  │  │
│  │ please        │──►│ .release-       │──►│  - tarball│  │
│  │ workflow      │   │  please-        │   │  - sha256 │  │
│  │              │   │  manifest.json  │   │  - manifest│  │
│  └──────────────┘   └────────────────┘   └─────┬─────┘  │
│                                                 │        │
└─────────────────────────────────────────────────┼────────┘
                                                  │
                    ┌─────────────────────────────┼──────────────┐
                    │                             │              │
              ┌─────▼─────┐              ┌───────▼──────┐ ┌─────▼──────┐
              │ 项目 A     │              │ 项目 B       │ │ 项目 C     │
              │            │              │              │ │            │
              │ .agent-    │              │ .agent-      │ │ .agent-    │
              │ registry   │              │ registry     │ │ registry   │
              │ .yml       │              │ .yml         │ │ .yml       │
              │            │              │              │ │            │
              │ check-     │              │ check-       │ │ check-     │
              │ registry   │              │ registry     │ │ registry   │
              │ -updates   │              │ -updates     │ │ -updates   │
              │ .yml       │              │ .yml         │ │ .yml       │
              │            │              │              │ │            │
              │ sync-agent │              │ sync-agent   │ │ sync-agent │
              │ -registry  │              │ -registry    │ │ -registry  │
              │ .yml       │              │ .yml         │ │ .yml       │
              └────────────┘              └──────────────┘ └────────────┘
```

---

## 维护者：发布新版本

### Release-Please 工作流

oh-my-agent 使用 [release-please](https://github.com/googleapis/release-please) 自动化发布。流程如下：

1. **Conventional commits** 合入 `main`。每个提交必须遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

   | 前缀 | 含义 | 版本变更 |
   |:-----|:-----|:---------|
   | `feat:` | 新功能 | 次要版本（1.x.0） |
   | `fix:` | Bug 修复 | 补丁版本（1.0.x） |
   | `feat!:` 或 `BREAKING CHANGE:` | 破坏性变更 | 主要版本（x.0.0） |
   | `chore:` | 维护 | 不升版本（除非配置） |
   | `docs:` | 文档 | 不升版本 |
   | `refactor:` | 代码重构 | 不升版本 |
   | `perf:` | 性能改进 | 补丁版本 |
   | `test:` | 测试变更 | 不升版本 |
   | `build:` | 构建系统 | 不升版本 |
   | `ci:` | CI 配置 | 不升版本 |
   | `style:` | 代码风格 | 不升版本 |
   | `revert:` | 还原之前的提交 | 取决于被还原的提交 |

2. **Release-please 创建发布 PR**：
   - 在 `package.json` 和相关文件中升版本。
   - 用自上次发布以来的所有提交更新 `CHANGELOG.md`。
   - 用新版本更新 `.release-please-manifest.json`。

3. **当发布 PR 合并时**，release-please：
   - 创建 Git 标签（如 `cli-v4.7.0`）。
   - 创建包含变更日志的 GitHub Release。

4. **CI 工作流** 然后：
   - 构建包含 `.agents/` 目录的 `agent-skills.tar.gz` tarball。
   - 生成 SHA256 校验和文件（`agent-skills.tar.gz.sha256`）。
   - 生成包含版本和文件元数据的 `prompt-manifest.json`。
   - 将全部三个产物附加到 GitHub Release。
   - 将 `prompt-manifest.json` 同步到 `main` 分支，供 CLI 更新机制使用。

### 发布产物

每次发布产生三个附加到 GitHub Release 的产物：

| 产物 | 说明 | 用途 |
|:-----|:-----|:-----|
| `agent-skills.tar.gz` | `.agents/` 目录的压缩 tarball | 包含所有技能、工作流、配置、智能体 |
| `agent-skills.tar.gz.sha256` | tarball 的 SHA256 校验和 | 解压前的完整性验证 |
| `prompt-manifest.json` | 包含版本、文件计数和元数据的 JSON | 供 `oma update` 检查新版本使用 |

### Conventional Commit 示例

```bash
# 功能添加（次要版本升级）
git commit -m "feat: add Rust backend language variant"

# Bug 修复（补丁版本升级）
git commit -m "fix: resolve workspace detection for Nx monorepos"

# 破坏性变更（主要版本升级）
git commit -m "feat!: rename .agent/ to .agents/ directory"

# 有范围的提交
git commit -m "feat(backend): add SQLAlchemy async session support"

# 不升版本
git commit -m "chore: update test fixtures"
git commit -m "docs: add central registry guide"
git commit -m "ci: sync prompt-manifest.json [skip ci]"
```

---

## 消费者：设置你的项目

### 模板文件

oh-my-agent 在 `docs/consumer-templates/` 中提供两个模板文件供你复制到项目中：

1. **`.agent-registry.yml`** —— 配置文件，放在项目根目录。
2. **`check-registry-updates.yml`** —— GitHub Actions 工作流，放在 `.github/workflows/`。
3. **`sync-agent-registry.yml`** —— GitHub Actions 工作流，放在 `.github/workflows/`。

### .agent-registry.yml 格式

此文件位于项目根目录，控制你的项目如何与中央注册表交互。

```yaml
# 中央注册表仓库
registry:
  repo: first-fluke/oh-my-agent

# 版本锁定
# 选项：
#   - 特定版本："1.2.0"
#   - 最新："latest"（不建议用于生产）
version: "4.7.0"

# 自动更新设置
auto_update:
  # 启用每周更新检查 PR
  enabled: true

  # 计划（cron 格式）—— 默认：每周一 UTC 9:00
  schedule: "0 9 * * 1"

  # PR 设置
  pr:
    # 自动合并设计上被禁用（需手动审查）
    auto_merge: false

    # PR 标签
    labels:
      - "dependencies"
      - "agent-registry"

    # 审查者（可选）
    # reviewers:
    #   - "username1"
    #   - "username2"

# 同步设置
sync:
  # .agents/ 文件的目标目录
  target_dir: "."

  # 同步前备份现有 .agents/
  backup_existing: true

  # 同步期间保留的文件/目录（glob 模式）
  # 这些不会被注册表覆盖
  preserve:
    - ".agent/oma-config.yaml"
    - ".agent/config/local-*"
```

**关键字段说明：**

- **`version`** —— 锁定到特定版本以确保可复现性。仅实验项目使用 `"latest"`。
- **`auto_update.enabled`** —— 为 true 时，检查工作流按计划运行。
- **`auto_update.schedule`** —— 检查频率的 cron 表达式。默认每周一 UTC 9:00。
- **`auto_update.pr.auto_merge`** —— 设计上始终为 `false`。更新需要手动审查。
- **`sync.preserve`** —— 同步期间不应被覆盖的文件的 glob 模式。通常包括项目的 `oma-config.yaml` 和任何本地配置覆盖。

### 工作流角色

#### check-registry-updates.yml

**用途：** 检查新版本，如果有更新可用则创建 PR。

**触发：** Cron 计划（默认：每周）或手动触发。

**流程：**
1. 从 `.agent-registry.yml` 读取当前版本。
2. 通过 GitHub API 从注册表仓库获取最新发布标签。
3. 比较版本 —— 如果已是最新则退出。
4. 如果有可用更新：
   - 检查该版本的 PR 是否已存在（防止重复）。
   - 创建新分支（`agent-registry-update-{version}`）。
   - 更新 `.agent-registry.yml` 中的版本。
   - 提交并推送。
   - 创建包含变更日志信息和审查说明的 PR。

**应用的标签：** `dependencies`、`agent-registry`。

**所需权限：** `contents: write`、`pull-requests: write`。

#### sync-agent-registry.yml

**用途：** 当版本变更时下载并应用注册表文件。

**触发：** 推送到修改了 `.agent-registry.yml` 的 `main`，或手动触发。

**流程：**
1. 从 `.agent-registry.yml`（或手动输入）读取版本。
2. 下载发布产物：`agent-skills.tar.gz`、校验和和清单。
3. 验证 SHA256 校验和。
4. 备份现有 `.agents/` 目录（带时间戳）。
5. 解压 tarball。
6. 从备份中恢复保留的文件（根据 `sync.preserve` 模式）。
7. 提交同步的文件。
8. 清理超过 7 天的备份目录。

**所需权限：** `contents: write`。

---

## 比较：中央注册表 vs GitHub Action

| 方面 | 中央注册表 | GitHub Action |
|:-----|:----------|:-------------|
| **设置复杂度** | 较高 —— 需配置 3 个文件 | 较低 —— 1 个工作流文件 |
| **版本控制** | 在 `.agent-registry.yml` 中显式锁定 | 始终更新到最新 |
| **更新机制** | 两步：检查 PR 然后同步工作流 | 单步：CI 中运行 oma update |
| **校验和验证** | 是 —— 解压前验证 SHA256 | 否 —— 依赖 npm 注册表 |
| **回滚** | 更改 `.agent-registry.yml` 中的版本 | 还原更新提交 |
| **审计轨迹** | 带标签的版本锁定 PR | 提交历史 |
| **保留文件** | `.agent-registry.yml` 中可配置的 glob 模式 | 内置：`oma-config.yaml`、`mcp.json`、`stack/` |
| **更新来源** | GitHub Release 产物（tarball） | npm 注册表（oh-my-agent 包） |
| **审批流程** | 需要 PR 审查（自动合并禁用） | 可配置（PR 模式或直接提交） |
| **多项目** | 每个项目有自己锁定的版本 | 每个项目独立运行 |
| **离线/隔离网络** | 可行 —— 手动下载 tarball | 需要 npm 访问 |

---

## 何时使用哪个

### 使用中央注册表当：

- 你管理多个需要保持同一版本的项目。
- 你需要可审计、可审查的更新 PR 和校验和验证。
- 你的安全策略要求依赖更新需要显式批准。
- 你想锁定特定版本并按不同计划升级项目。
- 你需要为隔离网络环境下载产物的能力。

### 使用 GitHub Action 当：

- 你有单个项目或几个独立项目。
- 你想要最简单的设置（一个工作流文件）。
- 你接受自动更新到最新版本。
- 你想要内置的配置文件保留，无需手动配置。
- 你偏好直接的 `oma update` 机制而非 tarball 解压。

### 同时使用当：

- 中央注册表管理版本锁定和计划检查。
- GitHub Action 在版本升级被批准后处理实际的 `oma update` 调用。

这是有效的但增加了复杂度。大多数团队选择一种方案。
