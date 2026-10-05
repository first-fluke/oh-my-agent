import type {
  DiagramModel,
  FlowModel,
  SequenceModel,
} from "./components/index.js";

// A flow or sequence block already holds a typed graph, so the archify spec
// for the interactive sidecar is derived from it — no second authoring pass,
// and the sidecar cannot disagree with the diagram in the page.

export type ArchifyType = "architecture" | "sequence";
export type ArchifyQuality = "showcase" | "standard";

export interface ArchifySpec {
  type: ArchifyType;
  spec: Record<string, unknown>;
}

type ComponentType =
  | "frontend"
  | "backend"
  | "database"
  | "cloud"
  | "security"
  | "messagebus"
  | "external";

const TYPE_HINTS: Array<[ComponentType, RegExp]> = [
  [
    "database",
    /\b(db|database|store|storage|cache|redis|postgres|mysql|sqlite|sql|index|file|disk|jsonl?)\b|저장|캐시|디비|파일|데이터베이스/i,
  ],
  [
    "security",
    /\b(auth|token|secret|guard|policy|lint|validat\w*|verify|gate|csp)\b|인증|권한|보안|검증|검사|린트/i,
  ],
  [
    "messagebus",
    /\b(queue|event|events|bus|kafka|stream|topic|pubsub|webhook|emit)\b|이벤트|큐|메시지|스트림/i,
  ],
  [
    "external",
    /\b(user|users|client|customer|reader|author|vendor|third[- ]party|external|llm|model|agent)\b|사용자|독자|작성자|고객|외부|모델|에이전트/i,
  ],
  [
    "frontend",
    /\b(ui|web|page|html|browser|view|screen|app|dashboard|svg|css)\b|화면|브라우저|페이지|웹/i,
  ],
  ["cloud", /\b(cloud|cdn|s3|aws|gcp|azure|bucket|lambda|edge)\b|클라우드/i],
];

/** archify component type for a node, from its label and shape. */
export function inferComponentType(
  label: string,
  shape = "box",
): ComponentType {
  if (shape === "cylinder") return "database";
  for (const [type, pattern] of TYPE_HINTS) {
    if (pattern.test(label)) return type;
  }
  return shape === "pill" ? "external" : "backend";
}

function meta(title: string, output: string, quality: ArchifyQuality) {
  return { title, output, quality_profile: quality };
}

function fromSequence(
  model: SequenceModel,
  title: string,
  output: string,
  quality: ArchifyQuality,
): ArchifySpec | undefined {
  // archify draws a message between two lifelines; a self message has none.
  const messages = model.messages.filter(
    (message) => message.from !== message.to,
  );
  if (model.participants.length < 2 || messages.length === 0) return undefined;
  const called = new Set<string>();
  const first = 170;
  const step = 30;
  return {
    type: "sequence",
    spec: {
      schema_version: 1,
      diagram_type: "sequence",
      meta: {
        ...meta(title, output, quality),
        column_fit: "spread",
        viewBox: [
          Math.max(640, model.participants.length * 190),
          Math.max(480, first + messages.length * step + 80),
        ],
      },
      participants: model.participants.map((participant) => ({
        id: participant.id,
        type: inferComponentType(participant.label),
        label: participant.label,
      })),
      messages: messages.map((message, index) => {
        // A dashed arrow back along an earlier call is its return.
        const answers = called.has(`${message.to}>${message.from}`);
        called.add(`${message.from}>${message.to}`);
        return {
          id: `m${index + 1}`,
          from: message.from,
          to: message.to,
          y: first + index * step,
          label: message.label || "→",
          variant: message.dashed ? (answers ? "return" : "dashed") : "default",
        };
      }),
    },
  };
}

function fromFlow(
  model: FlowModel,
  title: string,
  output: string,
  quality: ArchifyQuality,
): ArchifySpec | undefined {
  if (model.nodes.length < 2 || model.nodes.length > 24) return undefined;
  // Ranks from the layout become grid rows (or columns, for a sideways
  // flow); positions within a rank become the other axis.
  const ranks = [...new Set(model.nodes.map((node) => node.rank))].sort(
    (a, b) => a - b,
  );
  const horizontal = model.direction === "LR" || model.direction === "RL";
  const cells = new Map<string, { row: number; col: number }>();
  let widest = 0;
  ranks.forEach((rank, rankIndex) => {
    const members = model.nodes
      .filter((node) => node.rank === rank)
      .sort((a, b) => a.order - b.order);
    widest = Math.max(widest, members.length);
    members.forEach((node, position) => {
      cells.set(
        node.id,
        horizontal
          ? { row: position, col: rankIndex }
          : { row: rankIndex, col: position },
      );
    });
  });
  const cols = horizontal ? ranks.length : widest;
  if (cols > 12) return undefined;
  return {
    type: "architecture",
    spec: {
      schema_version: 1,
      diagram_type: "architecture",
      meta: meta(title, output, quality),
      layout: { mode: "grid", cols },
      components: model.nodes.map((node) => ({
        id: node.id,
        type: inferComponentType(node.label, node.shape),
        label: node.label,
        ...(cells.get(node.id) ?? { row: 0, col: 0 }),
      })),
      connections: model.edges.map((edge, index) => ({
        id: `c${index + 1}`,
        from: edge.from,
        to: edge.to,
        ...(edge.label ? { label: edge.label } : {}),
        variant: edge.dashed ? "dashed" : "default",
      })),
    },
  };
}

/**
 * archify spec for a diagram of the page, or undefined when the diagram has
 * nothing archify can draw (one participant, one node, only self messages).
 * `output` is the sidecar's file name; archify wants it relative and portable.
 */
export function toArchifySpec(
  model: DiagramModel,
  options: { title: string; output: string; quality: ArchifyQuality },
): ArchifySpec | undefined {
  return model.kind === "sequence"
    ? fromSequence(model, options.title, options.output, options.quality)
    : fromFlow(model, options.title, options.output, options.quality);
}
