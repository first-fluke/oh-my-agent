# L4 Transport Layer Observability

> **DISAMBIGUATION; read before proceeding.**
>
> This file covers **observing the OSI Layer 4 (TCP/UDP/QUIC) transport in your application systems**; 
> retransmits, RTT, connection lifecycle, eBPF-based socket instrumentation, and QUIC/HTTP3 semantics.
>
> This file is **NOT** about the observability pipeline transport:
> - `../transport/udp-statsd-mtu.md`; StatsD payload sizing over UDP
> - `../transport/otlp-grpc-vs-http.md`; OTLP exporter protocol choice
> - `../transport/collector-topology.md`; OTel Collector deployment topologies
> - `../transport/sampling-recipes.md`; tail/head sampling strategies
>
> The word "transport" is overloaded. When a cross-reference says `transport/`, it refers to the
> observability pipeline. When it says "L4", "TCP/UDP/QUIC", or this filename, it refers to this file.

---

## 1. Scope

OSI Layer 4 observability for production systems: TCP, UDP, QUIC/HTTP3, eBPF auto-instrumentation,
and connection lifecycle. Out of scope: L5 session (gRPC/WebSocket → L7), L6 full TLS inspection
(use Wireshark/vendor tooling), and security-focused eBPF policy enforcement (Cilium Tetragon). Falco
runtime events as an audit source are covered in `../signals/audit.md`; security scanning and
penetration testing hand off to `oma-security`.
See the OSI boundary decision in `../standards.md`.

---

## 2. L4 Semconv (OTel)

Source: <https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/>

| Attribute | Values | Stability | Notes |
|-----------|--------|-----------|-------|
| `network.transport` | `tcp`, `udp`, `unix`, `pipe`, `quic` | **Stable** | Set on spans and metrics describing a socket |
| `network.protocol.name` | `http`, `grpc`, `amqp`, … | **Stable** | Application protocol over the transport |
| `network.protocol.version` | `1.1`, `2`, `3` | **Stable** | `3` = HTTP/3 over QUIC |
| `network.peer.address` | IP or hostname | **Stable** | Apply the IP-address handling rules in `../signals/privacy.md` before retention |
| `network.connection.state` | `established`, `close_wait`, … | **Release Candidate** | Do not build SLOs against this until it is Stable |
| `network.connection.type` | `wifi`, `cell`, … | **Development** | Mobile/RUM only; flag in production use |

Non-Stable `network.connection.*` attributes may change; confirm the current tier in the registry,
use them in test environments first, and tolerate breaking changes before promoting them to
production dashboards.

---

## 3. TCP Observability

### 3.1 Key Metrics

OTel defines no host-level TCP retransmit or RTT metric. Use one of these sources; names are quoted
from each source and are not interchangeable.

| Source | Metric | Measures |
|--------|--------|----------|
| Prometheus node_exporter (`netstat`) | `node_netstat_Tcp_RetransSegs` / `node_netstat_Tcp_OutSegs` | Retransmitted vs sent segments; ratio spike = congestion or loss |
| Prometheus node_exporter (`netstat`) | `node_netstat_Tcp_CurrEstab` | Established connections; growth = pool leak |
| Prometheus node_exporter (`netstat`) | `node_netstat_TcpExt_ListenOverflows`, `node_netstat_TcpExt_ListenDrops`, `node_netstat_TcpExt_SyncookiesSent` | Accept/SYN queue overflow; SYN flood or backlog too small |
| Prometheus node_exporter (`sockstat`) | `node_sockstat_TCP_tw`, `node_sockstat_TCP_inuse` | TIME_WAIT and in-use sockets; high under short-lived connection churn |
| OTel hostmetrics `network` scraper | `system.network.connections` (attributes `protocol`, `state`) | Connection count per TCP state, including `CLOSE_WAIT` and `TIME_WAIT` |
| OpenTelemetry eBPF Instrumentation (OBI) | `obi.stat.tcp.rtt` (histogram, seconds), `obi.stat.tcp.retransmits`, `obi.stat.tcp.failed.connections`, `obi.stat.tcp.resets` | Per-connection RTT, retransmits, and failures with source/destination workload attributes (Development stability) |

```promql
# Retransmit ratio per node
rate(node_netstat_Tcp_RetransSegs[5m]) / rate(node_netstat_Tcp_OutSegs[5m])

# Accept queue overflow
rate(node_netstat_TcpExt_ListenOverflows[5m]) > 0

# TIME_WAIT pressure alert
node_sockstat_TCP_tw > 10000
```

### 3.2 Collection

| Method | Mechanism | Privilege |
|--------|-----------|-----------|
| node_exporter `netstat` / `sockstat` collectors | `/proc/net/netstat`, `/proc/net/snmp`, `/proc/net/sockstat` | Unprivileged read of `/proc` |
| OTel hostmetrics receiver (`network` scraper) | Per-interface I/O, errors, drops, and connection counts by state | Host `/proc` access |
| eBPF (OBI, Pixie) | Kernel probes on TCP send/retransmit paths | CAP_BPF + CAP_PERFMON (kernel ≥ 5.8) or root |

### 3.3 Common Pitfalls

**Connection pool exhaustion.** A rising established-connection count with high application latency but no TCP errors
points to pool queue saturation, not network failure. Instrument pool size, wait time, and timeouts at the
application layer; see the connection pool exhaustion pattern in `../signals/traces.md`.

**SYN cookie activation.** Non-zero `ListenOverflows` / `ListenDrops` in normal traffic means the accept
backlog (`somaxconn`, `tcp_max_syn_backlog`) is too low. Rising `SyncookiesSent` confirms the SYN queue overflowed.

**TIME_WAIT accumulation.** Short-lived HTTP/1.1 connections exhaust ephemeral ports. Remediation:
`SO_REUSEADDR`, wider `ip_local_port_range`, or HTTP/2 multiplexing.

---

## 4. UDP Observability

| Metric (node_exporter `netstat`) | `/proc/net/snmp` field | Measures |
|--------|--------|----------|
| `node_netstat_Udp_OutDatagrams`, `node_netstat_Udp_InDatagrams` | `OutDatagrams`, `InDatagrams` | Baseline throughput |
| `node_netstat_Udp_RcvbufErrors` | `RcvbufErrors` | Socket receive buffer overflow; increase `net.core.rmem_max` |
| `node_netstat_Udp_SndbufErrors` | `SndbufErrors` | Send buffer exhaustion |
| `node_netstat_Udp_NoPorts` | `NoPorts` | Drop because no listener on destination port |
| `node_netstat_Udp_InErrors` | `InErrors` | Receive errors, including checksum failures |

The OTel hostmetrics `network` scraper reports per-interface packets, errors, and drops, not these
per-protocol UDP counters; scrape node_exporter (or read `/proc/net/snmp`) for them.
Cross-ref: `../transport/udp-statsd-mtu.md` for StatsD payload sizing constraints that drive
`RcvbufErrors` in high-throughput StatsD pipelines.

---

## 5. eBPF-Based L4 Observability

eBPF instruments the Linux kernel without application code changes. Three tools are in scope.

### 5.1 Tool Comparison

| Tool | Project status | Primary signal | OTel output | Key use case |
|------|-------------|----------------|-------------|--------------|
| **OpenTelemetry eBPF Instrumentation (OBI)**; Grafana Beyla is Grafana's distribution of it | OpenTelemetry project | HTTP/gRPC/database traces and RED metrics; network flow and TCP stat metrics | OTLP natively | Zero-code auto-instrumentation; also emits `obi.stat.tcp.rtt` and `obi.network.flow.bytes` |
| **Pixie** | CNCF Sandbox | Multi-protocol traces + L4 metrics via PxL scripts | OTLP via the PxL OpenTelemetry export plugin | Scriptable cluster-wide eBPF; auto-discovers pods |
| **Parca** | Independent open source (not a CNCF project) | Continuous CPU flame graphs | pprof-compatible | Whole-cluster profiling; cross-ref `../signals/profiles.md` |

Sources: <https://github.com/open-telemetry/opentelemetry-ebpf-instrumentation>, <https://grafana.com/oss/beyla/>, <https://px.dev/>, <https://parca.dev/>

Project status changes; verify at <https://landscape.cncf.io> when it is load-bearing.

**Out of scope: Cilium Tetragon.** Security-focused runtime policy enforcement (syscall filtering, process
exec tracing) is not transport observability. Falco kernel security events feed the audit signal; see
`../signals/audit.md`.

### 5.2 Kernel and Privilege Requirements

| Requirement | Detail |
|-------------|--------|
| Kernel (OBI) | Linux ≥ 5.8 with BTF exposed; RHEL-based distributions ≥ 4.18 with eBPF backports |
| Kernel (other tools) | Check each tool's support matrix; requirements differ |
| Capabilities | CAP_BPF + CAP_PERFMON (kernel ≥ 5.8) or root on older kernels |
| GKE Autopilot | Privileged eBPF DaemonSets are restricted; use Standard node pools |
| EKS Fargate | No DaemonSet support; eBPF unavailable |
| AKS | Supported on standard node pools; verify with `uname -r` |

```bash
# Preflight check (run in initContainer or node admission); exit non-zero when unmet
uname -r                          # compare against the tool's minimum kernel
test -f /sys/kernel/btf/vmlinux   # BTF exposed
capsh --print | grep cap_bpf
```

An eBPF agent on an unsupported kernel or without the required capabilities can fail to attach while
its pod stays `Running`. Fail the preflight explicitly so the gap surfaces at deploy time. Resolve
the Helm chart name and version from the project's current docs at use time.

---

## 6. Connection Lifecycle Observability

```
LISTEN → SYN_RECEIVED → ESTABLISHED → (data transfer)
  → FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED   (active close)
  → CLOSE_WAIT → LAST_ACK → CLOSED                  (passive close)
```

| State | Observable signal | Tooling |
|-------|------------------|---------|
| SYN → ESTABLISHED | Setup latency (SYN-ACK RTT) | eBPF connect-path probes |
| ESTABLISHED idle | Keepalive probe success/failure | `ss -o` keepalive timers; resets in `node_netstat_Tcp_OutRsts` |
| FIN_WAIT / TIME_WAIT | TIME_WAIT gauge; ephemeral port pressure | `node_sockstat_TCP_tw` |
| CLOSE_WAIT growth | Server not releasing half-open connections | `system.network.connections{state="CLOSE_WAIT"}` |

**TLS handshake boundary.** TLS sits at L4/L5. `tls.*` semconv is Development tier; do not build
production SLOs on it. Use eBPF uprobes on OpenSSL/BoringSSL or vendor tooling for handshake latency.

**Keepalive tuning.** TCP keepalive interval must be shorter than the upstream LB idle timeout
(defaults: AWS ALB 60 s; AWS NLB 350 s for TCP flows; GCP external Application LB 610 s client HTTP
keepalive and a fixed 600 s backend keepalive). Mismatches cause silent connection resets.

**WebSocket and gRPC streams**; full lifecycle coverage is deferred to L7 (`../standards.md`).
Long-lived streams mitigate TIME_WAIT accumulation but introduce reconnection-storm risk on restart:
a server restart without graceful drain makes every client reconnect at once, and the SYN burst looks
like ordinary new connections. Count client reconnections and require exponential backoff with jitter.

---

## 7. QUIC / HTTP/3 Transport Semantics

QUIC (RFC 9000) is a UDP-based transport with built-in TLS 1.3, stream multiplexing, and connection
migration. HTTP/3 (RFC 9114) runs exclusively over QUIC.

### 7.1 Observability Differences from TCP

| TCP concept | QUIC equivalent | Observability impact |
|-------------|----------------|----------------------|
| 3-way SYN handshake | 1-RTT or 0-RTT | No SYN/FIN to observe; connection state is QUIC-internal |
| 5-tuple for correlation | Connection ID (opaque bytes) | Connection ID survives NAT rebinding; log it on establishment |
| TCP retransmit counters (`/proc/net/snmp`) | QUIC loss recovery (packet number gaps) | Not visible in proc; requires QUIC-aware tooling |
| TCP FIN / RST | QUIC GOAWAY / CONNECTION_CLOSE frames | Surfaced in Envoy access logs |
| HTTP/2 HOL blocking | Per-stream flow control; no HOL blocking | Stream errors do not block other streams |

### 7.2 OTel Semconv for QUIC

```
network.transport: quic
network.protocol.name: http
network.protocol.version: "3"
```

### 7.3 0-RTT Observability

0-RTT sends data before the handshake completes. Emit a span attribute or metric label
distinguishing 0-RTT from 1-RTT connections to detect replay exposure on non-idempotent endpoints.

### 7.4 Firewall and Enterprise Deployment Considerations

Enterprise networks frequently block outbound UDP 443 and UDP 8443 because legacy firewall rules assume HTTP(S) is TCP-only. QUIC (and therefore HTTP/3) rides on UDP and silently falls back to HTTP/1.1 or HTTP/2 when UDP is blocked; the fallback is invisible to application telemetry unless you instrument it.

Detect QUIC blocking:
- Emit `network.transport` attribute on client spans; compare ratio of `quic` vs `tcp` across deployment zones
- CDN access logs (Cloudflare, Fastly) expose QUIC negotiation outcome per edge
- Alert when `quic` ratio drops below baseline (for example, office network where UDP 443 is firewalled)

Action: coordinate with network security to allowlist UDP 443/8443 for validated destinations; document the fallback behavior so regressions do not silently halve transport performance.

### 7.5 Tool Support

| Tool | QUIC support |
|------|-------------|
| Envoy | HTTP/3 upstream and downstream; stats in admin API and access logs |
| Istio | Inherits Envoy's HTTP/3 support; confirm the feature status in current Istio docs; see `mesh.md` |
| OBI / Grafana Beyla | Protocol support matrix lists HTTP/1.x, HTTP/2, and gRPC; verify HTTP/3 coverage in the current support matrix before QUIC-heavy deployments |
| Cloudflare QUIC telemetry | <https://blog.cloudflare.com/tag/quic/>; public connection migration + 0-RTT metrics |

Before enabling QUIC in production, assert in staging that client spans carry
`network.transport: quic` and that the chosen L4 tooling sees the UDP flows; TCP metrics are blind to them.

---

## 8. OS-Level Integration

| Source | Signal | Cross-ref |
|--------|--------|-----------|
| systemd-journal / syslog | TCP resets, netfilter drops, NIC errors | `../signals/logs.md` |
| cgroup v2 net accounting | Per-container byte/packet counters | `../transport/collector-topology.md` |
| nf_conntrack | NAT and stateful firewall connection table size (`system.network.conntrack.count` / `.max`, optional hostmetrics metrics) | Requires `nf_conntrack` kernel module |

---

## 9. References

- OTel network attributes registry: <https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/>
- OpenTelemetry eBPF Instrumentation (support matrix, telemetry reference): <https://github.com/open-telemetry/opentelemetry-ebpf-instrumentation>
- Grafana Beyla: <https://grafana.com/oss/beyla/>
- Pixie: <https://px.dev/>
- Parca: <https://parca.dev/>
- QUIC RFC 9000: <https://www.rfc-editor.org/rfc/rfc9000>
- HTTP/3 RFC 9114: <https://www.rfc-editor.org/rfc/rfc9114>
- Cloudflare QUIC telemetry: <https://blog.cloudflare.com/tag/quic/>
- OTel hostmetrics receiver: <https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/hostmetricsreceiver>
- Prometheus node_exporter: <https://github.com/prometheus/node_exporter>
- Semconv stability tiers and OSI boundary decisions: `../standards.md`
- Coverage matrix (L4 rows): `../matrix.md`
- IP-address handling rules: `../signals/privacy.md`
- Profiling: `../signals/profiles.md`
- OS-level logs: `../signals/logs.md`
- Collector Kubernetes topology: `../transport/collector-topology.md`
- StatsD UDP sizing: `../transport/udp-statsd-mtu.md`
- Service mesh + QUIC: `mesh.md`
