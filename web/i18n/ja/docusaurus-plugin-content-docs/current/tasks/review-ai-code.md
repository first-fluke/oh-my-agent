---
title: マージ前に AI のコードをレビューする
sidebar_label: AI のコードをレビューする
description: 範囲を限った diff と再現できる指摘を使い、AI が書いたコードのバグ、欠けたチェック、回帰をレビューします。
---

# マージ前に AI のコードをレビューする

意図した挙動に照らして変更をレビューするには `oma-qa` を使います。diff と、プロジェクトの既存のチェックから始めます。

## スキルを読み込む

コーディングエージェントにこのコマンドを実行させてから、返された指示とサポートディレクトリを読ませてください。

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## 入力を渡す

- 変更、または `origin/main` のようなローカルの比較 ref。
- 期待する挙動。特に権限、データの変更、失敗時の扱い。
- 既存の lint とテストのコマンド、および環境の制限。

## タスクを渡す

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## 結果を確認する

再現手順または決定的なコードの証拠、提案する修正、実際に実行したコマンドを伴う、順序のある指摘を期待します。欠陥が確認されない場合でも、レポートは確認した範囲と残る隙間を示す必要があります。

引用された各箇所を開き、トリガーがそこに届くことを確認します。証拠に使った狭いチェックを再実行します。ツールがないことや、テストしていない経路は検証の隙間です。レビューの要約だけでは、その変更を出荷してよいことにはなりません。

## 依存と次のステップ

エージェントには、diff、ローカルのソース、プロジェクトの既存のチェックツールへのアクセスが必要です。ブラウザー、セキュリティ、パフォーマンスのチェックには、対応する対象とツールが必要です。スキルを読み込んでも、それらの依存は準備されません。

確認できた失敗は、[失敗するテストのデバッグ](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/)に進んでください。プロジェクトフックやチームのワークフローが必要なら、`oma-qa` を含む[ランタイムのセットアップ](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)を選んでください。
