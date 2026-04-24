---
title: "ガイド：エージェントごとのモデル設定"
description: oma-config.yaml と models.yaml で、エージェントごとに CLI ベンダー・モデル・推論強度を個別指定。agent_cli_mapping、ランタイムプロファイル、oma doctor --profile、models.yaml、セッションクォータ上限を解説。
---

# ガイド：エージェントごとのモデル設定

## 概要

oh-my-agent は `agent_cli_mapping` により **エージェントごとのモデル選択** を導入します。各エージェント（pm、backend、frontend、qa …）が単一のグローバルベンダーを共有するのではなく、個別にベンダー・モデル・推論強度を指定できます。

このページで扱う内容：

1. 3 ファイルの設定階層
2. デュアルフォーマットの `agent_cli_mapping`
3. ランタイムプロファイルのプリセット
4. `oma doctor --profile` コマンド
5. `models.yaml` でのユーザー定義スラグ
6. セッションクォータ上限

---

## 設定ファイルの階層

oh-my-agent は次の 3 ファイルを優先度順（高いものが上）に読み込みます。

| ファイル | 役割 | 編集可否 |
|:--------|:-----|:--------|
| `.agents/oma-config.yaml` | ユーザーオーバーライド — エージェント–CLI マッピング、アクティブプロファイル、セッションクォータ | 可 |
| `.agents/config/models.yaml` | ユーザー提供のモデルスラグ（組み込みレジストリへの追加） | 可 |
| `.agents/config/defaults.yaml` | 組み込み Profile B ベースライン（5 つの `runtime_profiles`、安全なフォールバック） | 不可 — SSOT |

> `defaults.yaml` は SSOT の一部なので直接編集しないでください。カスタマイズはすべて `oma-config.yaml` と `models.yaml` で行います。

---

## デュアルフォーマットの `agent_cli_mapping`

`agent_cli_mapping` は 2 種類の値形式を受け付け、段階的な移行を可能にします。

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # レガシー — ベンダーのみ（既定モデル使用）
  backend:                            # 新しい AgentSpec オブジェクト
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**レガシー文字列形式**: `agent: "vendor"` — そのまま動作し、ランタイムプロファイル経由でベンダーの既定モデル・既定 effort を使用します。

**AgentSpec オブジェクト形式**: `agent: { model, effort }` — 特定のモデルスラグと推論強度（`low`、`medium`、`high`）を固定します。

自由に混在できます。指定のないエージェントはアクティブな `runtime_profile` にフォールバックし、さらに `defaults.yaml` のトップレベル `agent_defaults` にフォールバックします。

---

## ランタイムプロファイル

`defaults.yaml` は Profile B と 5 つの `runtime_profiles` を同梱しています。`oma-config.yaml` で選択してください。

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # 下記オプション参照
```

| プロファイル | 全エージェントのルーティング先 | 使うとき |
|:-----------|:-----------------------------|:---------|
| `claude-only` | Claude Code（Sonnet / Opus） | Anthropic スタックで統一 |
| `codex-only` | OpenAI Codex（GPT-5.x） | ピュア OpenAI スタック |
| `gemini-only` | Gemini CLI | Google 中心のワークフロー |
| `antigravity` | 混合：impl→codex、architecture / qa / pm→claude、retrieval→gemini | ベンダー横断の強み活用 |
| `qwen-only` | Qwen Code | ローカル / セルフホスト推論 |

プロファイルは、エージェント行を個別に編集することなく全体の構成を素早く切り替えるための手段です。

---

## `oma doctor --profile`

`--profile` フラグは、`oma-config.yaml`・`models.yaml`・`defaults.yaml` をマージした **後** の各エージェントのベンダー・モデル・effort をマトリクス表示します。

```bash
oma doctor --profile
```

**サンプル出力:**

```
oh-my-agent — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   oma-config
backend       openai    gpt-5.3-codex               high     oma-config
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview      low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
retrieval     google    gemini-3.1-flash-lite       —        defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

サブエージェントが予期せぬベンダーを選んだときは、まずこのコマンドを実行してください。`Source` 列でどの設定レイヤが勝ったかがわかります。

---

## `models.yaml` へのスラグ追加

`models.yaml` はオプションで、組み込みレジストリにまだ存在しないモデルスラグを登録するために使います（新リリースのモデルに便利です）。

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

登録後は `agent_cli_mapping` でそのスラグを使えます。

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

スラグは識別子です。ベンダーが公開した英字表記をそのまま保ってください。

---

## セッションクォータ上限

`oma-config.yaml` に `session.quota_cap` を追加すると、サブエージェントの暴走を制限できます。

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # セッション全体のトークン上限
    spawn_count: 40          # 並列＋逐次サブエージェントの最大数
    per_vendor:              # ベンダーごとのトークンサブ上限
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

上限に達した場合、オーケストレータはそれ以降のスポーンを拒否し `QUOTA_EXCEEDED` ステータスを返します。項目を未設定にする、あるいは `quota_cap` 自体を省略するとその次元は無効になります。

---

## 組み合わせ例

実戦的な `oma-config.yaml`：

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

`oma doctor --profile` で解決結果を確認したら、通常どおりワークフローを開始します。


## 設定ファイルのオーナーシップ

| ファイル | オーナー | 編集可否 |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | oh-my-agent に同梱された SSOT | 不可 — 読み取り専用として扱う |
| `.agents/oma-config.yaml` | 利用者 | 可 — ここでカスタマイズ |
| `.agents/config/models.yaml` | 利用者 | 可 — 新しいスラグをここに追加 |

`defaults.yaml` には `version:` フィールドが含まれているため、oh-my-agent の新しいリリースは runtime_profiles、新しい Profile B スラグ、または effort マトリクスの調整をここに追加できます。直接編集してしまうと、それらのアップグレードが自動的に反映されなくなります。

## defaults.yaml のアップグレード

新しい oh-my-agent リリースを取得したら `oma install` を実行してください。インストーラーはローカルの `defaults.yaml` のバージョンとバンドルされたものを比較します。

- **一致** → 変更なし、サイレント。
- **不一致** → 警告：
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **不一致 + `--update-defaults`** → バンドルされたバージョンで上書きします：
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

`oma-config.yaml` と `models.yaml` はインストーラーによって変更されることはありません。

## 5.16.0 以前のインストールからのアップグレード

エージェントごとのモデル/effort 機能が導入される前のプロジェクトの場合：

1. プロジェクトルートで `oma install`（または `oma update`）を実行します。インストーラーは新しい `defaults.yaml` を `.agents/config/` に配置し、マイグレーション `003-oma-config` を実行します。このマイグレーションは、既存のレガシー `.agents/config/user-preferences.yaml` を `.agents/oma-config.yaml` へ自動的に移行します。
2. `oma doctor --profile` を実行します。既存の `agent_cli_mapping: { backend: "gemini" }` の値は `runtime_profiles.gemini-only.agent_defaults.backend` を通じて解決されるため、マトリクスには正しいスラグと CLI が自動的に表示されます。
3. （任意）エージェントごとの `model`、`effort`、`thinking`、`memory` のオーバーライドが必要な場合は、`oma-config.yaml` のレガシー文字列エントリを新しい AgentSpec 形式にアップグレードします：
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. `defaults.yaml` をカスタマイズしたことがある場合、`oma install` はバージョンの不一致を上書きするのではなく警告します。カスタマイズ内容を `oma-config.yaml` / `models.yaml` に移してから、`oma install --update-defaults` を実行して新しい SSOT を適用してください。

`agent:spawn` に破壊的変更はありません — レガシー設定はグレースフルフォールバックによって動作し続けるため、自分のペースで移行できます。
