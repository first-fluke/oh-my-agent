# Changelog

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
