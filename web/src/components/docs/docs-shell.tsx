"use client";

import { Github, HeartHandshake, Menu } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

import { DocsArticle } from "@/components/docs/docs-article";
import { LanguageSwitcher } from "@/components/docs/language-switcher";
import { Search } from "@/components/docs/search";
import { Toc } from "@/components/docs/toc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  type DocGroupId,
  getHref,
  type HeadingItem,
  type Lang,
  type NavGroup,
  TOP_LINKS,
} from "@/lib/docs";
import { cn } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface DocsShellProps {
  lang: Lang;
  currentGroup: DocGroupId;
  currentSlug: string;
  markdown: string;
  navigation: NavGroup[];
  headings: HeadingItem[];
}

function SidebarNav({
  lang,
  currentGroup,
  currentSlug,
  navigation,
  onNavigate,
}: {
  lang: Lang;
  currentGroup: DocGroupId;
  currentSlug: string;
  navigation: NavGroup[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-5">
      {navigation.map((group) => (
        <section key={group.id}>
          <Badge
            variant="secondary"
            className="mb-2 border-transparent bg-[#B23A34] text-zinc-50"
          >
            {group.title}
          </Badge>
          <div className="space-y-1">
            {group.pages.map((page) => {
              const active =
                group.id === currentGroup && page.slug === currentSlug;
              return (
                <Link
                  key={`${group.id}/${page.slug}`}
                  href={getHref(lang, group.id, page.slug)}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-white/10 text-zinc-50 ring-1 ring-white/15"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                  )}
                >
                  {page.title}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="overflow-hidden rounded-lg shadow-[0_0_28px_rgba(178,58,52,0.45)]">
        <Image
          src={`${basePath}/icons/android/android-launchericon-192-192.png`}
          alt="oh-my-agent icon"
          width={36}
          height={36}
          className="size-9"
          priority
        />
      </span>
      <span className="text-base font-semibold tracking-tight text-zinc-50">
        oh-my-agent
      </span>
    </Link>
  );
}

function Header({
  lang,
  currentGroup,
  currentSlug,
  navigation,
}: {
  lang: Lang;
  currentGroup: DocGroupId;
  currentSlug: string;
  navigation: NavGroup[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 lg:px-6">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-200">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-80 border-white/10 bg-zinc-950 p-0"
            >
              <div className="border-b border-white/10 p-4">
                <Brand />
              </div>
              <ScrollArea className="h-[calc(100vh-4rem)] px-4 py-5">
                <SidebarNav
                  lang={lang}
                  currentGroup={currentGroup}
                  currentSlug={currentSlug}
                  navigation={navigation}
                />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        <Brand />

        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="hidden lg:block lg:max-w-xs lg:flex-1">
            <div className="flex justify-end">
              <Search lang={lang} />
            </div>
          </div>
          <div className="lg:hidden">
            <Search lang={lang} />
          </div>
        </div>

        <NavigationMenu className="ml-2">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:text-zinc-50"
                >
                  <a href={TOP_LINKS.sponsor} target="_blank" rel="noreferrer">
                    <HeartHandshake className="size-4" />
                    <span className="hidden sm:inline">Sponsor</span>
                  </a>
                </Button>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:text-zinc-50"
                >
                  <a href={TOP_LINKS.github} target="_blank" rel="noreferrer">
                    <Github className="size-4" />
                    <span className="hidden sm:inline">GitHub</span>
                  </a>
                </Button>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <LanguageSwitcher lang={lang} group={currentGroup} slug={currentSlug} />
      </div>
    </header>
  );
}

export function DocsShell({
  lang,
  currentGroup,
  currentSlug,
  markdown,
  navigation,
  headings,
}: DocsShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute -top-36 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#B23A34]/18 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(178,58,52,0.1),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(143,48,43,0.1),transparent_35%)]" />
      </div>

      <Header
        lang={lang}
        currentGroup={currentGroup}
        currentSlug={currentSlug}
        navigation={navigation}
      />

      <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_250px] lg:px-6">
        <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] lg:block">
          <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <ScrollArea className="h-full pr-3">
              <SidebarNav
                lang={lang}
                currentGroup={currentGroup}
                currentSlug={currentSlug}
                navigation={navigation}
              />
            </ScrollArea>
          </div>
        </aside>

        <main className="min-w-0">
          <section className="rounded-2xl border border-white/10 bg-black/25 p-6 lg:p-8">
            <DocsArticle markdown={markdown} />
          </section>
        </main>

        <Toc
          headings={headings}
          title={lang === "ko" ? "목차" : "On this page"}
        />
      </div>
    </div>
  );
}
