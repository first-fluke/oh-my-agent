import type { PlatformHandler } from "../../types.js";
import { apiFetch, invalidInputResult } from "./helpers.js";

/**
 * npm — `https://registry.npmjs.org/{package}` returns JSON manifest.
 */
const NPM_HOSTS = new Set(["www.npmjs.com", "npmjs.com"]);

export const npmRegistry: PlatformHandler = {
  id: "npm",
  match(url) {
    return NPM_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const match = url.pathname.match(/^\/package\/(@[^/]+\/[^/]+|[^/]+)/);
    if (!match) {
      return invalidInputResult({
        url: url.toString(),
        platform: "npm",
        reason: "npm URL must be /package/{name}",
      });
    }
    const pkg = match[1];
    const apiUrl = `https://registry.npmjs.org/${pkg}`;
    return apiFetch({
      platform: "npm",
      url,
      fetchUrl: apiUrl,
      ctx,
      expectJson: true,
    });
  },
};

/**
 * PyPI — `https://pypi.org/pypi/{package}/json`.
 */
const PYPI_HOSTS = new Set(["pypi.org", "www.pypi.org"]);

export const pypiRegistry: PlatformHandler = {
  id: "pypi",
  match(url) {
    return PYPI_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const match = url.pathname.match(/^\/project\/([^/]+)/);
    if (!match) {
      return invalidInputResult({
        url: url.toString(),
        platform: "pypi",
        reason: "PyPI URL must be /project/{name}",
      });
    }
    const apiUrl = `https://pypi.org/pypi/${match[1]}/json`;
    return apiFetch({
      platform: "pypi",
      url,
      fetchUrl: apiUrl,
      ctx,
      expectJson: true,
    });
  },
};
