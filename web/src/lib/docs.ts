export type Lang =
  | "en"
  | "ko"
  | "vi"
  | "ja"
  | "zh"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ru"
  | "nl"
  | "pl";

export const LANGUAGES: Lang[] = [
  "en",
  "ko",
  "vi",
  "ja",
  "zh",
  "es",
  "fr",
  "de",
  "pt",
  "ru",
  "nl",
  "pl",
];
export const DEFAULT_LANG: Lang = "en";

export type DocGroupId =
  | "getting-started"
  | "core-concepts"
  | "guide"
  | "cli-interfaces";

export interface DocPath {
  group: DocGroupId;
  slug: string;
}

export interface NavGroup {
  id: DocGroupId;
  title: string;
  pages: Array<{
    slug: string;
    title: string;
    description: string;
  }>;
}

export interface HeadingItem {
  depth: number;
  text: string;
  id: string;
}

export const GROUP_TITLES: Record<DocGroupId, Record<Lang, string>> = {
  "getting-started": {
    en: "Getting Started",
    ko: "시작하기",
    vi: "Bắt đầu",
    ja: "はじめに",
    zh: "快速开始",
    es: "Primeros pasos",
    fr: "Démarrage",
    de: "Erste Schritte",
    pt: "Introdução",
    ru: "Начало работы",
    nl: "Aan de slag",
    pl: "Pierwsze kroki",
  },
  "core-concepts": {
    en: "Core Concepts",
    ko: "핵심 개념",
    vi: "Khái niệm cốt lõi",
    ja: "コアコンセプト",
    zh: "核心概念",
    es: "Conceptos clave",
    fr: "Concepts clés",
    de: "Kernkonzepte",
    pt: "Conceitos principais",
    ru: "Основные концепции",
    nl: "Kernconcepten",
    pl: "Kluczowe koncepcje",
  },
  guide: {
    en: "Guide",
    ko: "가이드",
    vi: "Hướng dẫn",
    ja: "ガイド",
    zh: "指南",
    es: "Guía",
    fr: "Guide",
    de: "Anleitung",
    pt: "Guia",
    ru: "Руководство",
    nl: "Gids",
    pl: "Przewodnik",
  },
  "cli-interfaces": {
    en: "CLI Interfaces",
    ko: "CLI 인터페이스",
    vi: "Giao diện CLI",
    ja: "CLIインターフェース",
    zh: "CLI 接口",
    es: "Interfaces CLI",
    fr: "Interfaces CLI",
    de: "CLI-Schnittstellen",
    pt: "Interfaces CLI",
    ru: "Интерфейсы CLI",
    nl: "CLI-interfaces",
    pl: "Interfejsy CLI",
  },
};

export const DOC_ORDER: Record<DocGroupId, string[]> = {
  "getting-started": ["introduction", "installation"],
  "core-concepts": [
    "agents",
    "skills",
    "workflows",
    "parallel-execution",
    "project-structure",
  ],
  guide: [
    "usage",
    "integration",
    "central-registry",
    "single-skill",
    "multi-agent-project",
    "bug-fixing",
    "dashboard-monitoring",
  ],
  "cli-interfaces": ["commands", "options"],
};

export function isLang(value: string): value is Lang {
  return LANGUAGES.includes(value as Lang);
}

export function isDocGroupId(value: string): value is DocGroupId {
  return (Object.keys(DOC_ORDER) as DocGroupId[]).includes(value as DocGroupId);
}

export function getDefaultDocPath(): DocPath {
  return {
    group: "getting-started",
    slug: "introduction",
  };
}

export function getAllDocParams() {
  return LANGUAGES.flatMap((lang) =>
    (Object.keys(DOC_ORDER) as DocGroupId[]).flatMap((group) =>
      DOC_ORDER[group].map((slug) => ({ lang, slug: [group, slug] })),
    ),
  );
}

export function getHref(lang: Lang, group: DocGroupId, slug: string) {
  return `/${lang}/${group}/${slug}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/g, "")
    .replace(/\s+/g, "-");
}

export const TOP_LINKS = {
  sponsor: "https://github.com/sponsors/first-fluke",
  github: "https://github.com/first-fluke/oh-my-agent",
};
