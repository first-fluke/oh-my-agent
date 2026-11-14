---
title: ベンダーの機能とパッケージ
sidebar_label: ベンダーの機能とパッケージ
description: OMA の各ベンダーにおけるスキルの発見、エージェント定義、フック、パッケージ形式です。
---

# ベンダーの機能とパッケージ

`cli/constants/vendor-capabilities.ts` は、対応する各ホストのスキル発見、エージェントディレクトリ、フックブリッジ、パッケージマニフェストを記録します。ベンダーキーは `ALL_CLI_VENDORS` と一致します。スキルの投影パスは `CLI_SKILLS_DIR` から取るため、プロジェクトインストールとグローバルインストールは既存の配置先を保ちます。

| ホスト | ベンダーリンクなしの共有スキル | エージェントディレクトリ | フックブリッジ | パッケージマニフェスト |
| --- | --- | --- | --- | --- |
| Antigravity CLI | いいえ | なし | 設定 | `antigravity-plugin/plugin.json` |
| Claude Code | いいえ | `.claude/agents` | 設定 | `.claude-plugin/plugin.json` |
| Codex | いいえ | `.codex/agents` | 設定 | `plugin.json` |
| Command Code | いいえ | `.commandcode/agents` | 設定 | `commandcode-mod/package.json` |
| Copilot CLI | いいえ | `.github/agents` | 設定 | `plugin.json`（Agent Plugins パッケージ） |
| Cursor | いいえ | `.cursor/agents` | 設定 | `.cursor-plugin/plugin.json` |
| Grok | なし | `.grok/agents` | 設定 | `.grok-plugin/plugin.json` |
| Hermes | いいえ | なし | なし | `plugin.json`（Agent Plugins パッケージ） |
| Kilo Code | はい | `.kilo/agents` | 拡張 | `opencode-package/package.json` |
| Kimi | いいえ | なし | 設定 | `.kimi-plugin/plugin.json` |
| Kiro | いいえ | `.kiro/agents` | 設定 | `plugin.json`（Agent Plugins パッケージ） |
| OpenCode | いいえ | `.opencode/agents` | 拡張 | `opencode-package/package.json` |
| Pi | はい | なし | 拡張 | `pi-package/package.json` |
| Qwen Code | はい | `.qwen/agents` | 設定 | `plugin.json`（Agent Plugins パッケージ） |
| ZCode | なし | なし | なし | `.zcode-plugin/plugin.json` |

「ベンダーリンクなし」は、両方のインストールモードで共有の発見を使えるという意味です。Kimi のプロジェクトスキャンだけでは、既存のグローバルなスキル投影を置き換えません。フックブリッジやエージェントディレクトリがあっても、サブプロセスのランタイムアダプターがあることにはなりません。Gemini は OMA のベンダーではありません。Antigravity CLI には独自の統合があります。

## Agent Plugins パッケージ {#agent-plugins-package}

リポジトリルートは [Agent Plugins 1.0](https://agent-plugins.org/) のパッケージです。`oma emit` が `.agents/` の SSOT から再生成します。

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Git とマーケットプレイスのインストールは依存なしでリポジトリをクローンするため、ルートがパッケージです。ローカルパス、または `owner/repo:path` のインストールは、指したディレクトリをコピーします。リポジトリルートにはソースツリー、`node_modules`、Web サイトも入っています。それらには、`oma emit --target agent-plugin` が `codex-plugin/` に書くきれいなコピーを使ってください（このリポジトリでは `bun cli/cli.ts emit --target agent-plugin`）。または [GitHub リリース](https://github.com/first-fluke/oh-my-agent/releases)の `oma-agent-plugin.tar.gz` を展開します。`codex-plugin/` は生成物で、git の無視対象であり、コミットされません。どのホストもそのツリーを丸ごとインストールするため、スキルは共有ガイドの `skills/_shared/` を 1 つ参照します。ルートの `skills/` だけが各スキルに同梱します。`bunx skills use first-fluke/oh-my-agent@<skill>` がその中からスキルディレクトリを 1 つコピーするからです。

マニフェストのキーワード（`oma`、`oh-my-agent`、`multi-agent`、`orchestrator`、`orchestrate`、`workflow`、`workflows`、`skills`、`agents`）は、Kiro の起動語彙でもあります。マニフェストはコンポーネントパスを宣言しません。仕様がそれを禁じています。各ホストは決まった場所を読みます。`plugin.json` の横にネイティブなマニフェストが必要なホストはありません。Copilot は `.claude-plugin/plugin.json` より先にルートの Agent Plugins マニフェストを読みます。Qwen Code は `qwen-extension.json` を生成せず、Agent Plugins アダプター経由でパッケージを読み込みます。

| ホスト | 読み込むもの | インストール |
| --- | --- | --- |
| GitHub Copilot CLI | スキル、MCP サーバー、および `com.github.copilot/` からの 12 個のカスタムエージェント、20 個のワークフローのスラッシュコマンド、6 個のファイル範囲ルール、4 個のライフサイクルフック | `copilot plugin install first-fluke/oh-my-agent`（ルートパッケージをクローン）、生成コピーへの `copilot plugin install /absolute/path/to/codex-plugin`、または `copilot plugin marketplace add first-fluke/oh-my-agent` の後に `copilot plugin install oma@oh-my-agent` |
| Kiro CLI（Powers） | スキルと MCP サーバー（インストール時にサーバー名は名前空間化される）。マニフェストのキーワードで起動する | 生成コピーへの `kiro-cli powers install /absolute/path/to/codex-plugin`（CLI 2.25 以降）、またはリポジトリ URL での **Add Custom Power → Import power from GitHub** |
| Qwen Code | `oma` 拡張としてのスキルと MCP サーバー | 生成コピーへの `qwen extensions install /absolute/path/to/codex-plugin --consent` または `qwen extensions link /absolute/path/to/codex-plugin`（Agent Plugins の起点）。素のリポジトリ URL は Qwen の対話式プラグイン選択を開きます。ルートに Claude マーケットプレイスも入っているためです。`qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` は、そのマーケットプレイスの `oma` エントリを非対話で選びます（Qwen のドキュメントでは、その後 Claude マニフェストから変換されます）。 |
| Hermes Agent | `oma:<skill>` としてのスキルと、stdio / Streamable HTTP の MCP サーバー | `hermes plugins install first-fluke/oh-my-agent --no-enable` の後に `hermes plugins enable oma` |
| Codex | スキルと MCP サーバー | `codex plugin marketplace add first-fluke/oh-my-agent` の後に `codex plugin add oma@oh-my-agent` |

### Copilot CLI のコンポーネント

Copilot は、`oma emit` が SSOT から埋める `com.github.copilot/` 名前空間の、移植できないコンポーネントを読みます。

- `agents/<name>.agent.md`: プロジェクトインストールが `.github/agents/` に書くのと同じ Copilot カスタムエージェント。
- `commands/<workflow>.md`: 利用できるワークフローごとに 1 つのスラッシュコマンド。それぞれがプロジェクトの `.agents/workflows/<workflow>.md` を読みます。
- `rules/<rule>.instructions.md`: ファイルグロブ（`applyTo`）または `alwaysApply: true` を持つルール。オンデマンドのルールはプロジェクトインストールに残ります。
- `scripts/plugin-bootstrap.sh` と `scripts/plugin-hook.sh` を伴う `hooks/hooks.json`: Claude Code マーケットプレイスと同じ、失敗しても止まらないスクリプト。`OMA_PLUGIN_VENDOR=copilot` で実行します。SessionStart は CLI を準備し、現在のプロジェクトに対して `oma install --yes` を実行します。UserPromptSubmit、PreToolUse（Bash）、Stop は、プロジェクト自身の `.github/hooks/oma.json` 登録が引き継ぐまで `oma hook --vendor copilot` へ転送します。すべてのコマンドは `|| true` で終わるため、CLI がない場合やプラグインルートを解決できない場合でも、ツール呼び出しを止めません。

ワークフロー、エージェント、ルールはプロジェクトの `.agents/` ツリーを参照します。oma CLI がなくても、パッケージはスキルと MCP サーバーを提供します。ブートストラップフックが、最初のセッションで残りを追加します。

### 検証記録

2026年11月8日に、各ホストのホームをスクラッチディレクトリへ向けて確認しました。モデル呼び出し、フック、MCP サーバーは実行していません。`<path>/codex-plugin` は `oma emit --target agent-plugin` が書くツリーです。

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` は `Installed 33 skills` と報告しました。`plugin list --json` は、パッケージのバージョンで有効な `oma` を示します。`installed-plugins/_direct/` のキャッシュコピーには `com.github.copilot/{agents,commands,rules,hooks,scripts}` があります。`copilot plugin marketplace add <repo>` の後の `copilot plugin install oma@oh-my-agent` も、チェックアウトから完全なエントリをライブでインストールしました。Copilot は、直接インストールは `plugin@marketplace` に代わって非推奨だと警告します。
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin`（スクラッチディレクトリに `KIRO_HOME` と `KIRO_DATA_DIR`）は `Installed power "oma"` と報告し、パッケージを `powers/installed/oma/` にコピーしました。Kiro は `USERPROFILE` を無視します。ホームを移すには `KIRO_HOME` を使います。
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` は `installed successfully and enabled` と報告しました。`qwen extensions list` は `Origin: AgentPlugins`、33 個のスキル、`context7`、`serena`、`aside` の MCP サーバーを示します。
- Hermes Agent: ここではインストールしていません。マニフェスト、スキルのフロントマター、`mcp.json` を、Hermes の `hermes_cli/agent_plugins.py` の規則（未知のフィールドなし、有効な名前、stdio コマンドは単一トークン）と照合しました。Hermes は `extensions["com.nousresearch.hermes"]` ブロックを必要としません。

CI はチェックアウトからパッケージを生成し、プッシュのたびにピンした Copilot CLI と Qwen Code のリリースへインストールします（`agent-plugin-hosts` ジョブ、`scripts/agent-plugin-host-smoke.ts`）。

## Pi パッケージ

Pi はプロジェクトの `.agents/skills` とグローバルの `~/.agents/skills` を直接発見します。そのため、プロジェクトに OMA をインストールしても `.pi/skills` への投影は不要です。

OMA のインストールの外へ配布するには、リリースパイプラインが Pi スキルパッケージを生成し、npm に `oh-my-agent-pi` として公開します。自分で生成することもできます。

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

このソースリポジトリでは、ローカル CLI を `bun cli/cli.ts emit --target pi-package` として実行します。デフォルトの出力は `pi-package/` です（git の無視対象。ツリーは生成物であり、コミットされません）。`--output-dir <base>` は `<base>/pi-package/` の下に書きます。

生成された `package.json` は `pi.skills: ["./skills"]` を宣言し、`pi-package` キーワードを含み、リポジトリのバージョンを使います。スキルが参照する共有ガイドは `skills/_shared/` の下に 1 度だけ生成されます（Pi はパッケージを丸ごと読み込むため）。どのスキルも自分のコピーを持ちません。パッケージにワークスペース依存やインストールスクリプトはありません。配布するのはスキルです。OMA のプロジェクトインストールが、Pi のフック拡張を別に提供します。

Pi は Git と npm のソースも対応します。リポジトリはルートの `package.json` でソーススキルをすでに宣言しているため、`pi install git:github.com/first-fluke/oh-my-agent@<tag>` がそれらを発見できます。Pi は `package.json` を含む Git パッケージに対して依存のインストールを実行します。生成パッケージは、ソースワークスペースの依存ツリーを避けます。`oma emit` 自体は公開しません。リリースワークフローが、生成パッケージを npm に公開します。

この形式は、2026年11月5日に、インストール済みの Pi 0.78.1 のパッケージドキュメントとパッケージリゾルバーに対して確認しました。ソースリポジトリと生成パッケージの両方を読み取り専用で解決すると、パッケージのインストールもモデルへの接続もなく、診断 0 で 33 個のスキルが読み込まれました。

## OpenCode と Kilo Code のプラグインパッケージ

`oma link` は、opencode 系のフックブリッジをプロジェクトごとにインストールします。`.opencode/plugins/oma/oma.ts`（Kilo では `.kilo/plugins/oma/`）と、それが起動するハンドラーエントリを、`opencode.json` / `kilo.json` の `plugin` に登録します。同じブリッジは npm プラグインパッケージとしても生成されるため、プロジェクト（またはグローバル設定）はプロジェクトごとのインストールなしで読み込めます。

```bash
oma emit --target opencode-package
```

デフォルトの出力は `opencode-package/` です（コミットされたまま残る唯一の生成パッケージ。クローンがディレクトリプラグインとして読み込めます）。`--output-dir <base>` は `<base>/opencode-package/` の下に書きます。パッケージ（`oh-my-agent-opencode`）には、変更していない SSOT ブリッジ（`oma.ts`）、パッケージエントリ（`index.ts`。`main` / `exports`）、スタンドアロンのフックスクリプトごとに 1 つの生成ハンドラーエントリ（それぞれが `oma hook script --vendor opencode --script <name>` を実行）、`filter-test-output.sh`、README が含まれます。依存はありません。`oma` CLI が PATH 上にあり、`bun` がインストールされている必要があります。どちらが欠けても、すべてのフックは失敗しても止まりません。

2 つのホストは異なる契約でパッケージプラグインを読み込み、エントリは 1 つのデフォルトエクスポートで両方に応えます。OpenCode 2.x は `{ id, setup(ctx) }` を読み、`setup` が `ctx.session.hook("prompt" | "context" | "experimental.idle")` と `ctx.tool.hook("execute.before")` を登録します。それぞれはブリッジの `chat.message`、`experimental.chat.system.transform`、`session.idle`、`tool.execute.before` ハンドラーに合わせます。Kilo Code と OpenCode 1.18.29 以降は `server()` を持つオブジェクトを必要とし、それがブリッジそのものです。ハンドラーのロジックは複製しません。

プロジェクトでは `.opencode/opencode.json`、グローバルでは `~/.config/opencode/opencode.json` にパッケージ名で登録します。OpenCode は起動時に npm プラグインをキャッシュへインストールします。

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code は `.kilo/kilo.json` または `~/.config/kilo/kilo.json` から同じキーを読みます。`kilo plugin oh-my-agent-opencode` がエントリを追加します。両方のホストは共有の `opencode` 識別子でディスパッチし、ブリッジが読む Claude JSON 方言で応答します。`oma link` がすでに `./plugins/oma/oma.ts` を登録しているプロジェクトでは、パッケージは不要です。どちらか一方を使ってください。

OpenCode 2.x はディレクトリプラグイン（設定ファイルからの相対パスで `"plugin": ["../path/to/opencode-package"]`）も受け付け、npm なしで生成パッケージを読み込みます。OpenCode 2.x は、設定したプラグインパスがディレクトリであることを要求し、単一ファイルのエントリを拒否します。`oma link` が書くプロジェクトごとの `./plugins/oma/oma.ts` 登録はそこではスキップされます（「configured plugin path must be a directory」）。そのため OpenCode 2.x ではこのパッケージを使います。Kilo Code はプロジェクトごとのファイルを引き続き読み込みます。

2026年11月8日に OpenCode 2.2.6 と Kilo Code CLI 7.8.27 で確認しました。両方ともプロジェクト設定から `plugin: ["oh-my-agent-opencode"]` を解決しました（`opencode debug config`、`kilo debug config`）。OpenCode は npm インストールを試み（公開されるまでは 404）、失敗しても止まらない状態を保ちました。パッケージを各ホストのプラグインキャッシュ（`<cache>/opencode/npm/<spec>/node_modules/`、`<cache>/kilo/packages/<spec>/node_modules/`）に置いた状態で、ローカルの OpenAI 互換エンドポイントに対するヘッドレスな `run "orchestrate: say hi"` は、両方のホストでシステムプロンプトに `[OMA WORKFLOW: ORCHESTRATE]` を受け取り、その後、再強化の上限まで永続モードの再入がありました。リリースワークフローは、生成パッケージを CLI のリリースごとに npm へ `oh-my-agent-opencode` として公開します。

## Command Code の mod パッケージ

Command Code の設定ファイルフック（`oma link` がインストールする `.commandcode/settings.json`）が対象にするのは `SessionStart`、`PostToolUse`、`Stop` だけです。[mod](https://commandcode.ai/docs/mods) はライフサイクル全体を見るため、OMA は mod パッケージも生成します。

```bash
oma emit --target commandcode-mod
```

デフォルトの出力は `commandcode-mod/` です（git の無視対象。ツリーは生成物であり、コミットされません）。`package.json` は `cmd-mod` キーワードと `commandcode` ブロック（`mods: ["./mods/oma.ts"]`、`skills: ["./skills"]`）を持つため、1 回のインストールでフックブリッジとすべての OMA スキルが入ります。`mods/oma.ts` は ModApi のフックを、`oma hook script --vendor commandcode --script <name>` を通じてコアハンドラーへ対応付けます。`transformInput` は keyword-detector と skill-injector を実行します（プロンプトはそのまま通ります）。`appendSystemPrompt` は検出したコンテキストを注入します。`onSessionStart` は code-intelligence-primer と state-boundary を実行します。`beforeToolCall` は scm-guard（拒否は `{block: true}` になる）と、`shell_command` に対する test-filter を実行します。`onStop` は永続モードのブロックを `{continue: true, reason}` にします。パッケージに依存はなく、ビルド手順も不要です。`oma` CLI がない場合、すべてのフックは失敗しても止まりません。

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

2026年11月8日に Command Code 1.88.5 で確認しました。`cmd mods inspect` は登録されたフックを報告し、`cmd mods add -g <local path>` はパッケージをインストールし、`cmd mods list` は `oma · user · from local:…` を示しました。CLI に対して mod のフックを動かすと、`[OMA WORKFLOW: ORCHESTRATE]` が注入され、`git add .env` がブロックされ、永続モードの continue が返りました。モデルを使う `cmd -p` のターンは実行していません（テストマシンに Command Code のアカウントがなかったため）。リリースワークフローは、生成パッケージを CLI のリリースごとに npm へ `oh-my-agent-commandcode` として公開します。

## Cursor プラグインの検証

Cursor Agent `2026.10.22-27dcf5f` が公開するのは次のとおりです。

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

このプラグイン CLI には、個別のプラグインをインストールするコマンドがありません。マーケットプレイス登録は、Git リポジトリを索引するアカウント操作です。隔離したローカルインストールの確認は提供しません。OMA は生成時にマーケットプレイスを自動登録しません。

2026年11月5日、コミット済みの Cursor マニフェストにある 2 つのスキルディレクトリ、エージェントディレクトリ、ルールディレクトリ、MCP ファイル、ロゴは、すべてリポジトリ内で解決しました。CLI のヘルプは、ローカルのプラグインディレクトリを読み込めることを確認しました。アカウントのマーケットプレイス登録と、ライブのモデルセッションは実行していません。

## Claude 互換のプラグインホスト

Antigravity CLI、Grok Build CLI、ZCode、Kimi Code は、Claude Code の `.claude-plugin/plugin.json` から形が派生したプラグインマニフェストを読みます。`oma emit` は `.agents/` の信頼できるソースから、ホストごとにネイティブなマニフェストを 1 つ生成します。このリポジトリの git クローンが、Grok、ZCode、Kimi のインストール可能なパッケージです。Antigravity のツリーは生成物です（`oma emit --target antigravity-plugin`、またはリリース資産の `oma-antigravity-plugin.tar.gz`）。バリデーターがリポジトリルートを拒否するためです。

| ホスト | 生成対象 | コミットされる成果物 | スキル | エージェント | MCP | フック |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | なし。生成される `antigravity-plugin/`（自己完結、リリース資産） | `skills/` | `agents/`（変換済み） | `mcp_config.json` | 同梱しない |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | ルートの `skills/` | `.agents/agents/*.md` | インラインの `mcpServers` | 宣言しない |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | ルートの `skills/` | `.agents/agents/*.md` | インラインの `mcpServers` | 宣言しない |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | ルートの `skills/` | `.agents/agents/*.md` | インラインの `mcpServers` | 宣言しない |

これらのパッケージはどれもフックを同梱しません。Claude プラグインのフックは `CLAUDE_PROJECT_DIR` と `${CLAUDE_PLUGIN_ROOT}` からプロジェクトを解決しますが、これらのホストはそれらを設定しません。Antigravity と Kimi は、プラグインディレクトリを作業ディレクトリとしてプラグインフックを実行します。そのためワークフローとプロジェクトフックは `oma` CLI（`bun install -g oh-my-agent` の後に `oma install`）から来ます。これが各ホストのネイティブなフックブリッジを準備します。スキル、エージェント、ルール、MCP サーバーは、それなしで動きます。

このソースリポジトリでは、ローカル CLI を `bun cli/cli.ts emit --target <target>` として実行します。`--output-dir <base>` は各成果物を `<base>` の下の同じ相対パスに書きます。CI のドリフトゲート（`bun run --cwd cli check:emit-drift`）は、コミット済みマニフェストが新しい生成と違うと失敗します。Release Please は、コミット済みのすべてのマニフェストのバージョンを CLI リリースと一緒に上げます。生成されるローカルパスのツリーは、生成時点のリリースタグからバージョンを取ります。

### Antigravity CLI（`agy`）

パッケージは [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins) に従います。`plugin.json` は `https://antigravity.google/schemas/v1/plugin.json` に対して検証されます。`skills/<name>/SKILL.md`、`agents/<name>.md`、`rules/AGENTS.md` と OMA ルールごとの `rules/<rule>.md`（`trigger: always_on | glob | model_decision`、カンマ区切りの `globs`）、`mcp_config.json`、`assets/logo.png`、README があります。自己完結のツリーを生成するのは、`agy plugin validate --strict` がリポジトリルートを拒否するためです（ルートの `AGENTS.md` と Claude の `hooks/hooks.json` は、読み込まれないと報告されます）。インストールするのは `antigravity-plugin/` ディレクトリであり、リポジトリ URL やルートではありません。ルートを指すと、agy はそこにある Agent Plugins の `plugin.json` を代わりに読み込みます。スキルは 33 個、エージェントとルールはなく、`mcp.json` は `enable-agent-plugins-spec` フラグがオンのときだけです（`agy plugin validate --json .`、agy 1.5.3）。

```bash
# From a release asset:
tar -xzf oma-antigravity-plugin.tar.gz        # unpacks antigravity-plugin/
# Or from a clone (the tree is generated, not committed):
git clone https://github.com/first-fluke/oh-my-agent
cd oh-my-agent && bun install && bun cli/cli.ts emit --target antigravity-plugin
agy plugin validate --strict ./antigravity-plugin
agy plugin install ./antigravity-plugin
agy plugin list
agy --agent pm-planner
```

スキルは `/<skill-name>` として読み込まれ、MCP サーバーは `oma_<server>` として名前空間化されます。`agy plugin import claude` は、既存の Claude Code インストールも取り込みます。2026年11月8日、生成ツリーは `agy plugin validate --strict`（agy 1.5.3）をエラー 0、警告 0 で通過しました。スキル 33 個、エージェント 12 個、ルール 14 個、MCP サーバー 3 個です。

### Grok Build CLI

Grok はセットアップなしで Claude Code のプラグインとマーケットプレイスを読むため、`.claude-plugin/` はすでに動きます。ネイティブの `.grok-plugin/plugin.json` は、スキル、エージェント、MCP の宣言を明示的に追加します。`.grok-plugin/marketplace.json` は、Claude マーケットプレイスと同じ `oma` エントリと、`oma-frontend`、`oma-security`、`oma-research` のドメインルートを、ローカルソース（`{"type": "local", "path": ...}`）で列挙します。これは、ピンしたコミット sha なしで Grok のカタログバリデーターが受け付ける形です。

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

生成したホストには Grok がインストールされていませんでした。マニフェストとカタログは、ドキュメントのフィールド集合と `xai-org/plugin-marketplace` のカタログ規則に対して、CLI テストが構造的に確認します。

### ZCode

ZCode はまず `.zcode-plugin/plugin.json` を解決し、なければ `.claude-plugin/plugin.json` に戻ります。そのためリポジトリルートはネイティブに解決され、各ドメインルートは Claude マニフェスト経由で解決されます。インストールは GUI だけです。

1. **Settings → Plugins** を開きます。
2. **Create → Add marketplace**（右上）をクリックし、`first-fluke/oh-my-agent`、Git URL、またはローカルクローンのパスを入力します。ZCode は追加前にマーケットプレイスを検証します。
3. **Personal** セグメントで `oma`（またはドメインエントリ）の **Install** をクリックし、状態が **Installed** に変わるまで待ちます。プラグインはデフォルトで有効です。
4. その後は **Manage installed → Check for updates** を使います。ZCode は `.zcode-plugin/marketplace.json` のカタログエントリのバージョンと、インストール済みの `plugin.json` を比較するため、両方とも CLI リリースに追従します。

生成したホストには ZCode がインストールされていませんでした。マニフェスト名のパターン（`^[a-z0-9][a-z0-9._-]{0,127}$`）、フィールド集合、マーケットプレイスの形は CLI テストが確認します。

### Kimi Code CLI

`.kimi-plugin/plugin.json` は `skills` をルートの `skills/` スキャンディレクトリへ向け、各 `.agents/agents/*.md` ファイルを列挙します（すでに Kimi のエージェント形式です。フロントマターの `name` と `description`、本文の Markdown がシステムプロンプト）。`mcpServers` をインラインで持ち、`/plugins` が表示する `interface` ブロックを持ちます。

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi はプラグインを `$KIMI_CODE_HOME/plugins/managed/oma/` にコピーし、すべてのプロジェクトに適用します。スキルは `/skill:oma:<skill-name>` として呼び出します。生成したホストには Kimi がインストールされていませんでした。マニフェストの表面（許されるフィールド、`./` パスの規則、フックのフィールド集合）は CLI テストが確認します。

## Qwen Agent Board

実験的な [Qwen Agent Board のドキュメント](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/)は、`qwen board task`、`claim`、`done`、`ask`、`answer` を説明します。ボードが調整するのはローカルファイルです。エージェントプロセスの開始、参加、監視はしません。

インストール済みの Qwen CLI が `board` コマンドを告知しているとき、OMA は明示的なボード操作を転送できます。

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

アダプターは `claim`、`ask`、`answer`、`decline` も対応します。操作を転送する前にルートのヘルプを確認します。OMA の実行状態と受領記録を補うものであり、OMA の作業を自動で完了にはしません。

インストール済みの Qwen Code 0.20.1 は、2026年11月5日の時点で `board` も `agents` の CLI コマンドも公開していませんでした。`qwen board --help` はルートのヘルプを返したため、このインストールは機能チェックに失敗します。実際のネイティブなボード操作は未検証のままで、`agents join` の統合はありません。
