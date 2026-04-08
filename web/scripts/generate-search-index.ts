#!/usr/bin/env tsx

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, "..", "content");
const OUTPUT_FILE = path.join(__dirname, "..", "public", "search-index.json");

interface SearchDocument {
  id: string;
  lang: string;
  group: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  href: string;
}

interface SearchIndex {
  documents: SearchDocument[];
  generatedAt: string;
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#+\s+/gm, " ")
    .replace(/(\*\*|__|\*|_)/g, " ")
    .replace(/^>\s*/gm, " ")
    .replace(/^[-*+]\s+/gm, " ")
    .replace(/^\d+\.\s+/gm, " ")
    .replace(/^[-*]{3,}$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractContent(body: string): string {
  return stripMarkdown(body).slice(0, 5000);
}

async function generateSearchIndex(): Promise<SearchIndex> {
  const documents: SearchDocument[] = [];
  const langs = ["en", "ko", "vi", "ja", "zh", "es", "fr", "de", "pt", "ru", "nl", "pl"];
  
  for (const lang of langs) {
    const langDir = path.join(CONTENT_DIR, lang);
    
    try {
      const entries = await fs.readdir(langDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const groupDir = path.join(langDir, entry.name);
        const files = await fs.readdir(groupDir);
        
        for (const file of files) {
          if (!file.endsWith(".md")) continue;
          
          const filePath = path.join(groupDir, file);
          const rawContent = await fs.readFile(filePath, "utf-8");
          const { data, content: body } = matter(rawContent);
          
          documents.push({
            id: `${lang}/${entry.name}/${file.replace(".md", "")}`,
            lang,
            group: entry.name,
            slug: file.replace(".md", ""),
            title: data.title || file.replace(".md", ""),
            description: data.description || "",
            content: extractContent(body),
            href: `/${lang}/${entry.name}/${file.replace(".md", "")}`,
          });
        }
      }
    } catch {
      // Directory might not exist, skip
    }
  }

  return {
    documents,
    generatedAt: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  console.log("🔍 Generating search index...");
  
  const index = await generateSearchIndex();
  
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2));
  
  console.log(`✅ Search index generated with ${index.documents.length} documents`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("❌ Failed to generate search index:", error);
  process.exit(1);
});
