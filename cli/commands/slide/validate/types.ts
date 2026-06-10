// ─── Types ────────────────────────────────────────────────────────────────────

export type IssueCode =
  | "no_overflowing_text"
  | "no_overlapping_text"
  | "slide_sized_text"
  | "remote_asset_ref";

export interface ValidateIssue {
  code: IssueCode;
  /** Human-readable description. */
  message: string;
  /** Slide filename (e.g. "slide-01.html"). */
  slide: string;
  /** CSS selector of the offending element, when applicable. */
  selector?: string;
  /** Bounding rect of the element in px (design-space coords). */
  rect?: { x: number; y: number; width: number; height: number };
}

export interface SlideResult {
  file: string;
  status: "pass" | "fail";
  issues: ValidateIssue[];
}

export interface ValidateReport {
  generatedAt: string;
  frame: {
    widthPt: number;
    heightPt: number;
    widthPx: number;
    heightPx: number;
  };
  summary: {
    totalSlides: number;
    passedSlides: number;
    failedSlides: number;
    criticalIssues: number;
    warnings: number;
  };
  slides: SlideResult[];
}
