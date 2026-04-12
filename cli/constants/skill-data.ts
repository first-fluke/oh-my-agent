import type { SkillsRegistry } from "../types/index.js";

export const SKILLS: SkillsRegistry = {
  domain: [
    {
      name: "oma-architecture",
      desc: "Architecture specialist - module boundaries, tradeoffs, ADRs",
    },
    { name: "oma-frontend", desc: "React/Next.js UI specialist" },
    { name: "oma-backend", desc: "Backend API specialist (multi-language)" },
    {
      name: "oma-db",
      desc: "SQL/NoSQL data modeling, normalization, integrity, and capacity specialist",
    },
    { name: "oma-mobile", desc: "Flutter/Dart mobile specialist" },
  ],
  design: [
    {
      name: "oma-design",
      desc: "Design system, DESIGN.md, accessibility, anti-pattern enforcement",
    },
  ],
  coordination: [
    { name: "oma-brainstorm", desc: "Design-first ideation before planning" },
    { name: "oma-pm", desc: "Product manager - task decomposition" },
    { name: "oma-qa", desc: "QA - OWASP, Lighthouse, WCAG" },
    { name: "oma-coordination", desc: "Manual multi-agent orchestration" },
    { name: "oma-orchestrator", desc: "Automated parallel CLI execution" },
  ],
  utility: [
    { name: "oma-debug", desc: "Bug fixing specialist" },
    {
      name: "oma-scm",
      desc: "SCM — branching, merges, worktrees, baselines, audit; Conventional Commits",
    },
    { name: "oma-translator", desc: "Context-aware multilingual translation" },
    {
      name: "oma-pdf",
      desc: "PDF to Markdown conversion via opendataloader-pdf",
    },
  ],
  infrastructure: [
    {
      name: "oma-tf-infra",
      desc: "Multi-cloud infrastructure with Terraform - AWS, GCP, Azure, OCI support",
    },
    {
      name: "oma-dev-workflow",
      desc: "Monorepo developer workflows - mise tasks, git hooks, CI/CD, release automation",
    },
  ],
};

export const PRESETS: Record<string, string[]> = {
  fullstack: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-design",
    "oma-frontend",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
    "oma-tf-infra",
    "oma-dev-workflow",
  ],
  frontend: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-design",
    "oma-frontend",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
  ],
  backend: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
    "oma-dev-workflow",
  ],
  mobile: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-mobile",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
  ],
  devops: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-tf-infra",
    "oma-dev-workflow",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
  ],
  all: [
    ...SKILLS.domain,
    ...SKILLS.design,
    ...SKILLS.coordination,
    ...SKILLS.utility,
    ...SKILLS.infrastructure,
  ].map((s) => s.name),
};
