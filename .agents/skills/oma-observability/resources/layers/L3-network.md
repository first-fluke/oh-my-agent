# L3-Network Layer Observability

## 1. Scope

**In scope**: IP routing, cloud VPC flow logs, ICMP (reachability and PMTUD), and Path MTU Discovery.

**Out of scope**: L1 physical (NIC, cable, IPMI) and L2 data-link (MAC, VLAN, STP). Those domains belong to vendor DCIM tooling (Nlyte, Sunbird, Device42); see `../../SKILL.md` (When NOT to use) and the OSI boundary decision in `../standards.md`. BGP/BMP inter-AS routing monitoring is also out of scope: it concerns only operators that announce their own prefixes, has no OTel semconv, and runs on a separate BMP collector pipeline (OpenBMP, pmacct, BGPalerter) rather than OTLP.

**SaaS / cloud-native teams**: the primary artifact is cloud-provider VPC flow logs (Section 3).

---

## 2. OTel Semantic Conventions Relevant to L3

The following attributes from the `network.*` group are **Stable** and safe for production instrumentation. The stability tier table is in `../standards.md`; confirm the current tier of any attribute in the semconv registry.

| Attribute | Type | Example values | Notes |
|-----------|------|----------------|-------|
| `network.type` | string enum | `ipv4`, `ipv6` | Stable; always set on socket-level spans |
| `network.transport` | string enum | `tcp`, `udp`, `quic` | Stable; distinguish protocol at L4 framing |
| `network.local.address` | string | `10.0.1.5` | Stable; local IP of the socket |
| `network.local.port` | int | `443` | Stable; local port |
| `network.peer.address` | string | `192.0.2.10` | Stable; remote IP; treat as PII, see Section 3.3 |
| `network.peer.port` | int | `8080` | Stable; remote port |
| `network.protocol.name` | string | `http`, `grpc` | Stable; application protocol atop L3/L4 |

Note: `network.connection.type` and `network.connection.subtype` are **Development** tier and should not be used in production SLOs. Reference: <https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/>

---

## 3. Cloud VPC Flow Logs

VPC flow logs capture IP-layer traffic metadata: source address, destination address, bytes, packets, protocol, and firewall action. They are the primary L3 observability artifact for cloud-native teams.

### 3.1 Per-Cloud Collection Pipeline

| Cloud | Flow log source | OTel Collector ingestion | Key config |
|-------|----------------|--------------------------|------------|
| AWS | VPC Flow Logs → CloudWatch Logs or S3 | `awscloudwatchreceiver` (CloudWatch Logs); `awss3receiver` with `awslogsencodingextension` `format: vpcflow` (S3) | Enable `pkt-srcaddr`, `pkt-dstaddr`, `bytes`, `packets`, `action`, `protocol` fields in flow log format v3+ |
| GCP | VPC Flow Logs → Cloud Logging | `googlecloudpubsubreceiver` (via Pub/Sub export sink) | Configure aggregation interval (5s–15min); lower interval increases cost |
| Azure | Virtual network (VNet) flow logs → Storage Account block blobs | `azureblobreceiver`; confirm a decoder for the flow-log JSON in current contrib | Enable Traffic Analytics for enriched flow data. NSG flow logs are being retired (no new ones can be created; retirement 2027-09-30), so target VNet flow logs |

Receiver and encoding-extension stability varies (several are alpha); check each component's README before depending on it.

References:
- AWS: <https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html>
- GCP: <https://cloud.google.com/vpc/docs/flow-logs>
- Azure: <https://learn.microsoft.com/azure/network-watcher/vnet-flow-logs-overview>

### 3.2 Key Flow Log Fields

Azure VNet flow logs carry these values positionally inside the comma-separated `flowTuples` string; branch parsing on `flowLogVersion`.

| Field | AWS name | GCP name | Azure `flowTuples` position | Notes |
|-------|----------|----------|------------|-------|
| Source IP | `srcaddr` | `connection.src_ip` | Source IP | PII; see Section 3.3 |
| Destination IP | `dstaddr` | `connection.dest_ip` | Destination IP | PII; see Section 3.3 |
| Source port | `srcport` | `connection.src_port` | Source port | |
| Destination port | `dstport` | `connection.dest_port` | Destination port | |
| Protocol | `protocol` | `connection.protocol` | Protocol | IANA protocol number |
| Bytes | `bytes` | `bytes_sent` | Bytes sent / Bytes received | Used for egress cost attribution |
| Packets | `packets` | `packets_sent` | Packets sent / Packets received | |
| Firewall action | `action` | N/A (use firewall logs) | Flow state (`B` begin, `C` continuing, `E` end, `D` deny) | `ACCEPT` / `REJECT` on AWS; audit signal |
| Start/end time | `start`, `end` | `start_time`, `end_time` | Time stamp (UNIX epoch) | |

Flow records with an allow/deny action serve as network-access-control evidence (for example SOC 2 CC6.6). Retention and integrity controls for that evidence follow `../signals/audit.md`.

### 3.3 Privacy Note

`srcaddr` and `dstaddr` (and their equivalents) are IP addresses. Under GDPR Article 4(1) and PIPA, IP addresses linked to natural persons are personal data. Before long-term retention:

- Truncate the last octet for IPv4 (e.g., `203.0.113.0/24` prefix preservation).
- Hash with a rotating salt (SHA-256 minimum) for per-flow pseudonymization.
- Do not store raw IP addresses in shared observability backends unless the tenant has explicit lawful basis.

Cross-reference: `../signals/privacy.md` for the IP-address handling rules (truncation and keyed-hash pseudonymization per field).

---

## 4. PMTUD: Path MTU Discovery

### 4.1 Mechanism

Path MTU Discovery (PMTUD, RFC 1191 for IPv4; RFC 8201 for IPv6) allows a sender to discover the maximum transmission unit supported along an end-to-end path without fragmentation. RFC 8899 defines Datagram PLPMTUD (DPLPMTUD), a transport-level variant used by QUIC and SCTP that does not rely on ICMP.

IPv4 PMTUD relies on ICMP Type 3 Code 4 ("Fragmentation Needed, DF set") messages returned by intermediate routers when a packet is too large and the DF (Don't Fragment) bit is set. The sender reduces its segment size upon receiving this ICMP message.

### 4.2 PMTUD Black Hole

**Root cause**: firewall rules that block ICMP Type 3 Code 4 prevent the sender from receiving the path MTU signal. The sender continues transmitting oversized segments that are silently dropped.

**Symptom pattern**:
- Small payloads (< 576 bytes) succeed; large payloads (> path MTU) stall or fail.
- TCP connection establishes (SYN/SYN-ACK are small) but bulk data transfer hangs.
- HTTP responses for large objects time out; health checks (small packets) pass.

**Detection in flow logs**: look for sessions with normal packet counts but abnormally low byte counts per session; correlate with application-layer timeout logs.

**Remediation options**:
1. **MSS clamping** (TCP Maximum Segment Size): configure at the firewall or router to clamp MSS to `interface_MTU - 40` (IPv4) or `interface_MTU - 60` (IPv6). This is the preferred fix for VPN and tunnel endpoints.
2. **Explicit MTU pinning**: set the outgoing interface MTU on the host to a conservative value (e.g., 1452 for PPPoE, 1422 for GRE over IPSec).
3. **ICMP passthrough**: allow ICMP Type 3 Code 4 through security groups and firewalls. Verify with: `ping -M do -s 1472 <destination>`.

Cross-reference: `../transport/udp-statsd-mtu.md` for related UDP MTU thresholds (1472 IPv4, 1452 IPv6, 8192 UDS) that interact with the same path MTU constraints.

---

## 5. ICMP Observability

### 5.1 Active Monitoring Tools

| Tool | Signal type | Use case |
|------|------------|---------|
| Blackbox Exporter (Prometheus) | ICMP echo probe | Synthetic availability from a vantage point |
| SmokePing | ICMP RTT time series | Long-term latency trend and packet-loss distribution |
| `ping` (scripted) | ICMP echo RTT | Ad hoc reachability during incident investigation |
| `traceroute` / `mtr` | ICMP TTL-exceeded path | Hop-by-hop latency and packet-loss localization |

### 5.2 Cloud Provider ICMP Constraints

| Cloud | ICMP behavior | Notes |
|-------|--------------|-------|
| AWS | ICMP echo blocked by default on security groups | Explicitly allow inbound ICMP Type 8 (echo request) for Blackbox Exporter probes to work |
| GCP | ICMP echo allowed by default in default VPC firewall rules | Review custom VPC firewall rules |
| Azure | ICMP echo allowed; NSG allows by default for same-VNet | Blocked at NSG if explicit deny rule added |

ICMP Rate limits: all major clouds rate-limit ICMP responses from managed infrastructure (e.g., NAT gateways, load balancers). Do not interpret ICMP loss at these endpoints as a network fault; correlate with TCP-level application metrics.

### 5.3 ICMP in OTel

OTel does not define ICMP-specific semconv. Use the Blackbox Exporter's native Prometheus metrics (`probe_success`, `probe_duration_seconds`, `probe_icmp_reply_hop_limit`) and scrape them via the OTel Collector `prometheusreceiver`. Tag probes with `network.peer.address` for correlation.

An L3 event (PMTUD black hole, routing fault) that burns an SLO surfaces first as an L7 error-rate spike; investigate through the 6-dimension localization in `../incident-forensics.md`, not through an L3 SLO.

---

## 6. References

Internal cross-references:

- `../standards.md`: OTel semconv stability tiers and OSI boundary decision
- `../matrix.md`: coverage map (L3-network rows)
- `../signals/privacy.md`: IP-address handling rules
- `../signals/audit.md`: audit evidence retention and integrity controls
- `../signals/cost.md`: egress byte volume as a cost proxy
- `../transport/udp-statsd-mtu.md`: UDP MTU thresholds
- `../incident-forensics.md`: 6-dimension localization when an L3 event causes an L7 SLO burn

External:

- RFC 1191: Path MTU Discovery (IPv4): <https://www.rfc-editor.org/rfc/rfc1191>
- RFC 8201: Path MTU Discovery for IPv6: <https://www.rfc-editor.org/rfc/rfc8201>
- RFC 8899: Datagram PLPMTUD (used by QUIC/SCTP): <https://www.rfc-editor.org/rfc/rfc8899>
- IANA ICMP Type registry: <https://www.iana.org/assignments/icmp-parameters/icmp-parameters.xhtml>
- IANA protocol numbers: <https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml>
- OTel network semconv registry: <https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/>
- AWS VPC Flow Logs: <https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html>
- GCP VPC Flow Logs: <https://cloud.google.com/vpc/docs/flow-logs>
- Azure VNet flow logs: <https://learn.microsoft.com/azure/network-watcher/vnet-flow-logs-overview>
