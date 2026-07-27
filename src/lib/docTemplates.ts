import type { DocKind, Region } from "./types";

/**
 * Page geometry for the facsimile renderer.
 *
 * Regions carry real percentage coordinates so the document viewer and the
 * highlight overlay read from one source. There is no separate "where to draw
 * the box" data that could drift from "where the value is".
 */
const CONTENT_TOP = 23.5;
const ROW_STEP = 9.7;
const ROW_H = 8.4;
const COL_X = [7, 52] as const;
const COL_W = 41;
const FULL_W = 86;

export interface RegionSpec {
  boxLabel?: string;
  label: string;
  value: string;
  /** Full-width rows are used for names, issuers and addresses. */
  span?: 1 | 2;
}

/**
 * Lays specs out into a two-column form grid and returns fully positioned
 * regions. Full-width specs always start a new row.
 */
export function layoutRegions(docId: string, specs: RegionSpec[]): Region[] {
  const out: Region[] = [];
  let row = 0;
  let col: 0 | 1 = 0;

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const span = spec.span ?? 1;

    if (span === 2 && col === 1) {
      row += 1;
      col = 0;
    }

    const y = CONTENT_TOP + row * ROW_STEP;
    out.push({
      id: `${docId}-r${i}`,
      boxLabel: spec.boxLabel,
      label: spec.label,
      value: spec.value,
      col,
      row,
      span,
      box:
        span === 2
          ? { x: COL_X[0], y, w: FULL_W, h: ROW_H }
          : { x: COL_X[col], y, w: COL_W, h: ROW_H },
    });

    if (span === 2) {
      row += 1;
      col = 0;
    } else if (col === 0) {
      col = 1;
    } else {
      col = 0;
      row += 1;
    }
  }

  return out;
}

/** Rows that fit on one page before the renderer starts a second one. */
export const ROWS_PER_PAGE = 7;

export const DOC_HEADERS: Record<DocKind, { title: string; subtitle: string; omb?: string }> = {
  "W-2": { title: "Form W-2", subtitle: "Wage and Tax Statement", omb: "OMB No. 1545-0008" },
  "1099-INT": { title: "Form 1099-INT", subtitle: "Interest Income", omb: "OMB No. 1545-0112" },
  "1099-DIV": { title: "Form 1099-DIV", subtitle: "Dividends and Distributions", omb: "OMB No. 1545-0110" },
  "1099-NEC": { title: "Form 1099-NEC", subtitle: "Nonemployee Compensation", omb: "OMB No. 1545-0116" },
  "1099-B": { title: "Form 1099-B", subtitle: "Proceeds From Broker Transactions", omb: "OMB No. 1545-0715" },
  "1098": { title: "Form 1098", subtitle: "Mortgage Interest Statement", omb: "OMB No. 1545-0901" },
  "1098-E": { title: "Form 1098-E", subtitle: "Student Loan Interest Statement", omb: "OMB No. 1545-1576" },
  "K-1": { title: "Schedule K-1", subtitle: "Partner's Share of Income, Deductions, Credits", omb: "OMB No. 1545-0123" },
  "Charitable Receipt": { title: "Contribution Receipt", subtitle: "Written Acknowledgment of Gift" },
  "Property Tax Statement": { title: "Property Tax Statement", subtitle: "Real Property Tax Assessment" },
  "Bank Statement": { title: "Account Statement", subtitle: "Monthly Statement of Account" },
  "Prior Year Return": { title: "Form 1040 (Prior Year)", subtitle: "U.S. Individual Income Tax Return" },
};

/** Colour-coded chip per document family, used in the library and pickers. */
export const DOC_FAMILY: Record<DocKind, "wage" | "invest" | "deduct" | "entity" | "other"> = {
  "W-2": "wage",
  "1099-NEC": "wage",
  "1099-INT": "invest",
  "1099-DIV": "invest",
  "1099-B": "invest",
  "1098": "deduct",
  "1098-E": "deduct",
  "Charitable Receipt": "deduct",
  "Property Tax Statement": "deduct",
  "K-1": "entity",
  "Bank Statement": "other",
  "Prior Year Return": "other",
};
