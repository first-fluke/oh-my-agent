---
title: エージェント
description: エージェントの種類、ワークスペース戦略、オーケストレーションフロー。
---

# エージェント

## エージェントカテゴリ

- アイデア創出: Brainstorm
- 企画: PM agent
- 実装: Frontend, Backend, Mobile, DB
- インフラ: TF-infra agent
- DevOps: Dev-workflow
- 検証: QA, Debug
- ローカライゼーション: Translator
- 調整: oma-coordination, oma-orchestrator

## ワークスペース戦略

ワークスペースを分離することでマージコンフリクトを削減します:

```text
./apps/api      -> backend
./apps/web      -> frontend
./apps/mobile   -> mobile
```

## エージェントマネージャーフロー

1. PM がタスク分解を定義
2. ドメインエージェントが並列に実行
3. 進捗が Serena メモリにストリーミング
4. QA がシステムレベルの整合性を検証

## Serena ランタイムファイル

- `orchestrator-session.md`
- `task-board.md`
- `progress-{agent}.md`
- `result-{agent}.md`
