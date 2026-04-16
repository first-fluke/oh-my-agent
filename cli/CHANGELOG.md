# Changelog

## [6.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.6.1...cli-v6.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* **web:** complete framework replacement from Next.js 16 to Docusaurus 3.10.0. URL structure changed from /{lang}/{group}/{slug} to /docs/{group}/{slug} with locale prefix. All custom React components removed in favor of Docusaurus built-in theme.

### Bug Fixes

* **ci:** add meta-files to cli exclude-paths in release-please config ([30a8e30](https://github.com/first-fluke/oh-my-agent/commit/30a8e30ac17d27a1536de37dfe4a644dc1c5ffae))


### Refactoring

* **web:** migrate docs site from Next.js to Docusaurus 3 ([1e6c324](https://github.com/first-fluke/oh-my-agent/commit/1e6c32449969480bc10ef19857de8c4bccb3afa9))

## [5.6.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.6.0...cli-v5.6.1) (2026-04-16)


### Refactoring

* **web:** migrate from Next.js to Docusaurus 3 ([cbabcbe](https://github.com/first-fluke/oh-my-agent/commit/cbabcbe71af1e136ec90f2032ed932d96ead7b03))

## [5.6.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.5.0...cli-v5.6.0) (2026-04-16)


### Features

* **cli:** add ENABLE_PROMPT_CACHING_1H to recommended settings ([89eab33](https://github.com/first-fluke/oh-my-agent/commit/89eab33e3a56708ba588440038069f0f149163b5))

## [5.5.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.4.4...cli-v5.5.0) (2026-04-16)


### Features

* **cli:** add effortLevel and CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING settings ([b1ecccf](https://github.com/first-fluke/oh-my-agent/commit/b1ecccf1be80a5ceb816de280bfbb348a353558a))
* **cli:** add git instructions disable and skip dangerous mode prompt settings ([c508e16](https://github.com/first-fluke/oh-my-agent/commit/c508e16fa326981551560f2d0d2c7338050fd36e))

## [5.4.4](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.4.3...cli-v5.4.4) (2026-04-14)


### Bug Fixes

* **hooks:** write Stop hook reason to stderr before exit 2 ([6b67490](https://github.com/first-fluke/oh-my-agent/commit/6b674903ba290eb1b5f2168952b0f32b62d5cb00))

## [5.4.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.4.2...cli-v5.4.3) (2026-04-14)


### Bug Fixes

* **cli:** add tarball download fallbacks ([9f2c930](https://github.com/first-fluke/oh-my-agent/commit/9f2c930d0dbfc2dbe6ce3c0aa210ade43863b57a))


### Refactoring

* **cli:** split large modules and harden hooks ([fe930f1](https://github.com/first-fluke/oh-my-agent/commit/fe930f1a9a01dda53a022dd642480b19f726ef1e))

## [5.4.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.4.1...cli-v5.4.2) (2026-04-14)


### Bug Fixes

* **cli:** resolve all type errors and lint warnings ([7a0339b](https://github.com/first-fluke/oh-my-agent/commit/7a0339b2c7c5acec3160f4f726b024a182969b77))

## [5.4.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.4.0...cli-v5.4.1) (2026-04-14)


### Bug Fixes

* **cli:** use axios with IPv4-only https agent to fix fetch timeout on Node.js v24 ([c710bbe](https://github.com/first-fluke/oh-my-agent/commit/c710bbe146f3d369b8f2eac7cd18987f6f0be639))

## [5.4.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.3.0...cli-v5.4.0) (2026-04-14)


### Features

* **cli:** add Codex native agent generation and same-vendor dispatch ([8e97673](https://github.com/first-fluke/oh-my-agent/commit/8e97673fc739153f8f6eb6e50f25825b1d2cd0d6))
* **cli:** add native runtime dispatch ([e1b0efd](https://github.com/first-fluke/oh-my-agent/commit/e1b0efd0bc933dce524e45b9e03f99ca246c8c50))
* **cli:** add native runtime dispatch ([e758aa9](https://github.com/first-fluke/oh-my-agent/commit/e758aa9d5068250b1a662b3ccfd194e7ad842778))

## [5.3.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.2.2...cli-v5.3.0) (2026-04-14)


### Features

* **cli:** support role-based agent dispatch ([d575d08](https://github.com/first-fluke/oh-my-agent/commit/d575d08718b6c02a18c635104c2222d96e504723))
* **docs:** add oma-recap entry to multilingual README files ([404cfb4](https://github.com/first-fluke/oh-my-agent/commit/404cfb4afd85cd4e93f203c37ae72c2b332b840a))


### Bug Fixes

* **cli:** restore skills facade exports ([a9fc4bc](https://github.com/first-fluke/oh-my-agent/commit/a9fc4bc7556e8f10499a817fd8f8e4b32d3fa62f))

## [5.2.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.2.1...cli-v5.2.2) (2026-04-13)


### Bug Fixes

* **hooks:** skip missing test filter script ([90f52ba](https://github.com/first-fluke/oh-my-agent/commit/90f52ba39fdd70e1b1b4155765f85565ec741869))
* **update:** harden codex hook reconciliation ([71e7793](https://github.com/first-fluke/oh-my-agent/commit/71e77934bae241db8e97811073b19556b9cf79b3))

## [5.2.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.2.0...cli-v5.2.1) (2026-04-13)


### Bug Fixes

* **cli:** register oma-recap in package.json skills list ([d2c804a](https://github.com/first-fluke/oh-my-agent/commit/d2c804ab41bd5da9d8fc531502b30feec913ecd1))

## [5.2.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.1.0...cli-v5.2.0) (2026-04-13)


### Features

* **cli:** add AI response context to recap parsers ([c249871](https://github.com/first-fluke/oh-my-agent/commit/c24987181652fb8548c0cf764551279232c9a5ba))
* **cli:** add interactive D3.js graph visualization for summary ([0d883fb](https://github.com/first-fluke/oh-my-agent/commit/0d883fb3f94226280f255f20a10ad89301b61233))
* **cli:** add summary command for multi-tool conversation history analysis ([26fd8d7](https://github.com/first-fluke/oh-my-agent/commit/26fd8d7640ebf0d8be0a724ff377c98a62dbed27))
* **cli:** add tool filter, prompt panel, and activity heatmap to summary graph ([9b2131f](https://github.com/first-fluke/oh-my-agent/commit/9b2131fee50d80ab142ca92cdc4d243778f35c44))
* **cli:** render summary graph nodes as pie charts showing tool distribution ([0c7cd84](https://github.com/first-fluke/oh-my-agent/commit/0c7cd84f0c2421065ac1bc6921202d9ca84b7897))
* **skill:** add multi-day date-driven format to oma-recap ([783e974](https://github.com/first-fluke/oh-my-agent/commit/783e974fd739cf28790098bb56a27b422216d555))


### Bug Fixes

* **cli:** improve Claude and Codex response matching in recap parsers ([cbd4b88](https://github.com/first-fluke/oh-my-agent/commit/cbd4b88b3a200b4d818245305e05f63d32c85436))
* **cli:** replace hardcoded green heatmap with tool-colored stacked bars ([bcca81f](https://github.com/first-fluke/oh-my-agent/commit/bcca81fbfb5ff335f5701985351bac0380a08fbd))
* **cli:** resolve (unknown) project names in codex and gemini parsers ([3c5b190](https://github.com/first-fluke/oh-my-agent/commit/3c5b19004190c6512f3e768df3c80e2c936707eb))
* **skill:** add natural language date resolution step to oma-summary ([5bcb621](https://github.com/first-fluke/oh-my-agent/commit/5bcb62161de5099a1257fdc2d91cc823f10d0311))
* **skill:** make date resolution language-agnostic in oma-summary ([2e23875](https://github.com/first-fluke/oh-my-agent/commit/2e238756b29d11e15fe272dc53e302087475934d))
* **skill:** remove internal metrics from recap project headers ([3e80b59](https://github.com/first-fluke/oh-my-agent/commit/3e80b597dc24f64fcff6b794574587bc8c5d5e69))


### Refactoring

* **cli:** migrate dashboard pages to Tailwind CSS and fix filter toggle bug ([77dfe0e](https://github.com/first-fluke/oh-my-agent/commit/77dfe0e7ace2538b0a20e225fc601318030e4678))
* **cli:** rename summary to recap across entire feature ([ad7d6ef](https://github.com/first-fluke/oh-my-agent/commit/ad7d6ef14258ed8e477294bb6ee89c35ee6254bf))
* **skill:** rewrite oma-summary SKILL.md in English with TL;DR and result saving ([f0a3b73](https://github.com/first-fluke/oh-my-agent/commit/f0a3b732e2e1f32c36045f3e2f960283ea95cda1))
* **skill:** unify multi-day recap to project-driven format ([f5e9ca7](https://github.com/first-fluke/oh-my-agent/commit/f5e9ca7742baaf5d2a35802b076af51f4185b948))

## [5.1.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.0.0...cli-v5.1.0) (2026-04-13)


### Features

* **cli:** add link command ([93215cd](https://github.com/first-fluke/oh-my-agent/commit/93215cd54a5f671e22fd691db9586d473db8effc))


### Bug Fixes

* **cli:** unset deprecated claude prompt caching ([326e312](https://github.com/first-fluke/oh-my-agent/commit/326e312e4afff46f11245ed96d411c47f7dcd792))

## [5.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.31.0...cli-v5.0.0) (2026-04-12)


### ⚠ BREAKING CHANGES

* **cli:** oma usage:anti is removed. auth:status JSON omits antigravity.

### Refactoring

* **cli:** remove usage:anti and Antigravity quota bridge ([d32403c](https://github.com/first-fluke/oh-my-agent/commit/d32403c4636640c4841a77ecad3cb3e8e995a509))

## [4.31.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.30.2...cli-v4.31.0) (2026-04-12)


### Features

* **cli:** enhance Gemini CLI compatibility and hooks normalization ([059873e](https://github.com/first-fluke/oh-my-agent/commit/059873e820a5a4cbbf84e8a482a003db6d7db4bf))
* **cli:** symlink Cursor MCP config to .agents/mcp.json on install/update ([c88d855](https://github.com/first-fluke/oh-my-agent/commit/c88d855f25d701c41d2fc4313ed8e9347744400a))


### Documentation

* align Thai README workflow step numbers with English ([59c8eb4](https://github.com/first-fluke/oh-my-agent/commit/59c8eb410c66e227299844ace4bfbb26fc96800c))
* align workflow step numbers in How It Works section ([43a27d1](https://github.com/first-fluke/oh-my-agent/commit/43a27d11e7fc058da75ab4ff6a4b212fe94b66cc))
* **i18n:** add Thai README and update localized links ([55b52f4](https://github.com/first-fluke/oh-my-agent/commit/55b52f42ffca9dc4a2e7751359c96c2126a9d926))
* **i18n:** add Thai README and update localized links ([4b830e6](https://github.com/first-fluke/oh-my-agent/commit/4b830e6579aca4a0c0be483f8aeb95f01ab8519c))

## [4.30.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.30.1...cli-v4.30.2) (2026-04-12)


### Bug Fixes

* **bridge:** use `serena start-mcp-server` subcommand format ([2ba4db8](https://github.com/first-fluke/oh-my-agent/commit/2ba4db8e3012ed1732664027252d9585ddd65d02))

## [4.30.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.30.0...cli-v4.30.1) (2026-04-12)


### Documentation

* **readme:** add workflow step column to slash-command tables ([d060d04](https://github.com/first-fluke/oh-my-agent/commit/d060d046a60b8eadef9340b2bc1d991ab2745ef4))
* **readme:** align auto-detection blurbs with EN keyword set ([41e4625](https://github.com/first-fluke/oh-my-agent/commit/41e46258de56afc583bbd4b01ef263d78a516f71))
* **readme:** align locale READMEs with EN after translator review ([3f246da](https://github.com/first-fluke/oh-my-agent/commit/3f246da642d892a6a6d5ca2c1cec0d5fc2b3bd8d))
* **readme:** list oma-scm after oma-qa in agent team tables ([7316d20](https://github.com/first-fluke/oh-my-agent/commit/7316d209569dc99ef504635b9490c83e6467f961))
* **readme:** order How It Works slash commands by workflow stage ([5ed9f01](https://github.com/first-fluke/oh-my-agent/commit/5ed9f01b08a5107cf1eb8f46ceed17730a384243))
* **readme:** spell out IaC as Infrastructure as Code for tf-infra ([c651df5](https://github.com/first-fluke/oh-my-agent/commit/c651df55d04a2d6100bac1ccefe0c0839ad3c3c4))

## [4.30.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.29.0...cli-v4.30.0) (2026-04-12)


### Features

* **scm:** consolidate commit workflow into oma-scm ([db7c982](https://github.com/first-fluke/oh-my-agent/commit/db7c9825260a7417205634189bf2f8e5419eb66d))

## [4.29.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.28.0...cli-v4.29.0) (2026-04-11)


### Features

* **cli:** keep vendor config project-local and modularize settings helpers ([245b48a](https://github.com/first-fluke/oh-my-agent/commit/245b48a310a0e923a604b1a932e65d5f110ca1ad))


### Documentation

* **readme:** sync architecture agent ordering and diagram entries ([e58f6fd](https://github.com/first-fluke/oh-my-agent/commit/e58f6fdf16202cb6e7a316b0a849904b3287db63))

## [4.28.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.27.1...cli-v4.28.0) (2026-04-11)


### Features

* **cli:** add cursor hooks and unify vendor guide generation ([aa21004](https://github.com/first-fluke/oh-my-agent/commit/aa210040ffa4dc6cac949986c4a563f98157ac94))
* **cli:** align vendor artifacts with .agents SSOT ([988afbd](https://github.com/first-fluke/oh-my-agent/commit/988afbd739eec8ea2a782c17b39502c95578d459))

## [4.27.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.27.0...cli-v4.27.1) (2026-04-11)


### Bug Fixes

* **hooks:** resolve codex filter path and bun runtime ([bfd98ca](https://github.com/first-fluke/oh-my-agent/commit/bfd98ca4f073ac43a2c7169b5c18f89d93292cbd))


### Documentation

* **benchmark:** add harness benchmark design ([71b219f](https://github.com/first-fluke/oh-my-agent/commit/71b219fb12b710b902cc567ea7ea2e5f55c510bb))

## [4.27.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.26.3...cli-v4.27.0) (2026-04-10)


### Features

* **oma-design:** add vendor inspiration via getdesign for Phase 2 seeding ([c1b60a5](https://github.com/first-fluke/oh-my-agent/commit/c1b60a5a13909bb944d87ea8f43174b988388a31))

## [4.26.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.26.2...cli-v4.26.3) (2026-04-10)


### Bug Fixes

* **hooks:** resolve broken symlinks in consumer project hooks directory ([cb70727](https://github.com/first-fluke/oh-my-agent/commit/cb70727ab8257a282f227d0b41d629fce49db52f))

## [4.26.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.26.1...cli-v4.26.2) (2026-04-10)


### Bug Fixes

* clean up .migration-backup/ after successful update ([4038b82](https://github.com/first-fluke/oh-my-agent/commit/4038b82dceac639c02bbd7c6afb44ea5bb6cc8e7))
* reconcile vendor outputs after migrations when version is already current ([c4b54fb](https://github.com/first-fluke/oh-my-agent/commit/c4b54fbfa4736a50ca68715d643fca602bbd4d7b))

## [4.26.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.26.0...cli-v4.26.1) (2026-04-09)


### Bug Fixes

* handle unbound BASH_SOURCE when install.sh is piped to bash ([2fbc432](https://github.com/first-fluke/oh-my-agent/commit/2fbc432a5b8dae4ccea0361ab2db760d9e0dedd9))

## [4.26.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.25.0...cli-v4.26.0) (2026-04-09)


### Features

* add cross-vendor rules system with .agents/rules/ as SSOT ([9c2d56e](https://github.com/first-fluke/oh-my-agent/commit/9c2d56e34e26f15f91b6e89a1faa4ef688609830))

## [4.25.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.24.1...cli-v4.25.0) (2026-04-08)


### Features

* add session cost, rate limits, and lines changed to HUD statusline ([8f116a6](https://github.com/first-fluke/oh-my-agent/commit/8f116a6befe5527d0e6257123e127fd336f8736e))

## [4.24.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.24.0...cli-v4.24.1) (2026-04-08)


### Refactoring

* move plan.json to session-scoped results/plan-{sessionId}.json ([9f019f5](https://github.com/first-fluke/oh-my-agent/commit/9f019f564f91910447b8ceba16470c795d9dc8c7))

## [4.24.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.23.4...cli-v4.24.0) (2026-04-08)


### Features

* add test output filter hook and SSOT hooks architecture ([8b8fae4](https://github.com/first-fluke/oh-my-agent/commit/8b8fae482324caa62ac3c255357011045c89a228))

## [4.23.4](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.23.3...cli-v4.23.4) (2026-04-08)


### Refactoring

* extract shared Claude Code recommended settings ([d31c740](https://github.com/first-fluke/oh-my-agent/commit/d31c74041d156c6c05b9e76a21de9f5be92eca0c))

## [4.23.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.23.2...cli-v4.23.3) (2026-04-06)


### Refactoring

* rename oh-my-ag CLI references to oma ([25b10b2](https://github.com/first-fluke/oh-my-agent/commit/25b10b2602d8b3258ab18cf7afd71a29a58cdd93))
* replace oh-my-ag with oma/oh-my-agent across docs ([9a7c791](https://github.com/first-fluke/oh-my-agent/commit/9a7c7914dd34884870afc62d4470053c6cd7e368))


### Documentation

* sort agent team table alphabetically in all READMEs ([4e34983](https://github.com/first-fluke/oh-my-agent/commit/4e349833770579363238ec2908756fe02823c320))

## [4.23.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.23.1...cli-v4.23.2) (2026-04-06)


### Refactoring

* rename /coordinate workflow to /work ([15e9b8e](https://github.com/first-fluke/oh-my-agent/commit/15e9b8e9166d097ada043864669a0c9fb5a48c5c))

## [4.23.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.23.0...cli-v4.23.1) (2026-04-06)


### Refactoring

* **cli:** consolidate all migrations into commands/migrations/ ([4bd8720](https://github.com/first-fluke/oh-my-agent/commit/4bd8720a3a21eab6ce3c655b4aa98e64f597574b))
* move .agents/config/user-preferences.yaml to .agents/oma-config.yaml ([c702a4b](https://github.com/first-fluke/oh-my-agent/commit/c702a4bc41f14b9ed6b6797d13ed970357c5d354))


### Documentation

* add migrations README with conventions and registry ([c5dcdb5](https://github.com/first-fluke/oh-my-agent/commit/c5dcdb5246244bef3e5e97a1b4d5b552bedee85d))
* add oma-pdf to agent table in all README files ([5ab63bf](https://github.com/first-fluke/oh-my-agent/commit/5ab63bf6ea0a8c650eea0bb7f1315cc8a47480ca))

## [4.23.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.22.4...cli-v4.23.0) (2026-04-05)


### Features

* **cli:** register oma-pdf in skills registry and antigravity config ([86609e4](https://github.com/first-fluke/oh-my-agent/commit/86609e4b01851e0dbe702a75f09414d0ed1fa3c2))
* **skills:** add oma-pdf skill for PDF to Markdown conversion ([8cce569](https://github.com/first-fluke/oh-my-agent/commit/8cce569fd5a2048c8f0479f50d7fbec31e66f309))

## [4.22.4](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.22.3...cli-v4.22.4) (2026-04-05)


### Bug Fixes

* use session-scoped naming for state and result files ([ff8e5b7](https://github.com/first-fluke/oh-my-agent/commit/ff8e5b79add74c299b6b0bff8d9b73141ed79688))

## [4.22.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.22.2...cli-v4.22.3) (2026-04-04)


### Bug Fixes

* harden installer bootstrap ([3c214f3](https://github.com/first-fluke/oh-my-agent/commit/3c214f3644f236ccbd3d982dd9ca3899853e1d97))

## [4.22.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.22.1...cli-v4.22.2) (2026-04-03)


### Bug Fixes

* **cli:** separate update flow from install ([7bf8bf9](https://github.com/first-fluke/oh-my-agent/commit/7bf8bf9f30959e32166edeba51ac9adf8139c3e8))


### Documentation

* add benchmark prompt ([fce19ec](https://github.com/first-fluke/oh-my-agent/commit/fce19ec28e681e5bf7cccf2eaf7460bb91e817d1))

## [4.22.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.22.0...cli-v4.22.1) (2026-04-03)


### Documentation

* add /oma-translator skill reference to i18n guide ([75db46c](https://github.com/first-fluke/oh-my-agent/commit/75db46cc53abef019ec4455a5fb7501d3a9631fb))

## [4.22.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.21.0...cli-v4.22.0) (2026-04-02)


### Features

* auto-register Serena project during install and update ([b868047](https://github.com/first-fluke/oh-my-agent/commit/b868047878d2b95b8b77ab2988ae0983b2df69a7))

## [4.21.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.20.2...cli-v4.21.0) (2026-04-02)


### Features

* dynamically scan available languages from docs/README.*.md ([f4d419c](https://github.com/first-fluke/oh-my-agent/commit/f4d419c017428e592087b3ce0f7de4b912a26bfb))
* prompt language selection during oma install ([b706646](https://github.com/first-fluke/oh-my-agent/commit/b706646022f11a21c1567a1079dc7f107c1c8a41))

## [4.20.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.20.1...cli-v4.20.2) (2026-04-02)


### Bug Fixes

* detect active competitor installs instead of leftover directories ([a437845](https://github.com/first-fluke/oh-my-agent/commit/a43784573c1b8e4e8ab05a051a07813177601122))
* remove chore type from changelog sections ([7098d92](https://github.com/first-fluke/oh-my-agent/commit/7098d92d3d472c4abfb7320c7d998895e0e5bd33))
* rewrite i18n guide in English and align frontmatter format ([fbe5a8f](https://github.com/first-fluke/oh-my-agent/commit/fbe5a8f661abf12ea7aad4d3bac565a062ae9730))

## [4.20.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.20.0...cli-v4.20.1) (2026-04-02)


### Bug Fixes

* remove hardcoded Korean text from i18n guide ([8f69034](https://github.com/first-fluke/oh-my-agent/commit/8f690341fd9ec0bbf9931e94d518c3353402a502))
* replace dead oh-my-agent.dev URL with GitHub Pages link ([bdcaf6e](https://github.com/first-fluke/oh-my-agent/commit/bdcaf6efa25483ed4cfe291745d2351aa7987dec))


### Miscellaneous

* **main:** release cli 4.20.0 ([db2bfe7](https://github.com/first-fluke/oh-my-agent/commit/db2bfe76b161eb1a14d7d21913ea02c8e49e75c2))
* **main:** release cli 4.20.0 ([60984fd](https://github.com/first-fluke/oh-my-agent/commit/60984fdf97ec7ff43648af3b0feede81f0ad279e))
* **main:** release cli 4.20.0 ([5e3dbb4](https://github.com/first-fluke/oh-my-agent/commit/5e3dbb464f48687c074886e0e3b5ee3cc1018cee))
* **main:** release cli 4.20.0 ([068d3b8](https://github.com/first-fluke/oh-my-agent/commit/068d3b836d5553ef7e1b32682209a5d7b5433d46))
* **main:** release web 0.3.13 ([ed97d0a](https://github.com/first-fluke/oh-my-agent/commit/ed97d0a8c8d8a599a18703c81ad276f55b594fc3))
* **main:** release web 0.3.13 ([b32295e](https://github.com/first-fluke/oh-my-agent/commit/b32295e5ff7755c3d75077e4b23127a2eccafc6f))

## [4.20.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.19.0...cli-v4.20.0) (2026-04-02)


### Features

* add chrome-devtools MCP server with isolated mode ([bbc162e](https://github.com/first-fluke/oh-my-agent/commit/bbc162e8a4d3b0858c58813b646ba12308fcaeba))
* add rules installation to CLI install/update pipeline ([c9ae3fc](https://github.com/first-fluke/oh-my-agent/commit/c9ae3fcde48eabb9f43c31890dd0e817e4b78b5f))


### Bug Fixes

* redirect stdin from /dev/tty for interactive CLI in pipe install ([4019f59](https://github.com/first-fluke/oh-my-agent/commit/4019f5973a046957c7b835820a47350e4327f7fd))
* replace dead oh-my-agent.dev URL with GitHub Pages link ([bdcaf6e](https://github.com/first-fluke/oh-my-agent/commit/bdcaf6efa25483ed4cfe291745d2351aa7987dec))


### Documentation

* add Vietnamese web content and register vi locale ([53e7fd1](https://github.com/first-fluke/oh-my-agent/commit/53e7fd12e9426963f7b6ec2cee375347bf9e711d))


### Miscellaneous

* **main:** release cli 4.20.0 ([5e3dbb4](https://github.com/first-fluke/oh-my-agent/commit/5e3dbb464f48687c074886e0e3b5ee3cc1018cee))
* **main:** release cli 4.20.0 ([068d3b8](https://github.com/first-fluke/oh-my-agent/commit/068d3b836d5553ef7e1b32682209a5d7b5433d46))
* **main:** release cli 4.20.0 ([104bfd2](https://github.com/first-fluke/oh-my-agent/commit/104bfd23cbc0251ac7c94fc4666dd98a00cf5530))
* **main:** release cli 4.20.0 ([f71efc1](https://github.com/first-fluke/oh-my-agent/commit/f71efc10a8e28d456718c318f3ee08132d2a9db8))
* **main:** release web 0.3.13 ([ed97d0a](https://github.com/first-fluke/oh-my-agent/commit/ed97d0a8c8d8a599a18703c81ad276f55b594fc3))
* **main:** release web 0.3.13 ([b32295e](https://github.com/first-fluke/oh-my-agent/commit/b32295e5ff7755c3d75077e4b23127a2eccafc6f))

## [4.20.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.19.0...cli-v4.20.0) (2026-04-02)


### Features

* add chrome-devtools MCP server with isolated mode ([bbc162e](https://github.com/first-fluke/oh-my-agent/commit/bbc162e8a4d3b0858c58813b646ba12308fcaeba))
* add rules installation to CLI install/update pipeline ([c9ae3fc](https://github.com/first-fluke/oh-my-agent/commit/c9ae3fcde48eabb9f43c31890dd0e817e4b78b5f))


### Bug Fixes

* redirect stdin from /dev/tty for interactive CLI in pipe install ([4019f59](https://github.com/first-fluke/oh-my-agent/commit/4019f5973a046957c7b835820a47350e4327f7fd))


### Documentation

* add Vietnamese web content and register vi locale ([53e7fd1](https://github.com/first-fluke/oh-my-agent/commit/53e7fd12e9426963f7b6ec2cee375347bf9e711d))

## [4.19.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.18.5...cli-v4.19.0) (2026-04-02)


### Features

* add i18n response language rules ([4cb69b8](https://github.com/first-fluke/oh-my-agent/commit/4cb69b8ab39dbe9e65207e61c2923acf003e91f8))


### Documentation

* add Vietnamese README translation and fix language nav links ([9af8468](https://github.com/first-fluke/oh-my-agent/commit/9af84685ece2ef87aa08f1f3140280bb9f8bb5eb))

## [4.18.5](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.18.4...cli-v4.18.5) (2026-04-02)


### Bug Fixes

* reduce false positives in keyword-detector and improve persistent mode deactivation ([8f1cd67](https://github.com/first-fluke/oh-my-agent/commit/8f1cd679d770b1be46e5ec2b56633b43477f0657))

## [4.18.4](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.18.3...cli-v4.18.4) (2026-04-01)


### Bug Fixes

* enforce auth boundary in frontend agent to prevent direct DB access ([c0c83dd](https://github.com/first-fluke/oh-my-agent/commit/c0c83dd51305cc1af48fa296011a07fcfc2c81fd))

## [4.18.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.18.2...cli-v4.18.3) (2026-04-01)


### Bug Fixes

* strengthen oma-translator skill wording and coverage ([aa2a527](https://github.com/first-fluke/oh-my-agent/commit/aa2a527e390b7eb0bf16d492aefe862f6715ac4f))


### Documentation

* add design rationale link to Why section across all READMEs ([4ff61d1](https://github.com/first-fluke/oh-my-agent/commit/4ff61d19e937dd083fc599a96a6e123436bed983))

## [4.18.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.18.1...cli-v4.18.2) (2026-04-01)


### Bug Fixes

* **cli:** improve agent stability and Claude Code integration ([17655fb](https://github.com/first-fluke/oh-my-agent/commit/17655fbc604513d0e6b0d87bdadadc2507b418ad))
* **cli:** inline omc uninstall to avoid ETIMEDOUT from curl|bash ([955eef5](https://github.com/first-fluke/oh-my-agent/commit/955eef533b81e4dfa2be493d6eaca493d0dab66d))
* **cli:** preserve oma skill routers when removing omc skills ([91fa766](https://github.com/first-fluke/oh-my-agent/commit/91fa76651441581c74ae4aa0acd1a3c7724fec9e))


### Miscellaneous

* **main:** release web 0.3.12 ([1b85118](https://github.com/first-fluke/oh-my-agent/commit/1b851183a38c5032a992062d33efc77d17b33bf6))

## [4.18.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.18.0...cli-v4.18.1) (2026-03-31)


### Refactoring

* remove deprecated /setup workflow replaced by oma install/update ([faf9bae](https://github.com/first-fluke/oh-my-agent/commit/faf9baeac1b922977be547b4825f762e97e312e9))

## [4.18.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.17.2...cli-v4.18.0) (2026-03-31)


### Features

* **cli:** auto-install codex-plugin-cc when both Claude and Codex are detected ([71ef5a0](https://github.com/first-fluke/oh-my-agent/commit/71ef5a0ff42184b038eac861fa073cb432981a2d))


### Bug Fixes

* **cli:** ensure ~/.claude directory exists before writing CLAUDE.md in CI ([0f1b5b8](https://github.com/first-fluke/oh-my-agent/commit/0f1b5b83cc69f1287f0785ebab749206d8aa64c7))
* **cli:** use codex --version instead of which for cross-platform detection ([a637add](https://github.com/first-fluke/oh-my-agent/commit/a637add7ae61f8dd32fccfaed4b6c54bd5a6b983))

## [4.17.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.17.1...cli-v4.17.2) (2026-03-30)


### Bug Fixes

* rename oh-my-ag display name to oh-my-agent and use oma alias in demos ([bd96bcb](https://github.com/first-fluke/oh-my-agent/commit/bd96bcb71669b29a5bd9722819887eb237fd7992))

## [4.17.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.17.0...cli-v4.17.1) (2026-03-30)


### Bug Fixes

* **hooks:** resolve CLAUDE_PROJECT_DIR to git root to prevent subdirectory state file misplacement ([96c381c](https://github.com/first-fluke/oh-my-agent/commit/96c381c392774cf82daf1477ac251d3ed00b1691))

## [4.17.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.16.0...cli-v4.17.0) (2026-03-30)


### Features

* **qa:** add Chrome DevTools MCP isolated runtime verification and skeptical evaluator posture ([10c4dba](https://github.com/first-fluke/oh-my-agent/commit/10c4dba079da80898b6af179e05c6c561fb712a9))

## [4.16.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.15.2...cli-v4.16.0) (2026-03-30)


### Features

* **hooks:** fix informational filter, expand keywords, add extension-based agent routing ([7881f4d](https://github.com/first-fluke/oh-my-agent/commit/7881f4d5571414f0234e757cb927e73ae4e48a4c))


### Bug Fixes

* **hooks:** prevent false positive workflow activation on meta-discussion ([771d309](https://github.com/first-fluke/oh-my-agent/commit/771d3099988f856afc1e2db420c2ad4607e8913f))

## [4.15.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.15.1...cli-v4.15.2) (2026-03-29)


### Refactoring

* **skills:** remove hardcoded stack versions from oma-pm ([0f8d14e](https://github.com/first-fluke/oh-my-agent/commit/0f8d14eceac7bc9e21e0bfd149271f9444c6687a))

## [4.15.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.15.0...cli-v4.15.1) (2026-03-29)


### Bug Fixes

* **skills:** update outdated stack versions in oma-pm ([08d56b1](https://github.com/first-fluke/oh-my-agent/commit/08d56b1a8c6290bc1896091b7358f56475048d42))


### Documentation

* fill undocumented codebase features in EN/KO web content ([49b5f7e](https://github.com/first-fluke/oh-my-agent/commit/49b5f7e03c3e9fe0ab771a396a0b008522baeb0e))


### Miscellaneous

* **main:** release web 0.3.11 ([07a1a7a](https://github.com/first-fluke/oh-my-agent/commit/07a1a7a97b9af302137451acb9e80d442ac63e50))
* **main:** release web 0.3.11 ([d923737](https://github.com/first-fluke/oh-my-agent/commit/d92373763e1fd8fe489039753e1a4efc6950c028))

## [4.15.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.14.0...cli-v4.15.0) (2026-03-28)


### Features

* **cli:** add explicit install command and auto-redirect from update ([477eeb3](https://github.com/first-fluke/oh-my-agent/commit/477eeb384af94900decb10cf4453340d5449c666))

## [4.14.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.13.0...cli-v4.14.0) (2026-03-28)


### Features

* **cli:** add recommended Claude Code settings and user-level CLAUDE.md ([3f41e35](https://github.com/first-fluke/oh-my-agent/commit/3f41e35963fc4e6c065fba84793409f0ea7bd0e6))
* **skills:** add 12-Factor cloud readiness rules to oma-backend ([4d3ac32](https://github.com/first-fluke/oh-my-agent/commit/4d3ac328eef01c8af7eb5eed8416cf2a04502cab))


### Miscellaneous

* **main:** release web 0.3.10 ([5257dbc](https://github.com/first-fluke/oh-my-agent/commit/5257dbc1b5a354fc9fc9511dc284571cae661d4d))

## [4.13.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.12.0...cli-v4.13.0) (2026-03-28)


### Features

* add deactivation detection, export hooks for testing, detect superpowers ([d3baa71](https://github.com/first-fluke/oh-my-agent/commit/d3baa71f4a4f186b33636b18d299c3ceb3ce1760))


### Bug Fixes

* close Simple fast-track verification gaps found via agent testing ([dade64b](https://github.com/first-fluke/oh-my-agent/commit/dade64bf63d5430b27584bed3daa6efcb7b3abc2))


### Documentation

* review and improve translations across all 10 languages ([35eb06b](https://github.com/first-fluke/oh-my-agent/commit/35eb06b95d2252a4b8a653598fab330a9aa87ad1))


### Miscellaneous

* **main:** release web 0.3.9 ([0974500](https://github.com/first-fluke/oh-my-agent/commit/09745007a3c118ed5960242a6768563f46be6b89))

## [4.12.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.11.0...cli-v4.12.0) (2026-03-27)


### Features

* **cli:** add agent:review command and rename -v to -m flag ([1b48055](https://github.com/first-fluke/oh-my-agent/commit/1b480555eca21e60aa19f26ab066fc1f208ba589))


### Miscellaneous

* add docs/plans/ to gitignore ([1135a5f](https://github.com/first-fluke/oh-my-agent/commit/1135a5f664a8a18557e321a2f2adc79fdc89cb22))
* **main:** release action 1.1.1 ([a582b9b](https://github.com/first-fluke/oh-my-agent/commit/a582b9b84c979860a3d6551ea4e09b7743c0261e))
* **main:** release action 1.1.1 ([1d7fee0](https://github.com/first-fluke/oh-my-agent/commit/1d7fee08c061b8b7fef695fca3ac1c660a819a24))

## [4.11.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.10.3...cli-v4.11.0) (2026-03-26)


### Features

* add oma-ralph persistent self-referential execution loop ([cf42146](https://github.com/first-fluke/oh-my-agent/commit/cf42146c1a51ce4b8ffef903a17824517ea8c8c7))

## [4.10.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.10.2...cli-v4.10.3) (2026-03-26)


### Bug Fixes

* **cli:** remove skill symlinks from repo to fix update error ([be16d10](https://github.com/first-fluke/oh-my-agent/commit/be16d10bb705dfa0d49f9dbc7e75fd3b53e8ecf9))

## [4.10.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.10.1...cli-v4.10.2) (2026-03-26)


### Bug Fixes

* **ci:** add pull --rebase before push in sync-manifest workflow ([ebae49b](https://github.com/first-fluke/oh-my-agent/commit/ebae49b3e66fa3db382da318bbad45d5da3c7017))


### Miscellaneous

* **main:** release web 0.3.8 ([0c2d7bb](https://github.com/first-fluke/oh-my-agent/commit/0c2d7bbc8af5bd2d2d4104dab74efe5e34897849))

## [4.10.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.10.0...cli-v4.10.1) (2026-03-26)


### Bug Fixes

* **hooks:** remove yaml dependency from keyword-detector hook ([a6a7a7b](https://github.com/first-fluke/oh-my-agent/commit/a6a7a7b0503121f411d8ee2ef05cf684d732ab08))

## [4.10.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.9.0...cli-v4.10.0) (2026-03-26)


### Features

* **agents:** reinforce harness design based on Anthropic research ([b0920bb](https://github.com/first-fluke/oh-my-agent/commit/b0920bbc98d26419342dc58c172e854211770d0d))

## [4.9.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.8.1...cli-v4.9.0) (2026-03-25)


### Features

* **cli:** prompt star on install and update if not yet starred ([acecd71](https://github.com/first-fluke/oh-my-agent/commit/acecd7174f3c246b021a217d78bee1f4707cccca))

## [4.8.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.8.0...cli-v4.8.1) (2026-03-25)


### Documentation

* comprehensive documentation rewrite (198 files, 11 languages) ([c97a771](https://github.com/first-fluke/oh-my-agent/commit/c97a7712d61e732fb686b37f79dbb4d51e0febd6))
* restore Star History section to all README files ([5871fa5](https://github.com/first-fluke/oh-my-agent/commit/5871fa550a9768e19527cc62a4353c8dae0194c0))


### Miscellaneous

* **main:** release web 0.3.6 ([5f84b5f](https://github.com/first-fluke/oh-my-agent/commit/5f84b5fad455f1f6b349e8765c167d72aa14542c))
* **main:** release web 0.3.6 ([472ab41](https://github.com/first-fluke/oh-my-agent/commit/472ab41cd124c225200aa87c9ff5fca2e022573b))
* **main:** release web 0.3.7 ([67f596b](https://github.com/first-fluke/oh-my-agent/commit/67f596b4ba7035958fe63a40e6188bbe759e28b0))
* **main:** release web 0.3.7 ([4b390c0](https://github.com/first-fluke/oh-my-agent/commit/4b390c0afd5a4b27132d9bc74187369d21f793e3))

## [4.8.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.7.0...cli-v4.8.0) (2026-03-24)


### Features

* add agent scope violation check to verify command ([339e658](https://github.com/first-fluke/oh-my-agent/commit/339e65846bcebfc4d909ffc1d0e21452d88c0c6c))


### Bug Fixes

* force-remove .agent/ after merge and add migrateToAgents tests ([9dbd6cc](https://github.com/first-fluke/oh-my-agent/commit/9dbd6cc24cbc3c28c7d463308a7bec5b510e3753))


### Refactoring

* remove .agents/brain/ and consolidate output to .agents/results/ ([3760861](https://github.com/first-fluke/oh-my-agent/commit/37608617a133bd688bfb53ed3757634bd01ecad5))


### Miscellaneous

* bump typescript from ^5 to ^6 ([c7f9166](https://github.com/first-fluke/oh-my-agent/commit/c7f91668f091e1cfd80a4fda401dfe1842e62f69))
* sync cli README and add metadata to Manifest type ([fcd00b5](https://github.com/first-fluke/oh-my-agent/commit/fcd00b553493fdabcd22a1eceba8a33e99d59aaf))

## [4.7.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.6.0...cli-v4.7.0) (2026-03-24)


### Features

* add oma-design skill with DESIGN.md workflow and anti-pattern system ([4f7a897](https://github.com/first-fluke/oh-my-agent/commit/4f7a8971c1ecd59509acbfa117d5f8818a421b3b))
* enhance oma-translator with Europeanized patterns and refined mode ([074c63c](https://github.com/first-fluke/oh-my-agent/commit/074c63cbc8ca6baed6f4b7314b2e1cc75240c23b))


### Miscellaneous

* **main:** release web 0.3.5 ([0b79ce6](https://github.com/first-fluke/oh-my-agent/commit/0b79ce66133f23cb9bd9a90cd7c8c69584d87967))
* **main:** release web 0.3.5 ([42b2673](https://github.com/first-fluke/oh-my-agent/commit/42b267389349093b612c76d0738f4372b8722d3b))
* remove completed design plans ([6d7173f](https://github.com/first-fluke/oh-my-agent/commit/6d7173f66c8b7355f047b448757e70e8f50546c2))
* update serena project configuration ([84b5591](https://github.com/first-fluke/oh-my-agent/commit/84b5591185ad3db795e1cd0cf793110cc2123b1a))

## [4.6.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.5.0...cli-v4.6.0) (2026-03-23)


### Features

* auto-enable codex_hooks feature flag on oma install ([fd94cb6](https://github.com/first-fluke/oh-my-agent/commit/fd94cb65a143a91255f8e68d63f7ccccb19fb030))

## [4.5.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.4.0...cli-v4.5.0) (2026-03-23)


### Features

* add OMA HUD statusline for Claude Code ([6f4cbf8](https://github.com/first-fluke/oh-my-agent/commit/6f4cbf8c8d3c7bf43673f88eb194a2f697116a57))


### Bug Fixes

* add plugin hooks.json and tighten orchestrate triggers ([9760f1a](https://github.com/first-fluke/oh-my-agent/commit/9760f1a354d76eeecd2e3d53ecb86b38bef4038b))


### Refactoring

* add HUD to CLAUDE.md template, deduplicate settings merge ([8b812de](https://github.com/first-fluke/oh-my-agent/commit/8b812def8b033ee709976957c9523aad103e27ef))

## [4.4.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.3.1...cli-v4.4.0) (2026-03-23)


### Features

* add Claude Code hooks for automatic workflow detection ([5f18af3](https://github.com/first-fluke/oh-my-agent/commit/5f18af38ecfe7bf4228d121cda5d491ce9f58788))
* add cross-vendor hook support for Codex CLI and Gemini CLI ([9fc8513](https://github.com/first-fluke/oh-my-agent/commit/9fc85130803bc62cef1725b25a39562ad1714419))
* add Qwen Code hook support ([2670f1d](https://github.com/first-fluke/oh-my-agent/commit/2670f1d67ebab627d779426041ca44781a01a18c))


### Bug Fixes

* correct Gemini deny decision and Codex hook paths ([76e1de5](https://github.com/first-fluke/oh-my-agent/commit/76e1de55ce13793fe95b44865018e706041595f3))
* install hooks for all 3 vendors on oma install/update ([1d8f8d1](https://github.com/first-fluke/oh-my-agent/commit/1d8f8d1cba1ecf9054cc910f11957ec8239c8af4))


### Miscellaneous

* **main:** release web 0.3.4 ([2ac2484](https://github.com/first-fluke/oh-my-agent/commit/2ac2484b2be2cedbfc96f45ab4dfc8c940e402e4))
* **main:** release web 0.3.4 ([fcf98ba](https://github.com/first-fluke/oh-my-agent/commit/fcf98ba8d7246091913c948ec8889b2775b27e50))

## [4.3.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.3.0...cli-v4.3.1) (2026-03-22)


### Miscellaneous

* **main:** release action 1.1.0 ([66e9eab](https://github.com/first-fluke/oh-my-agent/commit/66e9eabffe5fd80e3fbbccb5846d0ce548984a6a))

## [4.3.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.2.1...cli-v4.3.0) (2026-03-22)


### Features

* **action:** add GitHub Action for automated oma update ([dc22007](https://github.com/first-fluke/oh-my-agent/commit/dc220070a1c180d3e32b9c2f00eafb2e5c1888b3))


### Documentation

* add brew install oh-my-agent as global installation option ([026169e](https://github.com/first-fluke/oh-my-agent/commit/026169ef10b451fe72461979b13b778026371c83))


### Miscellaneous

* **main:** release web 0.3.3 ([926ae67](https://github.com/first-fluke/oh-my-agent/commit/926ae670118a291c6cbb312738a42d7686ce9bc6))
* **main:** release web 0.3.3 ([4ab0dff](https://github.com/first-fluke/oh-my-agent/commit/4ab0dffabb40634178eda2734c950ab69549edf1))

## [4.2.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.2.0...cli-v4.2.1) (2026-03-22)


### Documentation

* add headers and badges to all README files ([a703c54](https://github.com/first-fluke/oh-my-agent/commit/a703c541dac3c6c1a97adc518ca30843cbe6f809))
* fix all README TOC order and remove outdated content ([b759ddc](https://github.com/first-fluke/oh-my-agent/commit/b759ddc12fe956760307edc110d565efaa79a2c4))
* fix README.md section order ([2c5af23](https://github.com/first-fluke/oh-my-agent/commit/2c5af233dd1aeb0709376a0af25a6d02112221f3))
* fix README.md TOC and section order ([2fd99a4](https://github.com/first-fluke/oh-my-agent/commit/2fd99a43c43e1e40c950f579e61bb79686b268f1))
* reorder all README files to standard structure ([f27f163](https://github.com/first-fluke/oh-my-agent/commit/f27f1632ebf9a39e7b4aa1411a2e1266cbb85b77))
* simplify user-facing documentation and standardize structure ([fcbaad7](https://github.com/first-fluke/oh-my-agent/commit/fcbaad7a19b72a002193a0bb325bed10c3b27085))
* translate Chinese README - remove Korean text ([8210f18](https://github.com/first-fluke/oh-my-agent/commit/8210f185a60155723c391327605d49b01435c5a0))


### Miscellaneous

* **main:** release web 0.3.1 ([3bd7a94](https://github.com/first-fluke/oh-my-agent/commit/3bd7a940283e25a2ccb2b979c34d5cf51786d095))
* **main:** release web 0.3.2 ([5ab400e](https://github.com/first-fluke/oh-my-agent/commit/5ab400e6e5b9d983adac77c9574abbbef1c77f5b))
* **main:** release web 0.3.2 ([0a12651](https://github.com/first-fluke/oh-my-agent/commit/0a12651d193a84c2c862f5204044a95358902573))
* move and sync homebrew formula to cli/ from merged PR ([6f91a28](https://github.com/first-fluke/oh-my-agent/commit/6f91a286a1e1295cde4042085f6103ffb3f0f35d))

## [4.2.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.1.0...cli-v4.2.0) (2026-03-21)


### Features

* add vendor adaptation infrastructure ([d7ab84d](https://github.com/first-fluke/oh-my-agent/commit/d7ab84d2c75234982f761bd512cb88df92aeafcb))


### Bug Fixes

* address reviewer feedback — inject Execution Protocol, remove deprecated calls ([848dca0](https://github.com/first-fluke/oh-my-agent/commit/848dca03d3bb2f9d2b26233cbf67d6e1b840eb49))
* harden parseFrontmatter against inline --- and malformed YAML ([d51c05d](https://github.com/first-fluke/oh-my-agent/commit/d51c05d2b48bf1946d3d0e21e498d5fee84252ab))
* regenerate .claude/agents with correct runtime/ execution protocol path ([bc286e6](https://github.com/first-fluke/oh-my-agent/commit/bc286e6f40b91a2eee7e957c9fe9f53aa5a7f57e))
* simplify parseFrontmatter offset and anchor resultName regex ([7a7e6bc](https://github.com/first-fluke/oh-my-agent/commit/7a7e6bcd62ca9368340d45298cc81a32aaa92021))
* update workflow count to 13, fix commit mapping, clarify skill-routing stage 2 ([1d515d4](https://github.com/first-fluke/oh-my-agent/commit/1d515d44d6a36e478d93e0c34eeb51dd88b000a4))
* use withFileTypes, clearNonDirectory, scope Codex/Gemini docs as planned ([3ccd1c5](https://github.com/first-fluke/oh-my-agent/commit/3ccd1c5f4371f7751f79fbde0dacab890a4c9a6d))
* wire up installVendorAdaptations and fix YAML escaping ([dc43298](https://github.com/first-fluke/oh-my-agent/commit/dc43298213edac608412a4b561698a60584d1ba4))


### Refactoring

* convert .claude/skills/ to thin routers and mark agents as derivatives ([3481a90](https://github.com/first-fluke/oh-my-agent/commit/3481a903bdc6603548348d00d74af44387766684))
* extract abstract agent definitions to .agents/agents/ ([e8cd4b3](https://github.com/first-fluke/oh-my-agent/commit/e8cd4b35c6d6e117951a16ae41756167814a86ea))
* move Execution Protocol to abstract agents with vendor placeholder ([7d3f160](https://github.com/first-fluke/oh-my-agent/commit/7d3f16089cd00cd94b25e05fd98ab67a07856e8f))
* replace keyword-based auto-activation with explicit skill invocation ([6be9ce7](https://github.com/first-fluke/oh-my-agent/commit/6be9ce7f587e96539edf96cd049dbe274b27eb3c))
* unify workflows and agents into .agents/ SSOT ([0195cd8](https://github.com/first-fluke/oh-my-agent/commit/0195cd806cb37aab7f6b15a4e2c4a8fbf3ce571b))
* unify workflows with vendor detection branches ([162e59d](https://github.com/first-fluke/oh-my-agent/commit/162e59dfb0aa54c811919e4bd1a33c485d97aa4b))


### Documentation

* add SSOT workflow unification design and task plan ([f354723](https://github.com/first-fluke/oh-my-agent/commit/f3547239c7875b496fec16d205ee65fd2b697eb0))
* update docs and README for SSOT unification ([72b7a71](https://github.com/first-fluke/oh-my-agent/commit/72b7a71c13b0903658352e3fc16066e0903acd4d))

## [4.1.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v4.0.0...cli-v4.1.0) (2026-03-21)


### Features

* detect and offer to remove competing oh-my-* tools on install/update ([bfc0118](https://github.com/first-fluke/oh-my-agent/commit/bfc0118654fe896bb90e9516a9e00917f5b604ae))

## [4.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v3.0.0...cli-v4.0.0) (2026-03-21)


### ⚠ BREAKING CHANGES

* oma-backend resources directory restructured with language-specific files moved to variants/ subdirectories.

### Features

* add /stack-set workflow and Node.js/Rust presets ([438d5fd](https://github.com/first-fluke/oh-my-agent/commit/438d5fd734bb1d0672616e626f333522a299839f))
* add language variant selection to CLI install/update ([a62f81d](https://github.com/first-fluke/oh-my-agent/commit/a62f81dd83061c62f2eb94491968328d18bd9ce8))


### Bug Fixes

* address code review findings ([e395bce](https://github.com/first-fluke/oh-my-agent/commit/e395bce6ac3434f493eff0a912b5cfcdc57aba53))
* address reviewer feedback on PR [#123](https://github.com/first-fluke/oh-my-agent/issues/123) ([bd1ba25](https://github.com/first-fluke/oh-my-agent/commit/bd1ba2570b43367c447ab08766c765b80aabd1ce))
* correct preset tables, auth commands, and shared layout migration ([27d6bb0](https://github.com/first-fluke/oh-my-agent/commit/27d6bb04ccd19d3b7d5fca327ced4bddaa9abcfa))
* detect legacy files before cpSync in update migration ([b88c7f4](https://github.com/first-fluke/oh-my-agent/commit/b88c7f4713b27d7b57a4386322ad7d4a2dc540c2))
* read migration variant from repoDir and move variants/ cleanup after migration ([8f16788](https://github.com/first-fluke/oh-my-agent/commit/8f16788b05a257c23110e6e44e57bb3c5f0d51bc))


### Refactoring

* abstract oma-backend skill to be language-agnostic ([efe842e](https://github.com/first-fluke/oh-my-agent/commit/efe842e4ecf9eedaab97454c8de02678fe371a83))
* abstract oma-backend to language-agnostic skill ([a3bdb1c](https://github.com/first-fluke/oh-my-agent/commit/a3bdb1ccd81eadf0118aed4aa21794ddfff0cfe9))


### Documentation

* add dev commands and clarify SSOT rules in CLAUDE.md ([bcddda6](https://github.com/first-fluke/oh-my-agent/commit/bcddda63bfc10d6d3518d5200fd1aa69da8060f8))
* update documentation for backend stack abstraction ([2dc7743](https://github.com/first-fluke/oh-my-agent/commit/2dc77436cbd779f73f5ccaafa9ae243997af0b66))


### Miscellaneous

* **main:** release web 0.3.0 ([3544d60](https://github.com/first-fluke/oh-my-agent/commit/3544d60c3395fe16f5806249d5fd6c63d86a933d))
* resolve merge conflicts with main shared layout restructure ([d6eff72](https://github.com/first-fluke/oh-my-agent/commit/d6eff72f5bef2b7731d2e23b2f3854ae396ac262))

## [3.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.12.0...cli-v3.0.0) (2026-03-21)


### ⚠ BREAKING CHANGES

* All skill directory names changed from `{domain}-agent` to `oma-{domain}` prefix (e.g. `backend-agent` → `oma-backend`). Agent files renamed from `-impl` to role names (e.g. `backend-impl` → `backend-engineer`). `workflow-guide` renamed to `oma-coordination`.

### Refactoring

* rename skills to oma-* prefix and agents to role-based names ([766b1e2](https://github.com/first-fluke/oh-my-agent/commit/766b1e208f8397fd0835803e69b71b9a03a32ce4))

## [2.12.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.11.3...cli-v2.12.0) (2026-03-21)


### Features

* add autoresearch-inspired protocols with full infrastructure compatibility ([84b0c4d](https://github.com/first-fluke/oh-my-agent/commit/84b0c4d31e61ef4759ffd13bffc252d1f1e80e81))
* autoresearch-inspired protocols v2 (infrastructure-compatible) ([2bc9b9c](https://github.com/first-fluke/oh-my-agent/commit/2bc9b9cf6fdb5a817b41652309f88fdd993f15f4))
* **cli:** add auth:status command and integrate auth checks into doctor ([cdeaf53](https://github.com/first-fluke/oh-my-agent/commit/cdeaf53675ba83b9e68bda83443ebc5fe434357a))


### Miscellaneous

* **main:** release web 0.2.7 ([1a4a1cd](https://github.com/first-fluke/oh-my-agent/commit/1a4a1cd7eae4eeec868ff1b8cfd6cdd0340c56e9))

## [2.11.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.11.2...cli-v2.11.3) (2026-03-18)


### Bug Fixes

* **demo:** use Hack Nerd Font for VHS recording ([b16bdd7](https://github.com/first-fluke/oh-my-agent/commit/b16bdd711e38ba4c58bca589926d8d5488480839))

## [2.11.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.11.1...cli-v2.11.2) (2026-03-18)


### Documentation

* **skills:** modernize frontend-agent stack and fix inconsistencies ([b4622a1](https://github.com/first-fluke/oh-my-agent/commit/b4622a1387d7b43f5bb8912a5d87e702d829c497))
* **web:** add missing agents and workflows across all 11 languages ([998924f](https://github.com/first-fluke/oh-my-agent/commit/998924fb38da8ec59cb93910217c40f149d478b7))


### Miscellaneous

* **main:** release web 0.2.6 ([ace79de](https://github.com/first-fluke/oh-my-agent/commit/ace79ded4d27b3be80aa114a14f9523cf485f1af))
* **main:** release web 0.2.6 ([30567fa](https://github.com/first-fluke/oh-my-agent/commit/30567fae104344798881e2cb19bc616303246158))

## [2.11.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.11.0...cli-v2.11.1) (2026-03-18)


### Refactoring

* **skills:** standardize dev-workflow and translator SKILL.md format ([dee1234](https://github.com/first-fluke/oh-my-agent/commit/dee12349fcaa3bc4e9ab523002bdb4e337f68202))

## [2.11.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.10.2...cli-v2.11.0) (2026-03-18)


### Features

* **cli:** preserve user-customized config files during update ([bb80216](https://github.com/first-fluke/oh-my-agent/commit/bb802168834343b5bc108601ef39edcc83d9d322))


### Bug Fixes

* align marketplace plugin name with plugin.json ([f82f871](https://github.com/first-fluke/oh-my-agent/commit/f82f8715042cf29dc0ef8990607085d06b37af77))


### Refactoring

* **cli:** remove non-null assertions and fix lint issues ([0c76aa4](https://github.com/first-fluke/oh-my-agent/commit/0c76aa4f000718789fc0b39aea0d8df8dff6a652))

## [2.10.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.10.1...cli-v2.10.2) (2026-03-17)


### Bug Fixes

* remove slash from marketplace plugin name ([8ea9616](https://github.com/first-fluke/oh-my-agent/commit/8ea9616b6420405e797bb477ac4509ae740506d0))
* remove slash from marketplace plugin name ([686250c](https://github.com/first-fluke/oh-my-agent/commit/686250ccc9888a9dc77e09a65f1d22a7ef04b650))
* remove slash from marketplace plugin name ([15b1d0e](https://github.com/first-fluke/oh-my-agent/commit/15b1d0e5898e820ee7df2e00335617411469e1e8))

## [2.10.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.10.0...cli-v2.10.1) (2026-03-17)


### Bug Fixes

* **cli:** handle existing symlinks during reinstallation ([adf43a2](https://github.com/first-fluke/oh-my-agent/commit/adf43a29b640e171307fe0942f0e4ecd5dea405a))


### Miscellaneous

* **main:** release web 0.2.5 ([8471872](https://github.com/first-fluke/oh-my-agent/commit/847187209bfe721e3d452b376238e9fe153e1c24))
* **main:** release web 0.2.5 ([8ef6562](https://github.com/first-fluke/oh-my-agent/commit/8ef6562bbeb3615f9b2c546933f9a3852332cce8))

## [2.10.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.9.1...cli-v2.10.0) (2026-03-16)


### Features

* **cli:** sync CLI version from package.json and auto-bump Homebrew formula ([de179a1](https://github.com/first-fluke/oh-my-agent/commit/de179a149e58b1c43476f4f394322ea5992f9211))
* **skills:** add translator skill with anti-AI pattern detection ([1c62625](https://github.com/first-fluke/oh-my-agent/commit/1c62625c24eae78b12d839dcc5284421a956c820))


### Bug Fixes

* **ci:** extract homebrew bump to manual workflow and update formula ([7e57bac](https://github.com/first-fluke/oh-my-agent/commit/7e57bac22a808bb184a52c273c837a6973bd2362))
* **docs:** improve all 10 README translations with anti-AI patterns ([bef08a5](https://github.com/first-fluke/oh-my-agent/commit/bef08a5a77bd547b04f144c7a94548fe9812ac30))


### Refactoring

* **skills:** restructure tf-infra-agent to match standard skill pattern ([cf1b8f7](https://github.com/first-fluke/oh-my-agent/commit/cf1b8f7f1b83061296541e20112b2740979933ff))

## [2.9.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.9.0...cli-v2.9.1) (2026-03-15)


### Performance

* **cli:** replace individual file downloads with tarball extraction ([f1a1927](https://github.com/first-fluke/oh-my-agent/commit/f1a19273888bfcaa821ef59d754621ec4f2f3606))

## [2.9.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.8.1...cli-v2.9.0) (2026-03-15)


### Features

* **plugin:** add Claude Code plugin manifest and marketplace ([91d9c1b](https://github.com/first-fluke/oh-my-agent/commit/91d9c1ba0db9e9ad6af5f2651dcb8d36f227fb93))

## [2.8.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.8.0...cli-v2.8.1) (2026-03-15)


### Refactoring

* **cli:** remove image export from visualize command ([a3b313c](https://github.com/first-fluke/oh-my-agent/commit/a3b313c98b43b038090cc8c879126f2ad523e799))


### Miscellaneous

* update lockfile after removing @resvg/resvg-js ([433c19d](https://github.com/first-fluke/oh-my-agent/commit/433c19d4e8e5b6e82eb289a0d27c2745870ac992))

## [2.8.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.7.0...cli-v2.8.0) (2026-03-15)


### Features

* **cli:** add visualize command for dependency graph ([e8ea4aa](https://github.com/first-fluke/oh-my-agent/commit/e8ea4aa2142675485460bd5f5ee9cbb8337174ee))

## [2.7.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.6.0...cli-v2.7.0) (2026-03-15)


### Features

* **cli:** install Claude Code native skills and agents on install/update ([2fd5627](https://github.com/first-fluke/oh-my-agent/commit/2fd562760e8a3a1ac8b1f1cb3b5f23a86193792e))


### Refactoring

* **claude-skills:** make all skills self-contained, remove Required Reading indirection ([ef3868d](https://github.com/first-fluke/oh-my-agent/commit/ef3868d85e529071ab221e8ea53df9791c8ee4c1))

## [2.6.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.5.0...cli-v2.6.0) (2026-03-15)


### Features

* **cli:** enhance retro command with rich metrics, time windows, and compare mode ([ad901aa](https://github.com/first-fluke/oh-my-agent/commit/ad901aad4e9d158e9ae7ce74e348ce27eedd1399))


### Documentation

* remove redundant integration option from README ([05ee5ab](https://github.com/first-fluke/oh-my-agent/commit/05ee5ab177f37e4b16df78d8c7961a06e9e60102))
* remove workflow-guide from README graphs and tables ([22955be](https://github.com/first-fluke/oh-my-agent/commit/22955befc30b9288bc7c1d9e9e2e189133d38cc9))


### Miscellaneous

* **claude-agents:** translate Korean skill and agent descriptions to English ([1ec0b22](https://github.com/first-fluke/oh-my-agent/commit/1ec0b22558ee20268ce2935e630516ba5e0c434a))
* sync prompt-manifest.json [skip ci] ([54ae747](https://github.com/first-fluke/oh-my-agent/commit/54ae74758e6941e4efd52707e719178bd7db9f39))
* sync prompt-manifest.json [skip ci] ([7325bf7](https://github.com/first-fluke/oh-my-agent/commit/7325bf786e5c7746cb7639d813d9dd0e9426d430))

## [2.5.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.4.2...cli-v2.5.0) (2026-03-14)


### Features

* **claude:** add native Claude Code adapter layer with skills, agents, and orchestration loops ([2a2cce0](https://github.com/first-fluke/oh-my-agent/commit/2a2cce095423e8a58aec0495f74db7cf2f605da8))


### Documentation

* update compatibility tables and specs for Claude Code native integration ([28f5827](https://github.com/first-fluke/oh-my-agent/commit/28f58279ec9090877212c43da4b72f925c7ef128))


### Miscellaneous

* sync prompt-manifest.json [skip ci] ([b4db9ea](https://github.com/first-fluke/oh-my-agent/commit/b4db9ea1f826b9e5d62c6412358ffcec4efae72f))

## [2.4.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.4.1...cli-v2.4.2) (2026-03-14)


### Documentation

* **backend-agent:** add ORM guidance ([f9a9339](https://github.com/first-fluke/oh-my-agent/commit/f9a93393dc55c40e88db7d34b32cc2913e88a07e))


### Miscellaneous

* sync prompt-manifest.json [skip ci] ([adbd40f](https://github.com/first-fluke/oh-my-agent/commit/adbd40fffab3a80f6f69ac0a9cf84ca6b0c3ce9d))

## [2.4.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.4.0...cli-v2.4.1) (2026-03-13)


### Documentation

* add .agents spec and compatibility positioning ([54608d8](https://github.com/first-fluke/oh-my-agent/commit/54608d87abcf95a61e48acc48aeb161253041dea))
* sync localized readmes and remove uk docs ([3808917](https://github.com/first-fluke/oh-my-agent/commit/3808917ced96721766535e7b17fc39436d3fbd36))
* update translated README titles and descriptions ([5a10620](https://github.com/first-fluke/oh-my-agent/commit/5a1062055bc9286c2f3e418d22772e38eb65af4d))


### Miscellaneous

* **main:** release web 0.2.4 ([113a056](https://github.com/first-fluke/oh-my-agent/commit/113a056fab411ba71ea478a02d041251df7aa00b))
* sync prompt-manifest.json [skip ci] ([0eb09b2](https://github.com/first-fluke/oh-my-agent/commit/0eb09b2659c30a7346a8ac6f95d8fcbff933e808))

## [2.4.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.3.0...cli-v2.4.0) (2026-03-13)


### Features

* **skills:** add db-agent with vector retrieval guidance ([f433c18](https://github.com/first-fluke/oh-my-agent/commit/f433c184efa72f95c49ce8616ead7fad9b1be6eb))
* **skills:** add ISO guidance across core agents ([58ce1af](https://github.com/first-fluke/oh-my-agent/commit/58ce1afe7e6b663210c0a9ea5b888db67419daa7))


### Miscellaneous

* sync prompt-manifest.json [skip ci] ([5010329](https://github.com/first-fluke/oh-my-agent/commit/50103293e06e9272349af9a883098e68e279b60d))
* sync prompt-manifest.json [skip ci] ([77c800f](https://github.com/first-fluke/oh-my-agent/commit/77c800f1a167b3e15cfeb62ce087efee83ef24cb))

## [2.3.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.2.0...cli-v2.3.0) (2026-03-13)


### Features

* **cli:** auto-create .claude/skills/ symlinks without prompting ([05e24d3](https://github.com/first-fluke/oh-my-agent/commit/05e24d3f0d80c1bd209bd3c803e2f950d10c64bb))


### Bug Fixes

* **ci:** prevent release-please race with sync-manifest workflow ([9135cee](https://github.com/first-fluke/oh-my-agent/commit/9135cee38d4b00c14f21b89a6562894b74303d39))
* **cli:** sync npm readme from root ([1a6112f](https://github.com/first-fluke/oh-my-agent/commit/1a6112fd3ca31fd360bc8fa9beb5d719f26ba1b9))
* **docs:** escape pipe character in curl command for proper markdown table rendering ([4c47f4d](https://github.com/first-fluke/oh-my-agent/commit/4c47f4dbe2dd9c098d212d064ad4c9373486bb68))
* **test:** use dynamic version comparison in metadata test ([3ce8fbf](https://github.com/first-fluke/oh-my-agent/commit/3ce8fbf68951be7e7bdd634ecb37478130c9b19d))


### Refactoring

* **skill:** rename developer-workflow to dev-workflow ([00b019f](https://github.com/first-fluke/oh-my-agent/commit/00b019fd25da33dcfcd2df54941539e89b7afb1a))


### Documentation

* add blank line between badges and language switcher ([4deb9b7](https://github.com/first-fluke/oh-my-agent/commit/4deb9b76351dd151ddaea8ed80043452a93d971d))
* add npm, stars, license, and last-updated badges to all READMEs ([8d799ab](https://github.com/first-fluke/oh-my-agent/commit/8d799ab26948635fb0df1bc4fb3e921d9a528fe2))
* clarify subtitle as 'The Ultimate Agent Orchestrator' ([9de9776](https://github.com/first-fluke/oh-my-agent/commit/9de9776699bde00cb4ba0c05fb12a247db64d556))
* license ([838fb60](https://github.com/first-fluke/oh-my-agent/commit/838fb602da61bfe871f5e9db8fed3afc2f64e734))
* swap Harness/Orchestrator naming (Harness=title, Orchestrator=description) ([6687245](https://github.com/first-fluke/oh-my-agent/commit/6687245d0dc5a063c09ce9674959108e790b7d1e))
* translate 'Agent Orchestrator' in all languages ([25ce948](https://github.com/first-fluke/oh-my-agent/commit/25ce948e08ed38cfa604d4838d17bd154f7e9190))


### Miscellaneous

* sync prompt-manifest.json [skip ci] ([c5ab9c6](https://github.com/first-fluke/oh-my-agent/commit/c5ab9c699f21fb86738b091a682559f55afde2eb))

## [2.2.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.1.0...cli-v2.2.0) (2026-03-13)


### Features

* **cli:** add DevOps preset to install wizard ([e428529](https://github.com/first-fluke/oh-my-agent/commit/e428529010aca69be8d08796afc7b328d747042d))


### Miscellaneous

* sync prompt-manifest.json ([88983ff](https://github.com/first-fluke/oh-my-agent/commit/88983ffc8943afd64c766165419bfc730bd5b88d))

## [2.1.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.8...cli-v2.1.0) (2026-03-13)


### Features

* **cli:** restore Claude Code and GitHub Copilot symlink prompt during install ([db93945](https://github.com/first-fluke/oh-my-agent/commit/db93945aa337dae1874ca7de91831720ee4f95b8))
* **cli:** show contextual support message based on star status ([42d7b19](https://github.com/first-fluke/oh-my-agent/commit/42d7b198bc1519ef523d7fa4a1d1d9d7e95497fb))


### Miscellaneous

* sync prompt-manifest.json ([9d51af1](https://github.com/first-fluke/oh-my-agent/commit/9d51af154f70ed30751dab07784b5a926b04b473))

## [2.0.8](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.7...cli-v2.0.8) (2026-03-13)


### Documentation

* add Antigravity as first AI IDE in README files ([80b1099](https://github.com/first-fluke/oh-my-agent/commit/80b1099bbf597b5a2506e6e97c1d22b265cb6ab8))


### Miscellaneous

* sync prompt-manifest.json ([7fec362](https://github.com/first-fluke/oh-my-agent/commit/7fec362c7f200ddb47f98e81681a88dcdc8d7de9))

## [2.0.7](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.6...cli-v2.0.7) (2026-03-13)


### Refactoring

* vendor-agnostic execution protocol injection ([61fc225](https://github.com/first-fluke/oh-my-agent/commit/61fc2259ec0c5294db9c994ef266d745e722bbbe))


### Miscellaneous

* sync prompt-manifest.json ([8b9ca59](https://github.com/first-fluke/oh-my-agent/commit/8b9ca597c3b3b906a7cdc0854aaf591e8a4e20dc))

## [2.0.6](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.5...cli-v2.0.6) (2026-03-13)


### Miscellaneous

* **release:** deprecate legacy npm package ([2b3ae4a](https://github.com/first-fluke/oh-my-agent/commit/2b3ae4a9451627af1e37312cef99919300f6f70b))
* sync prompt-manifest.json ([23d73a6](https://github.com/first-fluke/oh-my-agent/commit/23d73a64683ca207b7e6fe77090ae2ff9c5ebbc9))

## [2.0.5](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.4...cli-v2.0.5) (2026-03-13)


### Bug Fixes

* **release:** remove legacy publish lifecycle scripts ([26ac606](https://github.com/first-fluke/oh-my-agent/commit/26ac6061e7b37c8c3e6b021fe270b99fbd38553e))


### Miscellaneous

* sync prompt-manifest.json ([3adacce](https://github.com/first-fluke/oh-my-agent/commit/3adacced034a247cedb0d4a49d8f854adb58a3af))

## [2.0.4](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.3...cli-v2.0.4) (2026-03-13)


### Bug Fixes

* **release:** allow legacy publish without license file ([6c69839](https://github.com/first-fluke/oh-my-agent/commit/6c698394b23327bbc7bcff24076d5cc4d4440fcb))


### Miscellaneous

* sync prompt-manifest.json ([87b0e4d](https://github.com/first-fluke/oh-my-agent/commit/87b0e4d1b6c95cb6ca6e491a63133a8361ef7c3f))

## [2.0.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.2...cli-v2.0.3) (2026-03-13)


### Documentation

* update Claude CLI installation command to official bash script ([2e5e6aa](https://github.com/first-fluke/oh-my-agent/commit/2e5e6aa1ce2ced32c00a94346182ae6ae1af6aa3))


### Miscellaneous

* **main:** release web 0.2.3 ([a36c653](https://github.com/first-fluke/oh-my-agent/commit/a36c653b2a58891da0582ea8a7f2ec767daca722))
* **main:** release web 0.2.3 ([d13385f](https://github.com/first-fluke/oh-my-agent/commit/d13385f2df7936fb86df1115cf4493c4aec27023))
* **release:** publish legacy oh-my-ag package ([320edb2](https://github.com/first-fluke/oh-my-agent/commit/320edb26a0b8e649d3f47a972152d7bede35c1a6))
* sync prompt-manifest.json ([22bc45c](https://github.com/first-fluke/oh-my-agent/commit/22bc45c0c944661044f38e51144f1cef46ec09ce))

## [2.0.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.1...cli-v2.0.2) (2026-03-13)


### Bug Fixes

* **ci:** refine release-please publish flow ([1c98953](https://github.com/first-fluke/oh-my-agent/commit/1c989531d7df063bc216634e37871d4c9e05fa24))
* **deps:** sync bun lockfile metadata ([d46dff4](https://github.com/first-fluke/oh-my-agent/commit/d46dff44cbacbf98f93d5aeb0aec34ad5d8e6294))


### Documentation

* update usage command references to usage:anti in CHANGELOG ([d739d2c](https://github.com/first-fluke/oh-my-agent/commit/d739d2cf07bac097cfefdc8e939bb025ebb7599b))
* update usage command to usage:anti across all documentation ([c696920](https://github.com/first-fluke/oh-my-agent/commit/c6969203005ce46eae40d5a3fd0ccea77c0cba84))


### Miscellaneous

* **main:** release web 0.2.2 ([a24121d](https://github.com/first-fluke/oh-my-agent/commit/a24121dfc8f4913ba73a914674826109afdc06e0))
* **main:** release web 0.2.2 ([821d1bb](https://github.com/first-fluke/oh-my-agent/commit/821d1bb7bd9953237be4d5e59def00f3207d6d0f))
* sync prompt-manifest.json ([e3db65d](https://github.com/first-fluke/oh-my-agent/commit/e3db65d410920aba196ba3242a3c39a1215e1c02))
* sync prompt-manifest.json ([43dc2b6](https://github.com/first-fluke/oh-my-agent/commit/43dc2b6b3ac922477acda6e32e7f0fd0e42d9f2b))

## [2.0.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v2.0.0...cli-v2.0.1) (2026-03-13)


### Miscellaneous

* **main:** release web 0.2.1 ([43b65bd](https://github.com/first-fluke/oh-my-agent/commit/43b65bd5bf0201d383cfb2bbc98f7b5c8c15ec42))
* **main:** release web 0.2.1 ([f9fd4b2](https://github.com/first-fluke/oh-my-agent/commit/f9fd4b23fefe9adf5c475ef5d22a706f33192ecb))
* rename project to oh-my-agent ([9d6edbf](https://github.com/first-fluke/oh-my-agent/commit/9d6edbf46e49e14df817f6a5baabfee7719690f2))
* sync prompt-manifest.json ([f04e473](https://github.com/first-fluke/oh-my-agent/commit/f04e473b951988f4e76f0ea7c346a6004d261abe))
* sync prompt-manifest.json ([7969a6f](https://github.com/first-fluke/oh-my-agent/commit/7969a6f4805cf1e043d3d45d21f909d413e378df))

## [2.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.29.0...cli-v2.0.0) (2026-03-13)


### ⚠ BREAKING CHANGES

* .agents/ replaces .agent/ as the canonical root directory. Cursor and Antigravity now natively support .agents/, so legacy symlinks (.cursor/skills/, .claude/skills/, .github/skills/) are no longer needed.

### Features

* adopt .agents/ as canonical root with auto-migration ([a2ade10](https://github.com/first-fluke/oh-my-agent/commit/a2ade10bb92be61d2d8f4b433b9f00481a900c56))
* **cli:** add oma command alias ([c7a8a6b](https://github.com/first-fluke/oh-my-agent/commit/c7a8a6b7fd1bdd83b4db64e339bf0ce48a13e746))
* **skills:** apply harness engineering patterns ([f73405a](https://github.com/first-fluke/oh-my-agent/commit/f73405a184aee8a3745154a5df9b242baf8d7d15))


### Bug Fixes

* correct manifest version lookup for release-please key change ([aab419f](https://github.com/first-fluke/oh-my-agent/commit/aab419f07dd21103681e864189cf56d7bb74a964))
* correct release-please extra file paths ([ae0da99](https://github.com/first-fluke/oh-my-agent/commit/ae0da997514a5e727028ccf17c7be070adf64b0c))
* route all non-web commits to cli release ([26c4753](https://github.com/first-fluke/oh-my-agent/commit/26c4753204e62ba950ed8f8f57a5cc71e8db31fe))


### Refactoring

* rename .agent/ to .agents/ as canonical root ([ca3ca3f](https://github.com/first-fluke/oh-my-agent/commit/ca3ca3f658ed3ead256dad96dc1196b92d8a81c6))
* **workflow:** redesign deepinit as harness initializer ([568f332](https://github.com/first-fluke/oh-my-agent/commit/568f3321d37672f8b7430a33ee6b2c9708de36dc))


### Miscellaneous

* **main:** release web 0.2.0 ([5609d11](https://github.com/first-fluke/oh-my-agent/commit/5609d11ed3b19d82cdca9d328e61ff1a1db8d27f))
* **main:** release web 0.2.0 ([d1cc988](https://github.com/first-fluke/oh-my-agent/commit/d1cc988288361588e04846f6c470fb601efe4536))
* sync prompt-manifest.json ([c442789](https://github.com/first-fluke/oh-my-agent/commit/c442789f5850c77ce6f38d23105aadf982432b1c))
* sync prompt-manifest.json ([884fc20](https://github.com/first-fluke/oh-my-agent/commit/884fc20c3197ccbbdc1a32b5fdc3b6f6afe04bd0))
* sync prompt-manifest.json ([82f05bf](https://github.com/first-fluke/oh-my-agent/commit/82f05bf30c1fd5f93bcb1738253e910e8a900021))

## [1.29.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.28.0...cli-v1.29.0) (2026-03-11)


### Features

* switch skills ssot to .agents ([c4b63a2](https://github.com/first-fluke/oh-my-agent/commit/c4b63a295e96aa471cf575495bc048cf0e3cda69))

## [1.28.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.27.0...cli-v1.28.0) (2026-03-11)


### Features

* **cli:** improve agent-facing ergonomics ([ca6661d](https://github.com/first-fluke/oh-my-agent/commit/ca6661d9e66f18868807b3f304ca59927b0af053))

## [1.27.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.26.2...cli-v1.27.0) (2026-03-08)


### Features

* **cli:** add star command for GitHub starring with gh CLI integration ([de28489](https://github.com/first-fluke/oh-my-agent/commit/de28489d3e8cdb185a307060061398148d2a3898))

## [1.26.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.26.1...cli-v1.26.2) (2026-03-08)


### Refactoring

* rename terraform-infra-engineer to tf-infra-agent ([3c03852](https://github.com/first-fluke/oh-my-agent/commit/3c03852ef473a5e307ce7d497e15d16bbf89b468))

## [1.26.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.26.0...cli-v1.26.1) (2026-03-08)


### Bug Fixes

* **cli:** correct release-please extra-files paths for root-level manifest ([ecd18f1](https://github.com/first-fluke/oh-my-agent/commit/ecd18f1d333f90d5fc19845fb52d104eeafc2b25))

## [1.26.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.25.1...cli-v1.26.0) (2026-03-08)


### Features

* add brainstorm skill for design-first ideation pipeline ([7fd31b8](https://github.com/first-fluke/oh-my-agent/commit/7fd31b8800046a51121d33ba0dc72e75f713db06))

## [1.25.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.25.0...cli-v1.25.1) (2026-03-04)


### Miscellaneous

* **cli:** bump package version to 1.25.1 ([3bcb4d4](https://github.com/first-fluke/oh-my-agent/commit/3bcb4d4bf09a5d8582b03e89fb7859299200dd06))
* **cli:** update dependencies to latest ([e73285a](https://github.com/first-fluke/oh-my-agent/commit/e73285a2aca442d4c596e2ddcc2b6541e0b210ef))

## [1.25.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.24.0...cli-v1.25.0) (2026-02-19)


### Features

* broaden dashboard file filtering to all markdown files and enhance activity name parsing by removing additional prefixes and suffixes ([513d0ec](https://github.com/first-fluke/oh-my-agent/commit/513d0ec8bc647b0311528f1c3156a3d42631f62a))

## [1.24.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.23.0...cli-v1.24.0) (2026-02-19)


### Features

* **cleanup:** add Gemini directory cleanup with -y flag ([061d193](https://github.com/first-fluke/oh-my-agent/commit/061d193b4f3b20eebf411ae3c190d75de37c6a7d))
* **cli:** add agent:parallel command to replace parallel-run.sh ([1527d6b](https://github.com/first-fluke/oh-my-agent/commit/1527d6b5619c98ba28fbe9a1ea9b7a3466085be2))
* **cli:** add Cursor (.cursor/skills/) support to install, update, doctor ([b699b29](https://github.com/first-fluke/oh-my-agent/commit/b699b299bc2e8e531223ae70db8798ea3881e7a0))
* **cli:** add help and version commands ([cdba845](https://github.com/first-fluke/oh-my-agent/commit/cdba84527627b859723a55d0add1431a0342db29))
* **cli:** add infrastructure skills category with terraform and mise support ([48cae1a](https://github.com/first-fluke/oh-my-agent/commit/48cae1aa3113608b99259b2d8397c80581c1d185))
* **cli:** add multi-CLI symlink support for skills ([dc29b6d](https://github.com/first-fluke/oh-my-agent/commit/dc29b6d23ae4a53aefbd0ac9a16a34437bc28ab6))
* **doctor:** add symlink validation for multi-CLI setup ([1d6fa4f](https://github.com/first-fluke/oh-my-agent/commit/1d6fa4fa51e39ba7beb20c964ce876397b218c6c))
* merge OpenCode/Amp/Codex options and add GitHub Copilot support ([b2e7fa1](https://github.com/first-fluke/oh-my-agent/commit/b2e7fa1d8e6f748cfdf92f351d8f5d72f81eded6))
* split cli/web workspaces and docs release flow ([5609032](https://github.com/first-fluke/oh-my-agent/commit/5609032bf657e4e4d71e0acaa2e319effcdf8a35))
* **update:** auto-update CLI symlinks when updating skills ([fe6a99c](https://github.com/first-fluke/oh-my-agent/commit/fe6a99c6a0ce49ad6355ba0a210271c31d944e30))


### Bug Fixes

* **cli:** fetch reference files during skill installation ([05be60d](https://github.com/first-fluke/oh-my-agent/commit/05be60d19c7738cdb914afc29e7f85dd42c3a294))
* **cli:** use SKILLS registry whitelist for symlink creation ([8f87501](https://github.com/first-fluke/oh-my-agent/commit/8f875015993a011316b4e018a4ae9979b5c518b8))
* OpenCode, Amp, Codex all use .agents/skills/ ([ed4f9bd](https://github.com/first-fluke/oh-my-agent/commit/ed4f9bdf688d69620af22bc27234b0f7f8b0182e))
* resolve user-preferences.yaml by walking up parent directories ([0d1d68b](https://github.com/first-fluke/oh-my-agent/commit/0d1d68b0bd2d6e4922f35005f34f770698f7bdac))
* update Codex skills path from .codex/skills to .agents/skills ([8c30a97](https://github.com/first-fluke/oh-my-agent/commit/8c30a97cbe29d7117aa13322b11acad011a1a03d))


### Refactoring

* rename references to resources and add dynamic file fetching ([7493587](https://github.com/first-fluke/oh-my-agent/commit/7493587fcaff96e9109ca5989932c6fb7b3c9ee2))
* **skills:** rename mise-devops-runner to dev-workflow ([7a34b46](https://github.com/first-fluke/oh-my-agent/commit/7a34b46c44b060afc08c1634e6b66bedb54a5035))


### Miscellaneous

* **main:** release cli 1.15.0 ([5deacf7](https://github.com/first-fluke/oh-my-agent/commit/5deacf780afe674d37f8f8064cbf4b16c9a1477e))
* **main:** release cli 1.15.0 ([1f23594](https://github.com/first-fluke/oh-my-agent/commit/1f23594723e81caf084ef2ae14ed6b41febb1c53))
* **main:** release cli 1.16.0 ([7130613](https://github.com/first-fluke/oh-my-agent/commit/71306130547405288acb1801c0c38ab31a1daf90))
* **main:** release cli 1.16.0 ([ccba318](https://github.com/first-fluke/oh-my-agent/commit/ccba318b0afeeb1e6a9b6a7e9aadeeaad324fa3f))
* **main:** release cli 1.17.0 ([1aefed4](https://github.com/first-fluke/oh-my-agent/commit/1aefed40880be3bceac390d1220833977a48a315))
* **main:** release cli 1.17.0 ([26c70b2](https://github.com/first-fluke/oh-my-agent/commit/26c70b262ac37e0d752d9610d0e29a643ee892c7))
* **main:** release cli 1.18.0 ([4226997](https://github.com/first-fluke/oh-my-agent/commit/4226997393e3dc02b26767a67027c16f564521eb))
* **main:** release cli 1.18.0 ([fec3d99](https://github.com/first-fluke/oh-my-agent/commit/fec3d99344e205945c86853c14a8a858c63f2937))
* **main:** release cli 1.19.0 ([7bde6b6](https://github.com/first-fluke/oh-my-agent/commit/7bde6b6cfcf056c86d37bc8e3b8398b00a8cf7b1))
* **main:** release cli 1.19.0 ([a5c0ce3](https://github.com/first-fluke/oh-my-agent/commit/a5c0ce31feb8c2d18a70fb24b84e3c04bf91a8f3))
* **main:** release cli 1.20.0 ([6eb44db](https://github.com/first-fluke/oh-my-agent/commit/6eb44dbb6e76a1290c6606dcf12d94a4453793d2))
* **main:** release cli 1.20.0 ([18109b2](https://github.com/first-fluke/oh-my-agent/commit/18109b22d8ac23ad1499ec42390c111912eebbc7))
* **main:** release cli 1.20.1 ([ef2c038](https://github.com/first-fluke/oh-my-agent/commit/ef2c03846271c392b7e578ad404415a459d0bae2))
* **main:** release cli 1.20.1 ([35eb769](https://github.com/first-fluke/oh-my-agent/commit/35eb769a556c34bfa4a5bbef2f56daec6c7ec997))
* **main:** release cli 1.21.0 ([cb2094f](https://github.com/first-fluke/oh-my-agent/commit/cb2094ff1fbeb6a57a6522375ee2db5141e0ecb5))
* **main:** release cli 1.21.0 ([306d85b](https://github.com/first-fluke/oh-my-agent/commit/306d85b67cc48e5319b26c911a746efaf7810d0d))
* **main:** release cli 1.21.1 ([511309d](https://github.com/first-fluke/oh-my-agent/commit/511309d3f69884ca85c4193678816d826efadb0c))
* **main:** release cli 1.21.1 ([cd453d6](https://github.com/first-fluke/oh-my-agent/commit/cd453d631f3232c3c1820239531100a693e92bf0))
* update CLI hints to show shared directories ([c0e78a2](https://github.com/first-fluke/oh-my-agent/commit/c0e78a221ab1a297affb9c91a9690efbf5978360))
* version sync 1.23.0 ([6d09e9a](https://github.com/first-fluke/oh-my-agent/commit/6d09e9ab5dd4209c4e957210da0b511f2c943a58))

## [1.21.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.21.0...cli-v1.21.1) (2026-02-15)


### Bug Fixes

* resolve user-preferences.yaml by walking up parent directories ([0d1d68b](https://github.com/first-fluke/oh-my-agent/commit/0d1d68b0bd2d6e4922f35005f34f770698f7bdac))

## [1.21.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.20.1...cli-v1.21.0) (2026-02-12)


### Features

* **cli:** add agent:parallel command to replace parallel-run.sh ([1527d6b](https://github.com/first-fluke/oh-my-agent/commit/1527d6b5619c98ba28fbe9a1ea9b7a3466085be2))

## [1.20.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.20.0...cli-v1.20.1) (2026-02-12)


### Bug Fixes

* **cli:** use SKILLS registry whitelist for symlink creation ([8f87501](https://github.com/first-fluke/oh-my-agent/commit/8f875015993a011316b4e018a4ae9979b5c518b8))

## [1.20.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.19.0...cli-v1.20.0) (2026-02-11)


### Features

* **cli:** add Cursor (.cursor/skills/) support to install, update, doctor ([b699b29](https://github.com/first-fluke/oh-my-agent/commit/b699b299bc2e8e531223ae70db8798ea3881e7a0))

## [1.19.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.18.0...cli-v1.19.0) (2026-02-11)


### Features

* merge OpenCode/Amp/Codex options and add GitHub Copilot support ([b2e7fa1](https://github.com/first-fluke/oh-my-agent/commit/b2e7fa1d8e6f748cfdf92f351d8f5d72f81eded6))


### Bug Fixes

* OpenCode, Amp, Codex all use .agents/skills/ ([ed4f9bd](https://github.com/first-fluke/oh-my-agent/commit/ed4f9bdf688d69620af22bc27234b0f7f8b0182e))
* update Codex skills path from .codex/skills to .agents/skills ([8c30a97](https://github.com/first-fluke/oh-my-agent/commit/8c30a97cbe29d7117aa13322b11acad011a1a03d))


### Miscellaneous

* update CLI hints to show shared directories ([c0e78a2](https://github.com/first-fluke/oh-my-agent/commit/c0e78a221ab1a297affb9c91a9690efbf5978360))

## [1.18.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.17.0...cli-v1.18.0) (2026-02-11)


### Features

* **cleanup:** add Gemini directory cleanup with -y flag ([061d193](https://github.com/first-fluke/oh-my-agent/commit/061d193b4f3b20eebf411ae3c190d75de37c6a7d))

## [1.17.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.16.0...cli-v1.17.0) (2026-02-11)


### Features

* **cli:** add help and version commands ([cdba845](https://github.com/first-fluke/oh-my-agent/commit/cdba84527627b859723a55d0add1431a0342db29))
* **doctor:** add symlink validation for multi-CLI setup ([1d6fa4f](https://github.com/first-fluke/oh-my-agent/commit/1d6fa4fa51e39ba7beb20c964ce876397b218c6c))
* **update:** auto-update CLI symlinks when updating skills ([fe6a99c](https://github.com/first-fluke/oh-my-agent/commit/fe6a99c6a0ce49ad6355ba0a210271c31d944e30))

## [1.16.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.15.0...cli-v1.16.0) (2026-02-11)


### Features

* **cli:** add multi-CLI symlink support for skills ([dc29b6d](https://github.com/first-fluke/oh-my-agent/commit/dc29b6d23ae4a53aefbd0ac9a16a34437bc28ab6))

## [1.15.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v1.14.1...cli-v1.15.0) (2026-02-09)


### Features

* split cli/web workspaces and docs release flow ([5609032](https://github.com/first-fluke/oh-my-agent/commit/5609032bf657e4e4d71e0acaa2e319effcdf8a35))
