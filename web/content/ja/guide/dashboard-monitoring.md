---
title: "ガイド：ダッシュボード監視"
description: ターミナルとWebダッシュボードの包括的ガイド — データソース、3ターミナルレイアウト、トラブルシューティング、技術実装の詳細。
---

# ガイド：ダッシュボード監視

## 2つのダッシュボードコマンド

| コマンド | インターフェース | URL | 技術 |
|:--------|:---------|:----|:-----------|
| `oma dashboard` | ターミナル（TUI） | N/A | chokidarファイルウォッチャー、picocolorsレンダリング |
| `oma dashboard:web` | ブラウザ | `http://localhost:9847` | HTTPサーバー、WebSocket、chokidar |

両ダッシュボードとも同じデータソースを監視：`.serena/memories/`ディレクトリ。

### ターミナルダッシュボード

```bash
oma dashboard
```

ターミナル内にボックス描画UIをレンダリング。メモリファイル変更で自動更新。`Ctrl+C`で終了。

**ステータスシンボル：** `●`（緑）= running、`✓`（シアン）= completed、`✗`（赤）= failed、`○`（黄）= blocked、`◌`（暗）= pending

### Webダッシュボード

```bash
oma dashboard:web
# カスタムポート
DASHBOARD_PORT=8080 oma dashboard:web
# カスタムメモリディレクトリ
MEMORIES_DIR=/path/to/.serena/memories oma dashboard:web
```

ダークテーマUI、接続ステータスバッジ、自動再接続、アニメーションステータスドット。

---

## 推奨3ターミナルレイアウト

**ターミナル1：** メインエージェントセッション（Gemini CLI、Claude Codeなどで`/orchestrate`実行）

**ターミナル2：** `oma dashboard`でパッシブモニタリング

**ターミナル3：** エージェントステータス確認、検証実行、統計表示などのアドホックコマンド

---

## .serena/memories/のデータソース

| ファイルパターン | 作成元 | 内容 |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Step 2 | セッションID、開始時刻、ステータス |
| `session-{workflow}.md` | `/coordinate`、`/ultrawork` | セッションメタデータ、フェーズ進捗 |
| `task-board.md` | オーケストレーションワークフロー | エージェント割り当て、ステータス、タスク |
| `progress-{agent}.md` | スポーンされた各エージェント | ターン番号、作業中の内容、中間結果 |
| `result-{agent}.md` | 完了した各エージェント | 最終ステータス、変更ファイル、成果物 |
| `experiment-ledger.md` | Quality Scoreシステム | ベースラインスコア、デルタ、Keep/Discard判定 |

### ダッシュボードの読み取り方法

1. **セッション検出** — `orchestrator-session.md`を最初にチェック、なければ最新の`session-*.md`
2. **タスクボードパース** — Markdownテーブルとして読み取り
3. **エージェント発見** — タスクボードがなければファイル名パターンからエージェントをスキャン
4. **ターンカウント** — `progress-{agent}.md`から`turn: N`を抽出
5. **アクティビティフィード** — 最新更新の5ファイルから最終有意行を抽出

---

## トラブルシューティング

### エージェントが「running」だがターン進捗なし

原因：長時間操作中、クラッシュしたがPIDファイル残存、ユーザー入力待ち。
対処：ログ確認、`oma agent:status`でプロセス生存確認、再スポーン。

### エージェントが「crashed」

原因：CLIプロセス異常終了（メモリ不足、APIクォータ超過）、ワークスペース削除、CLIの未インストール/未認証。
対処：ログ確認、`oma doctor`、`oma auth:status`、再スポーン。

### 「エージェント未検出」

原因：ワークフローがスポーンステップに未到達、`.serena/memories/`が空、監視ディレクトリが不正。
対処：メモリディレクトリ確認、ワークフローフェーズ確認、`MEMORIES_DIR`指定。

### Webダッシュボードが「Disconnected」

原因：プロセス終了、ネットワーク問題、ポート使用中。
対処：プロセス確認、別ポート試行、自動再接続を待つ（指数バックオフ1s〜10s）。

---

## マージ前モニタリングチェックリスト

- [ ] すべてのエージェントが「completed」
- [ ] 「failed」エージェントなし
- [ ] QAエージェントのレビュー完了
- [ ] CRITICAL/HIGHの指摘なし
- [ ] セッションステータスがCOMPLETED
- [ ] アクティビティフィードに最終レポート

---

## 技術詳細

### ターミナルダッシュボード

- chokidar（`awaitWriteFinish`：200ms安定化、50msポーリング）
- `picocolors`でANSIカラー、Unicodeボックス描画文字
- `MEMORIES_DIR`環境変数またはCLI引数でメモリディレクトリ指定
- `SIGINT`/`SIGTERM`でグレースフルシャットダウン

### Webダッシュボード

- Node.js `createServer`でHTMLを`/`に、JSONステートを`/api/state`に提供
- `ws`ライブラリでWebSocket。接続時にフルステートを即時送信、以降は差分プッシュ
- 100msデバウンスで高速ファイル書き込みのフラッディングを防止
- 自動再接続：指数バックオフ（初期1s、1.5倍、最大10s）
- デフォルトポート9847、`DASHBOARD_PORT`で変更可能
