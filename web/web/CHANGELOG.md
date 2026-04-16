# Changelog

## [2.0.0](https://github.com/first-fluke/oh-my-agent/compare/web-v1.0.0...web-v2.0.0) (2026-04-16)


### ⚠ BREAKING CHANGES

* **cli:** oma usage:anti is removed. auth:status JSON omits antigravity.

### Features

* add oma-design skill with DESIGN.md workflow and anti-pattern system ([4f7a897](https://github.com/first-fluke/oh-my-agent/commit/4f7a8971c1ecd59509acbfa117d5f8818a421b3b))
* **cli:** add Codex native agent generation and same-vendor dispatch ([8e97673](https://github.com/first-fluke/oh-my-agent/commit/8e97673fc739153f8f6eb6e50f25825b1d2cd0d6))
* **cli:** add native runtime dispatch ([e1b0efd](https://github.com/first-fluke/oh-my-agent/commit/e1b0efd0bc933dce524e45b9e03f99ca246c8c50))
* **cli:** add native runtime dispatch ([e758aa9](https://github.com/first-fluke/oh-my-agent/commit/e758aa9d5068250b1a662b3ccfd194e7ad842778))
* **scm:** consolidate commit workflow into oma-scm ([db7c982](https://github.com/first-fluke/oh-my-agent/commit/db7c9825260a7417205634189bf2f8e5419eb66d))
* support all 12 languages in web docs ([3882707](https://github.com/first-fluke/oh-my-agent/commit/3882707289116c774ac96b3e57c671aa46dc19a5))


### Bug Fixes

* add vi locale to generateStaticParams in page.tsx ([60f681f](https://github.com/first-fluke/oh-my-agent/commit/60f681f03092be31138b3876dd2d57ba984b2249))
* harden installer bootstrap ([3c214f3](https://github.com/first-fluke/oh-my-agent/commit/3c214f3644f236ccbd3d982dd9ca3899853e1d97))
* **hooks:** remove yaml dependency from keyword-detector hook ([a6a7a7b](https://github.com/first-fluke/oh-my-agent/commit/a6a7a7b0503121f411d8ee2ef05cf684d732ab08))
* **web:** add CSS side-effect import type declaration for build ([a7870b8](https://github.com/first-fluke/oh-my-agent/commit/a7870b8e579dee6893ae7270d4c8ae7cd575219c))


### Refactoring

* **cli:** remove usage:anti and Antigravity quota bridge ([d32403c](https://github.com/first-fluke/oh-my-agent/commit/d32403c4636640c4841a77ecad3cb3e8e995a509))
* move .agents/config/user-preferences.yaml to .agents/oma-config.yaml ([c702a4b](https://github.com/first-fluke/oh-my-agent/commit/c702a4bc41f14b9ed6b6797d13ed970357c5d354))
* move plan.json to session-scoped results/plan-{sessionId}.json ([9f019f5](https://github.com/first-fluke/oh-my-agent/commit/9f019f564f91910447b8ceba16470c795d9dc8c7))
* remove .agents/brain/ and consolidate output to .agents/results/ ([3760861](https://github.com/first-fluke/oh-my-agent/commit/37608617a133bd688bfb53ed3757634bd01ecad5))
* remove deprecated /setup workflow replaced by oma install/update ([faf9bae](https://github.com/first-fluke/oh-my-agent/commit/faf9baeac1b922977be547b4825f762e97e312e9))
* rename /coordinate workflow to /work ([15e9b8e](https://github.com/first-fluke/oh-my-agent/commit/15e9b8e9166d097ada043864669a0c9fb5a48c5c))
* rename oh-my-ag CLI references to oma ([25b10b2](https://github.com/first-fluke/oh-my-agent/commit/25b10b2602d8b3258ab18cf7afd71a29a58cdd93))
* replace oh-my-ag with oma/oh-my-agent across docs ([9a7c791](https://github.com/first-fluke/oh-my-agent/commit/9a7c7914dd34884870afc62d4470053c6cd7e368))
* **web:** migrate from Next.js to Docusaurus 3 ([cbabcbe](https://github.com/first-fluke/oh-my-agent/commit/cbabcbe71af1e136ec90f2032ed932d96ead7b03))


### Documentation

* **action:** use marketplace action slug in examples ([33e3399](https://github.com/first-fluke/oh-my-agent/commit/33e3399d63ecebffed93fe554b6711afd2785b41))
* add detailed web content translations for all 10 languages ([77b2cf4](https://github.com/first-fluke/oh-my-agent/commit/77b2cf49af23a3f9fed2aaf42c8dd2502817359c))
* add Vietnamese web content and register vi locale ([53e7fd1](https://github.com/first-fluke/oh-my-agent/commit/53e7fd12e9426963f7b6ec2cee375347bf9e711d))
* comprehensive documentation rewrite (198 files, 11 languages) ([c97a771](https://github.com/first-fluke/oh-my-agent/commit/c97a7712d61e732fb686b37f79dbb4d51e0febd6))
* comprehensive documentation rewrite across all languages ([d396ce8](https://github.com/first-fluke/oh-my-agent/commit/d396ce808f596d5a2cb3cd8c3fd30500c392c048))
* fill undocumented codebase features in EN/KO web content ([49b5f7e](https://github.com/first-fluke/oh-my-agent/commit/49b5f7e03c3e9fe0ab771a396a0b008522baeb0e))
* review and improve translations across all 10 languages ([35eb06b](https://github.com/first-fluke/oh-my-agent/commit/35eb06b95d2252a4b8a653598fab330a9aa87ad1))
* update CLI docs for -m/--model flag and add agent:review command ([43ff752](https://github.com/first-fluke/oh-my-agent/commit/43ff752e5a6faf39eeba7072b52a467ca08038aa))
* upgrade remaining EN web content to detailed reference docs ([cd3a4c7](https://github.com/first-fluke/oh-my-agent/commit/cd3a4c71deb3ba5e3afebb7ac2ae6379ee292687))
* upgrade single-skill guide to detailed reference ([a1accb0](https://github.com/first-fluke/oh-my-agent/commit/a1accb0c50d166be89416f9b331391c4a2a39492))
