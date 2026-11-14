---
title: 実際の作業に合わせた管理画面を設計する
sidebar_label: 管理画面を設計する
description: プロジェクトのスタックと視覚の契約を保ったまま、管理画面の階層、テーブルの密度、状態、デザインの引き継ぎを決めます。
---

# 実際の作業に合わせた管理画面を設計する

アプリケーションのコードを変える前に、`oma-design` を使って、管理画面が利用者をどう支えるかを決めます。

## スキルを読み込む

コーディングエージェントにこのコマンドを実行させ、返された指示とサポートディレクトリを読ませてください。

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## 入力を渡す

- 動いている画面、スクリーンショット、または関係するコンポーネント。
- 画面を使う人と、完了する必要がある操作。
- 既存の `DESIGN.md`、トークン、コンポーネント、言語、レスポンシブとアクセシビリティの要件。

## タスクを渡す

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## 結果を確認する

画面固有の階層と密度の決定、状態の挙動、セマンティックトークンの対応、実装への引き継ぎを期待します。受け入れたシステムの変更は、プロジェクトの正規の `DESIGN.md` に入ります。

提案をトリアージの作業に照らして確認します。利用者は次のチケットを見分け、フィルターを変え、詳細を開き、エラーから復旧できますか。描画された見本があるときは、キーボードフォーカス、読める韓国語と英語のテキスト、狭い画面の挙動を確認します。文書だけの引き継ぎでは、ブラウザーとアクセシビリティの実行は未検証のままです。

## 依存と次のステップ

新しい管理画面やプロダクトインターフェースの方向では、[ルーティング契約](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md)が Interface Design を選びます。既存 UI の批評、監査、仕上げは Impeccable を選びます。それ以外の Web のアートディレクションは Taste を使います。現在の操作に対して読み込まれる供給元は 1 つです。

それらの外部指示には、独自のダウンロードやランタイムツールが必要なことがあります。既存のスタック、ブランド、CJK の対応、WCAG の目標、reduced-motion の要件は制約のままです。指示を読み込んでも、UI の描画や検証は行われません。

実装には、プロジェクトのフロントエンド担当を使います。プロジェクトフックとワークフローには、`oma-design` を含む[ランタイムのセットアップ](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset)を選んでください。
