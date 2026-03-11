# Changelog

## [1.28.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.27.0...cli-v1.28.0) (2026-03-11)


### Features

* **cli:** improve agent-facing ergonomics ([ca6661d](https://github.com/first-fluke/oh-my-ag/commit/ca6661d9e66f18868807b3f304ca59927b0af053))

## [1.27.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.26.2...cli-v1.27.0) (2026-03-08)


### Features

* **cli:** add star command for GitHub starring with gh CLI integration ([de28489](https://github.com/first-fluke/oh-my-ag/commit/de28489d3e8cdb185a307060061398148d2a3898))

## [1.26.2](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.26.1...cli-v1.26.2) (2026-03-08)


### Refactoring

* rename terraform-infra-engineer to tf-infra-agent ([3c03852](https://github.com/first-fluke/oh-my-ag/commit/3c03852ef473a5e307ce7d497e15d16bbf89b468))

## [1.26.1](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.26.0...cli-v1.26.1) (2026-03-08)


### Bug Fixes

* **cli:** correct release-please extra-files paths for root-level manifest ([ecd18f1](https://github.com/first-fluke/oh-my-ag/commit/ecd18f1d333f90d5fc19845fb52d104eeafc2b25))

## [1.26.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.25.1...cli-v1.26.0) (2026-03-08)


### Features

* add brainstorm skill for design-first ideation pipeline ([7fd31b8](https://github.com/first-fluke/oh-my-ag/commit/7fd31b8800046a51121d33ba0dc72e75f713db06))

## [1.25.1](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.25.0...cli-v1.25.1) (2026-03-04)


### Miscellaneous

* **cli:** bump package version to 1.25.1 ([3bcb4d4](https://github.com/first-fluke/oh-my-ag/commit/3bcb4d4bf09a5d8582b03e89fb7859299200dd06))
* **cli:** update dependencies to latest ([e73285a](https://github.com/first-fluke/oh-my-ag/commit/e73285a2aca442d4c596e2ddcc2b6541e0b210ef))

## [1.25.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.24.0...cli-v1.25.0) (2026-02-19)


### Features

* broaden dashboard file filtering to all markdown files and enhance activity name parsing by removing additional prefixes and suffixes ([513d0ec](https://github.com/first-fluke/oh-my-ag/commit/513d0ec8bc647b0311528f1c3156a3d42631f62a))

## [1.24.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.23.0...cli-v1.24.0) (2026-02-19)


### Features

* **cleanup:** add Gemini directory cleanup with -y flag ([061d193](https://github.com/first-fluke/oh-my-ag/commit/061d193b4f3b20eebf411ae3c190d75de37c6a7d))
* **cli:** add agent:parallel command to replace parallel-run.sh ([1527d6b](https://github.com/first-fluke/oh-my-ag/commit/1527d6b5619c98ba28fbe9a1ea9b7a3466085be2))
* **cli:** add Cursor (.cursor/skills/) support to install, update, doctor ([b699b29](https://github.com/first-fluke/oh-my-ag/commit/b699b299bc2e8e531223ae70db8798ea3881e7a0))
* **cli:** add help and version commands ([cdba845](https://github.com/first-fluke/oh-my-ag/commit/cdba84527627b859723a55d0add1431a0342db29))
* **cli:** add infrastructure skills category with terraform and mise support ([48cae1a](https://github.com/first-fluke/oh-my-ag/commit/48cae1aa3113608b99259b2d8397c80581c1d185))
* **cli:** add multi-CLI symlink support for skills ([dc29b6d](https://github.com/first-fluke/oh-my-ag/commit/dc29b6d23ae4a53aefbd0ac9a16a34437bc28ab6))
* **doctor:** add symlink validation for multi-CLI setup ([1d6fa4f](https://github.com/first-fluke/oh-my-ag/commit/1d6fa4fa51e39ba7beb20c964ce876397b218c6c))
* merge OpenCode/Amp/Codex options and add GitHub Copilot support ([b2e7fa1](https://github.com/first-fluke/oh-my-ag/commit/b2e7fa1d8e6f748cfdf92f351d8f5d72f81eded6))
* split cli/web workspaces and docs release flow ([5609032](https://github.com/first-fluke/oh-my-ag/commit/5609032bf657e4e4d71e0acaa2e319effcdf8a35))
* **update:** auto-update CLI symlinks when updating skills ([fe6a99c](https://github.com/first-fluke/oh-my-ag/commit/fe6a99c6a0ce49ad6355ba0a210271c31d944e30))


### Bug Fixes

* **cli:** fetch reference files during skill installation ([05be60d](https://github.com/first-fluke/oh-my-ag/commit/05be60d19c7738cdb914afc29e7f85dd42c3a294))
* **cli:** use SKILLS registry whitelist for symlink creation ([8f87501](https://github.com/first-fluke/oh-my-ag/commit/8f875015993a011316b4e018a4ae9979b5c518b8))
* OpenCode, Amp, Codex all use .agents/skills/ ([ed4f9bd](https://github.com/first-fluke/oh-my-ag/commit/ed4f9bdf688d69620af22bc27234b0f7f8b0182e))
* resolve user-preferences.yaml by walking up parent directories ([0d1d68b](https://github.com/first-fluke/oh-my-ag/commit/0d1d68b0bd2d6e4922f35005f34f770698f7bdac))
* update Codex skills path from .codex/skills to .agents/skills ([8c30a97](https://github.com/first-fluke/oh-my-ag/commit/8c30a97cbe29d7117aa13322b11acad011a1a03d))


### Refactoring

* rename references to resources and add dynamic file fetching ([7493587](https://github.com/first-fluke/oh-my-ag/commit/7493587fcaff96e9109ca5989932c6fb7b3c9ee2))
* **skills:** rename mise-devops-runner to developer-workflow ([7a34b46](https://github.com/first-fluke/oh-my-ag/commit/7a34b46c44b060afc08c1634e6b66bedb54a5035))


### Miscellaneous

* **main:** release cli 1.15.0 ([5deacf7](https://github.com/first-fluke/oh-my-ag/commit/5deacf780afe674d37f8f8064cbf4b16c9a1477e))
* **main:** release cli 1.15.0 ([1f23594](https://github.com/first-fluke/oh-my-ag/commit/1f23594723e81caf084ef2ae14ed6b41febb1c53))
* **main:** release cli 1.16.0 ([7130613](https://github.com/first-fluke/oh-my-ag/commit/71306130547405288acb1801c0c38ab31a1daf90))
* **main:** release cli 1.16.0 ([ccba318](https://github.com/first-fluke/oh-my-ag/commit/ccba318b0afeeb1e6a9b6a7e9aadeeaad324fa3f))
* **main:** release cli 1.17.0 ([1aefed4](https://github.com/first-fluke/oh-my-ag/commit/1aefed40880be3bceac390d1220833977a48a315))
* **main:** release cli 1.17.0 ([26c70b2](https://github.com/first-fluke/oh-my-ag/commit/26c70b262ac37e0d752d9610d0e29a643ee892c7))
* **main:** release cli 1.18.0 ([4226997](https://github.com/first-fluke/oh-my-ag/commit/4226997393e3dc02b26767a67027c16f564521eb))
* **main:** release cli 1.18.0 ([fec3d99](https://github.com/first-fluke/oh-my-ag/commit/fec3d99344e205945c86853c14a8a858c63f2937))
* **main:** release cli 1.19.0 ([7bde6b6](https://github.com/first-fluke/oh-my-ag/commit/7bde6b6cfcf056c86d37bc8e3b8398b00a8cf7b1))
* **main:** release cli 1.19.0 ([a5c0ce3](https://github.com/first-fluke/oh-my-ag/commit/a5c0ce31feb8c2d18a70fb24b84e3c04bf91a8f3))
* **main:** release cli 1.20.0 ([6eb44db](https://github.com/first-fluke/oh-my-ag/commit/6eb44dbb6e76a1290c6606dcf12d94a4453793d2))
* **main:** release cli 1.20.0 ([18109b2](https://github.com/first-fluke/oh-my-ag/commit/18109b22d8ac23ad1499ec42390c111912eebbc7))
* **main:** release cli 1.20.1 ([ef2c038](https://github.com/first-fluke/oh-my-ag/commit/ef2c03846271c392b7e578ad404415a459d0bae2))
* **main:** release cli 1.20.1 ([35eb769](https://github.com/first-fluke/oh-my-ag/commit/35eb769a556c34bfa4a5bbef2f56daec6c7ec997))
* **main:** release cli 1.21.0 ([cb2094f](https://github.com/first-fluke/oh-my-ag/commit/cb2094ff1fbeb6a57a6522375ee2db5141e0ecb5))
* **main:** release cli 1.21.0 ([306d85b](https://github.com/first-fluke/oh-my-ag/commit/306d85b67cc48e5319b26c911a746efaf7810d0d))
* **main:** release cli 1.21.1 ([511309d](https://github.com/first-fluke/oh-my-ag/commit/511309d3f69884ca85c4193678816d826efadb0c))
* **main:** release cli 1.21.1 ([cd453d6](https://github.com/first-fluke/oh-my-ag/commit/cd453d631f3232c3c1820239531100a693e92bf0))
* update CLI hints to show shared directories ([c0e78a2](https://github.com/first-fluke/oh-my-ag/commit/c0e78a221ab1a297affb9c91a9690efbf5978360))
* version sync 1.23.0 ([6d09e9a](https://github.com/first-fluke/oh-my-ag/commit/6d09e9ab5dd4209c4e957210da0b511f2c943a58))

## [1.21.1](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.21.0...cli-v1.21.1) (2026-02-15)


### Bug Fixes

* resolve user-preferences.yaml by walking up parent directories ([0d1d68b](https://github.com/first-fluke/oh-my-ag/commit/0d1d68b0bd2d6e4922f35005f34f770698f7bdac))

## [1.21.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.20.1...cli-v1.21.0) (2026-02-12)


### Features

* **cli:** add agent:parallel command to replace parallel-run.sh ([1527d6b](https://github.com/first-fluke/oh-my-ag/commit/1527d6b5619c98ba28fbe9a1ea9b7a3466085be2))

## [1.20.1](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.20.0...cli-v1.20.1) (2026-02-12)


### Bug Fixes

* **cli:** use SKILLS registry whitelist for symlink creation ([8f87501](https://github.com/first-fluke/oh-my-ag/commit/8f875015993a011316b4e018a4ae9979b5c518b8))

## [1.20.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.19.0...cli-v1.20.0) (2026-02-11)


### Features

* **cli:** add Cursor (.cursor/skills/) support to install, update, doctor ([b699b29](https://github.com/first-fluke/oh-my-ag/commit/b699b299bc2e8e531223ae70db8798ea3881e7a0))

## [1.19.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.18.0...cli-v1.19.0) (2026-02-11)


### Features

* merge OpenCode/Amp/Codex options and add GitHub Copilot support ([b2e7fa1](https://github.com/first-fluke/oh-my-ag/commit/b2e7fa1d8e6f748cfdf92f351d8f5d72f81eded6))


### Bug Fixes

* OpenCode, Amp, Codex all use .agents/skills/ ([ed4f9bd](https://github.com/first-fluke/oh-my-ag/commit/ed4f9bdf688d69620af22bc27234b0f7f8b0182e))
* update Codex skills path from .codex/skills to .agents/skills ([8c30a97](https://github.com/first-fluke/oh-my-ag/commit/8c30a97cbe29d7117aa13322b11acad011a1a03d))


### Miscellaneous

* update CLI hints to show shared directories ([c0e78a2](https://github.com/first-fluke/oh-my-ag/commit/c0e78a221ab1a297affb9c91a9690efbf5978360))

## [1.18.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.17.0...cli-v1.18.0) (2026-02-11)


### Features

* **cleanup:** add Gemini directory cleanup with -y flag ([061d193](https://github.com/first-fluke/oh-my-ag/commit/061d193b4f3b20eebf411ae3c190d75de37c6a7d))

## [1.17.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.16.0...cli-v1.17.0) (2026-02-11)


### Features

* **cli:** add help and version commands ([cdba845](https://github.com/first-fluke/oh-my-ag/commit/cdba84527627b859723a55d0add1431a0342db29))
* **doctor:** add symlink validation for multi-CLI setup ([1d6fa4f](https://github.com/first-fluke/oh-my-ag/commit/1d6fa4fa51e39ba7beb20c964ce876397b218c6c))
* **update:** auto-update CLI symlinks when updating skills ([fe6a99c](https://github.com/first-fluke/oh-my-ag/commit/fe6a99c6a0ce49ad6355ba0a210271c31d944e30))

## [1.16.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.15.0...cli-v1.16.0) (2026-02-11)


### Features

* **cli:** add multi-CLI symlink support for skills ([dc29b6d](https://github.com/first-fluke/oh-my-ag/commit/dc29b6d23ae4a53aefbd0ac9a16a34437bc28ab6))

## [1.15.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.14.1...cli-v1.15.0) (2026-02-09)


### Features

* split cli/web workspaces and docs release flow ([5609032](https://github.com/first-fluke/oh-my-ag/commit/5609032bf657e4e4d71e0acaa2e319effcdf8a35))
