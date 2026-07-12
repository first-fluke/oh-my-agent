# Changelog

## [10.15.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.14.0...cli-v10.15.0) (2026-07-12)


### Features

* **memory:** accept agentmemory health by capability ([fff3b4d](https://github.com/first-fluke/oh-my-agent/commit/fff3b4d591d78b3b2c12879e2f002e766591f46d))
* **memory:** move coordination store to .agents/state/memories ([c8a2031](https://github.com/first-fluke/oh-my-agent/commit/c8a2031d778e1e63c6d919ea93087dcaaf5215be))
* **skills:** add skills lint smell detector ([84112ae](https://github.com/first-fluke/oh-my-agent/commit/84112ae7a4ab11afe6da03a8097850aa73dfa385))
* **skills:** warn on bundle sprawl in skills audit ([6f70fcb](https://github.com/first-fluke/oh-my-agent/commit/6f70fcb36a465d31119edfd07c65ce1475bf3293))


### Bug Fixes

* **slide:** allow font cdns in export and fix speaker-notes contract ([5b8e748](https://github.com/first-fluke/oh-my-agent/commit/5b8e748aa3a3c4701d5247ec8f171819b9dff7f6))
* **video:** fetch pretendard font in doctor and sync capture order ([2ca8a26](https://github.com/first-fluke/oh-my-agent/commit/2ca8a262b7f9964e9a2538fcb6af84fef22496c7))


### Documentation

* cite skillsbench and bump skillopt reference to v2 ([e395205](https://github.com/first-fluke/oh-my-agent/commit/e3952059a587e323f441d0f581e303d5940c6c0a))
* document skills lint and cite anatomy-to-smells ([e4a6f74](https://github.com/first-fluke/oh-my-agent/commit/e4a6f74b75a7cea7a3a7080e0732acbb2b3147fe))
* **readme:** sync korean readme presets and fix stilted phrasing ([58dc2e5](https://github.com/first-fluke/oh-my-agent/commit/58dc2e5ee615fb51f10907d320f2dd901139c710))
* **readme:** sync remaining 11 locale readmes with english source ([bba0450](https://github.com/first-fluke/oh-my-agent/commit/bba045085e8ff59e4e254c7bbda1d6dcac4a0cb6))
* resolve all 84 broken refs flagged by oma docs verify ([2bf619a](https://github.com/first-fluke/oh-my-agent/commit/2bf619a126181304f53d4577a77be67109f6cb13))
* **skill-creator:** add skilllens utility content rubric ([a2505bf](https://github.com/first-fluke/oh-my-agent/commit/a2505bf72b50c7f003cb9c3d033c4ddeed3ee335))
* **slide:** fix resolution, density, and pptx metric doc drift ([013431d](https://github.com/first-fluke/oh-my-agent/commit/013431d5a5304331d7eb9e5702f5428505d52fd3))
* **video:** document --script flag and correct skill doc drift ([724467c](https://github.com/first-fluke/oh-my-agent/commit/724467c3217c638f457c80e3d68a5ebc3aa95ab1))

## [10.14.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.13.1...cli-v10.14.0) (2026-07-11)


### Features

* **hooks:** adopt claude SessionStart with reloadSkills and compact rehydration ([a35bd6c](https://github.com/first-fluke/oh-my-agent/commit/a35bd6c2c68a32e604a16ccbaa5186c895975a37))


### Bug Fixes

* **hooks:** extend the relayed-message guard to skill-injector ([f798e86](https://github.com/first-fluke/oh-my-agent/commit/f798e8677b05dd2c966c00d2ca6e0e0859b57b53))

## [10.13.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.13.0...cli-v10.13.1) (2026-07-11)


### Bug Fixes

* **codex:** use the bypass flag — BYPASS_HOOK_TRUST env is not honored ([82d4293](https://github.com/first-fluke/oh-my-agent/commit/82d4293a49d5fd0f4779c57f48dd6cffc4955bbc))
* **hooks:** drop inert antigravity test-filter registration ([d9ec29e](https://github.com/first-fluke/oh-my-agent/commit/d9ec29e9d42e1f0dfff0f661775d53ceca67a921))
* **hooks:** normalize ContentPart[] prompts in the central dispatch path ([7b0f905](https://github.com/first-fluke/oh-my-agent/commit/7b0f90573514b2007bce53f52713b047ced37941))
* **hooks:** unwrap opencode run's quoted prompt before keyword detection ([706998d](https://github.com/first-fluke/oh-my-agent/commit/706998db1ea3eaf2a8b0efd06485f547c5baa55f))

## [10.13.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.12.1...cli-v10.13.0) (2026-07-10)


### Features

* **hooks:** implement pi persistent-mode via agent_settled re-entry ([0550bdb](https://github.com/first-fluke/oh-my-agent/commit/0550bdb5ae7e18159617296443dbaac62cd557f2))
* **hooks:** wire cursor/commandcode lifecycle events and kiro merge skip ([233b817](https://github.com/first-fluke/oh-my-agent/commit/233b81748268d4375b41f26fc5936f1e74c18cde))


### Bug Fixes

* **codex:** bypass hook trust on oma-driven runs and drop dead flags ([211684c](https://github.com/first-fluke/oh-my-agent/commit/211684c153d5d4a6bf355cd0dfc7602ceae82229))
* **hooks:** correct grok/qwen shell matchers and force-enable qwen hooks ([6f3c421](https://github.com/first-fluke/oh-my-agent/commit/6f3c4213373f1da1dfe76f8d4e4c42f7715ab10d))
* **hooks:** normalize ContentPart[] prompts and skip relayed agent messages ([8abc2c5](https://github.com/first-fluke/oh-my-agent/commit/8abc2c5f8ffc28694d2b06985c52bc8d609d8eb2))
* **hooks:** rewrite opencode bridge for plugin API mutation contract ([8428360](https://github.com/first-fluke/oh-my-agent/commit/84283605bb8e9c8f7995c592cc5f7d3b8a41ad90))

## [10.12.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.12.0...cli-v10.12.1) (2026-07-07)


### Bug Fixes

* **cli:** back-fill new SSOT MCP servers into existing .mcp.json ([5bc0b78](https://github.com/first-fluke/oh-my-agent/commit/5bc0b786ccbcf234f685d344444da487d19eb363))

## [10.12.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.11.0...cli-v10.12.0) (2026-07-07)


### Features

* **schedule:** validate --model vendor on schedule:add ([8a15d14](https://github.com/first-fluke/oh-my-agent/commit/8a15d147f5d0e84c9da82752eb49aa1943833531))


### Bug Fixes

* **market:** correct --diversity-threshold help and drop dead stub helper ([2326d05](https://github.com/first-fluke/oh-my-agent/commit/2326d050815bb07c44657d0351f7771024123781))
* **schedule:** support day-of-week ranges and lists in schtasks adapter ([2ad7794](https://github.com/first-fluke/oh-my-agent/commit/2ad7794eec14e5d70aa8948f8b8e41adbccc6487))


### Documentation

* **market:** align skill and rules with actual CLI behavior ([622864e](https://github.com/first-fluke/oh-my-agent/commit/622864ecb17b52c08b760332a07a25d2b2f29694))
* **schedule:** fix rounding example and document windows cron shapes ([a1f00bd](https://github.com/first-fluke/oh-my-agent/commit/a1f00bd08af8057851006bed0467f077f4916ae4))

## [10.11.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.10.0...cli-v10.11.0) (2026-07-07)


### Features

* **skills:** add naming roles and api evolution patterns ([1b14c18](https://github.com/first-fluke/oh-my-agent/commit/1b14c187aef696af125f81433526286c66338962))

## [10.10.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.9.0...cli-v10.10.0) (2026-07-04)


### Features

* **cli:** enable serena auto_update by default ([739590d](https://github.com/first-fluke/oh-my-agent/commit/739590da819bb8172f1d961ce3b76541cb854326))


### Documentation

* **agents:** add serena mcp timeout fallback guidance for opencode ([b9752c8](https://github.com/first-fluke/oh-my-agent/commit/b9752c88459260f3947f69e79492b5ee667dea6d))

## [10.9.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.8.0...cli-v10.9.0) (2026-07-04)


### Features

* **skills:** expand oma-design audit rules and workflow protocols ([1a2882f](https://github.com/first-fluke/oh-my-agent/commit/1a2882f76716524cbdc16297d2a762bfe2fb6566))

## [10.8.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.7.2...cli-v10.8.0) (2026-07-02)


### Features

* **frontend:** support angular in oma-frontend skill and /stack-set ([b87ca76](https://github.com/first-fluke/oh-my-agent/commit/b87ca76152379fe26882a6483b1194a61e513f3e)), closes [#587](https://github.com/first-fluke/oh-my-agent/issues/587)

## [10.7.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.7.1...cli-v10.7.2) (2026-06-28)


### Bug Fixes

* **cli:** normalize cwd to project root for .agents state writes ([83b4344](https://github.com/first-fluke/oh-my-agent/commit/83b434400d59e994cdbcecfbb361b176174dfbca))

## [10.7.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.7.0...cli-v10.7.1) (2026-06-27)


### Bug Fixes

* **install:** make model preset OpenCode-aware and skippable ([3601dbd](https://github.com/first-fluke/oh-my-agent/commit/3601dbd24d9f2328b86af04872e2397bada5def6)), closes [#580](https://github.com/first-fluke/oh-my-agent/issues/580)


### Refactoring

* **cli:** bundle external invocation builder args into one object ([59c31f5](https://github.com/first-fluke/oh-my-agent/commit/59c31f5d29a84d3506d3f2b4985d4fa4c2b3fb44))

## [10.7.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.6.1...cli-v10.7.0) (2026-06-27)


### Features

* **agent-composer:** pin opencode model/variant for routed agents ([bc7a3c5](https://github.com/first-fluke/oh-my-agent/commit/bc7a3c5fd5842906b5d60115a31f682a84c5b1c7))
* **sns:** add Bluesky announce target ([725c7be](https://github.com/first-fluke/oh-my-agent/commit/725c7be0dd69553212942d2f807bf43c6dc60eb3))


### Bug Fixes

* **agent:** persist spawn status and fix opencode subagent dispatch ([82b8cf9](https://github.com/first-fluke/oh-my-agent/commit/82b8cf94632a054471290cc50443948a72dad6de))


### Documentation

* **vendor-detection:** rank opencode native task above apply_patch ([991ab19](https://github.com/first-fluke/oh-my-agent/commit/991ab191fb37215ba9f8a0f51b23b0e3659ed316))

## [10.6.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.6.0...cli-v10.6.1) (2026-06-26)


### Bug Fixes

* **sns:** harden agent JSON parsing with jsonrepair and retry ([fda16b9](https://github.com/first-fluke/oh-my-agent/commit/fda16b99632d2661f0e1f3b84a9f465b82bd1ca3))

## [10.6.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.5.0...cli-v10.6.0) (2026-06-26)


### Features

* **install:** pre-accept Claude Code workspace trust on project link ([580b178](https://github.com/first-fluke/oh-my-agent/commit/580b1788619a3e02249b298d3a8fae43b42b5bec))


### Bug Fixes

* **opencode:** inherit user default model instead of hardcoded slug ([31bcc39](https://github.com/first-fluke/oh-my-agent/commit/31bcc39f25c9fff3f119c066cf59160d825a8bff))

## [10.5.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.4.2...cli-v10.5.0) (2026-06-26)


### Features

* **serena:** self-install binary on install, probe in doctor ([b712bac](https://github.com/first-fluke/oh-my-agent/commit/b712bac819886c2a2df5e5b46c26bba616364227)), closes [#578](https://github.com/first-fluke/oh-my-agent/issues/578)


### Bug Fixes

* **antigravity:** re-stamp serena MCP --context to antigravity ([169a9d2](https://github.com/first-fluke/oh-my-agent/commit/169a9d2a94a838f1b0444c53701804111c5b4696)), closes [#578](https://github.com/first-fluke/oh-my-agent/issues/578)
* **serena:** exclude .serena/cache from default project scan ([4cac889](https://github.com/first-fluke/oh-my-agent/commit/4cac889cdd8b93e9384309f7061f4e3b6bc83904)), closes [#578](https://github.com/first-fluke/oh-my-agent/issues/578)
* **serena:** use --project-from-cwd for project resolution ([3f22ce4](https://github.com/first-fluke/oh-my-agent/commit/3f22ce4ef70a55ded2eae449cac1adf1b37ac019)), closes [#578](https://github.com/first-fluke/oh-my-agent/issues/578)

## [10.4.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.4.1...cli-v10.4.2) (2026-06-25)


### Bug Fixes

* **agents:** raise maxTurns to prevent orchestrate mid-task cutoff ([0ed9556](https://github.com/first-fluke/oh-my-agent/commit/0ed955690f4c06c761744c3288dc6d538f10cd13))


### Documentation

* **oma-scm:** add explicit user override guardrail ([50aab2f](https://github.com/first-fluke/oh-my-agent/commit/50aab2f7b81d6208759d3b73d989d7888990398c))

## [10.4.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.4.0...cli-v10.4.1) (2026-06-22)


### Bug Fixes

* **hooks:** guard persistent mode against unknown-session state files ([cd8af17](https://github.com/first-fluke/oh-my-agent/commit/cd8af17e6be66233c63b41db17961bacbe0c9145))

## [10.4.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.3.3...cli-v10.4.0) (2026-06-22)


### Features

* **cli:** add ZCode workflow command vendor ([f9b6f14](https://github.com/first-fluke/oh-my-agent/commit/f9b6f1401eba60c037808d775a1d3fe7af3ecc66))
* **install:** add OpenCode to CLI picker and allow skipping selection ([08639a3](https://github.com/first-fluke/oh-my-agent/commit/08639a377cde27dbc80a74b57fc5ae9c05928a5c)), closes [#575](https://github.com/first-fluke/oh-my-agent/issues/575)


### Bug Fixes

* **manifest:** exclude run-time backups and vendored lockfile ([06d5a98](https://github.com/first-fluke/oh-my-agent/commit/06d5a98f5d22c31157db94270d32eecd5eeec349))


### Refactoring

* **contracts:** relocate generated API contracts out of skill SSOT ([275a475](https://github.com/first-fluke/oh-my-agent/commit/275a475cbc1602bf8a548e264287d4fdfdde932a))


### Documentation

* **readme:** clarify workflow table, add /schedule and kiro preset ([60a0646](https://github.com/first-fluke/oh-my-agent/commit/60a0646297c20c0aa3cbd8a3002c13ae059a900f))

## [10.3.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.3.2...cli-v10.3.3) (2026-06-21)


### Bug Fixes

* **opencode:** generate valid config in oma link ([#571](https://github.com/first-fluke/oh-my-agent/issues/571)) ([6227e1b](https://github.com/first-fluke/oh-my-agent/commit/6227e1bc910f5dbff7287985e6d3bc6b1e531c99))

## [10.3.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.3.1...cli-v10.3.2) (2026-06-20)


### Documentation

* **skills:** recommend type-fest for frontend and node backend stacks ([006f038](https://github.com/first-fluke/oh-my-agent/commit/006f03811a725b3497377b8c9a0da6809c7f4f84))

## [10.3.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.3.0...cli-v10.3.1) (2026-06-19)


### Bug Fixes

* **hooks:** make AgentMemory recall/observe never throw (flaky fix) ([d993ae4](https://github.com/first-fluke/oh-my-agent/commit/d993ae4ff9a501ef8d9d6f090ca1cc6c8b686f20))

## [10.3.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.2.1...cli-v10.3.0) (2026-06-19)


### Features

* **video:** inject agent-authored scripts via --script flag ([38fda9c](https://github.com/first-fluke/oh-my-agent/commit/38fda9c309943bcde6769a6740a493a59dc9d137))


### Bug Fixes

* **video:** show active caption cue and align caption timing to scenes ([67aa654](https://github.com/first-fluke/oh-my-agent/commit/67aa654feb50e19688f1cb5db79c2f5fe39c7868))
* **video:** verify headless shell binary and self-heal extraction ([f633ebd](https://github.com/first-fluke/oh-my-agent/commit/f633ebd5ef1eb8261f5ee67bc65ead7e5744c3e2))


### Documentation

* **oma-frontend:** allow Jotai or Zustand for client state ([0273a48](https://github.com/first-fluke/oh-my-agent/commit/0273a4844db9d0abdf608d77c8d3c736b173f054))
* **oma-frontend:** default shadcn/ui to Base UI engine ([f52299e](https://github.com/first-fluke/oh-my-agent/commit/f52299eeedad3b9e82b81e27256d233c9f566d80))

## [10.2.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.2.0...cli-v10.2.1) (2026-06-18)


### Refactoring

* **state:** emit L1 decisions via oma state:emit directly ([a4c2a40](https://github.com/first-fluke/oh-my-agent/commit/a4c2a40b289f7607afbb7338d5fa97415bf4b591))

## [10.2.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.1.0...cli-v10.2.0) (2026-06-18)


### Features

* **workflows:** replace pdf workflow with category-routed convert ([e3dca07](https://github.com/first-fluke/oh-my-agent/commit/e3dca0770441f22f7e2567b4066776c40fa96ae8))

## [10.1.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.0.1...cli-v10.1.0) (2026-06-18)


### Features

* **docs:** cut oma docs verify noise via docs.exclude + gitignore-aware skip ([b584773](https://github.com/first-fluke/oh-my-agent/commit/b584773d360e7587f6d07841aa794555220ccb13))


### Refactoring

* **cli:** collapse planDispatch duplicate dispatch tails ([e09fcb4](https://github.com/first-fluke/oh-my-agent/commit/e09fcb47ebd2b6ad4d02022fd6bd4bbcdf7157b2))
* **cli:** route buildExternalInvocation via vendor dispatch table ([f058c7e](https://github.com/first-fluke/oh-my-agent/commit/f058c7ef2b001129579d4021b1f440ee81e89ab9))


### Documentation

* align README multi-vendor list with actual model presets ([8c30344](https://github.com/first-fluke/oh-my-agent/commit/8c3034470f2fdcc819a4ef6f4e196f58fa68892b))
* fix stale doc references found by oma docs verify ([932bd2c](https://github.com/first-fluke/oh-my-agent/commit/932bd2ceec4caa6cd9e261f70f5e9e6b06c639b6))

## [10.0.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v10.0.0...cli-v10.0.1) (2026-06-18)


### Documentation

* **readme:** rewrite slash-command table as friendly one-liners ([212b3fa](https://github.com/first-fluke/oh-my-agent/commit/212b3faf01ac3aeeb63553d6527ab53a6f579bf5))
* **rules:** add schedule to generated workflow table ([da94d06](https://github.com/first-fluke/oh-my-agent/commit/da94d06f4cf6ba54acf97841ca820cca021131bf))

## [10.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.10.0...cli-v10.0.0) (2026-06-18)


### ⚠ BREAKING CHANGES

* **vendors:** complete Gemini CLI removal across .agents runtime + cli

### Features

* **vendors:** complete Gemini CLI removal across .agents runtime + cli ([ff390a8](https://github.com/first-fluke/oh-my-agent/commit/ff390a870b77f91958fafae81ef08f653a3f0f3a))


### Refactoring

* **hooks:** centralize vendor detection in .agents/hooks/core (P6) ([02b0213](https://github.com/first-fluke/oh-my-agent/commit/02b02136e463891d3c1d9b5d4e56ba11279373cb))
* **scripts:** reuse cli dispatch in agent-spawn (drop hand map) ([cfabbb7](https://github.com/first-fluke/oh-my-agent/commit/cfabbb74ab8d4452030665ee3f14899ce3c2620a))
* **scripts:** validate AgentVendor against RuntimeVendor SSOT ([33d2bf7](https://github.com/first-fluke/oh-my-agent/commit/33d2bf729883928dc51474535a5c515460b8c669))


### Documentation

* **vendors:** drop stale gemini mentions from hook-runtime comments ([b13273f](https://github.com/first-fluke/oh-my-agent/commit/b13273fcc9aff051ff1d405df1b32ac7e410602b))

## [9.10.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.9.1...cli-v9.10.0) (2026-06-18)


### Features

* **sns:** add TabNews (pt-BR) publishing target ([298a42e](https://github.com/first-fluke/oh-my-agent/commit/298a42e6ab8c25518e814e66287d0dd6b65eee46))


### Refactoring

* **runtime-dispatch:** collapse native if-chain into dispatch table ([b3ac57b](https://github.com/first-fluke/oh-my-agent/commit/b3ac57bd5d069c9171a9b36ac84a113fad9a9fba))


### Documentation

* list supported AI IDEs A-Z and unify Grok Build label ([ac6d39e](https://github.com/first-fluke/oh-my-agent/commit/ac6d39ecd30216066b8b4eb3feb4569f45de1277))

## [9.9.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.9.0...cli-v9.9.1) (2026-06-17)


### Documentation

* **oma-mobile:** align swift-ios variant with volunteerly reference ([fc0db44](https://github.com/first-fluke/oh-my-agent/commit/fc0db448ad56c933cd259a5db3b4c275354b1408))

## [9.9.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.8.0...cli-v9.9.0) (2026-06-17)


### Features

* **kimi:** integrate Kimi Code CLI as a first-class vendor ([cb5561a](https://github.com/first-fluke/oh-my-agent/commit/cb5561af9cf0d83da39e71ac52f84863258bc1cf))

## [9.8.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.7.0...cli-v9.8.0) (2026-06-16)


### Features

* **scm:** honor oma-config language for user-facing output ([629b9d7](https://github.com/first-fluke/oh-my-agent/commit/629b9d7a433b8f8417a7f7a072986e4a7b410e1b)), closes [#552](https://github.com/first-fluke/oh-my-agent/issues/552)

## [9.7.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.6.0...cli-v9.7.0) (2026-06-16)


### Features

* **schedule:** add cross-vendor OS-level scheduler ([14eaa55](https://github.com/first-fluke/oh-my-agent/commit/14eaa550f8ad6b3fb2aaa1e6df1fc517e0dcfdc9))

## [9.6.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.5.0...cli-v9.6.0) (2026-06-16)


### Features

* **serena:** add memory reaper to reclaim idle language servers ([32dcc4f](https://github.com/first-fluke/oh-my-agent/commit/32dcc4f84c5e00f9488b2ea08de6cda5650e3414))


### Documentation

* **cli:** document serena reaper commands and config ([605634c](https://github.com/first-fluke/oh-my-agent/commit/605634c6a1b3bb68f5e60862aa20ede64b132591))

## [9.5.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.4.0...cli-v9.5.0) (2026-06-15)


### Features

* add OpenCode vendor support for subagent dispatch ([8757e41](https://github.com/first-fluke/oh-my-agent/commit/8757e413ae5f37a180425cbda365da1ec8d02c39)), closes [#544](https://github.com/first-fluke/oh-my-agent/issues/544)
* add OpenCode vendor support for subagent dispatch ([#544](https://github.com/first-fluke/oh-my-agent/issues/544)) ([fa224ac](https://github.com/first-fluke/oh-my-agent/commit/fa224ace76d3d7a6be9b7392ee820cfc05f3a7c2))

## [9.4.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.3.1...cli-v9.4.0) (2026-06-14)


### Features

* **skills:** mandate repo-layer response cache across mobile variants ([58e5b11](https://github.com/first-fluke/oh-my-agent/commit/58e5b11873042f27fede9e2767d26f3c060b0ec2))

## [9.3.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.3.0...cli-v9.3.1) (2026-06-13)


### Documentation

* **i18n:** add /deepinit and /ralph rows to translated READMEs ([cbe1313](https://github.com/first-fluke/oh-my-agent/commit/cbe1313b6e8d22006d2752174449f4f185e79c8e))
* sync README and web/docs with actual CLI and skill/workflow surface ([5de4fc3](https://github.com/first-fluke/oh-my-agent/commit/5de4fc3ea700b17c92f7ba6bfa8861c943ec9a71))

## [9.3.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.2.0...cli-v9.3.0) (2026-06-13)


### Features

* **memory:** add memory:gc to prune project-local L1 + Serena state ([6190f80](https://github.com/first-fluke/oh-my-agent/commit/6190f80ade7ef34740981e89d285ce76b04f786d))


### Refactoring

* **commands:** flatten nested same-name dirs and files ([354b732](https://github.com/first-fluke/oh-my-agent/commit/354b732bfd369a78a6dd4e7e3278b68d7facc0b1))
* **config:** drop standalone gemini preset, redirect to antigravity ([84968cf](https://github.com/first-fluke/oh-my-agent/commit/84968cff10d06440966bef869df5e2914a0196cc))


### Documentation

* **mobile:** standardize route-layer swipe-back for nav-bar-hidden screens ([6b275e2](https://github.com/first-fluke/oh-my-agent/commit/6b275e2ed38895ad66105bd98335798c7778e7ea))

## [9.2.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.1.1...cli-v9.2.0) (2026-06-13)


### Features

* **hooks:** add age-based TTL to AgentMemory recall ([99012bd](https://github.com/first-fluke/oh-my-agent/commit/99012bde3fa3b0adecb8d4a9eef6302ebce4c57e))


### Bug Fixes

* **settings:** move cleanupPeriodDays to top level, stringify env tunables ([fdebf5c](https://github.com/first-fluke/oh-my-agent/commit/fdebf5c325eeab0c376ccc3495dc96ec95529636))


### Performance

* **hooks:** tighten UserPromptSubmit handler timeouts ([9f20466](https://github.com/first-fluke/oh-my-agent/commit/9f204665753e4137101ac242b48e8c8725449dc9))


### Refactoring

* **rules:** sort index deterministically, split ARB into scoped rule ([7261c42](https://github.com/first-fluke/oh-my-agent/commit/7261c423f41b68bd34c8b6bc453eb7aacf250ff4))

## [9.1.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.1.0...cli-v9.1.1) (2026-06-12)


### Bug Fixes

* **cli:** stop bulk-deleting vendor skill symlinks on every update ([5f33f83](https://github.com/first-fluke/oh-my-agent/commit/5f33f83976d7eaebc8214a5899f4d86ddc7424cf))

## [9.1.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.0.2...cli-v9.1.0) (2026-06-12)


### Features

* **agents:** add oma-refactor keyword triggers and uvx metric commands ([c9a7b67](https://github.com/first-fluke/oh-my-agent/commit/c9a7b67eef1cac9c19896905ee516074c6f3b043))
* **update:** append missing template config keys to oma-config.yaml ([424fd9e](https://github.com/first-fluke/oh-my-agent/commit/424fd9e8f7755b334caf6c195fedb64e88a71105))


### Bug Fixes

* **cli:** default migrated model preset to antigravity ([7a2c72f](https://github.com/first-fluke/oh-my-agent/commit/7a2c72fe336e81e1863ed7b82143c30b738c93d8))
* **docs:** cut verify false positives in extract and resolve ([3f480fe](https://github.com/first-fluke/oh-my-agent/commit/3f480feece01463d1b9faf66bef9f51a2a92697e)), closes [#533](https://github.com/first-fluke/oh-my-agent/issues/533)


### Documentation

* **cli:** list coordination, refactor, and video skills in README ([4170c8d](https://github.com/first-fluke/oh-my-agent/commit/4170c8d14ce8d917e2aa5141aaf98a760a820b35))

## [9.0.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.0.1...cli-v9.0.2) (2026-06-12)


### Bug Fixes

* **update:** never prune skills that shipped agents require ([07a331a](https://github.com/first-fluke/oh-my-agent/commit/07a331a73c144cfe5c92fbc57d222fbde01d111f))

## [9.0.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v9.0.0...cli-v9.0.1) (2026-06-12)


### Bug Fixes

* **skills:** close skill registry and README drift, add drift guard ([719e4db](https://github.com/first-fluke/oh-my-agent/commit/719e4dbf8f41effa20ad32942e1364d36945bed5))

## [9.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.54.0...cli-v9.0.0) (2026-06-12)


### ⚠ BREAKING CHANGES

* **agents:** the `retrieval` agent id is no longer accepted at runtime. `agents: retrieval:` overrides in oma-config.yaml are auto-migrated to `agents: explore:` by migration 014; configs edited by hand afterwards must use `explore`.

### Features

* **agents:** drop the retrieval alias; migrate configs to explore ([b2d55e5](https://github.com/first-fluke/oh-my-agent/commit/b2d55e5c82a51050d3047c1a2738fe20b221a666))

## [8.54.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.53.0...cli-v8.54.0) (2026-06-11)


### Features

* **agents:** add refactor-engineer and research-explorer agents ([e2672d3](https://github.com/first-fluke/oh-my-agent/commit/e2672d3f91396934c0a5efda9465e7d138416990))
* **agents:** rename canonical agent id retrieval to explore ([3a26950](https://github.com/first-fluke/oh-my-agent/commit/3a2695019a34125e36f2efc86662d7c31e59e38e))
* **agents:** wire research-explorer to the retrieval preset slot ([c5764ef](https://github.com/first-fluke/oh-my-agent/commit/c5764ef0462ff1a17b21bceb2c2b380e0f3add66))

## [8.53.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.9...cli-v8.53.0) (2026-06-11)


### Features

* **skills:** add oma-refactor skill ([53f1d88](https://github.com/first-fluke/oh-my-agent/commit/53f1d88c1f85db50556f6c093771732e0ea4636c))

## [8.52.9](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.8...cli-v8.52.9) (2026-06-11)


### Bug Fixes

* **antigravity:** preserve user-registered hooks in agy hooks.json ([204af86](https://github.com/first-fluke/oh-my-agent/commit/204af86e5680fe0a1a3a4031e6cf2eba68249825))
* **install:** stop writing project-level .gemini/antigravity-cli ([dce2373](https://github.com/first-fluke/oh-my-agent/commit/dce237312b0642b72b37548141857586989af962))

## [8.52.8](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.7...cli-v8.52.8) (2026-06-11)


### Documentation

* **readme:** drop cli section, fold per-agent models into how it works ([253d658](https://github.com/first-fluke/oh-my-agent/commit/253d65836353f7f33827adc90962c54f78259b16))

## [8.52.7](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.6...cli-v8.52.7) (2026-06-11)


### Refactoring

* **cli:** drop the unused CLI i18n catalog ([ceac2eb](https://github.com/first-fluke/oh-my-agent/commit/ceac2eb4a2944d3cedd0c5c5ccaea9d7f4668c89))

## [8.52.6](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.5...cli-v8.52.6) (2026-06-11)


### Performance

* **cli:** lazy-load command tree with an argv fast path for oma hook ([b31d08b](https://github.com/first-fluke/oh-my-agent/commit/b31d08bf75fb833455f1819488b91bc6964aa9d5))


### Refactoring

* **cli:** back terminal dashboard with dashboard/state parser ([9e193b7](https://github.com/first-fluke/oh-my-agent/commit/9e193b757446d6ac8ce5d53bec38b33da0f3d04c))
* **cli:** centralize the standard exit-code scale ([04ad3a0](https://github.com/first-fluke/oh-my-agent/commit/04ad3a0c833636db4dd3be6349eebbb9392323aa))
* **cli:** consolidate findFileUp into utils/fs-utils ([cfef58e](https://github.com/first-fluke/oh-my-agent/commit/cfef58ec308080937cd39a74e9c5866c5c41bf5c))
* **cli:** consolidate isRecord type guards into utils/type-guards ([7aba567](https://github.com/first-fluke/oh-my-agent/commit/7aba5679aebee0fd285108cd734649cf333b9c3e))
* **cli:** deduplicate search subcommand action boilerplate ([4a28d90](https://github.com/first-fluke/oh-my-agent/commit/4a28d9042e13045b76486bdbfd2497a095bf6a36))
* **cli:** derive vendor type unions from canonical constants ([9213c07](https://github.com/first-fluke/oh-my-agent/commit/9213c07f379609ee42e60ca9ada75e2379ca6be4))
* **cli:** extract shared MarkdownRecordStore for session memories ([e612e7f](https://github.com/first-fluke/oh-my-agent/commit/e612e7f1f04998eb86672d1b275d0f3b26e7bc4e))
* **cli:** extract shared run naming and dir-guard helpers from image/video ([632c83b](https://github.com/first-fluke/oh-my-agent/commit/632c83b8f859a59abf8b35020e7603ea27a408fd))
* **cli:** make command registration data-driven in cli.ts ([a57cd52](https://github.com/first-fluke/oh-my-agent/commit/a57cd52d32aaa713ec9d3a19edeff070c13c27fa))
* **cli:** restore the cross-slice boundary gate to green ([8e772f4](https://github.com/first-fluke/oh-my-agent/commit/8e772f4c647d1a1def8c27bf772e6d664aec2f17))
* **cli:** route vendor config writes through safe-write ([c46aad2](https://github.com/first-fluke/oh-my-agent/commit/c46aad27b9f56499175478b65a68c06c1664b640))
* **cli:** share auth-probe boilerplate across vendor adapters ([b5b3d73](https://github.com/first-fluke/oh-my-agent/commit/b5b3d73522c54701a5cc771ff1b21d1cf2936d9b))
* **cli:** share gemini-family settings helpers between gemini/qwen ([f0792da](https://github.com/first-fluke/oh-my-agent/commit/f0792da7a9fb1080a57ddeefcdb046d647084f51))
* **cli:** share untrusted-variant loading between composers ([cb9dcf3](https://github.com/first-fluke/oh-my-agent/commit/cb9dcf377032f1bab3371f00ae0f40c9fe51c090))
* **cli:** split agentmemory-service into file/command/orchestration layers ([5aa9cca](https://github.com/first-fluke/oh-my-agent/commit/5aa9cca211f81a39605297cd1708b6a107d69e9e))
* **cli:** use shared isRecord in qwen settings ([2948f31](https://github.com/first-fluke/oh-my-agent/commit/2948f31e5b4e7949024276bb28feb04f48115046))

## [8.52.5](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.4...cli-v8.52.5) (2026-06-10)


### Refactoring

* **cli:** split files over 500 lines into sub-modules ([e3100c3](https://github.com/first-fluke/oh-my-agent/commit/e3100c30c202faced370a7f27d75d95675881a14))


### Documentation

* **rules:** add self-describing file naming convention for frontend ([543002e](https://github.com/first-fluke/oh-my-agent/commit/543002e49c993c35c92257d8e8ad0f00f7f40a3f))

## [8.52.4](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.3...cli-v8.52.4) (2026-06-10)


### Bug Fixes

* **hooks:** align vendor hook dialects with official specs, wire commandcode ([95eedeb](https://github.com/first-fluke/oh-my-agent/commit/95eedeb26acbf199e9dac4514fa8bf194505c9d2))
* **install:** materialize only variant-required hook scripts per vendor ([d8c59fd](https://github.com/first-fluke/oh-my-agent/commit/d8c59fd9f328fcaf1155f9fb3e209118310d0f09))

## [8.52.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.2...cli-v8.52.3) (2026-06-10)


### Bug Fixes

* **cli:** cross-platform process and resource lifecycle hardening ([f332e1e](https://github.com/first-fluke/oh-my-agent/commit/f332e1e05ad54d5c6b37ede9b97a6b34e6fc9a22))
* **install:** copy hook runtime and agent definitions on install ([6f3993c](https://github.com/first-fluke/oh-my-agent/commit/6f3993c0c94e69caad5e5633894f57975e750153))
* **market:** deterministic clustering and diversity threshold wiring ([095775a](https://github.com/first-fluke/oh-my-agent/commit/095775aa856484931d1e7dc990a3e7e577cbcd2e))
* **platform:** case-insensitive containment and manifest hardening ([c5b8533](https://github.com/first-fluke/oh-my-agent/commit/c5b85337bb4b95e92a32248a32f29d72f4f68f2f))
* **recap:** pair responses by full prompt in claude/grok parsers ([169e621](https://github.com/first-fluke/oh-my-agent/commit/169e6213a00b5f398e73e662e135409e4dd2e29e))
* **retro:** format git dates in local timezone for shipping streak ([bbbf47c](https://github.com/first-fluke/oh-my-agent/commit/bbbf47c43e1b39de152061835449b7bf6535cbc1))
* **security:** replace shell execs and validate runtime inputs ([a802343](https://github.com/first-fluke/oh-my-agent/commit/a802343dc65b6f8ea3dccb361d2f93ed65ef79a1))

## [8.52.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.1...cli-v8.52.2) (2026-06-10)


### Bug Fixes

* **agent:** add auth probe timeouts and close log fd on spawn failure ([c422ce9](https://github.com/first-fluke/oh-my-agent/commit/c422ce9d7f760678bf19d598bcf7de2c6bac3f50))
* **recap:** stamp single-turn cursor sessions at file birth time ([c022b3b](https://github.com/first-fluke/oh-my-agent/commit/c022b3b1c02c85f7ec32caf9ddc5f0d18ac55d3b))
* **security:** harden cli against ssrf and injection vectors ([4ecaf22](https://github.com/first-fluke/oh-my-agent/commit/4ecaf22b9c18b79f342c39c2bb81d29e7aedf165))

## [8.52.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.52.0...cli-v8.52.1) (2026-06-10)


### Bug Fixes

* **hooks:** cap oma hook stdin read with fail-open timeout ([dffcf55](https://github.com/first-fluke/oh-my-agent/commit/dffcf556bd7797408eb67e7b5e4decb9c37e9800))

## [8.52.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.51.1...cli-v8.52.0) (2026-06-10)


### Features

* **hooks:** add serena-primer to inject serena tool guidance per session ([e6eea37](https://github.com/first-fluke/oh-my-agent/commit/e6eea37d9dceb00f9322fc26091f5ee5b7c9435a))

## [8.51.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.51.0...cli-v8.51.1) (2026-06-10)


### Bug Fixes

* **workflows:** resolve workflow review findings across all severities ([1ecf200](https://github.com/first-fluke/oh-my-agent/commit/1ecf20076025c46c8c30ddb493b21e0c582e75ef))

## [8.51.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.50.0...cli-v8.51.0) (2026-06-09)


### Features

* **cli:** add oma ralph:verify for the EXEC anti-circumvention gate ([f2502e8](https://github.com/first-fluke/oh-my-agent/commit/f2502e83ec1a0a7289cdfa4b0cf88cd2d987cb8b))


### Bug Fixes

* **hooks:** stop workflow-name artifact mentions re-triggering ralph ([5478ceb](https://github.com/first-fluke/oh-my-agent/commit/5478cebdb466f334bdf7d6ad306ee9525c38d6c6))
* **skills:** correct drifted commands, refs, and defaults across skills ([7dc29bb](https://github.com/first-fluke/oh-my-agent/commit/7dc29bbbfdf785dd727498ff9ba97a59f251406b))
* **skills:** resolve remaining low-severity review findings ([9284c6c](https://github.com/first-fluke/oh-my-agent/commit/9284c6c3ac0e3f19512126e0fd2f2d9082228151))

## [8.50.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.49.1...cli-v8.50.0) (2026-06-09)


### Features

* **workflows:** harden ralph judge independence and session memory ([2ad2796](https://github.com/first-fluke/oh-my-agent/commit/2ad279694ba2d0c4d5e159da91588e6eabb6aa9a))


### Bug Fixes

* **cli:** exclude local runtime state from prompt manifest ([ad15b6f](https://github.com/first-fluke/oh-my-agent/commit/ad15b6f1ab0e01239ad6108adcaa375f03ce6161))


### Refactoring

* **backup:** route `oma skills opt` SKILL.md backups to .agents/backup/ ([77df982](https://github.com/first-fluke/oh-my-agent/commit/77df982975ec9ac15fa7a4acda6d8beca133e4c5))

## [8.49.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.49.0...cli-v8.49.1) (2026-06-09)


### Refactoring

* **backup:** consolidate all on-disk backups under .agents/backup/ ([fb909ac](https://github.com/first-fluke/oh-my-agent/commit/fb909aca5a10719225dbae98353eb654eb0bbe51))

## [8.49.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.48.0...cli-v8.49.0) (2026-06-09)


### Features

* **antigravity:** disable feedback survey prompt on install/update ([3344a30](https://github.com/first-fluke/oh-my-agent/commit/3344a30aa6099a70904ee9ac933c717534b6fbe8))


### Bug Fixes

* **gitignore:** ignore .migration-backup created by update migrations ([22d224c](https://github.com/first-fluke/oh-my-agent/commit/22d224c40437f2e865a70b0cf0f0991de4a69588))

## [8.48.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.47.1...cli-v8.48.0) (2026-06-09)


### Features

* **ralph:** gate EXEC on ultrawork artifacts and L1 checkpoint ([31b5ff4](https://github.com/first-fluke/oh-my-agent/commit/31b5ff460c6df1b52d60a606de7995e7cfef91b3))


### Bug Fixes

* **hooks:** stop meta-discussion from activating persistent workflows ([2a7649b](https://github.com/first-fluke/oh-my-agent/commit/2a7649b3fa3996ce6605fd7e50cded1f3bbddda1))

## [8.47.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.47.0...cli-v8.47.1) (2026-06-09)


### Bug Fixes

* **skills-installer:** add commandcode to HOOK_VENDORS ([4e0b1e5](https://github.com/first-fluke/oh-my-agent/commit/4e0b1e5872965e226d13dfe3916916a496347c2e))

## [8.47.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.46.0...cli-v8.47.0) (2026-06-08)


### Features

* add commandcode vendor support ([27f072d](https://github.com/first-fluke/oh-my-agent/commit/27f072d5fd0486bb7dde2696f6416ae7930a5afe))
* **install:** revamp preset options and vendor default selection ([860f20e](https://github.com/first-fluke/oh-my-agent/commit/860f20eb653558d79c4a1ac533251aa00114362a))

## [8.46.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.45.1...cli-v8.46.0) (2026-06-08)


### Features

* **scripts:** add unified sns pipeline for dev.to and Qiita ([4513b5c](https://github.com/first-fluke/oh-my-agent/commit/4513b5c65802eb5411f808707541994c3fc584f6))

## [8.45.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.45.0...cli-v8.45.1) (2026-06-08)


### Bug Fixes

* **security:** contain path traversal in vendor install and video assets ([7317081](https://github.com/first-fluke/oh-my-agent/commit/731708102ff4bd6b5b1a26004b24983423c1ba4e))
* **security:** harden slide --inline-fonts against XSS and SSRF ([ec69987](https://github.com/first-fluke/oh-my-agent/commit/ec69987ca854eb482acb2416fe0c96a3fa124ba8))
* **security:** prevent shell command injection in CLI subprocess calls ([c069080](https://github.com/first-fluke/oh-my-agent/commit/c0690809d259ad884378df4812d3bc4162697ae6))

## [8.45.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.44.0...cli-v8.45.0) (2026-06-08)


### Features

* **agent:** add pi as a per-agent dispatch vendor ([319bafe](https://github.com/first-fluke/oh-my-agent/commit/319bafe69137ebe5a7a4a1e1de908a849ad5e85f))

## [8.44.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.43.0...cli-v8.44.0) (2026-06-07)


### Features

* **memory:** rehydrate AgentMemory facts at vendor boundary ([81717e7](https://github.com/first-fluke/oh-my-agent/commit/81717e7625d971e1d5df6c3a43bbd6817854a971))

## [8.43.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.42.0...cli-v8.43.0) (2026-06-07)


### Features

* **hook:** centralize vendor hook dispatch via oma hook abi ([2f5c89a](https://github.com/first-fluke/oh-my-agent/commit/2f5c89aed531a4170f3faa5a03966aeb9b4c7ecf))

## [8.42.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.41.3...cli-v8.42.0) (2026-06-05)


### Features

* **plugin:** bootstrap oma CLI from Claude marketplace install ([8505ac1](https://github.com/first-fluke/oh-my-agent/commit/8505ac199b4cd4e9d5d87a756b1ee25501e61404))


### Bug Fixes

* **install:** reclaim a crashed install/update lock in 60s, not 10min ([#496](https://github.com/first-fluke/oh-my-agent/issues/496)) ([a4a0c77](https://github.com/first-fluke/oh-my-agent/commit/a4a0c777a7cb86b43e4338eb90cbef510f517b3f))

## [8.41.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.41.2...cli-v8.41.3) (2026-06-05)


### Bug Fixes

* **install:** enforce TLS 1.2 in Windows installer ([772ac3d](https://github.com/first-fluke/oh-my-agent/commit/772ac3d4c75506bccf7d677d4cb463c9d815882f))

## [8.41.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.41.1...cli-v8.41.2) (2026-06-05)


### Bug Fixes

* **scripts:** improve JSON parsing from agent output in devto script ([41b9138](https://github.com/first-fluke/oh-my-agent/commit/41b9138d920e7a587b465c9921ae36d2b36e0d8d))
* **skills:** isolate eval baseline so utility lift is honest ([54e8b2a](https://github.com/first-fluke/oh-my-agent/commit/54e8b2a10aa05556a4dd4a7a37ea94105d5164fb))


### Documentation

* replace Gemini CLI with Antigravity and add Pi agent ([5874ebe](https://github.com/first-fluke/oh-my-agent/commit/5874ebea6288c0089b6dfc25968ab8f4d7530645))

## [8.41.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.41.0...cli-v8.41.1) (2026-06-05)


### Refactoring

* **slide:** drop print !important via source-side cascade fixes ([0bed0db](https://github.com/first-fluke/oh-my-agent/commit/0bed0dbedea48e250a0aed3b0f72b62b2230e424))

## [8.41.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.40.1...cli-v8.41.0) (2026-06-05)


### Features

* **antigravity:** disable agy telemetry by default ([9f35a37](https://github.com/first-fluke/oh-my-agent/commit/9f35a37075cab46a5ec83c0e0125683d2251f3bf))
* **update:** preserve installed skill selection on update ([6fa88de](https://github.com/first-fluke/oh-my-agent/commit/6fa88de9d244c83eddfefda4228a3d1031266a93))


### Bug Fixes

* **cli:** stop runAction from clobbering positional operands ([436503d](https://github.com/first-fluke/oh-my-agent/commit/436503db7df7316d9fa73ca6e3ad4bf942f31a67))

## [8.40.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.40.0...cli-v8.40.1) (2026-06-05)


### Refactoring

* **install:** replace Gemini CLI option with Antigravity (agy) ([8d957b9](https://github.com/first-fluke/oh-my-agent/commit/8d957b990ef923ceb772f06f6b6657bcf6dd2e3a))

## [8.40.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.39.0...cli-v8.40.0) (2026-06-04)


### Features

* **skills:** add oma skills opt skill optimizer ([108188e](https://github.com/first-fluke/oh-my-agent/commit/108188eed6bc67cb2c4f45800b91ded206faa57e))


### Bug Fixes

* **cli:** pass optsWithGlobals to action handlers so --yes reaches them ([de6a3a1](https://github.com/first-fluke/oh-my-agent/commit/de6a3a157fdae01a1720b2b14a3ad4a0060c4d5f))

## [8.39.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.38.0...cli-v8.39.0) (2026-06-04)


### Features

* **video:** oma-video skill, /video workflow, and key-optional CLI ([#482](https://github.com/first-fluke/oh-my-agent/issues/482)) ([846f0c1](https://github.com/first-fluke/oh-my-agent/commit/846f0c1347d7879b429c47450d85652a248513c3))

## [8.38.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.37.0...cli-v8.38.0) (2026-06-04)


### Features

* **agent:** add --read-only tool restriction to agent:spawn ([412e44e](https://github.com/first-fluke/oh-my-agent/commit/412e44e79b64885705b05d33cb299ce5c713a345))
* **doctor:** report skill eval coverage ([ff59bb1](https://github.com/first-fluke/oh-my-agent/commit/ff59bb1070c5e10ab3d487aca0a907114e8a36c3))
* **skills:** add negative-transfer sampling to skills eval ([94db859](https://github.com/first-fluke/oh-my-agent/commit/94db859328ffe1b44a9fb280b86093f624796969))
* **skills:** add oma skills eval for skill utility measurement ([f0f2a6a](https://github.com/first-fluke/oh-my-agent/commit/f0f2a6a11b29c4fdc83a98c3671a35fe9ff0937b))


### Documentation

* add SkillOpt and SkillLens to references ([25f3faa](https://github.com/first-fluke/oh-my-agent/commit/25f3faada36ab34d85af827ecb4587fa76a26453))
* document oma skills eval and eval fixture convention ([7633ee9](https://github.com/first-fluke/oh-my-agent/commit/7633ee90a1b1c2d5682936fc47b075e019df2030))

## [8.37.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.36.0...cli-v8.37.0) (2026-06-04)


### Features

* **hooks:** add qwen statusLine (HUD) support with ui nesting ([cee4023](https://github.com/first-fluke/oh-my-agent/commit/cee4023b120eaed86293621f1c8f1d9a0baea0b1))
* **pi:** add Pi support ([#478](https://github.com/first-fluke/oh-my-agent/issues/478)) ([cd12359](https://github.com/first-fluke/oh-my-agent/commit/cd123591bd651df2b9bb6b08c49cb4db69b2504d))

## [8.36.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.35.0...cli-v8.36.0) (2026-06-04)


### Features

* **cursor:** disable cursor-agent commit attribution on link ([b1dc2c1](https://github.com/first-fluke/oh-my-agent/commit/b1dc2c1b0ad0d6be0908f0361dac552b251df53f))

## [8.35.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.34.1...cli-v8.35.0) (2026-06-04)


### Features

* **skills:** add black-hole and library-size checks to skills audit ([2a5aea4](https://github.com/first-fluke/oh-my-agent/commit/2a5aea458fe99cdccc24764ed15679b8125b0f8e))


### Refactoring

* **oma-hwp:** use Node fs API and proper types in flatten-tables ([8bca339](https://github.com/first-fluke/oh-my-agent/commit/8bca3397809938cc1c52797c09b780667aed2f7c))
* **skills:** symlink workflows directly, drop generated wrappers ([0206d71](https://github.com/first-fluke/oh-my-agent/commit/0206d713fcb290ade033fd30e2fffd16ca7fe9b6))


### Documentation

* bump SSL-lite arXiv preprint reference to Version 4 ([d3b7d7e](https://github.com/first-fluke/oh-my-agent/commit/d3b7d7ee63b0d136535b75e098d4c34e23ee5a28))

## [8.34.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.34.0...cli-v8.34.1) (2026-06-04)


### Bug Fixes

* **agent:** wrap antigravity subagents in a PTY to capture headless stdout ([d85fa6c](https://github.com/first-fluke/oh-my-agent/commit/d85fa6c40b64433e07c02c87091f7a14e660e4e7))

## [8.34.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.33.0...cli-v8.34.0) (2026-06-04)


### Features

* **hooks:** restore Grok .grok/rules context mirror ([fdbe42f](https://github.com/first-fluke/oh-my-agent/commit/fdbe42fc79839d980a887210e498c8cc12cde9fd))

## [8.33.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.32.1...cli-v8.33.0) (2026-06-04)


### Features

* **mobile:** add Swift native iOS support to oma-mobile ([276e968](https://github.com/first-fluke/oh-my-agent/commit/276e9687d52c47c57a47f7327f4f76b77f67289f))
* **stack-set:** detect mobile stacks and route to resolved skill ([2d5271a](https://github.com/first-fluke/oh-my-agent/commit/2d5271a5179788ae75ee4ddfaedf90c4d9378a40))
* **verify:** run swift build/test for oma verify mobile ([564faa1](https://github.com/first-fluke/oh-my-agent/commit/564faa18c17907deede2f9b891896238037afe07))


### Refactoring

* **verify:** extract shared stack-verify schema ([2fc3f2c](https://github.com/first-fluke/oh-my-agent/commit/2fc3f2c8ffbac6b67767324cc2e665efdd05eb31))

## [8.32.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.32.0...cli-v8.32.1) (2026-06-04)


### Bug Fixes

* **codex:** add serena mcp startup timeout ([3b77a0d](https://github.com/first-fluke/oh-my-agent/commit/3b77a0df1c00daf15b5133f7a4238ddbd99029d7))

## [8.32.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.31.0...cli-v8.32.0) (2026-06-04)


### Features

* **hooks:** add pi (Earendil) extension bridge variant ([e1f98c2](https://github.com/first-fluke/oh-my-agent/commit/e1f98c21b921d9d1fe1b2a1bc16dd4ad1968ce4d))
* **hooks:** mirror Grok resume context to .grok/rules/oma-state.md ([5bcb607](https://github.com/first-fluke/oh-my-agent/commit/5bcb607aea9bb513c8eb2e14076f09b383ddb106))
* **mcp:** add chrome-devtools MCP to all vendors and migrate uvx serena ([4469116](https://github.com/first-fluke/oh-my-agent/commit/4469116c2053d6c5a986afa113a8d94da3ccbd94))


### Bug Fixes

* **hooks:** drop non-functional Grok file mirror ([0a45d85](https://github.com/first-fluke/oh-my-agent/commit/0a45d8581f724356de06484608c3446506d95dbc))
* **hooks:** make skill-injector agy-aware ([ddf4bdd](https://github.com/first-fluke/oh-my-agent/commit/ddf4bddfeb74fe69f0a5a65a4c1a8a0ab3290af3))
* **test:** update gemini migration 006 idempotency fixture for chrome-devtools ([04c09b7](https://github.com/first-fluke/oh-my-agent/commit/04c09b76eedd5d5fc75876b138dc745d1af48afb))

## [8.31.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.30.0...cli-v8.31.0) (2026-06-03)


### Features

* **hooks:** integrate Antigravity CLI (agy) hooks via .agents/hooks.json ([af99809](https://github.com/first-fluke/oh-my-agent/commit/af9980934085c77f6193d3b95b055aeaf0760fe1))

## [8.30.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.29.1...cli-v8.30.0) (2026-06-02)


### Features

* **memory:** guard daemon start races and add Windows Task Scheduler service ([a84f8de](https://github.com/first-fluke/oh-my-agent/commit/a84f8de143bdf04ff68102f68b88bea38ecb47b6))


### Bug Fixes

* **memory:** fall back to legacy launchctl load when bootstrap fails ([6aa2b5a](https://github.com/first-fluke/oh-my-agent/commit/6aa2b5ad228ca52a42a4f1d3873f25c1aaba7336))

## [8.29.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.29.0...cli-v8.29.1) (2026-06-02)


### Bug Fixes

* **memory:** align AgentMemory client with published 0.9.24 REST contract ([3c37ef8](https://github.com/first-fluke/oh-my-agent/commit/3c37ef8673fb96d5d9347ff0c20ac9ae8422476d))
* **memory:** keep AgentMemory data in ~/.agentmemory and stop the iii engine ([ce84e22](https://github.com/first-fluke/oh-my-agent/commit/ce84e22159edf7218162679bebb663b304eda1b8))

## [8.29.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.28.0...cli-v8.29.0) (2026-06-02)


### Features

* **hook:** add cross-runtime L1 compatibility probe command ([f0ee01e](https://github.com/first-fluke/oh-my-agent/commit/f0ee01e41bd1721be3a2abbeffbc326c0c65a106))
* **state:** mirror completed sessions to Serena and log boundary injects ([cf20382](https://github.com/first-fluke/oh-my-agent/commit/cf203828f7e4eb5b067298b228bcf2e8e37f5faf))


### Bug Fixes

* **recap:** read Cursor store.db read-only with busy timeout and report locks ([5383467](https://github.com/first-fluke/oh-my-agent/commit/538346748a235c84219f161b79dbf7a37b811afc))
* **state:** make _index.json CAS exhaustion recoverable and verify event-order independence ([d1b16b9](https://github.com/first-fluke/oh-my-agent/commit/d1b16b944538326b355a1fdac60af1060df5236a))


### Refactoring

* **memory:** extract AgentMemory service generator to platform module ([63bcc4a](https://github.com/first-fluke/oh-my-agent/commit/63bcc4a395aeb94d54780871f5610cc366fa92a0))

## [8.28.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.27.0...cli-v8.28.0) (2026-06-02)


### Features

* **state:** add workflow decision event commands ([d8afbaa](https://github.com/first-fluke/oh-my-agent/commit/d8afbaa9e4a9f9b2bd12a7909dd73bbcff1d1c06))

## [8.27.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.26.1...cli-v8.27.0) (2026-06-02)


### Features

* **state:** add repair command ([eb5273b](https://github.com/first-fluke/oh-my-agent/commit/eb5273bc4068872a9bfd8ec6cfa71883f2cb66d7))

## [8.26.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.26.0...cli-v8.26.1) (2026-06-01)


### Bug Fixes

* **serena:** stop dashboard opening on mcp startup ([952e905](https://github.com/first-fluke/oh-my-agent/commit/952e905b290b0f6c77359d05d8d67b2eefb1d1b9))

## [8.26.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.25.0...cli-v8.26.0) (2026-06-01)


### Features

* **doctor:** add state health diagnostics ([f25b4ff](https://github.com/first-fluke/oh-my-agent/commit/f25b4ff7e00ca46b2d7f91f9cef21c33620e7f72))

## [8.25.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.24.0...cli-v8.25.0) (2026-06-01)


### Features

* **doctor:** add self-healing gate check ([53d564a](https://github.com/first-fluke/oh-my-agent/commit/53d564a3b25dc90da188de0e9fa9f0662f66ecc1))

## [8.24.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.23.0...cli-v8.24.0) (2026-06-01)


### Features

* **state:** add archived session lookup ([0359ede](https://github.com/first-fluke/oh-my-agent/commit/0359edeb4b291d83c904b2a5f35311dc375a362a))

## [8.23.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.22.0...cli-v8.23.0) (2026-06-01)


### Features

* **intel:** complete PRD pipeline with reviews, PRD/gap split, and issues ([d1edba6](https://github.com/first-fluke/oh-my-agent/commit/d1edba6a215770f71574cf6d93d0976fd9643df9))
* **state:** expose self-healing gate check ([c9476cd](https://github.com/first-fluke/oh-my-agent/commit/c9476cd59820109fe4e716b534f8aa339b00f983))
* **web:** add copy markdown plugin to docs site ([4f26f22](https://github.com/first-fluke/oh-my-agent/commit/4f26f2230a5de85139ea197eb444ee25d1a9ed86))

## [8.22.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.21.0...cli-v8.22.0) (2026-06-01)


### Features

* **intel:** add product intelligence pipeline ([f91496d](https://github.com/first-fluke/oh-my-agent/commit/f91496db580da31e7b1d543f1fb9138773819668))

## [8.21.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.20.2...cli-v8.21.0) (2026-05-31)


### Features

* **state:** complete cross-runtime snapshot polish ([39e1d6c](https://github.com/first-fluke/oh-my-agent/commit/39e1d6cad8b2661c47e2ff3525fb7dc924cef469))


### Bug Fixes

* **oma-slide:** suppress intentional !important in print/reduced-motion layers ([7221aa3](https://github.com/first-fluke/oh-my-agent/commit/7221aa30272ecb9d65908f6caee7eb186c23025a))

## [8.20.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.20.1...cli-v8.20.2) (2026-05-31)


### Documentation

* **readme:** add dsnix (DeepSeek) to the supported-agents table ([b7d055d](https://github.com/first-fluke/oh-my-agent/commit/b7d055d42e861576c89fb05e4362ad93ac87a7be))
* **readme:** label the DeepSeek cell Reasonix instead of dsnix ([f62ebe2](https://github.com/first-fluke/oh-my-agent/commit/f62ebe283be1bb4539f0431b01c0865f25d47512))

## [8.20.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.20.0...cli-v8.20.1) (2026-05-31)


### Bug Fixes

* **market:** unblock reddit & bluesky harvest blocked by HTTP 403 ([d257b93](https://github.com/first-fluke/oh-my-agent/commit/d257b936c6773a44582bdd0b0e7777e569ff5258))
* **search:** add bluesky keyword search via api.bsky.app ([803b7a2](https://github.com/first-fluke/oh-my-agent/commit/803b7a2b1ff35e02b70300ca3fbe3795314c8fed))

## [8.20.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.19.1...cli-v8.20.0) (2026-05-31)


### Features

* **cli:** add Kiro CLI vendor and update README vendor grid ([3dcffd8](https://github.com/first-fluke/oh-my-agent/commit/3dcffd80d74753f7cf25615292c6f10402604201))


### Bug Fixes

* **docs:** align README vendor table and wire Kiro runtime dispatch ([8dfff4d](https://github.com/first-fluke/oh-my-agent/commit/8dfff4d6442cc6e1bfa88be1b053c7be7ef20a39))
* **docs:** repair README vendor grid layout for Grok and Kiro ([ecd956f](https://github.com/first-fluke/oh-my-agent/commit/ecd956faf08dd7b97b4c65614c402107a12a1c71))


### Refactoring

* **cli:** centralize agents paths and unify SHA-256 hashing ([85aff4f](https://github.com/first-fluke/oh-my-agent/commit/85aff4f50e7cc9c60a12bbf4715a49fdd5355878))

## [8.19.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.19.0...cli-v8.19.1) (2026-05-30)


### Documentation

* **i18n:** refine korean docs for natural phrasing ([fc4112f](https://github.com/first-fluke/oh-my-agent/commit/fc4112f0c06b3fea801ce0e613ce0bcc542d56d3))

## [8.19.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.18.0...cli-v8.19.0) (2026-05-30)


### Features

* **cli:** add memory:maintain and memory:upgrade commands ([4023836](https://github.com/first-fluke/oh-my-agent/commit/4023836cb86411189b33373ddb8bf0f35e030572))

## [8.18.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.17.1...cli-v8.18.0) (2026-05-29)


### Features

* **doctor:** report AgentMemory diagnostics ([0ee3054](https://github.com/first-fluke/oh-my-agent/commit/0ee3054dfe431dd07f9c40e45a2b12e8d357717d))


### Bug Fixes

* **doctor:** use visual-width-aware padding for table alignment ([d12bc8c](https://github.com/first-fluke/oh-my-agent/commit/d12bc8c8adf3a8cc05dc5f0e8dbe4ac601afa64a))

## [8.17.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.17.0...cli-v8.17.1) (2026-05-29)


### Bug Fixes

* **agent:** route subagent result artifacts to .serena/memories with parseable status ([326a228](https://github.com/first-fluke/oh-my-agent/commit/326a228d0ece3e5c1e552c37c73051863b306fcf))

## [8.17.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.16.0...cli-v8.17.0) (2026-05-29)


### Features

* **memory:** import vendor history into AgentMemory ([e75aaaf](https://github.com/first-fluke/oh-my-agent/commit/e75aaafdd2bc4932d00d75eea8b2aefb35140f47))


### Documentation

* add oma-slide skill entry to README agent tables ([80d7e38](https://github.com/first-fluke/oh-my-agent/commit/80d7e38fb02d27f3844bbe1ed370fcc804e4512b))

## [8.16.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.15.0...cli-v8.16.0) (2026-05-28)


### Features

* **memory:** manage AgentMemory service lifecycle ([c274ab5](https://github.com/first-fluke/oh-my-agent/commit/c274ab5b8bc037b647f11bfcda798154c59fa027))

## [8.15.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.14.0...cli-v8.15.0) (2026-05-28)


### Features

* **memory:** install AgentMemory service during setup ([c5a6462](https://github.com/first-fluke/oh-my-agent/commit/c5a646285451879c7fa24b47c3b5220ca624b002))

## [8.14.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.13.0...cli-v8.14.0) (2026-05-28)


### Features

* **memory:** add AgentMemory setup and daemon commands ([10b846a](https://github.com/first-fluke/oh-my-agent/commit/10b846ae3b1267b6756c7a3a080379b1a08cccc3))

## [8.13.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.12.0...cli-v8.13.0) (2026-05-27)


### Features

* **doctor,memory:** extend vendor doc checks and add memory CLI commands ([a2f22a7](https://github.com/first-fluke/oh-my-agent/commit/a2f22a7cd7e03ef2dd97f62184f88e6ac5157626))


### Bug Fixes

* **doctor:** align unresponsive CLI test with 5s probe timeout ([4464048](https://github.com/first-fluke/oh-my-agent/commit/44640485f1a0910686391a052a661b2cd53cc914))
* **doctor:** increase CLI probe timeout to 5s ([61dea9d](https://github.com/first-fluke/oh-my-agent/commit/61dea9dd2b4c7fc5bccbe31fde6964f6d8cc6587))
* **doctor:** raise vitest timeout for 5s CLI probe test ([80d380c](https://github.com/first-fluke/oh-my-agent/commit/80d380c4bb1949e0a2b96ce0fbcf92583bff3921))
* **doctor:** satisfy tsc in vendor doc test helper ([e559236](https://github.com/first-fluke/oh-my-agent/commit/e5592360b512f5492b6e958dff66ad054cbc1246))

## [8.12.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.11.0...cli-v8.12.0) (2026-05-27)


### Features

* add first-class Grok support ([cb57928](https://github.com/first-fluke/oh-my-agent/commit/cb5792813c34c799455fa37bb0e97088cd8ee889))


### Bug Fixes

* **grok:** add grok to RuntimeVendor and harden parser/renderer for tsc ([ec2cfd3](https://github.com/first-fluke/oh-my-agent/commit/ec2cfd308c3d5f26dc16569e21df6ebee640c581))


### Documentation

* add grok to model_preset lists in alphabetical order ([7ef90af](https://github.com/first-fluke/oh-my-agent/commit/7ef90afd553f107e939a4d515eda2850e9319e8d))

## [8.11.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.10.2...cli-v8.11.0) (2026-05-27)


### Features

* **oma-slide:** add Canva MCP integration and auto-provisioning ([fc2c599](https://github.com/first-fluke/oh-my-agent/commit/fc2c5993207ee513aa12a81ffcffaf3b0a473c13))
* **slide:** add print support and improve local CSS scoping ([613da42](https://github.com/first-fluke/oh-my-agent/commit/613da4270903723abbe1087877f5eb298c541688))


### Refactoring

* **hooks:** extract state snapshot rendering to vendor-renderer ([570b2d2](https://github.com/first-fluke/oh-my-agent/commit/570b2d2142d97c8d6ca5fcfa7d128186b98d94b8))


### Documentation

* **core:** update auto-generated agent tables ([bba294f](https://github.com/first-fluke/oh-my-agent/commit/bba294faa8ea88fb2dfa22d376d5166865f521c2))
* **oma-slide:** default decks to session result paths ([bdec8c4](https://github.com/first-fluke/oh-my-agent/commit/bdec8c4a58beb000aee8fec1bf79037e2fd9b8f4))

## [8.10.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.10.1...cli-v8.10.2) (2026-05-26)


### Bug Fixes

* **slide:** repair corrupt editor /screenshot dataUrl ([a66f920](https://github.com/first-fluke/oh-my-agent/commit/a66f920d21cd85e7adf79e2aaf4fb32432433503))

## [8.10.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.10.0...cli-v8.10.1) (2026-05-26)


### Bug Fixes

* **slide:** correct blank/collided/cropped merged viewer, bundle, and PDF ([fa99c3c](https://github.com/first-fluke/oh-my-agent/commit/fa99c3c77158f8f26931347747dc961748d4c4d1))

## [8.10.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.9.0...cli-v8.10.0) (2026-05-26)


### Features

* add Cursor plugin manifest for marketplace support ([878735b](https://github.com/first-fluke/oh-my-agent/commit/878735b7e3463b45273e6e81de5812571dd04d44))
* **slide:** add oma-slide deck toolkit (skill + CLI) ([a41c852](https://github.com/first-fluke/oh-my-agent/commit/a41c8524f01f05438dcd456473805096fe8c9ab0))
* **state:** add AgentMemory observe provider ([#433](https://github.com/first-fluke/oh-my-agent/issues/433)) ([1bb811a](https://github.com/first-fluke/oh-my-agent/commit/1bb811a49222f6e07f4c4a0cbecd6712b709398b))


### Bug Fixes

* **install:** honor --yes on `oma install` subcommand ([010e1dc](https://github.com/first-fluke/oh-my-agent/commit/010e1dc18a67f22eeec9ca4c96a2334cb7d07e2c))
* **install:** release install lock on early exit and signals ([e2e2814](https://github.com/first-fluke/oh-my-agent/commit/e2e2814b76e554c46deea3ffcc0688764d723597))
* restore missing fields in claude-plugin manifest ([38dfbc5](https://github.com/first-fluke/oh-my-agent/commit/38dfbc57347916d1d0722711ecf132c6085f8259))
* **slide:** drop trailing blank page in PDF export ([34697d7](https://github.com/first-fluke/oh-my-agent/commit/34697d7f5154ec8afb08b778149d45ef1cfd2f3b))
* **slide:** render blank deck when deck-stage.js loads in &lt;head&gt; ([53f590e](https://github.com/first-fluke/oh-my-agent/commit/53f590ef366a1b4f8040ba406a1bd5fd4f5c1a70))

## [8.9.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.8.0...cli-v8.9.0) (2026-05-26)


### Features

* **state:** enforce L1 decision snapshots ([203ddfb](https://github.com/first-fluke/oh-my-agent/commit/203ddfb13ee54c8e06c672b681c5015be1210fe2))

## [8.8.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.7.0...cli-v8.8.0) (2026-05-25)


### Features

* add L1 state hooks ([5367519](https://github.com/first-fluke/oh-my-agent/commit/5367519687ae079ae4d328ad40eca2d929e49764))
* **recap:** add antigravity parser and extract shared parser utils ([d314a20](https://github.com/first-fluke/oh-my-agent/commit/d314a20dc0d5e5145649c78dd12413865965e690))

## [8.7.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.6.0...cli-v8.7.0) (2026-05-24)


### Features

* **translator:** add humanizer-aware voice sample calibration ([6ff9f37](https://github.com/first-fluke/oh-my-agent/commit/6ff9f374b346b45873f4db7971fda9bfd7f6ac46))

## [8.6.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.5.3...cli-v8.6.0) (2026-05-24)


### Features

* **antigravity:** agy mcp_config.json compatibility ([0099f2c](https://github.com/first-fluke/oh-my-agent/commit/0099f2cf82aebe1a2a9f6d8f8b13b08b6d61eae3))
* **doctor:** dual-install presence + legacy backfill hint ([b628353](https://github.com/first-fluke/oh-my-agent/commit/b628353af565792e4bb87c7b7fbd658b83e872d8))
* **install:** --global mode + context singleton + lock + guards + i18n + hook dedup ([36220f6](https://github.com/first-fluke/oh-my-agent/commit/36220f68ca011a43e5ddbdc3d83b391ea801716e))
* **meta:** merge install state into _version.json (schemaVersion=2) ([72f3d20](https://github.com/first-fluke/oh-my-agent/commit/72f3d20ecb6a275ea8f5ff424092e015cd0f97e2))
* **platform:** harden createLink with SSOT validation and Win32 long-path ([cda3424](https://github.com/first-fluke/oh-my-agent/commit/cda342471ac1b8f20c585a5629586f97e1093542))
* **skills:** unify workflow skills under .agents/skills/ SSOT (Migration 011) ([757d697](https://github.com/first-fluke/oh-my-agent/commit/757d697f6340519b1921d7c49b8b5b1b69c7289a))
* **uninstall:** add oma uninstall [--global] with dry-run preview ([ffb2bd5](https://github.com/first-fluke/oh-my-agent/commit/ffb2bd538ed52dc52cb17ca5f34fbee938e885a0))
* **utils:** add safeWriteJson + safeReadJson with vendor-file guard ([a6dd155](https://github.com/first-fluke/oh-my-agent/commit/a6dd1555cbcedf87c6c617e0a855fb123ce847a6))


### Refactoring

* **skills:** rename createCliSymlinks → createVendorSymlinks, add Qwen ([5fb7b6e](https://github.com/first-fluke/oh-my-agent/commit/5fb7b6e3820502a1340ed299c6eed6b40cef7efb))
* **vendors:** unify apply&lt;Vendor&gt;&lt;Subject&gt; naming convention ([51deebb](https://github.com/first-fluke/oh-my-agent/commit/51deebb348479fa619d5a418490041f4af17b009))


### Documentation

* global-install + oma-config-semantics guides with 10-locale i18n ([b618fc5](https://github.com/first-fluke/oh-my-agent/commit/b618fc52a9d467699f9a7cf052343e4c9a804eb0))

## [8.5.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.5.2...cli-v8.5.3) (2026-05-24)


### Documentation

* reword agent table descriptions into plain sentences ([34d4e94](https://github.com/first-fluke/oh-my-agent/commit/34d4e940ec71c175738c72c51fabd1132096cd6d))

## [8.5.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.5.1...cli-v8.5.2) (2026-05-22)


### Refactoring

* **cli:** drop deprecated gemini from user-facing help text ([e2ea553](https://github.com/first-fluke/oh-my-agent/commit/e2ea553c6b6c2b8a3ee78ac68282b570e3014e04))


### Documentation

* remove deprecated gemini from vendor and preset listings ([71915ff](https://github.com/first-fluke/oh-my-agent/commit/71915ff65a064730a7cdc753625f6c028ed662e6))

## [8.5.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.5.0...cli-v8.5.1) (2026-05-21)


### Bug Fixes

* **verify:** replace globSync with deterministic matcher for hidden dirs ([b3b6401](https://github.com/first-fluke/oh-my-agent/commit/b3b64014fae90e433d2bbf21c2b92f3acabf98f8))

## [8.5.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.4.0...cli-v8.5.0) (2026-05-21)


### Features

* **cli:** add TF-IDF cross-skill boundary audit ([086bfbe](https://github.com/first-fluke/oh-my-agent/commit/086bfbe1ff35ba97e7288956d5f923c512d4fc52))
* **skills:** domain-gated exposure + structured outputs schema ([52f0d31](https://github.com/first-fluke/oh-my-agent/commit/52f0d31f3b8b23c831d7f1128ce429fbd5ed29fe))
* **verify:** add closure check via structured Expected outputs ([7ab4b51](https://github.com/first-fluke/oh-my-agent/commit/7ab4b51f6052b53a527c58359d5a5be5033b2e36))


### Bug Fixes

* **image:** drop unused config arg from AntigravityProvider call ([eb350d4](https://github.com/first-fluke/oh-my-agent/commit/eb350d44f5067bb12b04bd8e4927d5dde8156226))


### Documentation

* **readme:** cite scaling-laws-of-skills preprint ([1611b52](https://github.com/first-fluke/oh-my-agent/commit/1611b520933bc0e03afb51b85431388bbb3e104e))

## [8.4.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.3.0...cli-v8.4.0) (2026-05-20)


### Features

* **installer:** auto-install serena via uv tool on windows ([cff9c21](https://github.com/first-fluke/oh-my-agent/commit/cff9c215c48eadc23aad0cf178e010f4d78851e9))


### Documentation

* sync quick start + installation docs for serena bootstrap ([80be2a2](https://github.com/first-fluke/oh-my-agent/commit/80be2a2e7228bfb9008c5237091f88d6c91065b4))
* trim apm mechanism note and swap gemini for cursor in vendor list ([dd1d77f](https://github.com/first-fluke/oh-my-agent/commit/dd1d77f4e61d767b8f58163df5b36383f2cd87dc))

## [8.3.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.2.1...cli-v8.3.0) (2026-05-20)


### Features

* **image:** replace gemini vendor with keyless antigravity (agy) ([1d23e5a](https://github.com/first-fluke/oh-my-agent/commit/1d23e5a0ab6e8f91057ca1eca1a431bbc9b736eb))

## [8.2.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.2.0...cli-v8.2.1) (2026-05-20)


### Bug Fixes

* **ci:** also pass NPM_CONFIG_TOKEN to bun publish ([0e51b8e](https://github.com/first-fluke/oh-my-agent/commit/0e51b8e2e5cc09193b064122e2d2e1e4e9c04980))
* **ci:** use NODE_AUTH_TOKEN for bun publish auth ([44e7824](https://github.com/first-fluke/oh-my-agent/commit/44e7824b08f313065da01e0ba0ba5359cc951e3c))


### Refactoring

* **link:** promote link() to vendor reconciliation kernel ([9e8a0b1](https://github.com/first-fluke/oh-my-agent/commit/9e8a0b10a9fb58b75192933ac68f8177c0a4c304))
* **update,install:** delegate vendor write to link kernel ([30d72af](https://github.com/first-fluke/oh-my-agent/commit/30d72afcef64e7c54a57269f06906a9ac0ab7760))


### Documentation

* regenerate vendor guides via oma link ([8e670d4](https://github.com/first-fluke/oh-my-agent/commit/8e670d4497171e51494e76898c721cd6281d7d13))

## [8.2.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.1.0...cli-v8.2.0) (2026-05-20)


### Features

* **cli:** warn when oma-config targets the deprecated Gemini CLI ([11c5e28](https://github.com/first-fluke/oh-my-agent/commit/11c5e2882c741081026ea02b512bbbf848023e72))


### Bug Fixes

* **scm:** quote skill description frontmatter ([2a225df](https://github.com/first-fluke/oh-my-agent/commit/2a225df7dd5d39d3df39ff6029bda0c8a1919522))

## [8.1.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v8.0.0...cli-v8.1.0) (2026-05-20)


### Features

* **hud:** wire HUD for Gemini CLI and Antigravity (agy) ([598e20b](https://github.com/first-fluke/oh-my-agent/commit/598e20bbb06134c24c64a80a3695b14b14d69ebd))

## [8.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.23.2...cli-v8.0.0) (2026-05-20)


### ⚠ BREAKING CHANGES

* **cli:** `antigravity` preset is no longer an alias for `mixed`. Existing configs with `model_preset: antigravity` will now resolve to the agy-targeted preset on next run; users without `agy` installed should switch their preset or install the binary.

### Features

* **cli:** add antigravity (agy) as first-class vendor ([715e7b1](https://github.com/first-fluke/oh-my-agent/commit/715e7b1c24d5b67376edb4af0b0084544efcaff4))

## [7.23.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.23.1...cli-v7.23.2) (2026-05-19)


### Documentation

* **readme:** translate agent compatibility table across locales ([f5716ae](https://github.com/first-fluke/oh-my-agent/commit/f5716aed2ae69cf55bd745447a33bf2ec9613126))

## [7.23.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.23.0...cli-v7.23.1) (2026-05-19)


### Bug Fixes

* **cli:** retry rmSync in update-cursor test to dodge Windows EBUSY ([8a2a7d7](https://github.com/first-fluke/oh-my-agent/commit/8a2a7d7736bdceb417c4a89489167f5619543801))


### Documentation

* **skills:** cross-link observability handoffs across 8 skills ([6d5e99f](https://github.com/first-fluke/oh-my-agent/commit/6d5e99f265e2e3073bf78b54f1f4d161fad69b20))

## [7.23.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.22.0...cli-v7.23.0) (2026-05-19)


### Features

* **cli:** expand install presets with web/mobile/research/content ([06a8c64](https://github.com/first-fluke/oh-my-agent/commit/06a8c6406f6d5e618bdb071e8f98ca0614fd9af2))

## [7.22.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.21.0...cli-v7.22.0) (2026-05-19)


### Features

* **observability:** add WAF rule observability page ([07607ed](https://github.com/first-fluke/oh-my-agent/commit/07607ed4a56594d4bc553d90b3e03621e120cb52))


### Bug Fixes

* **repo:** force LF line endings to unblock Windows CI lint ([78e83a4](https://github.com/first-fluke/oh-my-agent/commit/78e83a48d6c267a94cec0c673713ceb9ea33f173))


### Refactoring

* **cli:** tighten lint hygiene, replace shell pipeline, modernize tests ([07fa9ba](https://github.com/first-fluke/oh-my-agent/commit/07fa9bad519a4d9777fa79ad1d1db4cc6927d0f5))
* **skills:** make intent-rules and examples english-only ([0f14076](https://github.com/first-fluke/oh-my-agent/commit/0f14076bccaa5802e59d633897bb6bcbfc9be4b1))

## [7.21.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.20.1...cli-v7.21.0) (2026-05-19)


### Features

* **cli:** align Cursor Agent auth, models, and dispatch ([bb37391](https://github.com/first-fluke/oh-my-agent/commit/bb3739150f8ed1d9f9d42e65090d04a56220a45c))
* **cli:** ingest Cursor transcripts and harden recap dashboard ([bb9b5b4](https://github.com/first-fluke/oh-my-agent/commit/bb9b5b4b39a758a18cd40e96cbaf8a2caa4de0f5))


### Bug Fixes

* **test:** satisfy SpawnSyncReturns typing in cursor recap tests ([44d8dcf](https://github.com/first-fluke/oh-my-agent/commit/44d8dcf0f8ced09c91b09c0b35ead2fbc40cb58c))

## [7.20.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.20.0...cli-v7.20.1) (2026-05-18)


### Bug Fixes

* **stats:** pad before color so ANSI codes don't break table width ([e24d833](https://github.com/first-fluke/oh-my-agent/commit/e24d833c84ad7b2b11fe00ee5cbcbd6254d795b2))

## [7.20.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.19.0...cli-v7.20.0) (2026-05-17)


### Features

* **migrations:** add 010-rename-preset-keys auto-migration ([2c6724c](https://github.com/first-fluke/oh-my-agent/commit/2c6724c8c0b41845d63762bf15b864a83a796262))


### Bug Fixes

* **migrations:** null-guard regex match result in 010 ([1b3cda3](https://github.com/first-fluke/oh-my-agent/commit/1b3cda3a2f2ea7404f76b16d8d8d48dae482608e))


### Refactoring

* **cli:** rename model preset keys (claude-only→claude, antigravity→mixed) ([681042d](https://github.com/first-fluke/oh-my-agent/commit/681042d60a0912a5f7f80ebcbfcb46459e438e0a))


### Documentation

* update preset name references to new vendor scheme ([2f49afb](https://github.com/first-fluke/oh-my-agent/commit/2f49afbab98e733fccef180cd43e1b25d46c4487))

## [7.19.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.18.0...cli-v7.19.0) (2026-05-17)


### Features

* **serena:** apply Claude .mcp.json and Gemini bridge override in oma update ([ad8d7d6](https://github.com/first-fluke/oh-my-agent/commit/ad8d7d6a62fb109de4aa044ffabbc1e88b467b26))


### Bug Fixes

* **test:** stub install_* functions in install-sh main pipe test ([e7af667](https://github.com/first-fluke/oh-my-agent/commit/e7af6677bcdb54b9cbcb79fab32de737ba1c1eba))

## [7.18.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.17.0...cli-v7.18.0) (2026-05-17)


### Features

* **readme:** add 'Works With Every Agent' vendor logos table ([e8b4211](https://github.com/first-fluke/oh-my-agent/commit/e8b42113493f4e03f65979667dde93a48d0af518))
* **serena:** opt-in serena-agent auto-upgrade during oma update ([c0e42d6](https://github.com/first-fluke/oh-my-agent/commit/c0e42d6b2bb5c641056aae6d9839e29e4cbd154a))


### Refactoring

* **cli:** move stats metrics to .agents/state ([1983d4d](https://github.com/first-fluke/oh-my-agent/commit/1983d4d6dcf7e5e545948efc381b3769bd65df16))


### Documentation

* **claude:** reorder rules table by usage frequency ([da8e196](https://github.com/first-fluke/oh-my-agent/commit/da8e196eabc2e6c777d08aff4d3144ba7350f3f5))

## [7.17.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.16.0...cli-v7.17.0) (2026-05-17)


### Features

* **serena:** migrate to uv tool install with per-vendor MCP contexts ([d79e51d](https://github.com/first-fluke/oh-my-agent/commit/d79e51dbd44362f18bd7e2978a163e026cfa94b6))


### Bug Fixes

* **mcp:** switch serena context from antigravity to ide ([163a6f2](https://github.com/first-fluke/oh-my-agent/commit/163a6f2143883124d02046a83765e2d1552bd08e))
* **test:** normalize Windows backslashes in session-cost fs mocks ([17ea918](https://github.com/first-fluke/oh-my-agent/commit/17ea9182978acf2606b2347b08eb3de6218d5718))
* **test:** use POSIX paths for direct mock store access ([0f0994a](https://github.com/first-fluke/oh-my-agent/commit/0f0994a999a51de3a7dd54bc6333bbc21df27918))

## [7.16.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.15.0...cli-v7.16.0) (2026-05-17)


### Features

* **rules:** add serena MCP code-search guidance to vendor docs ([8ae45f9](https://github.com/first-fluke/oh-my-agent/commit/8ae45f995864620269a6d3b41a3ea7a117b1500f))
* **web:** enable PWA via @docusaurus/plugin-pwa ([da1362e](https://github.com/first-fluke/oh-my-agent/commit/da1362e39423de6998ec85272c5975fcea859762))

## [7.15.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.14.2...cli-v7.15.0) (2026-05-17)


### Features

* **agent:spawn:** expose --isolation=worktree for per-spawn git worktree ([8e5ebf5](https://github.com/first-fluke/oh-my-agent/commit/8e5ebf5a53aa53c7cdba59351850de41c8db6b38))
* **image:** allow arbitrary WxH sizes within gpt-image-2 limits ([2acef68](https://github.com/first-fluke/oh-my-agent/commit/2acef685c7715e8f83e638d4f2a1c9e9b79ee3eb))
* **stats:** surface session-cost telemetry with vendor breakdown and USD estimate ([c31778d](https://github.com/first-fluke/oh-my-agent/commit/c31778d3224efaf5c5933acb6b1e161aa80ad2e8))
* **vault:** os-keychain credential store via @napi-rs/keyring ([ec33b53](https://github.com/first-fluke/oh-my-agent/commit/ec33b53d5f88059ba7bc8e4ae60962b9f642dd4f))


### Bug Fixes

* **stats:** cache byVendor entry to satisfy noUncheckedIndexedAccess ([5abbf22](https://github.com/first-fluke/oh-my-agent/commit/5abbf2282f3862948c6a1759ba2bda1d258f90a7))


### Documentation

* **readme:** surface verify, quota_cap, ralph JUDGE, Exploration Loop, monorepo routing ([2558fb1](https://github.com/first-fluke/oh-my-agent/commit/2558fb103cc185bd35d01d567226e3a081ddfc3c))

## [7.14.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.14.1...cli-v7.14.2) (2026-05-16)


### Performance

* **web:** enable Docusaurus Faster (Rspack/SWC) and drop webpack override ([139378f](https://github.com/first-fluke/oh-my-agent/commit/139378f497531c677a8e62136c445a59bb4e5881))


### Documentation

* add CITATION.cff with release-please auto-versioning ([f081b04](https://github.com/first-fluke/oh-my-agent/commit/f081b048efa685ea0acb46032ecf8283cea59909))

## [7.14.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.14.0...cli-v7.14.1) (2026-05-16)


### Documentation

* **readme:** add oma-academic-writer, oma-market, oma-voice rows ([e2598c9](https://github.com/first-fluke/oh-my-agent/commit/e2598c9c2255fa56f6156e9e527df9034371cd7f))

## [7.14.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.13.0...cli-v7.14.0) (2026-05-15)


### Features

* **voice:** add oma-voice skill for local TTS/STT via Voicebox MCP ([3a0a7fb](https://github.com/first-fluke/oh-my-agent/commit/3a0a7fb48c2ecbed80a425d837fa0a93f0e13dc8))

## [7.13.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.12.1...cli-v7.13.0) (2026-05-15)


### Features

* **market:** add discover-competitors (LLM-first peer-entity candidates) ([e19ee27](https://github.com/first-fluke/oh-my-agent/commit/e19ee27001dd8bafc8b988141a4763868a8fa23f))
* **market:** add oma-market skill with deterministic CLI pipeline ([3d42406](https://github.com/first-fluke/oh-my-agent/commit/3d4240661aa3b202e660099c44a4d35245455122))
* **search:** add clien, okky, duckduckgo (ddgs) handlers ([09bfbb4](https://github.com/first-fluke/oh-my-agent/commit/09bfbb434a3be82963c2a73d783b2c5ee389a23c))


### Documentation

* **api-contracts:** align _shared/api-contracts path to _shared/core/api-contracts ([1edd5bf](https://github.com/first-fluke/oh-my-agent/commit/1edd5bf96e8ef30e8e6b7b36e6ba8ec407ff40a4))
* **oma-docs:** sync skill and ARCHITECTURE to no-LLM-call pattern ([e38dc57](https://github.com/first-fluke/oh-my-agent/commit/e38dc57f7269c558c0d12e6a390047c799879e6e))
* **oma-pm:** unify plan secondary output to result-pm.md ([f797932](https://github.com/first-fluke/oh-my-agent/commit/f797932fcb9ff85bccbd5dfef0489310b1a2fe27))

## [7.12.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.12.0...cli-v7.12.1) (2026-05-13)


### Bug Fixes

* **hooks:** suppress ralph false-positive on meta-discussion prompts ([88307cf](https://github.com/first-fluke/oh-my-agent/commit/88307cff4a297e0ae4d850a35489a34fd6b35ff6))

## [7.12.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.11.0...cli-v7.12.0) (2026-05-12)


### Features

* add telemetry opt-in to oma-config for all vendors ([22265cd](https://github.com/first-fluke/oh-my-agent/commit/22265cd913310693418cfb1d04cdeaf04f00ecd5))

## [7.11.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.10.0...cli-v7.11.0) (2026-05-12)


### Features

* **workflows:** bias brainstorm and work loops toward structural fixes ([50ce165](https://github.com/first-fluke/oh-my-agent/commit/50ce16541b2aa2fba9d6bbe9319a4497d56ca609))

## [7.10.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.9.0...cli-v7.10.0) (2026-05-12)


### Features

* **workflows:** add recap workflow for oma-recap ([1d328ef](https://github.com/first-fluke/oh-my-agent/commit/1d328ef4c539d9cb695a34c84ec37a6f445584ec))

## [7.9.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.8.0...cli-v7.9.0) (2026-05-11)


### Features

* **cli:** preserve user-upgraded effortLevel in claude settings ([4e0f50f](https://github.com/first-fluke/oh-my-agent/commit/4e0f50f52f47e138587f86dc9063fc88daba8c2a))

## [7.8.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.7.2...cli-v7.8.0) (2026-05-11)


### Features

* **scripts:** add sns:devto weekly draft generator ([e47f72c](https://github.com/first-fluke/oh-my-agent/commit/e47f72c520b35db2a8670d35414d4e06b31e8590))

## [7.7.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.7.1...cli-v7.7.2) (2026-05-11)


### Documentation

* **readme:** drop redundant '(Vercel deepsec)' parenthetical ([3901bb5](https://github.com/first-fluke/oh-my-agent/commit/3901bb577e9292020d97f16a925a1b688cf1f465))
* **readme:** hide oma-coordination from agent team table ([817377e](https://github.com/first-fluke/oh-my-agent/commit/817377eb03eab6a320d448011d93772a8cd49928))

## [7.7.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.7.0...cli-v7.7.1) (2026-05-11)


### Bug Fixes

* **benchmarks:** drop gradient hero text in oma landing ([c9f6e13](https://github.com/first-fluke/oh-my-agent/commit/c9f6e136558e8dda3d4d816deb2ad1c0f222ede2))

## [7.7.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.6.0...cli-v7.7.0) (2026-05-11)


### Features

* **oma-db:** add verification discrepancy audit guidance ([16a8130](https://github.com/first-fluke/oh-my-agent/commit/16a8130a47406e9817d447d8c8822c989cdeaaf1))


### Bug Fixes

* **hooks/keyword-detector:** align CLI-invocation guard with vendor source of truth ([3c469dd](https://github.com/first-fluke/oh-my-agent/commit/3c469dd3687d7aedc16ca86368c24f50a74791e2))
* **hooks/keyword-detector:** require explicit CLI signal for oma-family brands ([9be137a](https://github.com/first-fluke/oh-my-agent/commit/9be137a2761748d158f5e26fd0fcf0c45d98cf03))


### Refactoring

* **cli:** consolidate vendor list to a single source of truth ([ef03ac4](https://github.com/first-fluke/oh-my-agent/commit/ef03ac4f558aad0e7e8b9266fb4624bb22ec7ffe))

## [7.6.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.5.0...cli-v7.6.0) (2026-05-11)


### Features

* **cli:** auto-register skills from .agents/skills/ frontmatter ([050f16f](https://github.com/first-fluke/oh-my-agent/commit/050f16fd40cda809fa83d19aed6a06edb8b3e45f))


### Bug Fixes

* **doctor:** bound CLI version probe with spawn timeout race ([edcf523](https://github.com/first-fluke/oh-my-agent/commit/edcf523f384136d0838a881144428ed41042c5c4))
* **hooks/keyword-detector:** close fullwidth/hyphen bypasses and add CLI invocation guard ([3dfc2dc](https://github.com/first-fluke/oh-my-agent/commit/3dfc2dc1d3998e29b1dc9223de237a3baf01b78c))

## [7.5.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.4.0...cli-v7.5.0) (2026-05-10)


### Features

* **cli:** show added/removed skills and workflows on update ([c03baf9](https://github.com/first-fluke/oh-my-agent/commit/c03baf9f168037f302b32d70b0924ee59fdad828))


### Refactoring

* **cli:** merge cli-kit/ into utils/ ([71bf0b9](https://github.com/first-fluke/oh-my-agent/commit/71bf0b94e603e27837195f312d2566843ec0553a))

## [7.4.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.3.3...cli-v7.4.0) (2026-05-10)


### Features

* **skills:** add oma-deepsec skill and /deepsec workflow ([56eb571](https://github.com/first-fluke/oh-my-agent/commit/56eb571e92df7b48b27f7fa89678cad169fa4d22))

## [7.3.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.3.2...cli-v7.3.3) (2026-05-09)


### Documentation

* list cursor-only preset across guides and i18n locales ([afe62b4](https://github.com/first-fluke/oh-my-agent/commit/afe62b481a2b75f0bfe2e4a14aaa6660ab1dbedc))
* **readme:** list cursor-only preset in per-agent-models section ([230daef](https://github.com/first-fluke/oh-my-agent/commit/230daef0a68294270cd9a7eb210a2d679787511b))

## [7.3.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.3.1...cli-v7.3.2) (2026-05-09)


### Bug Fixes

* **codex:** rename codex_hooks → hooks and migrate deprecated key ([f3e6474](https://github.com/first-fluke/oh-my-agent/commit/f3e64740724b2a50a4781d09bfec034ee90dbcaf))

## [7.3.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.3.0...cli-v7.3.1) (2026-05-09)


### Documentation

* **academic-writer:** reframe HD-grade as publication-grade ([27150c0](https://github.com/first-fluke/oh-my-agent/commit/27150c0ba5a2701c4a4dd11378f640efd8b2fb1a))
* **readme:** drop em dashes from agent team table ([c35a051](https://github.com/first-fluke/oh-my-agent/commit/c35a051ce40b0d845ccc2c5cbc519e073c05b807))

## [7.3.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.2.0...cli-v7.3.0) (2026-05-09)


### Features

* **docs:** add 'oma docs lint' for i18n style anti-patterns ([048804d](https://github.com/first-fluke/oh-my-agent/commit/048804d2210152c46dcf841ef64248f847686e81))
* **docs:** swap tinyld for eld and add wrong-language rule ([89855df](https://github.com/first-fluke/oh-my-agent/commit/89855dfbcd9ce38fc1008bef4ada45a84bccc632))
* **skills:** add oma-academic-writer for academic prose ([8369a4c](https://github.com/first-fluke/oh-my-agent/commit/8369a4cc6db6406c4537b8ec6c64b10c216041c8))


### Bug Fixes

* **docs:** normalize i18n-drift paths to POSIX on Windows ([5184bda](https://github.com/first-fluke/oh-my-agent/commit/5184bda30111c99566d849f5d79e2604a1f6be05))

## [7.2.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.1.1...cli-v7.2.0) (2026-05-09)


### Features

* **docs:** add 'oma docs i18n' for translation drift detection ([19c2efb](https://github.com/first-fluke/oh-my-agent/commit/19c2efb719cc38e600241f968490ab2d7c3738cd))
* **translator:** add Diff-Sync Mode to oma-translator skill ([6647b9a](https://github.com/first-fluke/oh-my-agent/commit/6647b9abcc53ca0492d6fca9cdecaa0f3c52d0bc))


### Bug Fixes

* **docs:** clean up unused import and any-typed test fixtures ([05cc267](https://github.com/first-fluke/oh-my-agent/commit/05cc2674fc85dae259fdb896017edbadab80e82b))

## [7.1.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.1.0...cli-v7.1.1) (2026-05-09)


### Bug Fixes

* **ci:** prevent sync-manifest race conditions with concurrency and retry ([dc03410](https://github.com/first-fluke/oh-my-agent/commit/dc03410e90775ebc23cf73d2dc23158ed3793a36))

## [7.1.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v7.0.0...cli-v7.1.0) (2026-05-09)


### Features

* **hooks:** add intent regex patterns and sanitize hardening ([f5800e1](https://github.com/first-fluke/oh-my-agent/commit/f5800e1e34493ead0b3dfb6aa594e2400623c57b))

## [7.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.20.0...cli-v7.0.0) (2026-05-09)


### ⚠ BREAKING CHANGES

* **cli:** remove oma export command

### Features

* **agents:** add docs-curator agent for orchestrated docs sync ([e5ffa5b](https://github.com/first-fluke/oh-my-agent/commit/e5ffa5b2d3a2a878a3ddb26c93b5e071e9c66849))
* **workflows:** add /docs workflow wrapping oma-docs ([5512629](https://github.com/first-fluke/oh-my-agent/commit/5512629ab66edc09dffab80d83fff16ed514e561))


### Bug Fixes

* **hooks:** normalize skill paths to POSIX form for Windows CI ([96a0044](https://github.com/first-fluke/oh-my-agent/commit/96a004436e6488b7e85b6af70ca591bf87d187e1))
* **link:** generate copilot workflow prompts on oma link ([10e3c88](https://github.com/first-fluke/oh-my-agent/commit/10e3c88041d856a9729b4c5f33eda6458184da92))


### Refactoring

* **cli:** remove oma export command ([f2cb7a7](https://github.com/first-fluke/oh-my-agent/commit/f2cb7a75d8b06009743b0422685a1e57de8c3b05))
* **hooks:** split types.ts into types-only + fs-utils + hook-output ([e3f48f1](https://github.com/first-fluke/oh-my-agent/commit/e3f48f1886896907a7d2bd5539d31d07fa9f0a5d))


### Documentation

* **claude:** regenerate CLAUDE.md rules table ([a7771db](https://github.com/first-fluke/oh-my-agent/commit/a7771dbe53c6a79316a8e2f7d7a9c465111f38ce))
* **readme:** sort CLI examples alphabetically and localize ([6a499b3](https://github.com/first-fluke/oh-my-agent/commit/6a499b324132b1e1bd0714fc32be7856d33ee28e))

## [6.20.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.19.0...cli-v6.20.0) (2026-05-09)


### Features

* **cli:** add model:check, model:probe, model:propose commands ([abd74fb](https://github.com/first-fluke/oh-my-agent/commit/abd74fbb2dc7974a2818094c522f65ad7e115837))
* **hooks:** resolve unknown slash commands via hidden skill lookup ([ef15f15](https://github.com/first-fluke/oh-my-agent/commit/ef15f15ab340d4b0909135b3a81048e3b8e447f3))


### Bug Fixes

* **cli:** use platform separator in isInIgnoredSet for Windows ([e4945b1](https://github.com/first-fluke/oh-my-agent/commit/e4945b1d22fbc14adcfea3590b6dc3ffef021585))
* **hooks:** inject SKILL.md for explicit Claude slash skills ([daaa41d](https://github.com/first-fluke/oh-my-agent/commit/daaa41d2b3027fd1cda498cc8a81aa3c90d81ea6))

## [6.19.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.18.0...cli-v6.19.0) (2026-05-08)


### Features

* **cursor:** promote cursor to first-class vendor ([12a3c3d](https://github.com/first-fluke/oh-my-agent/commit/12a3c3d823829cbfa901accbb8480864e34e0b58))

## [6.18.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.17.2...cli-v6.18.0) (2026-05-08)


### Features

* **install:** ensure docs/generated/ is gitignored after install ([37b9b67](https://github.com/first-fluke/oh-my-agent/commit/37b9b678d0f835176d12793705708851ec6e4091))
* **io:** add gitignore module and auto-ignore docs/generated ([f033332](https://github.com/first-fluke/oh-my-agent/commit/f033332b7c49fedb49189713fea5d1f462ed161f))

## [6.17.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.17.1...cli-v6.17.2) (2026-05-08)


### Bug Fixes

* **typecheck:** resolve @types/node v24/v25 conflict and strict test errors ([3ec0255](https://github.com/first-fluke/oh-my-agent/commit/3ec02552a1a588583b1c140e46733dfae16e7d4c))


### Refactoring

* **io:** split runtime-dispatch and add cursor vendor support ([5f83f79](https://github.com/first-fluke/oh-my-agent/commit/5f83f79658fbfb37d5ad61fb84d105a140ac07cc))

## [6.17.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.17.0...cli-v6.17.1) (2026-05-08)


### Bug Fixes

* **cli:** normalize Windows paths in docs resolver and self-update ([6345f36](https://github.com/first-fluke/oh-my-agent/commit/6345f36b6bc13fc1ba835c8fd159d0e7b9576a53))

## [6.17.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.16.2...cli-v6.17.0) (2026-05-08)


### Features

* **claude:** add skillListingBudgetFraction to recommended settings ([8fdf933](https://github.com/first-fluke/oh-my-agent/commit/8fdf9336714330d41ce571e91b22df35a8f4bf97))


### Bug Fixes

* **docs:** scope script refs to inline code and walk all ancestors ([01bd8ec](https://github.com/first-fluke/oh-my-agent/commit/01bd8ecbaa4d62630513c42b2a5a3e1dbd82d249))

## [6.16.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.16.1...cli-v6.16.2) (2026-05-08)


### Bug Fixes

* **docs:** reduce extractor false positives and add resolve fallback prefixes ([e863875](https://github.com/first-fluke/oh-my-agent/commit/e86387594a82674dfbd4ff4671ab80a6dcdb8623))

## [6.16.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.16.0...cli-v6.16.1) (2026-05-07)


### Documentation

* **readme:** rewrite oma-docs row with sibling-matched form across locales ([254aa80](https://github.com/first-fluke/oh-my-agent/commit/254aa80f38ff7b1799b3df8c1cbe7c8e9e697217))
* **skills/oma-translator:** add sibling-pattern check and mechanical-swap guard ([148e50a](https://github.com/first-fluke/oh-my-agent/commit/148e50a609dbadd4e91564cd0d607bd275ae3a07))

## [6.16.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.15.0...cli-v6.16.0) (2026-05-07)


### Features

* **docs:** introduce oma-docs verify and sync skill ([#326](https://github.com/first-fluke/oh-my-agent/issues/326)) ([dc18e83](https://github.com/first-fluke/oh-my-agent/commit/dc18e83f30a010812577bb83ff56b6990fb786b7))


### Bug Fixes

* **docs:** normalize path separator on Windows for generated/ exclusion ([b85575e](https://github.com/first-fluke/oh-my-agent/commit/b85575e5b68fe6e8d3665698dc7f62408a2bdbd2))


### Documentation

* **readme:** add oma-docs row to skill table in all locales ([7dea938](https://github.com/first-fluke/oh-my-agent/commit/7dea9388d3d1356a44b0cff223744729069a1a3a))

## [6.15.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.14.0...cli-v6.15.0) (2026-05-06)


### Features

* **oma-translator:** add tailing-negation rule and curly-quote check ([0697d6a](https://github.com/first-fluke/oh-my-agent/commit/0697d6a8e82c0aa856f8c17b5a7b97905a365e75))


### Refactoring

* **oma-frontend:** drop low-value resources, hoist stack files inline ([6ea9398](https://github.com/first-fluke/oh-my-agent/commit/6ea93988ddfbfb3f70a5d8b621a992b09fe6e88f))


### Documentation

* drop hardcoded skill count and stale subagent paragraph ([424824b](https://github.com/first-fluke/oh-my-agent/commit/424824b1502f7183e31b4de6d32ae84111d51726))

## [6.14.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.13.0...cli-v6.14.0) (2026-05-06)


### Features

* **benchmarks:** add multi-judge averaging for spec and visual axes ([c1c0f74](https://github.com/first-fluke/oh-my-agent/commit/c1c0f7472ec019c6b21510796e8a050f75433635))
* **skills/oma-frontend, benchmarks:** teach React 19 hook anti-patterns, refresh oma run ([91de585](https://github.com/first-fluke/oh-my-agent/commit/91de585943b96ee708272b93d4e2f8804030b343))

## [6.13.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.12.2...cli-v6.13.0) (2026-05-05)


### Features

* **skills:** strengthen oma-frontend + backend rules for benchmark gaps ([c384fd0](https://github.com/first-fluke/oh-my-agent/commit/c384fd0cf8d10af24ebeef49c723a9063bfe0f85))


### Bug Fixes

* **benchmarks:** build-report gallery row fuzzy match ([fcd67ed](https://github.com/first-fluke/oh-my-agent/commit/fcd67ed834d85b9bbdbffb2d89fc6e49699cbb8a))
* **skills/oma-frontend:** correct a11y anti-patterns in Card snippet ([a596060](https://github.com/first-fluke/oh-my-agent/commit/a59606075ef3bbc0dae57dfde196573bbfc3f0fe))


### Documentation

* **benchmarks:** frame oma's lint -5 as intentional design principle ([3512aae](https://github.com/first-fluke/oh-my-agent/commit/3512aae154942556b239818e2dfde51d062a36ca))
* **benchmarks:** re-capture oma + omc screenshots at consistent viewport ([fd0a74d](https://github.com/first-fluke/oh-my-agent/commit/fd0a74d11db604b928abd0f7f22b1c6a7faf0b67))

## [6.12.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.12.1...cli-v6.12.2) (2026-05-05)


### Bug Fixes

* **skills:** expand oma-frontend keyword triggers ([2dddddd](https://github.com/first-fluke/oh-my-agent/commit/2dddddd067ee047eebbd0233b805d356ce598eaa))


### Documentation

* **benchmarks:** update README to reflect oma rerun (88 -&gt; 75.5) ([11b50f1](https://github.com/first-fluke/oh-my-agent/commit/11b50f1058a42710c18e0b79b6b31bbb11f3f114))

## [6.12.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.12.0...cli-v6.12.1) (2026-05-05)


### Bug Fixes

* **install:** isolate test env from CI=true, mock missing copilot installer ([403f100](https://github.com/first-fluke/oh-my-agent/commit/403f100375a5205f38c347317f89b1674e373415))

## [6.12.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.11.0...cli-v6.12.0) (2026-05-05)


### Features

* **frontend:** mandate next@16+ and react@19+, ban next &lt; 16 ([cd96046](https://github.com/first-fluke/oh-my-agent/commit/cd9604644bbd456d37900775099f44df9ded94bc))


### Documentation

* **benchmarks:** add Korean translation README.ko.md ([182b69e](https://github.com/first-fluke/oh-my-agent/commit/182b69e3f8ec6c3e0a5824f5bbc3d23cbffabfce))

## [6.11.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.10.0...cli-v6.11.0) (2026-05-05)


### Features

* **benchmarks:** add 5-axis multiaxis scoring system ([26b0ad8](https://github.com/first-fluke/oh-my-agent/commit/26b0ad850cf751d439cae0a1273a0b6f0b683f8e))
* **frontend:** ban framer-motion, enforce motion/react ([2810724](https://github.com/first-fluke/oh-my-agent/commit/28107249f706fad8046de14fa99193d028bf5f6d))


### Bug Fixes

* **benchmarks:** macOS reproducibility + auto-score robustness + prompt move ([9439c0e](https://github.com/first-fluke/oh-my-agent/commit/9439c0eddec5ea36823505ce8b3e9e79d4e51b30))


### Refactoring

* **benchmarks:** move design.md from docs/ to benchmarks/ ([79c4b36](https://github.com/first-fluke/oh-my-agent/commit/79c4b36afdddab729b9d69234073a7640ccae7d0))


### Documentation

* **benchmarks:** add generated report, screenshots, and harness outputs ([3472c54](https://github.com/first-fluke/oh-my-agent/commit/3472c54bbb52bfc844a1df0bfbb9c7e1ebd36e89))

## [6.10.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.9.0...cli-v6.10.0) (2026-05-04)


### Features

* **cli:** generate .github/prompts wrappers for copilot vendor ([d9502ee](https://github.com/first-fluke/oh-my-agent/commit/d9502ee1504ca3d3d3a90c27b467e0b4b7ffec83))

## [6.9.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.8.0...cli-v6.9.0) (2026-05-04)


### Features

* **install:** add --yes flag for non-interactive install ([ff7ba68](https://github.com/first-fluke/oh-my-agent/commit/ff7ba683b60edd7b9526a1edaf623e00e7f4072d))

## [6.8.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.7.0...cli-v6.8.0) (2026-05-04)


### Features

* **models:** upgrade default models to gpt-5.5 and qwen3.6-plus ([bbcd072](https://github.com/first-fluke/oh-my-agent/commit/bbcd07273fd817083d8d86a7021b5efd7ef9c34f))

## [6.7.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.6.0...cli-v6.7.0) (2026-05-04)


### Features

* **codex:** force-enable goals and child_agents_md features ([cee3377](https://github.com/first-fluke/oh-my-agent/commit/cee3377cdaea2d47b161e650e3057a6cd26876ec))

## [6.6.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.5.7...cli-v6.6.0) (2026-05-04)


### Features

* **ralph:** re-verify all criteria each iteration with regression detection ([c6fd680](https://github.com/first-fluke/oh-my-agent/commit/c6fd680667c9fe47bee20b66cafbb93d35644b1a))

## [6.5.7](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.5.6...cli-v6.5.7) (2026-05-03)


### Documentation

* **readme:** drop knows sidecar mention from oma-scholar row ([f287bf0](https://github.com/first-fluke/oh-my-agent/commit/f287bf0561cab12edd7c58da4a675e60f1925daa))

## [6.5.6](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.5.5...cli-v6.5.6) (2026-05-03)


### Documentation

* **oma-frontend:** wire DESIGN.md as visual source of truth ([671dc60](https://github.com/first-fluke/oh-my-agent/commit/671dc6017a97ab74e3ffacc7bcc29ea3c04c6935))

## [6.5.5](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.5.4...cli-v6.5.5) (2026-04-30)


### Documentation

* **readme:** add oma-scholar to agent table ([45225f3](https://github.com/first-fluke/oh-my-agent/commit/45225f30cc9cc7e96aa2fd4da7066f39d0c02c5f))

## [6.5.4](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.5.3...cli-v6.5.4) (2026-04-30)


### Bug Fixes

* **model-registry:** drop fake api_only fixture and startup warn ([7ee7caf](https://github.com/first-fluke/oh-my-agent/commit/7ee7caf355507691ee3666136a65fde3db250ad2))

## [6.5.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.5.2...cli-v6.5.3) (2026-04-30)


### Documentation

* collapse APM install section into accordion across all locales ([cfb7e1f](https://github.com/first-fluke/oh-my-agent/commit/cfb7e1f833b9c4cc0da603d0383330576ffeca50))

## [6.5.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.5.1...cli-v6.5.2) (2026-04-30)


### Bug Fixes

* **oma-frontend:** enforce Next.js 16 proxy.ts and ban middleware.ts ([39d2a54](https://github.com/first-fluke/oh-my-agent/commit/39d2a54a9f94b23c5aafc335ff4af3327c99e9cb))

## [6.5.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.5.0...cli-v6.5.1) (2026-04-30)


### Refactoring

* **workflows:** merge /exec-plan into /plan with structured docs/plans/ layout ([e634da3](https://github.com/first-fluke/oh-my-agent/commit/e634da3b8d55bd7d5f4815b2a4742f9d8561f929))

## [6.5.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.4.0...cli-v6.5.0) (2026-04-30)


### Features

* **skills:** apply SSL framework and add oma-skill-creator ([18275f6](https://github.com/first-fluke/oh-my-agent/commit/18275f63f452cd90b2262c6d2614bb40e758a94e))


### Documentation

* **readme:** add localized references section with APA 7 citation ([ffb7aed](https://github.com/first-fluke/oh-my-agent/commit/ffb7aed1ed735771debb8a734ebce6693a00e9eb))

## [6.4.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.3.1...cli-v6.4.0) (2026-04-28)


### Features

* add Windows support with PowerShell installer and link fallbacks ([#309](https://github.com/first-fluke/oh-my-agent/issues/309)) ([31a72b6](https://github.com/first-fluke/oh-my-agent/commit/31a72b63417efed508d98a64792856b174874f41))

## [6.3.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.3.0...cli-v6.3.1) (2026-04-27)


### Bug Fixes

* **install,doctor:** bootstrap oma-config.yaml + fix doctor missing-skill repair ([#307](https://github.com/first-fluke/oh-my-agent/issues/307)) ([f916ec6](https://github.com/first-fluke/oh-my-agent/commit/f916ec6f7aca82e1e9a1fba0f5731ea80bd3b6c5))

## [6.3.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.2.2...cli-v6.3.0) (2026-04-27)


### Features

* **install:** add Hermes Agent skill export with HOME consent gate ([#305](https://github.com/first-fluke/oh-my-agent/issues/305)) ([6159cc6](https://github.com/first-fluke/oh-my-agent/commit/6159cc600d6ec3413766576f5c02ddec814b149b))

## [6.2.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.2.1...cli-v6.2.2) (2026-04-26)


### Documentation

* remove exec-plan and stack-set from slash command table ([85cf5f5](https://github.com/first-fluke/oh-my-agent/commit/85cf5f578455dcdc9dfb6b5e96ba48626167e501))

## [6.2.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.2.0...cli-v6.2.1) (2026-04-26)


### Documentation

* remove /tools and /pdf entries from README ([228fea9](https://github.com/first-fluke/oh-my-agent/commit/228fea900a44402c78468562c5c2743dfff1911c))

## [6.2.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.1.0...cli-v6.2.0) (2026-04-25)


### Features

* **scholar:** add oma scholar command and skill for paper sidecars ([6149a5a](https://github.com/first-fluke/oh-my-agent/commit/6149a5aa9768713c82ec071c738ea2581ec766a4))

## [6.1.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.0.1...cli-v6.1.0) (2026-04-25)


### Features

* **registry:** actionable error for unknown model slugs ([6467f0e](https://github.com/first-fluke/oh-my-agent/commit/6467f0eeac150b6e1e53deb6517ffff372e17e54))

## [6.0.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v6.0.0...cli-v6.0.1) (2026-04-25)


### Bug Fixes

* **config:** migrate source repo oma-config.yaml to model_preset schema ([babec96](https://github.com/first-fluke/oh-my-agent/commit/babec968a2ef81cfbed52244fa954e7df35fab09))


### Documentation

* **config:** cite OpenRouter slug format and CLI-only filter ([049577f](https://github.com/first-fluke/oh-my-agent/commit/049577f08db20586eab2ac34be4dcdcd48266af5))
* **config:** move resolution-order comment below the keys it describes ([c90a33a](https://github.com/first-fluke/oh-my-agent/commit/c90a33a0bfb302842acf9d3f42f7000d541bf8d6))

## [6.0.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.20.2...cli-v6.0.0) (2026-04-25)


### ⚠ BREAKING CHANGES

* **config:** agent_cli_mapping removed, replaced by model_preset + agents in .agents/oma-config.yaml. .agents/config/defaults.yaml and .agents/config/models.yaml no longer exist (built-in presets ship in the CLI package; user models inline in oma-config.yaml). The --update-defaults flag is removed. Migration 008 auto-converts legacy projects on oma install / oma update.

### Features

* **config:** consolidate to model_preset single-file config ([294b8df](https://github.com/first-fluke/oh-my-agent/commit/294b8df23b1dc3b9407f64041d0d421aa1caec5a))

## [5.20.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.20.1...cli-v5.20.2) (2026-04-24)


### Bug Fixes

* **image:** terminate codex exec args with -- before instruction ([#293](https://github.com/first-fluke/oh-my-agent/issues/293)) ([85252cf](https://github.com/first-fluke/oh-my-agent/commit/85252cfd094ba5a90045392a6b2341a2813857e8))

## [5.20.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.20.0...cli-v5.20.1) (2026-04-24)


### Documentation

* **image:** mandate auto-forward of attached references ([072c555](https://github.com/first-fluke/oh-my-agent/commit/072c5550271acad040ada71b6845d432a278dd39))
* **image:** require agents to auto-forward attached references ([a9ee1fc](https://github.com/first-fluke/oh-my-agent/commit/a9ee1fce3d210ff63fe1ad6516f80829dde1df65))

## [5.20.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.19.0...cli-v5.20.0) (2026-04-24)


### Features

* **image:** add --reference flag with sanitized unique filenames ([0f0031b](https://github.com/first-fluke/oh-my-agent/commit/0f0031b4ed69e4fce9e972895f2b9359f5a7d4e6))


### Bug Fixes

* **image:** align reference-error UX and Gemini doc with CLI-first concept ([2fe8cb5](https://github.com/first-fluke/oh-my-agent/commit/2fe8cb56fcd043625bec48f86b41bf177e36e42c))


### Documentation

* **image:** fix swapped exit-code labels in auto-mode reference comment ([4f2b5a2](https://github.com/first-fluke/oh-my-agent/commit/4f2b5a2ae886262b31a0a424ace5e51219c8c8e2))

## [5.19.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.18.2...cli-v5.19.0) (2026-04-24)


### Features

* **cli:** mirror workflows into .codex/skills for Codex $ invocation ([03cf790](https://github.com/first-fluke/oh-my-agent/commit/03cf7900276539368771282ba12f8afa2b9e15f2))

## [5.18.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.18.1...cli-v5.18.2) (2026-04-24)


### Bug Fixes

* **typecheck,biome:** resolve pre-existing errors ([9948947](https://github.com/first-fluke/oh-my-agent/commit/99489478debdc274decf04102fddea0b5ee0d24e))

## [5.18.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.18.0...cli-v5.18.1) (2026-04-24)


### Refactoring

* **apm:** use plugin.json custom paths, remove .apm mirror ([e943ed4](https://github.com/first-fluke/oh-my-agent/commit/e943ed49579a3be3dc6c36838d9999abbb01237d))


### Documentation

* **readme:** correct APM install scope (hook ships, rules/workflows don't) ([15d30cb](https://github.com/first-fluke/oh-my-agent/commit/15d30cb2248a9f2eb9dd3ebe954d5d4bdec9b344))

## [5.18.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.17.0...cli-v5.18.0) (2026-04-24)


### Features

* **apm:** add Microsoft APM package distribution ([672717c](https://github.com/first-fluke/oh-my-agent/commit/672717cc1233e318a2069627fa385e5a3efd022a))


### Refactoring

* **config:** drop legacy user-preferences.yaml read paths ([305fc4e](https://github.com/first-fluke/oh-my-agent/commit/305fc4e6e5c7719291989a67b84e89b4a68ee432))
* **config:** remove unused effort_matrix block from defaults.yaml ([76f0ef4](https://github.com/first-fluke/oh-my-agent/commit/76f0ef40ccb2e8b9aa592e352171289e0c8cef41))

## [5.17.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.16.0...cli-v5.17.0) (2026-04-24)


### Features

* **cli:** add oma image command with codex and pollinations providers ([a05cb19](https://github.com/first-fluke/oh-my-agent/commit/a05cb1969f38c6db67f90fb4717ee891a0115386))
* **hooks:** register oma-image keyword triggers ([312cb9c](https://github.com/first-fluke/oh-my-agent/commit/312cb9c9ef99240b8c74689c83e803efbb61e296))
* **skill:** add oma-image skill with clarification protocol ([7616bc6](https://github.com/first-fluke/oh-my-agent/commit/7616bc61e548007b4b3f32aa49fe47097ca5469d))


### Bug Fixes

* address code review on PR [#270](https://github.com/first-fluke/oh-my-agent/issues/270) ([a9d22d5](https://github.com/first-fluke/oh-my-agent/commit/a9d22d5d265027ddc5c879f4cd823bee7c1a130a))
* **doctor:** walk parent dirs when discovering .agents config ([6aae72f](https://github.com/first-fluke/oh-my-agent/commit/6aae72f5d910b1ee91115813537c8bb7cb805b37))
* **io:** honor oma-config.yaml for per-agent dispatch and quota cap ([bbe96b3](https://github.com/first-fluke/oh-my-agent/commit/bbe96b3dd5afdcc16f6f69055874aa54f97afd98))
* **io:** honor oma-config.yaml in resolveAgentPlan and loadQuotaCap ([15ea4d9](https://github.com/first-fluke/oh-my-agent/commit/15ea4d9305f8b6c7b386c291d17ab6fa327326c4))


### Documentation

* drop RARDO codename, fix slug bugs, consolidate oma-config.yaml references ([ef6630e](https://github.com/first-fluke/oh-my-agent/commit/ef6630ef13f4ce470e3db41cd6f0085ab881f02e))
* **readme:** add oma-image row to skill table in all locales ([90de0f4](https://github.com/first-fluke/oh-my-agent/commit/90de0f4deaee4cd51a440d6ad1877d016c950761))
* **skill/oma-image:** link prompt galleries and clean stale docs ([0f0ad16](https://github.com/first-fluke/oh-my-agent/commit/0f0ad16451edc42dca408cadb7f3625c17e7ebc2))

## [5.16.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.15.0...cli-v5.16.0) (2026-04-23)


### Features

* **agent:** wire T11 findings, T12 difficulty, T15 quota into spawn path ([aff6788](https://github.com/first-fluke/oh-my-agent/commit/aff678839b09cb349b713f1eeac6c11d9d78b3b3))
* **composer:** skip CHARTER_CHECK for Simple tasks ([4798b5e](https://github.com/first-fluke/oh-my-agent/commit/4798b5e168c7747b3c084241176f05d9a01dafda))
* **config:** support dual-format agent_cli_mapping ([6c51ea5](https://github.com/first-fluke/oh-my-agent/commit/6c51ea5f6a3675a726f2c39b29f92fb95f099fd8))
* **defaults:** add Profile B baked-in agent defaults ([fb3da52](https://github.com/first-fluke/oh-my-agent/commit/fb3da52d37731b2dfdd64145442f7917b4b3fdc4))
* **defaults:** add qwen-only runtime profile ([44d3034](https://github.com/first-fluke/oh-my-agent/commit/44d3034214747a5a22de72f0d9fd632b88ce8000))
* **dispatch:** add qwen runtime with forced external fallback ([8782b02](https://github.com/first-fluke/oh-my-agent/commit/8782b02dbbd0fa934202d3eb13d115c91ddcd742))
* **dispatch:** add resolveAgentPlan for per-agent model and effort ([f0b4549](https://github.com/first-fluke/oh-my-agent/commit/f0b454942f3680429dfb3daeb4bbf2ca2174471d))
* **dispatch:** wire resolveAgentPlan into planDispatch spawn path ([c92fd99](https://github.com/first-fluke/oh-my-agent/commit/c92fd991bba5ac9d147e22683e1037fede865793))
* **doctor:** add --profile flag with auth matrix ([031e234](https://github.com/first-fluke/oh-my-agent/commit/031e234839ecfd4c026e46a0039dbfb361bf0915))
* **install:** version-gated defaults.yaml upgrades ([94299e6](https://github.com/first-fluke/oh-my-agent/commit/94299e62055d61aff33fda4e5a8e0de8883af4bf))
* **io:** add session quota cap accounting ([efa7aaf](https://github.com/first-fluke/oh-my-agent/commit/efa7aaf4e8d03ce124c9d665c102c0baa0245709))
* **io:** add shared findings cache (L3) ([ade8dac](https://github.com/first-fluke/oh-my-agent/commit/ade8dac91e17f7e9de45b56bef630fcd746d9dd2))
* **platform:** add difficulty-adaptive context loader ([efe2bf8](https://github.com/first-fluke/oh-my-agent/commit/efe2bf8838d9554fcc22a30f87cb7cbc87f196d8))
* P0 — Registry + Config + Dispatch + Doctor ([4f89b8a](https://github.com/first-fluke/oh-my-agent/commit/4f89b8a90b8a338f6972e8c3416f0a6820498e19))
* **registry:** add model registry with 12 verified slugs ([16840c2](https://github.com/first-fluke/oh-my-agent/commit/16840c2de8e6fcee41975070bd5ed70358dbbb53))
* **registry:** support user models.yaml override ([b751955](https://github.com/first-fluke/oh-my-agent/commit/b7519551695fd0f5814aca2c0f817365478fac7e))
* **resolve:** honor legacy vendor override via runtime_profiles ([ea14658](https://github.com/first-fluke/oh-my-agent/commit/ea14658ba02a39827a7d8f55e753a5f3e7896fae))
* **workflows:** add cost-cap termination to Review Loop ([82d5f8b](https://github.com/first-fluke/oh-my-agent/commit/82d5f8bfb84353265a05d1e92bb46abfdee9b264))


### Bug Fixes

* **agent:** import session-cost helpers into spawn-status ([c54d087](https://github.com/first-fluke/oh-my-agent/commit/c54d08748383780244b657e12acb8d0bdbd5abec))
* **composer:** sanitize frontmatter per-vendor to stop R14 effort leak ([cb1d729](https://github.com/first-fluke/oh-my-agent/commit/cb1d7299879cca5b24434dcd9ffdf444a7401872))
* **doctor:** resolve model slug from defaults when user-pref is legacy ([08454ae](https://github.com/first-fluke/oh-my-agent/commit/08454ae72b6935555e0934c1100dd480b84f03bb))
* **hooks:** guard keyword-detector against retrigger loops (R17) ([ad01209](https://github.com/first-fluke/oh-my-agent/commit/ad012090029684c5a1a9a69142798ff88e15e3a4))
* **install:** remove dangling symlinks during oma install ([31f1525](https://github.com/first-fluke/oh-my-agent/commit/31f1525f4b11aa2b6e52035500577a376bf46054))
* **io:** validate sessionId to prevent path traversal ([6f5369e](https://github.com/first-fluke/oh-my-agent/commit/6f5369eda2b1a05619a59d117f5bcac855474283))
* **qwen:** detect deprecated OAuth sessions and print migration guide ([fe399f7](https://github.com/first-fluke/oh-my-agent/commit/fe399f7442b10d7d55ee91538f54c7050d0430c8))
* **variants:** correct gemini modelDefault to gemini-3-flash ([b1f276f](https://github.com/first-fluke/oh-my-agent/commit/b1f276f1d9230f2fa14dc337ebf2d90cb2d9b627))
* **vendors:** harden qwen OAuth detection and codex effort typing ([5f81a98](https://github.com/first-fluke/oh-my-agent/commit/5f81a9822d7a07ad0f4543b3a5fdbc95e7dcf9bf))


### Documentation

* **cli:** sync README Per-Agent Models section ([be3c51b](https://github.com/first-fluke/oh-my-agent/commit/be3c51bdea4756fc0a80418c5715922990d348f5))
* reference per-agent models from root README and docs/* ([7760f59](https://github.com/first-fluke/oh-my-agent/commit/7760f592b079207c79459958fb1d9359bcbcb6ab))

## [5.15.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.14.3...cli-v5.15.0) (2026-04-23)


### Features

* **backend:** route oma verify backend through stack.yaml manifest ([453873a](https://github.com/first-fluke/oh-my-agent/commit/453873a8451fb33450259178c8826ef467c960a9))


### Bug Fixes

* **cli:** escape inner quote in checkSqlInjection grep pattern ([#265](https://github.com/first-fluke/oh-my-agent/issues/265)) ([20938c6](https://github.com/first-fluke/oh-my-agent/commit/20938c64915ac533440cc6f8393e392f332abc97))


### Documentation

* **cli:** sync README skill table (auto) ([7507489](https://github.com/first-fluke/oh-my-agent/commit/75074899ae21b228bc13cf08f5f00b8b0271eb96))

## [5.14.3](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.14.2...cli-v5.14.3) (2026-04-22)


### Documentation

* reflect oma-observability + 5 missing agents and fix counts ([67e9da0](https://github.com/first-fluke/oh-my-agent/commit/67e9da03000a84636872a88c5315e33361941442))

## [5.14.2](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.14.1...cli-v5.14.2) (2026-04-21)


### Documentation

* **readme:** add oma-observability to agent team table ([64e478d](https://github.com/first-fluke/oh-my-agent/commit/64e478dfc6a71b1f3abc034342c370458e2ea0ea))

## [5.14.1](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.14.0...cli-v5.14.1) (2026-04-21)


### Refactoring

* **oma-observability:** remove process-theater metadata ([d37891a](https://github.com/first-fluke/oh-my-agent/commit/d37891ab11ed7eba2cec1aac7f3f6b992adfc2ae))

## [5.14.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.13.0...cli-v5.14.0) (2026-04-21)


### Features

* **cli:** register Serena MCP for Codex and Qwen runtimes ([688e06a](https://github.com/first-fluke/oh-my-agent/commit/688e06abab474f32bc17076ca8e6bf4a14344b8d))
* **skills:** add oma-observability skill (33 files / 10.8k lines) ([add31cc](https://github.com/first-fluke/oh-my-agent/commit/add31cc124a13ab23760c5a1c65a73bd8f96f5d4))


### Refactoring

* **cli:** add @cli/* path alias and slice boundary tooling ([9c796bc](https://github.com/first-fluke/oh-my-agent/commit/9c796bc48b4136e0cbc4609b15d72a5a4a77ebb8))
* **cli:** colocate slice tests with implementation ([10b7a10](https://github.com/first-fluke/oh-my-agent/commit/10b7a109767e7fcebd796ffc7cc99adc95de019c))
* **cli:** extract per-vendor adapters into cli/vendors/ ([c14d0cb](https://github.com/first-fluke/oh-my-agent/commit/c14d0cbf262ea12519f35e366e7b0dbe4e12ba57))
* **cli:** move SSOT installer into cli/platform/ ([2869a26](https://github.com/first-fluke/oh-my-agent/commit/2869a264116a39421d79c9253856c4d58367e1b7))
* **cli:** slice all remaining commands + remove lib/ ([52b0ac5](https://github.com/first-fluke/oh-my-agent/commit/52b0ac5895aaa287f74fcfef9bdfc484b298da7c))
* **cli:** slice commands/bridge into {command,bridge} ([045dac7](https://github.com/first-fluke/oh-my-agent/commit/045dac749e6a89c2d9377ff432e93170e84c678b))
* **cli:** slice commands/doctor into {command,doctor,ui} ([59f7f1c](https://github.com/first-fluke/oh-my-agent/commit/59f7f1c7e68dab51f72e3fd4e6c50f85c715914e))
* **cli:** slice commands/install into {command,install} ([b26e6cf](https://github.com/first-fluke/oh-my-agent/commit/b26e6cfdc21d36760b30063b40f6b552091be256))
* **cli:** slice commands/update into {command,update} ([db513e4](https://github.com/first-fluke/oh-my-agent/commit/db513e4daf98c1aee16d4031167aaffffd329b5b))
* **cli:** slice commands/verify into {command,verify,ui} ([764bf16](https://github.com/first-fluke/oh-my-agent/commit/764bf1661d3fccc115790b6d8f7f5ce3c96349dd))
* **cli:** split external I/O and presentation into io/ + cli-kit/ ([84a96fb](https://github.com/first-fluke/oh-my-agent/commit/84a96fb9eeb10fcc1984f5f2771848da590caef9))
* **cli:** update ARCHITECTURE.md with final layout ([654e7ed](https://github.com/first-fluke/oh-my-agent/commit/654e7ed8f22113c22d7d22f54a86c044318b9991))

## [5.13.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.12.0...cli-v5.13.0) (2026-04-19)


### Features

* **cli:** add oma search with auto-escalating fetch pipeline ([a84b24f](https://github.com/first-fluke/oh-my-agent/commit/a84b24fb8f86b57dcb50dfb2c31a952036a79dad))
* **hooks:** add oma-hwp triggers to skill injector ([1b2939e](https://github.com/first-fluke/oh-my-agent/commit/1b2939ed1980a46ba2f0f3c6d12624e874730ed6))


### Bug Fixes

* **cli:** write bare bun in hook commands to prevent per-machine churn ([d22aafc](https://github.com/first-fluke/oh-my-agent/commit/d22aafcdb92935308bef34ed2da5e86f6479f6b5))


### Refactoring

* **cli:** clarify self-update notices as "global oh-my-agent" ([624ae95](https://github.com/first-fluke/oh-my-agent/commit/624ae95ff75dbfd5cc98ca37f65a9925216cb6e4))


### Documentation

* add oma-hwp entry to agent tables in all READMEs ([2938942](https://github.com/first-fluke/oh-my-agent/commit/2938942437bfb75c776b7ca4c8330523e1c5f9d3))

## [5.12.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.11.0...cli-v5.12.0) (2026-04-18)


### Features

* **skills:** add oma-hwp skill for HWP/HWPX to Markdown ([e9cabd3](https://github.com/first-fluke/oh-my-agent/commit/e9cabd3fbb9e609836113403c918471781ed3185))
* **skills:** flatten kordoc HTML tables to GFM in oma-hwp ([48fa0d3](https://github.com/first-fluke/oh-my-agent/commit/48fa0d3001e47afc6d536173edbc6f9e89e936c2))
* **skills:** strip Private Use Area glyphs in oma-hwp post-process ([507df19](https://github.com/first-fluke/oh-my-agent/commit/507df19e82fbf90990d0e7bfca4745e61e90f4b2))

## [5.11.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.10.0...cli-v5.11.0) (2026-04-18)


### Features

* **translator:** enforce em dash and formatting rules via blocking verification gate ([4690dad](https://github.com/first-fluke/oh-my-agent/commit/4690dadd8a1d2c9e7c7718f73c1ce0f16452b72b))


### Bug Fixes

* **skills:** correct shared-core relative paths ([24a21ce](https://github.com/first-fluke/oh-my-agent/commit/24a21ce432e5b89128ab4e9336bc24e4a509591d))


### Refactoring

* **skills:** expand tf-infra Step 0 with decision cues ([6fc161d](https://github.com/first-fluke/oh-my-agent/commit/6fc161d8fe910a1c2ecb13282a4b3f30c4dcbc33))
* **skills:** slim oma-frontend and drop vendor-specific refs ([4cdcca1](https://github.com/first-fluke/oh-my-agent/commit/4cdcca14db735828a52d3efece7eb1d989117e09))


### Documentation

* **readme:** sync locales with English source and polish CJK translations ([427d6ab](https://github.com/first-fluke/oh-my-agent/commit/427d6ab4d29af6aeddf5bdafc31787831cb3414d))

## [5.10.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.9.0...cli-v5.10.0) (2026-04-18)


### Features

* **cli:** auto-update CLI when outdated, opt-out via config ([a8ae5c9](https://github.com/first-fluke/oh-my-agent/commit/a8ae5c9e71ffd8411f0bf8637f3d4fa52a29367d))

## [5.9.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.8.0...cli-v5.9.0) (2026-04-17)


### Features

* **hooks:** auto-inject skills via trigger matching ([1dd9cd0](https://github.com/first-fluke/oh-my-agent/commit/1dd9cd08eabceb2f41a5091a1c56cc2d73195654))

## [5.8.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.7.0...cli-v5.8.0) (2026-04-16)


### Features

* **mobile:** add Maestro as E2E testing tool ([e58dfa4](https://github.com/first-fluke/oh-my-agent/commit/e58dfa4c1a058d250901f4d02fd95faf0b7b95b8))

## [5.7.0](https://github.com/first-fluke/oh-my-agent/compare/cli-v5.6.1...cli-v5.7.0) (2026-04-16)


### Features

* **mcp:** add Context7 MCP server and docs-search tool group ([5ab861b](https://github.com/first-fluke/oh-my-agent/commit/5ab861bc73996708fafdb117c54fa6ee5703f067))
* **skills:** add oma-search skill — intent-based search router with trust scoring ([17a7aa6](https://github.com/first-fluke/oh-my-agent/commit/17a7aa6bdc4e9497fa975cba3d7944476ab7c32d))

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
