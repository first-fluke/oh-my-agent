# Changelog

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
