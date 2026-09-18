import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: [
        "getting-started/introduction",
        "getting-started/why-oh-my-agent",
        "getting-started/installation",
        "getting-started/quick-start",
        "getting-started/important-defaults",
      ],
    },
    {
      type: "category",
      label: "Core Concepts",
      collapsed: true,
      items: [
        "core-concepts/agents",
        "core-concepts/skills",
        "core-concepts/workflows",
        "core-concepts/parallel-execution",
        "core-concepts/project-structure",
      ],
    },
    {
      type: "category",
      label: "Working with Agents",
      collapsed: true,
      items: [
        "guide/usage",
        "guide/single-skill",
        "guide/multi-agent-project",
        "guide/bug-fixing",
        "guide/agent-results-and-resume",
        "guide/dashboard-monitoring",
        "guide/troubleshooting",
      ],
    },
    {
      type: "category",
      label: "Setup and Configuration",
      collapsed: true,
      items: [
        "guide/integration",
        "guide/global-install",
        "guide/codex-hook-trust",
        "guide/oma-config-semantics",
        "guide/per-agent-models",
        "guide/automated-updates",
      ],
    },
    {
      type: "category",
      label: "Automation and Evaluation",
      collapsed: true,
      items: [
        "guide/scheduled-agents",
        "guide/harness-eval",
        "guide/harness-incidents",
        "guide/harness-evolution",
        "guide/skill-eval",
        "guide/skill-opt",
      ],
    },
    {
      type: "category",
      label: "Content and Research",
      collapsed: true,
      items: [
        "guide/content-and-research",
        "guide/image-generation",
        "guide/video-generation",
        "guide/code-explainer",
        "guide/diagram-engine",
        "guide/market-research",
      ],
    },
    {
      type: "category",
      label: "Reference",
      collapsed: true,
      items: [
        "guide/configuration-reference",
        "cli-interfaces/commands",
        "cli-interfaces/options",
        "getting-started/benchmarks",
      ],
    },
  ],
};

export default sidebars;
