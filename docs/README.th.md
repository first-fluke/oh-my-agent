# oh-my-agent: เครื่องมือจัดการชุดเอเจนต์หลากหลายรูปแบบ (Portable Multi-Agent Harness)

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md)

คุณเคยหวังว่าผ AI Assistant ของคุณจะมี "เพื่อนร่วมงาน" บ้างไหม? นั่นคือสิ่งที่ oh-my-agent ทำได้

แทนที่จะให้ AI ตัวเดียวทำทุกอย่าง (และเริ่มสับสนระหว่างทำงาน) oh-my-agent จะแบ่งงานออกเป็น **Specialized agents** เช่น frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design และอื่นๆ แต่ละตัวจะมีความเข้าใจในโดเมนของตัวเองอย่างลึกซึ้ง มีเครื่องมือและรายการตรวจสอบ (checklists) ของตัวเอง และมุ่งเน้นเฉพาะงานในหน้าที่ของตน

ตอนนี้ใช้งานได้กับ AI IDE ชั้นนำทั้งหมดได้แก่: Pi, Claude Code, Cursor, Antigravity, Codex CLI, OpenCode และอื่นๆ

## Quick Start

```bash
# macOS / Linux — ติดตั้ง bun, uv และ serena ให้อัตโนมัติหากยังไม่ได้ install ไว้
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — ติดตั้ง bun, uv และ serena ให้อัตโนมัติหากยังไม่ได้ install ไว้
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# หรือรันด้วยตนเอง (ทุก OS, ต้องการ bun + uv + serena)
bunx oh-my-agent@latest
```

### ติดตั้งผ่าน Agent Package Manager

<details>
<summary><a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM) จาก Microsoft แจกเฉพาะ skill เท่านั้น คลิกเพื่อขยาย</summary>

> อย่าสับสนกับ APM (Application Performance Monitoring) ของ `oma-observability`

```bash
# ทุก skill ติดตั้งลงทุก runtime ที่ตรวจพบ
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Skill เดี่ยว
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM แจกแค่ skill เท่านั้น ส่วน workflow, rules, `oma-config.yaml`, hook สำหรับตรวจจับคำสำคัญ และ CLI `oma agent:spawn` ให้ใช้ `bunx oh-my-agent@latest` แทน เลือกใช้แค่วิธีเดียวต่อโปรเจกต์ จะได้ไม่ตีกัน

</details>

เลือก Preset ที่ต้องการ แล้วคุณก็พร้อมใช้งาน:

| Preset | สิ่งที่คุณจะได้รับ |
|--------|-------------|
| ✨ All | Agents และ skills ทั้งหมด |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## ใช้งานได้กับทุก Agent

`oh-my-agent` รักษา `.agents/` ไว้เป็นแหล่งความจริงเพียงแหล่งเดียว (SSOT) แล้วฉายไปยัง layout เนทีฟของแต่ละ runtime เครื่องมือที่รองรับทุกตัวจึงใช้ skills, workflows และกฎร่วมกัน

<table>
<colgroup>
<col span="6" style="width:16.67%" />
</colgroup>
<tr>
<td align="center">
<a href="https://claude.com/product/claude-code"><img src="https://github.com/anthropics.png?size=120" alt="Claude Code" width="48" height="48" /></a><br/>
<strong>Claude Code</strong><br/>
<sub>เนทีฟ + อะแดปเตอร์</sub>
</td>
<td align="center">
<a href="https://github.com/openai/codex"><img src="https://github.com/openai.png?size=120" alt="Codex CLI" width="48" height="48" /></a><br/>
<strong>Codex CLI</strong><br/>
<sub>เนทีฟ + อะแดปเตอร์</sub>
</td>
<td align="center">
<a href="https://antigravity.google"><img src="./assets/agents/antigravity.png" alt="Antigravity" width="48" height="48" /></a><br/>
<strong>Antigravity</strong><br/>
<sub>SSOT เนทีฟ</sub>
</td>
<td align="center">
<a href="https://cursor.com"><img src="https://github.com/cursor.png?size=120" alt="Cursor" width="48" height="48" /></a><br/>
<strong>Cursor</strong><br/>
<sub>เนทีฟ + อะแดปเตอร์</sub>
</td>
<td align="center">
<a href="https://github.com/QwenLM/qwen-code"><img src="https://github.com/QwenLM.png?size=120" alt="Qwen Code" width="48" height="48" /></a><br/>
<strong>Qwen Code</strong><br/>
<sub>dispatch เนทีฟ</sub>
</td>
<td align="center">
<a href="https://github.com/esengine/DeepSeek-Reasonix"><img src="https://github.com/deepseek-ai.png?size=120" alt="Reasonix" width="48" height="48" /></a><br/>
<strong>Reasonix</strong><br/>
<sub>เข้ากันได้แบบเนทีฟ</sub>
</td>
</tr>
<tr>
<td align="center">
<a href="https://pi.dev/"><img src="./assets/agents/pi.svg" alt="Pi" width="48" height="48" /></a><br/>
<strong>Pi</strong><br/>
<sub>เข้ากันได้แบบเนทีฟ</sub>
</td>
<td align="center">
<a href="https://github.com/anomalyco/opencode"><img src="./assets/agents/opencode.png" alt="OpenCode" width="48" height="48" /></a><br/>
<strong>OpenCode</strong><br/>
<sub>เข้ากันได้แบบเนทีฟ</sub>
</td>
<td align="center">
<a href="https://ampcode.com"><img src="./assets/agents/amp.png" alt="Amp" width="48" height="48" /></a><br/>
<strong>Amp</strong><br/>
<sub>เข้ากันได้แบบเนทีฟ</sub>
</td>
<td align="center">
<a href="https://github.com/features/copilot"><img src="https://github.com/github.png?size=120" alt="GitHub Copilot" width="48" height="48" /></a><br/>
<strong>GitHub Copilot</strong><br/>
<sub>skills ผ่าน symlink</sub>
</td>
<td align="center">
<a href="https://grok.x.ai"><img src="./assets/agents/grok.png" alt="Grok" width="48" height="48" /></a><br/>
<strong>Grok</strong><br/>
<sub>native hooks</sub>
</td>
<td align="center">
<a href="https://kiro.dev"><img src="./assets/agents/kiro.png" alt="Kiro CLI" width="48" height="48" /></a><br/>
<strong>Kiro CLI</strong><br/>
<sub>native hooks + agents</sub>
</td>
</tr>
</table>

<p align="center"><sub><a href="./SUPPORTED_AGENTS.md">& อื่นๆ</a></sub></p>

## ทีมเอเจนต์ของคุณ

| Agent | หน้าที่ |
|-------|-------------|
| **oma-academic-writer** | ร่าง แก้ไข และตรวจสอบงานเขียนเชิงวิชาการให้ได้มาตรฐานระดับตีพิมพ์ |
| **oma-architecture** | ชั่งน้ำหนัก tradeoffs ด้านสถาปัตยกรรม กำหนดขอบเขตโมดูล พร้อมวิเคราะห์ด้วย ADR/ATAM/CBAM |
| **oma-backend** | สร้างและเสริมความปลอดภัยให้ API ด้วย Python, Node.js หรือ Rust |
| **oma-brainstorm** | สำรวจแนวคิดร่วมกับคุณก่อนตัดสินใจลงมือสร้างจริง |
| **oma-db** | ออกแบบ schema, migration, indexes และ vector stores ให้กับโปรเจกต์ของคุณ |
| **oma-debug** | ค้นหาสาเหตุต้นตอ แก้ไขบัค และเขียน regression test ไว้กันซ้ำ |
| **oma-deepsec** | สแกนโค้ดหาช่องโหว่ด้านความปลอดภัย และบล็อก pull request ที่มีความเสี่ยง |
| **oma-design** | สร้างระบบการออกแบบพร้อม tokens, accessibility และ responsive layouts |
| **oma-dev-workflow** | ทำให้ CI/CD, releases และงานใน monorepo เป็นระบบอัตโนมัติ |
| **oma-docs** | ตรวจสอบเอกสารว่ามีการอ้างอิงที่ผิดหรือไม่ และระบุส่วนที่ได้รับผลกระทบจากการเปลี่ยนแปลงโค้ด |
| **oma-frontend** | สร้าง UI ด้วย React/Next.js, TypeScript, Tailwind CSS v4 และ shadcn/ui |
| **oma-hwp** | แปลงไฟล์ HWP, HWPX และ HWPML ให้เป็น Markdown |
| **oma-image** | สร้างภาพผ่าน AI หลายผู้ให้บริการพร้อมกันในคราวเดียว |
| **oma-market** | วิจัยตลาดจากสัญญาณคอมมิวนิตี้ และวิเคราะห์ด้วยกรอบ SWOT, Porter's 5F และ PESTEL |
| **oma-mobile** | สร้างแอปพลิเคชัน cross-platform ด้วย Flutter |
| **oma-observability** | กระจายงานด้าน observability ครอบคลุม metrics, logs, traces, SLOs และการวิเคราะห์เหตุการณ์ |
| **oma-orchestrator** | รันเอเจนต์หลายตัวพร้อมกันแบบ parallel ผ่าน CLI |
| **oma-pdf** | แปลงไฟล์ PDF ให้เป็น Markdown |
| **oma-pm** | วางแผนงาน ย่อย requirements และกำหนด API contracts |
| **oma-qa** | ตรวจสอบโค้ดตามมาตรฐาน OWASP ด้านความปลอดภัย ประสิทธิภาพ และ accessibility |
| **oma-recap** | สรุปประวัติการสนทนาของคุณออกมาเป็น work summaries ตามธีม |
| **oma-scholar** | ค้นหาวรรณกรรมเชิงวิชาการ และช่วยดำเนินการทบทวนโดยผู้เชี่ยวชาญ |
| **oma-scm** | จัดการ branches, merges, worktrees และ Conventional Commits |
| **oma-search** | ส่งคำค้นหาแต่ละรายการไปยังแหล่งที่ดีที่สุด พร้อมให้คะแนนความน่าเชื่อถือของผลลัพธ์ |
| **oma-skill-creator** | เขียนและตรวจสอบ OMA skills ใหม่ในรูปแบบ SSL-lite |
| **oma-slide** | สร้าง HTML presentation deck ที่มีเอกลักษณ์และแอนิเมชันสมบูรณ์ รวมถึงส่งออกเป็น PDF/PNG/PPTX |
| **oma-tf-infra** | จัดเตรียม multi-cloud infrastructure ด้วย Terraform |
| **oma-translator** | แปลระหว่างภาษาต่างๆ ให้อ่านแล้วรู้สึกเหมือนเจ้าของภาษาเขียนเอง |
| **oma-voice** | สร้างเสียงพากย์และถอดเสียงบนเครื่อง โดยไม่ต้องพึ่ง cloud |

## วิธีการทำงาน

เพียงแค่แชท อธิบายสิ่งที่คุณต้องการ แล้ว oh-my-agent จะคิดเองว่าควรใช้เอเจนต์ตัวไหน

```
คุณ: "สร้างแอป TODO พร้อมระบบล็อกอินผู้ใช้"
→ PM วางแผนงาน
→ Backend สร้าง API สำหรับ authentication
→ Frontend สร้าง UI ด้วย React
→ DB ออกแบบ schema
→ QA ตรวจสอบความเรียบร้อยทั้งหมด
→ เสร็จสิ้น: โค้ดที่ผ่านการประสานงานและตรวจสอบแล้ว
```

หรือใช้คำสั่ง Slash commands สำหรับเวิร์กโฟลว์ที่มีโครงสร้าง:

| ขั้นตอน | คำสั่ง | หน้าที่ |
|------|---------|-------------|
| 1 | `/brainstorm` | การระดมสมองแบบอิสระ |
| 2 | `/architecture` | ตรวจสอบสถาปัตยกรรม, วิเคราะห์ความคุ้มค่า (tradeoffs), ADR/ATAM/CBAM |
| 2 | `/design` | เวิร์กโฟลว์ระบบการออกแบบ 7 ขั้นตอน |
| 2 | `/plan` | PM ย่อยฟีเจอร์ของคุณออกเป็นงานย่อย (tasks) |
| 3 | `/work` | การรันเอเจนต์หลากหลายตัวแบบทีละขั้นตอน |
| 3 | `/orchestrate` | การรันเอเจนต์แบบขนานโดยอัตโนมัติ |
| 3 | `/ultrawork` | เวิร์กโฟลว์คุณภาพสูง 5 ระยะ พร้อมจุดตรวจสอบ 11 จุด |
| 4 | `/review` | ตรวจสอบความปลอดภัย + ประสิทธิภาพ + accessibility |
| 4 | `/deepsec` | สแกนความปลอดภัยเชิงลึกโดยเอเจนต์ |
| 5 | `/debug` | การแก้บัคแบบมีโครงสร้างเพื่อหาสาเหตุต้นตอ |
| 5 | `/docs` | ตรวจสอบและซิงก์ความคลาดเคลื่อนของเอกสารผ่าน `oma-docs` |
| 6 | `/scm` | SCM + กระบวนการ Git และรองรับ Conventional Commit |

**การตรวจจับอัตโนมัติ**: คุณไม่จำเป็นต้องใช้คำสั่ง slash ตลอดเวลา คำสำคัญเช่น "architecture", "plan", "review", และ "debug" ในข้อความของคุณ (รองรับ 11 ภาษา!) จะเปิดใช้งานเวิร์กโฟลว์ที่ถูกต้องโดยอัตโนมัติ

### โมเดลต่อเอเจนต์

แต่ละเอเจนต์สามารถกำหนดโมเดลและ `effort` ของตัวเองผ่าน `.agents/oma-config.yaml` ได้ มี runtime profiles พร้อมใช้งาน: `antigravity`, `claude`, `codex`, `cursor`, `grok`, `mixed`, `qwen` ตรวจสอบ auth matrix ที่ resolve แล้วด้วย `oma doctor --profile` คู่มือฉบับเต็ม: [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md)

## ทำไมต้อง oh-my-agent?

- **Portable**: ใช้ได้ผ่านโฟลเดอร์ `.agents/` โปรเจกต์ของคุณ โดยไม่ยึดติดกับ IDE ใด IDE หนึ่ง
- **Role-based**: เอเจนต์ถูกจำลองตามทีมวิศวกรจริง ไม่ใช่แค่กลุ่มของ prompt
- **ประหยัด Token**: การออกแบบ Two layer skill ช่วยประหยัด token ได้ประมาณ 75%
- **Quality-first**: มี Charter preflight, quality gates และรีวิวเวิร์กโฟลว์ในตัว:
  - `oma verify <agent>` — การตรวจสอบเชิงกำหนด 14 รายการต่อประเภท agent (TypeScript strict, tests, raw SQL, secret ที่ hardcode, Flutter analyze, inline styles, scope violation, charter alignment …)
  - `session.quota_cap` — เพดาน token / spawn / per-vendor ต่อ session ใน `oma-config.yaml`; Step 5 ของ `orchestrate` บล็อก spawn ต่อไปเมื่อเกินเพดาน
  - `ralph` workflow — JUDGE อิสระตรวจสอบทุก criterion ซ้ำในแต่ละ iteration เพื่อจับ regression แบบเงียบ; cache สำหรับ test ที่ใช้เวลา >30 วินาที
  - Exploration Loop — หลังจาก retry 2 ครั้ง `orchestrate` จะ spawn variant ของ hypothesis แบบขนานและเก็บผลที่ได้คะแนนสูงสุด
  - Monorepo auto-routing — `detectWorkspace` อ่าน pnpm / nx / turbo / lerna และส่งแต่ละ agent ไปยัง workspace ของตัวเอง
- **รองรับหลายผู้ให้บริการ (Multi-vendor)**: ผสมผสานการใช้ Claude, Codex, Cursor และ Qwen ตามประเภทของเอเจนต์
- **ตรวจสอบได้ (Observable)**: มีหน้าจอ Dashboard ทั้งใน Terminal และ Web เพื่อดูสถานะแบบเรียลไทม์

## สถาปัตยกรรม (Architecture)

```mermaid
flowchart TD
    subgraph Workflows["เวิร์กโฟลว์ (Workflows)"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["การประสานงาน (Orchestration)"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["เอเจนต์ตามโดเมน (Domain Agents)"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
        TF[oma-tf-infra]
    end

    subgraph Quality["คุณภาพ (Quality)"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> SCM([oma-scm])
```

## เรียนรู้เพิ่มเติม

- **[รายละเอียดสเปก (Docs)](./AGENTS_SPEC.md)**: รายละเอียดทางเทคนิคและสถาปัตยกรรมฉบับเต็ม
- **[เอเจนต์ที่รองรับ](./SUPPORTED_AGENTS.md)**: ตารางเปรียบเทียบเอเจนต์ใน IDE ต่างๆ
- **[เอกสารบนเว็บ](https://first-fluke.github.io/oh-my-agent/)**: คู่มือ บทเรียน และการอ้างอิง CLI

## ผู้สนับสนุน (Sponsors)

โปรเจกต์นี้ได้รับการดูแลรักษาขอบคุณผู้สนับสนุนที่ใจดีทุกท่าน
Project นี้ได้รับการสนับสนุนจาก sponsor ใจดีทุกๆท่าน

> **หากชอบ Project นี้?** ติดดาวให้เราได้นะค้าบบ !
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> ลองใช้ template เริ่มต้นที่ปรับแต่งมาแล้วได้ที่: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion
### 🛸 Booster
### ☕ Contributor

[เป็นผู้สนับสนุน →](https://github.com/sponsors/first-fluke)

ดูรายชื่อผู้สนับสนุนทั้งหมดที่ [SPONSORS.md](../SPONSORS.md)

## ประวัติการติดดาว (Star History)

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)

## เอกสารอ้างอิง

- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026
- Chen, C., Yu, Q., Gu, Y., Huang, Z., Li, H., Liu, H., Liu, S., Liu, J., Peng, D., Wang, J., Yan, Z., Meng, F., Qin, E., Che, C., & Hu, M. (2026). *The scaling laws of skills in LLM agent systems* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.16508
- Yang, Y., Gong, Z., Huang, W., Yang, Q., Zhou, Z., Huang, Z., Li, Y., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, Y., Chen, D., Yang, X., & Luo, C. (2026). *SkillOpt: Executive strategy for self-evolving agent skills* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23904
- Huang, Z., Xu, J., Yang, Y., Gong, Z., Yang, Q., Tian, M., Wang, X., Lv, C., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, X., Chen, D., Zheng, X., & Luo, C. (2026). *From raw experience to skill consumption: A systematic study of model-generated agent skills* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23899

## License

MIT
