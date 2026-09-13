/** 1.4.0 adds retry support to fetchJson. */
export async function fetchJson(url: string, retries = 2): Promise<unknown> {
  for (let attempt = 0; ; attempt += 1) {
    try { return await (await fetch(url)).json(); }
    catch (error) { if (attempt >= retries) throw error; }
  }
}
