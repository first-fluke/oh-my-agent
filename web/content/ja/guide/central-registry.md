---
title: "ガイド：セントラルレジストリ"
description: セントラルレジストリの詳細ドキュメント — release-pleaseワークフロー、Conventional Commits、コンシューマーテンプレート、.agent-registry.yml形式、GitHub Actionアプローチとの比較。
---

# ガイド：セントラルレジストリ

## 概要

セントラルレジストリモデルは、oh-my-agent GitHubリポジトリ（`first-fluke/oh-my-agent`）をバージョン管理されたアーティファクトソースとして扱います。コンシューマープロジェクトはレジストリから特定バージョンのスキルとワークフローを取得し、チームとプロジェクト間の一貫性を確保します。

エンタープライズグレードのアプローチ：バージョンピニング、監査可能なPRによる更新履歴、チェックサム検証、週次自動更新チェック、更新適用前の手動レビュー。

---

## アーキテクチャ

セントラルレジストリ（first-fluke/oh-my-agent）がrelease-pleaseでリリースを管理し、tarball + SHA256 + manifestを生成。各コンシューマープロジェクトが`.agent-registry.yml`でバージョンをピン留めし、GitHub Actionsワークフローで更新を検出・同期。

---

## メンテナー向け：新バージョンのリリース

### Release-Pleaseワークフロー

1. Conventional Commitsが`main`にランド
2. release-pleaseがリリースPRを作成（バージョンバンプ、CHANGELOG更新）
3. リリースPRマージでGitタグとGitHub Releaseを作成
4. CIが`agent-skills.tar.gz` + SHA256 + `prompt-manifest.json`を生成しリリースに添付

### Conventional Commit例

```bash
git commit -m "feat: add Rust backend language variant"        # Minor
git commit -m "fix: resolve workspace detection for Nx"        # Patch
git commit -m "feat!: rename .agent/ to .agents/ directory"   # Major
```

---

## コンシューマー向け：プロジェクトセットアップ

### .agent-registry.yml

```yaml
registry:
  repo: first-fluke/oh-my-agent

version: "4.7.0"

auto_update:
  enabled: true
  schedule: "0 9 * * 1"  # 毎週月曜9時UTC
  pr:
    auto_merge: false     # 手動レビュー必須
    labels: ["dependencies", "agent-registry"]

sync:
  target_dir: "."
  backup_existing: true
  preserve:
    - ".agent/oma-config.yaml"
    - ".agent/config/local-*"
```

### ワークフローの役割

**check-registry-updates.yml** — 新バージョンを検出し更新PRを作成。cronスケジュールまたは手動実行。

**sync-agent-registry.yml** — バージョン変更時にレジストリファイルをダウンロード・適用。SHA256検証、バックアップ、保護ファイル復元。

---

## セントラルレジストリ vs GitHub Action

| 側面 | セントラルレジストリ | GitHub Action |
|:-------|:----------------|:-------------|
| **セットアップ複雑度** | 高 — 3ファイル | 低 — 1ワークフロー |
| **バージョン管理** | 明示的ピニング | 常に最新に更新 |
| **チェックサム検証** | あり（SHA256） | なし |
| **ロールバック** | バージョン番号変更 | コミットリバート |
| **承認フロー** | PRレビュー必須 | 設定可能 |
| **オフライン対応** | 可（tarball手動ダウンロード） | npm必要 |

---

## 使い分け

### セントラルレジストリを使うべき場合

- 複数プロジェクトを同じバージョンに統一する必要
- 監査可能なチェックサム検証付き更新PRが必要
- セキュリティポリシーで明示的承認が必要
- エアギャップ環境対応が必要

### GitHub Actionを使うべき場合

- 単一または少数の独立プロジェクト
- 最もシンプルなセットアップ（1ファイル）
- 最新バージョンへの自動更新で問題なし
- 設定ファイル保持が自動で欲しい
