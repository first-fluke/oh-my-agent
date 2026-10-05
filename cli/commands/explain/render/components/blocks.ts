import { renderInline } from "../markdown.js";
import { escapeHtml, measure } from "../text.js";
import {
  type Component,
  ComponentError,
  contentLines,
  fields,
} from "./types.js";

// limits, annot, quiz: HTML components, so they wrap with the panel.

const NICE = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** A round axis maximum a little above `peak`, and a tick step for it. */
export function niceScale(peak: number): { max: number; step: number } {
  if (!Number.isFinite(peak) || peak <= 0) return { max: 1, step: 1 };
  const target = peak * 1.25;
  const power = 10 ** Math.floor(Math.log10(target));
  const max =
    (NICE.find((value) => value * power >= target - 1e-9) ?? 10) * power;
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5]
    .map((value) => value * power)
    .find((value) => max / value <= 6) as number;
  const tidy = (value: number) => Math.round(value * 1000) / 1000;
  return { max: tidy(max), step: tidy(step) };
}

const NUMBER_RE = /^(?:max\s+)?(-?\d+(?:\.\d+)?)$/i;

export const limits: Component = {
  name: "limits",
  summary: "A value against its limit, as a bar",
  syntax: [
    "```limits",
    "label | value / limit | unit (optional) | note (optional)",
    "label | max 20 | unit       limit only: the bar fills to the limit",
    "```",
    "- The bar starts at 0 and its length is proportional to the value.",
    "- A row is marked as over when the value is above the limit.",
  ].join("\n"),
  example:
    "```limits\nSentence | 13 / 20 | words\nParagraph | 8 / 6 | sentences | over\nPanel title | max 40 | characters\n```",
  render(text) {
    const rows = contentLines(text).map(({ text: line, line: at }) => {
      const [label = "", spec = "", unit = "", note = ""] = fields(line);
      const [first, second] = spec.split("/").map((part) => part.trim());
      const numbers = (second === undefined ? [first] : [first, second]).map(
        (part) => NUMBER_RE.exec(part ?? "")?.[1],
      );
      if (!label || !spec || numbers.some((value) => value === undefined)) {
        throw new ComponentError(
          `limits line must be "label | value / limit | unit": "${line}"`,
          at,
        );
      }
      const limit = Number(numbers[numbers.length - 1]);
      const value = numbers.length === 2 ? Number(numbers[0]) : undefined;
      return { label, value, limit, unit, note };
    });
    if (rows.length === 0) {
      throw new ComponentError("limits needs at least one line", 1);
    }
    const percent = (value: number, max: number) =>
      `${Math.round((Math.max(0, value) / max) * 10000) / 100}%`;
    const html = rows.map((row) => {
      const { max, step } = niceScale(Math.max(row.limit, row.value ?? 0));
      const over = row.value !== undefined && row.value > row.limit;
      const shown = row.value ?? row.limit;
      const reading = `${row.value !== undefined ? `${row.value} / ` : ""}max ${row.limit}${row.unit ? ` ${row.unit}` : ""}`;
      const ticks: string[] = [];
      for (let tick = 0; tick <= max + 1e-9; tick += step) {
        const rounded = Math.round(tick * 1000) / 1000;
        ticks.push(
          `<span style="left:${percent(rounded, max)}">${rounded}</span>`,
        );
      }
      return `<div class="oe-limit${over ? " oe-limit-over" : ""}"><div class="oe-limit-head"><span>${escapeHtml(row.label)}${row.note ? `<span class="oe-limit-note">${escapeHtml(row.note)}</span>` : ""}</span><span class="oe-limit-value">${over ? '<b aria-hidden="true">▲ </b>' : ""}${escapeHtml(reading)}</span></div><div class="oe-limit-track"><div class="oe-limit-fill" style="width:${percent(shown, max)}"></div><div class="oe-limit-mark" style="left:${percent(row.limit, max)}"></div></div><div class="oe-limit-ticks" aria-hidden="true">${ticks.join("")}</div></div>`;
    });
    return { html: `<div class="oe-limits">${html.join("")}</div>` };
  },
};

const SEGMENT_RE = /\[([^\]]+)\]\{(!?)([^}]*)\}/g;
const ANNOT_SIZE = 14;
const NOTE_SIZE = 11;

/** First row whose notes leave [start, end) free; adds a row when none does. */
function placeNote(
  rows: Array<Array<[number, number]>>,
  start: number,
  end: number,
): number {
  const free = rows.findIndex((ranges) =>
    ranges.every(([low, high]) => end <= low || start >= high),
  );
  if (free !== -1) {
    (rows[free] as Array<[number, number]>).push([start, end]);
    return free;
  }
  rows.push([[start, end]]);
  return rows.length - 1;
}

function annotLine(sentence: string, line: number): string {
  const stripped = sentence.replace(SEGMENT_RE, "");
  if (/\]\{[^}]*$|\[[^\]]*\]\{/.test(stripped)) {
    throw new ComponentError(
      `annot has an unclosed annotation; write [span]{note}: "${sentence}"`,
      line,
    );
  }
  const rows: Array<Array<[number, number]>> = [];
  let html = "";
  let plain = "";
  let last = 0;
  for (const match of sentence.matchAll(SEGMENT_RE)) {
    const before = sentence.slice(last, match.index);
    html += escapeHtml(before);
    plain += before;
    const [, span = "", wrong, rawNote = ""] = match;
    const note = rawNote.trim();
    const start = measure(plain, ANNOT_SIZE, true);
    const row = note
      ? placeNote(rows, start, start + measure(note, NOTE_SIZE) + 12)
      : 0;
    html += `<span class="oe-seg${wrong ? " oe-seg-no" : ""}"><span class="oe-seg-text">${escapeHtml(span)}</span>${note ? `<span class="oe-seg-note" style="--row:${row}">${escapeHtml(note)}</span>` : ""}</span>`;
    plain += span;
    last = (match.index ?? 0) + match[0].length;
  }
  html += escapeHtml(sentence.slice(last));
  // A line with notes keeps one row so the notes stay under their spans; it
  // scrolls inside its own box when the panel is narrower than the sentence.
  return rows.length > 0
    ? `<div class="oe-scroll"><div class="oe-annot-line" style="--rows:${rows.length}">${html}</div></div>`
    : `<div class="oe-annot-line oe-annot-wrap">${html}</div>`;
}

export const annot: Component = {
  name: "annot",
  summary: "A sentence, command, or line of code with notes under its parts",
  syntax: [
    "```annot",
    "# Heading | note at the right (optional)",
    "text with an [annotated span]{note} and a [wrong span]{!why it is wrong}.",
    "> Caption below (optional)",
    "```",
    "- Notes that would overlap move to separate rows automatically.",
  ].join("\n"),
  example:
    "```annot\n# Command | 3 parts\n[oma]{CLI} [explain render]{subcommand} [draft.md]{!must exist}\n> The draft is the only input.\n```",
  render(text) {
    interface Group {
      title: string;
      meta: string;
      lines: string[];
      captions: string[];
    }
    const groups: Group[] = [];
    const current = (): Group => {
      if (groups.length === 0) {
        groups.push({ title: "", meta: "", lines: [], captions: [] });
      }
      return groups[groups.length - 1] as Group;
    };
    for (const { text: line, line: at } of contentLines(text)) {
      if (line.startsWith("#")) {
        const [title = "", meta = ""] = fields(line.replace(/^#+\s*/, ""));
        groups.push({ title, meta, lines: [], captions: [] });
      } else if (line.startsWith(">")) {
        current().captions.push(line.replace(/^>\s*/, ""));
      } else {
        current().lines.push(annotLine(line, at));
      }
    }
    if (!groups.some((group) => group.lines.length > 0)) {
      throw new ComponentError("annot needs at least one sentence", 1);
    }
    const html = groups.map((group) => {
      const head =
        group.title || group.meta
          ? `<div class="oe-annot-head"><span>${escapeHtml(group.title)}</span>${group.meta ? `<span class="oe-annot-meta">${escapeHtml(group.meta)}</span>` : ""}</div>`
          : "";
      const captions = group.captions
        .map(
          (caption) =>
            `<div class="oe-annot-caption">${renderInline(caption)}</div>`,
        )
        .join("");
      return `<div class="oe-annot">${head}${group.lines.join("")}${captions}</div>`;
    });
    return { html: html.join("") };
  },
};

export const quiz: Component = {
  name: "quiz",
  summary: "Multiple-choice questions the reader answers on the page",
  syntax: [
    "```quiz",
    "? Question text",
    "- a wrong option",
    "  > why this option is wrong",
    "+ the correct option (exactly one + per question)",
    "  > why this option is right",
    "= Explanation shown after any answer (optional)",
    "```",
    "- A > line gives feedback for the option above it. Give every option one.",
    '- Options are shuffled each time the page loads; do not write "A" or "the first".',
    "- Ask about understanding, not recall of a name. Two to four options each.",
  ].join("\n"),
  example:
    "```quiz\n? Who computes node positions in a flow block?\n- The author\n  > The draft holds relations only.\n+ The renderer\n  > It runs a layered layout over the relations.\n```",
  render(text) {
    interface Question {
      text: string;
      options: Array<{ text: string; feedback: string[] }>;
      answer: number;
      why: string[];
      line: number;
    }
    const questions: Question[] = [];
    for (const { text: line, line: at } of contentLines(text)) {
      const last = questions[questions.length - 1];
      if (line.startsWith("?")) {
        questions.push({
          text: line.slice(1).trim(),
          options: [],
          answer: -1,
          why: [],
          line: at,
        });
        continue;
      }
      if (!last) {
        throw new ComponentError(
          `quiz must start with a "? question" line: "${line}"`,
          at,
        );
      }
      const option = /^([-+])\s+(.+)$/.exec(line);
      if (option) {
        if (option[1] === "+") {
          if (last.answer !== -1) {
            throw new ComponentError(
              "quiz question has two + options; mark exactly one",
              at,
            );
          }
          last.answer = last.options.length;
        }
        last.options.push({ text: option[2] as string, feedback: [] });
      } else if (line.startsWith(">")) {
        const feedback = line.replace(/^>\s*/, "");
        const target = last.options[last.options.length - 1];
        (target ? target.feedback : last.why).push(feedback);
      } else if (line.startsWith("=")) {
        last.why.push(line.slice(1).trim());
      } else {
        throw new ComponentError(
          `quiz line must start with ?, -, +, >, or =: "${line}"`,
          at,
        );
      }
    }
    if (questions.length === 0) {
      throw new ComponentError("quiz needs at least one question", 1);
    }
    for (const question of questions) {
      if (question.options.length < 2 || question.answer === -1) {
        throw new ComponentError(
          `quiz question needs two or more options and one marked with +: "${question.text}"`,
          question.line,
        );
      }
    }
    const html = questions.map((question, index) => {
      const options = question.options
        .map((option, at) => {
          const feedback = [...option.feedback, ...question.why].join(" ");
          return `<button type="button" class="oe-q-option"${at === question.answer ? " data-correct" : ""} data-feedback="${escapeHtml(renderInline(feedback))}"><span class="oe-q-letter" aria-hidden="true"></span><span>${renderInline(option.text)}</span></button>`;
        })
        .join("");
      return `<div class="oe-q"><p class="oe-q-text"><span class="oe-q-number">${index + 1}</span><span>${renderInline(question.text)}</span></p><div class="oe-q-options">${options}</div><p class="oe-q-why" aria-live="polite"></p></div>`;
    });
    return {
      html: `<div class="oe-quiz" data-quiz>${html.join("")}<p class="oe-quiz-score" aria-live="polite"></p></div>`,
    };
  },
};
