---
title: コマンド
description: cli/cli.ts の完全なコマンド一覧。
---

# コマンド

以下のコマンド一覧は、`cli/cli.ts` の現在の実装を反映しています。

## コアコマンド

```bash
oma                         # インタラクティブインストーラー
oma dashboard               # ターミナルダッシュボード
oma dashboard:web           # Web ダッシュボード (:9847)
oma usage:anti              # Antigravity 使用量クォータ
oma update                  # レジストリからスキルを更新
oma doctor                  # 環境/スキル診断
oma stats                   # 生産性メトリクス
oma retro                   # 振り返りレポート
oma cleanup                 # 孤立リソースのクリーンアップ
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## エージェントコマンド

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## メモリと検証

```bash
oma memory:init
oma verify <agent-type>
```
