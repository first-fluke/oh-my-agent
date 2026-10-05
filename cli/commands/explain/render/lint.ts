import type { Draft, DraftBlock } from "./draft.js";
import { type DraftLanguage, detectLanguage, isWide } from "./text.js";

// Controlled-writing check for the prose of a draft. An explanation is read
// once, by someone who did not write it: short sentences, plain words, one
// idea per paragraph. Everything here is a warning; `style: strict` makes the
// render fail on them.
//
// Checked: Markdown prose and callout text. Not checked: code, inline code,
// ~~struck~~ counter-examples, table rows marked `no`, headings, and the
// content of other components.

export interface LintWarning {
  line: number;
  rule: string;
  message: string;
  suggestion?: string;
}

type Kind = "sentence" | "step";

/** Longest sentence per language: words for English, characters otherwise. */
const LIMITS: Record<DraftLanguage, Record<Kind, number>> = {
  en: { sentence: 25, step: 20 },
  ko: { sentence: 70, step: 55 },
  ja: { sentence: 65, step: 50 },
  zh: { sentence: 45, step: 35 },
};
const MAX_SENTENCES = 6;

const EN_WORDS: Array<[RegExp, string]> = (
  [
    ["in order to", "to"],
    ["due to the fact that", "because"],
    ["in the event that", "if"],
    ["at this point in time", "now"],
    ["a number of", "some / the exact number"],
    ["it should be noted that", "delete it"],
    ["it is important to note that", "delete it"],
    ["prior to", "before"],
    ["subsequent to", "after"],
    ["utilize", "use"],
    ["utilizes", "uses"],
    ["utilizing", "using"],
    ["leverage", "use"],
    ["leverages", "uses"],
    ["leveraging", "using"],
    ["facilitate", "help / let"],
    ["facilitates", "helps / lets"],
    ["commence", "start"],
    ["terminate", "stop / end"],
    ["approximately", "about"],
    ["seamless", "say what works without a step"],
    ["seamlessly", "say what works without a step"],
    ["robust", "say what it survives"],
    ["delve", "look at"],
    ["crucial", "say why it matters"],
  ] as Array<[string, string]>
).map(([phrase, suggestion]) => [
  new RegExp(`\\b${phrase.replace(/ /g, "\\s+")}\\b`, "gi"),
  suggestion,
]);

const EN_PASSIVE =
  /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+ed|known|done|made|given|taken|seen|written|built|shown|sent|kept|held|found|set|put|run|chosen|driven|broken)\b/i;

interface Pattern {
  re: RegExp;
  rule: string;
  message: string;
  suggestion: string;
}

// Korean: translationese and double passives that make a sentence longer
// without adding meaning.
const KO_PATTERNS: Pattern[] = [
  {
    re: /(?:되어|보여|쓰여|잊혀|불리워|나뉘어|짜여|모여)[지진집질져졌]/g,
    rule: "double-passive",
    message: "이중 피동",
    suggestion: "'-되다' 또는 능동형으로 쓴다 (되어진 → 된, 보여지다 → 보이다)",
  },
  {
    re: /에\s?있어서/g,
    rule: "translationese",
    message: "번역투 '~에 있어서'",
    suggestion: "'~에서', '~할 때'로 쓴다",
  },
  {
    re: /[으]?로부터/g,
    rule: "translationese",
    message: "번역투 '~로부터'",
    suggestion: "'~에서', '~에게서'로 쓴다",
  },
  {
    re: /것이\s?가능/g,
    rule: "translationese",
    message: "번역투 '~하는 것이 가능하다'",
    suggestion: "'~할 수 있다'로 쓴다",
  },
  {
    re: /에\s?의해(?:서)?/g,
    rule: "translationese",
    message: "번역투 '~에 의해'",
    suggestion: "행위자를 주어로 삼아 능동문으로 쓴다",
  },
  {
    re: /[을를]\s?(?:수행|진행|실시)(?:하|한|할|합|했)/g,
    rule: "light-verb",
    message: "명사 + '수행/진행하다'",
    suggestion: "동사를 직접 쓴다 (검증을 수행한다 → 검증한다)",
  },
  {
    re: /(?:결론적으로|요약하자면|주목할\s?만한|혁신적|획기적|다양한\s?측면)/g,
    rule: "cliche",
    message: "상투 표현",
    suggestion: "지우거나 구체적인 사실로 바꾼다",
  },
];
/** Fine once; a sign of a stacked, translated sentence when repeated. */
const KO_REPEATED: Pattern[] = [
  {
    re: /에\s?대한|에\s?대해서?/g,
    rule: "translationese",
    message: "한 문장에 '~에 대한/대해'가 두 번 이상",
    suggestion: "목적어로 바로 쓴다 (설정에 대한 검증 → 설정 검증)",
  },
  {
    re: /[을를]\s?통해서?/g,
    rule: "translationese",
    message: "한 문장에 '~을 통해'가 두 번 이상",
    suggestion: "'~로', '~해서'로 쓰거나 문장을 나눈다",
  },
  {
    re: /적인?\s/g,
    rule: "jeok-chain",
    message: "한 문장에 '~적(인)'이 세 번 이상",
    suggestion: "구체적인 말로 바꾼다",
  },
];

const ZH_CLICHES = [
  "众所周知",
  "不言而喻",
  "总而言之",
  "值得注意的是",
  "综上所述",
];

const ABBREVIATION_RE = /\b(e\.g|i\.e|etc|vs|cf|approx|Fig|No)\./gi;

export function splitSentences(text: string): string[] {
  const masked = text
    .replace(ABBREVIATION_RE, (match) => match.replace(/\./g, "\uE000"))
    // A dot inside a file name, version, or decimal does not end a sentence.
    .replace(/(?<=\S)\.(?=\S)/g, "\uE000");
  const parts =
    masked.match(/[^。！？!?]+?(?:[。！？!?]+|\.(?=\s|$)|$)/g) ?? [];
  return parts
    .map((part) => part.replace(/\uE000/g, ".").trim())
    .filter(Boolean);
}

/** Length of a sentence in the unit its language is limited by. */
export function sentenceLength(
  sentence: string,
  lang: DraftLanguage,
): { count: number; unit: "words" | "characters" } {
  if (lang === "en") {
    return {
      count: sentence.match(/[A-Za-z0-9][\w'’-]*/g)?.length ?? 0,
      unit: "words",
    };
  }
  let wide = 0;
  for (const char of sentence) {
    if (isWide(char) && !/[，。！？；：、（）「」『』“”‘’《》·]/.test(char))
      wide++;
  }
  // A Latin word inside CJK prose reads as about two characters.
  const latin = sentence.match(/[A-Za-z0-9][\w'’-]*/g)?.length ?? 0;
  return { count: wide + latin * 2, unit: "characters" };
}

function clean(text: string): string {
  return text
    .replace(/~~[^~]*~~/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,3}/g, "");
}

function checkUnit(
  text: string,
  line: number,
  kind: Kind,
  draftLang: DraftLanguage,
  out: LintWarning[],
): number {
  const sentences = splitSentences(text);
  for (const sentence of sentences) {
    // A sentence is judged in its own language: a Korean draft may quote an
    // English sentence, and the reverse.
    const own = detectLanguage(sentence);
    const lang = own === "en" || draftLang === "en" ? own : draftLang;
    const { count, unit } = sentenceLength(sentence, lang);
    const limit = LIMITS[lang][kind];
    if (count > limit) {
      const preview =
        sentence.length > 28 ? `${sentence.slice(0, 28)}…` : sentence;
      out.push({
        line,
        rule: "sentence-length",
        message: `${kind} has ${count} ${unit} (max ${limit}): "${preview}"`,
        suggestion: "split it into two sentences",
      });
    }
    if (lang === "en") {
      const passive = EN_PASSIVE.exec(sentence);
      if (passive) {
        out.push({
          line,
          rule: "passive",
          message: `possible passive voice: "${passive[0]}"`,
          suggestion: "name who does it",
        });
      }
      for (const [re, suggestion] of EN_WORDS) {
        for (const match of sentence.matchAll(re)) {
          out.push({
            line,
            rule: "word",
            message: `plain word available for "${match[0]}"`,
            suggestion,
          });
        }
      }
    }
    if (lang === "ko") {
      for (const pattern of KO_PATTERNS) {
        for (const match of sentence.matchAll(pattern.re)) {
          out.push({
            line,
            rule: pattern.rule,
            message: `${pattern.message}: "${match[0].trim()}"`,
            suggestion: pattern.suggestion,
          });
        }
      }
      for (const pattern of KO_REPEATED) {
        const hits = sentence.match(pattern.re)?.length ?? 0;
        if (hits >= (pattern.rule === "jeok-chain" ? 3 : 2)) {
          out.push({
            line,
            rule: pattern.rule,
            message: pattern.message,
            suggestion: pattern.suggestion,
          });
        }
      }
    }
    if (lang === "zh") {
      if ((sentence.match(/的/g) ?? []).length >= 4) {
        out.push({
          line,
          rule: "de-chain",
          message: "一句里“的”出现四次以上",
          suggestion: "拆成两句，或删去多余的“的”",
        });
      }
      for (const cliche of ZH_CLICHES) {
        if (sentence.includes(cliche)) {
          out.push({
            line,
            rule: "cliche",
            message: `套话“${cliche}”`,
            suggestion: "删掉，或换成具体事实",
          });
        }
      }
    }
  }
  return sentences.length;
}

function lintMarkdown(
  text: string,
  startLine: number,
  lang: DraftLanguage,
  out: LintWarning[],
): void {
  let paragraph: { line: number; count: number } | undefined;
  const flush = () => {
    if (paragraph && paragraph.count > MAX_SENTENCES) {
      out.push({
        line: paragraph.line,
        rule: "paragraph-length",
        message: `paragraph has ${paragraph.count} sentences (max ${MAX_SENTENCES})`,
        suggestion: "split it, or turn it into a list or a table",
      });
    }
    paragraph = undefined;
  };
  let fenced = false;
  text.split("\n").forEach((raw, index) => {
    const line = startLine + index;
    const trimmed = raw.trim();
    if (/^`{3,}/.test(trimmed)) {
      fenced = !fenced;
      flush();
      return;
    }
    if (fenced || !trimmed || /^#{1,6}\s/.test(trimmed)) {
      flush();
      return;
    }
    if (trimmed.includes("|") && /^\|/.test(trimmed)) {
      flush();
      if (/^\|?[\s:|-]+\|?$/.test(trimmed)) return;
      const cells = trimmed
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());
      if (cells.some((cell) => /^no(\s|$)/i.test(cell))) return;
      for (const cell of cells) {
        checkUnit(
          clean(cell.replace(/^(ok|warn)(\s|$)/i, "")),
          line,
          "sentence",
          lang,
          out,
        );
      }
      return;
    }
    const item = /^(?:([-*+])|(\d+)[.)])\s+(.*)$/.exec(trimmed);
    if (item) {
      flush();
      checkUnit(
        clean(item[3] ?? ""),
        line,
        item[2] ? "step" : "sentence",
        lang,
        out,
      );
      return;
    }
    const count = checkUnit(
      clean(trimmed.replace(/^>\s*/, "")),
      line,
      "sentence",
      lang,
      out,
    );
    paragraph ??= { line, count: 0 };
    paragraph.count += count;
  });
  flush();
}

export function lintDraft(draft: Draft, lang: DraftLanguage): LintWarning[] {
  const warnings: LintWarning[] = [];
  const blocks: DraftBlock[] = [
    ...draft.lead,
    ...draft.panels.flatMap((panel) => panel.blocks),
  ];
  for (const block of blocks) {
    if (block.type === "markdown") {
      lintMarkdown(block.text, block.line, lang, warnings);
    } else if (block.name === "callout") {
      lintMarkdown(block.text, block.line + 1, lang, warnings);
    }
  }
  return warnings;
}

export function formatWarning(warning: LintWarning): string {
  return `L${warning.line} [${warning.rule}] ${warning.message}${warning.suggestion ? ` → ${warning.suggestion}` : ""}`;
}
