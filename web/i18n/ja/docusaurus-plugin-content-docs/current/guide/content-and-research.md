---
title: "ガイド：コンテンツとリサーチのワークフロー"
sidebar_label: 概要
description: PDF と HWP の抽出、音声、学術リサーチと Web リサーチ、スライド、画像、動画、コード解説、ダイアグラム、市場調査、作業回顧、翻訳、アカデミックライティングに適した oh-my-agent の経路を、その前提条件とともに選びます。
---

# コンテンツとリサーチのワークフロー

このガイドは、文書、音声、リサーチ、メディア、プレゼンテーションの作業を、それを担当する機能へ振り分けます。まず必要なアーティファクトを決め、レビュー可能な結果を作る最小のコマンドまたはスキルの入口を使ってください。専用のガイドがある機能は最後の列からリンクしています。それ以外はこのページで説明します。

| 必要なもの | 入口 | 前提条件 | 最初の結果 | ガイド |
|---|---|---|---|---|
| PDF を抽出する | `oma-pdf` スキル、または下記の `uvx opendataloader-pdf` コマンド | `uv`（`uvx` 用） | Markdown、テキスト、JSON、または短い抽出レポート | [下記](#extract-pdf-content) |
| HWP/HWPX/HWPML を抽出する | `oma-hwp` スキルと `bunx kordoc@latest` | Bun | Markdown または構造化 JSON／チャンク | [下記](#extract-hwp-family-documents) |
| 音声を合成または文字起こしする | `/oma-voice` | `127.0.0.1:17493` で動作する Voicebox アプリ | マニフェスト付きの音声、またはマニフェスト付きの `transcript.md` | [下記](#generate-speech-or-transcribe-audio) |
| 論文を探して検証する | `oma scholar` | なし。任意で `S2_API_KEY`、`OPENALEX_EMAIL` | 検索結果、取得したサイドカー、または lint レポート | [下記](#search-and-validate-scholarly-material) |
| Web を検索する、またはページを取得する | `oma-search` スキル、`oma search` | 任意で Chrome、Python の `curl_cffi`、`yt-dlp`、`gh`（`oma search doctor` で確認） | 標準出力の JSON | [CLI コマンド：search](../cli-interfaces/commands.md#search) |
| プレゼンテーションを作る | `oma-slide` スキルと `oma slide` | Chrome、または `OMA_CHROME_PATH` | 検証済み HTML スライドと任意のエクスポート | [下記](#slides-and-presentations) |
| 画像を生成する | `oma-image` スキル、`oma image generate` | `POLLINATIONS_API_KEY`、`codex login`、サインイン済みの `agy` のいずれか | `.agents/results/images/` 配下の画像と `manifest.json` | [画像生成](./image-generation.md) |
| ショート、解説、デモの動画を作る | `/video`、`oma video` | Node.js 22 以降、FFmpeg、その後 `oma video doctor --install` | `.agents/results/videos/` 配下の実行ディレクトリ。`oma video render` の後は MP4 | [動画生成](./video-generation.md) |
| 変更やトピックを 1 ページで解説する | `/explain`、`oma explain` | 変更モードには git、PR 参照には `gh` | `.agents/results/explain/` 配下の自己完結型 HTML | [コード解説](./code-explainer.md) |
| インタラクティブなアーキテクチャ図 | `/architecture`、`oma diagram` | なし。archify は初回使用時に取得 | Mermaid ブロック。archify を解決できた場合は `.archify.html` も | [ダイアグラムエンジン](./diagram-engine.md) |
| コミュニティの市場調査 | `oma-market` スキル、`oma market` | Python 3.12 以降 | `.agents/results/market/` 配下のブリーフ | [市場調査](./market-research.md) |
| エージェントの会話を要約する | `/recap`、`oma recap` | なし | CLI からは回顧の JSON、`/recap` からは日付付き Markdown 回顧 | [下記](#recap-agent-conversations) |
| ローカライズ文を翻訳またはレビューする | `oma-translation` スキル | なし | 対象言語の文章、または証拠に基づくレビュー | [下記](#translate-or-review-localized-content) |
| アカデミックライティングを下書きまたは監査する | `oma-academic-writing` スキル | なし | 主張と証拠の対応表を含む下書き、改稿、または適合性レポート | [下記](#draft-or-audit-academic-writing) |

このページの `oma` コマンド名は登録済みの公開コマンドです。`uvx`、`bunx`、`bun` は所有するスキルが記載する外部変換ツールです。それ以外の[スキル](../getting-started/glossary.md#skill)は自然言語またはスラッシュコマンドの入口です。独立した `oma pdf`、`oma hwp`、`oma voice`、`oma translation`、`oma academic-writing` コマンドはありません。

## PDF の内容を抽出する {#extract-pdf-content}

入力が PDF で、人、LLM、検索パイプラインが読める構造を必要とする場合は `oma-pdf` スキルを使います。スキルはテキストレイヤーを確認してから、標準、タグ付き、ハイブリッド OCR の抽出方法を選びます。

小さなページ範囲を出力ファイルなしで確認するには、次を実行します。

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

Markdown の抽出と正規化には次を使います。

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

大きな文書では `--pages` で範囲を選びます。テキストレイヤーが読める場合は標準抽出を続けます。タグ付き構造があるものの読み順が悪い場合は `--use-struct-tree` で再試行します。表が壊れる場合は OCR に切り替える前に `--table-method cluster` または `--markdown-with-html` を試してください。

スキャンまたは画像ベースの PDF では、最初にハイブリッドサーバーを起動し、ハイブリッドコンバーターを実行します。

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

2 つ目のターミナルで、出力ディレクトリを定義してコンバーターを実行します。

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

成功したアーティファクトは、選択した出力ディレクトリの Markdown またはテキストファイルです。ページ数と品質に関する注意も添えられます。暗号化された PDF には、ロックを解除したコピーまたはパスワードが必要です。大きなファイルではページ範囲と出力ディレクトリを分け、繰り返しの実行が同じベース名を上書きしないようにします。OCR の推測を原文の事実として扱わず、不確実または欠落した表を報告してください。

## HWP 系文書を抽出する {#extract-hwp-family-documents}

`.hwp`、`.hwpx`、`.hwpml` ファイルには `oma-hwp` を使います。Bun 経由で `kordoc` を実行し、必要に応じて Markdown の表と Private Use Area のグリフを後処理します。

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

新しいクローンでは、ヘルパーが `Cannot find module "turndown"` と表示することがあります。その場合は `oma-hwp` スキルの `resources/` ディレクトリで `bun install` を実行してから、ヘルパーを再実行します。

バッチでは明示的な出力ディレクトリを使います。

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

デフォルトの出力は Markdown です。構造化 AST には `bunx kordoc@latest "<input.hwp>" --format json` を使い、検索向けのチャンクには `--format chunks` を使います。`--dedupe-headers`、`--keep-empty-cols`、`--inline-images` は一般的な表と画像のケースを制御します。別のスキルへ渡す前に、見出し、ネストまたは結合された表、リスト、画像、脚注、リンクを結果で確認してください。

`bun` と `bunx` は前提条件です。出力が空なら、画像だけの内容である可能性があります。その場合は OCR 対応ワークフローへ回します。暗号化または DRM で制限された資料は不完全なままになることがあります。PDF、DOCX、XLSX は対応するスキルに渡します。`kordoc` に別の作成・解析サブコマンドがあっても同じです。

## 音声を生成または文字起こしする {#generate-speech-or-transcribe-audio}

`oma-voice` は MCP ネイティブで、ローカルの Voicebox サーバーを使います。エージェントでスラッシュコマンドを呼び出します。

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS は 1 回あたり最大 5,000 文字で、Voicebox の音声プロファイルが必要です。文字起こしには TTS プロファイルは不要で、最大 30 分の音声に対応します。保存する TTS と STT は `.agents/results/voice/` に書き込みます。文字起こしは `transcript.md` と `manifest.json` を生成します。通知モードでは通常 Voicebox Captures に保存し、ローカルの音声ファイルは書きません。

ローカルの MCP エンドポイントは `http://127.0.0.1:17493/mcp` です。初回セットアップでは Voicebox をエージェントに登録し、Voicebox デスクトップアプリが音声プロファイルを提供します。スキルは `tools/list` で実際の MCP ツール名を見つけ、`voicebox_speak`、`voicebox_transcribe`、`voicebox_list_profiles` を呼び出します。TTS にプロファイルがない場合は、Voicebox で作成または選択します。長すぎるリクエストを分割するかはユーザーが決めることで、スキルは自動分割しません。サーバーが利用できない場合は、ローカルのヘルスエンドポイントを確認して Voicebox を再起動してから再試行します。

## 学術資料を検索して検証する {#search-and-validate-scholarly-material}

Knows のサイドカーと論文メタデータには `oma scholar` CLI を使います。`search` と `resolve` は発見操作、`get` はレコードまたは選択したセクションの取得、`lint` は共有前のゲートです。

```bash
oma scholar search "vision language action" --limit 10
oma scholar search --year-min 2024 "vision language action"
oma scholar resolve "Attention Is All You Need"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar lint paper.knows.yaml
oma scholar lint --lenient paper.knows.yaml
oma scholar lint --fail-on-warning paper.knows.yaml
```

Knows を最初に試し、OpenAlex と Semantic Scholar にフォールバックします。`--section` では `statements`、`evidence`、`relations`、`artifacts`、`citation` を要求できます。ローカル構築中にレコード間の参照が切れていることが予想される場合は `--lenient` を使い、厳格な CI ゲートには `--fail-on-warning` を使います。検索結果または取得したサイドカーは発見の証拠であり、論文がすべての結論を支持するという主張ではありません。エージェントでサイドカーを生成または修正し、共有前に `oma scholar lint` を実行します。

リモートサービスがタイムアウトした場合は、より広いクエリで再試行するか、CLI のフォールバックを許可します。`--always-fallback` を付けると、Knows に結果がある場合でも OpenAlex と Semantic Scholar に問い合わせます。Semantic Scholar の 429 は匿名プールの上限である可能性があるため、後で再試行するか `S2_API_KEY` を設定します。OpenAlex へのリクエストを識別させるには `OPENALEX_EMAIL`（任意で `OPENALEX_API_KEY` も）を設定します。サイドカーで `provenance` の enum エラーが出た場合は `tool`、`person`、`org` のいずれかを使います。`relation-density` の警告が残る場合は、ソースが支持する場所にだけ対応する証拠関係を追加します。

## スライドとプレゼンテーション {#slides-and-presentations}

固定ステージのプレゼンテーションには `oma-slide` を使います。作成スキルは 1920×1080 の HTML フラグメントを書き込み、CLI がジオメトリを検証してデッキをバンドルし、エクスポートします。

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

検証後にだけエクスポートします。

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

1 枚だけ確認するには `--slide <file>` を使い、別のプロセスが結果を必要とする JSON 出力には `--report-file <path>` を使います。`slide import pptx <file>` はインポートワークフローを開始し、`slide asset fetch-video <url>` は動画アセットをダウンロードします。`slide style list|preview|get <slug>` はスタイルを確認します。PPTX 出力はラスターベースなので、編集可能なテキストや図形レイヤーはありません。検証とエクスポートには Chrome／puppeteer が必要です。実行ファイルを検出できない場合は `OMA_CHROME_PATH` を設定します。3 回の自動修正で検証が収束しない場合は、表示されたジオメトリの問題を使って該当フラグメントを編集します。

## エージェントの会話を回顧する {#recap-agent-conversations}

証拠に基づく作業サマリーには `/recap` を使います（またはエージェントに回顧を依頼します）。履歴の収集には `oma recap` が実行されます。カレンダー日とローリング期間は別の入力です。

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

これらのコマンドは収集した履歴を出力します（デフォルトはターミナルのテキスト、`--json` で JSON、`--mermaid` で Mermaid のガントチャート）。`--graph` は代わりにブラウザーでインタラクティブなグラフを開きます。CLI 自体はファイルを書き込みません。`/recap` は Markdown の回顧を `.agents/results/recap/` に保存します。通常、日次回顧なら `{date}.md`、期間なら `{start-date}~{end-date}.md` です。回顧は作業内容でグループ化し、依頼済み・進行中の作業を完了済みと区別し、ツール履歴の不足を記録します。より狭いレポートが必要なら `--top` または `--sort` を使います。CLI が使えない場合は、スキルが記載された Claude 履歴のフォールバックを使えますが、ソースのカバレッジが減ることを報告してください。

`oma retro` は git ベースのエンジニアリング回顧に使います。会話回顧とは別の問いに答え、`--compare` で隣接する期間を比較できます。

## ローカライズ文を翻訳またはレビューする {#translate-or-review-localized-content}

UI 文字列、ドキュメント、レポート、マーケティング文、アカデミックライティングには `oma-translation` を使います。自然言語または `/oma-translation` スキルの入口で呼び出します。公開された `oma translation` コマンドはありません。

ソース、対象ロケール、コンテンツ種別、翻訳・レビュー・ソース差分同期のどれかをスキルに渡します。利用できる言語プロファイルから 1 つを読み込み、プレースホルダー、リンク、Markdown 構造、保護構文を保持します。プロジェクトの同じディレクトリの翻訳と用語集にも従います。長い文書やレビューには翻訳ルーブリックを適用します。対象プロファイルがない場合は共有ルールを使い、その制限を 1 回報告します。

ドキュメントでは、アンカーとコマンド例が確定した英語ページを翻訳します。CLI 名、フラグ、パス、環境変数、コードブロックは正確に保ち、周囲の説明を翻訳して、対象ページの構造を英語と比較します。ソースの意味が曖昧なら、勝手に推測せずフラグを立ててください。

## アカデミックライティングを下書きまたは監査する {#draft-or-audit-academic-writing}

英語のエッセイ、レポート、文献レビュー、分析、エグゼクティブサマリー、結論、改稿には `oma-academic-writing` を使います。モードを 1 つ選び、ルーブリックまたはソースの制約を指定します。

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` は文章、執筆ノート、主張と証拠の対応表を返します。`revise` は原文と改稿ブロックに加えて具体的な変更を返します。`review` は文構造、動詞、ヘッジ、具体性、アンチ AI パターン、段落の明瞭さ、リズム、主張と証拠の整合について PASS／FAIL の所見を返します。スキルは改稿またはレビューで既存の下書きを全文読み、根拠のない主張を弱めるか削除し、英語以外の出力は英語の工程後に `oma-translation` へ渡します。

下書き前のソース発見とサイドカーの証拠には `oma scholar` を使います。引用またはルーブリックがない場合は主張を保留と記録するか、不足する制約を尋ねてください。空白を架空のソースで埋めてはいけません。役に立つ完了アーティファクトは、一般的に「洗練」しただけで追跡できない文章ではなく、証拠マップまたは監査レポートを伴う文章です。

## 復旧チェックリスト

| 症状 | 次の操作 |
|---|---|
| 出力が空、または構造が壊れている | 入力種別を確認し、PDF ではタグ付き、表、OCR のモードを選びます。HWP では Bun を確認し、画像だけのページがないかソースを調べます。 |
| ローカルスキルが接続できない | 内容の依頼を変える前に、所有するローカルサービスまたは CLI（`Voicebox`、`Chrome`、`uvx`、`bunx`）を確認します。 |
| リサーチ結果が薄い | クエリを広げ、フォールバック／ソースの状態を確認し、不確実性をレポートに残します。 |
| スライドのエクスポートが失敗する | `oma slide validate --workspace <dir> --output json` を実行し、ジオメトリまたはフォントの所見を修正してからエクスポートします。 |
| 回顧が完了を過大評価する | 実行記録とアーティファクトを再確認します。プロンプトやツール呼び出しだけでは完了の証拠になりません。 |
| 翻訳でコード構文が変わった | 保護された名前を復元し、構造チェックを再実行してから文章をレビューします。 |
| アカデミック文章に根拠のない主張がある | 主張を削除またはヘッジし、scholar の経路で証拠を加えて主張と証拠の対応表を再実行します。 |

## 次のステップ

- [画像生成](./image-generation.md)、[動画生成](./video-generation.md)、[コード解説](./code-explainer.md)、[ダイアグラムエンジン](./diagram-engine.md)、[市場調査](./market-research.md) — 上の表にある機能のガイド
- [CLI コマンド](../cli-interfaces/commands.md)と [CLI オプション](../cli-interfaces/options.md) — 登録済み CLI の完全なパスとオプションの別名
- [設定リファレンス](./configuration-reference.md) — `pdf`、`hwp`、`voice`、`scholar` の設定セクション
