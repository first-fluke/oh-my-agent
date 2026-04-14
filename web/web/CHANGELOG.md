# Changelog

## [0.4.1](https://github.com/first-fluke/oh-my-agent/compare/web-v0.4.0...web-v0.4.1) (2026-04-14)


### Features

* **cli:** add Codex native agent generation and same-vendor dispatch ([8e97673](https://github.com/first-fluke/oh-my-agent/commit/8e97673fc739153f8f6eb6e50f25825b1d2cd0d6))
* **cli:** add native runtime dispatch ([e1b0efd](https://github.com/first-fluke/oh-my-agent/commit/e1b0efd0bc933dce524e45b9e03f99ca246c8c50))
* **cli:** add native runtime dispatch ([e758aa9](https://github.com/first-fluke/oh-my-agent/commit/e758aa9d5068250b1a662b3ccfd194e7ad842778))

## [0.4.0](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.20...web-v0.4.0) (2026-04-12)


### ⚠ BREAKING CHANGES

* **cli:** oma usage:anti is removed. auth:status JSON omits antigravity.

### Refactoring

* **cli:** remove usage:anti and Antigravity quota bridge ([d32403c](https://github.com/first-fluke/oh-my-agent/commit/d32403c4636640c4841a77ecad3cb3e8e995a509))

## [0.3.20](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.19...web-v0.3.20) (2026-04-12)


### Features

* **scm:** consolidate commit workflow into oma-scm ([db7c982](https://github.com/first-fluke/oh-my-agent/commit/db7c9825260a7417205634189bf2f8e5419eb66d))

## [0.3.19](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.18...web-v0.3.19) (2026-04-08)


### Features

* support all 12 languages in web docs ([3882707](https://github.com/first-fluke/oh-my-agent/commit/3882707289116c774ac96b3e57c671aa46dc19a5))

## [0.3.18](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.17...web-v0.3.18) (2026-04-08)


### Refactoring

* move plan.json to session-scoped results/plan-{sessionId}.json ([9f019f5](https://github.com/first-fluke/oh-my-agent/commit/9f019f564f91910447b8ceba16470c795d9dc8c7))

## [0.3.17](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.16...web-v0.3.17) (2026-04-06)


### Refactoring

* rename oh-my-ag CLI references to oma ([25b10b2](https://github.com/first-fluke/oh-my-agent/commit/25b10b2602d8b3258ab18cf7afd71a29a58cdd93))
* replace oh-my-ag with oma/oh-my-agent across docs ([9a7c791](https://github.com/first-fluke/oh-my-agent/commit/9a7c7914dd34884870afc62d4470053c6cd7e368))

## [0.3.16](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.15...web-v0.3.16) (2026-04-06)


### Refactoring

* rename /coordinate workflow to /work ([15e9b8e](https://github.com/first-fluke/oh-my-agent/commit/15e9b8e9166d097ada043864669a0c9fb5a48c5c))

## [0.3.15](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.14...web-v0.3.15) (2026-04-06)


### Refactoring

* move .agents/config/user-preferences.yaml to .agents/oma-config.yaml ([c702a4b](https://github.com/first-fluke/oh-my-agent/commit/c702a4bc41f14b9ed6b6797d13ed970357c5d354))

## [0.3.14](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.13...web-v0.3.14) (2026-04-04)


### Bug Fixes

* harden installer bootstrap ([3c214f3](https://github.com/first-fluke/oh-my-agent/commit/3c214f3644f236ccbd3d982dd9ca3899853e1d97))

## [0.3.13](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.12...web-v0.3.13) (2026-04-02)


### Bug Fixes

* add vi locale to generateStaticParams in page.tsx ([60f681f](https://github.com/first-fluke/oh-my-agent/commit/60f681f03092be31138b3876dd2d57ba984b2249))


### Documentation

* add Vietnamese web content and register vi locale ([53e7fd1](https://github.com/first-fluke/oh-my-agent/commit/53e7fd12e9426963f7b6ec2cee375347bf9e711d))

## [0.3.12](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.11...web-v0.3.12) (2026-03-31)


### Refactoring

* remove deprecated /setup workflow replaced by oma install/update ([faf9bae](https://github.com/first-fluke/oh-my-agent/commit/faf9baeac1b922977be547b4825f762e97e312e9))

## [0.3.11](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.10...web-v0.3.11) (2026-03-28)


### Documentation

* fill undocumented codebase features in EN/KO web content ([49b5f7e](https://github.com/first-fluke/oh-my-agent/commit/49b5f7e03c3e9fe0ab771a396a0b008522baeb0e))

## [0.3.10](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.9...web-v0.3.10) (2026-03-28)


### Documentation

* review and improve translations across all 10 languages ([35eb06b](https://github.com/first-fluke/oh-my-agent/commit/35eb06b95d2252a4b8a653598fab330a9aa87ad1))

## [0.3.9](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.8...web-v0.3.9) (2026-03-27)


### Documentation

* **action:** use marketplace action slug in examples ([33e3399](https://github.com/first-fluke/oh-my-agent/commit/33e3399d63ecebffed93fe554b6711afd2785b41))
* update CLI docs for -m/--model flag and add agent:review command ([43ff752](https://github.com/first-fluke/oh-my-agent/commit/43ff752e5a6faf39eeba7072b52a467ca08038aa))

## [0.3.8](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.7...web-v0.3.8) (2026-03-26)


### Bug Fixes

* **hooks:** remove yaml dependency from keyword-detector hook ([a6a7a7b](https://github.com/first-fluke/oh-my-agent/commit/a6a7a7b0503121f411d8ee2ef05cf684d732ab08))

## [0.3.7](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.6...web-v0.3.7) (2026-03-25)


### Bug Fixes

* **web:** add CSS side-effect import type declaration for build ([a7870b8](https://github.com/first-fluke/oh-my-agent/commit/a7870b8e579dee6893ae7270d4c8ae7cd575219c))

## [0.3.6](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.5...web-v0.3.6) (2026-03-24)


### Refactoring

* remove .agents/brain/ and consolidate output to .agents/results/ ([3760861](https://github.com/first-fluke/oh-my-agent/commit/37608617a133bd688bfb53ed3757634bd01ecad5))


### Documentation

* add detailed web content translations for all 10 languages ([77b2cf4](https://github.com/first-fluke/oh-my-agent/commit/77b2cf49af23a3f9fed2aaf42c8dd2502817359c))
* comprehensive documentation rewrite (198 files, 11 languages) ([c97a771](https://github.com/first-fluke/oh-my-agent/commit/c97a7712d61e732fb686b37f79dbb4d51e0febd6))
* comprehensive documentation rewrite across all languages ([d396ce8](https://github.com/first-fluke/oh-my-agent/commit/d396ce808f596d5a2cb3cd8c3fd30500c392c048))
* upgrade remaining EN web content to detailed reference docs ([cd3a4c7](https://github.com/first-fluke/oh-my-agent/commit/cd3a4c71deb3ba5e3afebb7ac2ae6379ee292687))
* upgrade single-skill guide to detailed reference ([a1accb0](https://github.com/first-fluke/oh-my-agent/commit/a1accb0c50d166be89416f9b331391c4a2a39492))


### Miscellaneous

* bump typescript from ^5 to ^6 ([c7f9166](https://github.com/first-fluke/oh-my-agent/commit/c7f91668f091e1cfd80a4fda401dfe1842e62f69))

## [0.3.5](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.4...web-v0.3.5) (2026-03-24)


### Features

* add oma-design skill with DESIGN.md workflow and anti-pattern system ([4f7a897](https://github.com/first-fluke/oh-my-agent/commit/4f7a8971c1ecd59509acbfa117d5f8818a421b3b))

## [0.3.4](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.3...web-v0.3.4) (2026-03-22)


### Documentation

* add automated updates guide for GitHub Action ([261e842](https://github.com/first-fluke/oh-my-agent/commit/261e8425c46d622930857d667f3cda43093aad2e))
* translate automated-updates guide to 9 languages ([c0934f0](https://github.com/first-fluke/oh-my-agent/commit/c0934f0ad3ddf9e92fbcf91c7e5ea99ab9e65a46))

## [0.3.3](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.2...web-v0.3.3) (2026-03-22)


### Documentation

* add brew install oh-my-agent as global installation option ([026169e](https://github.com/first-fluke/oh-my-agent/commit/026169ef10b451fe72461979b13b778026371c83))

## [0.3.2](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.1...web-v0.3.2) (2026-03-22)


### Documentation

* simplify user-facing documentation and standardize structure ([fcbaad7](https://github.com/first-fluke/oh-my-agent/commit/fcbaad7a19b72a002193a0bb325bed10c3b27085))

## [0.3.1](https://github.com/first-fluke/oh-my-agent/compare/web-v0.3.0...web-v0.3.1) (2026-03-21)


### Bug Fixes

* address reviewer feedback on PR [#123](https://github.com/first-fluke/oh-my-agent/issues/123) ([bd1ba25](https://github.com/first-fluke/oh-my-agent/commit/bd1ba2570b43367c447ab08766c765b80aabd1ce))


### Refactoring

* abstract oma-backend to language-agnostic skill ([a3bdb1c](https://github.com/first-fluke/oh-my-agent/commit/a3bdb1ccd81eadf0118aed4aa21794ddfff0cfe9))
* replace keyword-based auto-activation with explicit skill invocation ([6be9ce7](https://github.com/first-fluke/oh-my-agent/commit/6be9ce7f587e96539edf96cd049dbe274b27eb3c))
* unify workflows and agents into .agents/ SSOT ([0195cd8](https://github.com/first-fluke/oh-my-agent/commit/0195cd806cb37aab7f6b15a4e2c4a8fbf3ce571b))

## [0.3.0](https://github.com/first-fluke/oh-my-agent/compare/web-v0.2.7...web-v0.3.0) (2026-03-21)


### ⚠ BREAKING CHANGES

* All skill directory names changed from `{domain}-agent` to `oma-{domain}` prefix (e.g. `backend-agent` → `oma-backend`). Agent files renamed from `-impl` to role names (e.g. `backend-impl` → `backend-engineer`). `workflow-guide` renamed to `oma-coordination`.

### Refactoring

* rename skills to oma-* prefix and agents to role-based names ([766b1e2](https://github.com/first-fluke/oh-my-agent/commit/766b1e208f8397fd0835803e69b71b9a03a32ce4))

## [0.2.7](https://github.com/first-fluke/oh-my-agent/compare/web-v0.2.6...web-v0.2.7) (2026-03-18)


### Bug Fixes

* **demo:** use Hack Nerd Font for VHS recording ([b16bdd7](https://github.com/first-fluke/oh-my-agent/commit/b16bdd711e38ba4c58bca589926d8d5488480839))

## [0.2.6](https://github.com/first-fluke/oh-my-agent/compare/web-v0.2.5...web-v0.2.6) (2026-03-18)


### Documentation

* **web:** add missing agents and workflows across all 11 languages ([998924f](https://github.com/first-fluke/oh-my-agent/commit/998924fb38da8ec59cb93910217c40f149d478b7))

## [0.2.5](https://github.com/first-fluke/oh-my-agent/compare/web-v0.2.4...web-v0.2.5) (2026-03-16)


### Documentation

* rename CLI command from oh-my-ag to oma in all web content ([19feda2](https://github.com/first-fluke/oh-my-agent/commit/19feda2e535326b87c39b464fc02766f5628108a))

## [0.2.4](https://github.com/first-fluke/oh-my-agent/compare/web-v0.2.3...web-v0.2.4) (2026-03-13)


### Documentation

* sync localized readmes and remove uk docs ([3808917](https://github.com/first-fluke/oh-my-agent/commit/3808917ced96721766535e7b17fc39436d3fbd36))

## [0.2.3](https://github.com/first-fluke/oh-my-agent/compare/web-v0.2.2...web-v0.2.3) (2026-03-13)


### Documentation

* **web:** fix header branding from oh-my-ag to oh-my-agent ([553edd3](https://github.com/first-fluke/oh-my-agent/commit/553edd34f8c2349d366772393f6616ec1c921a49))

## [0.2.2](https://github.com/first-fluke/oh-my-agent/compare/web-v0.2.1...web-v0.2.2) (2026-03-13)


### Documentation

* update usage command to usage:anti across all documentation ([c696920](https://github.com/first-fluke/oh-my-agent/commit/c6969203005ce46eae40d5a3fd0ccea77c0cba84))

## [0.2.1](https://github.com/first-fluke/oh-my-agent/compare/web-v0.2.0...web-v0.2.1) (2026-03-13)


### Miscellaneous

* rename project to oh-my-agent ([9d6edbf](https://github.com/first-fluke/oh-my-agent/commit/9d6edbf46e49e14df817f6a5baabfee7719690f2))

## [0.2.0](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.9...web-v0.2.0) (2026-03-13)


### ⚠ BREAKING CHANGES

* .agents/ replaces .agent/ as the canonical root directory. Cursor and Antigravity now natively support .agents/, so legacy symlinks (.cursor/skills/, .claude/skills/, .github/skills/) are no longer needed.

### Features

* adopt .agents/ as canonical root with auto-migration ([a2ade10](https://github.com/first-fluke/oh-my-agent/commit/a2ade10bb92be61d2d8f4b433b9f00481a900c56))


### Refactoring

* rename .agent/ to .agents/ as canonical root ([ca3ca3f](https://github.com/first-fluke/oh-my-agent/commit/ca3ca3f658ed3ead256dad96dc1196b92d8a81c6))

## [0.1.9](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.8...web-v0.1.9) (2026-03-11)


### Features

* switch skills ssot to .agents ([c4b63a2](https://github.com/first-fluke/oh-my-agent/commit/c4b63a295e96aa471cf575495bc048cf0e3cda69))

## [0.1.8](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.7...web-v0.1.8) (2026-03-08)


### Bug Fixes

* **docs:** inline sync-agent-registry action and rename .yaml to .yml ([c25475c](https://github.com/first-fluke/oh-my-agent/commit/c25475cee6908a197ac17d3211e6405b620597fd))

## [0.1.7](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.6...web-v0.1.7) (2026-02-19)


### Features

* merge OpenCode/Amp/Codex options and add GitHub Copilot support ([b2e7fa1](https://github.com/first-fluke/oh-my-agent/commit/b2e7fa1d8e6f748cfdf92f351d8f5d72f81eded6))
* split cli/web workspaces and docs release flow ([5609032](https://github.com/first-fluke/oh-my-agent/commit/5609032bf657e4e4d71e0acaa2e319effcdf8a35))
* **web:** add app icons and manifest metadata ([b4b6296](https://github.com/first-fluke/oh-my-agent/commit/b4b62969b4b0e075789e06920c2a630babf78b58))
* **web:** add documentation search functionality ([0523012](https://github.com/first-fluke/oh-my-agent/commit/052301206e510a13b098f552b3ce7dd7e58ee4dc))
* **web:** add landing page and expand docs guides ([b18e4a1](https://github.com/first-fluke/oh-my-agent/commit/b18e4a137c852381edf31a4d4e98a5d96d476782))
* **web:** retheme docs with #B23A34 and fix code block overflow ([cf67ed6](https://github.com/first-fluke/oh-my-agent/commit/cf67ed68d128572885924d638b5a365e66f0d335))


### Bug Fixes

* correct ENGINEER typo in hero text ([c9e3fc3](https://github.com/first-fluke/oh-my-agent/commit/c9e3fc31d395369ab54f230bee3d833576b27e4e))
* OpenCode, Amp, Codex all use .agents/skills/ ([ed4f9bd](https://github.com/first-fluke/oh-my-agent/commit/ed4f9bdf688d69620af22bc27234b0f7f8b0182e))
* **pwa:** set pages start_url/id and primary theme color ([f0b8278](https://github.com/first-fluke/oh-my-agent/commit/f0b8278a9e014ee364186f91936f0a4c9d8ad97b))
* update Codex skills path from .codex/skills to .agents/skills ([8c30a97](https://github.com/first-fluke/oh-my-agent/commit/8c30a97cbe29d7117aa13322b11acad011a1a03d))
* **web-docs:** quote guide frontmatter titles to prevent 404 ([be2d3d6](https://github.com/first-fluke/oh-my-agent/commit/be2d3d6f01a28d9e1b6d8ac17d45a686bb597cce))
* **web:** add list styling to markdown renderer ([d2680e2](https://github.com/first-fluke/oh-my-agent/commit/d2680e2ba3070e9cc6bcdf62360bc12bfc6f0bf1))
* **web:** add table styling with proper padding and borders ([0adecbd](https://github.com/first-fluke/oh-my-agent/commit/0adecbd5198b55db23b9376b0274c38639e37f9b))
* **web:** apply basePath to icon and manifest URLs ([8ddbfd5](https://github.com/first-fluke/oh-my-agent/commit/8ddbfd5604c20577a5066a2fcd25ff72bea933bf))
* **web:** darker background for code blocks ([15318bc](https://github.com/first-fluke/oh-my-agent/commit/15318bc54fc2fba6013c93a21d4c21c38ab588c4))
* **web:** increase hero icon contrast ([8235148](https://github.com/first-fluke/oh-my-agent/commit/82351486e0ca68ee860378b80015aa22c9de8534))


### Refactoring

* move brain output directory from .gemini/antigravity/brain/ to .agents/brain/ ([f093e52](https://github.com/first-fluke/oh-my-agent/commit/f093e52bac47f3938381bc48bdacde02c56be4e5))
* **web:** migrate search to cmdk ([c282426](https://github.com/first-fluke/oh-my-agent/commit/c282426bd3596d74713ecc73f93550c983d1f94a))
* **web:** migrate to TypeScript and motion package ([bc9233b](https://github.com/first-fluke/oh-my-agent/commit/bc9233b598bf28c2d5f98a427109074f53dd8b28))


### Documentation

* add multi-CLI symlink documentation ([fc1475f](https://github.com/first-fluke/oh-my-agent/commit/fc1475f77ced043e230304037d9ec2120ded9d4a))
* add Simplified Chinese (zh) translations ([a4d4c24](https://github.com/first-fluke/oh-my-agent/commit/a4d4c2490c825d8b507666b1aef600530498ac99))
* move detailed sections from READMEs to web/content ([552b654](https://github.com/first-fluke/oh-my-agent/commit/552b654348ae1d8797976bf029aff3bc1b3166a4))
* move skill architecture details to web docs ([028afdb](https://github.com/first-fluke/oh-my-agent/commit/028afdb1483bb547adf8691f73c9cae8d62d3b6b))
* move translated docs to web/content/{lang}/ structure ([dcd634a](https://github.com/first-fluke/oh-my-agent/commit/dcd634a58defd251744a03bd1f603ed8c27f7680))
* soften Korean usage quick-start prompt ([d8faabe](https://github.com/first-fluke/oh-my-agent/commit/d8faabe64370d78f8b4a5635287e8e7e628bcfbd))
* translate all 14 remaining web/content docs to 9 languages ([407187d](https://github.com/first-fluke/oh-my-agent/commit/407187d79172ae2ce1f780d768ce626e32b4d819))
* **web:** add public llms.txt for guide pages ([157625d](https://github.com/first-fluke/oh-my-agent/commit/157625d2e42925c44ba04116d12b2712fac965f9))
* **web:** move central registry guide into docs navigation ([1d50070](https://github.com/first-fluke/oh-my-agent/commit/1d50070b1083adc867e08e7d797d1c2442995c7c))


### Miscellaneous

* **main:** release web 0.1.1 ([5201765](https://github.com/first-fluke/oh-my-agent/commit/5201765eaec1249efcd6345ee031bfd64593bca6))
* **main:** release web 0.1.1 ([b09ebf9](https://github.com/first-fluke/oh-my-agent/commit/b09ebf924699c44b429bfde4b890f7b505cc3a40))
* **main:** release web 0.1.2 ([935ec9a](https://github.com/first-fluke/oh-my-agent/commit/935ec9ac036a35f503689cb644268196646e0f39))
* **main:** release web 0.1.2 ([a873b46](https://github.com/first-fluke/oh-my-agent/commit/a873b468f6d4e29e757e304ab567f17ea82d3a8d))
* **main:** release web 0.1.3 ([6ce48ea](https://github.com/first-fluke/oh-my-agent/commit/6ce48eaa0c633f68317f9b69f93bdc988c457a88))
* **main:** release web 0.1.3 ([13caa49](https://github.com/first-fluke/oh-my-agent/commit/13caa4902b387e713465f484039326f5ce8fcd6a))
* **main:** release web 0.1.4 ([6208978](https://github.com/first-fluke/oh-my-agent/commit/6208978eb301a9eeb975ffe6eafef0b42560c285))
* **main:** release web 0.1.4 ([9015c8b](https://github.com/first-fluke/oh-my-agent/commit/9015c8b35b23364c735377dfa6a5b7e06d50d55d))
* **main:** release web 0.1.5 ([7bbb64b](https://github.com/first-fluke/oh-my-agent/commit/7bbb64baa612c8e774ddbce1ad88e183a579178b))
* **main:** release web 0.1.5 ([96299c8](https://github.com/first-fluke/oh-my-agent/commit/96299c884447d05000062923eee35893e626f0f3))
* **main:** release web 0.1.6 ([4a1594c](https://github.com/first-fluke/oh-my-agent/commit/4a1594c198b576660d26f4a7cd3b1aa20440b483))
* **main:** release web 0.1.6 ([9274d5e](https://github.com/first-fluke/oh-my-agent/commit/9274d5ebe053cbda4a5535634157f9d9a5e09a2d))
* push remaining local updates ([cb80127](https://github.com/first-fluke/oh-my-agent/commit/cb80127fae0a99c68f70ee500d087ec428e01cf6))
* **web:** simplify docs header brand text ([a476226](https://github.com/first-fluke/oh-my-agent/commit/a47622621e36dcadadb955815a4ac77355c4c307))

## [0.1.6](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.5...web-v0.1.6) (2026-02-13)


### Refactoring

* move brain output directory from .gemini/antigravity/brain/ to .agents/brain/ ([f093e52](https://github.com/first-fluke/oh-my-agent/commit/f093e52bac47f3938381bc48bdacde02c56be4e5))

## [0.1.5](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.4...web-v0.1.5) (2026-02-13)


### Documentation

* add Simplified Chinese (zh) translations ([a4d4c24](https://github.com/first-fluke/oh-my-agent/commit/a4d4c2490c825d8b507666b1aef600530498ac99))
* move translated docs to web/content/{lang}/ structure ([dcd634a](https://github.com/first-fluke/oh-my-agent/commit/dcd634a58defd251744a03bd1f603ed8c27f7680))
* translate all 14 remaining web/content docs to 9 languages ([407187d](https://github.com/first-fluke/oh-my-agent/commit/407187d79172ae2ce1f780d768ce626e32b4d819))

## [0.1.4](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.3...web-v0.1.4) (2026-02-13)


### Documentation

* move detailed sections from READMEs to web/content ([552b654](https://github.com/first-fluke/oh-my-agent/commit/552b654348ae1d8797976bf029aff3bc1b3166a4))

## [0.1.3](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.2...web-v0.1.3) (2026-02-11)


### Features

* merge OpenCode/Amp/Codex options and add GitHub Copilot support ([b2e7fa1](https://github.com/first-fluke/oh-my-agent/commit/b2e7fa1d8e6f748cfdf92f351d8f5d72f81eded6))


### Bug Fixes

* OpenCode, Amp, Codex all use .agents/skills/ ([ed4f9bd](https://github.com/first-fluke/oh-my-agent/commit/ed4f9bdf688d69620af22bc27234b0f7f8b0182e))
* update Codex skills path from .codex/skills to .agents/skills ([8c30a97](https://github.com/first-fluke/oh-my-agent/commit/8c30a97cbe29d7117aa13322b11acad011a1a03d))


### Documentation

* add multi-CLI symlink documentation ([fc1475f](https://github.com/first-fluke/oh-my-agent/commit/fc1475f77ced043e230304037d9ec2120ded9d4a))

## [0.1.2](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.1...web-v0.1.2) (2026-02-10)


### Features

* **web:** add documentation search functionality ([0523012](https://github.com/first-fluke/oh-my-agent/commit/052301206e510a13b098f552b3ce7dd7e58ee4dc))


### Bug Fixes

* **web:** add list styling to markdown renderer ([d2680e2](https://github.com/first-fluke/oh-my-agent/commit/d2680e2ba3070e9cc6bcdf62360bc12bfc6f0bf1))
* **web:** add table styling with proper padding and borders ([0adecbd](https://github.com/first-fluke/oh-my-agent/commit/0adecbd5198b55db23b9376b0274c38639e37f9b))
* **web:** darker background for code blocks ([15318bc](https://github.com/first-fluke/oh-my-agent/commit/15318bc54fc2fba6013c93a21d4c21c38ab588c4))


### Refactoring

* **web:** migrate search to cmdk ([c282426](https://github.com/first-fluke/oh-my-agent/commit/c282426bd3596d74713ecc73f93550c983d1f94a))
* **web:** migrate to TypeScript and motion package ([bc9233b](https://github.com/first-fluke/oh-my-agent/commit/bc9233b598bf28c2d5f98a427109074f53dd8b28))


### Documentation

* move skill architecture details to web docs ([028afdb](https://github.com/first-fluke/oh-my-agent/commit/028afdb1483bb547adf8691f73c9cae8d62d3b6b))

## [0.1.1](https://github.com/first-fluke/oh-my-agent/compare/web-v0.1.0...web-v0.1.1) (2026-02-09)


### Features

* split cli/web workspaces and docs release flow ([5609032](https://github.com/first-fluke/oh-my-agent/commit/5609032bf657e4e4d71e0acaa2e319effcdf8a35))
* **web:** add app icons and manifest metadata ([b4b6296](https://github.com/first-fluke/oh-my-agent/commit/b4b62969b4b0e075789e06920c2a630babf78b58))
* **web:** add landing page and expand docs guides ([b18e4a1](https://github.com/first-fluke/oh-my-agent/commit/b18e4a137c852381edf31a4d4e98a5d96d476782))
* **web:** retheme docs with #B23A34 and fix code block overflow ([cf67ed6](https://github.com/first-fluke/oh-my-agent/commit/cf67ed68d128572885924d638b5a365e66f0d335))


### Bug Fixes

* correct ENGINEER typo in hero text ([c9e3fc3](https://github.com/first-fluke/oh-my-agent/commit/c9e3fc31d395369ab54f230bee3d833576b27e4e))
* **pwa:** set pages start_url/id and primary theme color ([f0b8278](https://github.com/first-fluke/oh-my-agent/commit/f0b8278a9e014ee364186f91936f0a4c9d8ad97b))
* **web-docs:** quote guide frontmatter titles to prevent 404 ([be2d3d6](https://github.com/first-fluke/oh-my-agent/commit/be2d3d6f01a28d9e1b6d8ac17d45a686bb597cce))
* **web:** apply basePath to icon and manifest URLs ([8ddbfd5](https://github.com/first-fluke/oh-my-agent/commit/8ddbfd5604c20577a5066a2fcd25ff72bea933bf))
* **web:** increase hero icon contrast ([8235148](https://github.com/first-fluke/oh-my-agent/commit/82351486e0ca68ee860378b80015aa22c9de8534))


### Documentation

* soften Korean usage quick-start prompt ([d8faabe](https://github.com/first-fluke/oh-my-agent/commit/d8faabe64370d78f8b4a5635287e8e7e628bcfbd))
* **web:** add public llms.txt for guide pages ([157625d](https://github.com/first-fluke/oh-my-agent/commit/157625d2e42925c44ba04116d12b2712fac965f9))
* **web:** move central registry guide into docs navigation ([1d50070](https://github.com/first-fluke/oh-my-agent/commit/1d50070b1083adc867e08e7d797d1c2442995c7c))


### Miscellaneous

* push remaining local updates ([cb80127](https://github.com/first-fluke/oh-my-agent/commit/cb80127fae0a99c68f70ee500d087ec428e01cf6))
* **web:** simplify docs header brand text ([a476226](https://github.com/first-fluke/oh-my-agent/commit/a47622621e36dcadadb955815a4ac77355c4c307))
