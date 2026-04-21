import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

const config: Config = {
  title: "oh-my-agent",
  tagline:
    "Multi-agent orchestration with skill routing, parallel execution, and Serena memory-driven coordination.",
  favicon: "icons/android/android-launchericon-48-48.png",

  url: "https://first-fluke.github.io",
  baseUrl: "/oh-my-agent/",
  trailingSlash: true,

  organizationName: "first-fluke",
  projectName: "oh-my-agent",

  onBrokenLinks: "throw",
  markdown: {
    format: "md",
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: [
      "en",
      "ko",
      "ja",
      "zh",
      "es",
      "fr",
      "de",
      "pt",
      "ru",
      "vi",
      "nl",
      "pl",
    ],
    localeConfigs: {
      en: { label: "English" },
      ko: { label: "한국어" },
      ja: { label: "日本語" },
      zh: { label: "中文" },
      es: { label: "Español" },
      fr: { label: "Français" },
      de: { label: "Deutsch" },
      pt: { label: "Português" },
      ru: { label: "Русский" },
      vi: { label: "Tiếng Việt" },
      nl: { label: "Nederlands" },
      pl: { label: "Polski" },
    },
  },

  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        language: ["en"],
        indexBlog: false,
        docsRouteBasePath: "/docs",
      },
    ],
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/first-fluke/oh-my-agent/tree/main/web/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "icons/android/android-launchericon-512-512.png",
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "oh-my-agent",
      logo: {
        alt: "oh-my-agent logo",
        src: "icons/android/android-launchericon-192-192.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://github.com/sponsors/first-fluke",
          label: "Sponsor",
          position: "right",
        },
        {
          href: "https://github.com/first-fluke/oh-my-agent",
          label: "GitHub",
          position: "right",
        },
        {
          type: "localeDropdown",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Introduction",
              to: "/docs/getting-started/introduction",
            },
            {
              label: "Installation",
              to: "/docs/getting-started/installation",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/first-fluke/oh-my-agent",
            },
            {
              label: "Sponsor",
              href: "https://github.com/sponsors/first-fluke",
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} oh-my-agent contributors.`,
    },
    prism: {
      theme: require("prism-react-renderer").themes.github,
      darkTheme: require("prism-react-renderer").themes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
