---
title: "指南：视频生成"
sidebar_label: 视频生成
description: oh-my-agent 视频生成完整指南，介绍一个无需密钥即可使用的三层路由器。它会在可复现的运行目录中组合脚本、旁白、视觉素材、字幕和受管的 HyperFrames 合成器，支持 shorts、explainer 和 demo 模式。
---

# 视频生成

`oma-video` 是 oh-my-agent 的视频路由器。它从一行简述出发，组合脚本、旁白、视觉素材和字幕，然后将计划记录到运行目录中。供应商阶段可以不提供密钥，并能使用本地或确定性回退；要得到真实 MP4，仍需要可用的合成器和有效的组合配置。

当出现 *video*、*shorts*、*reels*、*explainer*、*demo*、*walkthrough*、*screencast* 等关键词，或其他技能需要视频作为副产物时，该技能会自动激活。

---

## 何时使用

- 将简述、README、代码或数据制作成短片。
- 制作带旁白的讲解视频，或录制演示和操作流程。
- 需要反复确定性运行的“简述 → `.mp4`”管线。

## 何时不使用

- 单张静态图像，使用 [`oma-image`](/docs/guide/image-generation)。
- 直播屏幕广播或流式传输，超出范围（采集受监督，不进行流式传输）。
- 独立旁白音频，使用 `oma-voice`。

---

## 模式速览

| 模式 | 画面比例 | 组合内容 |
|------|--------|----------|
| `shorts` | 9:16 | 短视频竖屏片段（脚本 → 旁白 → 视觉素材 → 字幕）。 |
| `explainer` | 16:9 | 根据 README、代码或数据简述制作的横屏讲解视频。 |
| `demo` | 派生 | 根据 `--capture` 提供的人类录制内容制作操作演示；`--source web --url` 提供受监督的有头浏览器采集上下文，不会自动执行登录。 |

模式会选择合适的默认值；需要不同值时传入相应标志。

---

## 快速开始

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

每次运行都会打印运行目录。固定 `--seed` 会稳定确定性规划输入，但实时供应商输出和采集素材仍可能变化。需要复用已保存的渲染规格和素材时，可重新渲染现有运行目录。

其他通过 `oma video generate --output json` 调用该工具的程序会从标准输出解析 JSON 信封：`{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`。不存在 `outputs` 键，请从 `manifestPath` 指向的清单中读取输出和素材路径。

---

## CLI 参考

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### 关键标志

| 标志 | 用途 |
|---------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`。 |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`。 |
| `--locale <lang>` | 旁白或字幕的语言标签。 |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none`（无需密钥的对齐）。 |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`。 |
| `--voice <profile>` | 旁白声音，或 `none`（默认值；省略后视频将静音，并使用估算的字幕时间）。 |
| `--music <mode>` | `upbeat`、`calm`、`cinematic`、`lofi`、`piano` 或 `none`。 |
| `--compositor <c>` | `hyperframes`（默认）\| `mpt`。 |
| `--capture <path>` | demo 模式的输入录制路径（`--source file`）。 |
| `--source <k>` | demo 采集源：`file` 或 `web`（默认：`file`）。 |
| `--url <url>` | `--source web` 的目标 URL（本地、预发布或生产环境）；需要录制时不能用它替代 `--capture`。 |
| `--device <name>` | Web 采集的设备边框，会覆盖画面比例尺寸。 |
| `--ready-selector <css>` | Web 采集前等待的 CSS 选择器。 |
| `--show-cursor` | 在 Web 采集中叠加可见光标。 |
| `--polish` | 在采集的素材上叠加 HyperFrames 组合。 |
| `--capture-timeout <sec>` | 实时 Web 采集的硬性时限。 |
| `--capture-stop <mode>` | CI 使用的非交互停止方式：`duration:<sec>` 或 `selector:<css>`。 |
| `--output-dir <path>` | 输出基础目录。位于 `$PWD` 之外的路径需要 `--allow-external-output`。 |
| `--allow-external-output` | 允许输出路径位于 `$PWD` 之外。 |
| `--max-usd <n>` | 确认前允许的最高预估成本。 |
| `--duration <sec>` | 目标时长，或 `auto`。 |
| `--seed <n>` | 确定性种子。 |
| `--dry-run` | 输出脚本、渲染规格和清单，跳过渲染。 |
| `--script <path>` | 要注入的智能体编写 `script.json`，会覆盖骨架，并控制旁白、屏幕文字和每个场景的视觉提示。 |
| `-y, --yes` | 跳过成本确认提示。 |
| `--timeout <duration>` | 每次调用视觉或音乐供应商的时间上限，例如 `90s` 或 `2m`；不带单位的数字按秒计算。 |
| `--output <f>` | CLI 输出：`text`（默认）或 `json`。 |
| `--no-brief-in-manifest` | 保存简述的 SHA-256，而不是原始简述。 |

---

## 无需密钥的供应商

供应商阶段会解析为**真实分支**，并在阶段支持时提供**确定性回退**。因此缺少密钥时，规划中的运行仍可使用估算时间或本地素材。合成器是必需的最终阶段，通常没有占位回退：

| 能力 | 真实分支 | 回退 |
|------------|-------------|----------|
| script | 存在密钥时使用 LLM | 根据简述生成确定性大纲 |
| voice | `oma-voice`（本地 Voicebox） | 估算时间，不生成音频 |
| visual | `oma-image` / `oma-slide` / stock | 占位素材 |
| caption | 无需密钥的强制对齐 | 估算词语时间 |
| capture | 受监督的浏览器 Web 采集（`--source web`），或提供录制文件（`--source file --capture`） | 引导式“自行录制”流程 |
| compositor | HyperFrames（受管）或 MoneyPrinterTurbo | 没有合成器回退，运行会失败并给出诊断 |

不会自动处理凭据：采集时由人完成屏幕登录；URL 和查询令牌会在日志和清单中屏蔽。

字幕以**静态窗口提示**渲染，也就是当前帧处于活动状态的单行字幕，使用 CSS 换行，不做逐词动画。

---

## 工具链与 `doctor`

重量级工具链（受管 HyperFrames 项目的 `node_modules`、内置 Pretendard 字体、MoneyPrinterTurbo 检出目录、采集浏览器和 Chrome Headless Shell）会**按需配置**，不会随软件包发布。直接运行 `doctor` 只生成报告，不会安装任何内容：

```bash
oma video doctor
```

它会报告 `node`、`chromium`、`ffmpeg`、`ffprobe`、`hyperframes-toolchain`、`hyperframes-skills`、`pretendard-font`、`mpt-project`、`voicebox`、`oma-image`、`pixelle` 和 `cap` 的状态，并为缺失项打印安装提示。基线要求 Node.js 22+、HyperFrames 工具链及其 Chrome 浏览器、FFmpeg/FFprobe 和 `oma-image`。要得到真实 MP4，还需要编写好的 HTML。

使用安装标志配置工具链：

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` 还会将内置 Pretendard 字体（固定版本）获取到共享的工具链缓存中，这是确定性边界的一部分。网络失败时会发出警告，渲染会回退到系统字体；浏览器和操作系统的差异仍可能影响编码后的输出。

---

## 输出布局

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── hyperframes/         # index.html, AUTHORING.md, local assets and toolchain link
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

`render-spec.json` 与素材构成确定性边界；实时采集会在清单中记录为 `nondeterministic`。

---

## 故障排查

| 症状 | 原因或修复 |
|---------|-------------|
| 没有生成 MP4 | 合成器、组合配置或工具链检查失败。运行 `oma video doctor`，然后运行 `oma video compose <runDir>`，修复报告的组合配置，再重新运行 `oma video render <runDir>`。 |
| 旁白无声（`source: estimated`） | Voicebox 无法连接；启动 `oma-voice` 服务器，或接受估算时间。 |
| `--source web` 打印引导流程而不是录制 | 没有 TTY，或浏览器采集运行时不可用，因此进入引导回退。使用已配置采集运行时的交互式终端并传入 `--capture-stop`，或使用 `--capture` 传入录制文件。 |
| 首次运行渲染很慢 | HyperFrames 浏览器或 MPT 检出目录正在首次配置，后续运行会复用缓存。 |

---

## 始终使用最新 HyperFrames：由你编写组合

oh-my-agent **不提供 HyperFrames 组合代码**。每次运行都会在 `<runDir>/hyperframes/` 中创建项目；`oma video compose` 使用最新 npm HyperFrames 搭建骨架（工具链缓存位于 `~/.cache/oma-video/hyperframes/<version>/`，通过 `node_modules` 符号链接共享），并使用 HEAD 版本的 [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)（位于 `~/.cache/oma-video/hyperframes-skills/`）。智能体遵循骨架中的 `AUTHORING.md`、这些技能以及 `.agents/skills/oma-video/resources/hyperframes-authoring/` 中的模式规范，编写生成的组合源代码。

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- 最新版本检查（npm + GitHub）由 `video.hyperframes.check_interval_min` 控制频率（默认 60；`0` 表示每次 compose）。`oma update` 遵循该间隔；`oma video doctor --upgrade` 会强制检查；离线运行使用缓存的工具链，并报告 `stale`。
- 可复现性保存在运行目录中：`render-spec.json`、编写的组合源代码，以及生成的 HyperFrames 软件包元数据中记录的工具链版本。重新渲染同一运行会复用该渲染契约；新运行会检查最新 HyperFrames。
- lint 或渲染失败不会通过占位内容隐藏（占位仅在 `OMA_VIDEO_MOCK=1` 时存在）：`oma video render` 会带诊断退出 1，智能体需使用最新技能修复组合。新 HyperFrames 版本导致的损坏属于组合缺陷，不能因此固定版本。

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## 相关内容

- [`/video` 工作流](/docs/core-concepts/workflows)，简述 → 脚本 → 素材 → 渲染规格 → HyperFrames 管线。
- [图像生成](/docs/guide/image-generation)，复用作视频视觉供应商的静态图像路由器。
