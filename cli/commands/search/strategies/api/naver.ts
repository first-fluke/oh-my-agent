import { USER_AGENTS } from "../../http.js";
import type { PlatformHandler } from "../../types.js";
import { apiFetch, invalidInputResult } from "./helpers.js";

/**
 * Naver — each subdomain needs a different access tactic:
 *   - blog.naver.com → mobile URL (m.blog.naver.com) + iPhone UA
 *   - news.naver.com → probe strategy (Jina Reader handles it)
 *   - finance.naver.com → JSON API (api.finance.naver.com/siseJson.naver)
 *   - search.naver.com → impersonate strategy with curl_cffi
 */
const BLOG_HOSTS = new Set(["blog.naver.com", "m.blog.naver.com"]);
const FINANCE_HOSTS = new Set(["finance.naver.com"]);

function toMobileBlogUrl(url: URL): string | null {
  const params = new URLSearchParams(url.search);
  let blogId = params.get("blogId") ?? "";
  let logNo = params.get("logNo") ?? "";

  if (!blogId || !logNo) {
    const match = url.pathname.match(/^\/([^/]+)\/(\d+)/);
    if (match) {
      blogId = match[1] ?? "";
      logNo = match[2] ?? "";
    }
  }
  if (!blogId || !logNo) return null;
  return `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
}

export const naverBlog: PlatformHandler = {
  id: "naver-blog",
  match(url) {
    return BLOG_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const mobileUrl = toMobileBlogUrl(url);
    if (!mobileUrl) {
      return invalidInputResult({
        url: url.toString(),
        platform: "naver-blog",
        reason: "Cannot derive blogId/logNo from Naver blog URL",
      });
    }
    return apiFetch({
      platform: "naver-blog",
      url,
      fetchUrl: mobileUrl,
      headers: {
        "User-Agent": USER_AGENTS.mobileSafari,
        "Accept-Language": "ko-KR,ko;q=0.9",
        Referer: "https://m.naver.com/",
      },
      ctx,
    });
  },
};

export const naverFinance: PlatformHandler = {
  id: "naver-finance",
  match(url) {
    return FINANCE_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const code = new URLSearchParams(url.search).get("code");
    if (!code || !/^\d+$/.test(code)) {
      return invalidInputResult({
        url: url.toString(),
        platform: "naver-finance",
        reason: "Naver finance URL must have ?code={digits}",
      });
    }
    const apiUrl = `https://api.finance.naver.com/siseJson.naver?symbol=${code}&requestType=1&count=10&timeframe=day`;
    return apiFetch({
      platform: "naver-finance",
      url,
      fetchUrl: apiUrl,
      headers: {
        "Accept-Language": "ko-KR,ko;q=0.9",
        Referer: "https://finance.naver.com/",
      },
      ctx,
    });
  },
};
