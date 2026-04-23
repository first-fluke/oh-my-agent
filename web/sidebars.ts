import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "category",
      label: "Getting Started",
      items: ["getting-started/introduction", "getting-started/installation"],
    },
    {
      type: "category",
      label: "Core Concepts",
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
      label: "Guide",
      items: [
        "guide/usage",
        "guide/integration",
        "guide/single-skill",
        "guide/multi-agent-project",
        "guide/bug-fixing",
        "guide/dashboard-monitoring",
        "guide/automated-updates",
        "guide/per-agent-models",
      ],
    },
    {
      type: "category",
      label: "CLI Interfaces",
      items: ["cli-interfaces/commands", "cli-interfaces/options"],
    },
  ],
};

export default sidebars;
