import { svgArrowMarker, svgFigure, svgRound, svgText } from "../svg.js";
import { measure, slugId, wrapText } from "../text.js";
import {
  type Component,
  ComponentError,
  contentLines,
  type SequenceModel,
} from "./types.js";

interface Participant {
  key: string;
  label: string;
  lines: string[];
  width: number;
  x: number;
}

interface Message {
  type: "message";
  from: number;
  to: number;
  lines: string[];
  dashed: boolean;
  label: string;
}

interface Note {
  type: "note";
  over: number[];
  lines: string[];
  width: number;
}

interface Divider {
  type: "divider";
  label: string;
}

type Step = Message | Note | Divider;

const HEAD_SIZE = 12.5;
const HEAD_LINE = 16;
const TEXT_SIZE = 11.5;
const TEXT_LINE = 15;
const MARGIN = 12;
const ALIAS_RE = /^([A-Za-z][\w-]*)\s*=\s*(.+)$/;
const PARTICIPANTS_RE = /^participants?\s*[:：]\s*(.+)$/i;
const NOTE_RE = /^note\s+([^:：]+)[:：]\s*(.+)$/i;
const DIVIDER_RE = /^==\s*(.+?)\s*==$/;
const MESSAGE_RE = /^([^:：]+?)\s*(-->|->)\s*([^:：]+?)\s*(?:[:：]\s*(.*))?$/;
const LIST_RE = /[,，]/;

export const sequence: Component = {
  name: "sequence",
  summary: "Messages between participants, in time order",
  syntax: [
    "```sequence [num]",
    "participants: Client, Server, DB   optional: fixes the left-to-right order",
    "Client -> Server: SYN        solid arrow: a call or request",
    "Server --> Client: SYN-ACK   dashed arrow: a reply or async message",
    "Server -> Server: validate   a message to itself",
    "note Server: note on one participant",
    "note Client, Server: note across several participants",
    "== Phase title ==            divider between phases",
    "db = Orders database         short name for a long label",
    "```",
    "- Without a participants line, participants appear in the order of first use.",
    "- The num argument numbers the messages.",
  ].join("\n"),
  example:
    "```sequence num\nClient -> Server: SYN\nServer --> Client: SYN-ACK\nClient -> Server: ACK\nnote Client, Server: ESTABLISHED\n```",
  render(text, args, context) {
    const numbered = /\bnum\b/i.test(args);
    const participants: Participant[] = [];
    const aliases = new Map<string, string>();
    const steps: Step[] = [];

    const touch = (raw: string): number => {
      const name = raw.trim();
      const found = participants.findIndex((p) => p.key === name);
      if (found !== -1) return found;
      participants.push({
        key: name,
        label: aliases.get(name) ?? name,
        lines: [],
        width: 0,
        x: 0,
      });
      return participants.length - 1;
    };
    const names = (list: string) =>
      list
        .split(LIST_RE)
        .map((name) => name.trim())
        .filter(Boolean);

    for (const { text: line, line: at } of contentLines(text)) {
      const order = PARTICIPANTS_RE.exec(line);
      if (order) {
        names(order[1] as string).forEach(touch);
        continue;
      }
      const note = NOTE_RE.exec(line);
      if (note) {
        const lines = wrapText((note[2] as string).trim(), 220, TEXT_SIZE);
        steps.push({
          type: "note",
          over: names(note[1] as string).map(touch),
          lines,
          width: Math.max(...lines.map((l) => measure(l, TEXT_SIZE))) + 20,
        });
        continue;
      }
      const divider = DIVIDER_RE.exec(line);
      if (divider) {
        steps.push({ type: "divider", label: divider[1] as string });
        continue;
      }
      const message = MESSAGE_RE.exec(line);
      if (message) {
        const label = (message[4] ?? "").trim();
        steps.push({
          type: "message",
          from: touch(message[1] as string),
          to: touch(message[3] as string),
          dashed: message[2] === "-->",
          label,
          lines: label ? wrapText(label, 230, TEXT_SIZE) : [],
        });
        continue;
      }
      const alias = ALIAS_RE.exec(line);
      if (alias) {
        const key = alias[1] as string;
        const label = (alias[2] as string).trim();
        aliases.set(key, label);
        const known = participants.find((p) => p.key === key);
        if (known) known.label = label;
        continue;
      }
      throw new ComponentError(
        `sequence cannot parse "${line}". Write a message as A -> B: label (--> is a dashed reply), a note as note A: text, a divider as == Title ==`,
        at,
      );
    }
    if (!steps.some((step) => step.type === "message")) {
      throw new ComponentError("sequence needs at least one message", 1);
    }

    for (const participant of participants) {
      participant.lines = wrapText(participant.label, 130, HEAD_SIZE);
      participant.width =
        Math.max(62, ...participant.lines.map((l) => measure(l, HEAD_SIZE))) +
        24;
    }
    const textWidth = (lines: string[]) =>
      Math.max(0, ...lines.map((line) => measure(line, TEXT_SIZE)));

    // Gap between neighbouring lifelines: wide enough for both heads and for
    // every message label that has to fit between them.
    const gaps = participants.slice(1).map((participant, index) => {
      const previous = participants[index] as Participant;
      return previous.width / 2 + participant.width / 2 + 24;
    });
    let rightRoom = 0;
    let leftRoom = 0;
    const first = participants[0] as Participant;
    const lastIndex = participants.length - 1;
    const last = participants[lastIndex] as Participant;
    for (const step of steps) {
      if (step.type === "message") {
        const low = Math.min(step.from, step.to);
        const high = Math.max(step.from, step.to);
        const need = textWidth(step.lines) + (numbered ? 36 : 24);
        if (low === high) {
          // A self message loops on the right of its lifeline.
          if (low < gaps.length) {
            gaps[low] = Math.max(gaps[low] as number, need + 44);
          } else {
            rightRoom = Math.max(rightRoom, need + 40);
          }
          continue;
        }
        let span = 0;
        for (let index = low; index < high; index++) {
          span += gaps[index] as number;
        }
        // Widen the last gap of the span: earlier labels keep their room.
        if (span < need)
          gaps[high - 1] = (gaps[high - 1] as number) + need - span;
      } else if (step.type === "note" && step.over.length === 1) {
        const at = step.over[0] as number;
        const half = step.width / 2;
        if (at === 0) leftRoom = Math.max(leftRoom, half - first.width / 2);
        if (at === lastIndex) rightRoom = Math.max(rightRoom, half);
      }
    }
    let cursor = MARGIN + leftRoom + first.width / 2;
    participants.forEach((participant, index) => {
      if (index > 0) cursor += gaps[index - 1] as number;
      participant.x = cursor;
    });
    const width =
      Math.max(last.x + last.width / 2, last.x + rightRoom) + MARGIN;

    const headHeight =
      Math.max(...participants.map((p) => p.lines.length)) * HEAD_LINE + 14;
    const marker = context.uid("arrow");
    const body: string[] = [];
    const segments: Array<{ label: string; from: number }> = [];
    const rows: number[] = [];
    let y = MARGIN + headHeight + 16;
    let count = 0;
    for (const step of steps) {
      if (step.type === "note") {
        const xs = step.over.map((at) => (participants[at] as Participant).x);
        const low = Math.min(...xs);
        const high = Math.max(...xs);
        const w = Math.max(step.width, high - low + 40);
        const h = step.lines.length * TEXT_LINE + 10;
        const centre = Math.min(
          Math.max((low + high) / 2, w / 2 + 2),
          width - w / 2 - 2,
        );
        body.push(
          `<rect class="oe-seq-note" x="${svgRound(centre - w / 2)}" y="${svgRound(y)}" width="${svgRound(w)}" height="${h}" rx="4"/>`,
          svgText(step.lines, centre, y + h / 2, {
            size: TEXT_SIZE,
            lineHeight: TEXT_LINE,
            className: "oe-seq-note-t",
          }),
        );
        y += h + 14;
        continue;
      }
      if (step.type === "divider") {
        const w = measure(step.label, TEXT_SIZE) + 22;
        segments.push({ label: step.label, from: rows.length });
        body.push(
          `<path class="oe-seq-rule" d="M${MARGIN},${y + 10} H${svgRound(width - MARGIN)}"/>`,
          `<rect class="oe-seq-divider" x="${svgRound(width / 2 - w / 2)}" y="${y}" width="${svgRound(w)}" height="20" rx="3"/>`,
          svgText([step.label], width / 2, y + 10, {
            size: TEXT_SIZE,
            lineHeight: TEXT_LINE,
            className: "oe-seq-divider-t",
          }),
        );
        y += 34;
        continue;
      }
      count++;
      const from = participants[step.from] as Participant;
      const to = participants[step.to] as Participant;
      const labelHeight = step.lines.length * TEXT_LINE;
      const cls = `oe-edge${step.dashed ? " oe-edge-dashed" : ""}`;
      const number = (x: number, at: number, anchor: string) =>
        numbered
          ? `<text class="oe-seq-step" x="${svgRound(x)}" y="${svgRound(at)}" text-anchor="${anchor}" font-size="10">${count}</text>`
          : "";
      if (step.from === step.to) {
        const top = y + 4;
        const loop = 28;
        const bottom = top + Math.max(22, labelHeight);
        rows.push(top);
        body.push(
          `<path class="${cls}" d="M${svgRound(from.x)},${top} h${loop} V${bottom} H${svgRound(from.x + 2)}" fill="none" marker-end="url(#${marker})"/>`,
          number(from.x + 5, top - 4, "start"),
        );
        if (step.lines.length > 0) {
          const w = textWidth(step.lines);
          body.push(
            svgText(step.lines, from.x + loop + 8 + w / 2, (top + bottom) / 2, {
              size: TEXT_SIZE,
              lineHeight: TEXT_LINE,
              className: "oe-seq-t",
            }),
          );
        }
        y = bottom + 18;
        continue;
      }
      const lineY = y + labelHeight + 6;
      const forward = to.x > from.x;
      rows.push(lineY);
      if (step.lines.length > 0) {
        body.push(
          svgText(step.lines, (from.x + to.x) / 2, y + labelHeight / 2, {
            size: TEXT_SIZE,
            lineHeight: TEXT_LINE,
            className: "oe-seq-t",
          }),
        );
      }
      body.push(
        `<path class="${cls}" d="M${svgRound(from.x)},${lineY} H${svgRound(to.x - (forward ? 2 : -2))}" fill="none" marker-end="url(#${marker})"/>`,
        number(
          from.x + (forward ? 5 : -5),
          lineY - 5,
          forward ? "start" : "end",
        ),
      );
      y = lineY + 18;
    }
    const height = y + MARGIN - 4;

    const heads = participants.map((participant) => {
      const left = svgRound(participant.x - participant.width / 2);
      return [
        `<path class="oe-seq-life" d="M${svgRound(participant.x)},${MARGIN + headHeight} V${height - MARGIN}"/>`,
        `<rect class="oe-node" x="${left}" y="${MARGIN}" width="${svgRound(participant.width)}" height="${headHeight}" rx="6"/>`,
        svgText(participant.lines, participant.x, MARGIN + headHeight / 2, {
          size: HEAD_SIZE,
          lineHeight: HEAD_LINE,
          className: "oe-node-t",
        }),
      ].join("");
    });

    const used = new Set<string>();
    const ids = participants.map((participant) => {
      let id = slugId(participant.key, "p").replace(/^p-(?=[a-z])/, "");
      while (used.has(id)) id += "x";
      used.add(id);
      return id;
    });
    const messages = steps.filter(
      (step): step is Message => step.type === "message",
    );
    const model: SequenceModel = {
      kind: "sequence",
      participants: participants.map((participant, index) => ({
        id: ids[index] as string,
        label: participant.label,
      })),
      messages: messages.map((step) => ({
        from: ids[step.from] as string,
        to: ids[step.to] as string,
        label: step.label,
        dashed: step.dashed,
      })),
      phases: segments.map((segment, index) => ({
        label: segment.label,
        from: segment.from,
        to: (segments[index + 1]?.from ?? messages.length) - 1,
      })),
    };
    const label = `${context.labels.sequence}${context.labels.colon}${participants
      .map((participant) => participant.label)
      .join(context.labels.separator)}`;
    return {
      html: svgFigure(
        width,
        height,
        label,
        `<defs>${svgArrowMarker(marker)}</defs>${heads.join("")}${body.join("")}`,
      ),
      model,
    };
  },
};
