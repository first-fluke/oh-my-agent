---
title: プロジェクト構造
description: CLIとWebドキュメントワークスペース分離後の更新されたディレクトリツリー。
---

# プロジェクト構造

このリポジトリの詳細なディレクトリツリー。

```text
.
├── .agents/
│   ├── config/
│   │   └── user-preferences.yaml   # 言語、タイムゾーン、CLIマッピング
│   ├── workflows/
│   │   ├── brainstorm.md
│   │   ├── coordinate.md
│   │   ├── debug.md
│   │   ├── deepinit.md
│   │   ├── exec-plan.md
│   │   ├── orchestrate.md
│   │   ├── plan.md
│   │   ├── review.md
│   │   ├── setup.md
│   │   ├── tools.md
│   │   └── ultrawork.md
│   └── skills/
│       ├── _shared/
│       ├── oma-backend/
│       ├── oma-brainstorm/
│       ├── oma-commit/
│       ├── oma-db/
│       ├── oma-debug/
│       ├── oma-dev-workflow/
│       ├── oma-frontend/
│       ├── oma-mobile/
│       ├── oma-orchestrator/
│       ├── oma-pm/
│       ├── oma-qa/
│       ├── oma-tf-infra/
│       ├── oma-translator/
│       └── oma-coordination/
│       # 各スキルには以下が含まれます:
│       #   SKILL.md              (~40行、トークン最適化)
│       #   resources/
│       #     ├── execution-protocol.md  (chain-of-thoughtステップ)
│       #     ├── examples.md            (few-shot入出力)
│       #     ├── checklist.md           (自己検証)
│       #     ├── error-playbook.md      (障害復旧)
│       #     ├── tech-stack.md          (詳細な技術仕様)
│       #     └── snippets.md            (コピー&ペーストパターン)
├── .serena/
│   └── memories/                   # ランタイム状態 (gitignored)
├── package.json
├── docs/
│   ├── USAGE.md                    # 詳細な使用ガイド（英語）
│   ├── USAGE.ko.md                 # 詳細な使用ガイド（韓国語）
│   ├── project-structure.md        # 完全な構造リファレンス（英語）
│   └── project-structure.ko.md     # 完全な構造リファレンス（韓国語）
├── README.md                       # このファイル（英語）
└── README.ko.md                    # 韓国語ガイド
```
