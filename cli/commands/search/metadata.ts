import { httpFetch } from "./http.js";
import type { ExtractedMetadata, FetchContext, FetchResult } from "./types.js";

/**
 * OGP / JSON-LD / Schema.org metadata extraction. Dependency-free
 * regex parse keeps this cheap when the caller only needs
 * title / description / structured data.
 */

const META_TAG = /<meta\s+([^>]+)>/gi;
const ATTR = /(\w[\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
const JSON_LD_SCRIPT =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const TITLE_TAG = /<title[^>]*>([\s\S]*?)<\/title>/i;
const LINK_TAG = /<link\s+([^>]+)>/gi;

function parseAttrs(attrText: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR.lastIndex = 0;
  let match: RegExpExecArray | null = ATTR.exec(attrText);
  while (match !== null) {
    const key = match[1]?.toLowerCase();
    if (!key) {
      match = ATTR.exec(attrText);
      continue;
    }
    attrs[key] = match[2] ?? match[3] ?? match[4] ?? "";
    match = ATTR.exec(attrText);
  }
  return attrs;
}

export function parseMetadata(html: string): ExtractedMetadata {
  const ogp: Record<string, string> = {};
  const alternate: ExtractedMetadata["alternate"] = [];
  const jsonLd: unknown[] = [];
  let description: string | undefined;

  META_TAG.lastIndex = 0;
  let metaMatch: RegExpExecArray | null = META_TAG.exec(html);
  while (metaMatch !== null) {
    const body = metaMatch[1];
    if (!body) {
      metaMatch = META_TAG.exec(html);
      continue;
    }
    const attrs = parseAttrs(body);
    const prop = attrs.property ?? "";
    const name = attrs.name ?? "";
    const content = attrs.content ?? "";
    if (prop.startsWith("og:")) {
      ogp[prop.slice(3)] = content;
    }
    if (name === "description" && !description) {
      description = content;
    }
    if (name === "twitter:description" && !description) {
      description = content;
    }
    metaMatch = META_TAG.exec(html);
  }

  LINK_TAG.lastIndex = 0;
  let linkMatch: RegExpExecArray | null = LINK_TAG.exec(html);
  while (linkMatch !== null) {
    const body = linkMatch[1];
    if (body) {
      const attrs = parseAttrs(body);
      if (
        attrs.rel === "alternate" &&
        attrs.type &&
        (attrs.type.includes("rss") || attrs.type.includes("atom"))
      ) {
        alternate.push({
          type: attrs.type,
          href: attrs.href ?? "",
          title: attrs.title,
        });
      }
    }
    linkMatch = LINK_TAG.exec(html);
  }

  JSON_LD_SCRIPT.lastIndex = 0;
  let jsonMatch: RegExpExecArray | null = JSON_LD_SCRIPT.exec(html);
  while (jsonMatch !== null) {
    const raw = jsonMatch[1];
    if (raw) {
      try {
        jsonLd.push(JSON.parse(raw));
      } catch {
        // skip invalid JSON-LD
      }
    }
    jsonMatch = JSON_LD_SCRIPT.exec(html);
  }

  const titleMatch = TITLE_TAG.exec(html);
  const title = titleMatch?.[1]?.trim();

  const metadata: ExtractedMetadata = {};
  if (Object.keys(ogp).length > 0) metadata.ogp = ogp;
  if (jsonLd.length > 0) metadata.jsonLd = jsonLd;
  if (description) metadata.description = description;
  if (title) metadata.title = title;
  if (alternate.length > 0) metadata.alternate = alternate;
  return metadata;
}

export async function metadataFromUrl(
  url: URL,
  ctx: FetchContext,
): Promise<FetchResult> {
  try {
    const resp = await httpFetch(url.toString(), {
      timeoutMs: ctx.timeoutMs,
      locale: ctx.locale,
      signal: ctx.signal,
    });
    const metadata = parseMetadata(resp.text);
    return {
      url: url.toString(),
      status: resp.ok ? "ok" : "error",
      strategy: "probe",
      platform: "metadata",
      httpStatus: resp.status,
      content: resp.text,
      contentType: resp.headers.get("content-type") ?? undefined,
      elapsedMs: resp.elapsedMs,
      signals: [],
      metadata,
    };
  } catch (err) {
    return {
      url: url.toString(),
      status: "error",
      strategy: "probe",
      platform: "metadata",
      content: "",
      elapsedMs: 0,
      signals: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
