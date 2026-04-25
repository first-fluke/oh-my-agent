# Changelog

## [2.0.1](https://github.com/first-fluke/oh-my-agent/compare/web-v2.0.0...web-v2.0.1) (2026-04-25)


### Documentation

* **web:** add oma-image generation guide in 12 languages ([e8d51c0](https://github.com/first-fluke/oh-my-agent/commit/e8d51c0420422bc573a2ea1d6d89f6982c524387))

## [2.0.0](https://github.com/first-fluke/oh-my-agent/compare/web-v1.2.1...web-v2.0.0) (2026-04-25)


### ⚠ BREAKING CHANGES

* **config:** agent_cli_mapping removed, replaced by model_preset + agents in .agents/oma-config.yaml. .agents/config/defaults.yaml and .agents/config/models.yaml no longer exist (built-in presets ship in the CLI package; user models inline in oma-config.yaml). The --update-defaults flag is removed. Migration 008 auto-converts legacy projects on oma install / oma update.

### Features

* **config:** consolidate to model_preset single-file config ([294b8df](https://github.com/first-fluke/oh-my-agent/commit/294b8df23b1dc3b9407f64041d0d421aa1caec5a))

## [1.2.1](https://github.com/first-fluke/oh-my-agent/compare/web-v1.2.0...web-v1.2.1) (2026-04-24)


### Bug Fixes

* **image:** distribute auto-forward reference mandate in skill bundle ([d2e5ff9](https://github.com/first-fluke/oh-my-agent/commit/d2e5ff9fefcd045c9bc34e497932151e02688ccf))
* **image:** distribute auto-forward reference mandate in skill bundle ([b9b7287](https://github.com/first-fluke/oh-my-agent/commit/b9b72874a9bedb0bfeed7c73e67c4d4df14557e9))

## [1.2.0](https://github.com/first-fluke/oh-my-agent/compare/web-v1.1.3...web-v1.2.0) (2026-04-24)


### Features

* **image:** add --reference flag with sanitized unique filenames ([0f0031b](https://github.com/first-fluke/oh-my-agent/commit/0f0031b4ed69e4fce9e972895f2b9359f5a7d4e6))


### Documentation

* **image:** document -r/--reference flag in web CLI reference ([d3c1878](https://github.com/first-fluke/oh-my-agent/commit/d3c1878cc7bbd5d33ae4893952b2a47c9276f56a))
* sync README and web docs with current CLI surface ([34c9f52](https://github.com/first-fluke/oh-my-agent/commit/34c9f521de0ba96770434456d0c332993aebcaa8))

## [1.1.3](https://github.com/first-fluke/oh-my-agent/compare/web-v1.1.2...web-v1.1.3) (2026-04-24)


### Bug Fixes

* **typecheck,biome:** resolve pre-existing errors ([9948947](https://github.com/first-fluke/oh-my-agent/commit/99489478debdc274decf04102fddea0b5ee0d24e))

## [1.1.2](https://github.com/first-fluke/oh-my-agent/compare/web-v1.1.1...web-v1.1.2) (2026-04-24)


### Documentation

* **per-agent-models:** fix installer claim and doctor sample output ([c92a1f4](https://github.com/first-fluke/oh-my-agent/commit/c92a1f43946fc82179ab54f5f3c55330121d4cfc))
* **per-agent-models:** sync EN source + 11 locales to oma-config.yaml ([6adada3](https://github.com/first-fluke/oh-my-agent/commit/6adada36f5eec1c6c55cad885c6feb7c16831fb5))
* **per-agent-models:** sync EN source + 11 locales to oma-config.yaml ([680968f](https://github.com/first-fluke/oh-my-agent/commit/680968f01fa0ce240d0eef533c2ac0f7aeff63de))

## [1.1.1](https://github.com/first-fluke/oh-my-agent/compare/web-v1.1.0...web-v1.1.1) (2026-04-24)


### Bug Fixes

* address code review on PR [#270](https://github.com/first-fluke/oh-my-agent/issues/270) ([a9d22d5](https://github.com/first-fluke/oh-my-agent/commit/a9d22d5d265027ddc5c879f4cd823bee7c1a130a))
* **io:** honor oma-config.yaml for per-agent dispatch and quota cap ([bbe96b3](https://github.com/first-fluke/oh-my-agent/commit/bbe96b3dd5afdcc16f6f69055874aa54f97afd98))
* **io:** honor oma-config.yaml in resolveAgentPlan and loadQuotaCap ([15ea4d9](https://github.com/first-fluke/oh-my-agent/commit/15ea4d9305f8b6c7b386c291d17ab6fa327326c4))


### Documentation

* drop RARDO codename, fix slug bugs, consolidate oma-config.yaml references ([ef6630e](https://github.com/first-fluke/oh-my-agent/commit/ef6630ef13f4ce470e3db41cd6f0085ab881f02e))

## [1.1.0](https://github.com/first-fluke/oh-my-agent/compare/web-v1.0.1...web-v1.1.0) (2026-04-23)


### Features

* **install:** version-gated defaults.yaml upgrades ([94299e6](https://github.com/first-fluke/oh-my-agent/commit/94299e62055d61aff33fda4e5a8e0de8883af4bf))
* P0 — Registry + Config + Dispatch + Doctor ([4f89b8a](https://github.com/first-fluke/oh-my-agent/commit/4f89b8a90b8a338f6972e8c3416f0a6820498e19))


### Documentation

* **web:** add per-agent models guide across 12 locales ([aae25bd](https://github.com/first-fluke/oh-my-agent/commit/aae25bdfb579e8a0438fee0f7a6a2329cf1e25cb))

## [1.0.1](https://github.com/first-fluke/oh-my-agent/compare/web-v1.0.0...web-v1.0.1) (2026-04-21)


### Documentation

* reflect oma-observability + 5 missing agents and fix counts ([67e9da0](https://github.com/first-fluke/oh-my-agent/commit/67e9da03000a84636872a88c5315e33361941442))
