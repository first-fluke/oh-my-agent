import https from "node:https";
import axios from "axios";

/**
 * Shared axios instance with IPv4-only agent.
 *
 * Node.js v24 enables Happy Eyeballs (autoSelectFamily) by default,
 * which tries IPv4 and IPv6 simultaneously. On networks where IPv6 is
 * unreachable, this causes all connections — including IPv4 — to time out.
 *
 * Forcing `family: 4` on the https agent bypasses the issue.
 */
export const http = axios.create({
  httpsAgent: new https.Agent({ family: 4 }),
});

export const { isAxiosError } = axios;
