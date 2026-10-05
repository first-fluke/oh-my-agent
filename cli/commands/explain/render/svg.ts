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
 * Smooth path through `points`. Each segment leaves and arrives along the
 * main axis, so an arrowhead always points straight into its node.
 */
export function svgCurve(
  points: Array<[number, number]>,
  horizontal: boolean,
): string {
  const [start, ...rest] = points;
  if (!start) return "";
  let path = `M${round(start[0])},${round(start[1])}`;
  let previous = start;
  for (const point of rest) {
    if (horizontal) {
      const middle = (previous[0] + point[0]) / 2;
      path += ` C${round(middle)},${round(previous[1])} ${round(middle)},${round(point[1])} ${round(point[0])},${round(point[1])}`;
    } else {
      const middle = (previous[1] + point[1]) / 2;
      path += ` C${round(previous[0])},${round(middle)} ${round(point[0])},${round(middle)} ${round(point[0])},${round(point[1])}`;
    }
    previous = point;
  }
  return path;
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
  const floor = Math.min(w, Math.max(300, Math.round(w * 0.8)));
  return `<div class="oe-diagram oe-scroll"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-natural="${w}" style="max-width:100%;min-width:${floor}px;height:auto" role="img" aria-label="${escapeHtml(label)}">${body}</svg></div>`;
}

export { round as svgRound };
