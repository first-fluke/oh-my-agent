import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsShell } from "@/components/docs/docs-shell";
import {
  DEFAULT_LANG,
  getAllDocParams,
  getDefaultDocPath,
  isDocGroupId,
  isLang,
  LANGUAGES,
} from "@/lib/docs";
import { getDocPage, getNavigation } from "@/lib/docs-content";

interface DocPageProps {
  params: Promise<{
    lang: string;
    slug?: string[];
  }>;
}

export function generateStaticParams() {
  return [
    ...getAllDocParams(),
    ...LANGUAGES.map((lang) => ({ lang, slug: [] as string[] })),
  ];
}

export async function generateMetadata({
  params,
}: DocPageProps): Promise<Metadata> {
  const { lang: rawLang, slug = [] } = await params;
  const lang = isLang(rawLang) ? rawLang : DEFAULT_LANG;
  const defaultPath = getDefaultDocPath();

  const page =
    slug.length === 2
      ? isDocGroupId(slug[0])
        ? await getDocPage(lang, slug[0], slug[1])
        : null
      : await getDocPage(lang, defaultPath.group, defaultPath.slug);

  if (!page) {
    return {
      title: "oh-my-agent docs",
    };
  }

  return {
    title: `${page.title} | oh-my-agent docs`,
    description: page.description,
  };
}

export default async function LocalizedDocsPage({ params }: DocPageProps) {
  const { lang: rawLang, slug = [] } = await params;
  const defaultPath = getDefaultDocPath();

  if (!isLang(rawLang)) {
    notFound();
  }

  const lang = rawLang;

  const page =
    slug.length === 0
      ? await getDocPage(lang, defaultPath.group, defaultPath.slug)
      : slug.length === 2
        ? isDocGroupId(slug[0])
          ? await getDocPage(lang, slug[0], slug[1])
          : null
        : null;

  if (!page) {
    notFound();
  }

  const navigation = await getNavigation(lang);

  return (
    <DocsShell
      lang={lang}
      currentGroup={page.group}
      currentSlug={page.slug}
      markdown={page.markdown}
      navigation={navigation}
      headings={page.headings}
    />
  );
}
