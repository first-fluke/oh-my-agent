// Page styles. A theme is a set of CSS variables; components only ever read
// variables, so every theme and both colour modes apply to every component.
// A page carries every theme, and the reader can switch between them.

export const THEMES = ["blueprint", "card"] as const;
export type ThemeName = (typeof THEMES)[number];

interface Palette {
  /** Page ground. */
  bg: string;
  /** Panel surface. */
  panel: string;
  /** Recessed surface: code, table heads, tracks. */
  sunken: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentSoft: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  no: string;
  noSoft: string;
}

// Blueprint — Drafting Paper (#f5f7fa), Graphite Ink (#1b2430),
// Signal Blue (#1d5bd0); dark: Night Slate (#11161d), Sky Trace (#82b1ff).
const BLUEPRINT_LIGHT: Palette = {
  bg: "#f5f7fa",
  panel: "#ffffff",
  sunken: "#eef1f6",
  ink: "#1b2430",
  muted: "#566273",
  line: "#d3d9e2",
  accent: "#1d5bd0",
  accentSoft: "#e5edfc",
  ok: "#17694a",
  okSoft: "#e1f3ea",
  warn: "#8a5300",
  warnSoft: "#fbefd9",
  no: "#b3261e",
  noSoft: "#fbe6e4",
};
const BLUEPRINT_DARK: Palette = {
  bg: "#11161d",
  panel: "#19202a",
  sunken: "#212a36",
  ink: "#e6ebf2",
  muted: "#a0acbc",
  line: "#33404f",
  accent: "#82b1ff",
  accentSoft: "#1d2e4b",
  ok: "#62d3a2",
  okSoft: "#173529",
  warn: "#f2c261",
  warnSoft: "#3a2e14",
  no: "#ff8f85",
  noSoft: "#40201d",
};

// Card — Warm Paper (#f6f3ee), Espresso Ink (#26211c), Deep Teal (#0c6464);
// dark: Charcoal (#171513), Mint Trace (#6fd3c5).
const CARD_LIGHT: Palette = {
  bg: "#f6f3ee",
  panel: "#fffdfa",
  sunken: "#f0ebe3",
  ink: "#26211c",
  muted: "#665d52",
  line: "#e0d8cc",
  accent: "#0c6464",
  accentSoft: "#ddf0ee",
  ok: "#1b6b3f",
  okSoft: "#e3f2e7",
  warn: "#8a5300",
  warnSoft: "#faeed8",
  no: "#ac2a20",
  noSoft: "#f9e5e1",
};
const CARD_DARK: Palette = {
  bg: "#171513",
  panel: "#201d1a",
  sunken: "#2a2622",
  ink: "#efe9e1",
  muted: "#b0a698",
  line: "#3d3731",
  accent: "#6fd3c5",
  accentSoft: "#1a3532",
  ok: "#74d39a",
  okSoft: "#1a3323",
  warn: "#efc062",
  warnSoft: "#392d14",
  no: "#ff9386",
  noSoft: "#3f201c",
};

const PALETTES: Record<ThemeName, { light: Palette; dark: Palette }> = {
  blueprint: { light: BLUEPRINT_LIGHT, dark: BLUEPRINT_DARK },
  card: { light: CARD_LIGHT, dark: CARD_DARK },
};

function tokens(palette: Palette): string {
  return [
    `--oe-bg:${palette.bg}`,
    `--oe-panel:${palette.panel}`,
    `--oe-sunken:${palette.sunken}`,
    `--oe-ink:${palette.ink}`,
    `--oe-muted:${palette.muted}`,
    `--oe-line:${palette.line}`,
    `--oe-accent:${palette.accent}`,
    `--oe-accent-soft:${palette.accentSoft}`,
    `--oe-ok:${palette.ok}`,
    `--oe-ok-soft:${palette.okSoft}`,
    `--oe-warn:${palette.warn}`,
    `--oe-warn-soft:${palette.warnSoft}`,
    `--oe-no:${palette.no}`,
    `--oe-no-soft:${palette.noSoft}`,
  ].join(";");
}

const SHAPE: Record<ThemeName, string> = {
  blueprint:
    "--oe-radius:4px;--oe-shadow:none;--oe-head-case:uppercase;--oe-head-track:.03em;--oe-grid-line:var(--oe-line);--oe-frame:1px solid var(--oe-ink);--oe-frame-pad:26px;--oe-ruler:flex",
  card: "--oe-radius:14px;--oe-shadow:0 1px 2px rgb(0 0 0 / .05),0 6px 18px rgb(0 0 0 / .05);--oe-head-case:none;--oe-head-track:0;--oe-grid-line:transparent;--oe-frame:0 solid transparent;--oe-frame-pad:0px;--oe-ruler:none",
};

const SANS = `"Pretendard Variable",Pretendard,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Apple SD Gothic Neo","Noto Sans CJK KR","Noto Sans KR","PingFang SC","Microsoft YaHei",sans-serif`;
// Japanese pages name Japanese fonts first: a Chinese font ahead of them would
// draw shared Han characters with Chinese glyph shapes.
const SANS_JA = `system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic",Meiryo,"Noto Sans CJK JP","Noto Sans JP",Roboto,sans-serif`;
const SANS_ZH = `system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",Roboto,sans-serif`;
const MONO = `ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,"Liberation Mono",monospace`;

const BASE = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--oe-bg);color:var(--oe-ink);font-family:var(--oe-sans);font-size:16px;line-height:1.6;
  background-image:linear-gradient(var(--oe-grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--oe-grid-line) 1px,transparent 1px);background-size:32px 32px;background-attachment:fixed}
body::before{content:"";position:fixed;inset:0;background:var(--oe-bg);opacity:.86;pointer-events:none;z-index:-1}
.oe-page{max-width:1320px;margin:0 auto;padding:24px 16px 48px}
a{color:var(--oe-accent);text-underline-offset:2px}
:focus-visible{outline:2px solid var(--oe-accent);outline-offset:2px}
img{max-width:100%;height:auto}
hr{border:0;border-top:1px solid var(--oe-line);margin:14px 0}
code,pre,kbd{font-family:var(--oe-mono);font-size:.875em}
code{background:var(--oe-sunken);border-radius:4px;padding:.1em .35em;overflow-wrap:anywhere}
pre{margin:0;padding:12px 14px;background:var(--oe-sunken);border-radius:var(--oe-radius);white-space:pre;line-height:1.5;min-width:max-content}
pre code{background:none;padding:0;font-size:1em;overflow-wrap:normal}
.oe-code-add{color:var(--oe-ok);background:var(--oe-ok-soft);display:block}
.oe-code-del{color:var(--oe-no);background:var(--oe-no-soft);display:block}
.oe-code-hunk{color:var(--oe-muted);display:block}
.oe-scroll{overflow-x:auto;max-width:100%}
.oe-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}

.oe-header{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:flex-start;justify-content:space-between;padding-bottom:16px;margin-bottom:16px;border-bottom:2px solid var(--oe-ink)}
.oe-header>div:first-child{min-width:0;flex:1 1 320px}
.oe-header h1{margin:0;font-size:clamp(1.5rem,1.1rem + 1.6vw,2.125rem);line-height:1.2;letter-spacing:-.01em;overflow-wrap:anywhere}
.oe-subtitle{margin:6px 0 0;color:var(--oe-muted);font-size:1.0625rem}
.oe-meta{margin:8px 0 0;color:var(--oe-muted);font:500 .8125rem/1.5 var(--oe-mono);display:flex;flex-wrap:wrap;gap:2px 16px}
.oe-meta b{font-weight:600;color:var(--oe-ink)}
.oe-tools{display:flex;flex-wrap:wrap;gap:8px}
.oe-tools button{font:inherit;font-size:.8125rem;min-height:36px;padding:6px 12px;border:1px solid var(--oe-line);border-radius:var(--oe-radius);background:var(--oe-panel);color:var(--oe-ink);cursor:pointer;transition:background-color .15s}
.oe-tools button:hover{background:var(--oe-sunken)}
.oe-lead{max-width:76ch;margin:0 0 20px;font-size:1.0625rem}
.oe-lead>*{margin:0}
.oe-lead>*+*{margin-top:10px}

.oe-frame{position:relative;border:var(--oe-frame);padding:var(--oe-frame-pad)}
.oe-ruler{display:var(--oe-ruler);position:absolute;font:500 .625rem/1 var(--oe-mono);color:var(--oe-muted)}
.oe-ruler span{flex:1;display:flex;align-items:center;justify-content:center}
.oe-ruler-top,.oe-ruler-bottom{left:26px;right:26px;height:26px}
.oe-ruler-top{top:0}
.oe-ruler-bottom{bottom:0}
.oe-ruler-left,.oe-ruler-right{top:26px;bottom:26px;width:26px;flex-direction:column}
.oe-ruler-left{left:0}
.oe-ruler-right{right:0}
.oe-ruler-top span+span,.oe-ruler-bottom span+span{border-left:1px solid var(--oe-line)}
.oe-ruler-left span+span,.oe-ruler-right span+span{border-top:1px solid var(--oe-line)}

.oe-grid{display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr));gap:16px;align-items:stretch}
.oe-panel{min-width:0;background:var(--oe-panel);border:1px solid var(--oe-line);border-radius:var(--oe-radius);box-shadow:var(--oe-shadow);display:flex;flex-direction:column;scroll-margin-top:16px}
.oe-panel-head{display:flex;align-items:baseline;gap:10px;padding:10px 16px;border-bottom:1px solid var(--oe-line)}
.oe-panel-id{flex:none;font:700 .75rem/1 var(--oe-mono);color:var(--oe-panel);background:var(--oe-ink);padding:4px 6px;border-radius:3px}
.oe-panel-head h2{margin:0;font:600 .9375rem/1.35 var(--oe-sans);text-transform:var(--oe-head-case);letter-spacing:var(--oe-head-track);overflow-wrap:anywhere}
.oe-panel-note{margin-left:auto;color:var(--oe-muted);font:500 .75rem/1.35 var(--oe-mono);text-align:right}
.oe-panel-body{padding:14px 16px 16px;min-width:0;flex:1}
.oe-panel-body>*{margin:0}
.oe-panel-body>*+*{margin-top:12px}
.oe-panel-body p,.oe-lead p,blockquote p,li p{margin:0}
.oe-panel-body p+p,li p+p,blockquote>*+*{margin-top:10px}
.oe-panel-body h3{font-size:1.0625rem;line-height:1.35;margin-top:18px}
.oe-panel-body h4{font-size:.9375rem;margin-top:16px}
.oe-panel-body h5,.oe-panel-body h6{font-size:.8125rem;text-transform:uppercase;letter-spacing:.04em;color:var(--oe-muted);margin-top:14px}
.oe-panel-body ul,.oe-panel-body ol,.oe-lead ul,.oe-lead ol{padding-left:1.3em}
.oe-panel-body li+li{margin-top:4px}
li>ul,li>ol{margin-top:4px}
.oe-task-item{list-style:none;margin-left:-1.3em}
.oe-task{display:inline-grid;place-items:center;width:15px;height:15px;margin-right:8px;border:1.5px solid var(--oe-muted);border-radius:3px;font-size:.6875rem;line-height:1;vertical-align:-2px}
.oe-task-done{background:var(--oe-accent);border-color:var(--oe-accent);color:var(--oe-panel)}
blockquote{margin:0;padding:8px 14px;border-left:3px solid var(--oe-accent);background:var(--oe-accent-soft);border-radius:0 var(--oe-radius) var(--oe-radius) 0}
.oe-fn-ref{font-size:.75em;color:var(--oe-muted)}
.oe-footnotes{font-size:.8125rem;color:var(--oe-muted);border-top:1px solid var(--oe-line);padding-top:8px}
.oe-archify{display:inline-flex;align-items:center;gap:6px;font-size:.875rem;font-weight:600}

table{border-collapse:collapse;width:100%;font-size:.9375rem}
th,td{min-width:4.5em;padding:7px 10px;border-bottom:1px solid var(--oe-line);text-align:left;vertical-align:top}
th{background:var(--oe-sunken);font-weight:600;font-size:.8125rem;white-space:nowrap}
tbody tr:last-child td{border-bottom:0}
.oe-status{display:inline-flex;align-items:baseline;gap:6px}
.oe-status>b{flex:none;display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;font-size:.6875rem;line-height:1;transform:translateY(-1px)}
.oe-status-ok>b{background:var(--oe-ok-soft);color:var(--oe-ok)}
.oe-status-warn>b{background:var(--oe-warn-soft);color:var(--oe-warn)}
.oe-status-no>b{background:var(--oe-no-soft);color:var(--oe-no)}

.oe-diagram{display:flex;justify-content:safe center}
.oe-diagram svg{display:block;flex:none;font-family:var(--oe-sans)}
.oe-node{fill:var(--oe-panel);stroke:var(--oe-ink);stroke-width:1.25}
.oe-node-em{fill:var(--oe-accent);stroke:var(--oe-accent)}
.oe-node-line{stroke:var(--oe-ink);stroke-width:1.25}
.oe-node-em+.oe-node-line{stroke:var(--oe-panel)}
.oe-node-t{fill:var(--oe-ink);font-weight:550}
.oe-node-t-em{fill:var(--oe-panel)}
.oe-edge{stroke:var(--oe-muted);stroke-width:1.25}
.oe-edge-dashed{stroke-dasharray:5 4}
.oe-arrow{fill:var(--oe-muted)}
.oe-edge-bg{fill:var(--oe-panel)}
.oe-edge-t{fill:var(--oe-muted)}
.oe-seq-t{fill:var(--oe-ink)}
.oe-group{fill:var(--oe-accent-soft);stroke:var(--oe-accent);stroke-width:1;stroke-dasharray:4 3;fill-opacity:.55}
.oe-group-t{fill:var(--oe-accent);font-weight:700;letter-spacing:.04em}
.oe-seq-life,.oe-seq-rule{stroke:var(--oe-line);stroke-width:1.25;stroke-dasharray:3 4;fill:none}
.oe-seq-rule{stroke:var(--oe-muted)}
.oe-seq-note{fill:var(--oe-warn-soft);stroke:var(--oe-warn);stroke-width:1}
.oe-seq-note-t{fill:var(--oe-ink)}
.oe-seq-divider{fill:var(--oe-sunken);stroke:var(--oe-muted);stroke-width:1}
.oe-seq-divider-t{fill:var(--oe-ink);font-weight:600}
.oe-seq-step{fill:var(--oe-muted);font-family:var(--oe-mono)}

.oe-tree{font-size:.9375rem}
.oe-tree ul{list-style:none;margin:0;padding:0!important}
.oe-tree ul ul{margin-left:7px;padding-left:14px!important;border-left:1px solid var(--oe-line)}
.oe-tree li{margin:0!important;padding:2px 0}
.oe-tree-row{display:flex;flex-wrap:wrap;gap:0 12px;align-items:baseline}
.oe-tree-name{overflow-wrap:anywhere}
.oe-tree-dir{font-weight:700}
.oe-tree-em>.oe-tree-row>.oe-tree-name{color:var(--oe-accent);font-weight:700}
.oe-tree-note{color:var(--oe-muted);font-size:.8125rem}
.oe-tree-tag{font:600 .6875rem/1 var(--oe-mono);color:var(--oe-muted);background:var(--oe-sunken);border-radius:3px;padding:2px 5px;margin-right:6px}
.oe-tree-files{font:500 .875rem/1.5 var(--oe-mono)}
.oe-tree-files .oe-tree-note{font-family:var(--oe-sans)}
.oe-tree-root{display:flex;justify-content:center;padding-bottom:18px;position:relative}
.oe-tree-root::after{content:"";position:absolute;left:50%;bottom:0;height:18px;border-left:1px solid var(--oe-muted)}
.oe-tree-root-solo{justify-content:flex-start;padding-bottom:10px}
.oe-tree-root-solo::after{display:none}
.oe-tree-box{border:1px solid var(--oe-ink);border-radius:var(--oe-radius);background:var(--oe-panel);padding:6px 12px;font-weight:600;text-align:center;min-width:0;overflow-wrap:anywhere}
.oe-tree-box small{display:block;font-weight:400;font-size:.75rem;color:var(--oe-muted)}
.oe-tree-box-root{background:var(--oe-ink);color:var(--oe-panel)}
.oe-tree-box-root small{color:inherit;opacity:.8}
.oe-tree-box-em{background:var(--oe-accent);border-color:var(--oe-accent);color:var(--oe-panel)}
.oe-tree-box-em small{color:inherit;opacity:.85}
.oe-tree-cols{display:grid;grid-template-columns:repeat(var(--n,1),minmax(0,1fr));gap:0 12px}
.oe-tree-org .oe-tree-col{position:relative;padding-top:18px}
.oe-tree-org .oe-tree-col::before{content:"";position:absolute;top:0;left:-6px;right:-6px;border-top:1px solid var(--oe-muted)}
.oe-tree-org .oe-tree-col:first-child::before{left:50%}
.oe-tree-org .oe-tree-col:last-child::before{right:50%}
.oe-tree-org .oe-tree-col::after{content:"";position:absolute;top:0;left:50%;height:18px;border-left:1px solid var(--oe-muted)}
.oe-tree-col>.oe-tree-list{margin-top:8px;padding-left:6px!important}

.oe-timeline{list-style:none;margin:0;padding:0!important}
.oe-timeline li{margin:0!important}
.oe-timeline-v li{position:relative;display:grid;grid-template-columns:minmax(64px,max-content) 1fr;gap:4px 16px;padding:0 0 14px 20px}
.oe-timeline-v li::before{content:"";position:absolute;left:4px;top:.55em;bottom:-.55em;border-left:1px solid var(--oe-line)}
.oe-timeline-v li:last-child{padding-bottom:0}
.oe-timeline-v li:last-child::before{display:none}
.oe-timeline-v .oe-tl-dot{position:absolute;left:0;top:.45em}
.oe-tl-dot{width:9px;height:9px;border-radius:50%;background:var(--oe-panel);border:2px solid var(--oe-muted)}
.oe-tl-key .oe-tl-dot{background:var(--oe-accent);border-color:var(--oe-accent)}
.oe-tl-when{font:600 .8125rem/1.6 var(--oe-mono);color:var(--oe-muted)}
.oe-tl-body{display:flex;flex-direction:column;min-width:0}
.oe-tl-body span{color:var(--oe-muted);font-size:.875rem}
.oe-tl-key .oe-tl-when,.oe-tl-key strong{color:var(--oe-accent)}
.oe-timeline-h{display:grid;grid-template-columns:repeat(var(--n,1),minmax(0,1fr))}
.oe-timeline-h li{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:0 6px}
.oe-timeline-h li::before{content:"";position:absolute;left:0;right:0;top:calc(1.3rem + 10px);border-top:1px solid var(--oe-line)}
.oe-timeline-h li:first-child::before{left:50%}
.oe-timeline-h li:last-child::before{right:50%}
.oe-timeline-h .oe-tl-dot{position:relative;flex:none}
.oe-timeline-h .oe-tl-body{align-items:center}

.oe-limits{display:grid;gap:14px}
.oe-limit-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 12px;font-size:.875rem;font-weight:600}
.oe-limit-note{margin-left:8px;color:var(--oe-muted);font-weight:400}
.oe-limit-value{font-family:var(--oe-mono);font-size:.8125rem;font-weight:500}
.oe-limit-track{position:relative;height:12px;margin-top:6px;background:var(--oe-sunken);border-radius:2px}
.oe-limit-fill{height:100%;background:var(--oe-accent);border-radius:2px 0 0 2px}
.oe-limit-mark{position:absolute;top:-4px;bottom:-4px;border-left:2px solid var(--oe-ink)}
.oe-limit-ticks{position:relative;height:16px;font:500 .6875rem/16px var(--oe-mono);color:var(--oe-muted)}
.oe-limit-ticks span{position:absolute;transform:translateX(-50%)}
.oe-limit-ticks span:first-child{transform:none}
.oe-limit-ticks span:last-child{transform:translateX(-100%)}
.oe-limit-over .oe-limit-fill{background:var(--oe-no)}
.oe-limit-over .oe-limit-value{color:var(--oe-no)}

.oe-annot{display:grid;gap:8px}
.oe-annot+.oe-annot{margin-top:16px}
.oe-annot-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 12px;font-weight:600;font-size:.875rem}
.oe-annot-meta{font:500 .75rem/1.6 var(--oe-mono);color:var(--oe-muted)}
.oe-annot-line{font:500 14px/1.5 var(--oe-mono);white-space:pre;width:max-content;padding:8px 12px calc(var(--rows,0)*20px + 14px);background:var(--oe-sunken);border-radius:var(--oe-radius);min-width:100%}
.oe-annot-wrap{white-space:pre-wrap;overflow-wrap:anywhere;width:auto;padding-bottom:8px}
.oe-seg{position:relative;display:inline-block}
.oe-seg-text{border-bottom:2px solid var(--oe-accent)}
.oe-seg-note{position:absolute;left:0;top:calc(100% + 6px + var(--row,0)*20px);padding-left:7px;font:600 11px/14px var(--oe-sans);white-space:nowrap;color:var(--oe-accent)}
.oe-seg-note::before{content:"";position:absolute;left:1px;bottom:5px;height:calc(10px + var(--row,0)*20px);border-left:1px solid currentColor;opacity:.55}
.oe-seg-no .oe-seg-text{border-bottom-color:var(--oe-no);text-decoration:line-through;text-decoration-color:var(--oe-no)}
.oe-seg-no .oe-seg-note{color:var(--oe-no)}
.oe-annot-caption{color:var(--oe-muted);font-size:.875rem}

.oe-kv{margin:0;display:grid;grid-template-columns:repeat(var(--kv-cols,2),minmax(0,1fr));border-top:1px solid var(--oe-line);border-left:1px solid var(--oe-line);border-radius:var(--oe-radius);overflow:hidden}
.oe-kv-cell{border-right:1px solid var(--oe-line);border-bottom:1px solid var(--oe-line);padding:7px 10px 8px;min-width:0}
.oe-kv-wide{grid-column:1/-1}
.oe-kv dt{color:var(--oe-muted);font:500 .6875rem/1.4 var(--oe-mono);overflow-wrap:anywhere}
.oe-kv dd{margin:2px 0 0;font-weight:600;font-size:.9375rem;overflow-wrap:anywhere}
.oe-kv-wide dd{font-size:1.0625rem;font-weight:700}
.oe-kv-note{display:block;color:var(--oe-muted);font-weight:400;font-size:.8125rem}

.oe-callout{display:flex;gap:12px;padding:12px 14px;border:1px solid var(--oe-accent);border-left-width:4px;border-radius:var(--oe-radius);background:var(--oe-accent-soft)}
.oe-callout>div{min-width:0}
.oe-callout>div>*{margin:0}
.oe-callout>div>*+*{margin-top:6px}
.oe-callout-title{display:block}
.oe-callout-mark{flex:none;display:grid;place-items:center;width:22px;height:22px;margin-top:2px;border-radius:50%;background:var(--oe-accent);color:var(--oe-panel);font:700 .75rem/1 var(--oe-mono)}
.oe-callout-ok{border-color:var(--oe-ok);background:var(--oe-ok-soft)}
.oe-callout-ok .oe-callout-mark{background:var(--oe-ok)}
.oe-callout-warn{border-color:var(--oe-warn);background:var(--oe-warn-soft)}
.oe-callout-warn .oe-callout-mark{background:var(--oe-warn)}
.oe-callout-err{border-color:var(--oe-no);background:var(--oe-no-soft)}
.oe-callout-err .oe-callout-mark{background:var(--oe-no)}
.oe-callout-key{border-color:var(--oe-ink);background:var(--oe-sunken)}
.oe-callout-key .oe-callout-mark{background:var(--oe-ink)}

.oe-quiz{display:grid;gap:18px}
.oe-q-text{display:flex;gap:10px;font-weight:600}
.oe-q-number{flex:none;display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--oe-ink);color:var(--oe-panel);font:700 .75rem/1 var(--oe-mono)}
.oe-q-options{display:grid;gap:8px;margin-top:10px}
.oe-q-option{display:flex;gap:10px;align-items:baseline;font:inherit;text-align:left;min-height:44px;padding:8px 12px;border:1px solid var(--oe-line);border-radius:var(--oe-radius);background:var(--oe-panel);color:var(--oe-ink);cursor:pointer;transition:background-color .15s,border-color .15s}
.oe-q-letter{flex:none;font:700 .75rem/1 var(--oe-mono);color:var(--oe-muted)}
.oe-q-option:hover:not([aria-disabled]){border-color:var(--oe-accent);background:var(--oe-accent-soft)}
.oe-q-option[aria-disabled]{cursor:default}
.oe-q-right{border-color:var(--oe-ok);background:var(--oe-ok-soft)}
.oe-q-right::after{content:"✓";margin-left:auto;color:var(--oe-ok);font-weight:700}
.oe-q-wrong{border-color:var(--oe-no);background:var(--oe-no-soft)}
.oe-q-wrong::after{content:"✕";margin-left:auto;color:var(--oe-no);font-weight:700}
.oe-q-why{margin:0!important;font-size:.9375rem}
.oe-q-why-shown{margin-top:10px!important;padding:8px 12px;background:var(--oe-sunken);border-radius:var(--oe-radius)}
.oe-quiz-score{font:600 .875rem/1.5 var(--oe-mono);color:var(--oe-muted);min-height:1.5em}

.oe-doc{display:grid;grid-template-columns:210px minmax(0,1fr);gap:32px;align-items:start;max-width:1120px;margin:0 auto}
.oe-doc-plain{grid-template-columns:minmax(0,1fr);max-width:860px}
.oe-toc{position:sticky;top:20px;display:flex;flex-direction:column;font-size:.8125rem}
.oe-toc a{color:var(--oe-muted);text-decoration:none;padding:5px 0 5px 12px;border-left:2px solid var(--oe-line)}
.oe-toc a:hover{color:var(--oe-ink);border-left-color:var(--oe-accent)}
.oe-doc-body>.oe-panel+.oe-panel{margin-top:20px}
.oe-doc-body .oe-panel-body{font-size:1rem}

.oe-footer{margin-top:24px;padding-top:12px;border-top:1px solid var(--oe-line);color:var(--oe-muted);font:500 .75rem/1.6 var(--oe-mono);display:flex;flex-wrap:wrap;gap:4px 20px;justify-content:space-between}
.oe-source{display:none}

@media (min-width:761px){.oe-page{padding:32px 28px 56px}.oe-grid .oe-panel-body{font-size:.9375rem}}
@media (max-width:1100px){.oe-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.oe-grid>.oe-panel[style]{grid-column:span 2!important;grid-row:auto!important}}
@media (max-width:760px){
  .oe-grid{grid-template-columns:minmax(0,1fr)}
  .oe-grid>.oe-panel,.oe-grid>.oe-panel[style]{grid-column:auto!important}
  .oe-panel-note{flex-basis:100%;margin-left:0;text-align:left}
  .oe-panel-head{flex-wrap:wrap}
  .oe-frame{border:0;padding:0}
  .oe-ruler{display:none}
  .oe-doc{grid-template-columns:minmax(0,1fr)}
  .oe-toc{position:static}
  .oe-tree-cols{grid-template-columns:minmax(0,1fr);gap:10px}
  .oe-tree-org .oe-tree-col{padding-top:0}
  .oe-tree-org .oe-tree-col::before,.oe-tree-org .oe-tree-col::after,.oe-tree-root::after{display:none}
  .oe-tree-root{padding-bottom:10px}
  .oe-timeline-h{grid-template-columns:minmax(0,1fr);gap:12px}
  .oe-timeline-h li{align-items:flex-start;text-align:left;padding:0 0 0 20px;gap:2px}
  .oe-timeline-h li::before{left:4px!important;right:auto!important;top:.55em;bottom:-1.2em;border-top:0;border-left:1px solid var(--oe-line)}
  .oe-timeline-h li:last-child::before{display:none}
  .oe-timeline-h .oe-tl-dot{position:absolute;left:0;top:.45em}
  .oe-timeline-h .oe-tl-body{align-items:flex-start}
  .oe-kv{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
@media print{
  body{background:#fff;font-size:11pt}body::before{display:none}
  .oe-tools,.oe-toc{display:none}.oe-page{max-width:none;padding:0}
  .oe-doc{display:block}
  .oe-panel{box-shadow:none;break-inside:avoid}
  .oe-scroll{overflow:visible}
}
`;

/** The stylesheet: every theme's tokens in both colour modes, then components. */
export function themeCss(): string {
  const selector = (theme: ThemeName) =>
    theme === "blueprint" ? ":root" : `:root[data-oe-theme="${theme}"]`;
  const rules = [
    `:root{color-scheme:light;--oe-sans:${SANS};--oe-mono:${MONO}}`,
  ];
  for (const theme of THEMES) {
    rules.push(
      `${selector(theme)}{${SHAPE[theme]};${tokens(PALETTES[theme].light)}}`,
    );
  }
  for (const theme of THEMES) {
    const dark = tokens(PALETTES[theme].dark);
    rules.push(
      `@media (prefers-color-scheme:dark){${selector(theme)}:not([data-theme="light"]){color-scheme:dark;${dark}}}`,
      `${selector(theme)}[data-theme="dark"]{color-scheme:dark;${dark}}`,
    );
  }
  rules.push(
    // Korean breaks lines between words, not inside them.
    `:root[lang="ko"] body{word-break:keep-all;overflow-wrap:anywhere}`,
    `:root[lang="ja"]{--oe-sans:${SANS_JA}}`,
    `:root[lang^="zh"]{--oe-sans:${SANS_ZH}}`,
    BASE.trim(),
  );
  return rules.join("\n");
}
