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

type Step = Message | { type: "note"; at: number; lines: string[] };

const HEAD_SIZE = 12.5;
const HEAD_LINE = 16;
const TEXT_SIZE = 11.5;
const TEXT_LINE = 15;
const ALIAS_RE = /^([A-Za-z][\w-]*)\s*=\s*(.+)$/;
const MESSAGE_RE = /^(.+?)\s*(-->|->)\s*([^:]+?)\s*(?::\s*(.*))?$/;

export const sequence: Component = {
  name: "sequence",
  summary: "Messages between participants, in time order",
  syntax: [
    "```sequence",
    "Client -> Server: SYN        solid arrow: a call or request",
    "Server --> Client: SYN-ACK   dashed arrow: a reply or async message",
    "Server -> Server: validate   a message to itself",
    "note Server: state is now ESTABLISHED",
    "db = Orders database         short name for a long label",
    "```",
    "- Participants appear left to right in the order of first use.",
    "- One message per line; time runs downward.",
  ].join("\n"),
  example:
    "```sequence\nUser -> CLI: oma explain render\nCLI -> Renderer: draft\nRenderer --> CLI: HTML\nCLI --> User: file path\n```",
  render(text, _args, context) {
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

    for (const { text: line, line: at } of contentLines(text)) {
      const note = /^note\s+([^:]+):\s*(.+)$/i.exec(line);
      if (note) {
        steps.push({
          type: "note",
          at: touch(note[1] as string),
          lines: wrapText(note[2] as string, 170, TEXT_SIZE),
        });
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
          lines: label ? wrapText(label, 190, TEXT_SIZE) : [],
        });
        continue;
      }
      const alias = ALIAS_RE.exec(line);
      if (alias) {
        aliases.set(alias[1] as string, (alias[2] as string).trim());
        continue;
      }
      throw new ComponentError(
        `sequence line must be "From -> To: message", "note Who: text", or "name = Label": "${line}"`,
        at,
      );
    }
    if (!steps.some((step) => step.type === "message")) {
      throw new ComponentError("sequence needs at least one message", 1);
    }

    for (const participant of participants) {
      participant.lines = wrapText(participant.label, 120, HEAD_SIZE);
      participant.width =
        Math.max(72, ...participant.lines.map((l) => measure(l, HEAD_SIZE))) +
        22;
    }
    const textWidth = (lines: string[]) =>
      Math.max(0, ...lines.map((line) => measure(line, TEXT_SIZE)));

    // Gap between neighbouring lifelines: wide enough for both heads and for
    // every message label that has to fit between them.
    const gaps = participants.slice(1).map((participant, index) => {
      const previous = participants[index] as Participant;
      return previous.width / 2 + participant.width / 2 + 20;
    });
    let rightRoom = 0;
    for (const step of steps) {
      if (step.type === "note") continue;
      const low = Math.min(step.from, step.to);
      const high = Math.max(step.from, step.to);
      const need = textWidth(step.lines) + 28;
      if (low === high) {
        // A self message loops on the right of its lifeline.
        if (low < gaps.length)
          gaps[low] = Math.max(gaps[low] as number, need + 34);
        else rightRoom = Math.max(rightRoom, need + 34);
        continue;
      }
      const share = need / (high - low);
      for (let index = low; index < high; index++) {
        gaps[index] = Math.max(gaps[index] as number, share);
      }
    }
    const first = participants[0] as Participant;
    const last = participants[participants.length - 1] as Participant;
    let noteLeft = 0;
    for (const step of steps) {
      if (step.type !== "note") continue;
      const half = textWidth(step.lines) / 2 + 12;
      if (step.at === 0) noteLeft = Math.max(noteLeft, half - first.width / 2);
      if (step.at === participants.length - 1) {
        rightRoom = Math.max(rightRoom, half);
      }
    }
    const margin = 12;
    let cursor = margin + noteLeft + first.width / 2;
    participants.forEach((participant, index) => {
      if (index > 0) cursor += gaps[index - 1] as number;
      participant.x = cursor;
    });
    const width =
      Math.max(last.x + last.width / 2, last.x + rightRoom) + margin;

    const headHeight =
      Math.max(...participants.map((p) => p.lines.length)) * HEAD_LINE + 14;
    const marker = context.uid("arrow");
    const body: string[] = [];
    let y = margin + headHeight + 14;
    for (const step of steps) {
      if (step.type === "note") {
        const who = participants[step.at] as Participant;
        const w = textWidth(step.lines) + 20;
        const h = step.lines.length * TEXT_LINE + 10;
        body.push(
          `<rect class="oe-seq-note" x="${svgRound(who.x - w / 2)}" y="${svgRound(y)}" width="${svgRound(w)}" height="${h}" rx="4"/>`,
          svgText(step.lines, who.x, y + h / 2, {
            size: TEXT_SIZE,
            lineHeight: TEXT_LINE,
            className: "oe-seq-note-t",
          }),
        );
        y += h + 14;
        continue;
      }
      const from = participants[step.from] as Participant;
      const to = participants[step.to] as Participant;
      const labelHeight = step.lines.length * TEXT_LINE;
      const cls = `oe-edge${step.dashed ? " oe-edge-dashed" : ""}`;
      if (step.from === step.to) {
        const top = y + 4;
        const loop = 26;
        const bottom = top + Math.max(22, labelHeight);
        body.push(
          `<path class="${cls}" d="M${svgRound(from.x)},${top} h${loop} V${bottom} H${svgRound(from.x + 2)}" fill="none" marker-end="url(#${marker})"/>`,
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
        y = bottom + 16;
        continue;
      }
      const lineY = y + labelHeight + 6;
      const direction = to.x > from.x ? 1 : -1;
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
        `<path class="${cls}" d="M${svgRound(from.x)},${lineY} H${svgRound(to.x - direction * 2)}" fill="none" marker-end="url(#${marker})"/>`,
      );
      y = lineY + 16;
    }
    const height = y + margin;

    const heads = participants.map((participant) => {
      const left = svgRound(participant.x - participant.width / 2);
      return [
        `<path class="oe-seq-life" d="M${svgRound(participant.x)},${margin + headHeight} V${height - margin}"/>`,
        `<rect class="oe-node" x="${left}" y="${margin}" width="${svgRound(participant.width)}" height="${headHeight}" rx="6"/>`,
        svgText(participant.lines, participant.x, margin + headHeight / 2, {
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
    const model: SequenceModel = {
      kind: "sequence",
      participants: participants.map((participant, index) => ({
        id: ids[index] as string,
        label: participant.label,
      })),
      messages: steps
        .filter((step): step is Message => step.type === "message")
        .map((step) => ({
          from: ids[step.from] as string,
          to: ids[step.to] as string,
          label: step.label,
          dashed: step.dashed,
        })),
    };
    const summary = model.messages
      .slice(0, 12)
      .map((message, index) => `${index + 1}. ${message.label}`)
      .join(" ");
    return {
      html: svgFigure(
        width,
        height,
        summary,
        `<defs>${svgArrowMarker(marker)}</defs>${heads.join("")}${body.join("")}`,
      ),
      model,
    };
  },
};
