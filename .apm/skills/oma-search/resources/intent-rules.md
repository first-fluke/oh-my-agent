# Intent Classification Rules

## Classification Priority

1. **Override flags** — always win, skip classification entirely
2. **Keyword pattern matching** — scan query for mode-specific keywords
3. **Signal detection** — contextual clues (library name + version, error message, etc.)
4. **Fallback** — `web` + `docs` parallel when no clear signal

## Override Flags

| Flag | Forced Mode | Description |
|------|-------------|-------------|
| `--docs` | `docs` | Official documentation only via Context7 |
| `--code` | `code` | GitHub/GitLab code search only |
| `--web` | `web` | Web search only (native + `oma search fetch` fallback) |
| `--strict` | (modifier) | Filter results to verified+ sources (score >= 0.85) |
| `--wide` | (modifier) | Show all sources with trust labels (no filtering) |
| `--gitlab` | (modifier) | Force `glab api` instead of `gh` for code route |

## Keyword Patterns

### docs mode

| Language | Keywords |
|----------|----------|
| English | official, docs, documentation, API ref, reference, spec, specification |
| Korean | 공식, 문서, 레퍼런스, API 문서, 명세 |
| Japanese | 公式, ドキュメント, リファレンス, 仕様 |

**Signals:**
- Library/framework name + version mentioned (e.g., "React 19 docs")
- Specific API or method name + "how to use"

### web mode

| Language | Keywords |
|----------|----------|
| English | example, tutorial, how to, guide, blog, comparison, vs, use case, best practice |
| Korean | 사례, 예제, 튜토리얼, 가이드, 블로그, 비교, 사용법, 모범 사례 |
| Japanese | 例, チュートリアル, 使い方, ガイド, ブログ, 比較, ベストプラクティス |

**Signals:**
- Opinion/comparison queries ("X vs Y", "best way to")
- Error messages or stack traces (solution search)
- Trend or news queries

### code mode

| Language | Keywords |
|----------|----------|
| English | implementation, pattern, repo, repository, source code, code search, codebase |
| Korean | 구현, 패턴, 레포, 소스코드, 코드 검색 |
| Japanese | 実装, パターン, リポジトリ, ソースコード, コード検索 |

**Signals:**
- Language/framework + "how is it implemented"
- Specific algorithm or pattern name
- URL containing github.com or gitlab.com

### local mode

| Language | Keywords |
|----------|----------|
| English | this project, here, this file, function, class, method, variable, our code |
| Korean | 이 프로젝트, 여기서, 이 파일, 함수, 클래스, 메서드, 우리 코드 |
| Japanese | このプロジェクト, ここで, このファイル, 関数, クラス, メソッド |

**Signals:**
- References to current codebase context
- Relative file paths mentioned
- "Where is X defined" type queries

## Fallback Rule

When no clear intent is detected:
- Dispatch `web` + `docs` in parallel
- Merge results with trust scoring
- Present combined ranked output

## Ambiguity Resolution Examples

| Query | Detected Mode | Reason |
|-------|--------------|--------|
| "React useState" | `web` + `docs` (fallback) | Ambiguous — could be docs or tutorial |
| "React useState 공식 문서" | `docs` | "공식 문서" keyword |
| "React useState 사용 사례" | `web` | "사용 사례" keyword |
| "React useState implementation" | `code` | "implementation" keyword |
| "handleAuth 함수 찾아줘" | `local` | "함수" + "찾아줘" signals local |
| "Next.js vs Remix" | `web` | "vs" comparison signal |
| "OAuth PKCE github" | `code` | "github" platform signal |
