---
title: 成果物の配置
sidebar_label: 成果物の配置
description: OMA が保守文書、実行レポート、ランタイム状態を置く場所と、古い場所からの移行方法です。
---

# 成果物の配置

OMA は 3 つの場所を使います。保守するプロジェクト文書は `docs/`、人が読む実行レポートは `.agents/results/`、調整と実行の証拠は `.agents/state/` です。以下のパスはプロジェクトルートからの相対パスです。

## 保守する文書

| 場所 | 内容 |
|----------|---------|
| `docs/decisions/` | 方針の提案、トレードオフ、アーキテクチャ決定記録（ADR） |
| `docs/plans/work/` | 作業計画、進捗、決定ログ、技術的負債の追跡 |
| `docs/plans/contracts/` | 採用した API 契約 |
| `DESIGN.md` | UI デザインシステム。タイポグラフィ、色、間隔、モーション、コンポーネント |

決定文書には `Status` フィールドを使い、`draft`、`accepted`、`superseded` を記録します。置き換えられた決定は残し、後継へのリンクを張って、理由を読めるようにします。OMA で `design` が指すのは UI デザインです。技術提案と ADR は `docs/decisions/` を共有します。

`docs/README.md` のようなプロジェクトの文書索引で、保守する文書へリンクします。成果物の移行は既存ファイルを移動します。索引は作らず、文書の状態も変えません。

## 実行レポートとランタイム状態

| 場所 | 内容 |
|----------|---------|
| `.agents/results/result-*.md` | 人が読む、エージェントとワークフローの結果レポート |
| `.agents/results/architecture/` | アーキテクチャの分析と推奨 |
| `.agents/results/bugs/` | バグレポート |
| `.agents/results/refactor/` | リファクタリングの計画とレポート |
| `.agents/results/security/` | セキュリティスキャンのレポート |
| `.agents/results/market/` | 市場調査のブリーフ |
| `.agents/results/recap/` | 作業の振り返り |
| `.agents/results/explain/` | HTML の説明 |
| `.agents/results/api-contracts/` | API 契約の下書き |
| `.agents/results/plan-{sessionId}.json` | 現在のタスクプラン |
| `.agents/state/memories/` | セッションの要約、タスクボード、進捗、教訓、実験の記録 |
| ランタイムの `agent-runs/` | 構造化された受領記録、申告、検証の証拠 |
| ランタイムの `agent-plans/` | 凍結した実行プラン |

レポートのサブディレクトリはドメインごとに分かれます。人が読むレポートは構造化された証拠を補うもので、それだけでは検証済みの完了にはなりません。[結果と再開](../agent-results-and-resume/)を参照してください。

現在の受領記録と凍結したプランは、有効なプロファイルのプロジェクト状態ディレクトリにあります。古いプロジェクトでは `.agents/state/` の下に残っていることがあります。この移行は、それらの保存と検証の結び付きを変えません。

## 保守する文書へ昇格する

実行の成果物がプロジェクトの参照になるときは、対応する保守場所へ移動します。たとえば、採用した契約を `.agents/results/api-contracts/` から `docs/plans/contracts/` へ移すか、アーキテクチャの推奨を `docs/decisions/` の決定記録にします。古い場所にはリンクを残し、文書索引を更新します。

構造化された実行証拠が元のファイルまたはそのハッシュを記録している場合は、そのファイルをそのまま残し、代わりに保守版を作ります。プロジェクトの索引から、保守する文書へリンクします。

install、update、link は、デフォルトで `.agents/results/`、`.agents/state/`、`docs/plans/` を Git から無視します。`docs/decisions/` はそのデフォルトの無視の外です。チームがバージョン管理すべき契約や作業計画を採用するときは、プロジェクトの `.gitignore` を確認してください。

## 既存プロジェクトを移行する

最初に移行をプレビューします。

```bash
oma docs migrate --dry-run
```

構造化された出力には `--json` を追加します。準備ができたら、同じ移行を明示的に適用します。

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` と `oma update` もこの移行を実行します。次の古い場所をまとめます。

<!-- oma-docs:ignore-start -->
| 古い場所 | 移動先 |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` と、著者が付けたダイアグラムのサイドカー | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

決定文書はサブディレクトリの構造を保ちます。古いアーキテクチャ ADR は、著者が付けた `.archify.json` と `.archify.html` のサイドカーと一緒に移動します。実行固有のレビュー、推奨、検証ログは結果ディレクトリに残ります。結果の移行が対象にするのは、2 つのメモリディレクトリにあるトップレベルの `result-*.md` です。他のメモリファイルはそのままです。

移行は既存の移動先ファイルを保持します。別のファイルが同じ名前の場合は、`001-cache--from-plan-designs.md` のようなソースの接尾辞を付け、選んだパスを報告します。その名前も埋まっていれば、安定した内容ハッシュを付けます。移行を再実行しても、複製は作らず、すでに移行したファイルの名前も変えません。

移動した文書、Markdown の調整メモ、`docs/**/*.md`、ルートの `README*.md` と `AGENTS.md` にある、対応する Markdown リンクとパス参照を更新します。移行レポートと Git の diff でその変更を確認してください。構造化されたランタイム証拠と UI の `DESIGN.md` は、参照の書き換えから除外されます。既存の `oma-docs:ignore-start` / `oma-docs:ignore-end` ブロックは、古いパスの例を保持します。

レポートで延期されたファイルを確認してください。構造化された実行証拠が参照する結果レポートは、記録された受領記録とハッシュが有効なままになるよう、元のパスに残ります。受領記録、申告、凍結した実行プラン、その他のランタイム証拠はそのままです。移行は契約の下書きを昇格せず、決定を受け入れず、UI デザインシステムも変えません。
