import http_ from "node:http";
import https from "node:https";
import axios from "axios";

/**
 * Shared axios instance with IPv4-only, keep-alive agents.
 *
 * Node.js v24 enables Happy Eyeballs (autoSelectFamily) by default, which
 * tries IPv4 and IPv6 simultaneously. On networks where IPv6 is unreachable,
 * this causes all connections — including IPv4 — to time out. Forcing
 * `family: 4` on the agent bypasses the issue.
 *
 * `keepAlive: true` reuses TCP/TLS connections per host. For doc verification
 * scenarios (hundreds of URLs hitting a small set of hosts like github.com,
 * mdn.org, npmjs.com), this halves URL phase latency by skipping handshake
 * and TLS renegotiation on every request.
 *
 * `maxSockets` caps concurrent connections per host to stay polite under
 * burst load while still benefitting from p-map(concurrency: 24) at the
 * caller level.
 */
const agentOpts = {
  family: 4 as const,
  keepAlive: true,
  maxSockets: 24,
};

export const http = axios.create({
  httpAgent: new http_.Agent(agentOpts),
  httpsAgent: new https.Agent(agentOpts),
});

export const { isAxiosError } = axios;
