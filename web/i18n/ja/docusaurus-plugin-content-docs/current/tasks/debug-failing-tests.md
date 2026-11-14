---
title: 失敗するテストをデバッグする
sidebar_label: 失敗するテストをデバッグする
description: テストの失敗を再現し、原因を切り分け、範囲を限った修正を行い、プロジェクトの既存のテストランナーで回帰を確認します。
---

# 失敗するテストをデバッグする

失敗するコマンド、スタックトレース、または繰り返せる誤った結果があるときに `oma-debug` を使います。

## スキルを読み込む

コーディングエージェントにこのコマンドを実行させ、指示とサポートディレクトリを読ませてください。

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## 入力を渡す

- 失敗したコマンドそのものと、関係する失敗出力の全体。
- 期待する挙動、チェックアウトまたは ref、ランタイムのバージョン、必要なローカルサービス。
- 疑っているファイルまたは最近の変更と、編集してよい範囲。

## タスクを渡す

この具体例は、このリポジトリの plugin-bootstrap 回帰フィクスチャを使います。別のプロジェクトでは、自分の失敗コマンドを使ってください。

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## 結果を確認する

再現した失敗、その因果の経路、範囲を限ったパッチ、その失敗に結び付いた回帰テストを期待します。レポートは、使えない環境と、診断したコードの欠陥を分けて書く必要があります。

回帰が元の挙動では失敗し、修正後は通ることを確認します。同じ環境で示したコマンドを再実行し、関連テストの結果を見ます。再現がまだ止まっている場合は、正確な障害と、使えるより弱い証拠を期待します。

## 依存と次のステップ

エージェントは、プロジェクトのテストランナーと、設定済みのソースナビゲーションツールを使います。この例には、既存の Bun とリポジトリの開発依存が必要です。これらのプラグインフィクスチャは Windows ではスキップされます。自分のプラットフォームが対応する失敗テストを使ってください。スキルを読み込んでも、依存のインストールや、欠けているサービスの修復は行われません。

実際のソース変更とフィクスチャの境界は、[プラグインフックの修復例](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/)を参照してください。管理された実行やプロジェクトフックには、`oma-debug` を含む[ランタイムのセットアップ](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)を選んでください。
