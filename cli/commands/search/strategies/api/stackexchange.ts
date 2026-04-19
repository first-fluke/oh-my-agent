import type {
  FetchContext,
  FetchResult,
  PlatformHandler,
} from "../../types.js";
import { apiFetch, invalidInputResult } from "./helpers.js";

const SE_HOST_TO_SITE: Record<string, string> = {
  "stackoverflow.com": "stackoverflow",
  "serverfault.com": "serverfault",
  "superuser.com": "superuser",
  "askubuntu.com": "askubuntu",
  "mathoverflow.net": "mathoverflow.net",
  "stackapps.com": "stackapps",
};

function isStackExchange(host: string): boolean {
  if (host in SE_HOST_TO_SITE) return true;
  if (host.endsWith(".stackexchange.com")) return true;
  if (host.endsWith(".meta.stackexchange.com")) return true;
  return host === "meta.stackoverflow.com";
}

function resolveSite(host: string): string {
  if (host in SE_HOST_TO_SITE) {
    const site = SE_HOST_TO_SITE[host];
    if (site) return site;
  }
  if (host === "meta.stackoverflow.com") return "meta.stackoverflow";
  if (host.endsWith(".meta.stackexchange.com")) {
    return `meta.${host.replace(".meta.stackexchange.com", "")}`;
  }
  return host.replace(".stackexchange.com", "");
}

export const stackExchange: PlatformHandler = {
  id: "stackexchange",
  match(url) {
    return isStackExchange(url.hostname);
  },
  async fetch(url, ctx) {
    const questionMatch = url.pathname.match(/\/questions\/(\d+)/);
    if (!questionMatch) {
      return invalidInputResult({
        url: url.toString(),
        platform: "stackexchange",
        reason: "Stack Exchange URL must contain /questions/{id}",
      });
    }
    const site = resolveSite(url.hostname);
    const id = questionMatch[1];
    const apiUrl = new URL(`https://api.stackexchange.com/2.3/questions/${id}`);
    apiUrl.searchParams.set("site", site);
    apiUrl.searchParams.set("filter", "withbody");
    return apiFetch({
      platform: "stackexchange",
      url,
      fetchUrl: apiUrl.toString(),
      ctx,
      expectJson: true,
    });
  },
  async keywordSearch(query: string, ctx: FetchContext): Promise<FetchResult> {
    const apiUrl = new URL("https://api.stackexchange.com/2.3/search");
    apiUrl.searchParams.set("order", "desc");
    apiUrl.searchParams.set("sort", "votes");
    apiUrl.searchParams.set("intitle", query);
    apiUrl.searchParams.set("site", "stackoverflow");
    return apiFetch({
      platform: "stackexchange",
      url: apiUrl,
      fetchUrl: apiUrl.toString(),
      ctx,
      expectJson: true,
    });
  },
};
