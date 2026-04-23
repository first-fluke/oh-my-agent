---
title: "ガイド：エージェントごとのモデル設定"
description: RARDO v2.1により、エージェントごとにCLIベンダー・モデル・推論強度を個別指定。agent_cli_mapping、ランタイムプロファイル、oma doctor --profile、models.yaml、セッションクォータ上限を解説。
---

# ガイド：エージェントごとのモデル設定

## 概要

RARDO v2.1 は `agent_cli_mapping` により **エージェントごとのモデル選択** を導入します。各エージェント（pm、backend、frontend、qa …）が単一のグローバルベンダーを共有するのではなく、個別にベンダー・モデル・推論強度を指定できます。

このページで扱う内容：

1. 3 ファイルの設定階層
2. デュアルフォーマットの `agent_cli_mapping`
3. ランタイムプロファイルのプリセット
4. `oma doctor --profile` コマンド
5. `models.yaml` でのユーザー定義スラグ
6. セッションクォータ上限

---

## 設定ファイルの階層

RARDO v2.1 は次の 3 ファイルを優先度順（高いものが上）に読み込みます。

| ファイル | 役割 | 編集可否 |
|:--------|:-----|:--------|
| `.agents/config/user-preferences.yaml` | ユーザーオーバーライド — エージェント–CLI マッピング、アクティブプロファイル、セッションクォータ | 可 |
| `.agents/config/models.yaml` | ユーザー提供のモデルスラグ（組み込みレジストリへの追加） | 可 |
| `.agents/config/defaults.yaml` | 組み込み Profile B ベースライン（4 つの `runtime_profiles`、安全なフォールバック） | 不可 — SSOT |

> `defaults.yaml` は SSOT の一部なので直接編集しないでください。カスタマイズはすべて `user-preferences.yaml` と `models.yaml` で行います。

---

## デュアルフォーマットの `agent_cli_mapping`

`agent_cli_mapping` は 2 種類の値形式を受け付け、段階的な移行を可能にします。

```yaml
# .agents/config/user-preferences.yaml
agent_cli_mapping:
  pm: "claude"                        # レガシー — ベンダーのみ（既定モデル使用）
  backend:                            # 新しい AgentSpec オブジェクト
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**レガシー文字列形式**: `agent: "vendor"` — そのまま動作し、ベンダーの既定モデル・既定 effort を使用。

**AgentSpec オブジェクト形式**: `agent: { model, effort }` — 特定のモデルスラグと推論強度（`low`、`medium`、`high`）を固定。

自由に混在できます。指定のないエージェントはアクティブな `runtime_profile` にフォールバック。

---

## ランタイムプロファイル

`defaults.yaml` は Profile B と 4 つの `runtime_profiles` を同梱しています。`user-preferences.yaml` で選択してください。

```yaml
# .agents/config/user-preferences.yaml
active_profile: claude-only   # 下記オプション参照
```

| プロファイル | 全エージェントのルーティング先 | 使うとき |
|:-----------|:-----------------------------|:---------|
| `claude-only` | Claude Code（Sonnet / Opus） | Anthropic スタックで統一 |
| `codex-only` | OpenAI Codex（GPT-5.x） | ピュア OpenAI スタック |
| `gemini-only` | Gemini CLI | Google 中心のワークフロー |
| `antigravity` | 混合：pm→claude、backend→codex、qa→gemini | ベンダー横断の強み活用 |
| `qwen-only` | Qwen CLI | ローカル / セルフホスト推論 |

プロファイルは全エージェントを一行書き換えずに再構成するショートカットです。

---

## `oma doctor --profile`

新しい `--profile` フラグは、3 ファイルをマージした **後** の各エージェントのベンダー・モデル・effort をマトリクス表示します。

```bash
oma doctor --profile
```

**サンプル出力:**

```
RARDO v2.1 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4.7           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3-pro                low      profile:antigravity
architecture  claude    claude-opus-4.7             high     defaults
docs          claude    claude-sonnet-4.7           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

サブエージェントが予期せぬベンダーを選んだときは、まずこのコマンドを実行します。`Source` 列でどの設定レイヤが勝ったかがわかります。

---

## `models.yaml` へのスラグ追加

`models.yaml` はオプションで、組み込みレジストリにまだ無いモデルスラグを登録するために使います（新リリースのモデルに便利）。

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "プレビュー — GPT-5.5 Spud リリース候補"
```

登録後は `agent_cli_mapping` で使えます。

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

スラグは識別子です。ベンダーが公開した英字表記をそのまま保ってください。

---

## セッションクォータ上限

`user-preferences.yaml` に `session.quota_cap` を加えると、サブエージェントの暴走を制限できます。

```yaml
# .agents/config/user-preferences.yaml
session:
  quota_cap:
    tokens: 2_000_000        # セッション全体のトークン上限
    spawn_count: 40          # 並列＋逐次サブエージェントの最大数
    per_vendor:              # ベンダーごとのトークンサブ上限
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

上限到達時、オーケストレータは以降のスポーンを拒否し `QUOTA_EXCEEDED` ステータスを返します。項目を未設定にする、あるいは `quota_cap` 自体を省略するとその次元は無効になります。

---

## 組み合わせ例

実戦的な `user-preferences.yaml`：

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
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


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/config/user-preferences.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-RARDO-v2.1 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
