---
title: "ガイド：自動更新"
description: oh-my-agent GitHub Actionの完全ドキュメント — セットアップ、全入出力、詳細例、内部動作、セントラルレジストリとの比較。
---

# ガイド：自動更新

## 概要

oh-my-agent GitHub Action（`first-fluke/oh-my-agent/action@v1`）は、CIで`oma update`を実行してプロジェクトのエージェントスキルを自動更新します。PRを作成してレビューするモードと、ブランチに直接コミットするモードをサポート。

---

## クイックセットアップ

`.github/workflows/update-oh-my-agent.yml`として追加：

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜9時UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: first-fluke/oh-my-agent/action@v1
```

---

## 全Action入力

| 入力 | 型 | デフォルト | 説明 |
|:------|:-----|:--------|:-----------|
| `mode` | string | `"pr"` | `"pr"`でPR作成、`"commit"`で直接コミット |
| `base-branch` | string | `"main"` | PRのベースブランチまたはコミット先 |
| `force` | string | `"false"` | `"true"`でカスタム設定を上書き |
| `pr-title` | string | `"chore(deps): update oh-my-agent skills"` | PRタイトル |
| `pr-labels` | string | `"dependencies,automated"` | カンマ区切りラベル |
| `commit-message` | string | `"chore(deps): update oh-my-agent skills"` | コミットメッセージ |
| `token` | string | `${{ github.token }}` | GitHubトークン |

## 全Action出力

| 出力 | 説明 |
|:-------|:-----------|
| `updated` | 変更検出時`"true"` |
| `version` | 更新後のバージョン |
| `pr-number` | PR番号（prモード） |
| `pr-url` | PR URL（prモード） |

---

## 詳細例

### 例1：デフォルトPRモード

```yaml
- uses: first-fluke/oh-my-agent/action@v1
  id: update
- name: Summary
  if: steps.update.outputs.updated == 'true'
  run: echo "Updated to v${{ steps.update.outputs.version }}"
```

### 例2：直接コミット + PAT

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.OH_MY_AGENT_PAT }}
- uses: first-fluke/oh-my-agent/action@v1
  with:
    mode: commit
    token: ${{ secrets.OH_MY_AGENT_PAT }}
    base-branch: develop
```

### 例3：Slack通知付き

```yaml
- uses: first-fluke/oh-my-agent/action@v1
  id: update
- name: Notify Slack
  if: steps.update.outputs.updated == 'true'
  uses: slackapi/slack-github-action@v2
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK }}
    webhook-type: incoming-webhook
    payload: |
      {"text": "oh-my-agent updated to v${{ steps.update.outputs.version }}"}
```

### 例4：強制更新

```yaml
- uses: first-fluke/oh-my-agent/action@v1
  with:
    force: 'true'
    pr-title: "chore(deps): force-update oh-my-agent skills (reset configs)"
```

**注意：** forceモードは`user-preferences.yaml`、`mcp.json`、`stack/`を上書きします。

---

## 内部動作

1. **Bunセットアップ** — `oven-sh/setup-bun@v2`
2. **oh-my-agentインストール** — `bun install -g oh-my-agent`
3. **oma update実行** — `--ci`フラグ（非インタラクティブ）、オプションで`--force`
4. **変更チェック** — `.agents/`と`.claude/`のgit status確認
5. **モードに応じて処理** — PRモード：`peter-evans/create-pull-request@v8`使用。コミットモード：直接コミット・プッシュ。

`oma update --ci`の内部処理：
1. レジストリから`prompt-manifest.json`取得
2. ローカルバージョンと比較
3. 最新tarballダウンロード・展開
4. ユーザーカスタム設定を保持（`--force`除く）
5. ベンダー適応とシンボリックリンクを更新

---

## GitHub Action vs セントラルレジストリ

| 側面 | GitHub Action | セントラルレジストリ |
|:-------|:-------------|:----------------|
| **追加ファイル** | 1ワークフロー | 3ファイル |
| **バージョンピニング** | なし — 常に最新 | あり |
| **チェックサム検証** | なし | あり（SHA256） |
| **設定保持** | 自動 | 手動設定 |
| **直接コミット** | あり | なし |
| **最適な用途** | シンプルプロジェクト | 複数プロジェクト組織 |
