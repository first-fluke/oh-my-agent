/** Domain selections shared by CLI presets and native plugin emission. */
export const DOMAIN_PRESETS = {
  frontend: {
    description:
      "Frontend implementation, interface design, review, and debugging",
    skills: [
      "oma-architecture",
      "oma-brainstorm",
      "oma-design",
      "oma-frontend",
      "oma-pm",
      "oma-qa",
      "oma-debug",
      "oma-scm",
    ],
    agents: [
      "architecture-reviewer",
      "frontend-engineer",
      "pm-planner",
      "qa-reviewer",
      "debug-investigator",
    ],
  },
  security: {
    description: "Security scans, source review, and verified remediation",
    skills: [
      "oma-security",
      "oma-architecture",
      "oma-qa",
      "oma-debug",
      "oma-refactor",
      "oma-scm",
    ],
    agents: [
      "architecture-reviewer",
      "qa-reviewer",
      "debug-investigator",
      "refactor-engineer",
    ],
  },
  research: {
    description:
      "Literature search, market research, document extraction, and academic writing",
    skills: [
      "oma-scholar",
      "oma-market",
      "oma-pdf",
      "oma-hwp",
      "oma-academic-writing",
      "oma-search",
      "oma-translation",
      "oma-scm",
    ],
    agents: ["research-explorer"],
  },
} as const;

export type DomainPreset = keyof typeof DOMAIN_PRESETS;
