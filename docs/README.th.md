# oh-my-agent: เครื่องมือจัดการชุดเอเจนต์หลากหลายรูปแบบ (Portable Multi-Agent Harness)

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md)

คุณเคยหวังว่าผ AI Assistant ของคุณจะมี "เพื่อนร่วมงาน" บ้างไหม? นั่นคือสิ่งที่ oh-my-agent ทำได้

แทนที่จะให้ AI ตัวเดียวทำทุกอย่าง (และเริ่มสับสนระหว่างทำงาน) oh-my-agent จะแบ่งงานออกเป็น **Specialized agents** — เช่น frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design และอื่นๆ แต่ละตัวจะมีความเข้าใจในโดเมนของตัวเองอย่างลึกซึ้ง มีเครื่องมือและรายการตรวจสอบ (checklists) ของตัวเอง และมุ่งเน้นเฉพาะงานในหน้าที่ของตน

ตอนนี้ใช้งานได้กับ AI IDE ชั้นนำทั้งหมดได้แก่: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode และอื่นๆ

## Quick Start

```bash
# ติดตั้งในคำสั่งเดียว (ติดตั้ง bun และ uv ให้อัตโนมัติหากยังไม่ได้ install ไว้)
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash

# หรือรันด้วยตนเอง
bunx oh-my-agent@latest
```

`install.sh` รองรับเฉพาะ macOS/Linux สำหรับ Windows กรุณาติดตั้ง `bun` และ `uv` ด้วยตนเอง แล้วรัน `bunx oh-my-agent@latest`

เลือก Preset ที่ต้องการ แล้วคุณก็พร้อมใช้งาน:

| Preset | สิ่งที่คุณจะได้รับ |
|--------|-------------|
| ✨ All | Agents และ skills ทั้งหมด |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## ทีมเอเจนต์ของคุณ

| Agent | หน้าที่ |
|-------|-------------|
| **oma-architecture** | การวิเคราะห์ความคุ้มค่าด้านสถาปัตยกรรม (tradeoffs), กำหนดขอบเขต, รองรับ ADR/ATAM/CBAM |
| **oma-backend** | สร้าง API ด้วย Python, Node.js หรือ Rust |
| **oma-brainstorm** | สำรวจไอเดียก่อนที่จะเริ่มลงมือสร้างจริง |
| **oma-db** | ออกแบบ Schema, จัดการ migration, indexing, vector DB |
| **oma-debug** | วิเคราะห์สาเหตุต้นตอ (root cause), แก้ไขบัค, ทำ regression tests |
| **oma-design** | ระบบการออกแบบ (Design systems), tokens, accessibility, responsive |
| **oma-dev-workflow** | CI/CD, releases, ระบบอัตโนมัติสำหรับ monorepo |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-mobile** | จัดการ cross platform application ด้วย Flutter |
| **oma-orchestrator** | รันเอเจนต์แบบ parallel ผ่าน CLI |
| **oma-pdf** | แปลงไฟล์ PDF เป็น Markdown |
| **oma-pm** | วางแผนงาน, ย่อย requirements, กำหนด API contracts |
| **oma-qa** | ตรวจสอบความปลอดภัยตามมาตรฐาน OWASP, ประสิทธิภาพ, accessibility |
| **oma-scm** | การจัดการโครงสร้างซอฟต์แวร์ (SCM): แตกกิ่ง (branching), รวมโค้ด (merges), worktrees; รองรับ Conventional Commits |
| **oma-tf-infra** | Multi-cloud Terraform IaC (Infrastructure as Code) |
| **oma-translator** | การแปลภาษาหลากหลายภาษาอย่างเป็นธรรมชาติ |

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
| 5 | `/debug` | การแก้บัคแบบมีโครงสร้างเพื่อหาสาเหตุต้นตอ |
| 6 | `/scm` | SCM + กระบวนการ Git และรองรับ Conventional Commit |

**การตรวจจับอัตโนมัติ**: คุณไม่จำเป็นต้องใช้คำสั่ง slash ตลอดเวลา — คำสำคัญเช่น "architecture", "plan", "review", และ "debug" ในข้อความของคุณ (รองรับ 11 ภาษา!) จะเปิดใช้งานเวิร์กโฟลว์ที่ถูกต้องโดยอัตโนมัติ

## CLI

```bash
# ติดตั้งแบบ Global
bun install --global oh-my-agent   # หรือ: brew install oh-my-agent

# ใช้งานได้ทุกที่
oma doctor                  # ตรวจสอบความพร้อมของระบบ
oma dashboard               # ตรวจสอบการทำงานของเอเจนต์แบบเรียลไทม์
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

## ทำไมต้อง oh-my-agent?

- **Portable** — ใช้ได้ผ่านโฟลเดอร์ `.agents/` โปรเจกต์ของคุณ โดยไม่ยึดติดกับ IDE ใด IDE หนึ่ง
- **Role-based** — เอเจนต์ถูกจำลองตามทีมวิศวกรจริง ไม่ใช่แค่กลุ่มของ prompt
- **ประหยัด Token** — การออกแบบ Two layer skill ช่วยประหยัด token ได้ประมาณ 75%
- **Quality-first** — มี Charter preflight, quality gates และรีวิวเวิร์กโฟลว์ในตัว
- **รองรับหลายผู้ให้บริการ (Multi-vendor)** — ผสมผสานการใช้ Gemini, Claude, Codex และ Qwen ตามประเภทของเอเจนต์
- **ตรวจสอบได้ (Observable)** — มีหน้าจอ Dashboard ทั้งใน Terminal และ Web เพื่อดูสถานะแบบเรียลไทม์

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

- **[รายละเอียดสเปก (Docs)](./AGENTS_SPEC.md)** — รายละเอียดทางเทคนิคและสถาปัตยกรรมฉบับเต็ม
- **[เอเจนต์ที่รองรับ](./SUPPORTED_AGENTS.md)** — ตารางเปรียบเทียบเอเจนต์ใน IDE ต่างๆ
- **[เอกสารบนเว็บ](https://first-fluke.github.io/oh-my-agent/)** — คู่มือ บทเรียน และการอ้างอิง CLI

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

## License

MIT
