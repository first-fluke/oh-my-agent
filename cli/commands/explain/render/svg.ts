import { escapeHtml } from "./text.js";

const round = (value: number): number => Math.round(value * 10) / 10;

/** Lines of text centred on (x, y). */
export function svgText(
  lines: string[],
  x: number,
  y: number,
  options: { size: number; lineHeight: number; className: string },
): string {
  const first = y - ((lines.length - 1) * options.lineHeight) / 2;
  const spans = lines
    .map(
      (line, index) =>
        `<tspan x="${round(x)}" y="${round(first + index * options.lineHeight)}">${escapeHtml(line)}</tspan>`,
    )
    .join("");
  return `<text class="${options.className}" text-anchor="middle" dominant-baseline="central" font-size="${options.size}">${spans}</text>`;
}

/**
 * Path through `points` with rounded bends: straight at both ends, so an
 * arrowhead points along the last segment, and a quadratic curve through the
 * midpoints around every bend.
 */
export function svgCurve(points: Array<[number, number]>): string {
  const [first, ...rest] = points;
  if (!first) return "";
  const at = ([x, y]: [number, number]) => `${round(x)},${round(y)}`;
  if (rest.length === 1)
    return `M${at(first)} L${at(rest[0] as [number, number])}`;
  const middle = (
    a: [number, number],
    b: [number, number],
  ): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const parts = [
    `M${at(first)}`,
    `L${at(middle(first, points[1] as [number, number]))}`,
  ];
  for (let index = 1; index < points.length - 1; index++) {
    const bend = points[index] as [number, number];
    parts.push(
      `Q${at(bend)} ${at(middle(bend, points[index + 1] as [number, number]))}`,
    );
  }
  parts.push(`L${at(points[points.length - 1] as [number, number])}`);
  return parts.join(" ");
}

export function svgArrowMarker(id: string): string {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" class="oe-arrow"/></marker>`;
}

/**
 * A diagram that scales down with its panel, but never below a legible size:
 * past that point its box scrolls sideways instead of the page.
 */
export function svgFigure(
  width: number,
  height: number,
  label: string,
  body: string,
): string {
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  // Below three quarters of its size the text is too small to read.
  const floor = Math.min(w, Math.max(300, Math.round(w * 0.75)));
  return `<div class="oe-diagram oe-scroll"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-natural="${w}" style="max-width:100%;min-width:${floor}px;height:auto" role="img" aria-label="${escapeHtml(label)}">${body}</svg></div>`;
}

export { round as svgRound };
