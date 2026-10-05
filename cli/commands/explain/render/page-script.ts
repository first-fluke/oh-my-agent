// Script inlined into every rendered page. It is plain browser JavaScript kept
// as text, so the page does not depend on how the CLI itself is compiled.
// Neither source may contain a backtick, a dollar-brace, or a backslash.

/**
 * Row planner for the panel grid. Pure: no DOM access.
 *
 * planRows({ width, gap, cols, panels }) -> { rows: [{ columns: [{ panels: [index], width }], height }] }
 *
 *   width, gap   container width and the space between panels, px
 *   cols         the grid the author's `span` hints refer to
 *   panels[]     in reading order:
 *     samples    [{ w, h }] measured panel height at ascending widths
 *     minWidth   narrowest width at which the panel is still readable
 *     maxWidth   widest useful width; past it the panel only gains blank space
 *     natural    drawn width of the diagram, for a panel that is one diagram
 *     pad        panel width that is not diagram (padding, border)
 *     span       width hint in grid columns; span >= cols keeps the panel alone
 *
 * Rows keep reading order. A row is a list of columns; a column holds one
 * panel or two consecutive panels stacked. Row breaks come from dynamic
 * programming, column widths from a stepped search. A row costs its blank
 * area (columns shorter than the tallest, panels wider than useful) plus how
 * far each panel is from its hinted width and each diagram from natural size.
 * If nothing fits, every panel gets a full-width row.
 */
export const PLANNER_SOURCE = `
function planRows(input) {
  var width = input.width;
  var gap = input.gap || 0;
  var cols = Math.max(1, input.cols || 3);
  var panels = input.panels || [];
  function single() {
    return {
      rows: panels.map(function (_panel, index) {
        return { columns: [{ panels: [index], width: width }], height: 0 };
      })
    };
  }
  var usable = width > 0 && panels.length > 0 && panels.every(function (panel) {
    return panel && panel.samples && panel.samples.length > 0;
  });
  if (!usable) return single();

  var MAX_COLUMNS = Math.min(cols, 4);
  var unit = Math.max(1, (width - gap * (cols - 1)) / cols);
  var info = panels.map(function (panel) {
    var span = Math.max(1, panel.span || 1);
    return {
      samples: panel.samples,
      min: Math.min(width, Math.max(1, Math.ceil(panel.minWidth || 0))),
      max: panel.maxWidth > 0 ? panel.maxWidth : Infinity,
      natural: panel.natural > 0 ? panel.natural : 0,
      pad: panel.pad || 0,
      preferred: Math.min(width, span * unit + (span - 1) * gap),
      alone: span >= cols
    };
  });

  function heightAt(panel, at) {
    var w = Math.min(at, panel.max);
    var samples = panel.samples;
    var index = 0;
    while (index < samples.length && samples[index].w < w) index++;
    if (index === 0) return samples[0].h;
    if (index === samples.length) return samples[samples.length - 1].h;
    var a = samples[index - 1];
    var b = samples[index];
    return a.h + ((b.h - a.h) * (w - a.w)) / (b.w - a.w);
  }
  function columnHeight(column, w) {
    var total = gap * (column.length - 1);
    for (var k = 0; k < column.length; k++) total += heightAt(info[column[k]], w);
    return total;
  }

  function bestWidths(columns) {
    var avail = width - gap * (columns.length - 1);
    var mins = columns.map(function (column) {
      return Math.max.apply(null, column.map(function (k) { return info[k].min; }));
    });
    var rest = [];
    var sum = 0;
    for (var n = columns.length - 1; n >= 0; n--) {
      sum += mins[n];
      rest[n] = sum;
    }
    if (rest[0] > avail) return null;
    var step = Math.max(12, Math.round(avail / 40));
    var best = null;
    function evaluate(widths) {
      var heights = widths.map(function (w, n) { return columnHeight(columns[n], w); });
      var tallest = Math.max.apply(null, heights);
      var blank = 0;
      var drift = 0;
      widths.forEach(function (w, n) {
        blank += (tallest - heights[n]) * w;
        columns[n].forEach(function (k) {
          var panel = info[k];
          if (w > panel.max) blank += (w - panel.max) * heightAt(panel, w);
          var off = (w - panel.preferred) / unit;
          drift += off * off;
          if (panel.natural > 0) {
            var scale = Math.min(1, Math.max(w - panel.pad, 1) / panel.natural);
            var shrink = Math.log(scale) / Math.log(0.8);
            drift += 3 * shrink * shrink;
          }
        });
      });
      var cost = blank / 1000 + 0.15 * drift * tallest;
      if (!best || cost < best.cost) {
        best = { cost: cost, widths: widths, height: tallest, columns: columns };
      }
    }
    function choose(n, used, widths) {
      if (n === columns.length - 1) {
        var last = avail - used;
        if (last >= mins[n]) evaluate(widths.concat([last]));
        return;
      }
      for (var w = mins[n]; used + w + rest[n + 1] <= avail; w += step) {
        choose(n + 1, used + w, widths.concat([w]));
      }
    }
    choose(0, 0, []);
    return best;
  }

  // Every way to cut "count" consecutive panels into columns of one or two.
  function splits(count) {
    if (count === 0) return [[]];
    var out = [];
    [1, 2].forEach(function (size) {
      if (size > count) return;
      splits(count - size).forEach(function (tail) { out.push([size].concat(tail)); });
    });
    return out;
  }

  function bestRow(from, to) {
    if (to > from) {
      for (var k = from; k <= to; k++) if (info[k].alone) return null;
    }
    var best = null;
    splits(to - from + 1).forEach(function (split) {
      if (split.length > MAX_COLUMNS) return;
      var next = from;
      var columns = split.map(function (size) {
        var column = [];
        for (var c = 0; c < size; c++) column.push(next++);
        return column;
      });
      var found = bestWidths(columns);
      if (found && (!best || found.cost < best.cost)) best = found;
    });
    return best;
  }

  var count = panels.length;
  var total = [0];
  var cameFrom = [-1];
  var chosen = [null];
  for (var end = 1; end <= count; end++) {
    total[end] = Infinity;
    cameFrom[end] = -1;
    chosen[end] = null;
    for (var start = Math.max(0, end - 2 * MAX_COLUMNS); start < end; start++) {
      if (total[start] === Infinity) continue;
      var row = bestRow(start, end - 1);
      if (row && total[start] + row.cost < total[end]) {
        total[end] = total[start] + row.cost;
        cameFrom[end] = start;
        chosen[end] = row;
      }
    }
  }
  if (total[count] === Infinity) return single();
  var rows = [];
  for (var at = count; at > 0; at = cameFrom[at]) {
    var picked = chosen[at];
    rows.unshift({
      columns: picked.columns.map(function (column, n) {
        return { panels: column, width: picked.widths[n] };
      }),
      height: picked.height
    });
  }
  return { rows: rows };
}
`;

/** Theme toggle, print, quizzes, and the DOM side of the row planner. */
export const PAGE_SOURCE = `
(function () {
  "use strict";
  var root = document.documentElement;
  var strings = {};
  try {
    strings = JSON.parse(document.getElementById("oe-strings").textContent);
  } catch (error) {}

  // Theme: the reader's choice wins over the page default and the system.
  var THEME_KEY = "oma-explain-theme";
  var listeners = [];
  function readTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (error) { return null; }
  }
  function effectiveTheme() {
    var set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  var saved = readTheme();
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  var themeButton = document.querySelector('[data-oe="theme"]');
  if (themeButton) {
    themeButton.addEventListener("click", function () {
      var next = effectiveTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (error) {}
      listeners.forEach(function (listener) { listener(); });
    });
  }
  var printButton = document.querySelector('[data-oe="print"]');
  if (printButton) {
    printButton.addEventListener("click", function () { window.print(); });
  }

  // Quiz: options are shuffled on every load, so no position can be learned.
  // Letters are assigned after the shuffle; feedback travels with its option.
  Array.prototype.forEach.call(document.querySelectorAll("[data-quiz]"), function (quiz) {
    var questions = quiz.querySelectorAll(".oe-q");
    var score = quiz.querySelector(".oe-quiz-score");
    var answered = 0;
    var correct = 0;
    Array.prototype.forEach.call(questions, function (question) {
      var box = question.querySelector(".oe-q-options");
      var options = Array.prototype.slice.call(box.querySelectorAll(".oe-q-option"));
      for (var i = options.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var held = options[i];
        options[i] = options[j];
        options[j] = held;
      }
      options.forEach(function (option, index) {
        box.appendChild(option);
        var letter = option.querySelector(".oe-q-letter");
        if (letter) letter.textContent = String.fromCharCode(65 + index);
      });
      var why = question.querySelector(".oe-q-why");
      options.forEach(function (option) {
        option.addEventListener("click", function () {
          if (question.getAttribute("data-done")) return;
          question.setAttribute("data-done", "1");
          var right = option.hasAttribute("data-correct");
          options.forEach(function (other) {
            other.setAttribute("aria-disabled", "true");
            if (other.hasAttribute("data-correct")) other.classList.add("oe-q-right");
            else if (other === option) other.classList.add("oe-q-wrong");
          });
          if (why) {
            // The feedback was escaped and rendered at build time.
            why.innerHTML =
              "<strong>" + (right ? strings.right || "Correct." : strings.wrong || "Not quite.") + "</strong> " +
              (option.getAttribute("data-feedback") || "");
            why.classList.add("oe-q-why-shown");
          }
          answered++;
          if (right) correct++;
          if (score && answered === questions.length) {
            score.textContent = (strings.score || "{correct} / {total} correct")
              .replace("{correct}", String(correct))
              .replace("{total}", String(questions.length));
          }
          listeners.forEach(function (listener) { listener(); });
        });
      });
    });
  });

  // Panel rows: measure each panel at several widths, plan, apply with flexbox.
  // Without this script, on a narrow screen, or in print, the CSS grid shows.
  var grid = document.querySelector(".oe-grid");
  var panels = grid
    ? Array.prototype.filter.call(grid.children, function (el) {
        return el.classList.contains("oe-panel");
      })
    : [];
  if (panels.length < 2) return;

  var SINGLE_COLUMN = "(max-width: 760px)";
  var TWO_COLUMNS = "(max-width: 1100px)";
  var SAMPLE_STEP = 24;
  var TEXT_MIN = 260;
  var TEXT_MAX = 700;
  var TABLE_COLUMN_MIN = 88;
  var DIAGRAM_SHRINK = 0.8;
  var tracked = [grid].concat(panels);
  var original = tracked.map(function (el) { return el.getAttribute("style"); });

  function restore() {
    Array.prototype.forEach.call(grid.querySelectorAll(":scope > .oe-col"), function (box) {
      while (box.firstChild) grid.insertBefore(box.firstChild, box);
      grid.removeChild(box);
    });
    tracked.forEach(function (el, index) {
      if (original[index] === null) el.removeAttribute("style");
      else el.setAttribute("style", original[index]);
    });
  }
  function naturalWidth(svg) {
    return Number(svg.getAttribute("data-natural")) || 0;
  }
  function soleDiagram(panel) {
    var body = panel.querySelector(":scope > .oe-panel-body");
    if (!body || body.children.length !== 1) return null;
    return body.querySelector(":scope > .oe-diagram > svg");
  }

  function measure(width) {
    grid.style.display = "block";
    panels.forEach(function (panel) {
      panel.style.display = "none";
      panel.style.boxSizing = "border-box";
    });
    var out = panels.map(function (panel) {
      var svg = soleDiagram(panel);
      var svgs = panel.querySelectorAll(".oe-diagram > svg");
      var scrollers = panel.querySelectorAll(".oe-scroll");
      var tableColumns = 0;
      Array.prototype.forEach.call(panel.querySelectorAll("table tr:first-child"), function (tr) {
        tableColumns = Math.max(tableColumns, tr.children.length);
      });
      panel.style.display = "";
      panel.style.width = width + "px";
      var pad = svg ? panel.offsetWidth - svg.parentElement.clientWidth : 34;
      var natural = svg ? naturalWidth(svg) : 0;
      var widest = 0;
      Array.prototype.forEach.call(svgs, function (each) {
        widest = Math.max(widest, naturalWidth(each));
      });
      var floor = svg
        ? Math.max(160, natural * DIAGRAM_SHRINK + pad)
        : Math.max(TEXT_MIN, widest * DIAGRAM_SHRINK + pad, tableColumns * TABLE_COLUMN_MIN + pad);
      var from = Math.min(width, Math.floor(floor / 12) * 12);
      var samples = [];
      var fits = null;
      for (var w = from; ; w += SAMPLE_STEP) {
        w = Math.min(w, width);
        panel.style.width = w + "px";
        if (fits === null && scrollers.length) {
          var overflowing = Array.prototype.some.call(scrollers, function (box) {
            return box.scrollWidth > box.clientWidth + 1;
          });
          if (!overflowing) fits = w;
        }
        samples.push({ w: w, h: panel.offsetHeight });
        if (w === width) break;
      }
      panel.style.display = "none";
      var plain = !svgs.length && !tableColumns && !panel.querySelector("pre");
      return {
        samples: samples,
        minWidth: Math.max(floor, scrollers.length ? (fits === null ? width : fits) : 0),
        maxWidth: svg ? natural + pad : plain ? TEXT_MAX : 0,
        natural: natural,
        pad: pad,
        span: Number(panel.getAttribute("data-span")) || 1
      };
    });
    panels.forEach(function (panel) {
      panel.style.display = "";
      panel.style.width = "";
    });
    return out;
  }

  function apply(plan, gap) {
    grid.style.display = "flex";
    grid.style.flexWrap = "wrap";
    grid.style.alignItems = "stretch";
    grid.style.gap = gap + "px";
    panels.forEach(function (panel) {
      panel.style.gridColumn = "auto";
      panel.style.flex = "0 0 auto";
    });
    plan.rows.forEach(function (row) {
      row.columns.forEach(function (column) {
        if (column.panels.length === 1) {
          panels[column.panels[0]].style.width = column.width + "px";
          return;
        }
        var box = document.createElement("div");
        box.className = "oe-col";
        box.style.cssText =
          "width:" + column.width + "px;flex:0 0 auto;display:flex;flex-direction:column;gap:" + gap + "px";
        grid.insertBefore(box, panels[column.panels[0]]);
        column.panels.forEach(function (index) {
          panels[index].style.width = "";
          box.appendChild(panels[index]);
        });
        panels[column.panels[column.panels.length - 1]].style.flex = "1 1 auto";
      });
    });
  }

  var printing = false;
  var printQuery = matchMedia("print");
  function containerWidth() {
    return Math.floor(grid.getBoundingClientRect().width);
  }
  function justify() {
    if (printing || printQuery.matches) return;
    try {
      // Row heights can add or remove the page scrollbar, which changes the
      // width; plan again until the width holds.
      var planned = -1;
      for (var pass = 0; pass < 3 && planned !== containerWidth(); pass++) {
        restore();
        if (matchMedia(SINGLE_COLUMN).matches) return;
        planned = containerWidth();
        var style = getComputedStyle(grid);
        var gap = parseFloat(style.columnGap) || 0;
        var cols = Math.max(1, Number(style.getPropertyValue("--cols")) || 3);
        if (matchMedia(TWO_COLUMNS).matches) cols = Math.min(cols, 2);
        apply(planRows({ width: planned, gap: gap, cols: cols, panels: measure(planned) }), gap);
      }
      if (planned !== containerWidth()) restore();
    } catch (error) {
      restore();
    }
  }

  var timer = 0;
  function later() {
    clearTimeout(timer);
    timer = setTimeout(justify, 150);
  }
  function toPrint() {
    clearTimeout(timer);
    restore();
  }
  justify();
  listeners.push(later);
  addEventListener("resize", later);
  addEventListener("beforeprint", function () { printing = true; toPrint(); });
  addEventListener("afterprint", function () { printing = false; later(); });
  if (printQuery.addEventListener) {
    printQuery.addEventListener("change", function (event) {
      if (event.matches) toPrint();
      else later();
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
})();
`;

export interface PlannerPanel {
  samples: Array<{ w: number; h: number }>;
  minWidth?: number;
  maxWidth?: number;
  natural?: number;
  pad?: number;
  span?: number;
}

export interface PlannedRows {
  rows: Array<{
    columns: Array<{ panels: number[]; width: number }>;
    height: number;
  }>;
}

/** The page's planner, callable from Node (tests, tooling). */
export function planRows(input: {
  width: number;
  gap?: number;
  cols?: number;
  panels: PlannerPanel[];
}): PlannedRows {
  const build = new Function(`${PLANNER_SOURCE}; return planRows;`) as () => (
    input: unknown,
  ) => PlannedRows;
  return build()(input);
}
