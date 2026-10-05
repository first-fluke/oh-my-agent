import type { PhrasingContent, Root, RootContent } from "mdast";
import type { Draft, DraftBlock } from "./draft.js";
import { cellStatus, parseMarkdown, STATUS_RE } from "./markdown.js";
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

// Short, common words with one meaning each, in the spirit of ASD-STE100.
const EN_WORDS: Array<[RegExp, string]> = (
  [
    ["in order to", "to"],
    ["due to the fact that", "because"],
    ["in the event that", "if"],
    ["at this point in time", "now"],
    ["a number of", "some / the exact number"],
    ["with regard to", "about"],
    ["with respect to", "about"],
    ["in addition", "also"],
    ["it should be noted that", "delete it"],
    ["it is important to note that", "delete it"],
    ["prior to", "before"],
    ["subsequent to", "after"],
    ["subsequently", "then"],
    ["utili[sz]e[sd]?", "use"],
    ["utili[sz]ing", "using"],
    ["utili[sz]ation", "use"],
    ["leverag(?:e|es|ed|ing)", "use"],
    ["facilitat(?:e|es|ed|ing)", "help / let"],
    ["commenc(?:e|es|ed|ing)", "start"],
    ["initiat(?:e|es|ed|ing)", "start"],
    ["terminat(?:e|es|ed|ing)", "stop / end"],
    ["approximately", "about"],
    ["numerous", "many"],
    ["sufficient", "enough"],
    ["ensure[sd]?", "make sure"],
    ["replenish(?:es|ed|ing)?", "fill"],
    ["endeavou?r(?:s|ed|ing)?", "try"],
    ["ascertain(?:s|ed|ing)?", "find"],
    ["demonstrat(?:e|es|ed|ing)", "show"],
    ["assist(?:s|ed|ing)?", "help"],
    ["obtain(?:s|ed|ing)?", "get"],
    ["modif(?:y|ies|ied|ying)", "change"],
    ["possess(?:es|ed|ing)?", "have"],
    ["purchas(?:e|es|ed|ing)", "buy"],
    ["seamless(?:ly)?", "say what works without a step"],
    ["robust", "say what it survives"],
    ["delv(?:e|es|ed|ing)", "look at"],
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

/** Wrong spellings and vague amounts; each has one correct form. */
const KO_WORDS: Array<[RegExp, string]> = [
  [/됬/g, "됐"],
  [/몇\s?일(?![가-힣])/g, "며칠"],
  [/할께|갈께|볼께|줄께/g, "'-ㄹ게'로 쓴다 (할게)"],
  [/않\s?되/g, "안 되"],
  [/웬지/g, "왠지"],
  [/금새/g, "금세"],
  [/어떻해/g, "어떡해 / 어떻게 해"],
  [/최대한\s?빨리|조만간|가급적\s?빨리/g, "기한을 구체적으로 쓴다"],
  [/여러\s?번|수차례/g, "횟수를 쓴다"],
];

// Japanese: phrases that add length without meaning.
const JA_PATTERNS: Pattern[] = [
  {
    re: /することができ/g,
    rule: "wordy",
    message: "冗長な「することができる」",
    suggestion: "「できる」と書く",
  },
  {
    re: /を(?:行|おこな)[いうっ]/g,
    rule: "light-verb",
    message: "名詞 +「を行う」",
    suggestion: "動詞を直接使う（検証を行う → 検証する）",
  },
  {
    re: /という(?:こと|もの|形)/g,
    rule: "wordy",
    message: "冗長な「という〜」",
    suggestion: "削るか、具体的に書く",
  },
];

// Chinese controlled writing. The selection of light verbs, clichés, and
// non-approved words follows the Simplified Technical Chinese word list
// (github.com/mzopedia/simplified-technical-chinese) as used by
// answer-me-with-html: only the entries that are almost never wrong.
const ZH_LIGHT_VERBS: Array<[RegExp, string]> = [
  [/进行(?![中时])了?([一-龥]{2})/g, "进行"],
  [/(?:加以|予以)([一-龥]{2})/g, "加以/予以"],
  [/[做作]出了?([一-龥]{2})/g, "做出"],
];
const ZH_CLICHES = [
  "赋能",
  "抓手",
  "闭环",
  "打通",
  "全方位",
  "多维度",
  "深度融合",
  "显著提升",
  "至关重要",
  "不可或缺",
  "与此同时",
  "综上所述",
  "值得注意的是",
  "总而言之",
  "众所周知",
  "毋庸置疑",
  "不言而喻",
  "一站式",
  "底层逻辑",
  "颗粒度",
  "方法论",
];
const ZH_UNIT =
  "(?:个|次|秒|天|分钟|小时|倍|字|条|项|人|行|位|%|MB|GB|KB|TB|ms)?";
const ZH_WORDS: Array<[RegExp, string]> = [
  // Wrong characters.
  [/登陆/g, "登录"],
  [/帐号/g, "账号"],
  [/阀值/g, "阈值"],
  [/布署/g, "部署"],
  // Amounts without a number.
  [/尽快/g, "写出具体期限"],
  [/若干/g, "写出数量"],
  [/大概|大约/g, "说明用“约”，步骤里写数值"],
  [/多次/g, "写出次数"],
  // After a number, 以上 / 以下 / 以内 do not say whether the end is included.
  [
    new RegExp(`(?<=\\d\\s*${ZH_UNIT}\\s*)(?:以上|以下)`, "g"),
    "写明端点：大于 / 不小于，小于 / 不大于",
  ],
  [/(?<=\d[^。，；\n]{0,6})以内/g, "不超过"],
  // One meaning, one word.
  [/单击|点按/g, "点击"],
  [/键入/g, "输入"],
  [/登出/g, "退出登录"],
  [/入参/g, "参数"],
  [/出参/g, "返回值"],
  [/缺省/g, "默认"],
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

/**
 * The words of a run of inline nodes that the author wrote as prose: code
 * spans and ~~struck~~ counter-examples are left out, a link keeps its text.
 */
function proseOf(nodes: PhrasingContent[]): string {
  return nodes
    .map((node): string => {
      switch (node.type) {
        case "text":
          return node.value;
        case "emphasis":
        case "strong":
        case "link":
        case "linkReference":
          return proseOf(node.children);
        case "break":
          return "\n";
        default:
          return "";
      }
    })
    .join("");
}

function checkUnit(
  text: string,
  line: number,
  kind: Kind,
  draftLang: DraftLanguage,
  out: LintWarning[],
): number {
  const sentences = splitSentences(text);
  let cursor = 0;
  const first = line;
  for (const sentence of sentences) {
    // A paragraph can run over several lines; report the sentence's own.
    const found = text.indexOf(sentence.slice(0, 12), cursor);
    if (found !== -1) cursor = found;
    line = first + (text.slice(0, cursor).match(/\n/g)?.length ?? 0);
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
    if (lang === "ko") {
      for (const [re, suggestion] of KO_WORDS) {
        for (const match of sentence.matchAll(re)) {
          out.push({
            line,
            rule: "word",
            message: `"${match[0]}"`,
            suggestion,
          });
        }
      }
    }
    if (lang === "ja") {
      for (const pattern of JA_PATTERNS) {
        for (const match of sentence.matchAll(pattern.re)) {
          out.push({
            line,
            rule: pattern.rule,
            message: `${pattern.message}: "${match[0]}"`,
            suggestion: pattern.suggestion,
          });
        }
      }
    }
    if (lang === "zh") {
      if ((sentence.match(/的/g) ?? []).length >= 3) {
        out.push({
          line,
          rule: "de-chain",
          message: "一句里“的”出现三次以上",
          suggestion: "拆成两句，或删去多余的“的”",
        });
      }
      for (const [re, name] of ZH_LIGHT_VERBS) {
        for (const match of sentence.matchAll(re)) {
          out.push({
            line,
            rule: "light-verb",
            message: `虚化动词“${match[0]}”（${name}）`,
            suggestion: `直接用“${match[1]}”`,
          });
        }
      }
      for (const [re, suggestion] of ZH_WORDS) {
        for (const match of sentence.matchAll(re)) {
          out.push({
            line,
            rule: "word",
            message: `不推荐“${match[0]}”`,
            suggestion,
          });
        }
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
  const lineOf = (node: RootContent) =>
    startLine + (node.position?.start.line ?? 1) - 1;
  const visit = (node: Root | RootContent, kind: Kind): void => {
    switch (node.type) {
      case "paragraph": {
        const count = checkUnit(
          proseOf(node.children),
          lineOf(node),
          kind,
          lang,
          out,
        );
        if (count > MAX_SENTENCES) {
          out.push({
            line: lineOf(node),
            rule: "paragraph-length",
            message: `paragraph has ${count} sentences (max ${MAX_SENTENCES})`,
            suggestion: "split it, or turn it into a list or a table",
          });
        }
        return;
      }
      case "list":
        // A numbered item is a step: one instruction, a shorter limit.
        for (const item of node.children) {
          for (const child of item.children) {
            visit(child, node.ordered ? "step" : "sentence");
          }
        }
        return;
      case "table":
        for (const row of node.children) {
          const cells = row.children.map((cell) => proseOf(cell.children));
          // A row marked `no` shows what not to write.
          if (cells.some((cell) => cellStatus(cell) === "no")) continue;
          for (const cell of cells) {
            checkUnit(
              cell.replace(STATUS_RE, ""),
              lineOf(row),
              "sentence",
              lang,
              out,
            );
          }
        }
        return;
      case "root":
      case "blockquote":
      case "footnoteDefinition":
        for (const child of node.children) visit(child, kind);
        return;
      default:
      // Headings, code, rules, and raw markup are not prose.
    }
  };
  visit(parseMarkdown(text), "sentence");
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
