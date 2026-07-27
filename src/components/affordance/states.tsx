/**
 * The affordance registry (Challenge 08).
 *
 * One table describing every interaction state a value can be in. Components
 * read from here; nothing hard-codes a colour or an icon for a state anywhere
 * else in the app. Adding a state means adding a row, and it then appears
 * correctly in the return, the dashboard, the document library and the legend
 * without touching any of them.
 */

import type { FieldState } from "@/lib/types";
import {
  IconCheckCircle,
  IconLock,
  IconPencil,
  IconSigma,
  IconSparkle,
  IconAlert,
} from "@/components/Icons";

export interface StateMeta {
  id: FieldState;
  /** What the user calls it. */
  name: string;
  /** The rule, in one sentence, as shown in the legend and on hover. */
  rule: string;
  className: string;
  icon: typeof IconSparkle;
  /** Chip styling for use outside of a field context. */
  chip: string;
  /** Colour of the state's marker dot. */
  dot: string;
  /** Whether clicking the field opens the trace/AI panel. */
  inspectable: boolean;
  editable: boolean;
}

export const FIELD_STATES: Record<FieldState, StateMeta> = {
  editable: {
    id: "editable",
    name: "Editable",
    rule: "You type this. Nothing has claimed it and nothing will overwrite it.",
    className: "field-editable",
    icon: IconPencil,
    chip: "bg-surface text-ink-600 border border-ink-300",
    dot: "bg-ink-400",
    inspectable: false,
    editable: true,
  },
  "ai-unverified": {
    id: "ai-unverified",
    name: "AI extracted",
    rule: "A machine read this from a document. No person has confirmed it yet.",
    className: "field-ai",
    icon: IconSparkle,
    chip: "bg-ai-100 text-ai-700",
    dot: "bg-ai-500",
    inspectable: true,
    editable: true,
  },
  verified: {
    id: "verified",
    name: "Verified",
    rule: "A person checked the AI value against its source and accepted it.",
    className: "field-verified",
    icon: IconCheckCircle,
    chip: "bg-ok-100 text-ok-700",
    dot: "bg-ok-600",
    inspectable: true,
    editable: true,
  },
  "needs-approval": {
    id: "needs-approval",
    name: "Needs decision",
    rule: "The AI could not settle this on its own. It is waiting on a person.",
    className: "field-approval",
    icon: IconAlert,
    chip: "bg-warn-100 text-warn-700",
    dot: "bg-warn-600",
    inspectable: true,
    editable: true,
  },
  calculated: {
    id: "calculated",
    name: "Calculated",
    rule: "Computed from other lines. Not typeable, but you can open the arithmetic.",
    className: "field-calculated",
    icon: IconSigma,
    chip: "bg-ink-100 text-ink-600",
    dot: "bg-ink-400",
    inspectable: true,
    editable: false,
  },
  locked: {
    id: "locked",
    name: "Locked",
    rule: "Cannot be changed here. The field always states why.",
    className: "field-locked",
    icon: IconLock,
    chip: "bg-ink-200 text-ink-600",
    dot: "bg-ink-400",
    inspectable: false,
    editable: false,
  },
};

export const STATE_ORDER: FieldState[] = [
  "editable",
  "ai-unverified",
  "needs-approval",
  "verified",
  "calculated",
  "locked",
];

/* ------------------------------------------------------------------ *
 * AI verdict presentation
 * ------------------------------------------------------------------ */

import type { AiVerdict } from "@/lib/types";
import { IconConflict, IconDoc, IconTarget } from "@/components/Icons";

export interface VerdictMeta {
  name: string;
  /** Plain-language gloss. Never shows the raw verdict string to the user. */
  blurb: string;
  chip: string;
  icon: typeof IconSparkle;
}

export const VERDICTS: Record<AiVerdict, VerdictMeta> = {
  extracted: {
    name: "Read from one document",
    blurb: "A single source, copied across without changes.",
    chip: "bg-ai-100 text-ai-700",
    icon: IconDoc,
  },
  derived: {
    name: "Combined from several sources",
    blurb: "More than one document, joined by a rule you can open.",
    chip: "bg-ai-100 text-ai-700",
    icon: IconSigma,
  },
  conflict: {
    name: "Sources disagree",
    blurb: "Two documents point at different answers. A person has to choose.",
    chip: "bg-stop-100 text-stop-700",
    icon: IconConflict,
  },
  "missing-source": {
    name: "Expected document missing",
    blurb: "Something that should be here is not, so the total may be incomplete.",
    chip: "bg-warn-100 text-warn-700",
    icon: IconAlert,
  },
  anomaly: {
    name: "Unusual for this client",
    blurb: "The extraction looks clean, but the value breaks the client's pattern.",
    chip: "bg-warn-100 text-warn-700",
    icon: IconTarget,
  },
};

/* ------------------------------------------------------------------ *
 * Confidence bands
 *
 * Confidence is shown as a band, not a raw percentage. "87%" invites false
 * precision — a reviewer cannot act differently at 87% than at 84%. The bands
 * map to different *recommended behaviours*, which is the only thing the number
 * is actually for. The exact figure is still available on hover for anyone who
 * wants it.
 * ------------------------------------------------------------------ */

export interface Band {
  id: "high" | "medium" | "low";
  label: string;
  guidance: string;
  bar: string;
  text: string;
  track: string;
}

export const BANDS: Band[] = [
  {
    id: "high",
    label: "High confidence",
    guidance: "Spot-check and accept.",
    bar: "bg-ok-600",
    text: "text-ok-700",
    track: "bg-ok-100",
  },
  {
    id: "medium",
    label: "Worth a look",
    guidance: "Open the source before accepting.",
    bar: "bg-warn-600",
    text: "text-warn-700",
    track: "bg-warn-100",
  },
  {
    id: "low",
    label: "Check this one",
    guidance: "Verify against the document line by line.",
    bar: "bg-stop-600",
    text: "text-stop-700",
    track: "bg-stop-100",
  },
];

export function bandFor(confidence: number): Band {
  if (confidence >= 0.92) return BANDS[0];
  if (confidence >= 0.75) return BANDS[1];
  return BANDS[2];
}
