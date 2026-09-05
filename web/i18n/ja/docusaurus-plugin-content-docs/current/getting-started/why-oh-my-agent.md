---
title: oh-my-agent を選ぶ理由
description: 飽和した multi-agent CLI カテゴリにおける oh-my-agent のポジショニング。コスト軸は実装からテスト・保守へ移行した。oh-my-agent はその移行に応えるため、quality gate、独立検証、multi-vendor dispatch、repo-native なカスタマイズを備える。
---

# oh-my-agent を選ぶ理由

multi-agent CLI のカテゴリはすでに飽和しています。直近の四半期だけで Metateam、OpenSwarm、DevSquad、Praktor、Salacia、Codelegate、agent-of-empires、TTal、Maggy など、20 を超える multi-agent orchestrator が登場しました。多くは同じ軸――エージェントにコードをより速く書かせること――を最適化しています。

oh-my-agent は別の軸を最適化します。出発点となる仮定は、十分に強力なモデルがあれば SDLC における分析・設計・実装のコストはゼロに収束するということです。ソフトウェア開発で本当に高コストなのは、常にテストと保守でした――最初の commit のあとも、システムが動き続け、安全で、理解可能であり続けること。oh-my-agent はその軸を中心に設計されています。

このページではそのポジショニングを具体化します。このフレーミングの元になった議論は [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589) を参照してください。

---

## コスト軸は移行した

十分に強力な単一のモデルが数分で動く機能を生み出せるようになると、ボトルネックはもはや実装スループットではありません。ボトルネックは、生成されたコードが主張通りに動くかを検証すること、iteration を跨いだ silent regression を捕捉すること、secret を prompt とログの外に保つこと、token 消費が事故になる前に可視化することです。

エージェントを単に高速に spawn するだけの harness はこれらを何ひとつ解決しません。実装後フェーズのために設計された harness は別物です。

---

## oh-my-agent が真のコストセンターに対して提供するもの

以下の各能力は、multi-agent CLI カテゴリで報告されてきた特定の失敗モードに対応します。

### LLM の自己評価ではなく独立検証

`oma verify <agent>` はエージェントタイプ別に 14 の決定論的チェックを実行します。すべてが機械的なチェックです: テストコマンドの exit code、TypeScript strict 通過、raw SQL パターン検出、ハードコード secret スキャン、Flutter analyze、inline style スキャン、エージェントの charter に対する scope 違反。「looks correct」のような LLM 判断は行いません。チェックは、基盤コマンドが成功を報告するときだけ通過します。

これはカテゴリで最も多い苦情に対応します――あるコミュニティ投稿のまとめでは「agents lie - they say tests pass when tests do not」と表現されています。チェック一覧は `cli/commands/verify/verify.ts` を参照してください。

### iteration を跨いだ再検証

`ralph` ワークフローは `ultrawork` を独立した JUDGE フェーズで包みます。各 iteration の後、JUDGE はすべての criterion を再検証します――前 iteration で既に通過したものも含めて。これは C2 の修正が C1 を silent に壊すケースを捕捉します。長いエージェントセッションにおける regression の実際のメカニズムです。

30 秒を超える重い verification は影響を受けたファイルパスでキャッシュされ、再検証コストを抑えます。完全なプロトコルは `.agents/workflows/ralph/resources/judge-protocol.md` を参照してください。

### 損害が発生する前に止める quota cap

すべての `oma agent spawn` 呼び出しは、その spawn の token 推定値を `.serena/memories/session-cost-{sessionId}.md` に記録します。次の spawn 前に `checkCap` が設定された quota cap を照会し、いずれかの次元が超過していれば起動を拒否します。3 つの次元を強制します: 総 token、総 spawn 数、ベンダー別 token 予算。

これは、事後に 4 万ドル使ったと知ることと、spawn 15 回目に予算が残り 1 回と教えてもらうことの違いです。`cli/io/session-cost.ts` を参照し、`.agents/oma-config.yaml` の `session.quota_cap` で設定します。

### 永遠の retry ではなく retry-then-explore

`orchestrate` Step 5 で検証失敗が見つかると、エラーコンテキストとともにエージェントを最大 2 回再試行します。2 回目もなお失敗し、コスト cap が未超過なら、ワークフローは Exploration Loop に切り替わります――2-3 個の代替仮説バリアントを別 workspace で並列に spawn し、最もスコアの高い結果だけを残します。失敗した試みはコストとともに記録されて破棄されます。

これは「ある方針自体が根本的に間違っている」ケースに対する構造化された対応です。同じ方針を retry し続けても収束しませんが、異なる方針を並列に試せば収束します。

### monorepo を理解する workspace ルーティング

`detectWorkspace` は pnpm、nx、turbo、lerna の設定を読み、各エージェントを対応するサブ workspace へ自動でルーティングします。backend エージェントは `apps/api/`、frontend エージェントは `apps/web/` で動作します――orchestrator が手動でパスを組み立てる必要はありません。`cli/io/workspaces.ts` を参照してください。

---

## multi-vendor は選択肢ではない

2 つ目の設計上の仮定は、本気で AI 補助開発を行うチームは複数のプロバイダーを使うということです。今日でいえば Claude、Codex、Gemini、Copilot、Qwen、Kimi、そして来期に登場する何か。vendor 切り替えは edge case ではなく事実です――Anthropic はエージェント機能を別料金プランに移し、OpenAI は Anthropic モデルの劣化と同じ週に Codex CLI を出し、GitHub Copilot は consumption ベースの課金に移行しました。

oh-my-agent は vendor 選択を `.agents/oma-config.yaml` の `model_preset` と `agents.<id>.model` を通じた per-agent 設定として扱います。可搬な `.agents/` ディレクトリが single source of truth で、サポートされる各 runtime はそこから投影されます。oh-my-agent を使うのに vendor lock-in は必要なく、vendor を切り替えても移行は不要です。

---

## repo-native なカスタマイズ

3 つ目の仮定は、どの 2 チームも「done」の定義を共有しないということです。あるチームは backend のすべての変更で OWASP Top 10 スキャンを要求します。別のチームは韓国語の QA レポートを要求します。3 つ目のチームはすべての migration を merge 前に database エージェントが review することを要求します。

`.agents/` はリポジトリ内のただのファイル群なので、各チームは自分たちの行動規範とコンプライアンス姿勢に合わせてエージェント、skill、workflow、quality gate を追加・修正できます。カスタマイズは `git commit` であり、vendor のサポートチケットではありません。

---

## 実務における意味

優先度が「並列エージェントを高速に spawn する」なら、その表面をカバーするツールは数多くあります。優先度が「エージェントが部屋を去ったあとも動き続けるコードを出荷する」なら、oh-my-agent はまさにその目的のために作られています。`oma verify`、JUDGE、Exploration Loop、quota cap、monorepo ルーティングは optional な追加ではなく、このプロジェクトが存在する理由そのものです。

各機能の詳細はサイドバーの Core Concepts セクション (Agents、Parallel Execution) を参照してください。
